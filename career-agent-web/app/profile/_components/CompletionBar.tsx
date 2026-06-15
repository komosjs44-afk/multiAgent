"use client";

import type { ProfileWizardState } from "./types";

type Item = { label: string; done: boolean };

function calcCompletion(state: ProfileWizardState): { pct: number; items: Item[] } {
  const items: Item[] = [
    { label: "학년/전공 입력", done: !!state.grade && !!state.major },
    { label: "GPA 입력", done: !!state.gpa },
    { label: "목표 기관 설정", done: !!state.targetCompany },
    { label: "전공과목 선택", done: state.selectedSubjects.length > 0 },
    { label: "자격증 입력", done: state.selectedCertifications.length > 0 },
    { label: "경험 추가", done: state.experiences.length > 0 },
    { label: "성적표 업로드", done: state.extractedCourses.length > 0 },
  ];
  const done = items.filter((i) => i.done).length;
  return { pct: Math.round((done / items.length) * 100), items };
}

type Props = { state: ProfileWizardState };

export default function CompletionBar({ state }: Props) {
  const { pct, items } = calcCompletion(state);
  const accuracy = Math.round(pct * 0.18);

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-extrabold text-[var(--ink)]">프로필 완성도</span>
          <span className="rounded-full bg-[var(--lime)] px-2.5 py-0.5 text-xs font-black text-[var(--navy)]">
            {pct}%
          </span>
        </div>
        {pct < 100 ? (
          <span className="text-xs text-slate-500">
            완성 시 분석 정확도 +{accuracy}%
          </span>
        ) : (
          <span className="text-xs font-bold text-emerald-600">✓ 분석 준비 완료</span>
        )}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[var(--lime)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {items.map((item) => (
          <span key={item.label} className={`text-xs ${item.done ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
            {item.done ? "☑" : "□"} {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
