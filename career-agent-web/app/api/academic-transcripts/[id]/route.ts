import { NextResponse } from "next/server";

import {
  createClient,
  getAcademicRecordsByVersion,
  getSemesterSummaries,
  getTranscriptVersion,
} from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** 새로고침 후 검토를 이어갈 수 있도록 review/active 버전 상세와 소속 과목을 반환합니다. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const { id } = await context.params;
    const version = await getTranscriptVersion(user.id, id);

    if (!version) {
      return NextResponse.json({ error: "성적표 버전을 찾을 수 없습니다." }, { status: 404 });
    }

    const [records, semesterSummaries] = await Promise.all([
      getAcademicRecordsByVersion(user.id, id),
      getSemesterSummaries(user.id, id),
    ]);

    return NextResponse.json({ version, records, semesterSummaries });
  } catch (error) {
    console.error("[academic-transcripts/:id] GET failed", error);
    const message = error instanceof Error ? error.message : "성적표 버전을 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
