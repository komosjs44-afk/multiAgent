import { getSkillLabel, SKILL_TAXONOMY } from "@/lib/skillTaxonomy";
import type { EvidenceRecordType, EvidenceSkillCandidate, SkillCode } from "@/types/career";

export type EvidenceMapperInput = {
  title: string;
  type: EvidenceRecordType;
  description?: string | null;
  /** "사용 기술" — 콤마 구분 문자열 또는 배열. EvidenceRecord.skills를 그대로 넘기면 됩니다. */
  technologies?: string | string[] | null;
  role?: string | null;
  implementedFeatures?: string | null;
  problemSolved?: string | null;
  /** "성과" — EvidenceRecord.result를 그대로 넘기면 됩니다. */
  outcome?: string | null;
  evidenceUrl?: string | null;
};

const LEVEL_ORDER: Record<EvidenceSkillCandidate["contributionLevel"], number> = {
  strong: 2,
  medium: 1,
  weak: 0,
};

// Evidence 유형이 해당 역량을 직접 뒷받침하는지에 대한 가중치입니다.
const TYPE_STRONG_SKILLS: Partial<Record<EvidenceRecordType, SkillCode[]>> = {
  project: [
    "web_development",
    "api_design",
    "database",
    "programming",
    "operating_system",
    "network",
    "security",
    "data_analysis",
    "ai_ml",
    "cloud",
    "system_operation",
  ],
  hackathon: ["problem_solving", "collaboration", "data_analysis", "ai_ml", "web_development"],
  award: ["problem_solving", "collaboration"],
  internship: ["system_operation", "collaboration", "communication"],
  activity: ["collaboration", "communication", "documentation"],
  study: ["documentation", "problem_solving"],
  certificate: ["security", "database", "network", "operating_system"],
};

function normalize(text: string) {
  return text.toLowerCase();
}

function toList(value?: string | string[] | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function findMatches(text: string, aliases: string[]): string[] {
  if (!text.trim()) return [];
  const normalized = normalize(text);
  return aliases.filter((alias) => normalized.includes(normalize(alias)));
}

/**
 * Evidence 원문을 규칙 기반으로 훑어 역량 후보를 추출합니다.
 * 구현 기능/역할(강한 신호) > 설명·해결한 문제·성과(중간 신호) > 사용 기술 목록만(약한 신호) 순으로
 * 가중치를 두고, 단순 키워드 1개만 발견된 경우는 항상 weak로 캡핑합니다.
 */
export function extractSkillCandidates(input: EvidenceMapperInput): EvidenceSkillCandidate[] {
  const strongZoneText = [input.implementedFeatures, input.role, input.title].filter(Boolean).join(" \n ");
  const mediumZoneText = [input.description, input.problemSolved, input.outcome].filter(Boolean).join(" \n ");
  const weakZoneText = toList(input.technologies).join(" ");
  const hasEvidence = Boolean(input.outcome?.trim() || input.evidenceUrl?.trim());
  const strongTypeSkills = TYPE_STRONG_SKILLS[input.type] ?? [];

  const candidates: EvidenceSkillCandidate[] = [];

  for (const entry of SKILL_TAXONOMY) {
    if (!entry.active || entry.aliases.length === 0) continue;

    const strongHits = findMatches(strongZoneText, entry.aliases);
    const mediumHits = findMatches(mediumZoneText, entry.aliases);
    const weakHits = findMatches(weakZoneText, entry.aliases);
    const allHits = Array.from(new Set([...strongHits, ...mediumHits, ...weakHits]));

    if (allHits.length === 0) continue;

    const foundOnlyInWeakZone = strongHits.length === 0 && mediumHits.length === 0 && weakHits.length > 0;
    const typeSupportsSkill = strongTypeSkills.includes(entry.code);

    let score = strongHits.length * 3 + mediumHits.length * 2 + weakHits.length * 1;
    if (hasEvidence) score += 1;
    if (typeSupportsSkill) score += 1;

    let contributionLevel: EvidenceSkillCandidate["contributionLevel"];
    if (foundOnlyInWeakZone) {
      contributionLevel = "weak";
    } else if (score >= 6 && strongHits.length > 0) {
      contributionLevel = "strong";
    } else if (score >= 3) {
      contributionLevel = "medium";
    } else {
      contributionLevel = "weak";
    }

    let confidence: EvidenceSkillCandidate["confidence"];
    if (!foundOnlyInWeakZone && hasEvidence && allHits.length >= 2) {
      confidence = "high";
    } else if (!foundOnlyInWeakZone || allHits.length >= 2) {
      confidence = "medium";
    } else {
      confidence = "low";
    }

    const reasonParts: string[] = [];
    if (strongHits.length) reasonParts.push(`구현 기능/역할/제목에서 '${strongHits.join(", ")}' 확인`);
    if (mediumHits.length) reasonParts.push(`설명·해결한 문제·성과에서 '${mediumHits.join(", ")}' 확인`);
    if (weakHits.length && strongHits.length === 0 && mediumHits.length === 0) {
      reasonParts.push(`사용 기술 목록에서만 '${weakHits.join(", ")}' 확인`);
    }
    if (hasEvidence) reasonParts.push("성과 또는 증빙 URL이 있어 신뢰도를 보강함");
    if (typeSupportsSkill) reasonParts.push(`${input.type} 유형이 이 역량을 직접 뒷받침함`);

    candidates.push({
      skillCode: entry.code,
      contributionLevel,
      confidence,
      matchedKeywords: allHits,
      reason: reasonParts.length
        ? `${reasonParts.join(". ")}.`
        : `${getSkillLabel(entry.code)} 관련 키워드가 발견되었습니다.`,
      source: "rule",
    });
  }

  return candidates.sort((a, b) => LEVEL_ORDER[b.contributionLevel] - LEVEL_ORDER[a.contributionLevel]);
}
