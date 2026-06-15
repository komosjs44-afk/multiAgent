import type { JobDescriptionRecord, JobFitResult, UserProfile } from "@/types/career";
import { parseSkills } from "@/lib/validation";

const SKILL_ALIASES: Record<string, string[]> = {
  DB: ["db", "database", "데이터베이스", "sql", "erd", "oracle", "mysql", "postgres"],
  SQL: ["sql", "query", "쿼리", "sqld"],
  운영체제: ["운영체제", "os", "프로세스", "메모리", "스레드"],
  네트워크: ["네트워크", "network", "tcp", "ip", "http", "dns", "packet", "패킷", "데이터통신"],
  보안: ["보안", "security", "정보보안", "취약점", "인증", "인가"],
  Linux: ["linux", "리눅스", "shell", "bash", "systemctl"],
  "시스템 운영": ["시스템 운영", "서버 운영", "인프라", "장애", "로그", "운영"],
  문서화: ["문서", "보고서", "readme", "기술문서", "산출물"],
  API: ["api", "rest", "http", "backend", "server"],
  NCS: ["ncs", "직업기초", "의사소통", "문제해결"],
  정보처리기사: ["정보처리기사", "정처기"],
};

const DEFAULT_REQUIRED_SKILLS = [
  "DB",
  "SQL",
  "운영체제",
  "네트워크",
  "보안",
  "Linux",
  "시스템 운영",
  "문서화",
  "정보처리기사",
  "NCS",
];

const ACTION_BY_SKILL: Record<string, string> = {
  DB: "공공기관 업무 시나리오 기반 ERD와 CRUD SQL 5개를 작성하세요.",
  SQL: "공고 요구 데이터 업무를 기준으로 조회/집계 쿼리 포트폴리오를 만드세요.",
  운영체제: "프로세스, 메모리, 파일 시스템 개념을 전공 면접 답변으로 정리하세요.",
  네트워크: "TCP/IP, DNS, HTTP 흐름을 캡처하고 장애 대응 리포트를 작성하세요.",
  보안: "권한 관리, 인증/인가, 로그 점검 항목을 보안 체크리스트로 정리하세요.",
  Linux: "프로세스, 포트, 권한, 로그 확인 명령어 실습 기록을 남기세요.",
  "시스템 운영": "서비스 장애 상황을 가정해 원인 확인과 조치 보고서를 작성하세요.",
  문서화: "공고 요구역량과 내 프로젝트 Evidence를 1:1 표로 연결하세요.",
  API: "행정 업무 CRUD API 명세서와 테스트 결과를 README에 정리하세요.",
  NCS: "목표 기관 필기 유형을 확인하고 NCS 문제해결/의사소통 루틴을 주 3회로 잡으세요.",
  정보처리기사: "정보처리기사 필기/실기 계획을 DB, OS, 네트워크, 보안 순서로 정리하세요.",
};

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function includesAny(text: string, keywords: string[]) {
  const normalized = normalize(text);
  return keywords.some((keyword) => normalized.includes(normalize(keyword)));
}

function matchesSkill(evidenceText: string, skill: string) {
  return includesAny(evidenceText, SKILL_ALIASES[skill] ?? [skill]);
}

function inferRequiredSkills(job: JobDescriptionRecord) {
  const raw = unique(job.required_skills ?? []);
  if (raw.length) return raw;

  const text = `${job.title} ${job.target_job ?? ""} ${job.description}`;
  const inferred = DEFAULT_REQUIRED_SKILLS.filter((skill) => matchesSkill(text, skill));
  return inferred.length ? inferred : DEFAULT_REQUIRED_SKILLS.slice(0, 8);
}

function inferPreferredCertificates(job: JobDescriptionRecord) {
  const raw = unique(job.preferred_certificates ?? []);
  if (raw.length) return raw;

  const text = `${job.title} ${job.description}`;
  return unique(
    ["정보처리기사", "SQLD", "정보보안기사", "네트워크관리사", "리눅스마스터"].filter((cert) =>
      includesAny(text, [cert]),
    ),
  );
}

function isTargetCompany(profile: UserProfile, job: JobDescriptionRecord) {
  const target = profile.targetCompany?.trim();
  if (!target) return false;

  return includesAny(`${job.company_name} ${job.title} ${job.description}`, [
    target,
    target.replace("국제", ""),
    target.replace("공사", ""),
  ]);
}

export function matchJobDescriptions(
  profile: UserProfile,
  jobDescriptions: JobDescriptionRecord[],
): JobFitResult[] {
  const profileSkills = parseSkills(profile.skills);
  const evidenceText = [
    profile.major,
    profile.grade,
    profile.career,
    profile.targetCompany ?? "",
    profile.targetCompanyType ?? "",
    profileSkills.join(" "),
    profile.projects,
    profile.certificates,
  ].join(" ");
  const certificateText = profile.certificates;

  return jobDescriptions
    .map((job) => {
      const requiredSkills = inferRequiredSkills(job);
      const preferredCertificates = inferPreferredCertificates(job);
      const matchedSkills = requiredSkills.filter((skill) => matchesSkill(evidenceText, skill));
      const missingSkills = requiredSkills.filter((skill) => !matchesSkill(evidenceText, skill));
      const matchedCertificates = preferredCertificates.filter((cert) =>
        includesAny(certificateText, [cert]),
      );
      const missingCertificates = preferredCertificates.filter((cert) =>
        !includesAny(certificateText, [cert]),
      );
      const skillScore = requiredSkills.length
        ? (matchedSkills.length / requiredSkills.length) * 55
        : 0;
      const certScore = preferredCertificates.length
        ? (matchedCertificates.length / preferredCertificates.length) * 15
        : 3;
      const targetBonus = isTargetCompany(profile, job) ? 15 : 0;
      const descriptionFit = includesAny(`${job.title} ${job.target_job ?? ""} ${job.description}`, [
        profile.career,
        "전산",
        "정보시스템",
        "정보통신",
        "IT",
      ])
        ? 10
        : 0;
      const penalty = Math.min(missingSkills.length * 3 + missingCertificates.length * 2, 20);
      const fitScore = Math.max(0, Math.min(100, Math.round(skillScore + certScore + targetBonus + descriptionFit - penalty)));
      const reasons = [
        `요구역량 ${requiredSkills.length}개 중 ${matchedSkills.length}개가 사용자 프로필에서 확인되었습니다.`,
        preferredCertificates.length
          ? `우대/필수 자격 ${preferredCertificates.length}개 중 ${matchedCertificates.length}개가 확인되었습니다.`
          : "직무 설명에 명시된 자격증 정보가 없어 자격증 점수는 낮게 반영했습니다.",
        isTargetCompany(profile, job)
          ? "사용자가 입력한 목표 기업과 일치해 목표 기업 우선 보너스를 반영했습니다."
          : "목표 기업과 직접 일치하지 않아 기업 보너스는 반영하지 않았습니다.",
        "이 점수는 합격률이 아니라 직무 설명 대비 역량 기반 예상 적합도입니다.",
      ];
      const preparationActions = unique([
        ...missingSkills.slice(0, 5).map((skill) => ACTION_BY_SKILL[skill] ?? `${skill} 근거를 프로젝트나 학습 기록으로 추가하세요.`),
        ...missingCertificates.slice(0, 3).map((cert) => `${cert} 취득 또는 학습 계획을 준비 우선순위에 넣으세요.`),
      ]);

      return {
        jobDescription: job,
        fitScore,
        matchedSkills,
        missingSkills,
        matchedCertificates,
        missingCertificates,
        reasons,
        preparationActions,
      };
    })
    .sort((a, b) => {
      const aTarget = isTargetCompany(profile, a.jobDescription) ? 1 : 0;
      const bTarget = isTargetCompany(profile, b.jobDescription) ? 1 : 0;
      return bTarget - aTarget || b.fitScore - a.fitScore;
    });
}
