import type { JobPosting, UserProfile } from "@/types/career";

type UnknownRecord = Record<string, unknown>;

const demoPublicItPostings: JobPosting[] = [
  {
    id: "demo-public-it-001",
    title: "공공기관 전산직 신입",
    organization: "데모 공고 - API 미연결",
    source: "fallback-demo",
    sourceStatus: "DEMO",
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
    organization: "데모 공고 - API 미연결",
    source: "fallback-demo",
    sourceStatus: "DEMO",
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
    organization: "데모 공고 - API 미연결",
    source: "fallback-demo",
    sourceStatus: "DEMO",
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

function getString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function splitTerms(value: string) {
  return value
    .split(/[,/|·\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractItems(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is UnknownRecord => Boolean(item) && typeof item === "object");
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as UnknownRecord;
  const candidates = [
    record.data,
    record.items,
    record.result,
    record.response,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is UnknownRecord => Boolean(item) && typeof item === "object");
    }
    if (candidate && typeof candidate === "object") {
      const nested = candidate as UnknownRecord;
      if (Array.isArray(nested.items)) {
        return nested.items.filter((item): item is UnknownRecord => Boolean(item) && typeof item === "object");
      }
      if (Array.isArray(nested.list)) {
        return nested.list.filter((item): item is UnknownRecord => Boolean(item) && typeof item === "object");
      }
    }
  }

  return [];
}

function normalizePosting(item: UnknownRecord, index: number): JobPosting {
  const title = getString(item, ["title", "recrutPbancTtl", "recruitTitle", "pbancTtl", "채용제목"]);
  const organization = getString(item, ["organization", "instNm", "orgNm", "pblancInsttNm", "기관명"]);
  const description = getString(item, ["description", "ncsCdNm", "jobCn", "contents", "채용내용"]);
  const required = getString(item, ["requiredSkills", "qualification", "aplyQlfcCn", "필요역량"]);
  const certificates = getString(item, ["preferredCertificates", "license", "qlfc", "우대자격"]);
  const rawText = [
    title,
    organization,
    description,
    required,
    certificates,
    getString(item, ["requiredExperience", "career", "경력"]),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: getString(item, ["id", "recrutPbancNo", "sn", "채용공고번호"]) || `external-${index + 1}`,
    title: title || "제목 미확인 공고",
    organization: organization || "기관명 미확인",
    source: getString(item, ["source"]) || "external-api",
    sourceStatus: "LIVE",
    url: getString(item, ["url", "recrutUrl", "homepageUrl", "채용URL"]) || undefined,
    deadline: getString(item, ["deadline", "pbancEndYmd", "endDate", "접수마감일"]) || undefined,
    location: getString(item, ["location", "workRgnNm", "근무지"]) || undefined,
    employmentType: getString(item, ["employmentType", "hireTypeNm", "고용형태"]) || undefined,
    description,
    rawText,
    requiredSkills: splitTerms(required || description),
    preferredCertificates: splitTerms(certificates),
    requiredExperience: getString(item, ["requiredExperience", "career", "경력"]) || undefined,
  };
}

function makeSearchUrl(profile: UserProfile) {
  const apiUrl = process.env.ALIO_OPEN_API_URL;
  const apiKey = process.env.ALIO_OPEN_API_KEY;

  if (!apiUrl || !apiKey) {
    return null;
  }

  const url = new URL(apiUrl);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("keyword", profile.career || "전산");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "10");
  url.searchParams.set("type", "json");
  return url;
}

export async function fetchJobPostings(profile: UserProfile): Promise<JobPosting[]> {
  const url = makeSearchUrl(profile);
  if (!url) {
    return demoPublicItPostings;
  }

  try {
    const response = await fetch(url, { next: { revalidate: 60 * 60 } });
    if (!response.ok) {
      return demoPublicItPostings;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      return demoPublicItPostings;
    }

    const payload: unknown = await response.json();
    const postings = extractItems(payload).map(normalizePosting).slice(0, 5);
    return postings.length ? postings : demoPublicItPostings;
  } catch {
    return demoPublicItPostings;
  }
}
