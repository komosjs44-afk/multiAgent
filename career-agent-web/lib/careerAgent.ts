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

const COMPANY_PREP_PROFILES: Array<{
  aliases: string[];
  label: string;
  requiredSkills: string[];
  actions: string[];
}> = [
  {
    aliases: ["인천국제공항공사", "인국공", "인천공항"],
    label: "인천국제공항공사 전산직",
    requiredSkills: ["시스템 운영", "네트워크", "보안", "DB", "Linux", "문서화", "정보처리기사", "NCS"],
    actions: [
      "공항 운영 시스템, 여객/수하물/시설 IT 업무를 가정해 장애 대응 시나리오 1개를 작성합니다.",
      "네트워크 장애, 접근권한, 로그 확인 절차를 운영 보고서 형식으로 정리합니다.",
      "인천국제공항공사 최근 공고의 NCS 직무기술서에서 전산/정보통신 요구역량을 따로 표로 뽑습니다.",
    ],
  },
  {
    aliases: ["한국전력공사", "한전"],
    label: "한국전력공사 전산직",
    requiredSkills: ["DB", "시스템 운영", "보안", "네트워크", "Linux", "문서화", "정보처리기사", "NCS"],
    actions: [
      "전력/민원/요금 업무 시스템을 가정한 DB/API 미니 프로젝트를 정리합니다.",
      "공공기관 개인정보/보안 점검 체크리스트를 프로젝트 산출물에 추가합니다.",
    ],
  },
  {
    aliases: ["한국철도공사", "코레일"],
    label: "한국철도공사 전산직",
    requiredSkills: ["시스템 운영", "네트워크", "DB", "보안", "Linux", "문서화", "정보처리기사", "NCS"],
    actions: [
      "교통 운영 시스템 장애 대응과 로그 분석 시나리오를 정리합니다.",
      "예약/운행 데이터 기반 SQL 조회 프로젝트를 보완합니다.",
    ],
  },
];

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

function getTargetCompanyProfile(profile: UserProfile) {
  const target = normalize(`${profile.targetCompany ?? ""} ${profile.career}`);
  return COMPANY_PREP_PROFILES.find((company) =>
    company.aliases.some((alias) => target.includes(normalize(alias))),
  );
}

function getTargetCompanyName(profile: UserProfile) {
  return profile.targetCompany?.trim() || getTargetCompanyProfile(profile)?.label || "";
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
    .slice(0, 30);
}

function getRecommendedProjects(missingSkills: string[]) {
  return missingSkills
    .map((skill) => PROJECT_BY_SKILL[skill])
    .filter(Boolean)
    .slice(0, 3);
}

function scoreByKeywords(text: string, rules: Array<{ points: number; keywords: string[] }>) {
  return rules.reduce(
    (sum, rule) => sum + (includesAny(text, rule.keywords) ? rule.points : 0),
    0,
  );
}

function makeJobScoreBreakdown({
  evidenceText,
  certificatesText,
  projectsText,
  requiredSkills,
  matchedSkills,
  missingSkills,
  hasPublicItSignal,
  isTargetCompanyPosting,
}: {
  evidenceText: string;
  certificatesText: string;
  projectsText: string;
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  hasPublicItSignal: boolean;
  isTargetCompanyPosting: boolean;
}): JobRecommendation["scoreBreakdown"] {
  const academic = clampScore(
    scoreByKeywords(evidenceText, [
      { points: 4, keywords: ["자료구조", "data structure"] },
      { points: 4, keywords: ["운영체제", "os"] },
      { points: 5, keywords: ["데이터베이스", "database", "db", "sql"] },
      { points: 4, keywords: ["네트워크", "데이터통신", "network"] },
      { points: 3, keywords: ["알고리즘", "algorithm"] },
    ]),
    20,
  );
  const certificate = clampScore(
    scoreByKeywords(certificatesText, [
      { points: 15, keywords: ["정보처리기사"] },
      { points: 10, keywords: ["sqld"] },
      { points: 5, keywords: ["컴활", "컴퓨터활용능력"] },
      { points: 8, keywords: ["정보보안기사"] },
      { points: 6, keywords: ["네트워크관리사", "리눅스마스터"] },
    ]),
    20,
  );
  const project = clampScore(
    scoreByKeywords(projectsText, [
      { points: 8, keywords: ["db", "database", "sql", "erd", "데이터베이스"] },
      { points: 5, keywords: ["api", "rest", "backend", "server"] },
      { points: 4, keywords: ["github", "git", "배포", "deploy", "vercel"] },
      { points: 4, keywords: ["프로젝트", "서비스", "개발"] },
    ]),
    20,
  );
  const skills = clampScore(
    requiredSkills.length ? (matchedSkills.length / requiredSkills.length) * 30 : 0,
    30,
  );
  const preference = clampScore(
    (hasPublicItSignal ? 5 : 0) + (isTargetCompanyPosting ? 10 : 0),
    15,
  );
  const penalty = Math.min(missingSkills.length * 3, 15);
  const total = clampScore(academic + certificate + project + skills + preference - penalty);

  return {
    academic,
    certificate,
    project,
    skills,
    preference,
    penalty,
    total,
  };
}

type ProjectEvidenceProfile = {
  level: "none" | "idea" | "practice" | "deliverable" | "portfolio";
  signals: string[];
  matchedSkills: string[];
  missingSignals: string[];
  suggestedNext: string[];
};

const PROJECT_SIGNAL_RULES = [
  {
    signal: "구현 경험",
    keywords: ["개발", "구현", "만들", "제작", "프로젝트", "서비스", "시스템", "api", "crud"],
    skills: ["API", "DB"],
    next: "기능 목록과 API 요청/응답 예시를 README에 정리합니다.",
  },
  {
    signal: "DB/SQL 산출물",
    keywords: ["db", "database", "sql", "erd", "테이블", "쿼리", "mysql", "postgres"],
    skills: ["DB", "SQL"],
    next: "ERD, 테이블 정의서, 핵심 조회/집계 SQL 5개를 산출물로 남깁니다.",
  },
  {
    signal: "운영/Linux 산출물",
    keywords: ["linux", "리눅스", "서버", "로그", "장애", "운영", "systemctl", "journalctl", "배포"],
    skills: ["Linux", "시스템 운영", "로그 분석"],
    next: "장애 상황 1개를 가정하고 원인 확인 명령어와 조치 보고서를 작성합니다.",
  },
  {
    signal: "보안 산출물",
    keywords: ["보안", "인증", "인가", "권한", "암호", "취약점", "jwt", "세션", "security"],
    skills: ["보안"],
    next: "인증/인가 흐름도와 권한별 접근 제어 테스트 결과를 정리합니다.",
  },
  {
    signal: "네트워크 산출물",
    keywords: ["네트워크", "tcp", "dns", "http", "패킷", "wireshark", "라우팅"],
    skills: ["네트워크"],
    next: "HTTP 요청 흐름과 DNS/TCP 연결 과정을 캡처해 1페이지 리포트로 만듭니다.",
  },
  {
    signal: "문서화 산출물",
    keywords: ["readme", "문서", "보고서", "발표", "명세", "회고", "포트폴리오"],
    skills: ["문서화"],
    next: "문제 상황, 역할, 사용 기술, 결과, 공고 요구역량 매핑을 한 페이지로 정리합니다.",
  },
];

function analyzeProjectEvidence(projectsText: string): ProjectEvidenceProfile {
  if (!projectsText.trim()) {
    return {
      level: "none",
      signals: [],
      matchedSkills: [],
      missingSignals: PROJECT_SIGNAL_RULES.map((rule) => rule.signal),
      suggestedNext: [
        "공공기관 업무 시나리오를 정하고 DB/API 미니 프로젝트 주제를 하나 선택합니다.",
      ],
    };
  }

  const matchedRules = PROJECT_SIGNAL_RULES.filter((rule) =>
    includesAny(projectsText, rule.keywords),
  );
  const signals = matchedRules.map((rule) => rule.signal);
  const matchedSkills = prioritizeSkills(matchedRules.flatMap((rule) => rule.skills));
  const missingRules = PROJECT_SIGNAL_RULES.filter((rule) => !signals.includes(rule.signal));
  const suggestedNext = missingRules.slice(0, 3).map((rule) => rule.next);
  const hasImplementation = signals.includes("구현 경험");
  const hasDocument = signals.includes("문서화 산출물");
  const hasTwoTechnicalSignals = signals.filter((signal) => signal !== "문서화 산출물").length >= 2;
  const level: ProjectEvidenceProfile["level"] =
    hasImplementation && hasDocument && hasTwoTechnicalSignals
      ? "portfolio"
      : hasImplementation && hasTwoTechnicalSignals
        ? "deliverable"
        : signals.length >= 2
          ? "practice"
          : "idea";

  return {
    level,
    signals,
    matchedSkills,
    missingSignals: missingRules.map((rule) => rule.signal),
    suggestedNext: suggestedNext.length ? suggestedNext : ["현재 산출물을 공고 요구역량과 1:1로 매핑해 지원 전략표로 정리합니다."],
  };
}

function getProjectLevelLabel(level: ProjectEvidenceProfile["level"]) {
  const labels = {
    none: "프로젝트 미입력",
    idea: "아이디어/발표 단계",
    practice: "실습 근거 단계",
    deliverable: "구현 산출물 단계",
    portfolio: "포트폴리오 정리 단계",
  };
  return labels[level];
}

function makeTopCareers(
  profile: UserProfile,
  evidenceText: string,
  totalScore: number,
): CareerAnalysis["topCareers"] {
  const targetCompany = getTargetCompanyProfile(profile);
  const companyCareer = targetCompany
    ? {
        name: `${targetCompany.label} 목표 Gap 분석`,
        keywords: targetCompany.aliases,
        requiredSkills: targetCompany.requiredSkills,
        actions: targetCompany.actions,
      }
    : null;
  const rules = companyCareer ? [companyCareer, ...CAREER_REQUIRED_SKILLS] : CAREER_REQUIRED_SKILLS;

  return rules.map((rule) => {
    const matched = getMatchedSkills(evidenceText, rule.requiredSkills);
    const missing = getMissingSkills(evidenceText, rule.requiredSkills);
    const keywordHits = rule.keywords.filter((keyword) =>
      includesAny(evidenceText, [keyword]),
    ).length;
    const isTargetCompany = Boolean(companyCareer && rule.name === companyCareer.name);
    const fitScore = clampScore(
      totalScore * 0.25 + matched.length * 6 + keywordHits * 3 + (isTargetCompany ? 8 : 0),
    );
    const priorityGaps = missing.slice(0, 3);
    const learningDirections = getLearningDirections(priorityGaps);
    const projectDirections = getRecommendedProjects(priorityGaps);

    return {
      name: rule.name,
      fitScore,
      reason: `${rule.name} 요구역량 ${rule.requiredSkills.length}개 중 ${matched.length}개가 현재 입력 Evidence에서 확인됩니다. 점수는 실제 결과 예측이 아니라 보수적인 역량 기반 예상 적합도입니다.`,
      missingSkills: priorityGaps,
      recommendedActions: unique([
        ...rule.actions,
        ...learningDirections,
        ...projectDirections.map((project) => `추천 프로젝트: ${project}`),
      ]).slice(0, 5),
    };
  })
    .sort((a, b) => {
      const aTarget = companyCareer && a.name === companyCareer.name ? 1 : 0;
      const bTarget = companyCareer && b.name === companyCareer.name ? 1 : 0;
      return bTarget - aTarget || b.fitScore - a.fitScore;
    });
}

function makeRoadmap(
  missingSkills: string[],
  projectEvidence: ProjectEvidenceProfile,
): CareerAnalysis["roadmap"] {
  const focus = missingSkills.length
    ? prioritizeSkills(missingSkills)
    : ["공고 요구역량 비교", "운영/보안 실습", "DB/시스템 산출물", "지원 전략 정리"];
  const projects = getRecommendedProjects(focus);
  const projectLevel = getProjectLevelLabel(projectEvidence.level);
  const projectNext = projectEvidence.suggestedNext;
  const projectSignals = projectEvidence.signals.length
    ? projectEvidence.signals.join(", ")
    : "아직 명확한 프로젝트 산출물 없음";

  return [
    {
      week: 1,
      title: "공고 요구역량 정리",
      actions: [
        "알리오 OpenAPI 공고 3개를 골라 공기업 전산직 요구역량 표를 작성합니다.",
        `${focus[0]} 항목을 현재 Evidence와 비교해 부족 근거를 3줄로 정리합니다.`,
      ],
    },
    {
      week: 2,
      title: projectEvidence.level === "none" || projectEvidence.level === "idea"
        ? "프로젝트 산출물 시작"
        : "운영/보안 실습 보강",
      actions: [
        projectNext[0] ?? `${focus[1] ?? "보안"} 보완을 위해 로그, 권한, 네트워크 흐름 중 하나를 실습합니다.`,
        `현재 프로젝트 단계(${projectLevel})에서 확인된 근거(${projectSignals})를 README 초안에 반영합니다.`,
      ],
    },
    {
      week: 3,
      title: projectEvidence.level === "portfolio"
        ? "공고별 포트폴리오 매핑"
        : "DB/시스템 산출물",
      actions: [
        projectNext[1] ?? projects[0] ?? "공공기관 업무 시나리오 기반 DB/API 미니 산출물을 작성합니다.",
        projectEvidence.level === "portfolio"
          ? "완성된 산출물을 알리오 공고 요구역량, 우대조건, NCS 항목과 1:1로 연결합니다."
          : `${focus[2] ?? "문서화"} 역량을 보여줄 수 있도록 README와 결과 보고서를 정리합니다.`,
      ],
    },
    {
      week: 4,
      title: "Gap 분석 리포트 정리",
      actions: [
        projectNext[2] ?? "강점, 부족 역량, 보완 활동, 공고별 매칭 근거를 Markdown 리포트로 정리합니다.",
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

export function recommendJobs(
  profile: UserProfile,
  postings: JobPosting[],
  limit = 3,
): JobRecommendation[] {
  const skillList = parseSkills(profile.skills);
  const evidenceText = getEvidenceText(profile, skillList);
  const certText = profile.certificates;
  const targetCompany = getTargetCompanyName(profile);
  const targetAliases = getTargetCompanyProfile(profile)?.aliases ?? (targetCompany ? [targetCompany] : []);

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
      const certGaps = posting.preferredCertificates.filter(
        (certificate) => !normalize(certText).includes(normalize(certificate)),
      );
      const postingText = `${posting.title} ${posting.organization} ${posting.description}`;
      const isTargetCompanyPosting =
        targetAliases.length > 0 && includesAny(postingText, targetAliases);
      const publicItSignal = includesAny(
        postingText,
        [profile.career, "공기업", "공공기관", "전산", "정보시스템", "it"],
      )
        ? 8
        : 0;
      const scoreBreakdown = makeJobScoreBreakdown({
        evidenceText,
        certificatesText: certText,
        projectsText: profile.projects,
        requiredSkills,
        matchedSkills,
        missingSkills,
        hasPublicItSignal: publicItSignal > 0,
        isTargetCompanyPosting,
      });
      const finalFitScore = scoreBreakdown.total;
      const recommendedCertificates = getRecommendedCertificates(
        missingSkills,
        certText,
        certGaps,
      ).slice(0, 4);

      return {
        posting,
        fitScore: finalFitScore,
        estimatedPassRate: finalFitScore,
        scoreBreakdown,
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
    .sort((a, b) => {
      const aTarget = targetAliases.length && includesAny(
        `${a.posting.title} ${a.posting.organization} ${a.posting.description}`,
        targetAliases,
      )
        ? 1
        : 0;
      const bTarget = targetAliases.length && includesAny(
        `${b.posting.title} ${b.posting.organization} ${b.posting.description}`,
        targetAliases,
      )
        ? 1
        : 0;
      return bTarget - aTarget || b.fitScore - a.fitScore;
    })
    .slice(0, Math.max(1, limit));
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

function getScoreStatus(score: number, maxScore: number): CareerAnalysis["scoreDetails"][number]["status"] {
  const ratio = maxScore ? score / maxScore : 0;
  if (ratio >= 0.75) {
    return "good";
  }
  if (ratio >= 0.45) {
    return "watch";
  }
  return "needsWork";
}

function formatEvidenceList(items: string[]) {
  return items.length ? items.join(", ") : "없음";
}

function getTechStackNextStep(score: number, missingSkills: string[]) {
  if (score >= 20) {
    return "현재 기술 스택을 공고별 주요 업무, 우대조건, 프로젝트 산출물과 1:1로 연결해 지원 근거표를 만드세요.";
  }

  if (missingSkills.length > 0) {
    return `${missingSkills.slice(0, 2).join(", ")} 기술을 실습 기록으로 추가하면 기술 스택 점수가 올라갑니다.`;
  }

  return "보유 기술을 단순 키워드가 아니라 사용 맥락, 산출물, 결과와 함께 적어주세요.";
}

function getProjectScoreReason(projectEvidence: ProjectEvidenceProfile, score: number) {
  const signals = formatEvidenceList(projectEvidence.signals);
  const missing = formatEvidenceList(projectEvidence.missingSignals.slice(0, 3));
  return `프로젝트 입력은 ${getProjectLevelLabel(projectEvidence.level)}로 판정되어 ${score}점을 반영했습니다. 확인된 산출물 신호: ${signals}. 다음 상승 조건: ${missing}.`;
}

function getProjectNextStep(projectEvidence: ProjectEvidenceProfile) {
  if (projectEvidence.level === "portfolio") {
    return "이미 포트폴리오 단계라서 공고별 요구역량, 우대 자격, 주요 업무와 프로젝트 근거를 1:1로 매핑하세요.";
  }

  return projectEvidence.suggestedNext[0] ?? "프로젝트 산출물을 README와 결과 보고서로 정리하세요.";
}

function makeScoreDetails({
  scoreItems,
  projectEvidence,
  targetMatchedSkills,
  targetMissingSkills,
  certificatesText,
  careerText,
  majorFit,
  activityKeywords,
}: {
  scoreItems: CareerAnalysis["scoreItems"];
  projectEvidence: ProjectEvidenceProfile;
  targetMatchedSkills: string[];
  targetMissingSkills: string[];
  certificatesText: string;
  careerText: string;
  majorFit: number;
  activityKeywords: string[];
}): CareerAnalysis["scoreDetails"] {
  const items: Array<{
    key: keyof CareerAnalysis["scoreItems"];
    label: string;
    maxScore: number;
    reason: string;
    nextStep: string;
  }> = [
    {
      key: "majorFit",
      label: "전공 적합도",
      maxScore: 20,
      reason:
        majorFit >= 16
          ? "학과명이 IT/전산 계열과 직접 연결되지만, 목표 기업 적합도는 과목/프로젝트/자격증 근거가 함께 있어야 하므로 16점까지만 반영했습니다."
          : "전공명만으로는 전산직 연결성이 약해 6점을 반영했습니다.",
      nextStep:
        majorFit >= 16
          ? "전공 과목 중 DB, 운영체제, 네트워크, 보안 과목 성적이나 과제 산출물을 추가하면 근거가 더 단단해집니다."
          : "전공 외 IT 과목, 부트캠프, 프로젝트, 자격증 근거를 추가해 전산직 연결성을 보완하세요.",
    },
    {
      key: "techStack",
      label: "기술 스택",
      maxScore: 20,
      reason: `단순 기술 개수가 아니라 목표 기업/직무 요구역량 매칭(${formatEvidenceList(targetMatchedSkills)})을 중심으로 보수적으로 계산했습니다.`,
      nextStep: getTechStackNextStep(scoreItems.techStack, targetMissingSkills),
    },
    {
      key: "projectExperience",
      label: "프로젝트 경험",
      maxScore: 20,
      reason: getProjectScoreReason(projectEvidence, scoreItems.projectExperience),
      nextStep: getProjectNextStep(projectEvidence),
    },
    {
      key: "contestExperience",
      label: "공모전/대외활동",
      maxScore: 10,
      reason:
        scoreItems.contestExperience > 0
          ? `입력 내용에서 ${activityKeywords.join(", ")} 키워드가 확인되어 10점을 반영했습니다.`
          : "공모전/해커톤/대회 키워드가 확인되지 않아 0점입니다.",
      nextStep:
        scoreItems.contestExperience > 0
          ? "수상 여부보다 문제 정의, 맡은 역할, 해결 과정, 결과 지표를 4줄로 정리해 Evidence 품질을 높이세요."
          : "팀 프로젝트 회고, 발표자료, 문제 해결 과정도 대외활동 대체 Evidence로 정리할 수 있습니다.",
    },
    {
      key: "certificates",
      label: "자격증",
      maxScore: 10,
      reason: certificatesText
        ? `정보처리기사 보유 여부를 가장 크게 보고, SQLD/보안/네트워크/Linux 계열 자격증은 부분 점수로 반영했습니다. 입력 내용: ${certificatesText}`
        : "자격증 또는 시험 준비 입력이 없어 0점입니다.",
      nextStep:
        scoreItems.certificates >= 10
          ? "이미 자격증 근거가 있으니 각 자격증을 DB, 운영체제, NCS, 사무역량 중 어떤 요구조건과 연결할지 정리하세요."
          : "정보처리기사, SQLD, 네트워크관리사, 리눅스마스터 중 현재 부족 역량과 연결되는 항목을 우선 정리하세요.",
    },
    {
      key: "careerClarity",
      label: "진로 명확도",
      maxScore: 10,
      reason: careerText
        ? `목표 진로가 '${careerText}'로 입력되어 알리오 공고 검색과 Gap 분석 기준으로 사용됐습니다.`
        : "목표 진로가 비어 있으면 공고 기반 분석 기준이 흐려집니다.",
      nextStep:
        careerText
          ? "목표 직무 안에서 시스템 운영, 정보보안, DB/데이터, 행정시스템 개발 중 1순위를 정하면 추천 공고와 로드맵이 더 좁혀집니다."
          : "목표를 '공기업 전산직', '정보보안 담당', '시스템 운영'처럼 직무 단위로 적어주세요.",
    },
    {
      key: "actionability",
      label: "실행 가능성",
      maxScore: 10,
      reason: `기술 입력, 프로젝트 산출물 단계(${getProjectLevelLabel(projectEvidence.level)}), 자격증 입력, 남은 부족 역량 ${targetMissingSkills.length}개를 기준으로 ${scoreItems.actionability}점을 반영했습니다.`,
      nextStep:
        projectEvidence.level === "portfolio"
          ? "이미 정리된 산출물을 알리오 공고별 요구역량과 1:1로 매핑하세요."
          : "이번 주에 만들 산출물 1개를 정하고 캡처, 명령어, 결과 문서까지 남기세요.",
    },
  ];

  return items.map((item) => {
    const score = scoreItems[item.key];
    return {
      ...item,
      score,
      status: getScoreStatus(score, item.maxScore),
    };
  });
}

export function analyzeCareer(
  profile: UserProfile,
  postings: JobPosting[] = [],
): CareerAnalysis {
  const skillList = parseSkills(profile.skills);
  const projectsText = profile.projects.trim();
  const projectEvidence = analyzeProjectEvidence(projectsText);
  const certificatesText = profile.certificates.trim();
  const careerText = profile.career.trim();
  const evidenceText = getEvidenceText(profile, skillList);
  const targetRule = getTargetRule(careerText);
  const companyProfile = getTargetCompanyProfile(profile);
  const targetRequiredSkills = companyProfile?.requiredSkills ?? targetRule.requiredSkills;
  const targetMissingSkills = getMissingSkills(evidenceText, targetRequiredSkills);
  const targetMatchedSkills = getMatchedSkills(evidenceText, targetRequiredSkills);

  const strengths: string[] = [];
  const gaps: string[] = [];
  const nextActions: string[] = [];
  const scoreReasons: string[] = [];

  const majorFit = includesAny(profile.major, ["컴퓨터", "소프트웨어", "정보", "전산", "it"])
    ? 16
    : 6;
  scoreReasons.push(
    majorFit >= 16
      ? "전공이 공기업 전산직과 직접 연결되어 전공 적합도 근거가 높습니다."
      : "전공과 IT 직무의 연결 근거를 프로젝트, 자격증, 활동 Evidence로 보완해야 합니다.",
  );

  const techStack = clampScore(
    targetRequiredSkills.length
      ? (targetMatchedSkills.length / targetRequiredSkills.length) * 18
      : skillList.length * 3,
    20,
  );
  scoreReasons.push(
    `보유 기술 개수보다 목표 기업/직무 요구역량 ${targetRequiredSkills.length}개 중 ${targetMatchedSkills.length}개가 확인되는지를 우선 반영했습니다.`,
  );
  if (techStack >= 15) {
    strengths.push("여러 기술 스택을 보유해 실무 학습 기반이 있습니다.");
  } else {
    gaps.push("공기업 전산직 핵심 기술 스택 확장 필요");
  }

  const projectExperienceBase = {
    none: 0,
    idea: 4,
    practice: 8,
    deliverable: 14,
    portfolio: 20,
  }[projectEvidence.level];
  const projectExperience = clampScore(projectExperienceBase, 20);
  scoreReasons.push(
    projectsText
      ? `프로젝트 Evidence가 ${getProjectLevelLabel(projectEvidence.level)}로 확인되어 산출물 완성도 기준으로 점수를 산정했습니다.`
      : "프로젝트 경험 입력이 없어 공고 요구역량을 입증할 산출물 근거가 약합니다.",
  );
  if (projectsText) {
    strengths.push(`프로젝트 경험이 ${getProjectLevelLabel(projectEvidence.level)}까지 정리되어 있습니다.`);
    if (projectEvidence.signals.length) {
      strengths.push(`프로젝트 근거에서 ${projectEvidence.signals.join(", ")} 신호가 확인됩니다.`);
    }
    if (projectEvidence.matchedSkills.length) {
      strengths.push(`프로젝트가 ${projectEvidence.matchedSkills.join(", ")} 역량 근거로 연결됩니다.`);
    }
  } else {
    gaps.push("DB/API/운영 실습 기반 프로젝트 Evidence 부족");
  }

  const activityKeywords = ["공모전", "해커톤", "대회", "contest"].filter((keyword) =>
    includesAny(evidenceText, [keyword]),
  );
  const contestExperience = activityKeywords.length ? 10 : 0;
  scoreReasons.push(
    contestExperience
      ? "공모전 또는 대회 경험이 확인되어 문제 해결 경험 점수에 반영했습니다."
      : "공모전 또는 대회 경험 입력이 없어 해당 점수는 낮게 산정했습니다.",
  );
  if (!contestExperience && projectEvidence.level !== "deliverable" && projectEvidence.level !== "portfolio") {
    gaps.push("문제 해결 또는 협업 활동 Evidence 부족");
  }

  const certificates = includesAny(certificatesText, ["정보처리기사"])
    ? 10
    : includesAny(certificatesText, ["SQLD", "정보보안기사", "네트워크관리사", "리눅스마스터"])
      ? 5
      : 0;
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

  const careerClarity = profile.targetCompany && careerText.length >= 4 ? 10 : careerText.length >= 4 ? 7 : 4;
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
    projectEvidence.level === "deliverable" || projectEvidence.level === "portfolio",
  ].filter(Boolean).length;
  const actionability = clampScore(actionabilitySignals * 1.5, 10);
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
  if (companyProfile) {
    gaps.push(
      `${companyProfile.label} 적합도를 올리려면 ${targetMissingSkills.slice(0, 4).join(", ") || "공고별 세부 요구역량"} 근거를 더 명확히 만들어야 합니다.`,
    );
    nextActions.push(...companyProfile.actions.map((action) => `${companyProfile.label} 준비: ${action}`));
  }
  gaps.push(
    ...targetMissingSkills.map(
      (skill, index) => `우선순위 ${index + 1}: ${skill} 보완 필요 - ${LEARNING_BY_SKILL[skill] ?? "관련 Evidence를 추가해야 합니다."}`,
    ),
  );
  if (projectEvidence.level !== "portfolio" && projectEvidence.missingSignals.length) {
    gaps.push(
      `프로젝트 산출물 보완 필요: ${projectEvidence.missingSignals.slice(0, 3).join(", ")} 근거를 추가하면 강점과 로드맵이 갱신됩니다.`,
    );
  }

  const priorityGaps = targetMissingSkills.slice(0, 3);
  const recommendedCertificates = getRecommendedCertificates(
    priorityGaps,
    certificatesText,
  ).slice(0, 3);
  const recommendedProjects = getRecommendedProjects(priorityGaps);

  nextActions.push(
    "공기업 전산직 공고 3개를 골라 요구역량, 우대 자격, 주요 업무를 표로 비교합니다.",
    ...priorityGaps.map((skill, index) => `우선순위 ${index + 1} 보완 역량(${skill})을 1주 단위 학습 루틴에 반영합니다.`),
    ...projectEvidence.suggestedNext.map((action) => `프로젝트 성장 액션: ${action}`),
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
  const scoreDetails = makeScoreDetails({
    scoreItems,
    projectEvidence,
    targetMatchedSkills,
    targetMissingSkills,
    certificatesText,
    careerText,
    majorFit,
    activityKeywords,
  });
  const topCareers = makeTopCareers(profile, evidenceText, totalScore);
  const jobRecommendations = recommendJobs(profile, postings);

  return {
    recommendedCareer: "공기업 전산직 Gap Analysis",
    totalScore,
    scoreItems,
    scoreDetails,
    topCareers,
    jobRecommendations,
    roadmap: makeRoadmap(targetMissingSkills, projectEvidence),
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
