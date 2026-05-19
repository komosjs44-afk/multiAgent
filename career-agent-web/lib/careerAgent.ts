import type { CareerAnalysis, UserProfile } from "@/types/career";

function includesAny(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

export function analyzeCareer(profile: UserProfile): CareerAnalysis {
  const combinedText = [
    profile.major,
    profile.career,
    profile.skills,
    profile.projects,
    profile.certificates,
  ].join(" ");

  const targetCareer = profile.career.trim() || "개발 직무";
  const strengths: string[] = [];
  const gaps: string[] = [];
  const nextActions: string[] = [];

  if (includesAny(profile.skills, ["sql", "db", "데이터베이스"])) {
    strengths.push("데이터베이스와 데이터 처리 역량을 보여줄 수 있습니다.");
  } else {
    gaps.push("DB/SQL 경험");
  }

  if (includesAny(profile.skills, ["python", "java", "javascript", "react"])) {
    strengths.push("프로그래밍 또는 웹 개발 기초 역량이 있습니다.");
  } else {
    gaps.push("프로그래밍 실습 경험");
  }

  if (profile.projects.trim()) {
    strengths.push("프로젝트 경험을 포트폴리오 근거로 활용할 수 있습니다.");
  } else {
    gaps.push("프로젝트 결과물");
  }

  if (includesAny(combinedText, ["보안", "security"])) {
    nextActions.push("보안 개념을 정리하고 로그인 기능 점검 미니 프로젝트를 만듭니다.");
  }

  if (includesAny(combinedText, ["클라우드", "aws", "azure", "gcp"])) {
    nextActions.push("간단한 배포 실습을 진행하고 배포 과정을 문서화합니다.");
  }

  if (includesAny(combinedText, ["공기업", "전산직", "정보처리기사"])) {
    nextActions.push("정보처리기사와 전공 CS 핵심 개념을 주차별로 정리합니다.");
  }

  if (!nextActions.length) {
    nextActions.push("관심 진로에 맞는 작은 프로젝트 주제를 하나 정해 완성합니다.");
  }

  const positiveSignals = strengths.length + nextActions.length;
  const fitScore = Math.min(95, 52 + positiveSignals * 8 - gaps.length * 3);

  return {
    recommendedCareer: targetCareer,
    fitScore,
    strengths: strengths.length
      ? strengths
      : ["아직 입력된 근거가 적어 강점을 더 구체화해야 합니다."],
    gaps: gaps.length ? gaps : ["현재 입력 기준으로 큰 공백은 보이지 않습니다."],
    nextActions,
  };
}
