"use client";

import CoachMessage from "../CoachMessage";
import SelectCard from "../shared/SelectCard";
import TagPill from "../shared/TagPill";
import type { ProfileWizardState } from "../types";

const COMPANY_TYPES = [
  { label: "에너지 공기업", icon: "⚡", desc: "한전, 가스공사 등" },
  { label: "교통/공항 공기업", icon: "✈️", desc: "인국공, 코레일 등" },
  { label: "금융 공기업", icon: "🏦", desc: "금결원, 예탁원 등" },
  { label: "공단/준정부기관", icon: "🏛️", desc: "건강보험, 고용보험 등" },
  { label: "공공 IT 기관", icon: "💻", desc: "정통부 산하 기관 등" },
];

const COMPANIES: Record<string, string[]> = {
  "에너지 공기업": ["한국전력공사", "한국가스공사", "한국수력원자력"],
  "교통/공항 공기업": ["인천국제공항공사", "한국철도공사", "한국공항공사"],
  "금융 공기업": ["금융결제원", "한국예탁결제원", "한국자산관리공사"],
  "공단/준정부기관": ["국민건강보험공단", "근로복지공단", "한국산업안전보건공단"],
  "공공 IT 기관": ["한국지능정보사회진흥원", "한국인터넷진흥원", "정보통신산업진흥원"],
};

const JOBS = ["전산직", "IT직", "정보통신직", "소프트웨어직", "시스템직"];

type Props = {
  state: ProfileWizardState;
  onChange: (patch: Partial<ProfileWizardState>) => void;
};

export default function Step2Goal({ state, onChange }: Props) {
  const availableCompanies = COMPANIES[state.targetCompanyType] ?? [];

  function handleTypeSelect(type: string) {
    const firstCompany = COMPANIES[type]?.[0] ?? "";
    onChange({ targetCompanyType: type, targetCompany: firstCompany });
  }

  return (
    <div className="grid gap-6">
      <CoachMessage
        message="어떤 공기업을 목표로 하고 있나요?"
        sub="기관 유형과 직무를 선택하면 더 정밀한 분석이 가능합니다."
      />

      <fieldset className="grid gap-3">
        <legend className="text-sm font-extrabold text-[var(--ink)]">기관 유형</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {COMPANY_TYPES.map((ct) => (
            <SelectCard
              key={ct.label}
              label={ct.label}
              description={ct.desc}
              icon={ct.icon}
              selected={state.targetCompanyType === ct.label}
              onClick={() => handleTypeSelect(ct.label)}
            />
          ))}
        </div>
      </fieldset>

      {availableCompanies.length > 0 ? (
        <fieldset className="grid gap-3">
          <legend className="text-sm font-extrabold text-[var(--ink)]">목표 기관</legend>
          <div className="flex flex-wrap gap-2">
            {availableCompanies.map((company) => (
              <TagPill
                key={company}
                label={company}
                selected={state.targetCompany === company}
                onClick={() => onChange({ targetCompany: company })}
              />
            ))}
            <input
              type="text"
              value={availableCompanies.includes(state.targetCompany) ? "" : state.targetCompany}
              onChange={(e) => onChange({ targetCompany: e.target.value })}
              placeholder="직접 입력"
              className="h-8 rounded-full border border-dashed border-[var(--line)] px-3 text-xs outline-none focus:border-[var(--navy)] focus:ring-1 focus:ring-[var(--lime-soft)]"
            />
          </div>
        </fieldset>
      ) : null}

      <fieldset className="grid gap-3">
        <legend className="text-sm font-extrabold text-[var(--ink)]">목표 직무</legend>
        <div className="flex flex-wrap gap-2">
          {JOBS.map((job) => (
            <TagPill
              key={job}
              label={job}
              selected={state.targetJob === job}
              onClick={() => onChange({ targetJob: job })}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
