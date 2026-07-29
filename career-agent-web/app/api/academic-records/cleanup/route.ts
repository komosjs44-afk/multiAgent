import { NextResponse } from "next/server";

import { backupAndDeleteAcademicRecords, createClient, getLegacyAcademicRecords } from "@/lib/supabase/server";
import { buildCleanupPreview } from "@/lib/academicSummary";
import type { AcademicRecord } from "@/types/career";

/**
 * 버전 관리 도입 이전에 저장된 레거시 과목(transcript_version_id가 없는 행) 중 스펙 12/13절
 * 오류 규칙에 걸리는 행을 미리 보여줍니다. GET(미리보기)과 DELETE(실제 삭제)는 항상
 * buildCleanupPreview() 하나의 규칙만 사용해 "미리 본 개수"와 "삭제된 개수"가 어긋나지 않게 합니다.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const legacyRecords = (await getLegacyAcademicRecords(user.id)) as AcademicRecord[];
    const preview = buildCleanupPreview(legacyRecords);

    return NextResponse.json(preview);
  } catch (error) {
    console.error("[academic-records/cleanup] GET failed", error);
    const message = error instanceof Error ? error.message : "정리 대상을 확인하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
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

    const confirmed = new URL(request.url).searchParams.get("confirm") === "true";
    if (!confirmed) {
      return NextResponse.json({ error: "confirm=true 파라미터가 필요합니다." }, { status: 400 });
    }

    const legacyRecords = (await getLegacyAcademicRecords(user.id)) as AcademicRecord[];
    const preview = buildCleanupPreview(legacyRecords);

    if (!preview.candidates.length) {
      return NextResponse.json({ deletedCount: 0 });
    }

    const recordsById = new Map(legacyRecords.map((record) => [record.id, record]));
    const deletedCount = await backupAndDeleteAcademicRecords(
      user.id,
      preview.candidates.map((candidate) => ({
        id: candidate.id,
        reason: candidate.reason,
        row: recordsById.get(candidate.id) as unknown as Record<string, unknown>,
      })),
    );

    return NextResponse.json({ deletedCount });
  } catch (error) {
    console.error("[academic-records/cleanup] DELETE failed", error);
    const message = error instanceof Error ? error.message : "정리 삭제에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
