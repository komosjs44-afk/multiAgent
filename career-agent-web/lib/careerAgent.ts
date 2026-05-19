import type { CareerAnalysis, UserProfile } from "@/types/career";
import { parseSkills } from "@/lib/validation";

type CareerRule = {
  name: string;
  keywords: string[];
  requiredSkills: string[];
  actions: string[];
};

const careerRules: CareerRule[] = [
  {
    name: "백엔드 개발자",
    keywords: ["백엔드", "backend", "server", "api", "spring", "node"],
    requiredSkills: ["API 경험", "DB 경험", "GitHub 기록", "배포 경험"],
    actions: [
      "REST API가 포함된 작은 서비스를 구현합니다.",
      "DB 설계와 API 명세를 README에 정리합니다.",
    ],
  },
  {
    name: "데이터 분석가",
    keywords: ["데이터", "data", "sql", "python", "분석"],
    requiredSkills: ["SQL 활용", "Python 분석", "시각화 경험", "결과 보고서"],
    actions: [
      "공개 데이터를 SQL과 Python으로 분석합니다.",
      "분석 과정과 결론을 1페이지 보고서로 정리합니다.",
    ],
  },
  {
    name: "공기업 전산직",
    keywords: ["공기업", "전산직", "정보처리기사", "cs", "보안"],
    requiredSkills: ["DB 경험", "네트워크/보안 기초", "전공 시험 대비", "문서화 경험"],
    actions: [
      "정보처리기사와 전공 CS 개념을 주차별로 정리합니다.",
      "DB, 네트워크, 보안 기초를 작은 실습으로 연결합니다.",
    ],
  },
  {
    name: "프론트엔드 개발자",
    keywords: ["프론트", "frontend", "react", "next", "ui"],
    requiredSkills: ["React 경험", "UI 구현", "GitHub 기록", "배포 경험"],
    actions: [
      "React 기반 입력 폼과 결과 화면을 구현합니다.",
      "모바일 반응형과 배포 URL을 포트폴리오에 추가합니다.",
    ],
  },
  {
    name: "IT 서비스 기획자",
    keywords: ["기획", "pm", "서비스", "문서", "ux"],
    requiredSkills: ["문제 정의", "사용자 시나리오", "협업 경험", "결과 보고서"],
    actions: [
      "사용자 문제와 기능 요구사항을 문서로 정리합니다.",
      "개발자와 협업 가능한 수준의 화면 흐름을 작성합니다.",
    ],
  },
];

function includesAny(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function clampScore(score: number, maxScore: number) {
  return Math.max(0, Math.min(score, maxScore));
}

function unique(items: string[]) {
  return Array.from(new Set(items));
}

function getEvidenceText(profile: UserProfile, skillList: string[]) {
  return [
    profile.major,
    profile.career,
    skillList.join(" "),
    profile.projects,
    profile.certificates,
  ].join(" ");
}

function getMissingSkills(evidenceText: string, skillsText: string) {
  const missingSkills: string[] = [];

  if (!includesAny(evidenceText, ["api", "rest", "server", "backend", "백엔드"])) {
    missingSkills.push("API 경험 부족");
  }
  if (!includesAny(skillsText, ["sql", "db", "database", "postgres", "mysql", "데이터베이스"])) {
    missingSkills.push("DB 경험 부족");
  }
  if (!includesAny(evidenceText, ["github", "git"])) {
    missingSkills.push("GitHub 기록 부족");
  }
  if (!includesAny(evidenceText, ["배포", "deploy", "vercel", "aws", "cloud", "클라우드"])) {
    missingSkills.push("배포 경험 부족");
  }

  return missingSkills;
}

function getCareerRuleScore(rule: CareerRule, evidenceText: string, missingSkills: string[]) {
  const keywordScore = rule.keywords.filter((keyword) =>
    evidenceText.toLowerCase().includes(keyword.toLowerCase()),
  ).length;
  const coveredRequirementScore = rule.requiredSkills.filter(
    (skill) => !missingSkills.some((missing) => missing.includes(skill.split(" ")[0])),
  ).length;

  return keywordScore * 12 + coveredRequirementScore * 8;
}

function makeTopCareers(
  targetCareer: string,
  evidenceText: string,
  totalScore: number,
  missingSkills: string[],
): CareerAnalysis["topCareers"] {
  const ranked = careerRules
    .map((rule) => {
      const isTarget = targetCareer && rule.name.includes(targetCareer);
      const rawScore =
        getCareerRuleScore(rule, evidenceText, missingSkills) + (isTarget ? 20 : 0);
      const fitScore = clampScore(Math.round(totalScore * 0.5 + rawScore), 100);

      return {
        name: rule.name,
        fitScore,
        reason: `${rule.name}에 필요한 역량과 입력된 기술, 프로젝트 근거를 비교해 산정했습니다.`,
        missingSkills: rule.requiredSkills.filter((skill) =>
          missingSkills.some((missing) => missing.includes(skill.split(" ")[0])),
        ),
        recommendedActions: rule.actions,
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 3);

  if (
    targetCareer &&
    !ranked.some((career) => career.name.includes(targetCareer))
  ) {
    ranked[0] = {
      name: targetCareer,
      fitScore: totalScore,
      reason: "사용자가 직접 입력한 관심 진로를 우선 기준으로 분석했습니다.",
      missingSkills: missingSkills.slice(0, 3),
      recommendedActions: [
        "관심 진로 채용 공고 3개를 비교해 공통 요구 역량을 정리합니다.",
        "부족 역량 중 하나를 작은 프로젝트 결과물로 보완합니다.",
      ],
    };
  }

  return ranked;
}

function makeRoadmap(missingSkills: string[]): CareerAnalysis["roadmap"] {
  const focus = missingSkills.length
    ? missingSkills
    : ["포트폴리오 정리", "프로젝트 고도화"];

  return [
    {
      week: 1,
      title: "개념 학습",
      actions: [
        `${focus[0]}와 관련된 핵심 개념을 정리합니다.`,
        "목표 진로 공고 3개에서 공통 요구 역량을 뽑습니다.",
      ],
    },
    {
      week: 2,
      title: "실습 진행",
      actions: [
        `${focus[1] ?? focus[0]}를 보완할 수 있는 작은 실습을 진행합니다.`,
        "실습 과정과 오류 해결 내용을 GitHub 또는 문서에 기록합니다.",
      ],
    },
    {
      week: 3,
      title: "작은 결과물 제작",
      actions: [
        "분석 결과를 바탕으로 미니 프로젝트 또는 기능 개선 결과물을 만듭니다.",
        "입력, 처리, 출력 흐름이 보이도록 README를 작성합니다.",
      ],
    },
    {
      week: 4,
      title: "포트폴리오 정리",
      actions: [
        "강점과 보완 과정을 포트폴리오 문장으로 정리합니다.",
        "다음 지원 또는 학습 목표를 1개로 좁혀 실행 계획을 세웁니다.",
      ],
    },
  ];
}

export function analyzeCareer(profile: UserProfile): CareerAnalysis {
  const skillList = parseSkills(profile.skills);
  const skillsText = skillList.join(" ");
  const projectsText = profile.projects.trim();
  const certificatesText = profile.certificates.trim();
  const careerText = profile.career.trim();
  const evidenceText = getEvidenceText(profile, skillList);

  const strengths: string[] = [];
  const gaps: string[] = [];
  const nextActions: string[] = [];
  const scoreReasons: string[] = [];
  const missingSkills = getMissingSkills(evidenceText, skillsText);

  const majorFit = clampScore(
    includesAny(profile.major, ["컴퓨터", "소프트웨어", "ai", "인공지능", "정보", "전산"])
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
    gaps.push("기술스택 확장 필요");
  }
  scoreReasons.push(`보유 기술 ${skillList.length}개를 기준으로 기술스택 점수를 산정했습니다.`);

  const projectExperience = clampScore(
    projectsText ? 12 + Math.min(projectsText.length, 80) / 10 : 0,
    20,
  );
  if (projectsText) {
    strengths.push("프로젝트 경험을 포트폴리오 근거로 사용할 수 있습니다.");
  } else {
    gaps.push("프로젝트 경험 부족");
  }
  scoreReasons.push(
    projectsText
      ? "프로젝트 경험이 있어 결과물 기반 설명이 가능합니다."
      : "프로젝트 경험 입력이 없어 프로젝트 항목 점수가 낮습니다.",
  );

  const contestExperience = clampScore(
    includesAny(evidenceText, ["공모전", "해커톤", "대회", "contest"]) ? 10 : 0,
    10,
  );
  if (contestExperience > 0) {
    strengths.push("공모전 또는 대회 경험을 차별화 근거로 사용할 수 있습니다.");
  } else {
    gaps.push("공모전 또는 대회 활동 경험 부족");
  }
  scoreReasons.push(
    contestExperience > 0
      ? "공모전/대회 관련 경험이 확인되어 해당 항목 점수를 반영했습니다."
      : "공모전/대회 경험 입력이 없어 해당 항목 점수가 낮습니다.",
  );

  const certificates = clampScore(certificatesText ? 10 : 0, 10);
  if (certificatesText) {
    strengths.push("자격증 또는 시험 준비 경험을 역량 근거로 사용할 수 있습니다.");
  } else {
    gaps.push("자격증 또는 전공 시험 대비 근거 부족");
  }
  scoreReasons.push(
    certificatesText
      ? "자격증 입력이 있어 기초 검증 근거가 있습니다."
      : "자격증 입력이 없어 자격증 항목 점수가 낮습니다.",
  );

  const careerClarity = clampScore(careerText.length >= 4 ? 10 : 5, 10);
  scoreReasons.push(
    careerClarity === 10
      ? "관심 진로가 구체적으로 입력되어 분석 방향이 명확합니다."
      : "관심 진로가 짧거나 모호해 분석 방향이 제한됩니다.",
  );

  const actionabilitySignals = [
    projectsText.length > 0,
    skillList.length >= 2,
    certificatesText.length > 0,
    missingSkills.length <= 2,
  ].filter(Boolean).length;
  const actionability = clampScore(2 + actionabilitySignals * 2, 10);
  scoreReasons.push(
    actionability >= 8
      ? "기술, 프로젝트, 자격 근거가 있어 실행 계획으로 연결하기 좋습니다."
      : "다음 액션을 더 구체화하려면 기술, 프로젝트, 자격 근거를 보완해야 합니다.",
  );

  if (includesAny(skillsText, ["sql", "db", "database", "postgres", "mysql", "데이터베이스"])) {
    strengths.push("데이터베이스와 데이터 처리 역량을 보여줄 수 있습니다.");
  } else {
    gaps.push("DB 경험 부족");
  }

  if (includesAny(skillsText, ["python", "java", "javascript", "typescript", "react", "next"])) {
    strengths.push("프로그래밍 또는 웹 개발 기초 역량이 있습니다.");
  } else {
    gaps.push("프로그래밍 실습 경험 부족");
  }

  missingSkills.forEach((skill) => gaps.push(skill));

  if (gaps.includes("API 경험 부족")) {
    nextActions.push("REST API가 있는 미니 프로젝트를 만들어 요청과 응답 흐름을 기록합니다.");
  }
  if (gaps.includes("DB 경험 부족")) {
    nextActions.push("SQL 테이블 설계와 CRUD 실습 결과를 README에 정리합니다.");
  }
  if (gaps.includes("GitHub 기록 부족")) {
    nextActions.push("프로젝트 진행 과정을 GitHub 커밋과 README로 남깁니다.");
  }
  if (gaps.includes("배포 경험 부족")) {
    nextActions.push("Vercel 같은 배포 환경에 결과물을 올리고 배포 URL을 기록합니다.");
  }
  if (!nextActions.length) {
    nextActions.push("관심 진로에 맞는 작은 프로젝트 주제를 하나 정해 완성합니다.");
  }

  const scoreItems = {
    majorFit,
    techStack,
    projectExperience: Math.round(projectExperience),
    contestExperience,
    certificates,
    careerClarity,
    actionability,
  };
  const totalScore = Object.values(scoreItems).reduce((sum, score) => sum + score, 0);
  const roadmap = makeRoadmap(missingSkills);
  const topCareers = makeTopCareers(careerText, evidenceText, totalScore, missingSkills);

  return {
    recommendedCareer: topCareers[0]?.name ?? careerText ?? "개발 직무",
    totalScore,
    scoreItems,
    topCareers,
    roadmap,
    scoreReasons,
    strengths: strengths.length
      ? unique(strengths)
      : ["아직 입력 근거가 적어 강점을 더 구체화해야 합니다."],
    gaps: gaps.length ? unique(gaps) : ["현재 입력 기준으로 큰 공백은 보이지 않습니다."],
    nextActions: unique([...nextActions, ...roadmap[0].actions]),
  };
}
