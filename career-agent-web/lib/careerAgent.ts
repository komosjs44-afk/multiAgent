import type { CareerAnalysis, UserProfile } from "@/types/career";
import { parseSkills } from "@/lib/validation";

function includesAny(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function clampScore(score: number, maxScore: number) {
  return Math.max(0, Math.min(score, maxScore));
}

export function analyzeCareer(profile: UserProfile): CareerAnalysis {
  const skillList = parseSkills(profile.skills);
  const skillsText = skillList.join(" ");
  const projectsText = profile.projects.trim();
  const certificatesText = profile.certificates.trim();
  const careerText = profile.career.trim();
  const combinedText = [
    profile.major,
    careerText,
    skillsText,
    projectsText,
    certificatesText,
  ].join(" ");

  const strengths: string[] = [];
  const gaps: string[] = [];
  const nextActions: string[] = [];
  const scoreReasons: string[] = [];

  const majorFit = clampScore(
    includesAny(profile.major, ["컴퓨터", "소프트웨어", "ai", "인공지능", "정보"])
      ? 20
      : 10,
    20,
  );
  scoreReasons.push(
    majorFit === 20
      ? "전공이 개발 또는 IT 직무와 직접적으로 연결됩니다."
      : "전공과 개발 직무의 연결 근거가 더 필요합니다.",
  );

  const techStack = clampScore(skillList.length * 5, 20);
  if (techStack >= 15) {
    strengths.push("여러 기술스택을 보유해 실무 학습 기반이 있습니다.");
  } else {
    gaps.push("기술스택 확장");
  }
  scoreReasons.push(`보유 기술 ${skillList.length}개를 기준으로 기술스택 점수를 산정했습니다.`);

  const projectExperience = clampScore(projectsText ? 20 : 0, 20);
  if (projectsText) {
    strengths.push("프로젝트 경험을 포트폴리오 근거로 활용할 수 있습니다.");
  } else {
    gaps.push("프로젝트 경험 부족");
  }
  scoreReasons.push(
    projectsText
      ? "프로젝트 경험이 있어 결과물 기반 설명이 가능합니다."
      : "프로젝트 경험 입력이 없어 프로젝트 항목 점수가 낮습니다.",
  );

  const certificates = clampScore(certificatesText ? 10 : 0, 10);
  if (certificatesText) {
    strengths.push("자격증 또는 시험 준비 경험을 역량 근거로 활용할 수 있습니다.");
  } else {
    gaps.push("자격증 또는 전공 시험 대비 근거");
  }
  scoreReasons.push(
    certificatesText
      ? "자격증 입력이 있어 기초 검증 근거가 있습니다."
      : "자격증 입력이 없어 자격증 항목 점수가 낮습니다.",
  );

  const careerClarity = clampScore(careerText.length >= 4 ? 15 : 8, 15);
  scoreReasons.push(
    careerClarity === 15
      ? "관심 진로가 구체적으로 입력되어 분석 방향이 명확합니다."
      : "관심 진로가 짧거나 모호해 분석 방향이 제한됩니다.",
  );

  const actionabilitySignals = [
    includesAny(combinedText, ["프로젝트", "개발", "서비스"]),
    includesAny(combinedText, ["보안", "클라우드", "sql", "python", "react"]),
    includesAny(combinedText, ["공기업", "전산직", "백엔드", "프론트엔드", "데이터"]),
  ].filter(Boolean).length;
  const actionability = clampScore(6 + actionabilitySignals * 3, 15);
  scoreReasons.push(
    actionability >= 12
      ? "실행 계획으로 연결할 수 있는 구체적 단서가 충분합니다."
      : "다음 액션을 정하려면 기술, 프로젝트, 진로 정보를 더 구체화해야 합니다.",
  );

  if (includesAny(skillsText, ["sql", "db", "데이터베이스"])) {
    strengths.push("데이터베이스와 데이터 처리 역량을 보여줄 수 있습니다.");
  } else {
    gaps.push("DB/SQL 경험");
  }

  if (includesAny(skillsText, ["python", "java", "javascript", "react"])) {
    strengths.push("프로그래밍 또는 웹 개발 기초 역량이 있습니다.");
  } else {
    gaps.push("프로그래밍 실습 경험");
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

  const scoreItems = {
    majorFit,
    techStack,
    projectExperience,
    certificates,
    careerClarity,
    actionability,
  };
  const totalScore = Object.values(scoreItems).reduce((sum, score) => sum + score, 0);

  return {
    recommendedCareer: careerText || "개발 직무",
    totalScore,
    scoreItems,
    scoreReasons,
    strengths: strengths.length
      ? Array.from(new Set(strengths))
      : ["아직 입력된 근거가 적어 강점을 더 구체화해야 합니다."],
    gaps: gaps.length
      ? Array.from(new Set(gaps))
      : ["현재 입력 기준으로 큰 공백은 보이지 않습니다."],
    nextActions,
  };
}
