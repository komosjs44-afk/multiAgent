import { NextResponse } from "next/server";

import {
  createClient,
  deleteEvidenceRecord,
  getCurrentUserId,
  getEvidenceRecords,
  getEvidenceSkills,
  replaceEvidenceSkills,
  saveEvidenceRecord,
} from "@/lib/supabase/server";
import { describeSupabaseError } from "@/lib/supabase/errors";
import type {
  EvidenceRecordType,
  SkillCode,
  SkillConfidence,
  SkillContributionLevel,
  EvidenceSkillSource,
} from "@/types/career";
import { SKILL_TAXONOMY_BY_CODE } from "@/lib/skillTaxonomy";

const VALID_TYPES: readonly EvidenceRecordType[] = [
  "award",
  "project",
  "certificate",
  "hackathon",
  "study",
  "internship",
  "activity",
];

const VALID_SOURCES: readonly EvidenceSkillSource[] = ["rule", "ai", "user"];
const VALID_CONFIDENCE: readonly SkillConfidence[] = ["high", "medium", "low"];
const VALID_CONTRIBUTION: readonly SkillContributionLevel[] = ["strong", "medium", "weak"];

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(value: unknown) {
  const text = getString(value);
  return text || null;
}

function getNullableDate(value: unknown) {
  const text = getString(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function getSkills(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return getString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isEvidenceRecordType(value: unknown): value is EvidenceRecordType {
  return typeof value === "string" && VALID_TYPES.includes(value as EvidenceRecordType);
}

function isSkillCode(value: unknown): value is SkillCode {
  return typeof value === "string" && value in SKILL_TAXONOMY_BY_CODE;
}

/** 사용자가 최종 확인한 역량 후보 배열만 evidence_skills 입력 형태로 정제합니다. 형식이 틀린 항목은 조용히 무시합니다. */
function parseConfirmedSkills(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .filter((item) => isSkillCode(item.skillCode))
    .map((item) => ({
      skill_code: item.skillCode as string,
      source: VALID_SOURCES.includes(item.source as EvidenceSkillSource)
        ? (item.source as string)
        : "user",
      confidence: VALID_CONFIDENCE.includes(item.confidence as SkillConfidence)
        ? (item.confidence as string)
        : "low",
      contribution_level: VALID_CONTRIBUTION.includes(item.contributionLevel as SkillContributionLevel)
        ? (item.contributionLevel as string)
        : "weak",
      matched_keywords: Array.isArray(item.matchedKeywords)
        ? item.matchedKeywords.filter((k): k is string => typeof k === "string")
        : [],
      reason: typeof item.reason === "string" ? item.reason : null,
      is_confirmed: true,
    }));
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const [rows, skills] = await Promise.all([
      getEvidenceRecords(userId),
      getEvidenceSkills(userId),
    ]);
    return NextResponse.json({ data: rows, skills });
  } catch (error) {
    const { message, status } = describeSupabaseError(error, "Failed to load evidence.");
    return NextResponse.json({ error: message }, { status });
  }
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

    const body = (await request.json()) as Record<string, unknown>;
    const type = body.type;
    const title = getString(body.title);

    if (!isEvidenceRecordType(type)) {
      return NextResponse.json({ error: "Invalid evidence type." }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "title is required." }, { status: 400 });
    }

    const skills = getSkills(body.skills);
    const evidenceText =
      getString(body.evidence_text) ||
      [
        title,
        getString(body.organization),
        getString(body.description),
        getString(body.role),
        getString(body.result),
        skills.join(", "),
      ]
        .filter(Boolean)
        .join("\n");

    const saved = await saveEvidenceRecord({
      user_id: user.id,
      type,
      title,
      organization: getNullableString(body.organization),
      description: getNullableString(body.description),
      role: getNullableString(body.role),
      result: getNullableString(body.result),
      skills,
      evidence_text: evidenceText,
      implemented_features: getNullableString(body.implemented_features),
      problem_solved: getNullableString(body.problem_solved),
      evidence_url: getNullableString(body.evidence_url),
      started_at: getNullableDate(body.started_at),
      ended_at: getNullableDate(body.ended_at),
    });

    const newId = Array.isArray(saved) ? (saved[0] as { id?: string } | undefined)?.id : undefined;
    const confirmedSkills = parseConfirmedSkills(body.confirmedSkills);

    if (newId && confirmedSkills.length) {
      await replaceEvidenceSkills(user.id, newId, confirmedSkills);
    }

    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save evidence.";
    const status = message.includes("environment variables") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const id = getString(body.id);
    const type = body.type;
    const title = getString(body.title);

    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    if (!isEvidenceRecordType(type)) {
      return NextResponse.json({ error: "Invalid evidence type." }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "title is required." }, { status: 400 });
    }

    const skills = getSkills(body.skills);
    const evidenceText =
      getString(body.evidence_text) ||
      [
        title,
        getString(body.organization),
        getString(body.description),
        getString(body.role),
        getString(body.result),
        skills.join(", "),
      ]
        .filter(Boolean)
        .join("\n");

    const { data, error } = await supabase
      .from("evidence_records")
      .update({
        type,
        title,
        organization: getNullableString(body.organization),
        description: getNullableString(body.description),
        role: getNullableString(body.role),
        result: getNullableString(body.result),
        skills,
        evidence_text: evidenceText,
        implemented_features: getNullableString(body.implemented_features),
        problem_solved: getNullableString(body.problem_solved),
        evidence_url: getNullableString(body.evidence_url),
        started_at: getNullableDate(body.started_at),
        ended_at: getNullableDate(body.ended_at),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select();

    if (error) throw error;

    // confirmedSkills가 함께 전달된 경우에만 매핑을 교체합니다(수정 화면에서 역량 후보를 다시 확인한 경우).
    if (body.confirmedSkills !== undefined) {
      const confirmedSkills = parseConfirmedSkills(body.confirmedSkills);
      await replaceEvidenceSkills(user.id, id, confirmedSkills);
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update evidence.";
    const status = message.includes("environment variables") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    // evidence_skills는 evidence_id FK의 on delete cascade로 함께 삭제됩니다.
    const deleted = await deleteEvidenceRecord(user.id, id);
    return NextResponse.json({ data: deleted });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete evidence.";
    const status = message.includes("environment variables") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
