import { NextResponse } from "next/server";

import { matchJobDescriptions } from "@/lib/jobDescriptionMatcher";
import {
  createClient,
  getAcademicRecords,
  getEvidenceRecords,
  getJobDescriptions,
  getProfile,
} from "@/lib/supabase/server";
import { buildUserProfile } from "@/lib/userProfileBuilder";
import type {
  AcademicRecord,
  CareerProfileRecord,
  EvidenceRecord,
  JobDescriptionRecord,
} from "@/types/career";

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : null;
}

function normalizeJobDescription(row: Record<string, unknown>): JobDescriptionRecord {
  return {
    id: getString(row.id),
    company_name:
      getString(row.company_name) ||
      getString(row.company) ||
      getString(row.organization) ||
      getString(row.inst_nm),
    title:
      getString(row.title) ||
      getString(row.job_title) ||
      getString(row.recrut_pbanc_ttl) ||
      "직무 설명",
    target_job: getString(row.target_job) || getString(row.job) || null,
    description:
      getString(row.description) ||
      getString(row.job_description) ||
      getString(row.raw_text) ||
      "",
    required_skills: getStringArray(row.required_skills),
    preferred_certificates: getStringArray(row.preferred_certificates),
    source_url: getString(row.source_url) || getString(row.url) || null,
    created_at: getString(row.created_at) || new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const jobDescriptionId = getString(body.jobDescriptionId);
    const limit = Number(body.limit);

    const [profileRows, academicRows, evidenceRows, jobRows] = await Promise.all([
      getProfile(user.id),
      getAcademicRecords(user.id),
      getEvidenceRecords(user.id),
      getJobDescriptions(Number.isFinite(limit) ? limit : 100),
    ]);
    const profile = Array.isArray(profileRows)
      ? (profileRows[0] as CareerProfileRecord | undefined)
      : undefined;

    if (!profile) {
      return NextResponse.json(
        { error: "Profile required before job fit analysis." },
        { status: 400 },
      );
    }

    const inputProfile = buildUserProfile({
      profile,
      academic: Array.isArray(academicRows) ? (academicRows as AcademicRecord[]) : [],
      evidence: Array.isArray(evidenceRows) ? (evidenceRows as EvidenceRecord[]) : [],
    });
    const jobDescriptions = (Array.isArray(jobRows) ? jobRows : [])
      .map((row) => normalizeJobDescription(row as Record<string, unknown>))
      .filter((job) => job.id && (job.description || job.title || job.company_name));
    const filteredJobs = jobDescriptionId
      ? jobDescriptions.filter((job) => job.id === jobDescriptionId)
      : jobDescriptions;

    if (!filteredJobs.length) {
      return NextResponse.json({
        inputProfile,
        results: [],
        warning: "job_descriptions 테이블에서 매칭 가능한 직무 설명을 찾지 못했습니다.",
      });
    }

    return NextResponse.json({
      inputProfile,
      results: matchJobDescriptions(inputProfile, filteredJobs),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to calculate job fit.";
    const status = message.includes("environment variables") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
