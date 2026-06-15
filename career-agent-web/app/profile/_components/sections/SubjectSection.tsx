"use client";

import { useMemo, useState } from "react";

import { patchJson, postJson } from "../apiUtils";
import EmptyState from "../shared/EmptyState";
import Modal from "../shared/Modal";
import SectionCard from "../shared/SectionCard";
import type { AcademicRecord } from "@/types/career";

const CORE_SUBJECTS = [
  "자료구조",
  "운영체제",
  "데이터베이스",
  "네트워크",
  "컴퓨터구조",
  "알고리즘",
  "보안",
  "소프트웨어공학",
];

const CATEGORY_VALUES = new Set([
  "교필",
  "교선",
  "계공",
  "전공",
  "전필",
  "전선",
  "일선",
  "기전",
  "복수",
  "부전",
  "마전",
]);

type Props = {
  records: AcademicRecord[];
  onRefresh: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

type FormState = {
  courseName: string;
  credit: string;
  grade: string;
  semester: string;
  courseCode: string;
  category: string;
};

const EMPTY_FORM: FormState = {
  courseName: "",
  credit: "",
  grade: "",
  semester: "",
  courseCode: "",
  category: "",
};

function getCourseCode(record: AcademicRecord) {
  return record.skill_mapping.find((item) => /^[A-Z]{1,5}\d{2,4}[A-Z0-9]*$/.test(item));
}

function getCategory(record: AcademicRecord) {
  return record.skill_mapping.find((item) => CATEGORY_VALUES.has(item));
}

function getRecordKey(record: AcademicRecord) {
  const semester = record.semester?.trim() || "학기 미분류";
  return `${semester}:${getCourseCode(record) || record.course_name.trim()}`;
}

function dedupeRecords(records: AcademicRecord[]) {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = getRecordKey(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function groupCoursesBySemester(records: AcademicRecord[]) {
  return records.reduce<Record<string, AcademicRecord[]>>((groups, record) => {
    const semester = record.semester?.trim() || "학기 미분류";
    groups[semester] = groups[semester] ?? [];
    groups[semester].push(record);
    return groups;
  }, {});
}

function sortSemesters(a: string, b: string) {
  if (a === "학기 미분류") return 1;
  if (b === "학기 미분류") return -1;
  return a.localeCompare(b, "ko");
}

function checkCoreSubjectCoverage(records: AcademicRecord[]) {
  const courseText = records.map((record) => record.course_name).join(" ");
  return CORE_SUBJECTS.map((subject) => ({
    subject,
    fulfilled: courseText.includes(subject),
  }));
}

function formFromRecord(record: AcademicRecord): FormState {
  return {
    courseName: record.course_name,
    credit: record.credit == null ? "" : String(record.credit),
    grade: record.grade ?? "",
    semester: record.semester ?? "",
    courseCode: getCourseCode(record) ?? "",
    category: getCategory(record) ?? "",
  };
}

export default function SubjectSection({ records, onRefresh, onToast }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<AcademicRecord | null>(null);
  const [locallyDeletedIds, setLocallyDeletedIds] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const visibleRecords = useMemo(
    () => dedupeRecords(records.filter((record) => !locallyDeletedIds.includes(record.id))),
    [records, locallyDeletedIds],
  );
  const grouped = useMemo(() => groupCoursesBySemester(visibleRecords), [visibleRecords]);
  const coverage = useMemo(() => checkCoreSubjectCoverage(visibleRecords), [visibleRecords]);
  const semesterKeys = Object.keys(grouped).sort(sortSemesters);

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(record: AcademicRecord) {
    setEditTarget(record);
    setForm(formFromRecord(record));
    setOpen(true);
  }

  async function handleSave() {
    const courseName = form.courseName.trim();
    const semester = form.semester.trim() || "학기 미분류";
    if (!courseName) return;

    const duplicate = visibleRecords.some(
      (record) =>
        record.id !== editTarget?.id &&
        record.course_name.trim() === courseName &&
        (record.semester?.trim() || "학기 미분류") === semester,
    );
    if (duplicate) {
      onToast("이미 등록된 과목입니다.", "error");
      return;
    }

    const payload = {
      course_name: courseName,
      credit: form.credit,
      grade: form.grade,
      semester,
      skill_mapping: [
        form.category.trim(),
        form.courseCode.trim(),
        courseName,
      ].filter(Boolean),
    };

    setSaving(true);
    try {
      if (editTarget) {
        await patchJson("/api/academic-records", { id: editTarget.id, ...payload });
      } else {
        await postJson("/api/academic-records", payload);
      }
      onRefresh();
      onToast(editTarget ? "과목을 수정했습니다." : "과목을 추가했습니다.", "success");
      setOpen(false);
      setEditTarget(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "저장에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setLocallyDeletedIds((current) => [...current, id]);
    setDeletingId(id);

    try {
      const res = await fetch(`/api/academic-records?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "삭제에 실패했습니다.");
      }
      onRefresh();
      onToast("과목을 삭제했습니다.", "success");
    } catch (err) {
      setLocallyDeletedIds((current) => current.filter((item) => item !== id));
      onToast(err instanceof Error ? err.message : "삭제에 실패했습니다.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <SectionCard
        title="성적 입력"
        impactLabel="학기별 과목과 성적이 적합도 분석에 반영됩니다"
        count={visibleRecords.length}
        onAdd={openAdd}
        addLabel="과목 추가"
      >
        {visibleRecords.length === 0 ? (
          <EmptyState
            message="성적표 PDF를 업로드하거나 과목을 직접 추가하면 전산직 핵심 역량과 비교해 준비도를 계산할 수 있습니다."
            onAdd={openAdd}
            addLabel="+ 과목 추가"
          />
        ) : (
          <div className="grid gap-6">
            <div className="rounded-3xl bg-[var(--paper)] p-4">
              <p className="text-sm font-extrabold text-[var(--ink)]">학업 성적 요약</p>
              <p className="mt-1 text-xs text-slate-500">
                누적/총계 행은 제외하고 학기별 이수 과목만 저장합니다.
              </p>
            </div>

            <div className="grid gap-4">
              {semesterKeys.map((semester) => (
                <div key={semester} className="rounded-3xl border border-[var(--line)] p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-[var(--ink)]">{semester}</h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                      {grouped[semester].length}과목
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {grouped[semester].map((record) => {
                      const code = getCourseCode(record);
                      const category = getCategory(record);

                      return (
                        <div key={record.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold text-[var(--ink)]">
                                {record.course_name}
                              </p>
                              <p className="mt-1 text-xs font-bold text-slate-400">
                                {[category, code].filter(Boolean).join(" · ") || "과목 정보"}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(record)}
                                className="rounded-full px-2 py-1 text-xs font-bold text-slate-400 hover:bg-white hover:text-[var(--navy)]"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(record.id)}
                                disabled={deletingId === record.id}
                                className="rounded-full px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingId === record.id ? "삭제 중" : "삭제"}
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                            <span className="rounded-full bg-white px-3 py-1">
                              {record.credit ?? "-"}학점
                            </span>
                            <span className="rounded-full bg-white px-3 py-1">
                              {record.grade || "성적 미입력"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <p className="text-sm font-extrabold text-[var(--ink)]">전산직 핵심 과목 충족도</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {coverage.map((item) => (
                  <div
                    key={item.subject}
                    className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                      item.fulfilled
                        ? "bg-[var(--lime-soft)] text-[var(--navy)]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.subject} {item.fulfilled ? "충족" : "부족"}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editTarget ? "과목 수정" : "과목 추가"}
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="btn-light">
              닫기
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.courseName.trim()}
              className="btn-dark disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </>
        }
      >
        <div className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">핵심 과목 빠른 선택</span>
          <div className="flex flex-wrap gap-2">
            {CORE_SUBJECTS.filter(
              (subject) => !visibleRecords.some((record) => record.course_name.includes(subject)),
            ).map((subject) => (
              <button
                key={subject}
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, courseName: subject }))
                }
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  form.courseName === subject
                    ? "bg-[var(--navy)] text-white"
                    : "border border-[var(--line)] text-slate-600 hover:border-[var(--navy)]/40"
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="과목명"
          value={form.courseName}
          onChange={(value) => setForm((current) => ({ ...current, courseName: value }))}
          placeholder="운영체제"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="학기"
            value={form.semester}
            onChange={(value) => setForm((current) => ({ ...current, semester: value }))}
            placeholder="2025-1"
          />
          <Input
            label="과목코드"
            value={form.courseCode}
            onChange={(value) => setForm((current) => ({ ...current, courseCode: value }))}
            placeholder="AS011C"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Input
            label="이수구분"
            value={form.category}
            onChange={(value) => setForm((current) => ({ ...current, category: value }))}
            placeholder="계공"
          />
          <Input
            label="학점"
            value={form.credit}
            onChange={(value) => setForm((current) => ({ ...current, credit: value }))}
            placeholder="3"
          />
          <Input
            label="성적"
            value={form.grade}
            onChange={(value) => setForm((current) => ({ ...current, grade: value }))}
            placeholder="A0"
          />
        </div>
      </Modal>
    </>
  );
}

function Input({
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
    <label className="grid gap-1.5">
      <span className="text-xs font-extrabold text-slate-600">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]"
      />
    </label>
  );
}
