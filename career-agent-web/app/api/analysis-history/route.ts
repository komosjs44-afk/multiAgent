import { NextResponse } from "next/server";

import {
  createClient,
  getRecentAnalysisHistory,
  saveAnalysisHistory,
} from "@/lib/supabase/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Login required to save analysis history." },
        { status: 401 },
      );
    }

    const body = await request.json();

    if (!isRecord(body) || !isRecord(body.input_profile) || !isRecord(body.analysis_result)) {
      return NextResponse.json(
        { error: "input_profile and analysis_result are required." },
        { status: 400 },
      );
    }

    const savedRows = await saveAnalysisHistory({
      user_id: user.id,
      input_profile: body.input_profile,
      analysis_result: body.analysis_result,
    });

    return NextResponse.json({ data: savedRows }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save analysis.";
    const status = message.includes("environment variables") ? 503 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ data: [] });
    }

    const rows = await getRecentAnalysisHistory(user.id);
    return NextResponse.json({ data: rows });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load analysis history.";
    const status = message.includes("environment variables") ? 503 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
