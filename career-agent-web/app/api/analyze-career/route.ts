import { NextResponse } from "next/server";

import { analyzeCareer } from "@/lib/careerAgent";
import { fetchJobPostings } from "../../../lib/jobPostings";
import {
  createClient,
  getAcademicRecords,
  getEvidenceRecords,
} from "@/lib/supabase/server";
import { isUserProfile, validateProfile } from "@/lib/validation";
import type { AcademicRecord, EvidenceRecord, JobPosting, UserProfile } from "@/types/career";

async function generateOpenAISummary(
  profile: UserProfile,
  analysis: ReturnType<typeof analyzeCareer>,
  postings: JobPosting[],
): Promise<string | undefined> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return undefined;
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
  const profileSummary = [
    `학과: ${profile.major}`,
    `학년: ${profile.grade}`,
    `목표 진로: ${profile.career}`,
    `보유 기술: ${profile.skills}`,
    `프로젝트: ${profile.projects}`,
    `자격증/시험 준비: ${profile.certificates}`,
  ]
    .filter(Boolean)
    .join("\n");

  const topCareersSummary = analysis.topCareers
    .map(
      (career) =>
        `- ${career.name}: ${career.reason} (부족 역량: ${career.missingSkills.join(", ")})`,
    )
    .join("\n");

  const prompt = `당신은 공기업 전산직 취업 준비생을 도와주는 커리어 코치입니다.
입력된 프로필과 분석 결과를 바탕으로, 아래 항목을 한국어로 간결하고 실행 가능한 요약문으로 작성하세요.

프로필:
${profileSummary}

총점: ${analysis.totalScore} / 100

강점:
${analysis.strengths.map((item) => `- ${item}`).join("\n")}

부족 역량:
${analysis.gaps.map((item) => `- ${item}`).join("\n")}

추천 학습 방향:
${analysis.nextActions.map((item) => `- ${item}`).join("\n")}

4주 루틴:
${analysis.roadmap
      .map((week) => `Week ${week.week}: ${week.title} (${week.actions.join("; ")})`)
      .join("\n")}

공고 요약:
${topCareersSummary}

요약문을 세 문단으로 구성하고, 특히 "지금 당장 해야 할 일", "보완할 핵심 역량", "지원 공고 대비 준비 우선순위"를 명확히 설명하세요.`;

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
            content: "당신은 한국 공기업 전산직 취업 준비생을 돕는 커리어 컨설턴트입니다.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    const payload = await response.json();
    const summary = payload?.choices?.[0]?.message?.content;
    return typeof summary === "string" ? summary.trim() : undefined;
  } catch {
    return undefined;
  }
}

function mergeUniqueText(left: string, rightItems: string[]) {
  const existing = left
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const merged = Array.from(new Set([...existing, ...rightItems.filter(Boolean)]));
  return merged.join(", ");
}

function appendLines(value: string, lines: string[]) {
  const cleanLines = lines.map((line) => line.trim()).filter(Boolean);
  if (!cleanLines.length) {
    return value;
  }
  return [value.trim(), ...cleanLines].filter(Boolean).join("\n");
}

async function getSavedCareerData() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { evidence: [] as EvidenceRecord[], academic: [] as AcademicRecord[] };
    }

    const [evidence, academic] = await Promise.all([
      getEvidenceRecords(user.id),
      getAcademicRecords(user.id),
    ]);

    return {
      evidence: Array.isArray(evidence) ? (evidence as EvidenceRecord[]) : [],
      academic: Array.isArray(academic) ? (academic as AcademicRecord[]) : [],
    };
  } catch {
    return { evidence: [] as EvidenceRecord[], academic: [] as AcademicRecord[] };
  }
}

function enrichProfileWithSavedData(
  profile: UserProfile,
  evidence: EvidenceRecord[],
  academic: AcademicRecord[],
): UserProfile {
  const evidenceSkills = evidence.flatMap((item) => item.skills);
  const academicSkills = academic.flatMap((item) => item.skill_mapping);
  const certificates = evidence
    .filter((item) => item.type === "certificate")
    .map((item) => item.title);
  const evidenceLines = evidence.map((item) =>
    [
      `[${item.type}] ${item.title}`,
      item.organization,
      item.role,
      item.result,
      item.evidence_text,
    ]
      .filter(Boolean)
      .join(" / "),
  );
  const academicLines = academic.map((item) =>
    `[성적] ${item.course_name} ${item.grade} ${item.semester} (${item.skill_mapping.join(", ")})`,
  );

  return {
    ...profile,
    skills: mergeUniqueText(profile.skills, [...evidenceSkills, ...academicSkills]),
    certificates: mergeUniqueText(profile.certificates, certificates),
    projects: appendLines(profile.projects, [...evidenceLines, ...academicLines]),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isUserProfile(body)) {
      return NextResponse.json(
        { error: "Invalid profile payload" },
        { status: 400 },
      );
    }

    const validation = validateProfile(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Invalid profile input", errors: validation.errors },
        { status: 400 },
      );
    }

    const savedData = await getSavedCareerData();
    const enrichedProfile = enrichProfileWithSavedData(
      body,
      savedData.evidence,
      savedData.academic,
    );
    const postings = await fetchJobPostings(enrichedProfile);
    const analysis = analyzeCareer(enrichedProfile, postings);
    const aiSummary = await generateOpenAISummary(enrichedProfile, analysis, postings);

    return NextResponse.json({
      ...analysis,
      aiSummary,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze career profile" },
      { status: 500 },
    );
  }
}
