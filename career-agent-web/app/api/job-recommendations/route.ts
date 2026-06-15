import { NextResponse } from "next/server";

import { getJobRecommendations } from "@/lib/services/jobRecommendationService";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "LOGIN_REQUIRED",
          message: "로그인이 필요합니다.",
        },
      },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const queryLimit = Number(url.searchParams.get("limit"));
  const body = await request.json().catch(() => ({}));
  const bodyLimit = typeof body?.limit === "number" ? body.limit : undefined;

  const result = await getJobRecommendations(user.id, bodyLimit ?? queryLimit);
  const status = result.ok ? 200 : result.error.code === "NO_JOB_MATCH_FOUND" ? 404 : 500;

  return NextResponse.json(result, { status });
}
