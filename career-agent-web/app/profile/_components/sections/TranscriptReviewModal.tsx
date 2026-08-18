"use client";

import { useMemo, useState } from "react";

import { CORE_MAJOR_SUBJECTS, semesterSortKey } from "@/lib/transcriptParser";
import type { ExtractedEvidence, TranscriptDiff } from "@/types/career";
import Modal from "../shared/Modal";
import TranscriptCourseEditor, { type TranscriptRow } from "./TranscriptCourseEditor";
import TranscriptReviewOverview from "./TranscriptReviewOverview";

export type { TranscriptRow } from "./TranscriptCourseEditor";

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
  sourceUrl?: string;
  extractionMethod?: "pdf-text" | "ocr";
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
  sourceUrl,
  extractionMethod,
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
      title="성적표 PDF 텍스트 추출 결과 확인"
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
      <div className="-mx-1 -mt-1 grid gap-3 bg-[var(--paper)] px-1 pb-3 pt-1 sm:sticky sm:top-0 sm:z-10">
        <TranscriptReviewOverview
          fileName={fileName}
          notice={notice}
          courseCount={rows.length}
          needsReviewCount={needsReviewCount}
          summary={summary}
          stage={stage}
          diff={diff}
          gpa={gpa}
          onGpaChange={onGpaChange}
          sourceUrl={sourceUrl}
          extractionMethod={extractionMethod}
        />

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

        <div className="flex flex-wrap items-end gap-2">
          <label className="grid w-full gap-1 sm:min-w-[10rem] sm:flex-1">
            <span className="whitespace-nowrap text-xs font-bold text-slate-600">과목명 검색</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="예: 알고리즘"
              className="h-9 w-full rounded-full border border-[var(--line)] bg-white px-4 text-xs outline-none focus:border-[var(--navy)]"
            />
          </label>
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
              aria-pressed={filter === value}
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
            <span className="text-xs font-bold text-slate-600">{semesterRows.length}과목</span>
          </summary>
          <div className="border-t border-[var(--line)] p-3">
            <div className="hidden grid-cols-[7rem_1fr_4rem_4rem_5rem_6rem_3rem] gap-2 px-2 pb-2 text-xs font-bold text-slate-600 md:grid">
              <span>과목코드</span>
              <span>과목명</span>
              <span>학점</span>
              <span>성적</span>
              <span>이수구분</span>
              <span>학기</span>
              <span></span>
            </div>
            <div className="grid gap-2">
              {semesterRows.map((row) => (
                <TranscriptCourseEditor
                  key={row.id}
                  row={row}
                  onUpdate={(patch) => onUpdateRow(row.id, patch)}
                  onRemove={() => onRemoveRow(row.id)}
                />
              ))}
            </div>
          </div>
        </details>
      ))}
    </Modal>
  );
}
