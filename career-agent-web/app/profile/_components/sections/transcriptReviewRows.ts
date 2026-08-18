import type { AcademicRecord, ExtractedEvidence } from "@/types/career";
import { computeCourseAggregate } from "@/lib/academicSummary";
import type { TranscriptRow } from "./TranscriptCourseEditor";

function rowKey(index: number) {
  return `row-${Date.now()}-${index}`;
}

const FIELD_LABELS: Readonly<Record<string, string>> = {
  semester: "이수학기",
  category: "이수구분",
  courseCode: "과목코드",
  courseName: "과목명",
  credit: "학점",
  grade: "성적",
};

export function emptyTranscriptRow(semester = ""): TranscriptRow {
  return {
    id: rowKey(0),
    semester,
    category: "",
    courseCode: "",
    courseName: "",
    credit: "",
    grade: "",
    needsReview: true,
    reviewReasons: ["직접 추가한 과목입니다. 모든 필드를 확인해주세요."],
    normalizationChanges: [],
    modifiedFields: [],
  };
}

export function rowsFromExtraction(
  courses: NonNullable<ExtractedEvidence["courses"]>,
): TranscriptRow[] {
  return courses.map((course, index) => ({
    id: rowKey(index),
    semester: course.semester || "학기 미분류",
    category: course.category ?? "",
    courseCode: course.courseCode ?? "",
    courseName: course.courseName,
    credit: course.credit == null ? "" : String(course.credit),
    grade: course.grade ?? "",
    needsReview: course.needsReview ?? false,
    reviewReasons: course.reviewReasons ?? [],
    normalizationChanges: course.normalizationChanges ?? [],
    sourcePage: course.sourcePage,
    sourceLine: course.sourceLine,
    sourceText: course.sourceText,
    isBracketedCredit: course.isBracketedCredit,
    modifiedFields: [],
  }));
}

export function rowsFromRecords(records: readonly AcademicRecord[]): TranscriptRow[] {
  return records.map((record, index) => ({
    id: rowKey(index),
    semester: record.semester,
    category: record.category ?? "",
    courseCode: record.course_code ?? "",
    courseName: record.course_name,
    credit: record.credit == null ? "" : String(record.credit),
    grade: record.grade ?? "",
    needsReview: record.requires_review ?? false,
    reviewReasons: record.requires_review
      ? ["저장 전에 검토가 필요하다고 표시된 과목입니다."]
      : [],
    normalizationChanges: [],
    modifiedFields: [],
  }));
}

export function updateTranscriptRowFields(
  rows: readonly TranscriptRow[],
  id: string,
  patch: Partial<TranscriptRow>,
): TranscriptRow[] {
  return rows.map((row) => {
    if (row.id !== id) return row;
    const changedLabels = Object.keys(patch)
      .map((field) => FIELD_LABELS[field])
      .filter((label): label is string => Boolean(label));
    return {
      ...row,
      ...patch,
      modifiedFields: Array.from(new Set([...row.modifiedFields, ...changedLabels])),
    };
  });
}

export function buildEditableTranscriptSummary(
  base: ExtractedEvidence["summary"],
  rows: readonly TranscriptRow[],
): ExtractedEvidence["summary"] {
  const editableRows = rows.filter((row) => row.courseName.trim());
  const aggregate = computeCourseAggregate(
    editableRows.map((row) => {
      const parsedCredit = Number(row.credit);
      return {
        credit:
          row.isBracketedCredit || !row.credit.trim() || !Number.isFinite(parsedCredit)
            ? null
            : parsedCredit,
        grade: row.grade,
      };
    }),
  );

  if (!base && editableRows.length === 0) return undefined;

  return {
    totalCredits: base?.totalCredits ?? aggregate.totalCredits,
    overallGpa: base?.overallGpa ?? aggregate.averageGpa,
    percentile: base?.percentile ?? null,
    courseCount: aggregate.courseCount,
    confidencePercent: base?.confidencePercent ?? 0,
    declaredTotalCredits: base?.declaredTotalCredits ?? null,
    calculatedTotalCredits: aggregate.totalCredits,
    declaredGpa: base?.declaredGpa ?? null,
    calculatedGpa: aggregate.averageGpa,
    gpaScale: base?.gpaScale ?? 4.5,
  };
}
