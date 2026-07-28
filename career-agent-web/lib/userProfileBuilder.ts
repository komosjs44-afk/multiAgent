import { SKILL_CODE_TO_LEGACY_KEYWORDS } from "@/lib/skillTaxonomy";
import type {
  AcademicRecord,
  CareerProfileRecord,
  EvidenceRecord,
  EvidenceSkillRow,
  UserProfile,
} from "@/types/career";

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

/**
 * 사용자가 확인한(is_confirmed) evidence_skills를 기존 careerAgent.ts의 SKILL_ALIASES
 * 어휘로 변환합니다. careerAgent.ts 자체는 건드리지 않고, 매칭 대상 텍스트를 보강하는
 * 방식이라 기존 점수 체계와 호환됩니다. 대응하는 legacy 키워드가 없는 taxonomy 코드는
 * 기여분이 없습니다(4대 지표 개편 시 정리 예정).
 */
function confirmedSkillsToLegacyKeywords(confirmedSkillRows: EvidenceSkillRow[]): string[] {
  return unique(
    confirmedSkillRows
      .filter((row) => row.is_confirmed)
      .flatMap((row) => SKILL_CODE_TO_LEGACY_KEYWORDS[row.skill_code] ?? []),
  );
}

export function buildUserProfile({
  profile,
  academic,
  evidence,
  confirmedSkillRows = [],
}: {
  profile: CareerProfileRecord;
  academic: AcademicRecord[];
  evidence: EvidenceRecord[];
  /** 우선순위 1: 사용자가 확인한 evidence_skills. 없으면 기존 텍스트 기반 매칭만 사용합니다(호환 유지). */
  confirmedSkillRows?: EvidenceSkillRow[];
}): UserProfile {
  const academicSkills = academic.flatMap((item) => item.skill_mapping);
  const evidenceSkills = evidence.flatMap((item) => item.skills);
  const confirmedLegacyKeywords = confirmedSkillsToLegacyKeywords(confirmedSkillRows);
  const courses = academic.map((item) =>
    [
      item.course_name,
      item.grade ? `성적 ${item.grade}` : "",
      item.semester,
      item.skill_mapping.join(", "),
    ]
      .filter(Boolean)
      .join(" / "),
  );
  const projectEvidence = evidence
    .filter((item) =>
      ["project", "hackathon", "award", "internship", "activity", "study"].includes(
        item.type,
      ),
    )
    .map((item) =>
      [
        `[${item.type}] ${item.title}`,
        item.organization,
        item.role,
        item.result,
        item.description,
        item.evidence_text,
      ]
        .filter(Boolean)
        .join(" / "),
    );
  const certificates = evidence
    .filter((item) => item.type === "certificate")
    .map((item) => item.title);
  const gpaText = profile.gpa != null ? `GPA ${profile.gpa}` : "";
  const targetJob = profile.target_job || profile.target_career || "공기업 전산직";

  return {
    major: profile.major,
    grade: profile.grade,
    career: [profile.target_company, targetJob].filter(Boolean).join(" "),
    targetCompany: profile.target_company || undefined,
    targetCompanyType: profile.target_company_type || undefined,
    skills: unique([...confirmedLegacyKeywords, ...academicSkills, ...evidenceSkills]).join(", "),
    projects: [...courses, ...projectEvidence, gpaText].filter(Boolean).join("\n"),
    certificates: certificates.join(", "),
  };
}
