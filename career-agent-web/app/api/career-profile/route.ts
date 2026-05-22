import { NextResponse } from "next/server";

import { createClient, getProfile, upsertProfile } from "@/lib/supabase/server";

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

    const rows = await getProfile(user.id);
    return NextResponse.json({ data: Array.isArray(rows) ? rows[0] ?? null : null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load profile.";
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
    const saved = await upsertProfile({
      user_id: user.id,
      name: getString(body.name),
      university: getString(body.university),
      major: getString(body.major),
      grade: getString(body.grade),
      target_career: getString(body.target_career),
    });

    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save profile.";
    const status = message.includes("environment variables") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
