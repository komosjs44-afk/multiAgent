import type { JobPosting } from "@/types/career";

// 실 채용공고 API(ALIO JSON, 설정된 API, 잡알리오 HTML)가 모두 실패했을 때의
// 최종 fallback 데이터이자, 데모 모드에서 보여줄 공고 데이터입니다.
// lib/jobPostings.ts의 fetchJobPostings()가 이 배열을 최종 tier로 사용합니다.
export const demoJobPostings: JobPosting[] = [
  {
    id: "demo-public-it-001",
    title: "공공기관 전산직 신입",
    organization: "데모 공고 · 실 API 미연결",
    source: "데모 데이터",
    sourceStatus: "DEMO",
    url: "https://job.alio.go.kr/recruit.do",
    deadline: "상시 확인 필요",
    location: "전국/본사",
    employmentType: "정규직",
    description:
      "정보시스템 운영, DB 관리, 보안 점검, 네트워크 장애 대응, 전산 행정 문서 작성 역량을 요구하는 전산직 공고 예시입니다.",
    rawText:
      "데모 공고입니다. 실제 API 데이터가 아니며, 정보시스템 운영, DB 관리, 보안 점검, 네트워크 장애 대응, 전산 행정 문서 작성 역량을 요구하는 전산직 공고 예시입니다.",
    requiredSkills: ["DB", "운영체제", "네트워크", "보안", "Linux", "문서화"],
    preferredCertificates: ["정보처리기사", "SQLD", "컴퓨터활용능력"],
    requiredExperience: "신입 또는 관련 프로젝트 경험",
  },
  {
    id: "demo-public-it-002",
    title: "공공 IT 시스템 운영 및 정보보안 담당",
    organization: "데모 공고 · 실 API 미연결",
    source: "데모 데이터",
    sourceStatus: "DEMO",
    url: "https://job.alio.go.kr/recruit.do",
    deadline: "상시 확인 필요",
    location: "수도권",
    employmentType: "계약직/정규직 전환 가능",
    description:
      "서버 운영, 로그 분석, 취약점 점검, 클라우드 기초, 장애 보고서 작성 능력을 요구하는 공고 예시입니다.",
    rawText:
      "데모 공고입니다. 실제 API 데이터가 아니며, 서버 운영, 로그 분석, 취약점 점검, 클라우드 기초, 장애 보고서 작성 능력을 요구하는 공고 예시입니다.",
    requiredSkills: ["Linux", "시스템 운영", "보안", "클라우드", "네트워크", "보고서 작성"],
    preferredCertificates: ["정보처리기사", "정보보안기사", "네트워크관리사"],
    requiredExperience: "운영 자동화 또는 보안 실습 경험 우대",
  },
  {
    id: "demo-public-it-003",
    title: "데이터/행정 시스템 개발 보조",
    organization: "데모 공고 · 실 API 미연결",
    source: "데모 데이터",
    sourceStatus: "DEMO",
    url: "https://job.alio.go.kr/recruit.do",
    deadline: "상시 확인 필요",
    location: "지역 제한 확인 필요",
    employmentType: "청년인턴",
    description:
      "SQL 기반 데이터 처리, 간단한 웹 기능 개발, API 연동, 산출물 정리 능력을 요구하는 인턴 공고 예시입니다.",
    rawText:
      "데모 공고입니다. 실제 API 데이터가 아니며, SQL 기반 데이터 처리, 간단한 웹 기능 개발, API 연동, 산출물 정리 능력을 요구하는 인턴 공고 예시입니다.",
    requiredSkills: ["SQL", "API", "Python", "DB", "문서화"],
    preferredCertificates: ["SQLD", "정보처리기사"],
    requiredExperience: "개발 프로젝트 경험 우대",
  },
];
