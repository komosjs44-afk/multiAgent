"use client";

import type { ReactNode } from "react";

export type TranscriptRow = {
  id: string;
  semester: string;
  category: string;
  courseCode: string;
  courseName: string;
  credit: string;
  grade: string;
  needsReview?: boolean;
  reviewReasons: string[];
  normalizationChanges: Array<{
    field: string;
    original: string;
    normalized: string;
    reason: string;
  }>;
  sourcePage?: number;
  sourceLine?: number;
  sourceText?: string;
  isBracketedCredit?: boolean;
  modifiedFields: string[];
};

type Props = {
  row: TranscriptRow;
  onUpdate: (patch: Partial<TranscriptRow>) => void;
  onRemove: () => void;
};

export default function TranscriptCourseEditor({ row, onUpdate, onRemove }: Props) {
  const label = row.courseName || row.courseCode || "새 과목";

  return (
    <div
      className={`grid gap-2 rounded-2xl p-2 md:grid-cols-[7rem_1fr_4rem_4rem_5rem_6rem_3rem] md:items-center ${
        row.needsReview ? "bg-amber-50" : "bg-slate-50"
      }`}
    >
      <Field label="과목코드">
        <input
          value={row.courseCode}
          onChange={(event) => onUpdate({ courseCode: event.target.value })}
          placeholder="과목코드"
          aria-label={`${label} 과목코드`}
          className="h-9 w-full rounded-xl border border-[var(--line)] bg-white px-2 text-xs outline-none focus:border-[var(--navy)]"
        />
      </Field>
      <Field label="과목명">
        <input
          value={row.courseName}
          onChange={(event) => onUpdate({ courseName: event.target.value })}
          placeholder="과목명"
          aria-label={`${label} 과목명`}
          className="h-9 w-full rounded-xl border border-[var(--line)] bg-white px-2 text-sm outline-none focus:border-[var(--navy)]"
        />
      </Field>
      <Field label="학점">
        <input
          value={row.credit}
          onChange={(event) => onUpdate({ credit: event.target.value })}
          placeholder="학점"
          aria-label={`${label} 학점`}
          className="h-9 w-full rounded-xl border border-[var(--line)] bg-white px-2 text-sm outline-none focus:border-[var(--navy)]"
        />
      </Field>
      <Field label="성적">
        <input
          value={row.grade}
          onChange={(event) => onUpdate({ grade: event.target.value })}
          placeholder="성적"
          aria-label={`${label} 성적`}
          className="h-9 w-full rounded-xl border border-[var(--line)] bg-white px-2 text-sm outline-none focus:border-[var(--navy)]"
        />
      </Field>
      <Field label="이수구분">
        <input
          value={row.category}
          onChange={(event) => onUpdate({ category: event.target.value })}
          placeholder="이수구분"
          aria-label={`${label} 이수구분`}
          className="h-9 w-full rounded-xl border border-[var(--line)] bg-white px-2 text-xs outline-none focus:border-[var(--navy)]"
        />
      </Field>
      <Field label="학기">
        <input
          value={row.semester}
          onChange={(event) => onUpdate({ semester: event.target.value })}
          placeholder="2025-1"
          aria-label={`${label} 이수학기`}
          className="h-9 w-full rounded-xl border border-[var(--line)] bg-white px-2 text-xs outline-none focus:border-[var(--navy)]"
        />
      </Field>
      <button
        type="button"
        onClick={onRemove}
        className="h-9 rounded-xl border border-red-100 text-xs font-extrabold text-red-500 hover:bg-red-50"
      >
        삭제
      </button>

      {row.reviewReasons.length > 0 || row.sourceText || row.modifiedFields.length > 0 ? (
        <div className="grid gap-1 md:col-span-7">
          {row.modifiedFields.length > 0 ? (
            <p className="text-xs font-extrabold text-blue-700">
              사용자가 수정함: {row.modifiedFields.join(", ")}
            </p>
          ) : null}
          {row.reviewReasons.map((reason) => (
            <p key={reason} className="text-xs font-bold text-amber-800">
              검토 사유: {reason}
            </p>
          ))}
          {row.needsReview ? (
            <button
              type="button"
              onClick={() => onUpdate({ needsReview: false, reviewReasons: [] })}
              className="w-fit rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-extrabold text-amber-800"
            >
              이 행 검토 완료
            </button>
          ) : null}
          {row.sourceText ? (
            <p className="rounded-lg bg-white/80 px-2 py-1 font-mono text-xs text-slate-500">
              PDF 텍스트 {row.sourcePage ?? "?"}페이지 {row.sourceLine ?? "?"}행: {row.sourceText}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-bold text-slate-500 md:sr-only">{label}</span>
      {children}
    </label>
  );
}
