import {
  buildUserProfile,
} from "@/lib/userProfileBuilder";
import { recommendJobs } from "@/lib/careerAgent";
import { isDemoMode } from "@/lib/demo/config";
import { createStableJobKey } from "@/lib/jobRecommendationKey";
import { fetchJobPostingsWithDebug } from "@/lib/jobPostings";
import { getAcademicRecords, getEvidenceRecords, getEvidenceSkills, getJobDescriptions, getProfile, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import type { JobPosting, JobRecommendation, UserProfile } from "@/types/career";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const RECOMMENDATION_VERSION = "job-recommendation-v2";

type SourceCounts = {
  supabaseJobDescriptions: number;
  supabaseRawRows: number;
  alioRawJobs: number;
  alioFilteredJobs: number;
  alioReturnedJobs: number;
  mergedCandidates: number;
  deduplicatedCandidates: number;
  filteredCandidates: number;
  finalRecommendations: number;
  duplicatedRecommendationIds: string[];
};

type JobPostingDebug = Record<string, unknown>;

type JobRecommendationResponseItem = {
  id: string;
  recommendationId: string;
  companyName: string;
  title: string;
  region: string | null;
  deadline: string | null;
  source: {
    type: "supabase" | "alio";
    label: string;
    confidence: number;
  };
  fitScore: number;
  scoreBreakdown: JobRecommendation["scoreBreakdown"];
  matchedKeywords: string[];
  reason: string;
  recruitUrl: string | null;
  isTargetCompanyMatch: boolean;
  requiredSkills: string[];
  missingSkills: string[];
  recommendedCertificates: string[];
  boostRoutine: string[];
  fetchedAt: string | null;
  isFallback: boolean;
  isDemo: boolean;
};

export type JobRecommendationsMeta = {
  recommendationVersion: string;
  sourceCounts: SourceCounts;
  debug: {
    requestedLimit: number;
    hasServiceRoleKey: boolean;
    jobPostingDebug: JobPostingDebug;
  };
  warnings: string[];
};

export type JobRecommendationsResult =
  | {
      ok: true;
      data: {
        recommendations: JobRecommendationResponseItem[];
        topRecommendations: JobRecommendationResponseItem[];
        otherRelevantJobs: JobRecommendationResponseItem[];
      };
      meta: JobRecommendationsMeta;
    }
  | {
      ok: false;
      error: {
        code: "NO_JOB_MATCH_FOUND" | "JOB_RECOMMENDATION_FAILED";
        message: string;
        hint?: string;
      };
      meta: JobRecommendationsMeta;
    };

type JobDescriptionRow = {
  id?: string;
  company_name?: string | null;
  recruit_title?: string | null;
  title?: string | null;
  job_field?: string | null;
  target_job?: string | null;
  description?: string | null;
  required_knowledge?: string[] | string | null;
  required_skills?: string[] | string | null;
  required_attitude?: string[] | string | null;
  qualifications?: string[] | string | null;
  preferred_certificates?: string[] | string | null;
  source?: string | null;
  source_url?: string | null;
  recruit_url?: string | null;
  active?: boolean | null;
};

function clampLimit(limit: number) {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT);
}

function toArray(value: string[] | string | null | undefined) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(/[,/|·\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeTargetCompanyAliases(profile: UserProfile) {
  const profileAny = profile as Record<string, unknown>;
  const companies = [
    profile.targetCompany,
    profileAny.target_company,
    ...(Array.isArray(profileAny.target_companies) ? profileAny.target_companies : []),
    ...(Array.isArray(profileAny.targetCompanies) ? profileAny.targetCompanies : []),
  ].filter(Boolean) as string[];

  const aliases = new Set<string>();
  for (const company of companies) {
    const normalized = company.replace(/\s+/g, "");
    if (!normalized) continue;
    aliases.add(normalized);
    if (normalized.includes("한국전력공사")) aliases.add("한전");
    if (normalized.includes("인천국제공항공사")) aliases.add("인국공");
    if (normalized.includes("한국철도공사")) aliases.add("코레일");
  }

  return Array.from(aliases);
}

function isTargetCompanyMatch(companyName: string, aliases: string[]) {
  const normalizedCompany = companyName.replace(/\s+/g, "");
  return aliases.some((alias) => normalizedCompany.includes(alias) || alias.includes(normalizedCompany));
}

function mapJobDescriptionToPosting(row: JobDescriptionRow): JobPosting {
  const requiredSkills = unique([
    ...toArray(row.required_knowledge),
    ...toArray(row.required_skills),
    ...toArray(row.required_attitude),
    ...toArray(row.qualifications),
  ]);

  return {
    recommendationId: createStableJobKey({
      sourceType: "supabase",
      id: row.id,
      companyName: row.company_name,
      recruitTitle: row.recruit_title ?? row.title,
    }),
    id: row.id ?? `${row.company_name ?? "unknown"}-${row.recruit_title ?? row.title ?? "job-description"}`,
    company: row.company_name ?? "기관명 미등록",
    companyName: row.company_name ?? "기관명 미등록",
    position: row.recruit_title ?? row.title ?? row.job_field ?? "직무기술서 기반 추천",
    title: row.recruit_title ?? row.title ?? row.job_field ?? "직무기술서 기반 추천",
    region: "기관 직무기술서 기준",
    deadline: "상시 확인 필요",
    source: "supabase_job_description",
    sourceLabel: "직무기술서 기반",
    sourceConfidence: 0.85,
    recruitUrl: row.recruit_url ?? row.source_url ?? "",
    recruit_url: row.recruit_url ?? row.source_url ?? "",
    description: row.description ?? "",
    requiredSkills,
    qualifications: toArray(row.qualifications),
    preferredCertificates: toArray(row.preferred_certificates),
    matchedKeywords: requiredSkills,
    isFallback: false,
    isDemo: isDemoMode(),
  } as unknown as JobPosting;
}

function detectSourceType(job: Record<string, unknown>): "supabase" | "alio" | "fallback" | "unknown" {
  const source = job.source;
  const sourceType = typeof source === "object" && source !== null ? (source as Record<string, unknown>).type : source;
  const sourceText = String(sourceType ?? "").toLowerCase();

  if (sourceText.includes("supabase") || sourceText.includes("description")) return "supabase";
  if (sourceText.includes("alio") || sourceText.includes("잡알리오")) return "alio";
  if (sourceText.includes("fallback") || sourceText.includes("demo")) return "fallback";
  return "unknown";
}

function withRecommendationId(job: JobPosting): JobPosting {
  const jobAny = job as Record<string, unknown>;
  const existing = jobAny.recommendationId;
  if (typeof existing === "string" && existing.trim()) return job;

  const sourceType = detectSourceType(jobAny);
  const companyName = String(jobAny.companyName ?? jobAny.company ?? "");
  const recruitTitle = String(jobAny.recruitTitle ?? jobAny.title ?? jobAny.position ?? "");

  return {
    ...job,
    recommendationId: createStableJobKey({
      sourceType,
      id: (sourceType === "supabase" ? jobAny.id : undefined) as string | number | undefined,
      recruitmentNo: (jobAny.recruitmentNo ?? jobAny.recrutPblntSn ?? jobAny.recruitNo) as string | number | undefined,
      companyName,
      recruitTitle,
      startDate: String(jobAny.startDate ?? jobAny.start_date ?? ""),
      endDate: String(jobAny.endDate ?? jobAny.end_date ?? jobAny.deadline ?? ""),
    }),
  } as unknown as JobPosting;
}

function deduplicateByRecommendationId(jobs: JobPosting[]) {
  const duplicatedIds: string[] = [];
  const seen = new Map<string, JobPosting>();

  for (const job of jobs.map(withRecommendationId)) {
    const id = String((job as Record<string, unknown>).recommendationId ?? "");
    if (seen.has(id)) {
      duplicatedIds.push(id);
      continue;
    }
    seen.set(id, job);
  }

  return {
    jobs: Array.from(seen.values()),
    duplicatedIds: Array.from(new Set(duplicatedIds)),
  };
}

function getPostingField(posting: JobPosting, keys: string[], fallback = "") {
  const postingAny = posting as Record<string, unknown>;
  for (const key of keys) {
    const value = postingAny[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function mapRecommendationToResponseItem(
  recommendation: JobRecommendation,
  userProfile: UserProfile,
): JobRecommendationResponseItem {
  const posting = recommendation.posting;
  const postingAny = posting as Record<string, unknown>;
  const sourceType = detectSourceType(postingAny) === "supabase" ? "supabase" : "alio";
  const companyName = getPostingField(posting, ["companyName", "company", "organization"], "기관명 미등록");
  const title = getPostingField(posting, ["recruitTitle", "title", "position"], "공고명 미등록");
  const deadline = getPostingField(posting, ["deadline", "endDate", "end_date"], "");
  const recommendationId = createStableJobKey({
    sourceType,
    id: sourceType === "supabase" ? (postingAny.id as string | number | undefined) : undefined,
    recruitmentNo: (postingAny.recruitmentNo ?? postingAny.recrutPblntSn ?? postingAny.recruitNo) as string | number | undefined,
    companyName,
    recruitTitle: title,
    startDate: getPostingField(posting, ["startDate", "start_date"], ""),
    endDate: deadline,
  });
  const requiredSkills = Array.isArray(posting.requiredSkills) ? posting.requiredSkills : [];
  const matchedKeywords = unique([
    ...recommendation.matchedSkills,
    ...requiredSkills.filter((skill) => recommendation.matchedSkills.includes(skill)),
  ]);

  return {
    id: String(postingAny.id ?? recommendationId),
    recommendationId,
    companyName,
    title,
    region: getPostingField(posting, ["region", "location"], "") || null,
    deadline: deadline || null,
    source: {
      type: sourceType,
      label: sourceType === "supabase" ? "직무기술서 기반" : "실시간 채용공고",
      confidence: sourceType === "supabase" ? 0.85 : 0.9,
    },
    fitScore: recommendation.fitScore,
    scoreBreakdown: recommendation.scoreBreakdown,
    matchedKeywords,
    reason: `${matchedKeywords.slice(0, 4).join(", ") || "공고"} 키워드가 현재 프로필과 연결됩니다.`,
    recruitUrl: getPostingField(posting, ["recruitUrl", "recruit_url", "url"], "") || null,
    isTargetCompanyMatch: isTargetCompanyMatch(companyName, normalizeTargetCompanyAliases(userProfile)),
    requiredSkills,
    missingSkills: recommendation.missingSkills,
    recommendedCertificates: recommendation.recommendedCertificates,
    boostRoutine: recommendation.boostRoutine,
    fetchedAt: typeof postingAny.fetchedAt === "string" ? postingAny.fetchedAt : null,
    isFallback: postingAny.isFallback === true,
    isDemo: postingAny.isDemo === true,
  };
}

function deduplicateRecommendations(jobs: JobRecommendationResponseItem[]) {
  const duplicatedIds: string[] = [];
  const seen = new Map<string, JobRecommendationResponseItem>();

  jobs.forEach((job, index) => {
    const baseId = job.recommendationId || `${job.source.type}-${job.id}-${index}`;
    const id = seen.has(baseId) ? `${baseId}-${index}` : baseId;
    if (seen.has(baseId)) duplicatedIds.push(baseId);
    seen.set(id, { ...job, recommendationId: id });
  });

  return {
    jobs: Array.from(seen.values()),
    duplicatedIds: Array.from(new Set(duplicatedIds)),
  };
}

function mergeCandidates(supabaseJobs: JobPosting[], alioJobs: JobPosting[], profile: UserProfile) {
  const targetAliases = normalizeTargetCompanyAliases(profile);

  return [...supabaseJobs, ...alioJobs].sort((a, b) => {
    const aAny = a as Record<string, unknown>;
    const bAny = b as Record<string, unknown>;
    const aCompany = String(aAny.companyName ?? aAny.company ?? "");
    const bCompany = String(bAny.companyName ?? bAny.company ?? "");
    const aTarget = isTargetCompanyMatch(aCompany, targetAliases) ? 1 : 0;
    const bTarget = isTargetCompanyMatch(bCompany, targetAliases) ? 1 : 0;
    if (aTarget !== bTarget) return bTarget - aTarget;
    const aSource = aAny.source === "supabase_job_description" || aAny.source === "supabase" ? 1 : 0;
    const bSource = bAny.source === "supabase_job_description" || bAny.source === "supabase" ? 1 : 0;
    return bSource - aSource;
  });
}

function buildEmptyMeta(limit: number, jobPostingDebug?: JobPostingDebug): JobRecommendationsMeta {
  return {
    recommendationVersion: RECOMMENDATION_VERSION,
    sourceCounts: {
      supabaseJobDescriptions: 0,
      supabaseRawRows: 0,
      alioRawJobs: Number(jobPostingDebug?.rawCount ?? jobPostingDebug?.alioRawCount ?? 0),
      alioFilteredJobs: Number(jobPostingDebug?.filteredCount ?? jobPostingDebug?.alioFilteredCount ?? 0),
      alioReturnedJobs: 0,
      mergedCandidates: 0,
      deduplicatedCandidates: 0,
      filteredCandidates: 0,
      finalRecommendations: 0,
      duplicatedRecommendationIds: [],
    },
    debug: {
      requestedLimit: limit,
      hasServiceRoleKey: hasSupabaseServiceRoleKey(),
      jobPostingDebug:
      jobPostingDebug ?? {
        rawCount: 0,
        filteredCount: 0,
        source: "none",
        warnings: [],
      },
    },
    warnings: [],
  };
}

export async function getJobRecommendations(userId: string, rawLimit = DEFAULT_LIMIT): Promise<JobRecommendationsResult> {
  const limit = clampLimit(rawLimit);
  const warnings: string[] = [];
  let jobPostingDebug: JobPostingDebug | undefined;

  try {
    const [profileRow, academicRows, evidenceRows, evidenceSkillRows] = await Promise.all([
      getProfile(userId),
      getAcademicRecords(userId),
      getEvidenceRecords(userId),
      getEvidenceSkills(userId),
    ]);

    const userProfile = buildUserProfile({
      profile: profileRow as never,
      academic: academicRows as never,
      evidence: evidenceRows as never,
      confirmedSkillRows: evidenceSkillRows as never,
    });

    const jobDescriptionRows = (await getJobDescriptions(200)) as JobDescriptionRow[];
    if (jobDescriptionRows.length === 0) {
      warnings.push("Supabase job_descriptions read succeeded but returned 0 rows.");
    }

    const supabaseJobs = jobDescriptionRows.map(mapJobDescriptionToPosting);
    const liveJobResult = await fetchJobPostingsWithDebug(userProfile);
    jobPostingDebug = liveJobResult.debug;
    warnings.push(...liveJobResult.warnings);

    const mergedCandidates = mergeCandidates(supabaseJobs, liveJobResult.postings.map(withRecommendationId), userProfile);
    const deduplicated = deduplicateByRecommendationId(mergedCandidates);
    if (deduplicated.duplicatedIds.length > 0) {
      console.warn("[job-recommendations] duplicated candidate recommendationId", deduplicated.duplicatedIds);
    }

    if (deduplicated.jobs.length === 0) {
      const meta = buildEmptyMeta(limit, jobPostingDebug);
      meta.warnings = warnings;
      return {
        ok: false,
        error: {
          code: "NO_JOB_MATCH_FOUND",
          message: "추천 가능한 전산직 공고를 찾지 못했습니다.",
          hint: "Supabase job_descriptions 데이터, RLS select policy, ALIO API 상태를 확인하세요.",
        },
        meta,
      };
    }

    const recommendations = recommendJobs(userProfile, deduplicated.jobs, limit);
    const responseRecommendations = recommendations.map((job) =>
      mapRecommendationToResponseItem(job, userProfile),
    );
    const normalizedRecommendations = deduplicateRecommendations(responseRecommendations);
    const finalRecommendations = normalizedRecommendations.jobs;

    const duplicatedRecommendationIds = finalRecommendations
      .map((job) => job.recommendationId)
      .filter((id, index, arr) => id && arr.indexOf(id) !== index);

    if (duplicatedRecommendationIds.length > 0) {
      console.warn("[job-recommendations] duplicated recommendationId", duplicatedRecommendationIds);
    }

    console.table(
      finalRecommendations.map((job) => {
        return {
          recommendationId: job.recommendationId,
          id: job.id,
          source: job.source.type,
          companyName: job.companyName,
          recruitTitle: job.title,
        };
      }),
    );

    const meta: JobRecommendationsMeta = {
      recommendationVersion: RECOMMENDATION_VERSION,
      sourceCounts: {
        supabaseJobDescriptions: supabaseJobs.length,
        supabaseRawRows: jobDescriptionRows.length,
        alioRawJobs: Number(jobPostingDebug?.rawCount ?? jobPostingDebug?.alioRawCount ?? 0),
        alioFilteredJobs: liveJobResult.postings.length,
        alioReturnedJobs: liveJobResult.postings.length,
        mergedCandidates: mergedCandidates.length,
        deduplicatedCandidates: deduplicated.jobs.length,
        filteredCandidates: deduplicated.jobs.length,
        finalRecommendations: finalRecommendations.length,
        duplicatedRecommendationIds: Array.from(
          new Set([...deduplicated.duplicatedIds, ...normalizedRecommendations.duplicatedIds, ...duplicatedRecommendationIds]),
        ),
      },
      debug: {
        requestedLimit: limit,
        hasServiceRoleKey: hasSupabaseServiceRoleKey(),
        jobPostingDebug: jobPostingDebug ?? liveJobResult.debug,
      },
      warnings,
    };

    if (finalRecommendations.length === 0) {
      return {
        ok: false,
        error: {
          code: "NO_JOB_MATCH_FOUND",
          message: "후보 공고는 있지만 추천 점수 계산 후 표시할 공고가 없습니다.",
          hint: "recommendJobs 필터 조건과 사용자 프로필 데이터를 확인하세요.",
        },
        meta,
      };
    }

    return {
      ok: true,
      data: {
        recommendations: finalRecommendations,
        topRecommendations: finalRecommendations.slice(0, 3),
        otherRelevantJobs: finalRecommendations.slice(3),
      },
      meta,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown job recommendation error.";
    console.error("[job-recommendations] failed", error);
    const meta = buildEmptyMeta(limit, jobPostingDebug);
    meta.warnings = [...warnings, message];

    return {
      ok: false,
      error: {
        code: "JOB_RECOMMENDATION_FAILED",
        message: "추천공고 계산 중 오류가 발생했습니다.",
        hint: message,
      },
      meta,
    };
  }
}
