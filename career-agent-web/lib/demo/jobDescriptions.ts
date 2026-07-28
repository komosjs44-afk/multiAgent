// jobRecommendationService.ts / app/api/admin/job-descriptions 라우트가 기대하는
// Supabase job_descriptions 원본 행(raw row) 형태를 그대로 따릅니다.
export const demoJobDescriptions = [
  {
    id: "00000000-0000-4000-8000-000000000401",
    company_name: "한국전력공사",
    recruit_title: "2026년 하반기 신입사원 채용(ICT)",
    title: "전산",
    job_field: "ICT/전산",
    target_job: "전산",
    description:
      "전력 정보시스템 운영, 사내 업무 시스템 개발 및 유지보수, 데이터베이스 관리, 정보보안 점검 업무를 수행합니다.",
    required_knowledge: ["데이터베이스", "운영체제", "네트워크"],
    required_skills: ["DB", "SQL", "네트워크", "Linux", "시스템 운영"],
    required_attitude: ["문서화", "협업"],
    qualifications: ["전산 관련 전공 또는 동등 경력", "정보처리기사 우대"],
    preferred_certificates: ["정보처리기사", "SQLD", "정보보안기사"],
    source: "데모 데이터",
    source_url: "https://alio.go.kr",
    recruit_url: "https://alio.go.kr",
    active: true,
  },
];
