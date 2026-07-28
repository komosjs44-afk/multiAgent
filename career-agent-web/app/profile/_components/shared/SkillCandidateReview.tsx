"use client";

import { useState } from "react";

import { getSkillLabel, SKILL_TAXONOMY } from "@/lib/skillTaxonomy";
import type { EvidenceSkillCandidate, SkillCode } from "@/types/career";

const LEVEL_LABEL: Record<EvidenceSkillCandidate["contributionLevel"], string> = {
  strong: "강함",
  medium: "중간",
  weak: "약함",
};

const CONFIDENCE_LABEL: Record<EvidenceSkillCandidate["confidence"], string> = {
  high: "높음",
  medium: "중간",
  low: "낮음",
};

const CONFIDENCE_STYLE: Record<EvidenceSkillCandidate["confidence"], string> = {
  high: "bg-emerald-50 text-emerald-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-slate-100 text-slate-500",
};

type Props = {
  /** 사용자가 현재 확정(선택)한 역량 후보 목록. 이 컴포넌트는 상태를 소유하지 않고 표시/편집만 담당합니다. */
  candidates: EvidenceSkillCandidate[];
  onChange: (next: EvidenceSkillCandidate[]) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
};

export default function SkillCandidateReview({ candidates, onChange, onRegenerate, isRegenerating }: Props) {
  const [addingCode, setAddingCode] = useState<SkillCode | "">("");

  const remainingOptions = SKILL_TAXONOMY.filter(
    (entry) => entry.active && !candidates.some((c) => c.skillCode === entry.code),
  );

  function updateAt(index: number, patch: Partial<EvidenceSkillCandidate>) {
    onChange(candidates.map((candidate, i) => (i === index ? { ...candidate, ...patch } : candidate)));
  }

  function removeAt(index: number) {
    onChange(candidates.filter((_, i) => i !== index));
  }

  function addSkill() {
    if (!addingCode) return;
    onChange([
      ...candidates,
      {
        skillCode: addingCode,
        contributionLevel: "medium",
        confidence: "low",
        matchedKeywords: [],
        reason: "사용자가 직접 추가한 역량입니다.",
        source: "user",
      },
    ]);
    setAddingCode("");
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-extrabold text-slate-600">자동 추출된 역량 후보 (확인 후 저장됩니다)</span>
        {onRegenerate ? (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="text-xs font-bold text-[var(--navy)] underline decoration-dotted disabled:opacity-50"
          >
            {isRegenerating ? "추출 중..." : "다시 추출"}
          </button>
        ) : null}
      </div>

      {candidates.length === 0 ? (
        <p className="text-xs text-slate-400">
          아직 추출된 역량 후보가 없습니다. 사용 기술, 역할, 구현 기능을 입력하면 후보가 나타납니다.
        </p>
      ) : (
        <div className="grid gap-2">
          {candidates.map((candidate, index) => (
            <div key={`${candidate.skillCode}-${index}`} className="rounded-xl border border-[var(--line)] bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--lime-soft)] px-2.5 py-1 text-xs font-black text-[var(--navy)]">
                    {getSkillLabel(candidate.skillCode)}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${CONFIDENCE_STYLE[candidate.confidence]}`}>
                    신뢰도 {CONFIDENCE_LABEL[candidate.confidence]}
                  </span>
                  {candidate.source === "user" ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">직접 추가</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={candidate.contributionLevel}
                    onChange={(event) =>
                      updateAt(index, {
                        contributionLevel: event.target.value as EvidenceSkillCandidate["contributionLevel"],
                      })
                    }
                    className="h-8 rounded-full border border-[var(--line)] px-2 text-xs font-bold outline-none focus:border-[var(--navy)]"
                  >
                    {(Object.keys(LEVEL_LABEL) as Array<EvidenceSkillCandidate["contributionLevel"]>).map((level) => (
                      <option key={level} value={level}>
                        기여도 {LEVEL_LABEL[level]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className="text-xs font-bold text-red-400 hover:text-red-600"
                  >
                    제외
                  </button>
                </div>
              </div>
              {candidate.matchedKeywords.length ? (
                <p className="mt-2 text-xs text-slate-500">
                  매칭 키워드: {candidate.matchedKeywords.join(", ")}
                </p>
              ) : null}
              {candidate.reason ? (
                <p className="mt-1 text-xs leading-5 text-slate-400">{candidate.reason}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {remainingOptions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={addingCode}
            onChange={(event) => setAddingCode(event.target.value as SkillCode | "")}
            className="h-9 rounded-full border border-[var(--line)] px-3 text-xs font-bold outline-none focus:border-[var(--navy)]"
          >
            <option value="">누락된 역량 직접 추가...</option>
            {remainingOptions.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.name_ko}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addSkill}
            disabled={!addingCode}
            className="rounded-full border border-[var(--navy)]/30 px-3 py-1.5 text-xs font-bold text-[var(--navy)] disabled:opacity-40"
          >
            + 추가
          </button>
        </div>
      ) : null}
    </div>
  );
}
