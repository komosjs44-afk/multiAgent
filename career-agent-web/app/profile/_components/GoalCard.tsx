"use client";

import type { ProfileWizardState } from "./types";

const COMPANY_REQUIRED: Record<string, string[]> = {
  "에너지 공기업":    ["운영체제", "데이터베이스", "네트워크", "알고리즘"],
  "교통/공항 공기업": ["데이터베이스", "네트워크", "운영체제", "정보보안"],
  "금융 공기업":      ["데이터베이스", "정보보안", "알고리즘", "소프트웨어공학"],
  "공단/준정부기관":  ["데이터베이스", "운영체제", "웹프로그래밍", "네트워크"],
  "공공 IT 기관":     ["알고리즘", "운영체제", "데이터베이스", "정보보안"],
};

const CERT_REQUIRED: Record<string, string[]> = {
  "에너지 공기업":    ["정보처리기사", "SQLD"],
  "교통/공항 공기업": ["정보처리기사", "SQLD"],
  "금융 공기업":      ["정보처리기사", "SQLD", "컴퓨터활용능력 1급"],
  "공단/준정부기관":  ["정보처리기사", "컴퓨터활용능력 1급"],
  "공공 IT 기관":     ["정보처리기사", "SQLD", "TOPCIT"],
};

type Props = { state: ProfileWizardState };

export default function GoalCard({ state }: Props) {
  if (!state.targetCompany || !state.targetCompanyType) return null;

  const subjects = COMPANY_REQUIRED[state.targetCompanyType] ?? [];
  const certs = CERT_REQUIRED[state.targetCompanyType] ?? [];

  const allItems = [
    ...subjects.map((s) => ({ label: s, ok: state.selectedSubjects.includes(s), type: "subject" })),
    ...certs.map((c) => ({ label: c, ok: state.selectedCertifications.includes(c), type: "cert" })),
  ];

  const okCount = allItems.filter((i) => i.ok).length;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">목표 기관</p>
          <p className="mt-0.5 font-extrabold text-[var(--ink)]">{state.targetCompany}</p>
          <p className="text-xs text-slate-500">{state.targetJob} 기준 추천 역량</p>
        </div>
        <span className="rounded-full bg-[var(--lime-soft)] px-2.5 py-1 text-xs font-black text-[var(--navy)]">
          {okCount}/{allItems.length} 충족
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {allItems.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
              item.ok
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-50 text-slate-500"
            }`}
          >
            <span>{item.ok ? "✓" : "△"}</span>
            <span className="truncate">{item.label}</span>
            {item.type === "cert" ? (
              <span className="ml-auto shrink-0 text-xs text-slate-400">자격증</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
