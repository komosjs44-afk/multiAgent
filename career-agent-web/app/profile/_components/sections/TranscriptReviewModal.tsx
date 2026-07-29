"use client";

import { useMemo, useState } from "react";

import { CORE_MAJOR_SUBJECTS, semesterSortKey } from "@/lib/transcriptParser";
import type { ExtractedEvidence, TranscriptDiff } from "@/types/career";
import Modal from "../shared/Modal";

export type TranscriptRow = {
  id: string;
  semester: string;
  category: string;
  courseCode: string;
  courseName: string;
  credit: string;
  grade: string;
  needsReview?: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  fileName?: string;
  notice?: { message: string; type: "success" | "error" } | null;
  rows: TranscriptRow[];
  onUpdateRow: (id: string, patch: Partial<TranscriptRow>) => void;
  onRemoveRow: (id: string) => void;
  onAddRow: () => void;
  gpa: string;
  onGpaChange: (value: string) => void;
  summary?: ExtractedEvidence["summary"];
  diagnostics?: ExtractedEvidence["diagnostics"];
  /** "review": 아직 저장 전(또는 편집 중). "saved": 검토 저장까지 끝나서 적용만 남은 상태. */
  stage: "review" | "saved";
  /** stage가 "saved"일 때, 직전 active 버전과 비교한 변경분(스펙 5절). */
  diff?: TranscriptDiff | null;
  onSave: () => void;
  isSaving: boolean;
  onActivate: () => void;
  isActivating: boolean;
};

const MAJOR_CATEGORIES = new Set(["계공", "전공", "전필", "전선", "일선", "기전", "복수", "부전", "마전", "전기"]);
type CategoryFilter = "all" | "major" | "liberal" | "review";

function isMajorCategory(category: string) {
  return MAJOR_CATEGORIES.has(category.trim());
}

function groupBySemester(rows: TranscriptRow[]) {
  const groups = new Map<string, TranscriptRow[]>();
  for (const row of rows) {
    const semester = row.semester.trim() || "학기 미분류";
    const list = groups.get(semester) ?? [];
    list.push(row);
    groups.set(semester, list);
  }
  return Array.from(groups.entries()).sort((a, b) => semesterSortKey(a[0]) - semesterSortKey(b[0]));
}

export default function TranscriptReviewModal({
  isOpen,
  onClose,
  fileName,
  notice,
  rows,
  onUpdateRow,
  onRemoveRow,
  onAddRow,
  gpa,
  onGpaChange,
  summary,
  diagnostics,
  stage,
  diff,
  onSave,
  isSaving,
  onActivate,
  isActivating,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (keyword && !row.courseName.toLowerCase().includes(keyword)) return false;
      if (filter === "major" && !isMajorCategory(row.category)) return false;
      if (filter === "liberal" && isMajorCategory(row.category)) return false;
      if (filter === "review" && !row.needsReview) return false;
      return true;
    });
  }, [rows, search, filter]);

  const groupedRows = useMemo(() => groupBySemester(filteredRows), [filteredRows]);

  const coreSubjects = useMemo(() => {
    const matched = new Map<string, { grade: string; ok: boolean }>();
    for (const row of rows) {
      const hit = CORE_MAJOR_SUBJECTS.find((subject) => row.courseName.includes(subject));
      if (hit) {
        matched.set(row.courseName, {
          grade: row.grade || "-",
          ok: !["F", "C0", "C-", "D+", "D0", "D-"].includes(row.grade),
        });
      }
    }
    return Array.from(matched.entries());
  }, [rows]);

  const needsReviewCount = rows.filter((row) => row.needsReview).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="성적표 인식 결과 확인"
      size="wide"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-light">
            닫기
          </button>
          {stage === "saved" ? (
            <button
              type="button"
              onClick={onActivate}
              disabled={isActivating}
              className="btn-dark disabled:opacity-50"
            >
              {isActivating ? "적용 중..." : "이 성적표 적용하기"}
            </button>
          ) : (
            <button type="button" onClick={onSave} disabled={isSaving} className="btn-dark disabled:opacity-50">
              {isSaving ? "저장 중..." : "전체 저장"}
            </button>
          )}
        </>
      }
    >
      <div className="sticky top-0 z-10 -mx-1 -mt-1 grid gap-3 bg-[var(--paper)] px-1 pb-3 pt-1">
        {notice ? (
          <p
            className={`break-keep rounded-2xl px-4 py-2 text-xs font-bold [overflow-wrap:anywhere] ${
              notice.type === "error" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {notice.message}
          </p>
        ) : fileName ? (
          <p className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
            {fileName}에서 {rows.length}개 과목을 인식했습니다. 저장 전에 확인해주세요.
          </p>
        ) : null}

        {needsReviewCount > 0 ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
            다음 과목은 확인이 필요합니다 — 학점 또는 성적이 비어 있는 {needsReviewCount}개 과목이 아래에 노란색으로
            표시됩니다.
          </p>
        ) : null}

        {stage === "saved" && diff ? (
          <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
            <p className="text-xs font-extrabold text-[var(--ink)]">이전 성적표와 비교</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-bold text-slate-600 sm:grid-cols-5">
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-center text-emerald-700">
                신규 {diff.addedCount}개
              </span>
              <span className="rounded-full bg-amber-50 px-2 py-1 text-center text-amber-700">
                변경 {diff.changedCount}개
              </span>
              <span className="rounded-full bg-red-50 px-2 py-1 text-center text-red-600">
                삭제 {diff.removedCount}개
              </span>
              <span className="rounded-full bg-slate-50 px-2 py-1 text-center">
                GPA {diff.previousGpa ?? "-"} → {diff.newGpa ?? "-"}
              </span>
              <span className="rounded-full bg-slate-50 px-2 py-1 text-center">
                취득학점 {diff.previousCredits ?? "-"} → {diff.newCredits ?? "-"}
              </span>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <SummaryCard label="총 취득학점" value={summary?.totalCredits != null ? String(summary.totalCredits) : "-"} />
          <SummaryCard
            label="누적평점"
            value={summary?.overallGpa != null ? `${summary.overallGpa} / 4.5` : gpa ? `${gpa} / 4.5` : "-"}
          />
          <SummaryCard label="백분위" value={summary?.percentile != null ? String(summary.percentile) : "-"} />
          <SummaryCard label="총 과목" value={`${summary?.courseCount ?? rows.length}과목`} />
          <SummaryCard
            label="OCR 신뢰도"
            value={summary ? `${summary.confidencePercent}%` : "-"}
            tone={summary && summary.confidencePercent < 80 ? "warn" : "default"}
          />
        </div>

        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-500">전체 GPA (직접 수정 가능)</span>
          <input
            value={gpa}
            onChange={(event) => onGpaChange(event.target.value)}
            placeholder="3.69"
            className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--navy)]"
          />
        </label>

        {coreSubjects.length > 0 ? (
          <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
            <p className="text-xs font-extrabold text-[var(--ink)]">핵심 전공 과목</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {coreSubjects.map(([name, info]) => (
                <span
                  key={name}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    info.ok ? "bg-[var(--lime-soft)] text-[var(--navy)]" : "bg-red-50 text-red-600"
                  }`}
                >
                  {name} {info.grade} {info.ok ? "✅" : ""}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="과목명 검색"
            className="h-9 min-w-[10rem] flex-1 rounded-full border border-[var(--line)] bg-white px-4 text-xs outline-none focus:border-[var(--navy)]"
          />
          {(
            [
              ["all", "전체"],
              ["major", "전공만"],
              ["liberal", "교양만"],
              ["review", "검토 필요만"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                filter === value
                  ? "bg-[var(--navy)] text-white"
                  : "border border-[var(--line)] text-slate-600 hover:border-[var(--navy)]/40"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={onAddRow}
            className="ml-auto rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-extrabold text-[var(--navy)] hover:border-[var(--navy)]"
          >
            과목 직접 추가
          </button>
        </div>
      </div>

      {diagnostics?.warnings.length ? (
        <div className="grid gap-1">
          {diagnostics.warnings.map((warning) => (
            <p key={warning} className="text-xs font-bold text-amber-700">
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      {groupedRows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-slate-400">
          조건에 맞는 과목이 없습니다.
        </p>
      ) : null}

      {groupedRows.map(([semester, semesterRows]) => (
        <details key={semester} open className="rounded-3xl border border-[var(--line)] bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-3xl px-4 py-3">
            <span className="font-extrabold text-[var(--ink)]">{semester}</span>
            <span className="text-xs font-bold text-slate-400">{semesterRows.length}과목</span>
          </summary>
          <div className="border-t border-[var(--line)] p-3">
            <div className="hidden grid-cols-[1fr_4rem_4rem_5rem_3rem] gap-2 px-2 pb-2 text-xs font-bold text-slate-400 sm:grid">
              <span>과목명</span>
              <span>학점</span>
              <span>성적</span>
              <span>이수구분 / 학기</span>
              <span></span>
            </div>
            <div className="grid gap-2">
              {semesterRows.map((row) => (
                <div
                  key={row.id}
                  className={`grid gap-2 rounded-2xl p-2 sm:grid-cols-[1fr_4rem_4rem_5rem_3rem] sm:items-center ${
                    row.needsReview ? "bg-amber-50" : "bg-slate-50"
                  }`}
                >
                  <input
                    value={row.courseName}
                    onChange={(event) => onUpdateRow(row.id, { courseName: event.target.value })}
                    placeholder="과목명"
                    className="h-9 w-full rounded-xl border border-[var(--line)] bg-white px-2 text-sm outline-none focus:border-[var(--navy)]"
                  />
                  <input
                    value={row.credit}
                    onChange={(event) => onUpdateRow(row.id, { credit: event.target.value })}
                    placeholder="학점"
                    className="h-9 w-full rounded-xl border border-[var(--line)] bg-white px-2 text-sm outline-none focus:border-[var(--navy)]"
                  />
                  <input
                    value={row.grade}
                    onChange={(event) => onUpdateRow(row.id, { grade: event.target.value })}
                    placeholder="성적"
                    className="h-9 w-full rounded-xl border border-[var(--line)] bg-white px-2 text-sm outline-none focus:border-[var(--navy)]"
                  />
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      value={row.category}
                      onChange={(event) => onUpdateRow(row.id, { category: event.target.value })}
                      placeholder="이수구분"
                      className="h-9 w-full rounded-xl border border-[var(--line)] bg-white px-2 text-xs outline-none focus:border-[var(--navy)]"
                    />
                    <input
                      value={row.semester}
                      onChange={(event) => onUpdateRow(row.id, { semester: event.target.value })}
                      placeholder="2025-1"
                      className="h-9 w-full rounded-xl border border-[var(--line)] bg-white px-2 text-xs outline-none focus:border-[var(--navy)]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveRow(row.id)}
                    className="h-9 rounded-xl border border-red-100 text-xs font-extrabold text-red-500 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
        </details>
      ))}
    </Modal>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={`rounded-2xl px-3 py-2 ${tone === "warn" ? "bg-amber-50" : "bg-white"} border border-[var(--line)]`}
    >
      <p className="text-[0.65rem] font-bold text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-extrabold text-[var(--ink)]">{value}</p>
    </div>
  );
}
