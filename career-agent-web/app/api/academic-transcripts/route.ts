import { NextResponse } from "next/server";

import {
  createClient,
  createTranscriptVersion,
  deleteTranscriptReviewBundle,
  getAcademicRecordsByVersion,
  getActiveTranscriptVersion,
  insertSemesterSummaries,
  insertTranscriptCourses,
} from "@/lib/supabase/server";
import { computeCourseAggregate, gradeToPoint, isPassFailGrade } from "@/lib/academicSummary";
import {
  persistTranscriptBundle,
  resolveConfirmedTranscriptGpa,
} from "@/lib/transcriptSaveContract";
import { isMissingSchemaError } from "@/lib/supabase/errors";
import { PARSER_VERSION, resolveAcademicTerm } from "@/lib/transcriptParser";
import {
  ALLOWED_CREDITS,
  ALLOWED_GRADES,
  COURSE_CODE_PATTERN,
  SEMESTER_KEY_PATTERN,
} from "@/lib/transcriptRules";
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

function getCourseValidationError(course: ReturnType<typeof normalizeCourse>) {
  if (!SEMESTER_KEY_PATTERN.test(course.semester)) return `${course.courseName}: 학기 형식은 YYYY-1 또는 YYYY-2여야 합니다.`;
  if (!COURSE_CODE_PATTERN.test(course.courseCode)) return `${course.courseName}: 과목코드 형식을 확인해주세요.`;
  if (course.credit == null || !ALLOWED_CREDITS.has(course.credit)) return `${course.courseName}: 허용되지 않은 학점입니다.`;
  if (!ALLOWED_GRADES.has(course.grade)) return `${course.courseName}: 허용되지 않은 성적 코드입니다.`;
  if (course.needsReview) return `${course.courseName}: 검토 완료되지 않은 과목입니다.`;
  return null;
}

function findDuplicateCourse(courses: readonly ReturnType<typeof normalizeCourse>[]) {
  const seen = new Set<string>();
  for (const course of courses) {
    const key = `${course.semester}:${course.courseCode || course.courseName.toLowerCase()}`;
    if (seen.has(key)) return course;
    seen.add(key);
  }
  return null;
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
        declaredGpa?: unknown;
        calculatedGpa?: unknown;
        gpaScale?: unknown;
      } | null;
      semesterSummaries?: IncomingSemesterSummary[];
      declaredGpa?: unknown;
      calculatedGpa?: unknown;
      confirmedGpa?: unknown;
      gpaScale?: unknown;
    };

    const normalizedCourses = (body.courses ?? []).map(normalizeCourse);
    const duplicateCourse = findDuplicateCourse(normalizedCourses);
    if (duplicateCourse) {
      return NextResponse.json(
        { error: `${duplicateCourse.courseName}: 동일 학기 중복 과목을 정리해주세요.` },
        { status: 400 },
      );
    }
    const courses = dedupeCourses(normalizedCourses);

    if (!courses.length) {
      return NextResponse.json({ error: "저장할 과목이 없습니다." }, { status: 400 });
    }
    const courseValidationError = courses.map(getCourseValidationError).find(Boolean);
    if (courseValidationError) {
      return NextResponse.json({ error: courseValidationError }, { status: 400 });
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
    const cumulativeGpa = resolveConfirmedTranscriptGpa({
      confirmedGpa: getNumberOrNull(body.confirmedGpa),
      declaredGpa: getNumberOrNull(body.declaredGpa ?? body.summary?.declaredGpa),
      summaryOverallGpa,
      calculatedGpa: getNumberOrNull(body.calculatedGpa ?? body.summary?.calculatedGpa),
      aggregateGpa: aggregate.averageGpa,
    });
    const gpaScale = getNumberOrNull(body.gpaScale ?? body.summary?.gpaScale) ?? 4.5;
    if (cumulativeGpa == null || cumulativeGpa < 0 || cumulativeGpa > gpaScale) {
      return NextResponse.json({ error: "최종 확인 GPA가 평점 만점 범위를 벗어났습니다." }, { status: 400 });
    }
    if (gpaScale <= 0 || gpaScale > 5) {
      return NextResponse.json({ error: "평점 만점은 0보다 크고 5 이하여야 합니다." }, { status: 400 });
    }
    const percentile = getNumberOrNull(body.summary?.percentile);
    const confidencePercent = getNumberOrNull(body.summary?.confidencePercent);

    const academicTerm =
      resolveAcademicTerm(
        getString(body.academicTerm),
        courses.map((course) => course.semester),
      ) ?? "";

    const activeVersion = await getActiveTranscriptVersion(user.id);
    const previousCourses = activeVersion
      ? await getAcademicRecordsByVersion(user.id, activeVersion.id)
      : [];

    const semesterGroups = new Map<string, ReturnType<typeof normalizeCourse>[]>();
    for (const course of courses) {
      const list = semesterGroups.get(course.semester) ?? [];
      list.push(course);
      semesterGroups.set(course.semester, list);
    }

    const version = await persistTranscriptBundle({
      createVersion: () =>
        createTranscriptVersion({
          user_id: user.id,
          file_name: getString(body.fileName),
          academic_term: academicTerm,
          total_credits: totalCredits,
          cumulative_gpa: cumulativeGpa,
          gpa_scale: gpaScale,
          percentile,
          total_course_count: courses.length,
          parser_version: PARSER_VERSION,
          source_type: "pdf",
        }),
      insertCourses: (createdVersion) =>
        insertTranscriptCourses(
          courses.map((course) => ({
            user_id: user.id,
            course_name: course.courseName,
            credit: course.credit,
            grade: course.grade,
            semester: course.semester,
            skill_mapping: [course.category, course.courseCode, course.courseName].filter(Boolean),
            transcript_version_id: createdVersion.id,
            course_code: course.courseCode || null,
            category: course.category || null,
            grade_point: gradeToPoint(course.grade),
            is_pass_fail: isPassFailGrade(course.grade),
            extraction_confidence: confidencePercent,
            requires_review: course.needsReview,
            source: "pdf" as const,
          })),
        ),
      insertSemesterSummaries: (createdVersion) =>
        insertSemesterSummaries(
          Array.from(semesterGroups.entries()).map(([semester, semesterCourses]) => {
            const official = officialSemesterSummaries.get(semester);
            const computed = computeCourseAggregate(
              semesterCourses.map((course) => ({ credit: course.credit, grade: course.grade })),
            );
            return {
              user_id: user.id,
              transcript_version_id: createdVersion.id,
              semester,
              earned_credits: official?.credits ?? (computed.totalCredits > 0 ? computed.totalCredits : null),
              gpa_credits: computed.gpaCredits > 0 ? computed.gpaCredits : null,
              semester_gpa: official?.gpa ?? computed.averageGpa,
              percentile: official?.percentile ?? null,
              course_count: semesterCourses.length,
            };
          }),
        ),
      cleanup: (createdVersion) =>
        deleteTranscriptReviewBundle(user.id, createdVersion.id),
    });

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
