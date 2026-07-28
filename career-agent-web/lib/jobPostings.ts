import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { isDemoMode } from "@/lib/demo/config";
import { demoJobPostings } from "@/lib/demo/jobPostings";
import type { JobPosting, UserProfile } from "@/types/career";

type UnknownRecord = Record<string, unknown>;

const DEFAULT_ALIO_JSON_LIST_URL = "https://opendata.alio.go.kr/new/odaApiMng/recrutInquiryAjaxList.do";
const DEFAULT_JOB_ALIO_RECRUIT_URL = "https://job.alio.go.kr/recruit.do";
const DEFAULT_JOB_ALIO_SOURCE = "잡알리오";
const PUBLIC_IT_TERMS = [
  "전산",
  "정보시스템",
  "정보통신",
  "ICT",
  "IT",
  "데이터",
  "DB",
  "SQL",
  "시스템",
  "보안",
  "네트워크",
  "서버",
  "개발",
  "소프트웨어",
  "프로그래밍",
];
const NON_IT_TERMS = ["의사", "간호", "의료", "보건", "약사", "임상", "병동"];

function getString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return normalizeWhitespace(value);
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return "";
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitTerms(value: string) {
  return value
    .split(/[,/|·ㆍ\n]/)
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean);
}

function uniqueById(postings: JobPosting[]) {
  const seen = new Set<string>();
  return postings.filter((posting) => {
    const key = posting.id || `${posting.organization}:${posting.title}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function extractItems(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const queue: unknown[] = [payload];
  const visited = new Set<unknown>();
  const arrays: UnknownRecord[][] = [];

  while (queue.length) {
    const current = queue.shift();
    if (!isRecord(current) || visited.has(current)) {
      continue;
    }
    visited.add(current);

    for (const [key, value] of Object.entries(current)) {
      if (Array.isArray(value)) {
        const records = value.filter(isRecord);
        if (records.length && looksLikePostingArray(key, records)) {
          arrays.push(records);
        }
      } else if (isRecord(value)) {
        queue.push(value);
      }
    }
  }

  return arrays.sort((a, b) => b.length - a.length)[0] ?? [];
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function looksLikePostingArray(key: string, records: UnknownRecord[]) {
  const lowerKey = key.toLowerCase();
  if (["items", "item", "list", "data", "result", "pagelist", "recruitlist"].some((name) => lowerKey.includes(name))) {
    return true;
  }

  const first = records[0];
  const keys = Object.keys(first).join(" ").toLowerCase();
  return ["title", "recrut", "recruit", "pbanc", "inst", "org", "idx"].some((hint) => keys.includes(hint));
}

function normalizePosting(item: UnknownRecord, index: number): JobPosting {
  const title = getString(item, [
    "title",
    "recrutPbancTtl",
    "recruitTitle",
    "pbancTtl",
    "recrutPbancNm",
    "recruitPbancTtl",
    "채용제목",
  ]);
  const organization = getString(item, [
    "organization",
    "instNm",
    "orgNm",
    "pblancInsttNm",
    "apba_na",
    "pname",
    "기관명",
  ]);
  const description = getString(item, [
    "description",
    "ncsCdNm",
    "ncsCdNmLst",
    "jobCn",
    "contents",
    "recrutSeNm",
    "work_type",
    "채용내용",
  ]);
  const required = getString(item, [
    "requiredSkills",
    "qualification",
    "aplyQlfcCn",
    "career",
    "reqst_qualf",
    "응시자격",
    "필요역량",
  ]);
  const certificates = getString(item, [
    "preferredCertificates",
    "license",
    "qlfc",
    "prefCn",
    "prefCondCn",
    " 우대조건",
    "우대자격",
  ]);
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
    id:
      getString(item, ["id", "idx", "recrutPblntSn", "recrutPbancNo", "sn", "pbancNo", "채용공고번호"]) ||
      `external-${index + 1}`,
    title: title || "제목 미확인 공고",
    organization: organization || "기관명 미확인",
    source: getString(item, ["source"]) || DEFAULT_JOB_ALIO_SOURCE,
    sourceStatus: "LIVE",
    url: buildPostingUrl(getString(item, ["url", "srcUrl", "recrutUrl", "homepageUrl", "recruitUrl", "채용URL"]), item),
    deadline: getString(item, ["deadline", "pbancEndYmd", "endDate", "recrutEndDd", "recruit_to", "마감일"]) || undefined,
    location: getString(item, ["location", "workRgnNmLst", "workRgnNm", "area", "locationStr", "근무지"]) || undefined,
    employmentType: getString(item, ["employmentType", "hireTypeNmLst", "hireTypeNm", "work_type", "고용형태"]) || undefined,
    description,
    rawText: rawText || `${organization}\n${title}`,
    requiredSkills: splitTerms(required || description || title),
    preferredCertificates: splitTerms(certificates),
    requiredExperience: getString(item, ["requiredExperience", "career", "경력"]) || undefined,
  };
}

function buildPostingUrl(rawUrl: string, item: UnknownRecord) {
  if (rawUrl && rawUrl !== ".") {
    return rawUrl.startsWith("/") ? `https://job.alio.go.kr${rawUrl}` : rawUrl;
  }

  const idx = getString(item, ["idx", "id", "recrutPblntSn"]);
  return idx ? `https://job.alio.go.kr/recruitview.do?idx=${encodeURIComponent(idx)}` : undefined;
}

function makeConfiguredOpenApiUrl(profile: UserProfile) {
  const apiUrl = getEnvValue("ALIO_OPEN_API_URL");
  const apiKey = getEnvValue("ALIO_OPEN_API_KEY");

  if (!apiUrl || !apiKey) {
    return null;
  }

  const url = new URL(apiUrl);
  setIfMissing(url, "serviceKey", apiKey);
  setIfMissing(url, "ServiceKey", apiKey);
  setIfMissing(url, "keyword", getSearchKeyword(profile));
  setIfMissing(url, "pageNo", "1");
  setIfMissing(url, "numOfRows", "10");
  setIfMissing(url, "type", "json");
  setIfMissing(url, "_type", "json");
  return url;
}

function getAlioJsonListUrl() {
  const configured = getEnvValue("ALIO_JSON_LIST_URL");
  return configured || DEFAULT_ALIO_JSON_LIST_URL;
}

function makeJobAlioHtmlUrl(profile: UserProfile) {
  const url = new URL(process.env.JOB_ALIO_RECRUIT_URL || DEFAULT_JOB_ALIO_RECRUIT_URL);
  url.searchParams.set("search_yn", "Y");
  url.searchParams.set("keyword", getSearchKeyword(profile));
  url.searchParams.set("pageNo", "1");
  return url;
}

function makeJobAlioHtmlUrlWithKeyword(keyword: string) {
  const url = new URL(process.env.JOB_ALIO_RECRUIT_URL || DEFAULT_JOB_ALIO_RECRUIT_URL);
  url.searchParams.set("search_yn", "Y");
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("pageNo", "1");
  return url;
}

function setIfMissing(url: URL, key: string, value: string) {
  if (!url.searchParams.has(key)) {
    url.searchParams.set(key, value);
  }
}

let keyEnvCache: Record<string, string> | null = null;

function getKeyEnv() {
  if (keyEnvCache) {
    return keyEnvCache;
  }

  const envPath = join(process.cwd(), "key.env");
  if (!existsSync(envPath)) {
    keyEnvCache = {};
    return keyEnvCache;
  }

  keyEnvCache = Object.fromEntries(
    readFileSync(envPath, "utf-8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...valueParts] = line.split("=");
        return [key.trim(), valueParts.join("=").trim().replace(/^['"]|['"]$/g, "")];
      }),
  );
  return keyEnvCache;
}

function getEnvValue(key: string) {
  return process.env[key] || getKeyEnv()[key] || "";
}

function getSearchKeyword(profile: UserProfile) {
  const career = profile.career?.trim();
  if (career) {
    if (career.includes("전산")) {
      return "전산";
    }
    if (career.includes("정보통신") || career.toLowerCase().includes("it")) {
      return "정보통신";
    }
    return career;
  }
  return "전산";
}

function getSearchKeywords(profile: UserProfile) {
  return Array.from(
    new Set(
      [
        profile.targetCompany,
        getSearchKeyword(profile),
        "전산",
        "정보통신",
      ]
        .map((keyword) => keyword?.trim())
        .filter((keyword): keyword is string => Boolean(keyword)),
    ),
  );
}

async function fetchJsonPostings(url: URL) {
  const response = await fetch(url, {
    headers: { Accept: "application/json, text/plain;q=0.9, */*;q=0.8" },
    next: { revalidate: 60 * 60 },
  });
  if (!response.ok) {
    return [];
  }

  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return [];
  }

  const payload: unknown = JSON.parse(trimmed);
  return extractItems(payload).map(normalizePosting);
}

async function fetchAlioJsonPostingsDetailed(profile: UserProfile) {
  const allItems: UnknownRecord[] = [];
  const warnings: string[] = [];

  for (const keyword of getSearchKeywords(profile)) {
    try {
      const response = await fetch(getAlioJsonListUrl(), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({
          pageNo: "1",
          pageSet: "50",
          searchKeyword: keyword,
          keyword,
          ongoingYn: "Y",
        }),
        next: { revalidate: 60 * 30 },
      });

      if (!response.ok) {
        warnings.push(`ALIO JSON request failed for "${keyword}": ${response.status}`);
        continue;
      }

      const payload: unknown = await response.json();
      allItems.push(...extractItems(payload));
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      warnings.push(`ALIO JSON request failed for "${keyword}": ${message}`);
    }
  }

  const filtered = filterAlioItems(allItems, profile);

  return {
    postings: filtered.map(normalizeAlioApiPosting),
    rawCount: allItems.length,
    filteredCount: filtered.length,
    warnings,
  };
}

function filterAlioItems(items: UnknownRecord[], profile: UserProfile) {
  const keyword = getSearchKeyword(profile);
  const terms = Array.from(new Set([keyword, ...PUBLIC_IT_TERMS])).filter(Boolean);
  const scored = items
    .map((item) => ({ item, score: getPublicItPostingScore(item, terms) }))
    .filter(({ score }) => score >= 1)
    .sort((a, b) => b.score - a.score);

  return scored.map(({ item }) => item).slice(0, 30);
}

function getPublicItPostingScore(item: UnknownRecord, terms: string[]) {
  const title = getString(item, ["recrutPbancTtl", "title"]);
  const ncs = getString(item, ["ncsCdNmLst"]);
  const details = [
    getString(item, ["description"]),
    getString(item, ["requiredExperience"]),
    getString(item, ["aplyQlfcCn"]),
    getString(item, ["prefCn", "prefCondCn"]),
    getString(item, ["scrnprcdrMthdExpln"]),
  ]
    .join(" ")
    .replace(/과학기술정보통신부/g, "");
  const titleLower = title.toLowerCase();
  const ncsLower = ncs.toLowerCase();
  const detailLower = details.toLowerCase();
  let score = 0;

  for (const term of terms) {
    const lower = term.toLowerCase();
    if (titleLower.includes(lower)) score += 3;
    if (ncsLower.includes(lower)) score += 2;
    if (detailLower.includes(lower)) score += 1;
  }

  const combined = `${title} ${ncs} ${details}`.toLowerCase();
  const looksNonIt = NON_IT_TERMS.some((term) => combined.includes(term));
  if (looksNonIt && score < 3) {
    return 0;
  }

  return score;
}

function normalizeAlioApiPosting(item: UnknownRecord, index: number) {
  const text = [
    getString(item, ["recrutPbancTtl", "title"]),
    getString(item, ["instNm", "organization"]),
    getString(item, ["ncsCdNmLst"]),
    getString(item, ["aplyQlfcCn"]),
    getString(item, ["prefCn", "prefCondCn"]),
  ].join(" ");

  return normalizePosting(
    {
      ...item,
      source: "ALIO OpenAPI",
      description: text,
      requiredSkills: inferJobAlioRequiredSkills(text).join(", "),
      preferredCertificates: inferPreferredCertificates(text).join(", "),
    },
    index,
  );
}

function inferPreferredCertificates(text: string) {
  const normalized = text.toLowerCase();
  const certificates = ["정보처리기사", "SQLD"];

  if (normalized.includes("보안") || normalized.includes("security")) {
    certificates.push("정보보안기사");
  }
  if (normalized.includes("정보통신") || normalized.includes("ict") || normalized.includes("네트워크")) {
    certificates.push("네트워크관리사");
  }
  if (normalized.includes("linux") || normalized.includes("리눅스")) {
    certificates.push("리눅스마스터");
  }

  return Array.from(new Set(certificates));
}

async function fetchJobAlioHtmlPostings(profile: UserProfile) {
  const collected: JobPosting[] = [];
  const keywords = Array.from(new Set([getSearchKeyword(profile), "전산", "정보통신"]));

  for (const keyword of keywords) {
    const url = keyword === getSearchKeyword(profile)
      ? makeJobAlioHtmlUrl(profile)
      : makeJobAlioHtmlUrlWithKeyword(keyword);
    const response = await fetch(url, {
      headers: { Accept: "text/html,application/xhtml+xml" },
      next: { revalidate: 60 * 30 },
    });
    if (!response.ok) {
      continue;
    }

    const html = await response.text();
    const rows = parseJobAlioRows(html);
    const filtered = filterAlioItems(rows, profile);
    if (filtered.length) {
      collected.push(
        ...filtered.map((item, index) => normalizePosting(item, collected.length + index)),
      );
    }
  }

  return uniqueById(collected).slice(0, 30);
}

function parseJobAlioRows(html: string): UnknownRecord[] {
  const rowMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  return rowMatches
    .filter((row) => row.includes("recruitview.do"))
    .map((row) => {
      const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => stripHtml(match[1]));
      const linkMatch = row.match(/href=["']([^"']*recruitview\.do\?idx=([^"']+))["'][^>]*\/?>([\s\S]*?)<\/a>/i);
      const url = linkMatch?.[1] ?? "";
      const idx = decodeHtmlEntities(linkMatch?.[2] ?? "");
      const title = stripHtml(linkMatch?.[3] ?? cells[2] ?? "");
      const organization = cells[3] ?? "";
      const location = cells[4] ?? "";
      const employmentType = cells[5] ?? "";
      const status = cells[8] ?? "";
      const description = [title, organization, location, employmentType, status].filter(Boolean).join(" ");

      return {
        idx,
        title,
        organization,
        location,
        employmentType,
        postedAt: cells[6] ?? "",
        deadline: cells[7] ?? "",
        status,
        url,
        description,
        requiredSkills: inferJobAlioRequiredSkills(description).join(", "),
        preferredCertificates: "SQLD, 정보처리기사",
        source: DEFAULT_JOB_ALIO_SOURCE,
      };
    })
    .filter((item) => item.title || item.organization);
}

function inferJobAlioRequiredSkills(text: string) {
  const normalized = normalizeWhitespace(text).toLowerCase();
  const skills = ["DB", "SQL", "Python", "API", "Linux"];

  if (normalized.includes("보안") || normalized.includes("security")) {
    skills.push("보안");
  }
  if (
    normalized.includes("전산") ||
    normalized.includes("정보통신") ||
    normalized.includes("it") ||
    normalized.includes("시스템")
  ) {
    skills.push("시스템 운영");
  }
  if (normalized.includes("데이터") || normalized.includes("data")) {
    skills.push("데이터베이스");
  }

  return Array.from(new Set(skills));
}

function stripHtml(value: string) {
  return normalizeWhitespace(
    decodeHtmlEntities(
      value
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

type PostingMeta = { fetchedAt: string; isFallback: boolean; isDemo: boolean };

function withMeta(postings: JobPosting[], meta: PostingMeta): JobPosting[] {
  return postings.map((posting) => ({ ...posting, ...meta }));
}

// 서버 프로세스 생존 기간 동안만 유지되는 마지막 정상 응답 캐시입니다.
// 재배포·재시작 시 초기화되며, 영속 캐시가 필요하면 별도 설계가 필요합니다.
let lastGoodPostingsCache: { postings: JobPosting[]; fetchedAt: string } | null = null;

export async function fetchJobPostings(profile: UserProfile): Promise<JobPosting[]> {
  const { postings } = await fetchJobPostingsWithDebug(profile);
  return postings;
}

export async function fetchJobPostingsWithDebug(profile: UserProfile): Promise<{
  postings: JobPosting[];
  debug: {
    alioRawCount: number;
    alioFilteredCount: number;
    alioReadCount: number;
    configuredApiReadCount: number;
    jobAlioHtmlReadCount: number;
    returnedCount: number;
    usedFallback: boolean;
    fallbackTier: "live" | "cache" | "demo";
    fetchedAt: string;
  };
  warnings: string[];
}> {
  if (isDemoMode()) {
    const fetchedAt = new Date().toISOString();
    return {
      postings: withMeta(demoJobPostings, { fetchedAt, isFallback: true, isDemo: true }),
      debug: {
        alioRawCount: 0,
        alioFilteredCount: 0,
        alioReadCount: 0,
        configuredApiReadCount: 0,
        jobAlioHtmlReadCount: 0,
        returnedCount: demoJobPostings.length,
        usedFallback: true,
        fallbackTier: "demo",
        fetchedAt,
      },
      warnings: [],
    };
  }

  const configuredUrl = makeConfiguredOpenApiUrl(profile);
  const warnings: string[] = [];
  let livePostings: JobPosting[] = [];
  let alioRawCount = 0;
  let alioFilteredCount = 0;
  let configuredApiReadCount = 0;
  let jobAlioHtmlReadCount = 0;

  const alioResult = await fetchAlioJsonPostingsDetailed(profile);
  livePostings = alioResult.postings;
  alioRawCount = alioResult.rawCount;
  alioFilteredCount = alioResult.filteredCount;
  warnings.push(...alioResult.warnings);

  if (livePostings.length < 30 && configuredUrl) {
    try {
      const configuredPostings = await fetchJsonPostings(configuredUrl);
      configuredApiReadCount = configuredPostings.length;
      livePostings = uniqueById([...livePostings, ...configuredPostings]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error("[job-postings] configured API fetch failed", error);
      warnings.push(`Configured job API failed: ${message}`);
    }
  }

  if (livePostings.length < 30) {
    try {
      const htmlPostings = await fetchJobAlioHtmlPostings(profile);
      jobAlioHtmlReadCount = htmlPostings.length;
      livePostings = uniqueById([...livePostings, ...htmlPostings]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error("[job-postings] Job-Alio HTML fetch failed", error);
      warnings.push(`Job-Alio HTML fetch failed: ${message}`);
    }
  }

  const liveResult = uniqueById(livePostings).slice(0, 30);

  let postings: JobPosting[];
  let fallbackTier: "live" | "cache" | "demo";
  let fetchedAt: string;

  if (liveResult.length > 0) {
    fetchedAt = new Date().toISOString();
    fallbackTier = "live";
    lastGoodPostingsCache = { postings: liveResult, fetchedAt };
    postings = withMeta(liveResult, { fetchedAt, isFallback: false, isDemo: false });
  } else if (lastGoodPostingsCache) {
    fallbackTier = "cache";
    fetchedAt = lastGoodPostingsCache.fetchedAt;
    warnings.push(
      `실 API 응답이 없어 ${fetchedAt} 기준 마지막 정상 캐시 데이터를 대신 반환합니다.`,
    );
    postings = withMeta(lastGoodPostingsCache.postings, { fetchedAt, isFallback: true, isDemo: false });
  } else {
    fallbackTier = "demo";
    fetchedAt = new Date().toISOString();
    warnings.push("실 API 응답과 캐시가 모두 없어 데모 공고 데이터를 대신 반환합니다.");
    postings = withMeta(demoJobPostings, { fetchedAt, isFallback: true, isDemo: true });
  }

  return {
    postings,
    debug: {
      alioRawCount,
      alioFilteredCount,
      alioReadCount: alioFilteredCount,
      configuredApiReadCount,
      jobAlioHtmlReadCount,
      returnedCount: postings.length,
      usedFallback: fallbackTier !== "live",
      fallbackTier,
      fetchedAt,
    },
    warnings,
  };
}
