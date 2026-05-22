import type {
  CareerAnalysis,
  JobPosting,
  JobRecommendation,
  UserProfile,
} from "@/types/career";
import { parseSkills } from "@/lib/validation";

type CareerRule = {
  name: string;
  keywords: string[];
  requiredSkills: string[];
  actions: string[];
};

const CAREER_REQUIRED_SKILLS: CareerRule[] = [
  {
    name: "공기업 전산직 Gap 분석",
    keywords: ["공기업", "공공기관", "전산직", "정보시스템", "정보처리", "it"],
    requiredSkills: [
      "DB",
      "운영체제",
      "네트워크",
      "보안",
      "Linux",
      "시스템 운영",
      "문서화",
      "정보처리기사",
    ],
    actions: [
      "공기업 전산직 공고 3개를 골라 요구역량 표를 만들고 현재 Evidence와 1:1로 매핑합니다.",
      "DB, 보안, 네트워크, Linux 운영 실습을 작은 산출물과 보고서로 남깁니다.",
    ],
  },
  {
    name: "우선 보완 역량: 운영/보안",
    keywords: ["보안", "정보보안", "네트워크", "linux", "로그", "장애", "운영"],
    requiredSkills: ["보안", "네트워크", "Linux", "시스템 운영", "로그 분석"],
    actions: [
      "인증/인가, 로그, 취약점 점검을 공기업 전산 운영 관점으로 정리합니다.",
      "Linux에서 프로세스, 포트, 로그 확인 절차를 실습하고 운영 체크리스트를 작성합니다.",
    ],
  },
  {
    name: "우선 보완 역량: DB/문서화",
    keywords: ["db", "sql", "database", "문서", "보고서", "readme", "데이터"],
    requiredSkills: ["DB", "SQL", "문서화", "API", "협업"],
    actions: [
      "Pay-Mate 같은 기존 프로젝트를 DB 설계, API 흐름, 역할 단위 문서 관점으로 재정리합니다.",
      "공고 요구역량과 프로젝트 Evidence를 연결한 1페이지 지원 전략표를 작성합니다.",
    ],
  },
];

const SKILL_ALIASES: Record<string, string[]> = {
  DB: ["db", "database", "sql", "mysql", "postgres", "oracle", "데이터베이스"],
  SQL: ["sql", "query", "쿼리", "sqld"],
  운영체제: ["os", "운영체제", "프로세스", "메모리", "스레드"],
  네트워크: ["network", "네트워크", "tcp", "ip", "http", "dns", "packet", "패킷"],
  보안: ["security", "보안", "정보보안", "취약점", "인증", "인가", "owasp"],
  "시스템 운영": ["시스템 운영", "서버 운영", "인프라", "로그", "장애", "운영"],
  Linux: ["linux", "리눅스", "shell", "bash", "systemctl", "로그"],
  "로그 분석": ["로그", "log", "장애", "모니터링", "운영"],
  클라우드: ["cloud", "클라우드", "aws", "azure", "gcp", "vercel", "배포"],
  문서화: ["문서", "보고서", "readme", "기술문서", "산출물", "발표"],
  API: ["api", "rest", "http", "server", "backend"],
  Python: ["python", "pandas", "numpy"],
  Git: ["git", "github"],
  협업: ["팀", "협업", "공모전", "해커톤", "프로젝트"],
  정보처리기사: ["정보처리기사", "기사", "필기", "실기", "전공 시험"],
};

const PUBLIC_ENTERPRISE_PRIORITY = [
  "보안",
  "네트워크",
  "Linux",
  "시스템 운영",
  "DB",
  "SQL",
  "운영체제",
  "문서화",
  "정보처리기사",
  "API",
  "협업",
  "클라우드",
  "로그 분석",
];

const CERTIFICATE_BY_SKILL: Record<string, string[]> = {
  DB: ["SQLD", "정보처리기사"],
  SQL: ["SQLD", "정보처리기사"],
  보안: ["정보보안기사", "정보처리기사"],
  네트워크: ["네트워크관리사", "정보처리기사"],
  Linux: ["리눅스마스터", "정보처리기사"],
  "시스템 운영": ["리눅스마스터", "정보처리기사"],
  운영체제: ["정보처리기사"],
  문서화: ["컴퓨터활용능력", "정보처리기사"],
  정보처리기사: ["정보처리기사"],
  클라우드: ["AWS Cloud Practitioner", "정보처리기사"],
};

const LEARNING_BY_SKILL: Record<string, string> = {
  보안: "인증/인가, 암호화, 로그, 취약점 점검 기초를 공기업 전산 운영 문맥으로 정리합니다.",
  네트워크: "TCP/IP, HTTP, DNS 흐름을 정리하고 패킷 캡처 실습 기록을 남깁니다.",
  Linux: "프로세스, 포트, 권한, 로그 확인 명령을 실습하고 운영 체크리스트를 만듭니다.",
  "시스템 운영": "장애 상황을 가정해 원인 확인, 로그 확인, 조치 보고 흐름을 문서화합니다.",
  DB: "ERD, 정규화, SQL 작성 기초, 백업/복구 개념을 프로젝트 산출물로 정리합니다.",
  SQL: "공공 데이터나 프로젝트 DB를 기준으로 조회/집계/CRUD 쿼리 기록을 만듭니다.",
  운영체제: "프로세스, 메모리, 파일 시스템, 동시성 개념을 전공 면접 답변으로 정리합니다.",
  문서화: "공고 요구역량과 내 Evidence를 1:1로 연결한 지원 전략 보고서를 작성합니다.",
  정보처리기사: "정보처리기사 필기 범위를 DB, OS, 네트워크, 보안 순서로 주차별 정리합니다.",
  API: "간단한 행정 시스템 API를 설계하고 요청/응답/오류 처리 흐름을 README에 남깁니다.",
  협업: "팀 프로젝트 의사결정, 역할, 결과물을 공기업 전산직 협업 Evidence로 정리합니다.",
  클라우드: "간단한 서버 배포와 환경변수, 로그 확인 과정을 문서화합니다.",
  "로그 분석": "서버 로그 예시를 보고 오류 원인과 조치 내용을 운영 보고서 형식으로 작성합니다.",
};

const PROJECT_BY_SKILL: Record<string, string> = {
  보안: "로그인 권한 관리와 보안 점검 미니 프로젝트",
  네트워크: "HTTP 요청 흐름과 DNS/TCP 연결 과정을 캡처한 네트워크 분석 리포트",
  Linux: "Linux 서버 운영 체크리스트와 장애 대응 실습 기록",
  "시스템 운영": "서비스 장애 상황 재현 및 조치 보고서",
  DB: "공공기관 민원/예약 시스템 ERD와 SQL CRUD 미니 프로젝트",
  SQL: "공공 데이터 기반 SQL 조회/집계 쿼리 포트폴리오",
  운영체제: "프로세스와 메모리 개념을 설명하는 전공 CS 요약 노트",
  문서화: "공기업 전산직 공고 3개 요구역량 비교표",
  정보처리기사: "정보처리기사 오답노트와 전공 CS 핵심 개념표",
  API: "행정 업무 CRUD API 명세서와 테스트 결과",
  협업: "팀 프로젝트 역할/의사결정/결과 회고 문서",
  클라우드: "간단한 API 배포 URL과 배포 과정 보고서",
  "로그 분석": "로그 기반 장애 원인 분석 보고서",
};

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text: string, keywords: string[]) {
  const normalized = normalize(text);
  return keywords.some((keyword) => normalized.includes(normalize(keyword)));
}

function clampScore(score: number, maxScore = 100) {
  return Math.max(0, Math.min(Math.round(score), maxScore));
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function prioritizeSkills(skills: string[]) {
  return unique(skills).sort((a, b) => {
    const aIndex = PUBLIC_ENTERPRISE_PRIORITY.indexOf(a);
    const bIndex = PUBLIC_ENTERPRISE_PRIORITY.indexOf(b);
    const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    return safeA - safeB || a.localeCompare(b);
  });
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

function matchSkill(evidenceText: string, skill: string) {
  return includesAny(evidenceText, SKILL_ALIASES[skill] ?? [skill]);
}

function getMissingSkills(evidenceText: string, requiredSkills: string[]) {
  return prioritizeSkills(requiredSkills.filter((skill) => !matchSkill(evidenceText, skill)));
}

function getMatchedSkills(evidenceText: string, requiredSkills: string[]) {
  return prioritizeSkills(requiredSkills.filter((skill) => matchSkill(evidenceText, skill)));
}

function getTargetRule(targetCareer: string) {
  const target = normalize(targetCareer);
  return (
    CAREER_REQUIRED_SKILLS.find((rule) =>
      rule.keywords.some((keyword) => target.includes(normalize(keyword))),
    ) ?? CAREER_REQUIRED_SKILLS[0]
  );
}

function getRecommendedCertificates(
  missingSkills: string[],
  existingCertificates: string,
  postingCertificates: string[] = [],
) {
  const existing = normalize(existingCertificates);
  const mappedCertificates = missingSkills.flatMap(
    (skill) => CERTIFICATE_BY_SKILL[skill] ?? [],
  );
  return unique([...postingCertificates, ...mappedCertificates, "정보처리기사"]).filter(
    (certificate) => !existing.includes(normalize(certificate)),
  );
}

function getLearningDirections(missingSkills: string[]) {
  return missingSkills
    .map((skill) => LEARNING_BY_SKILL[skill])
    .filter(Boolean)
    .slice(0, 3);
}

function getRecommendedProjects(missingSkills: string[]) {
  return missingSkills
    .map((skill) => PROJECT_BY_SKILL[skill])
    .filter(Boolean)
    .slice(0, 3);
}

function makeTopCareers(
  targetCareer: string,
  evidenceText: string,
  totalScore: number,
): CareerAnalysis["topCareers"] {
  return CAREER_REQUIRED_SKILLS.map((rule) => {
    const matched = getMatchedSkills(evidenceText, rule.requiredSkills);
    const missing = getMissingSkills(evidenceText, rule.requiredSkills);
    const keywordHits = rule.keywords.filter((keyword) =>
      includesAny(evidenceText, [keyword]),
    ).length;
    const isTarget = targetCareer && includesAny(`${rule.name} ${rule.keywords.join(" ")}`, [targetCareer]);
    const fitScore = clampScore(
      totalScore * 0.4 + matched.length * 8 + keywordHits * 5 + (isTarget ? 10 : 0),
    );
    const priorityGaps = missing.slice(0, 3);
    const learningDirections = getLearningDirections(priorityGaps);
    const projectDirections = getRecommendedProjects(priorityGaps);

    return {
      name: rule.name,
      fitScore,
      reason: `공기업 전산직 요구역량 ${rule.requiredSkills.length}개 중 ${matched.length}개가 현재 입력 Evidence에서 확인됩니다. 이 점수는 실제 결과 예측이 아니라 역량 기반 예상 적합도입니다.`,
      missingSkills: priorityGaps,
      recommendedActions: unique([
        ...rule.actions,
        ...learningDirections,
        ...projectDirections.map((project) => `추천 프로젝트: ${project}`),
      ]).slice(0, 5),
    };
  })
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 3);
}

function makeRoadmap(missingSkills: string[]): CareerAnalysis["roadmap"] {
  const focus = missingSkills.length
    ? prioritizeSkills(missingSkills)
    : ["공고 요구역량 비교", "운영/보안 실습", "DB/시스템 산출물", "지원 전략 정리"];
  const projects = getRecommendedProjects(focus);

  return [
    {
      week: 1,
      title: "공고 요구역량 정리",
      actions: [
        "잡알리오 또는 데모 공고 3개를 골라 공기업 전산직 요구역량 표를 작성합니다.",
        `${focus[0]} 항목을 현재 Evidence와 비교해 부족 근거를 3줄로 정리합니다.`,
      ],
    },
    {
      week: 2,
      title: "운영/보안 실습",
      actions: [
        `${focus[1] ?? "보안"} 보완을 위해 로그, 권한, 네트워크 흐름 중 하나를 실습합니다.`,
        "캡처 화면, 명령어, 오류 원인, 조치 내용을 1페이지 운영 보고서로 남깁니다.",
      ],
    },
    {
      week: 3,
      title: "DB/시스템 산출물",
      actions: [
        projects[0] ?? "공공기관 업무 시나리오 기반 DB/API 미니 산출물을 작성합니다.",
        `${focus[2] ?? "문서화"} 역량을 보여줄 수 있도록 README와 결과 보고서를 정리합니다.`,
      ],
    },
    {
      week: 4,
      title: "Gap 분석 리포트 정리",
      actions: [
        "강점, 부족 역량, 보완 활동, 공고별 매칭 근거를 Markdown 리포트로 정리합니다.",
        "정보처리기사, SQLD, 정보보안기사 등 필요한 자격증을 필수/우대/보완으로 구분합니다.",
      ],
    },
  ];
}

function makeBoostRoutine(recommendation: {
  missingSkills: string[];
  recommendedCertificates: string[];
}) {
  const priorityGaps = prioritizeSkills(recommendation.missingSkills);
  const firstGap = priorityGaps[0] ?? "공고 요구역량";
  const cert = recommendation.recommendedCertificates[0] ?? "정보처리기사";
  const learning = LEARNING_BY_SKILL[firstGap] ?? "공고 요구역량과 현재 Evidence의 차이를 정리합니다.";
  const project = PROJECT_BY_SKILL[firstGap] ?? "공고 요구역량 매핑 보고서";

  return [
    `매일 40분: ${firstGap} 핵심 개념 1개를 정리하고 공기업 전산직 면접 질문 2개로 바꿉니다.`,
    `주 3회 60분: ${learning}`,
    `주 2회 30분: ${cert} 기출 또는 요약 노트를 풀고 오답 원인을 기록합니다.`,
    `주 1회: ${project} 산출물을 업데이트하고 공고 요구역량과 연결합니다.`,
  ];
}

function makeExpectedProblems(missingSkills: string[]): JobRecommendation["expectedProblems"] {
  const priorityGap = prioritizeSkills(missingSkills)[0] ?? "우선 보완 역량";

  return [
    {
      problem: "역량 기반 예상 적합도 점수를 실제 결과 예측으로 오해할 수 있음",
      impact: "서류, 필기, 면접, 경력, 채용 규모 같은 변수가 반영되지 않아 참고 지표 이상의 의미로 해석하면 안 됩니다.",
      solution: "화면과 리포트에 역량 기반 예상 적합도라고 표기하고, 실제 선발 결과 예측이 아니라는 주의 문구를 함께 표시합니다.",
    },
    {
      problem: "공고 문구가 짧거나 비정형이면 역량 매칭 누락 발생",
      impact: `${priorityGap} 같은 핵심 역량이 다른 표현으로 작성되면 점수가 낮게 계산될 수 있습니다.`,
      solution: "동의어 사전과 공고 원문 키워드 추출을 함께 사용하고, 사용자가 매칭 결과를 수정할 수 있게 합니다.",
    },
    {
      problem: "자격증 우대 여부가 기관마다 다름",
      impact: "정보처리기사, SQLD, 정보보안기사 등의 중요도가 서류, 필기, 면접 단계마다 달라질 수 있습니다.",
      solution: "공고별 우대 자격 항목을 별도로 표시하고 자격증은 필수, 우대, 보완으로 구분합니다.",
    },
  ];
}

function recommendJobs(
  profile: UserProfile,
  postings: JobPosting[],
): JobRecommendation[] {
  const skillList = parseSkills(profile.skills);
  const evidenceText = getEvidenceText(profile, skillList);
  const certText = profile.certificates;

  return postings
    .map((posting) => {
      const requiredSkills = prioritizeSkills(
        unique(
          posting.requiredSkills.length
            ? posting.requiredSkills
            : ["DB", "보안", "네트워크", "Linux", "문서화"],
        ),
      );
      const matchedSkills = getMatchedSkills(evidenceText, requiredSkills);
      const missingSkills = getMissingSkills(evidenceText, requiredSkills);
      const certMatches = posting.preferredCertificates.filter((certificate) =>
        normalize(certText).includes(normalize(certificate)),
      );
      const certGaps = posting.preferredCertificates.filter(
        (certificate) => !normalize(certText).includes(normalize(certificate)),
      );
      const skillScore = requiredSkills.length
        ? (matchedSkills.length / requiredSkills.length) * 70
        : 35;
      const certScore = posting.preferredCertificates.length
        ? (certMatches.length / posting.preferredCertificates.length) * 20
        : 8;
      const publicItSignal = includesAny(
        `${posting.title} ${posting.organization} ${posting.description}`,
        [profile.career, "공기업", "공공기관", "전산", "정보시스템", "it"],
      )
        ? 10
        : 4;
      const fitScore = clampScore(skillScore + certScore + publicItSignal);
      const recommendedCertificates = getRecommendedCertificates(
        missingSkills,
        certText,
        certGaps,
      ).slice(0, 4);

      return {
        posting,
        fitScore,
        estimatedPassRate: fitScore,
        matchedSkills,
        missingSkills,
        recommendedCertificates,
        boostRoutine: makeBoostRoutine({
          missingSkills,
          recommendedCertificates,
        }),
        expectedProblems: makeExpectedProblems(missingSkills),
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 3);
}

function makeSystemRisks(): CareerAnalysis["systemRisks"] {
  return [
    {
      risk: "외부 공고 API 실패 또는 인증 만료",
      cause: "잡알리오/OpenAPI는 인증키, 호출 제한, 응답 형식 변경의 영향을 받을 수 있습니다.",
      mitigation: "최근 성공 응답을 캐싱하고 실패 시 데모 공고 fallback 또는 사용자가 붙여넣은 공고 원문으로 분석합니다.",
    },
    {
      risk: "키워드 기반 매칭의 한계",
      cause: "같은 역량도 서버 운영, 인프라 운영, Linux 운영처럼 다르게 표현될 수 있습니다.",
      mitigation: "동의어 사전을 확장하고 향후 LLM 기반 설명문 생성은 근거 키워드 표시와 함께 fallback으로만 사용합니다.",
    },
    {
      risk: "역량 기반 예상 적합도 오해",
      cause: "현재 점수는 이력서 검증 전 역량 매칭과 입력 Evidence만 반영합니다.",
      mitigation: "점수명을 역량 기반 예상 적합도로 고정하고 서류, 필기, 면접 변수는 별도 체크리스트로 분리합니다.",
    },
  ];
}

export function analyzeCareer(
  profile: UserProfile,
  postings: JobPosting[] = [],
): CareerAnalysis {
  const skillList = parseSkills(profile.skills);
  const projectsText = profile.projects.trim();
  const certificatesText = profile.certificates.trim();
  const careerText = profile.career.trim();
  const evidenceText = getEvidenceText(profile, skillList);
  const targetRule = getTargetRule(careerText);
  const targetMissingSkills = getMissingSkills(evidenceText, targetRule.requiredSkills);
  const targetMatchedSkills = getMatchedSkills(evidenceText, targetRule.requiredSkills);

  const strengths: string[] = [];
  const gaps: string[] = [];
  const nextActions: string[] = [];
  const scoreReasons: string[] = [];

  const majorFit = includesAny(profile.major, ["컴퓨터", "소프트웨어", "정보", "전산", "it"])
    ? 20
    : 10;
  scoreReasons.push(
    majorFit === 20
      ? "전공이 공기업 전산직과 직접 연결되어 전공 적합도 근거가 높습니다."
      : "전공과 IT 직무의 연결 근거를 프로젝트, 자격증, 활동 Evidence로 보완해야 합니다.",
  );

  const techStack = clampScore(skillList.length * 5, 20);
  scoreReasons.push(`보유 기술 ${skillList.length}개를 기준으로 기술 스택 점수를 산정했습니다.`);
  if (techStack >= 15) {
    strengths.push("여러 기술 스택을 보유해 실무 학습 기반이 있습니다.");
  } else {
    gaps.push("공기업 전산직 핵심 기술 스택 확장 필요");
  }

  const projectExperience = clampScore(
    projectsText ? 12 + Math.min(projectsText.length, 80) / 10 : 0,
    20,
  );
  scoreReasons.push(
    projectsText
      ? "프로젝트 경험이 있어 공고 요구역량을 산출물 기반으로 설명할 수 있습니다."
      : "프로젝트 경험 입력이 없어 공고 요구역량을 입증할 산출물 근거가 약합니다.",
  );
  if (projectsText) {
    strengths.push("프로젝트 경험을 공기업 전산직 Evidence로 전환할 수 있습니다.");
  } else {
    gaps.push("DB/API/운영 실습 기반 프로젝트 Evidence 부족");
  }

  const contestExperience = includesAny(evidenceText, ["공모전", "해커톤", "대회", "contest"])
    ? 10
    : 0;
  scoreReasons.push(
    contestExperience
      ? "공모전 또는 대회 경험이 확인되어 문제 해결 경험 점수에 반영했습니다."
      : "공모전 또는 대회 경험 입력이 없어 해당 점수는 낮게 산정했습니다.",
  );
  if (!contestExperience) {
    gaps.push("문제 해결 또는 협업 활동 Evidence 부족");
  }

  const certificates = certificatesText ? 10 : 0;
  scoreReasons.push(
    certificatesText
      ? "자격증 또는 시험 준비 경험이 있어 기초 검증 근거가 있습니다."
      : "자격증 입력이 없어 공기업 전산직에서 자주 보는 검증 근거가 부족합니다.",
  );
  if (certificatesText) {
    strengths.push("자격증 또는 시험 준비 경험을 역량 근거로 사용할 수 있습니다.");
  } else {
    gaps.push("정보처리기사 또는 직무 관련 자격증 근거 부족");
  }

  const careerClarity = careerText.length >= 4 ? 10 : 5;
  scoreReasons.push(
    careerClarity === 10
      ? "목표 직무가 구체적이어서 공고 기반 Gap 분석 방향이 명확합니다."
      : "목표 직무가 짧거나 모호해 공고 기반 분석 범위가 넓어집니다.",
  );

  const actionabilitySignals = [
    projectsText.length > 0,
    skillList.length >= 2,
    certificatesText.length > 0,
    targetMissingSkills.length <= 3,
  ].filter(Boolean).length;
  const actionability = clampScore(2 + actionabilitySignals * 2, 10);
  scoreReasons.push(
    actionability >= 8
      ? "기술, 프로젝트, 자격 근거가 있어 바로 실행 계획으로 연결하기 좋습니다."
      : "다음 액션을 구체화하려면 기술, 프로젝트, 자격 근거를 더 채워야 합니다.",
  );
  scoreReasons.push(
    "이 점수는 실제 결과 예측이 아니라 입력 데이터와 공고 요구역량을 비교한 참고용 역량 기반 예상 적합도입니다.",
  );

  if (targetMatchedSkills.length) {
    strengths.push(`공기업 전산직 핵심 역량 중 ${targetMatchedSkills.join(", ")} 근거가 확인됩니다.`);
  }
  gaps.push(
    ...targetMissingSkills.map(
      (skill, index) => `우선순위 ${index + 1}: ${skill} 보완 필요 - ${LEARNING_BY_SKILL[skill] ?? "관련 Evidence를 추가해야 합니다."}`,
    ),
  );

  const priorityGaps = targetMissingSkills.slice(0, 3);
  const recommendedCertificates = getRecommendedCertificates(
    priorityGaps,
    certificatesText,
  ).slice(0, 3);
  const recommendedProjects = getRecommendedProjects(priorityGaps);

  nextActions.push(
    "공기업 전산직 공고 3개를 골라 요구역량, 우대 자격, 주요 업무를 표로 비교합니다.",
    ...priorityGaps.map((skill, index) => `우선순위 ${index + 1} 보완 역량(${skill})을 1주 단위 학습 루틴에 반영합니다.`),
    ...recommendedCertificates.map((certificate) => `추천 자격증/검증 항목: ${certificate}`),
    ...recommendedProjects.map((project) => `추천 프로젝트: ${project}`),
    "Markdown 리포트에는 강점, 부족 역량, 보완 루틴, 공고별 매칭 근거를 함께 정리합니다.",
  );

  const scoreItems = {
    majorFit,
    techStack,
    projectExperience,
    contestExperience,
    certificates,
    careerClarity,
    actionability,
  };
  const totalScore = Object.values(scoreItems).reduce((sum, score) => sum + score, 0);
  const topCareers = makeTopCareers(careerText, evidenceText, totalScore);
  const jobRecommendations = recommendJobs(profile, postings);

  return {
    recommendedCareer: "공기업 전산직 Gap Analysis",
    totalScore,
    scoreItems,
    topCareers,
    jobRecommendations,
    roadmap: makeRoadmap(targetMissingSkills),
    scoreReasons,
    strengths: strengths.length
      ? unique(strengths)
      : ["입력 근거가 적어 강점을 더 구체화해야 합니다."],
    gaps: gaps.length
      ? unique(gaps)
      : ["현재 입력 기준으로 큰 역량 공백은 보이지 않지만 공고 원문 기반 재확인이 필요합니다."],
    nextActions: unique(nextActions),
    systemRisks: makeSystemRisks(),
  };
}
