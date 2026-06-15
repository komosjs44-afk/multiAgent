"use client";

import CoachMessage from "../CoachMessage";
import TagPill from "../shared/TagPill";
import type { ProfileWizardState } from "../types";

const CS_SUBJECTS = [
  "자료구조", "운영체제", "데이터베이스", "네트워크",
  "컴퓨터구조", "알고리즘", "정보보안", "소프트웨어공학",
  "인공지능", "웹프로그래밍", "프로그래밍",
];

const CERTIFICATIONS = [
  "정보처리기사", "SQLD", "컴퓨터활용능력 1급", "한국사능력검정 1급",
  "TOEIC", "OPIc", "TOPCIT",
];

type Props = {
  state: ProfileWizardState;
  onChange: (patch: Partial<ProfileWizardState>) => void;
};

function toggle(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export default function Step3Spec({ state, onChange }: Props) {
  return (
    <div className="grid gap-6">
      <CoachMessage
        message="이수한 전공과목과 보유 자격증을 선택해 주세요."
        sub="많이 선택할수록 분석이 더 정확해집니다."
      />

      <fieldset className="grid gap-3">
        <legend className="text-sm font-extrabold text-[var(--ink)]">이수한 CS 전공과목</legend>
        <div className="flex flex-wrap gap-2">
          {CS_SUBJECTS.map((subject) => (
            <TagPill
              key={subject}
              label={subject}
              selected={state.selectedSubjects.includes(subject)}
              onClick={() => onChange({ selectedSubjects: toggle(state.selectedSubjects, subject) })}
            />
          ))}
        </div>
        <p className="text-xs text-slate-400">
          {state.selectedSubjects.length}개 선택됨
        </p>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-extrabold text-[var(--ink)]">보유 자격증</legend>
        <div className="flex flex-wrap gap-2">
          {CERTIFICATIONS.map((cert) => (
            <TagPill
              key={cert}
              label={cert}
              selected={state.selectedCertifications.includes(cert)}
              onClick={() => onChange({ selectedCertifications: toggle(state.selectedCertifications, cert) })}
            />
          ))}
        </div>
      </fieldset>

      <label className="grid gap-2">
        <span className="text-sm font-extrabold text-[var(--ink)]">어학 점수 (선택)</span>
        <input
          type="text"
          value={state.languageScore}
          onChange={(e) => onChange({ languageScore: e.target.value })}
          placeholder="예) TOEIC 850, OPIc IH"
          className="h-12 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm outline-none focus:border-[var(--navy)] focus:ring-2 focus:ring-[var(--lime-soft)]"
        />
      </label>
    </div>
  );
}
