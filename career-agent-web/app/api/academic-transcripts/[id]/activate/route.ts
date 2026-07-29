import { NextResponse } from "next/server";

import { activateTranscriptVersion, createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** 검토를 마친 성적표 버전을 active로 전환합니다. 기존 active 버전은 archived로 내려갑니다. */
export async function POST(_request: Request, context: RouteContext) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const { id } = await context.params;
    const version = await activateTranscriptVersion(user.id, id);

    return NextResponse.json({ version });
  } catch (error) {
    console.error("[academic-transcripts/:id/activate] POST failed", error);
    const message = error instanceof Error ? error.message : "성적표 적용에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
