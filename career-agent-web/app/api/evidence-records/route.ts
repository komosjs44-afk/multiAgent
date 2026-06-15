import { NextResponse } from "next/server";

import {
  createClient,
  deleteEvidenceRecord,
  getEvidenceRecords,
  saveEvidenceRecord,
} from "@/lib/supabase/server";
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

function getNullableString(value: unknown) {
  const text = getString(value);
  return text || null;
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

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const rows = await getEvidenceRecords(user.id);
    return NextResponse.json({ data: rows });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load evidence.";
    const status = message.includes("environment variables") ? 503 : 500;
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
    });

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
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select();

    if (error) throw error;
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

    const deleted = await deleteEvidenceRecord(user.id, id);
    return NextResponse.json({ data: deleted });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete evidence.";
    const status = message.includes("environment variables") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
