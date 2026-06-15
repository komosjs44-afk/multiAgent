"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { postJson } from "../apiUtils";
import Modal from "../shared/Modal";
import SectionCard from "../shared/SectionCard";
import type { AcademicRecord, CareerProfileRecord, ExtractedEvidence } from "@/types/career";

const COMPANY_OPTIONS = [
  "한국전력공사",
  "인천국제공항공사",
  "국민건강보험공단",
  "한국도로공사",
  "코레일",
  "한국수자원공사",
  "한국가스공사",
  "근로복지공단",
];

type TranscriptRow = {
  id: string;
  semester: string;
  category: string;
  courseCode: string;
  courseName: string;
  credit: string;
  grade: string;
};

type Props = {
  profile: CareerProfileRecord | null;
  academicRecords: AcademicRecord[];
  onRefresh: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

function splitTargets(value?: string | null) {
  const targets = (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return [targets[0] ?? "", targets[1] ?? "", targets[2] ?? ""];
}

function rowKey(index: number) {
  return `row-${Date.now()}-${index}`;
}

function groupRowsBySemester(rows: TranscriptRow[]) {
  return rows.reduce<Record<string, TranscriptRow[]>>((groups, row) => {
    const semester = row.semester.trim() || "학기 미분류";
    groups[semester] = groups[semester] ?? [];
    groups[semester].push(row);
    return groups;
  }, {});
}

function academicRecordKey(record: AcademicRecord) {
  const code = record.skill_mapping.find((item) => /^[A-Z]{1,5}\d{2,4}[A-Z0-9]*$/.test(item));
  const semester = record.semester?.trim() || "학기 미분류";
  return `${semester}:${code || record.course_name.trim()}`;
}

function transcriptRowKey(row: TranscriptRow) {
  const semester = row.semester.trim() || "학기 미분류";
  return `${semester}:${row.courseCode.trim() || row.courseName.trim()}`;
}

function normalizeRows(rows: TranscriptRow[], existingRecords: AcademicRecord[]) {
  const seen = new Set<string>();
  const existing = new Set(existingRecords.map(academicRecordKey));
  return rows
    .map((row) => ({
      ...row,
      semester: row.semester.trim() || "학기 미분류",
      category: row.category.trim(),
      courseCode: row.courseCode.trim(),
      courseName: row.courseName.trim(),
      credit: row.credit.trim(),
      grade: row.grade.trim(),
    }))
    .filter((row) => row.courseName)
    .filter((row) => {
      const key = transcriptRowKey(row);
      if (existing.has(key)) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export default function QuickAnalysisSection({ profile, academicRecords, onRefresh, onToast }: Props) {
  const router = useRouter();
  const initialTargets = useMemo(
    () => splitTargets(profile?.target_company),
    [profile?.target_company],
  );
  const [targets, setTargets] = useState(initialTargets);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [transcriptRows, setTranscriptRows] = useState<TranscriptRow[]>([]);
  const [extractedGpa, setExtractedGpa] = useState("");
  const [diagnostics, setDiagnostics] = useState<ExtractedEvidence["diagnostics"]>();
  const visibleTargets = targets.filter(Boolean);
  const groupedRows = useMemo(() => groupRowsBySemester(transcriptRows), [transcriptRows]);

  function updateTarget(index: number, value: string) {
    setTargets((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  }

  function updateTranscriptRow(id: string, patch: Partial<TranscriptRow>) {
    setTranscriptRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function removeTranscriptRow(id: string) {
    setTranscriptRows((current) => current.filter((row) => row.id !== id));
  }

  function addTranscriptRow(semester = "") {
    setTranscriptRows((current) => [
      ...current,
      {
        id: rowKey(current.length),
        semester,
        category: "",
        courseCode: "",
        courseName: "",
        credit: "",
        grade: "",
      },
    ]);
  }

  async function handleTranscriptSelect(file: File | undefined) {
    if (!file) return;

    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append("docType", "transcript");
      formData.append("file", file);

      const response = await fetch("/api/evidence/extract", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as
        | (ExtractedEvidence & { error?: string })
        | null;

      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "성적표 추출에 실패했습니다.");
      }

      const rows =
        payload.courses?.map((course, index) => ({
          id: rowKey(index),
          semester: course.semester || "학기 미분류",
          category: course.category ?? "",
          courseCode: course.courseCode ?? "",
          courseName: course.courseName,
          credit: course.credit == null ? "" : String(course.credit),
          grade: course.grade ?? "",
        })) ?? [];

      setTranscriptRows(
        rows.length
          ? rows
          : [
              {
                id: rowKey(0),
                semester: "",
                category: "",
                courseCode: "",
                courseName: "",
                credit: "",
                grade: "",
              },
            ],
      );
      setExtractedGpa(payload.grade ?? "");
      setDiagnostics(payload.diagnostics);
      setPreviewOpen(true);

      const warning = payload.warning ?? payload.diagnostics?.warnings[0];
      onToast(
        warning ?? `${file.name}에서 ${rows.length}개 과목을 추출했습니다. 저장 전에 확인해주세요.`,
        warning ? "error" : "success",
      );
    } catch (error) {
      setTranscriptRows([
        {
          id: rowKey(0),
          semester: "",
          category: "",
          courseCode: "",
          courseName: "",
          credit: "",
          grade: "",
        },
      ]);
      setExtractedGpa("");
      setDiagnostics(undefined);
      setPreviewOpen(true);
      onToast(
        error instanceof Error ? error.message : "성적표 추출에 실패했습니다.",
        "error",
      );
    } finally {
      setIsExtracting(false);
    }
  }

  async function saveTranscriptPreview() {
    const rowsToSave = normalizeRows(transcriptRows, academicRecords);

    if (!rowsToSave.length && !extractedGpa.trim()) {
      setPreviewOpen(false);
      return;
    }

    try {
      if (extractedGpa.trim()) {
        await postJson("/api/career-profile", {
          university: profile?.university ?? "",
          major: profile?.major ?? "",
          grade: profile?.grade ?? "",
          gpa: extractedGpa.trim(),
          target_company_type: profile?.target_company_type ?? "",
          target_company:
            targets.filter(Boolean).join(", ") || profile?.target_company || "",
          target_job: profile?.target_job || "공기업 전산직",
          target_career: profile?.target_career || profile?.target_job || "공기업 전산직",
        });
      }

      await Promise.all(
        rowsToSave.map((row) =>
          postJson("/api/academic-records", {
            course_name: row.courseName,
            credit: row.credit,
            grade: row.grade,
            semester: row.semester,
            skill_mapping: [row.category, row.courseCode, row.courseName].filter(Boolean),
          }),
        ),
      );

      onRefresh();
      onToast("성적 입력이 저장되어 분석이 업데이트되었습니다.", "success");
      setPreviewOpen(false);
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "성적 저장에 실패했습니다.",
        "error",
      );
    }
  }

  async function saveAndAnalyze() {
    setIsSaving(true);
    try {
      await postJson("/api/career-profile", {
        university: profile?.university ?? "",
        major: profile?.major ?? "",
        grade: profile?.grade ?? "",
        gpa: profile?.gpa ?? null,
        target_company_type: profile?.target_company_type ?? "",
        target_company: targets.filter(Boolean).join(", "),
        target_job: profile?.target_job || "공기업 전산직",
        target_career: profile?.target_career || profile?.target_job || "공기업 전산직",
      });

      await fetch("/api/analyze-career", { method: "POST" });
      onRefresh();
      onToast("목표 기업 기준으로 분석이 업데이트되었습니다.", "success");
      router.push("/result");
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "분석 실행에 실패했습니다.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <SectionCard title="빠른 분석 설정" impactLabel="목표 기업과 성적표 기반 자동 입력">
        <div className="grid gap-6">
          <div>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-extrabold text-[var(--ink)]">
                목표 기업 TOP 3
              </h3>
              {visibleTargets.length ? (
                <div className="hidden flex-wrap gap-2 sm:flex">
                  {visibleTargets.map((target, index) => (
                    <span
                      key={`${target}-${index}`}
                      className="rounded-full bg-[var(--lime-soft)] px-3 py-1 text-xs font-black text-[var(--navy)]"
                    >
                      {index + 1}순위 {target}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <label key={index} className="grid gap-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {index + 1}순위 목표기관
                  </span>
                  <select
                    value={targets[index]}
                    onChange={(event) => updateTarget(index, event.target.value)}
                    className="h-11 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm outline-none focus:border-[var(--navy)]"
                  >
                    <option value="">선택하기</option>
                    {COMPANY_OPTIONS.map((company) => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)] p-5">
            <h3 className="text-sm font-extrabold text-[var(--ink)]">
              성적표 PDF 업로드
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              텍스트 선택이 가능한 성적표 PDF를 올리면 학기, 과목명, 학점, 성적을
              추출합니다. 저장 전 미리보기에서 수정할 수 있습니다.
            </p>
            <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
              현재는 텍스트가 선택되는 PDF만 지원합니다. 스캔본 또는 이미지 기반 PDF는 OCR을
              지원하지 않아 추출에 실패할 수 있습니다.
            </p>
            <label className="mt-4 inline-flex cursor-pointer rounded-full bg-[var(--navy)] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--navy-2)]">
              {isExtracting ? "추출 중..." : "PDF 선택"}
              <input
                type="file"
                accept=".pdf,application/pdf"
                disabled={isExtracting}
                className="sr-only"
                onChange={(event) => {
                  void handleTranscriptSelect(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-500">
              목표 기업을 저장하면 추천 공고와 적합도 계산에 즉시 반영됩니다.
            </p>
            <button
              type="button"
              onClick={saveAndAnalyze}
              disabled={isSaving}
              className="h-12 rounded-full bg-[var(--lime)] px-6 text-sm font-black text-[var(--navy)] transition hover:bg-[var(--lime-soft)] disabled:opacity-50"
            >
              {isSaving ? "분석 중..." : "저장하고 분석하기"}
            </button>
          </div>
        </div>
      </SectionCard>

      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="성적표 인식 결과 확인"
        footer={
          <>
            <button type="button" onClick={() => setPreviewOpen(false)} className="btn-light">
              닫기
            </button>
            <button type="button" onClick={saveTranscriptPreview} className="btn-dark">
              전체 저장
            </button>
          </>
        }
      >
        <div className="rounded-3xl bg-[var(--paper)] p-4">
          <p className="text-sm font-extrabold text-[var(--ink)]">
            저장 전 과목을 확인해주세요.
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            잘못 인식된 과목은 바로 수정하거나 삭제할 수 있습니다.
          </p>
          {diagnostics ? (
            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
              <span className="rounded-full bg-white px-3 py-2 font-bold">
                과목코드 {diagnostics.detectedCourseCodeCount}개
              </span>
              <span className="rounded-full bg-white px-3 py-2 font-bold">
                학기 {diagnostics.detectedSemesterCount}개
              </span>
              <span className="rounded-full bg-white px-3 py-2 font-bold">
                추출 {diagnostics.parsedCourseCount}개
              </span>
            </div>
          ) : null}
          {diagnostics?.warnings.length ? (
            <div className="mt-3 grid gap-1">
              {diagnostics.warnings.map((warning) => (
                <p key={warning} className="text-xs font-bold text-amber-700">
                  {warning}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <PreviewInput
          label="전체 GPA"
          value={extractedGpa}
          onChange={setExtractedGpa}
          placeholder="3.69"
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => addTranscriptRow()}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-extrabold text-[var(--navy)] hover:border-[var(--navy)]"
          >
            과목 직접 추가
          </button>
        </div>

        {Object.entries(groupedRows).map(([semester, rows]) => (
          <div key={semester} className="grid gap-3 rounded-3xl border border-[var(--line)] p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-[var(--ink)]">{semester}</h4>
              <span className="text-xs font-bold text-slate-400">{rows.length}과목</span>
            </div>
            {rows.map((row) => (
              <div key={row.id} className="grid gap-2 rounded-2xl bg-slate-50 p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <PreviewInput
                    label="학기"
                    value={row.semester}
                    onChange={(value) => updateTranscriptRow(row.id, { semester: value })}
                    placeholder="2025-1"
                  />
                  <PreviewInput
                    label="과목코드"
                    value={row.courseCode}
                    onChange={(value) => updateTranscriptRow(row.id, { courseCode: value })}
                    placeholder="AS011C"
                  />
                  <button
                    type="button"
                    onClick={() => removeTranscriptRow(row.id)}
                    className="self-end rounded-xl border border-red-100 px-3 py-2 text-xs font-extrabold text-red-500 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
                <PreviewInput
                  label="과목명"
                  value={row.courseName}
                  onChange={(value) => updateTranscriptRow(row.id, { courseName: value })}
                  placeholder="운영체제"
                />
                <div className="grid grid-cols-3 gap-2">
                  <PreviewInput
                    label="이수구분"
                    value={row.category}
                    onChange={(value) => updateTranscriptRow(row.id, { category: value })}
                    placeholder="계공"
                  />
                  <PreviewInput
                    label="학점"
                    value={row.credit}
                    onChange={(value) => updateTranscriptRow(row.id, { credit: value })}
                    placeholder="3"
                  />
                  <PreviewInput
                    label="성적"
                    value={row.grade}
                    onChange={(value) => updateTranscriptRow(row.id, { grade: value })}
                    placeholder="A0"
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </Modal>
    </>
  );
}

function PreviewInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--navy)]"
      />
    </label>
  );
}
