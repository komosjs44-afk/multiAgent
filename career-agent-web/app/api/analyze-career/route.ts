import { NextResponse } from "next/server";

import { analyzeCareer } from "@/lib/careerAgent";
import { jobDescriptionRowsToPostings } from "@/lib/jobDescriptions";
import { fetchJobPostings } from "@/lib/jobPostings";
import {
  createClient,
  getAcademicRecords,
  getActiveTranscriptVersion,
  getEvidenceRecords,
  getEvidenceSkills,
  getJobDescriptions,
  getPendingReviewVersion,
  getProfile,
  saveAnalysisHistory,
} from "@/lib/supabase/server";
import { resolveGpa, resolveTotalCredits } from "@/lib/academicSummary";
import { buildUserProfile } from "@/lib/userProfileBuilder";
import type {
  AcademicRecord,
  CareerAnalysis,
  CareerProfileRecord,
  EvidenceRecord,
  EvidenceSkillRow,
  JobPosting,
  UserProfile,
} from "@/types/career";

function mergePostings(postings: JobPosting[]) {
  const seen = new Set<string>();

  return postings.filter((posting) => {
    const key = `${posting.organization}:${posting.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shouldSaveAnalysis(request: Request, body: Record<string, unknown>) {
  const url = new URL(request.url);
  const queryValue = url.searchParams.get("save");
  if (queryValue === "false" || queryValue === "0") return false;
  if (body.save === false || body.save === "false" || body.persist === false) return false;
  return true;
}

async function generateOpenAISummary(
  profile: UserProfile,
  analysis: CareerAnalysis,
): Promise<string | undefined> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return undefined;

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const prompt = `공기업 전산직 준비생에게 rule-based 분석 결과를 설명해주세요.

프로필
- 학과: ${profile.major}
- 학년: ${profile.grade}
- 목표: ${profile.career}
- 기술: ${profile.skills}
- 프로젝트/과목 근거: ${profile.projects}
- 자격증: ${profile.certificates}

점수: ${analysis.totalScore}/100
강점:
${analysis.strengths.map((item) => `- ${item}`).join("\n")}

부족 역량:
${analysis.gaps.map((item) => `- ${item}`).join("\n")}

다음 행동:
${analysis.nextActions.map((item) => `- ${item}`).join("\n")}

주의: 점수는 합격 예측이 아니라 역량 기반 준비도입니다.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "너는 공기업 전산직 취업 준비생을 돕는 커리어 분석 설명자다. 룰 기반 점수는 바꾸지 말고 설명만 한다.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) return undefined;
    const payload = await response.json();
    const summary = payload?.choices?.[0]?.message?.content;
    return typeof summary === "string" ? summary.trim() : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const shouldSave = shouldSaveAnalysis(request, body);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const activeVersion = await getActiveTranscriptVersion(user.id);

    if (!activeVersion) {
      const pendingReviewVersion = await getPendingReviewVersion(user.id);
      if (pendingReviewVersion) {
        return NextResponse.json(
          { error: "검토 중인 성적표가 있습니다. 적용 후 분석해주세요." },
          { status: 400 },
        );
      }
    }

    const [profileRows, academicRows, evidenceRows, evidenceSkillRows] = await Promise.all([
      getProfile(user.id),
      getAcademicRecords(user.id, activeVersion?.id ?? null),
      getEvidenceRecords(user.id),
      getEvidenceSkills(user.id),
    ]);

    const profile = Array.isArray(profileRows)
      ? (profileRows[0] as CareerProfileRecord | undefined)
      : undefined;

    if (!profile) {
      return NextResponse.json(
        { error: "Profile required before analysis." },
        { status: 400 },
      );
    }

    const academicRecords = Array.isArray(academicRows) ? (academicRows as AcademicRecord[]) : [];
    const effectiveGpa = resolveGpa({ activeVersion, records: academicRecords, profileGpa: profile.gpa });
    const effectiveTotalCredits = resolveTotalCredits({ activeVersion, records: academicRecords });
    // buildUserProfile은 profile.gpa를 그대로 읽으므로, active 버전의 공식 GPA를 우선 반영하려면
    // 여기서 profile 스냅샷의 gpa만 유효 GPA로 덮어써서 넘깁니다(DB의 profiles.gpa 자체는 건드리지 않음).
    const profileForAnalysis: CareerProfileRecord = { ...profile, gpa: effectiveGpa };

    const inputSnapshot = buildUserProfile({
      profile: profileForAnalysis,
      academic: academicRecords,
      evidence: Array.isArray(evidenceRows) ? (evidenceRows as EvidenceRecord[]) : [],
      confirmedSkillRows: Array.isArray(evidenceSkillRows)
        ? (evidenceSkillRows as EvidenceSkillRow[])
        : [],
    });
    const [externalPostingsResult, jobDescriptionsResult] = await Promise.allSettled([
      fetchJobPostings(inputSnapshot),
      getJobDescriptions(100),
    ]);
    const analysisWarnings: string[] = [];
    const externalPostings =
      externalPostingsResult.status === "fulfilled" ? externalPostingsResult.value : [];
    const jobDescriptions =
      jobDescriptionsResult.status === "fulfilled" ? jobDescriptionsResult.value : [];

    if (externalPostingsResult.status === "rejected") {
      console.error("[analyze-career] external job fetch failed", externalPostingsResult.reason);
      analysisWarnings.push("External job API failed during analysis.");
    }

    if (jobDescriptionsResult.status === "rejected") {
      console.error(
        "[analyze-career] Supabase job_descriptions read failed",
        jobDescriptionsResult.reason,
      );
      analysisWarnings.push("Supabase job_descriptions read failed during analysis.");
    }

    const postings = mergePostings([
      ...jobDescriptionRowsToPostings(jobDescriptions as Record<string, unknown>[]),
      ...externalPostings,
    ]);
    const baseAnalysis = analyzeCareer(inputSnapshot, postings);
    const aiSummary = shouldSave
      ? await generateOpenAISummary(inputSnapshot, baseAnalysis)
      : undefined;
    const usedDemo = postings.some((posting) => posting.sourceStatus === "DEMO");
    const warningMessages = [
      ...analysisWarnings,
      usedDemo
        ? "Job API unavailable or real job data is insufficient. Demo posting data was included."
        : "",
    ].filter(Boolean);
    const resultSnapshot: CareerAnalysis = {
      ...baseAnalysis,
      aiSummary,
      jobDataSource: usedDemo ? "demo" : "alio",
      warning: warningMessages.length ? warningMessages.join(" ") : undefined,
    };

    if (shouldSave) {
      await saveAnalysisHistory({
        user_id: user.id,
        input_profile: inputSnapshot,
        analysis_result: resultSnapshot,
        transcript_version_id: activeVersion?.id ?? null,
        cumulative_gpa: effectiveGpa,
        total_credits: effectiveTotalCredits,
        target_organizations: (profile.target_company ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
    }

    return NextResponse.json({
      ...resultSnapshot,
      persisted: shouldSave,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to analyze career profile.";
    const status = message.includes("environment variables") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
