"use client";

import { useEffect, useMemo, useState } from "react";

import { getJson, patchJson, postJson } from "../apiUtils";
import EmptyState from "../shared/EmptyState";
import Modal from "../shared/Modal";
import SectionCard from "../shared/SectionCard";
import {
  computeCourseAggregate,
  getCategory,
  getCourseCode,
  type CleanupPreview,
} from "@/lib/academicSummary";
import {
  CORE_MAJOR_SUBJECTS,
  compareSemesters,
  resolveAcademicTerm,
} from "@/lib/transcriptParser";
import type { AcademicRecord, SemesterSummaryRecord, TranscriptVersion } from "@/types/career";

const CORE_SUBJECTS = CORE_MAJOR_SUBJECTS;

type Props = {
  records: AcademicRecord[];
  activeVersion: TranscriptVersion | null;
  semesterSummaries: SemesterSummaryRecord[];
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

function checkCoreSubjectCoverage(records: AcademicRecord[]) {
  return CORE_SUBJECTS.map((subject) => {
    const match = records.find((record) => record.course_name.includes(subject));
    return {
      subject,
      fulfilled: Boolean(match),
      grade: match?.grade || "",
    };
  });
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

function formatAcademicTerm(term: string) {
  const match = term.match(/^(\d{4})-(\d)$/);
  if (!match) return term || "반영 학기 미확인";
  return `${match[1]}년 ${match[2]}학기`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ko-KR");
}

type EditRow = {
  courseName: string;
  credit: string;
  grade: string;
  category: string;
  courseCode: string;
};

export default function SubjectSection({ records, activeVersion, semesterSummaries, onRefresh, onToast }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [editTarget, setEditTarget] = useState<AcademicRecord | null>(null);
  const [locallyDeletedIds, setLocallyDeletedIds] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [editingSemester, setEditingSemester] = useState<string | null>(null);
  const [editRows, setEditRows] = useState<Record<string, EditRow>>({});
  const [savingSemester, setSavingSemester] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<CleanupPreview | null>(null);
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleanupDeleting, setCleanupDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getJson<CleanupPreview>("/api/academic-records/cleanup")
      .then((preview) => {
        if (!cancelled) setCleanupPreview(preview);
      })
      .catch(() => {
        // 정리 미리보기는 부가 기능이므로 실패해도 화면 표시를 막지 않습니다.
      });
    return () => {
      cancelled = true;
    };
  }, [records]);

  const visibleRecords = useMemo(
    () => dedupeRecords(records.filter((record) => !locallyDeletedIds.includes(record.id))),
    [records, locallyDeletedIds],
  );
  const grouped = useMemo(() => groupCoursesBySemester(visibleRecords), [visibleRecords]);
  const coverage = useMemo(() => checkCoreSubjectCoverage(visibleRecords), [visibleRecords]);
  const fallbackSummary = useMemo(() => computeCourseAggregate(visibleRecords), [visibleRecords]);
  const semesterKeys = useMemo(() => {
    const keys = Object.keys(grouped).sort(compareSemesters);
    return sortDirection === "desc" ? keys.reverse() : keys;
  }, [grouped, sortDirection]);
  const hasRawDuplicates = records.length > visibleRecords.length;
  const semesterSummaryByKey = useMemo(
    () => new Map(semesterSummaries.map((row) => [row.semester, row])),
    [semesterSummaries],
  );

  const totalCredits = activeVersion?.total_credits ?? (fallbackSummary.totalCredits || null);
  const averageGpa = activeVersion?.cumulative_gpa ?? fallbackSummary.averageGpa;
  const courseCount = activeVersion?.total_course_count ?? fallbackSummary.courseCount;
  const activeAcademicTerm = resolveAcademicTerm(
    activeVersion?.academic_term,
    visibleRecords.map((record) => record.semester),
  );

  function openAdd(semester = "") {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, semester });
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
      course_code: form.courseCode.trim(),
      category: form.category.trim(),
      skill_mapping: [form.category.trim(), form.courseCode.trim(), courseName].filter(Boolean),
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

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      const res = await fetch("/api/academic-records?all=true", { method: "DELETE" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "전체 삭제에 실패했습니다.");
      }
      onRefresh();
      onToast("모든 성적 데이터를 삭제했습니다.", "success");
      setConfirmDeleteAll(false);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "전체 삭제에 실패했습니다.", "error");
    } finally {
      setDeletingAll(false);
    }
  }

  async function handleCleanupDelete() {
    setCleanupDeleting(true);
    try {
      const res = await fetch("/api/academic-records/cleanup?confirm=true", { method: "DELETE" });
      const payload = (await res.json().catch(() => null)) as { deletedCount?: number; error?: string } | null;
      if (!res.ok) {
        throw new Error(payload?.error ?? "정리 삭제에 실패했습니다.");
      }
      onRefresh();
      onToast(`정리 대상 ${payload?.deletedCount ?? 0}건을 삭제했습니다.`, "success");
      setCleanupModalOpen(false);
      setCleanupPreview(null);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "정리 삭제에 실패했습니다.", "error");
    } finally {
      setCleanupDeleting(false);
    }
  }

  function startEditSemester(semester: string, semesterRecords: AcademicRecord[]) {
    const rows: Record<string, EditRow> = {};
    for (const record of semesterRecords) {
      rows[record.id] = {
        courseName: record.course_name,
        credit: record.credit == null ? "" : String(record.credit),
        grade: record.grade ?? "",
        category: getCategory(record) ?? "",
        courseCode: getCourseCode(record) ?? "",
      };
    }
    setEditRows(rows);
    setEditingSemester(semester);
  }

  function cancelEditSemester() {
    setEditingSemester(null);
    setEditRows({});
  }

  function updateEditRow(id: string, patch: Partial<EditRow>) {
    setEditRows((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  async function saveEditSemester(semester: string, semesterRecords: AcademicRecord[]) {
    setSavingSemester(true);
    try {
      await Promise.all(
        semesterRecords.map((record) => {
          const edit = editRows[record.id];
          if (!edit) return Promise.resolve();
          return patchJson("/api/academic-records", {
            id: record.id,
            course_name: edit.courseName,
            credit: edit.credit,
            grade: edit.grade,
            semester: record.semester,
            course_code: edit.courseCode,
            category: edit.category,
            skill_mapping: [edit.category, edit.courseCode, edit.courseName].filter(Boolean),
          });
        }),
      );
      onRefresh();
      onToast(`${semester} 학기 성적을 수정했습니다.`, "success");
      cancelEditSemester();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "학기 수정에 실패했습니다.", "error");
    } finally {
      setSavingSemester(false);
    }
  }

  return (
    <>
      <SectionCard
        title="성적 입력"
        impactLabel="학기별 과목과 성적이 적합도 분석에 반영됩니다"
        count={visibleRecords.length}
        onAdd={() => openAdd()}
        addLabel="과목 추가"
      >
        {visibleRecords.length === 0 ? (
          <EmptyState
            message="성적표 PDF를 업로드하거나 과목을 직접 추가하면 전산직 핵심 역량과 비교해 준비도를 계산할 수 있습니다."
            onAdd={() => openAdd()}
            addLabel="+ 과목 추가"
          />
        ) : (
          <div className="grid gap-6">
            {cleanupPreview && cleanupPreview.junkCount > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold leading-5 text-amber-800">
                  이전 방식으로 저장된 과목 {cleanupPreview.totalCount}개 중 정리 대상 {cleanupPreview.junkCount}개가
                  있습니다(중복·OCR 오류 추정).
                </p>
                <button
                  type="button"
                  onClick={() => setCleanupModalOpen(true)}
                  className="shrink-0 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-amber-600"
                >
                  정리 대상 미리보기
                </button>
              </div>
            ) : null}

            <div className="rounded-3xl bg-[var(--paper)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-extrabold text-[var(--ink)]">학업 성적 요약</p>
                {!confirmDeleteAll ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAll(true)}
                    className="shrink-0 rounded-full px-3 py-1 text-xs font-bold text-red-500 hover:bg-red-50"
                  >
                    전체 삭제
                  </button>
                ) : (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-xs font-bold text-red-500">전체 삭제할까요?</span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAll()}
                      disabled={deletingAll}
                      className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      {deletingAll ? "삭제 중..." : "삭제 확정"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAll(false)}
                      disabled={deletingAll}
                      className="rounded-full px-3 py-1 text-xs font-bold text-slate-400 hover:bg-slate-100"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                누적/총계 행은 제외하고 학기별 이수 과목만 저장합니다.
              </p>
              {hasRawDuplicates && (
                <p className="mt-1 text-xs font-bold text-amber-600">
                  중복 저장된 항목 {records.length - visibleRecords.length}건은 화면에서 자동으로 숨겼습니다.
                </p>
              )}
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                <SummaryStat label="총 취득학점" value={totalCredits != null ? `${totalCredits}학점` : "-"} />
                <SummaryStat label="평균 평점" value={averageGpa != null ? `${averageGpa} / 4.5` : "-"} />
                <SummaryStat label="총 과목" value={`${courseCount}과목`} />
                <SummaryStat
                  label="현재 반영본"
                  value={activeVersion ? formatAcademicTerm(activeAcademicTerm ?? "") : "미적용"}
                />
                <SummaryStat
                  label="최근 업데이트"
                  value={activeVersion ? formatDate(activeVersion.updated_at) : "-"}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold text-[var(--ink)]">학기별 성적</p>
              <button
                type="button"
                onClick={() => setSortDirection((current) => (current === "desc" ? "asc" : "desc"))}
                className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-[var(--navy)]/40"
              >
                {sortDirection === "desc" ? "최신순" : "오래된순"}
              </button>
            </div>

            <div className="grid gap-4">
              {semesterKeys.map((semester, index) => {
                const semesterRecords = grouped[semester];
                const officialSummary = semesterSummaryByKey.get(semester);
                const computed = computeCourseAggregate(semesterRecords);
                const earnedCredits = officialSummary?.earned_credits ?? (computed.totalCredits || null);
                const semesterGpa = officialSummary?.semester_gpa ?? computed.averageGpa;
                const percentile = officialSummary?.percentile;
                const isEditing = editingSemester === semester;

                return (
                  <details key={semester} open={index === 0} className="rounded-3xl border border-[var(--line)] bg-white">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div>
                        <h3 className="font-extrabold text-[var(--ink)]">{semester}</h3>
                        <p className="mt-0.5 text-xs font-bold text-slate-400">
                          {semesterRecords.length}과목 · 이수학점 {earnedCredits ?? "-"} · 학기 평점{" "}
                          {semesterGpa ?? "-"}
                          {percentile != null ? ` · 백분위 ${percentile}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2" onClick={(event) => event.preventDefault()}>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void saveEditSemester(semester, semesterRecords)}
                              disabled={savingSemester}
                              className="rounded-full bg-[var(--navy)] px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                            >
                              {savingSemester ? "저장 중..." : "저장"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditSemester}
                              disabled={savingSemester}
                              className="rounded-full px-3 py-1 text-xs font-bold text-slate-400 hover:bg-slate-100"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditSemester(semester, semesterRecords)}
                              className="rounded-full px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100"
                            >
                              학기 전체 수정
                            </button>
                            <button
                              type="button"
                              onClick={() => openAdd(semester)}
                              className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-bold text-[var(--navy)] hover:border-[var(--navy)]"
                            >
                              과목 추가
                            </button>
                          </>
                        )}
                      </div>
                    </summary>
                    <div className="border-t border-[var(--line)] p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {semesterRecords.map((record) => {
                          const code = getCourseCode(record);
                          const category = getCategory(record);
                          const edit = editRows[record.id];

                          if (isEditing && edit) {
                            return (
                              <div
                                key={record.id}
                                className="grid grid-cols-[1fr_4rem_4rem] gap-1.5 rounded-2xl border border-[var(--line)] bg-white p-2"
                              >
                                <input
                                  value={edit.courseName}
                                  onChange={(event) => updateEditRow(record.id, { courseName: event.target.value })}
                                  className="col-span-3 h-9 rounded-xl border border-[var(--line)] px-2 text-sm outline-none focus:border-[var(--navy)]"
                                  placeholder="과목명"
                                />
                                <input
                                  value={edit.credit}
                                  onChange={(event) => updateEditRow(record.id, { credit: event.target.value })}
                                  className="h-9 rounded-xl border border-[var(--line)] px-2 text-xs outline-none focus:border-[var(--navy)]"
                                  placeholder="학점"
                                />
                                <input
                                  value={edit.grade}
                                  onChange={(event) => updateEditRow(record.id, { grade: event.target.value })}
                                  className="h-9 rounded-xl border border-[var(--line)] px-2 text-xs outline-none focus:border-[var(--navy)]"
                                  placeholder="성적"
                                />
                                <input
                                  value={edit.category}
                                  onChange={(event) => updateEditRow(record.id, { category: event.target.value })}
                                  className="h-9 rounded-xl border border-[var(--line)] px-2 text-xs outline-none focus:border-[var(--navy)]"
                                  placeholder="이수구분"
                                />
                              </div>
                            );
                          }

                          return (
                            <div
                              key={record.id}
                              className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 ${
                                record.requires_review
                                  ? "border-amber-300 bg-amber-50"
                                  : "border-slate-100 bg-slate-50"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p
                                  className="truncate text-sm font-extrabold text-[var(--ink)]"
                                  title={record.course_name}
                                >
                                  {record.course_name}
                                </p>
                                <p className="mt-0.5 text-xs font-bold text-slate-400">
                                  {[category, code].filter(Boolean).join(" · ") || "-"}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-600">
                                <span>{record.credit ?? "-"}학점</span>
                                <span>{record.grade || "-"}</span>
                                <button
                                  type="button"
                                  onClick={() => openEdit(record)}
                                  className="rounded-full px-2 py-1 text-slate-400 hover:bg-white hover:text-[var(--navy)]"
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(record.id)}
                                  disabled={deletingId === record.id}
                                  className="rounded-full px-2 py-1 text-red-500 hover:bg-red-50 disabled:opacity-50"
                                >
                                  {deletingId === record.id ? "삭제 중" : "삭제"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>

            <div>
              <p className="text-sm font-extrabold text-[var(--ink)]">전산직 핵심 과목 충족도</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {coverage.map((item) => (
                  <div
                    key={item.subject}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold ${
                      item.fulfilled
                        ? "bg-[var(--lime-soft)] text-[var(--navy)]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span>{item.subject}</span>
                    <span>{item.fulfilled ? item.grade || "충족" : "부족"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <Modal
        isOpen={cleanupModalOpen}
        onClose={() => setCleanupModalOpen(false)}
        title="정리 대상 미리보기"
        footer={
          <>
            <button type="button" onClick={() => setCleanupModalOpen(false)} className="btn-light">
              닫기
            </button>
            <button
              type="button"
              onClick={() => void handleCleanupDelete()}
              disabled={cleanupDeleting || !cleanupPreview?.junkCount}
              className="btn-dark disabled:opacity-50"
            >
              {cleanupDeleting ? "삭제 중..." : `정리 대상만 삭제 (${cleanupPreview?.junkCount ?? 0}건)`}
            </button>
          </>
        }
      >
        <p className="text-xs leading-5 text-slate-500">
          삭제 전 원본은 백업 로그에 남습니다. 아래 {cleanupPreview?.junkCount ?? 0}건만 삭제되고, 나머지 과목은
          그대로 유지됩니다.
        </p>
        <div className="grid gap-2">
          {(cleanupPreview?.candidates ?? []).map((candidate) => (
            <div key={candidate.id} className="rounded-2xl bg-slate-50 px-4 py-2.5">
              <p className="text-sm font-extrabold text-[var(--ink)]">
                {candidate.course_name || "(과목명 없음)"} <span className="text-xs font-bold text-slate-400">· {candidate.semester}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{candidate.reason}</p>
            </div>
          ))}
        </div>
      </Modal>

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

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-2 text-center">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-extrabold text-[var(--ink)]">{value}</p>
    </div>
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
