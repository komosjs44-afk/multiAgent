"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getJson, postJson } from "../apiUtils";
import SectionCard from "../shared/SectionCard";
import TranscriptReviewModal, { type TranscriptRow } from "./TranscriptReviewModal";
import type {
  AcademicRecord,
  CareerProfileRecord,
  ExtractedEvidence,
  TranscriptDiff,
  TranscriptVersion,
} from "@/types/career";

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

type Props = {
  profile: CareerProfileRecord | null;
  /** active 성적표 버전 → 과목 재계산 → profile.gpa 순으로 우선순위를 매긴 표시용 GPA. */
  effectiveGpa: number | null;
  activeVersion: TranscriptVersion | null;
  pendingReviewVersion: TranscriptVersion | null;
  onRefresh: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
  /** "성적 상세 보기" 클릭 시 프로필 탭을 "학업·성적"으로 전환합니다. */
  onViewDetail: () => void;
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

function emptyRow(semester = ""): TranscriptRow {
  return {
    id: rowKey(0),
    semester,
    category: "",
    courseCode: "",
    courseName: "",
    credit: "",
    grade: "",
  };
}

/** "2026-1" → "2026년 1학기 반영본". 형식이 아니면 원문 그대로 표시합니다. */
function formatAcademicTerm(term: string) {
  const match = term.match(/^(\d{4})-(\d)$/);
  if (!match) return term || "반영 학기 미확인";
  return `${match[1]}년 ${match[2]}학기 반영본`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ko-KR");
}

export default function QuickAnalysisSection({
  profile,
  effectiveGpa,
  activeVersion,
  pendingReviewVersion,
  onRefresh,
  onToast,
  onViewDetail,
}: Props) {
  const router = useRouter();
  const [targets, setTargets] = useState(() => splitTargets(profile?.target_company));
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isSavingTranscript, setIsSavingTranscript] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [modalStage, setModalStage] = useState<"review" | "saved">("review");
  const [savedVersionId, setSavedVersionId] = useState<string | null>(null);
  const [versionDiff, setVersionDiff] = useState<TranscriptDiff | null>(null);
  const [transcriptRows, setTranscriptRows] = useState<TranscriptRow[]>([]);
  const [extractedGpa, setExtractedGpa] = useState("");
  const [diagnostics, setDiagnostics] = useState<ExtractedEvidence["diagnostics"]>();
  const [transcriptSummary, setTranscriptSummary] = useState<ExtractedEvidence["summary"]>();
  const [semesterSummaries, setSemesterSummaries] = useState<ExtractedEvidence["semesterSummaries"]>();
  const [lastFileName, setLastFileName] = useState("");
  const [transcriptNotice, setTranscriptNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const visibleTargets = targets.filter(Boolean);

  // profile.target_company는 이 화면 밖(새로고침, 다른 저장 동작의 refetch)에서도 바뀔 수 있으므로,
  // 마운트 시 한 번만 초기화하는 useState 대신, 렌더 중 값이 바뀐 것을 감지하면 즉시 다시 동기화합니다.
  // (useEffect로 처리하면 한 프레임 늦게 반영되고 React Compiler가 경고하는 패턴이라, React가
  // 권장하는 "렌더 중 상태 조정" 방식을 사용합니다.)
  const [syncedTargetCompany, setSyncedTargetCompany] = useState(profile?.target_company ?? null);
  if (syncedTargetCompany !== (profile?.target_company ?? null)) {
    setSyncedTargetCompany(profile?.target_company ?? null);
    setTargets(splitTargets(profile?.target_company));
  }

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
    setTranscriptRows((current) => [...current, emptyRow(semester)]);
  }

  function resetReviewState() {
    setTranscriptRows([]);
    setExtractedGpa("");
    setDiagnostics(undefined);
    setTranscriptSummary(undefined);
    setSemesterSummaries(undefined);
    setLastFileName("");
    setTranscriptNotice(null);
    setModalStage("review");
    setSavedVersionId(null);
    setVersionDiff(null);
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
          needsReview: course.needsReview ?? false,
        })) ?? [];

      setModalStage("review");
      setSavedVersionId(null);
      setVersionDiff(null);
      setTranscriptRows(rows.length ? rows : [emptyRow()]);
      setExtractedGpa(payload.grade ?? "");
      setDiagnostics(payload.diagnostics);
      setTranscriptSummary(payload.summary);
      setSemesterSummaries(payload.semesterSummaries);
      setLastFileName(file.name);
      setPreviewOpen(true);

      const warning = payload.warning ?? payload.diagnostics?.warnings[0];
      setTranscriptNotice({
        message: warning ?? `${file.name}에서 ${rows.length}개 과목을 추출했습니다. 저장 전에 확인해주세요.`,
        type: warning ? "error" : "success",
      });
    } catch (error) {
      setModalStage("review");
      setSavedVersionId(null);
      setVersionDiff(null);
      setTranscriptRows([emptyRow()]);
      setExtractedGpa("");
      setDiagnostics(undefined);
      setTranscriptSummary(undefined);
      setSemesterSummaries(undefined);
      setLastFileName("");
      setPreviewOpen(true);
      setTranscriptNotice({
        message: error instanceof Error ? error.message : "성적표 추출에 실패했습니다.",
        type: "error",
      });
    } finally {
      setIsExtracting(false);
    }
  }

  /** 검토 저장된(review 상태) 성적표를 다시 열어 적용 여부를 결정할 수 있게 합니다. */
  async function resumeReview() {
    if (!pendingReviewVersion) return;
    setIsResuming(true);
    try {
      const payload = await getJson<{
        version: TranscriptVersion;
        records: AcademicRecord[];
        error?: string;
      }>(`/api/academic-transcripts/${pendingReviewVersion.id}`);

      const rows = payload.records.map((record, index) => ({
        id: rowKey(index),
        semester: record.semester,
        category: record.category ?? "",
        courseCode: record.course_code ?? "",
        courseName: record.course_name,
        credit: record.credit == null ? "" : String(record.credit),
        grade: record.grade ?? "",
        needsReview: record.requires_review ?? false,
      }));

      setTranscriptRows(rows);
      setExtractedGpa(payload.version.cumulative_gpa != null ? String(payload.version.cumulative_gpa) : "");
      setDiagnostics(undefined);
      setTranscriptSummary({
        totalCredits: payload.version.total_credits,
        overallGpa: payload.version.cumulative_gpa,
        percentile: payload.version.percentile,
        courseCount: payload.version.total_course_count,
        confidencePercent: 100,
      });
      setSemesterSummaries(undefined);
      setLastFileName(payload.version.file_name);
      setModalStage("saved");
      setSavedVersionId(payload.version.id);
      setVersionDiff(null);
      setTranscriptNotice({
        message: "이미 검토 저장된 성적표입니다. 내용을 확인한 뒤 적용해주세요.",
        type: "success",
      });
      setPreviewOpen(true);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "검토 중인 성적표를 불러오지 못했습니다.", "error");
    } finally {
      setIsResuming(false);
    }
  }

  async function saveTranscriptVersion() {
    if (isSavingTranscript) return; // 이중 클릭으로 같은 버전이 두 번 저장되는 것을 방지합니다.

    const rowsToSave = transcriptRows
      .map((row) => ({
        ...row,
        semester: row.semester.trim() || "학기 미분류",
        category: row.category.trim(),
        courseCode: row.courseCode.trim(),
        courseName: row.courseName.trim(),
        credit: row.credit.trim(),
        grade: row.grade.trim(),
      }))
      .filter((row) => row.courseName);

    if (!rowsToSave.length) {
      onToast("저장할 과목이 없습니다.", "error");
      return;
    }

    setIsSavingTranscript(true);
    try {
      const payload = await postJson<{ version: TranscriptVersion; diff: TranscriptDiff }>(
        "/api/academic-transcripts",
        {
          fileName: lastFileName,
          courses: rowsToSave,
          summary: transcriptSummary,
          semesterSummaries,
        },
      );

      onRefresh(); // pendingReviewVersion 배지를 즉시 반영합니다.
      setModalStage("saved");
      setSavedVersionId(payload.version.id);
      setVersionDiff(payload.diff);
      setTranscriptNotice({
        message: "성적표를 검토 저장했습니다. 내용을 확인한 뒤 적용해주세요.",
        type: "success",
      });
      onToast("성적표를 검토 저장했습니다.", "success");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "성적표 저장에 실패했습니다.", "error");
    } finally {
      setIsSavingTranscript(false);
    }
  }

  async function activateTranscriptVersion() {
    if (!savedVersionId || isActivating) return;

    setIsActivating(true);
    try {
      await postJson(`/api/academic-transcripts/${savedVersionId}/activate`, {});
      onRefresh();
      onToast("성적표를 적용했습니다. 이제 이 버전 기준으로 GPA와 분석이 계산됩니다.", "success");
      setPreviewOpen(false);
      resetReviewState();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "성적표 적용에 실패했습니다.", "error");
    } finally {
      setIsActivating(false);
    }
  }

  async function saveAndAnalyze() {
    if (!activeVersion && pendingReviewVersion) {
      onToast("검토 중인 성적표가 있습니다. 적용 후 분석해주세요.", "error");
      return;
    }

    setIsSaving(true);
    try {
      await postJson("/api/career-profile", {
        target_company: targets.filter(Boolean).join(", "),
      });
      onRefresh();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "목표 기업 저장에 실패했습니다.",
        "error",
      );
      setIsSaving(false);
      return;
    }
    setIsSaving(false);

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analyze-career", { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "분석 실행에 실패했습니다.");
      }
      onToast("목표 기업 기준으로 분석이 업데이트되었습니다.", "success");
      router.push("/result");
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "분석 실행에 실패했습니다.",
        "error",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <>
      <SectionCard title="빠른 분석 설정" impactLabel="목표 기업과 성적표 기반 자동 입력">
        <div className="grid gap-6">
          <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 sm:grid-cols-4">
            <SummaryField label="학년" value={profile?.grade || "-"} />
            <SummaryField label="학교" value={profile?.university || "-"} />
            <SummaryField label="전공" value={profile?.major || "-"} />
            <SummaryField label="GPA" value={effectiveGpa != null ? `${effectiveGpa} / 4.5` : "-"} />
          </div>

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
              {[0, 1, 2].map((index) => {
                const currentValue = targets[index];
                // 저장된 값이 COMPANY_OPTIONS 목록에 없으면(예: 과거에 자유 입력된 값) select에
                // 해당 옵션을 동적으로 추가해, placeholder("선택하기")로 비어 보이지 않게 합니다.
                const options =
                  currentValue && !COMPANY_OPTIONS.includes(currentValue)
                    ? [currentValue, ...COMPANY_OPTIONS]
                    : COMPANY_OPTIONS;

                return (
                  <label key={index} className="grid gap-1.5">
                    <span className="text-xs font-bold text-slate-500">
                      {index + 1}순위 목표기관
                    </span>
                    <select
                      value={currentValue}
                      onChange={(event) => updateTarget(index, event.target.value)}
                      className="h-11 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm outline-none focus:border-[var(--navy)]"
                    >
                      <option value="">선택하기</option>
                      {options.map((company) => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)] p-5">
            <h3 className="text-sm font-extrabold text-[var(--ink)]">
              성적표 PDF
            </h3>

            {activeVersion ? (
              <div className="mt-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-black text-white">
                    현재 적용 중
                  </span>
                  <span className="text-sm font-extrabold">{activeVersion.file_name || "파일명 미확인"}</span>
                </div>
                <p className="mt-1 text-xs font-bold text-emerald-700">
                  {formatAcademicTerm(activeVersion.academic_term)}
                </p>
                <div className="mt-3 grid gap-2 text-xs font-bold sm:grid-cols-4">
                  <span className="rounded-full bg-white px-3 py-1.5 text-center">
                    업로드 {formatDate(activeVersion.uploaded_at)}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-center">
                    총 취득학점 {activeVersion.total_credits ?? "-"}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-center">
                    누적 GPA {activeVersion.cumulative_gpa ?? "-"}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-center">
                    저장 과목 {activeVersion.total_course_count}과목
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onViewDetail}
                    className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50"
                  >
                    성적 상세 보기
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-500">
                텍스트 선택이 가능한 성적표 PDF를 올리면 학기, 과목명, 학점, 성적을
                추출합니다. 저장 전 미리보기에서 수정할 수 있습니다.
              </p>
            )}

            {pendingReviewVersion ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold leading-5 text-amber-800">
                  검토 중인 성적표가 있습니다 ({pendingReviewVersion.file_name || "파일명 미확인"}). 적용해야
                  분석과 GPA에 반영됩니다.
                </p>
                <button
                  type="button"
                  onClick={() => void resumeReview()}
                  disabled={isResuming}
                  className="shrink-0 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {isResuming ? "불러오는 중..." : "검토 계속하기"}
                </button>
              </div>
            ) : null}

            <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
              현재는 텍스트가 선택되는 PDF만 지원합니다. 스캔본 또는 이미지 기반 PDF는 OCR을
              지원하지 않아 추출에 실패할 수 있습니다.
            </p>
            <label className="mt-4 inline-flex cursor-pointer rounded-full bg-[var(--navy)] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--navy-2)]">
              {isExtracting ? "추출 중..." : activeVersion ? "새 성적표 업로드" : "PDF 선택"}
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
              disabled={isSaving || isAnalyzing}
              className="h-12 rounded-full bg-[var(--lime)] px-6 text-sm font-black text-[var(--navy)] transition hover:bg-[var(--lime-soft)] disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : isAnalyzing ? "분석 중..." : "저장하고 분석하기"}
            </button>
          </div>
        </div>
      </SectionCard>

      <TranscriptReviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileName={lastFileName}
        notice={transcriptNotice}
        rows={transcriptRows}
        onUpdateRow={updateTranscriptRow}
        onRemoveRow={removeTranscriptRow}
        onAddRow={() => addTranscriptRow()}
        gpa={extractedGpa}
        onGpaChange={setExtractedGpa}
        summary={transcriptSummary}
        diagnostics={diagnostics}
        stage={modalStage}
        diff={versionDiff}
        onSave={() => void saveTranscriptVersion()}
        isSaving={isSavingTranscript}
        onActivate={() => void activateTranscriptVersion()}
        isActivating={isActivating}
      />
    </>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-extrabold text-[var(--ink)]">{value}</p>
    </div>
  );
}
