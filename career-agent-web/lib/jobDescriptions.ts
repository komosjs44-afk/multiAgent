import type { JobPosting } from "@/types/career";

type RawJobDescriptionRow = Record<string, unknown>;

export type NormalizedJobDescription = {
  id: string;
  companyName: string;
  title: string;
  recruitTitle: string;
  targetJob: string;
  description: string;
  requiredKnowledge: string[];
  requiredSkills: string[];
  requiredAttitude: string[];
  qualifications: string[];
  sourceUrl: string | null;
  createdAt: string;
};

function getString(row: RawJobDescriptionRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function getStringList(row: RawJobDescriptionRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    }

    if (typeof value === "string" && value.trim()) {
      return value
        .split(/[\n,;/|]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function fallbackId(row: RawJobDescriptionRow, index: number) {
  return (
    getString(row, ["id", "job_id", "recruit_id", "recrut_pblnt_sn", "recrutPbancNo"]) ||
    `supabase-job-description-${index + 1}`
  );
}

export function normalizeJobDescriptionRow(
  row: RawJobDescriptionRow,
  index: number,
): NormalizedJobDescription {
  const companyName = getString(row, [
    "company_name",
    "companyName",
    "company",
    "organization",
    "institution",
    "inst_nm",
    "instNm",
    "org_name",
    "orgNm",
  ]);
  const recruitTitle = getString(row, [
    "recruit_title",
    "recruitTitle",
    "recrut_pbanc_ttl",
    "recrutPbancTtl",
    "title",
    "job_title",
    "jobTitle",
  ]);
  const targetJob = getString(row, [
    "target_job",
    "targetJob",
    "job",
    "ncs",
    "ncs_name",
    "ncsName",
    "duty",
  ]);
  const requiredKnowledge = getStringList(row, [
    "required_knowledge",
    "requiredKnowledge",
    "knowledge",
  ]);
  const requiredSkills = getStringList(row, [
    "required_skills",
    "requiredSkills",
    "skills",
  ]);
  const requiredAttitude = getStringList(row, [
    "required_attitude",
    "requiredAttitude",
    "attitude",
  ]);
  const qualifications = getStringList(row, [
    "qualifications",
    "qualification",
    "preferred_certificates",
    "preferredCertificates",
    "certificates",
  ]);
  const description = getString(row, [
    "description",
    "job_description",
    "jobDescription",
    "raw_text",
    "rawText",
    "content",
    "contents",
    "detail",
  ]);

  return {
    id: fallbackId(row, index),
    companyName,
    title: recruitTitle || targetJob || `${companyName || "기관"} 직무기술서`,
    recruitTitle,
    targetJob,
    description,
    requiredKnowledge,
    requiredSkills,
    requiredAttitude,
    qualifications,
    sourceUrl:
      getString(row, ["source_url", "sourceUrl", "url", "recruit_url", "recruitUrl"]) ||
      null,
    createdAt: getString(row, ["created_at", "createdAt"]) || new Date().toISOString(),
  };
}

export function normalizeJobDescriptionRows(rows: RawJobDescriptionRow[]) {
  return rows.map(normalizeJobDescriptionRow);
}

export function jobDescriptionToPosting(job: NormalizedJobDescription): JobPosting {
  const combinedSkills = unique([
    ...job.requiredKnowledge,
    ...job.requiredSkills,
    ...job.requiredAttitude,
    ...job.qualifications,
  ]);
  const rawText = [
    job.companyName,
    job.title,
    job.targetJob,
    job.description,
    job.requiredKnowledge.join(", "),
    job.requiredSkills.join(", "),
    job.requiredAttitude.join(", "),
    job.qualifications.join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: `supabase-job-description-${job.id}`,
    title: job.title,
    organization: job.companyName || "기관명 미기재",
    source: "supabase_job_description",
    sourceStatus: "LIVE",
    url: job.sourceUrl ?? undefined,
    deadline: undefined,
    location: undefined,
    employmentType: "직무기술서",
    description: job.description || rawText,
    rawText,
    requiredSkills: combinedSkills.length ? combinedSkills : ["전산", "정보화"],
    preferredCertificates: job.qualifications,
    requiredExperience: job.targetJob || "기관 직무기술서 기반 추천",
  };
}

export function jobDescriptionRowsToPostings(rows: RawJobDescriptionRow[]) {
  return normalizeJobDescriptionRows(rows).map(jobDescriptionToPosting);
}
