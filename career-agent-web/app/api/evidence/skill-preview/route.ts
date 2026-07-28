import { NextResponse } from "next/server";

import { previewEvidenceSkillCandidates } from "@/lib/services/evidenceSkillService";
import { getCurrentUserId } from "@/lib/supabase/server";
import type { EvidenceRecordType } from "@/types/career";

const VALID_TYPES: readonly EvidenceRecordType[] = [
  "award",
  "project",
  "certificate",
  "hackathon",
  "study",
  "internship",
  "activity",
];

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isEvidenceRecordType(value: unknown): value is EvidenceRecordType {
  return typeof value === "string" && VALID_TYPES.includes(value as EvidenceRecordType);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !isEvidenceRecordType(body.type) || !getString(body.title)) {
    return NextResponse.json({ error: "title and type are required." }, { status: 400 });
  }

  const candidates = previewEvidenceSkillCandidates({
    title: getString(body.title),
    type: body.type,
    description: typeof body.description === "string" ? body.description : "",
    technologies: Array.isArray(body.skills) ? body.skills : getString(body.skills),
    role: typeof body.role === "string" ? body.role : "",
    implementedFeatures: typeof body.implemented_features === "string" ? body.implemented_features : "",
    problemSolved: typeof body.problem_solved === "string" ? body.problem_solved : "",
    outcome: typeof body.result === "string" ? body.result : "",
    evidenceUrl: typeof body.evidence_url === "string" ? body.evidence_url : "",
  });

  return NextResponse.json({ data: candidates });
}
