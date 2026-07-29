import { NextResponse } from "next/server";

import {
  createClient,
  getAcademicRecords,
  getActiveTranscriptVersion,
  getCurrentUserId,
  getPendingReviewVersion,
  getSemesterSummaries,
  saveAcademicRecord,
} from "@/lib/supabase/server";
import { describeSupabaseError, toMessage } from "@/lib/supabase/errors";
import { gradeToPoint, isPassFailGrade } from "@/lib/academicSummary";

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

function describeAcademicRecordError(error: unknown, fallback: string) {
  const message = toMessage(error) || fallback;
  const isDuplicateKey =
    (error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "23505") ||
    message.includes("academic_records_user_semester_course_idx");

  if (isDuplicateKey) {
    return { message: "이미 등록된 과목입니다(동일 학기·과목명).", status: 409 };
  }

  return { message, status: message.includes("environment variables") ? 503 : 500 };
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const activeVersion = await getActiveTranscriptVersion(userId);
    const [rows, semesterSummaries, pendingReviewVersion] = await Promise.all([
      getAcademicRecords(userId, activeVersion?.id ?? null),
      activeVersion ? getSemesterSummaries(userId, activeVersion.id) : Promise.resolve([]),
      getPendingReviewVersion(userId),
    ]);

    return NextResponse.json({
      data: rows,
      activeVersion: activeVersion ?? null,
      semesterSummaries,
      pendingReviewVersion: pendingReviewVersion ?? null,
    });
  } catch (error) {
    console.error("[academic-records] GET failed", error);
    const { message, status } = describeSupabaseError(error, "Failed to load academic records.");
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

    const semester = getString(body.semester);
    const grade = getString(body.grade);
    const courseCode = getString(body.course_code);
    const category = getString(body.category);

    const saved = await saveAcademicRecord({
      user_id: user.id,
      course_name: courseName,
      credit: getNumber(body.credit),
      grade,
      semester,
      skill_mapping: getSkillMapping(body.skill_mapping),
      course_code: courseCode || null,
      category: category || null,
      grade_point: gradeToPoint(grade),
      is_pass_fail: isPassFailGrade(grade),
      source: "manual",
    });

    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (error) {
    console.error("[academic-records] POST failed", error);
    const { message, status } = describeAcademicRecordError(error, "Failed to save academic record.");
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

    const grade = getString(body.grade);
    const courseCode = getString(body.course_code);
    const category = getString(body.category);

    const { data, error } = await supabase
      .from("academic_records")
      .update({
        course_name: courseName,
        credit: getNumber(body.credit),
        grade,
        semester: getString(body.semester),
        skill_mapping: getSkillMapping(body.skill_mapping),
        course_code: courseCode || null,
        category: category || null,
        grade_point: gradeToPoint(grade),
        is_pass_fail: isPassFailGrade(grade),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[academic-records] PATCH failed", error);
    const { message, status } = describeAcademicRecordError(error, "Failed to update academic record.");
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

    const searchParams = new URL(request.url).searchParams;
    const id = searchParams.get("id");
    const deleteAll = searchParams.get("all") === "true";

    if (!id && !deleteAll) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    // 전체 삭제는 id 없이 명시적으로 all=true를 보낸 요청에서만 허용합니다(잘못된 파서 결과로
    // 저장된 오염 데이터를 한 번에 정리하고 다시 업로드할 수 있도록 하는 용도).
    const query = supabase.from("academic_records").delete().eq("user_id", user.id);
    const { data, error } = await (id ? query.eq("id", id) : query).select();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[academic-records] DELETE failed", error);
    const { message, status } = describeAcademicRecordError(error, "Failed to delete academic record.");
    return NextResponse.json({ error: message }, { status });
  }
}
