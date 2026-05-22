import { NextResponse } from "next/server";

import { analyzeCareer } from "@/lib/careerAgent";
import { fetchJobPostings } from "@/lib/jobPostings";
import {
  createClient,
  getAcademicRecords,
  getEvidenceRecords,
} from "@/lib/supabase/server";
import { isUserProfile, validateProfile } from "@/lib/validation";
import type { AcademicRecord, EvidenceRecord, UserProfile } from "@/types/career";

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

    return NextResponse.json(analyzeCareer(enrichedProfile, postings));
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze career profile" },
      { status: 500 },
    );
  }
}
