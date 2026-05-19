import type { CareerAnalysis, UserProfile, ValidationResult } from "@/types/career";

const profileKeys: Array<keyof UserProfile> = [
  "major",
  "grade",
  "career",
  "skills",
  "projects",
  "certificates",
];

export function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Record<string, unknown>;
  return profileKeys.every((key) => typeof profile[key] === "string");
}

export function validateProfile(profile: UserProfile): ValidationResult {
  const errors: ValidationResult["errors"] = {};
  const gradeNumber = Number(profile.grade.trim());

  if (!profile.major.trim()) {
    errors.major = "학과를 입력해주세요.";
  }

  if (!Number.isInteger(gradeNumber) || gradeNumber < 1 || gradeNumber > 4) {
    errors.grade = "학년은 1~4 사이 숫자로 입력해주세요.";
  }

  if (!profile.career.trim()) {
    errors.career = "관심 진로를 입력해주세요.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function parseSkills(skills: string) {
  return skills
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isCareerAnalysis(value: unknown): value is CareerAnalysis {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const s = v.scoreItems;
  if (!s || typeof s !== "object" || Array.isArray(s)) return false;
  const si = s as Record<string, unknown>;
  return (
    typeof v.recommendedCareer === "string" &&
    typeof v.totalScore === "number" &&
    typeof si.majorFit === "number" &&
    typeof si.techStack === "number" &&
    typeof si.projectExperience === "number" &&
    typeof si.certificates === "number" &&
    typeof si.careerClarity === "number" &&
    typeof si.actionability === "number" &&
    isStringArray(v.scoreReasons) &&
    isStringArray(v.strengths) &&
    isStringArray(v.gaps) &&
    isStringArray(v.nextActions)
  );
}
