import { NextResponse } from "next/server";

import {
  createClient,
  createTranscriptVersion,
  getAcademicRecordsByVersion,
  getActiveTranscriptVersion,
  insertSemesterSummaries,
  insertTranscriptCourses,
} from "@/lib/supabase/server";
import { computeCourseAggregate, gradeToPoint, isPassFailGrade } from "@/lib/academicSummary";
import { isMissingSchemaError } from "@/lib/supabase/errors";
import { PARSER_VERSION, compareSemesters } from "@/lib/transcriptParser";
import type { AcademicRecord, TranscriptDiff } from "@/types/career";

// "과목 정보" 같은 placeholder나 빈 과목명은 최종 저장 단계에서도 한 번 더 걸러냅니다
// (미리보기 화면에서 사용자가 수동으로 추가/수정한 행도 같은 기준을 통과해야 하므로).
const JUNK_NAMES = new Set(["과목 정보", "성적 미입력", "학기 미분류"]);

type IncomingCourse = {
  semester?: unknown;
  category?: unknown;
  courseCode?: unknown;
  courseName?: unknown;
  credit?: unknown;
  grade?: unknown;
  needsReview?: unknown;
};

type IncomingSemesterSummary = {
  semester?: unknown;
  credits?: unknown;
  gpa?: unknown;
  percentile?: unknown;
};

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumberOrNull(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCourse(input: IncomingCourse) {
  const semester = getString(input.semester) || "학기 미분류";
  const courseName = getString(input.courseName);
  const category = getString(input.category);
  const courseCode = getString(input.courseCode);
  const grade = getString(input.grade);
  const credit = getNumberOrNull(input.credit);

  return {
    semester,
    courseName,
    category,
    courseCode,
    grade,
    credit,
    needsReview: Boolean(input.needsReview),
  };
}

function dedupeCourses(courses: ReturnType<typeof normalizeCourse>[]) {
  const seen = new Set<string>();
  return courses.filter((course) => {
    if (!course.courseName || JUNK_NAMES.has(course.courseName)) return false;
    const key = `${course.semester}:${course.courseName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function courseMatchKey(courseCode: string | null | undefined, courseName: string, semester: string) {
  const normalizedName = courseName.trim().toLowerCase();
  return `${semester}:${courseCode?.trim() || normalizedName}`;
}

/** 새 버전과 기존 active 버전을 (학기, 과목코드 우선 아니면 정규화된 과목명) 기준으로 비교합니다. */
function buildDiff({
  previousVersion,
  previousCourses,
  newCourses,
  newTotalCredits,
  newCumulativeGpa,
}: {
  previousVersion: { cumulative_gpa: number | null; total_credits: number | null } | null;
  previousCourses: AcademicRecord[];
  newCourses: ReturnType<typeof normalizeCourse>[];
  newTotalCredits: number | null;
  newCumulativeGpa: number | null;
}): TranscriptDiff {
  const previousMap = new Map(
    previousCourses.map((course) => [
      courseMatchKey(course.course_code, course.course_name, course.semester),
      course,
    ]),
  );
  const matchedPreviousKeys = new Set<string>();

  let addedCount = 0;
  let changedCount = 0;

  for (const course of newCourses) {
    const key = courseMatchKey(course.courseCode, course.courseName, course.semester);
    const previous = previousMap.get(key);
    if (!previous) {
      addedCount += 1;
      continue;
    }
    matchedPreviousKeys.add(key);
    const creditChanged = (previous.credit ?? null) !== (course.credit ?? null);
    const gradeChanged = (previous.grade || "").trim() !== course.grade.trim();
    if (creditChanged || gradeChanged) changedCount += 1;
  }

  const removedCount = previousCourses.filter(
    (course) => !matchedPreviousKeys.has(courseMatchKey(course.course_code, course.course_name, course.semester)),
  ).length;

  return {
    addedCount,
    changedCount,
    removedCount,
    previousGpa: previousVersion?.cumulative_gpa ?? null,
    newGpa: newCumulativeGpa,
    previousCredits: previousVersion?.total_credits ?? null,
    newCredits: newTotalCredits,
  };
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

    const body = (await request.json()) as {
      fileName?: unknown;
      academicTerm?: unknown;
      courses?: IncomingCourse[];
      summary?: {
        totalCredits?: unknown;
        overallGpa?: unknown;
        percentile?: unknown;
        confidencePercent?: unknown;
      } | null;
      semesterSummaries?: IncomingSemesterSummary[];
    };

    const courses = dedupeCourses((body.courses ?? []).map(normalizeCourse));

    if (!courses.length) {
      return NextResponse.json({ error: "저장할 과목이 없습니다." }, { status: 400 });
    }

    const officialSemesterSummaries = new Map(
      (body.semesterSummaries ?? []).map((item) => [
        getString(item.semester),
        {
          credits: getNumberOrNull(item.credits),
          gpa: getNumberOrNull(item.gpa),
          percentile: getNumberOrNull(item.percentile),
        },
      ]),
    );

    const aggregate = computeCourseAggregate(
      courses.map((course) => ({ credit: course.credit, grade: course.grade })),
    );

    const summaryTotalCredits = getNumberOrNull(body.summary?.totalCredits);
    const summaryOverallGpa = getNumberOrNull(body.summary?.overallGpa);
    const totalCredits = summaryTotalCredits ?? (aggregate.totalCredits > 0 ? aggregate.totalCredits : null);
    const cumulativeGpa = summaryOverallGpa ?? aggregate.averageGpa;
    const percentile = getNumberOrNull(body.summary?.percentile);
    const confidencePercent = getNumberOrNull(body.summary?.confidencePercent);

    const academicTerm =
      getString(body.academicTerm) ||
      courses.reduce((latest, course) => {
        if (!latest) return course.semester;
        return compareSemesters(course.semester, latest) > 0 ? course.semester : latest;
      }, "");

    const activeVersion = await getActiveTranscriptVersion(user.id);
    const previousCourses = activeVersion
      ? await getAcademicRecordsByVersion(user.id, activeVersion.id)
      : [];

    const version = await createTranscriptVersion({
      user_id: user.id,
      file_name: getString(body.fileName),
      academic_term: academicTerm,
      total_credits: totalCredits,
      cumulative_gpa: cumulativeGpa,
      percentile,
      total_course_count: courses.length,
      parser_version: PARSER_VERSION,
      source_type: "pdf",
    });

    await insertTranscriptCourses(
      courses.map((course) => ({
        user_id: user.id,
        course_name: course.courseName,
        credit: course.credit,
        grade: course.grade,
        semester: course.semester,
        skill_mapping: [course.category, course.courseCode, course.courseName].filter(Boolean),
        transcript_version_id: version.id,
        course_code: course.courseCode || null,
        category: course.category || null,
        grade_point: gradeToPoint(course.grade),
        is_pass_fail: isPassFailGrade(course.grade),
        extraction_confidence: confidencePercent,
        requires_review: course.needsReview,
        source: "pdf" as const,
      })),
    );

    const semesterGroups = new Map<string, ReturnType<typeof normalizeCourse>[]>();
    for (const course of courses) {
      const list = semesterGroups.get(course.semester) ?? [];
      list.push(course);
      semesterGroups.set(course.semester, list);
    }

    await insertSemesterSummaries(
      Array.from(semesterGroups.entries()).map(([semester, semesterCourses]) => {
        const official = officialSemesterSummaries.get(semester);
        const computed = computeCourseAggregate(
          semesterCourses.map((course) => ({ credit: course.credit, grade: course.grade })),
        );
        return {
          user_id: user.id,
          transcript_version_id: version.id,
          semester,
          earned_credits: official?.credits ?? (computed.totalCredits > 0 ? computed.totalCredits : null),
          gpa_credits: computed.gpaCredits > 0 ? computed.gpaCredits : null,
          semester_gpa: official?.gpa ?? computed.averageGpa,
          percentile: official?.percentile ?? null,
          course_count: semesterCourses.length,
        };
      }),
    );

    const diff = buildDiff({
      previousVersion: activeVersion,
      previousCourses,
      newCourses: courses,
      newTotalCredits: totalCredits,
      newCumulativeGpa: cumulativeGpa,
    });

    return NextResponse.json({ version, diff }, { status: 201 });
  } catch (error) {
    console.error("[academic-transcripts] POST failed", error);
    if (isMissingSchemaError(error)) {
      return NextResponse.json(
        {
          error:
            "성적표 버전 관리용 DB 마이그레이션이 아직 적용되지 않았습니다. supabase/migrations/20260729_001_transcript_versions.sql을 Supabase SQL 편집기에서 먼저 실행해주세요.",
        },
        { status: 503 },
      );
    }
    const message = error instanceof Error ? error.message : "성적표 저장에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
