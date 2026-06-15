import { NextResponse } from "next/server";

import {
  createClient,
  getAcademicRecords,
  saveAcademicRecord,
} from "@/lib/supabase/server";

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(getString(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function getSkillMapping(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return getString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

    const rows = await getAcademicRecords(user.id);
    return NextResponse.json({ data: rows });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load academic records.";
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
    const courseName = getString(body.course_name);

    if (!courseName) {
      return NextResponse.json({ error: "course_name is required." }, { status: 400 });
    }

    const saved = await saveAcademicRecord({
      user_id: user.id,
      course_name: courseName,
      credit: getNumber(body.credit),
      grade: getString(body.grade),
      semester: getString(body.semester),
      skill_mapping: getSkillMapping(body.skill_mapping),
    });

    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save academic record.";
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

    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const courseName = getString(body.course_name);
    if (!courseName) {
      return NextResponse.json({ error: "course_name is required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("academic_records")
      .update({
        course_name: courseName,
        credit: getNumber(body.credit),
        grade: getString(body.grade),
        semester: getString(body.semester),
        skill_mapping: getSkillMapping(body.skill_mapping),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update academic record.";
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

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("academic_records")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete academic record.";
    const status = message.includes("environment variables") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
