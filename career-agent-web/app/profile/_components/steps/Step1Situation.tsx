"use client";

import CoachMessage from "../CoachMessage";
import SelectCard from "../shared/SelectCard";
import type { ProfileWizardState } from "../types";

const GRADES = [
  { label: "1학년", value: "1" },
  { label: "2학년", value: "2" },
  { label: "3학년", value: "3" },
  { label: "4학년", value: "4" },
  { label: "졸업생/취준생", value: "졸업" },
];

const GPA_RANGES = [
  { label: "4.0 이상", value: "4.2", desc: "최우수" },
  { label: "3.5 ~ 3.9", value: "3.7", desc: "우수" },
  { label: "3.0 ~ 3.4", value: "3.2", desc: "양호" },
  { label: "2.5 ~ 2.9", value: "2.7", desc: "보통" },
  { label: "2.4 이하", value: "2.0", desc: "노력 필요" },
];

type Props = {
  state: ProfileWizardState;
  onChange: (patch: Partial<ProfileWizardState>) => void;
};

export default function Step1Situation({ state, onChange }: Props) {
  return (
    <div className="grid gap-6">
      <CoachMessage
        message="안녕하세요! 먼저 현재 상황을 알려주세요."
        sub="학년, 전공, 학점을 기반으로 준비도를 정확히 계산합니다."
      />

      <fieldset className="grid gap-3">
        <legend className="text-sm font-extrabold text-[var(--ink)]">현재 학년</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {GRADES.map((g) => (
            <SelectCard
              key={g.value}
              label={g.label}
              selected={state.grade === g.value}
              onClick={() => onChange({ grade: g.value })}
            />
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-extrabold text-[var(--ink)]">대학교</span>
          <input
            type="text"
            value={state.university}
            onChange={(e) => onChange({ university: e.target.value })}
            placeholder="예) 한양대학교"
            className="h-12 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm outline-none focus:border-[var(--navy)] focus:ring-2 focus:ring-[var(--lime-soft)]"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-extrabold text-[var(--ink)]">전공</span>
          <input
            type="text"
            value={state.major}
            onChange={(e) => onChange({ major: e.target.value })}
            placeholder="예) 컴퓨터공학과"
            className="h-12 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm outline-none focus:border-[var(--navy)] focus:ring-2 focus:ring-[var(--lime-soft)]"
          />
        </label>
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-extrabold text-[var(--ink)]">학점 (4.5 기준)</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {GPA_RANGES.map((g) => (
            <SelectCard
              key={g.value}
              label={g.label}
              description={g.desc}
              selected={state.gpa === g.value}
              onClick={() => onChange({ gpa: g.value })}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
