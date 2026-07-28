import type { SkillCode } from "@/types/career";

export type SkillTaxonomyEntry = {
  id: string;
  code: SkillCode;
  name_ko: string;
  description: string;
  aliases: string[];
  active: boolean;
};

// 15개 고정 taxonomy. 관리 빈도가 낮아 이번 단계에서는 코드 기준으로 관리하고,
// evidence_skills.skill_code에는 이 목록과 동일한 값만 허용하는 DB check 제약을 병행합니다.
// 동의어 편집이 필요해지면 skill_taxonomy 테이블로 전환을 검토합니다.
export const SKILL_TAXONOMY: SkillTaxonomyEntry[] = [
  {
    id: "skill-programming",
    code: "programming",
    name_ko: "프로그래밍",
    description: "특정 언어/자료구조/알고리즘을 활용한 구현 능력",
    aliases: ["python", "java", "javascript", "typescript", "c++", "프로그래밍", "알고리즘", "자료구조"],
    active: true,
  },
  {
    id: "skill-web_development",
    code: "web_development",
    name_ko: "웹 애플리케이션 개발",
    description: "웹 프론트엔드/백엔드 프레임워크를 활용한 서비스 개발",
    aliases: ["next.js", "nextjs", "react", "vue", "spring", "django", "express", "node", "node.js", "html", "css", "tailwind", "웹 개발", "웹앱"],
    active: true,
  },
  {
    id: "skill-api_design",
    code: "api_design",
    name_ko: "API 설계",
    description: "REST/GraphQL 등 서비스 간 인터페이스 설계 및 구현",
    aliases: ["rest", "restful", "api", "endpoint", "swagger", "openapi", "graphql", "api route", "api 설계"],
    active: true,
  },
  {
    id: "skill-database",
    code: "database",
    name_ko: "데이터베이스 설계 및 운영",
    description: "관계형/비관계형 데이터베이스 설계, 쿼리, 운영",
    aliases: ["supabase", "postgresql", "postgres", "mysql", "mariadb", "sqlite", "mongodb", "sql", "erd", "데이터베이스", "oracle", "db"],
    active: true,
  },
  {
    id: "skill-operating_system",
    code: "operating_system",
    name_ko: "운영체제",
    description: "프로세스, 메모리, 스레드 등 운영체제 기초 이해",
    aliases: ["linux", "리눅스", "unix", "프로세스", "메모리", "스레드", "운영체제", "커널", "shell", "쉘"],
    active: true,
  },
  {
    id: "skill-network",
    code: "network",
    name_ko: "네트워크",
    description: "TCP/IP, 라우팅, 패킷 등 네트워크 통신 이해",
    aliases: ["tcp/ip", "tcp", "ip", "라우팅", "패킷", "네트워크", "dns", "http", "네트워크 통신"],
    active: true,
  },
  {
    id: "skill-security",
    code: "security",
    name_ko: "정보보안",
    description: "인증, 권한 관리, 접근제어 등 보안 설계 및 대응",
    aliases: ["rls", "jwt", "oauth", "접근제어", "인증", "권한", "security", "정보보안", "owasp", "암호화", "취약점"],
    active: true,
  },
  {
    id: "skill-data_analysis",
    code: "data_analysis",
    name_ko: "데이터 분석 및 시각화",
    description: "데이터 처리, 통계 분석, 시각화",
    aliases: ["pandas", "numpy", "streamlit", "시각화", "matplotlib", "데이터 분석", "tableau"],
    active: true,
  },
  {
    id: "skill-ai_ml",
    code: "ai_ml",
    name_ko: "AI/머신러닝",
    description: "머신러닝/딥러닝 모델 활용 및 LLM 연동",
    aliases: ["tensorflow", "pytorch", "머신러닝", "딥러닝", "llm", "gpt", "langchain", "sklearn", "scikit-learn"],
    active: true,
  },
  {
    id: "skill-cloud",
    code: "cloud",
    name_ko: "클라우드",
    description: "클라우드 인프라 및 배포 자동화",
    aliases: ["docker", "aws", "azure", "gcp", "vercel", "ci/cd", "kubernetes", "k8s", "클라우드"],
    active: true,
  },
  {
    id: "skill-system_operation",
    code: "system_operation",
    name_ko: "시스템 운영",
    description: "장애 대응, 로그 분석, 모니터링, 서비스 운영",
    aliases: ["장애 대응", "로그", "모니터링", "배포 운영", "서버 운영", "인프라", "시스템 운영"],
    active: true,
  },
  {
    id: "skill-problem_solving",
    code: "problem_solving",
    name_ko: "문제 해결",
    description: "이슈 진단, 디버깅, 개선/최적화 경험",
    aliases: ["문제 해결", "디버깅", "최적화", "트러블슈팅", "이슈 해결"],
    active: true,
  },
  {
    id: "skill-collaboration",
    code: "collaboration",
    name_ko: "협업",
    description: "팀 프로젝트, 코드 리뷰, 협업 도구 활용",
    aliases: ["협업", "팀", "코드리뷰", "code review", "git", "github", "팀 프로젝트"],
    active: true,
  },
  {
    id: "skill-documentation",
    code: "documentation",
    name_ko: "문서화",
    description: "기술 문서, 보고서, 산출물 정리",
    aliases: ["문서화", "readme", "기술문서", "매뉴얼", "보고서"],
    active: true,
  },
  {
    id: "skill-communication",
    code: "communication",
    name_ko: "발표 및 커뮤니케이션",
    description: "발표, 세미나, 이해관계자와의 커뮤니케이션",
    aliases: ["발표", "pt", "커뮤니케이션", "세미나", "보고"],
    active: true,
  },
];

export const SKILL_TAXONOMY_BY_CODE: Record<SkillCode, SkillTaxonomyEntry> = Object.fromEntries(
  SKILL_TAXONOMY.map((entry) => [entry.code, entry]),
) as Record<SkillCode, SkillTaxonomyEntry>;

export function getSkillLabel(code: SkillCode): string {
  return SKILL_TAXONOMY_BY_CODE[code]?.name_ko ?? code;
}

// careerAgent.ts의 기존 SKILL_ALIASES 어휘로 변환하기 위한 최소 매핑입니다.
// 대응되는 legacy 키워드가 없는 코드는 빈 배열이며, 이번 단계에서는 점수에 반영되지 않습니다.
export const SKILL_CODE_TO_LEGACY_KEYWORDS: Record<SkillCode, string[]> = {
  programming: ["Python", "Git"],
  web_development: [],
  api_design: ["API"],
  database: ["DB", "SQL"],
  operating_system: ["운영체제"],
  network: ["네트워크"],
  security: ["보안"],
  data_analysis: [],
  ai_ml: [],
  cloud: ["클라우드"],
  system_operation: ["시스템 운영", "로그 분석", "Linux"],
  problem_solving: [],
  collaboration: ["협업"],
  documentation: ["문서화"],
  communication: [],
};
