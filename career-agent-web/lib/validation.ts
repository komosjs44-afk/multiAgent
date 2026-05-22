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
    errors.major = "학과를 입력해 주세요.";
  }

  if (!Number.isInteger(gradeNumber) || gradeNumber < 1 || gradeNumber > 4) {
    errors.grade = "학년은 1~4 사이 숫자로 입력해 주세요.";
  }

  if (!profile.career.trim()) {
    errors.career = "목표 진로를 입력해 주세요.";
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isScoreItems(value: unknown): value is CareerAnalysis["scoreItems"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const scoreItems = value as Record<string, unknown>;
  return (
    isFiniteNumber(scoreItems.majorFit) &&
    isFiniteNumber(scoreItems.techStack) &&
    isFiniteNumber(scoreItems.projectExperience) &&
    isFiniteNumber(scoreItems.contestExperience) &&
    isFiniteNumber(scoreItems.certificates) &&
    isFiniteNumber(scoreItems.careerClarity) &&
    isFiniteNumber(scoreItems.actionability)
  );
}

function isTopCareer(value: unknown): value is CareerAnalysis["topCareers"][number] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const career = value as Record<string, unknown>;
  return (
    typeof career.name === "string" &&
    isFiniteNumber(career.fitScore) &&
    typeof career.reason === "string" &&
    isStringArray(career.missingSkills) &&
    isStringArray(career.recommendedActions)
  );
}

function isRoadmapWeek(value: unknown): value is CareerAnalysis["roadmap"][number] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const week = value as Record<string, unknown>;
  return (
    isFiniteNumber(week.week) &&
    typeof week.title === "string" &&
    isStringArray(week.actions)
  );
}

function isJobPosting(
  value: unknown,
): value is CareerAnalysis["jobRecommendations"][number]["posting"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const posting = value as Record<string, unknown>;
  return (
    typeof posting.id === "string" &&
    typeof posting.title === "string" &&
    typeof posting.organization === "string" &&
    typeof posting.source === "string" &&
    (posting.sourceStatus === "DEMO" || posting.sourceStatus === "LIVE") &&
    typeof posting.description === "string" &&
    typeof posting.rawText === "string" &&
    isStringArray(posting.requiredSkills) &&
    isStringArray(posting.preferredCertificates)
  );
}

function isExpectedProblem(
  value: unknown,
): value is CareerAnalysis["jobRecommendations"][number]["expectedProblems"][number] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const problem = value as Record<string, unknown>;
  return (
    typeof problem.problem === "string" &&
    typeof problem.impact === "string" &&
    typeof problem.solution === "string"
  );
}

function isJobRecommendation(
  value: unknown,
): value is CareerAnalysis["jobRecommendations"][number] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const recommendation = value as Record<string, unknown>;
  return (
    isJobPosting(recommendation.posting) &&
    isFiniteNumber(recommendation.fitScore) &&
    isFiniteNumber(recommendation.estimatedPassRate) &&
    isStringArray(recommendation.matchedSkills) &&
    isStringArray(recommendation.missingSkills) &&
    isStringArray(recommendation.recommendedCertificates) &&
    isStringArray(recommendation.boostRoutine) &&
    Array.isArray(recommendation.expectedProblems) &&
    recommendation.expectedProblems.every(isExpectedProblem)
  );
}

function isSystemRisk(value: unknown): value is CareerAnalysis["systemRisks"][number] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const risk = value as Record<string, unknown>;
  return (
    typeof risk.risk === "string" &&
    typeof risk.cause === "string" &&
    typeof risk.mitigation === "string"
  );
}

export function isCareerAnalysis(value: unknown): value is CareerAnalysis {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const analysis = value as Record<string, unknown>;
  return (
    typeof analysis.recommendedCareer === "string" &&
    isFiniteNumber(analysis.totalScore) &&
    isScoreItems(analysis.scoreItems) &&
    Array.isArray(analysis.topCareers) &&
    analysis.topCareers.every(isTopCareer) &&
    Array.isArray(analysis.jobRecommendations) &&
    analysis.jobRecommendations.every(isJobRecommendation) &&
    Array.isArray(analysis.roadmap) &&
    analysis.roadmap.every(isRoadmapWeek) &&
    isStringArray(analysis.scoreReasons) &&
    isStringArray(analysis.strengths) &&
    isStringArray(analysis.gaps) &&
    isStringArray(analysis.nextActions) &&
    Array.isArray(analysis.systemRisks) &&
    analysis.systemRisks.every(isSystemRisk)
  );
}
