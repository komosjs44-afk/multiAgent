import {
  ALLOWED_CREDITS,
  ALLOWED_GRADES,
  CATEGORIES,
  CATEGORY_PREFIX_PATTERN,
  COURSE_CODE_PATTERN,
  CREDIT_TOKEN_PATTERN,
  isEarnedCreditGrade,
  normalizeCategory,
  type CategoryNormalizationResult,
} from "./transcriptRules.ts";
import type {
  NormalizationChange,
  ParsedCourse,
  SemesterSummary,
  TranscriptDiagnostics,
  TranscriptMismatch,
  TranscriptPageInput,
  TranscriptParseResult,
  TranscriptSummary,
} from "./transcriptTypes";

export type {
  NormalizationChange,
  ParsedCourse,
  SemesterSummary,
  TranscriptDiagnostics,
  TranscriptMismatch,
  TranscriptPageInput,
  TranscriptParseResult,
  TranscriptSummary,
} from "./transcriptTypes";

const CATEGORY_PATTERN = `(?:${CATEGORIES.join("|")})`;
const COURSE_CODE = COURSE_CODE_PATTERN;
const ACADEMIC_TERM = /^20\d{2}-[12]$/;
/** 원문에서 "2026학년도 1학기" 류 학기 헤더를 찾는 패턴(저장용 canonical 학기 키 패턴과는 별개입니다). */
const SEMESTER_HEADER_PATTERN = /(20\d{2})\s*(?:학년도|년도|년|[-./])\s*([12])\s*학기?(?!\s*인정)/;
/** 레거시 파서 전용: 한 줄 전체를 하나의 정규식으로 강제하던 기존 행 패턴(비교 테스트용으로만 유지). */
const LEGACY_ROW_PATTERN = new RegExp(
  `^(${CATEGORY_PATTERN})\\s+(\\S+)\\s+(.+?)\\s+(\\(?\\s*-?\\.?\\d+(?:\\.\\d+)?\\s*\\)?)\\s+(\\S+)$`,
);

export const PARSER_VERSION = "transcript-parser-v4-field-detect";
export const GRADE_POINTS: Readonly<Record<string, number>> = {
  "A+": 4.5, A0: 4, "A-": 3.75, "B+": 3.5, B0: 3, "B-": 2.75,
  "C+": 2.5, C0: 2, "C-": 1.75, "D+": 1.5, D0: 1, "D-": 0.75, F: 0,
};
export const CORE_MAJOR_SUBJECTS = ["자료구조", "운영체제", "데이터베이스", "네트워크", "데이터통신", "컴퓨터구조", "논리회로", "알고리즘", "보안", "정보보안", "소프트웨어공학", "웹프로그래밍"] as const;

export function gradeToPoint(grade?: string | null): number | null {
  if (!grade) return null;
  return GRADE_POINTS[grade.trim().toUpperCase()] ?? null;
}

export function isPassFailGrade(grade?: string | null): boolean {
  return grade?.trim().toUpperCase() === "P" || grade?.trim().toUpperCase() === "NP";
}

export function semesterSortKey(semester: string): number {
  const match = semester.match(/^(\d{4})-(\d)$/);
  return match ? Number(match[1]) * 10 + Number(match[2]) : Number.MAX_SAFE_INTEGER;
}

export function compareSemesters(a: string, b: string): number {
  return semesterSortKey(a) - semesterSortKey(b);
}

export function resolveAcademicTerm(
  activeTerm: string | null | undefined,
  courseSemesters: readonly string[],
): string | null {
  const normalizedActiveTerm = activeTerm?.trim() ?? "";
  if (ACADEMIC_TERM.test(normalizedActiveTerm)) return normalizedActiveTerm;

  const validSemesters = courseSemesters
    .map((semester) => semester.trim())
    .filter((semester) => ACADEMIC_TERM.test(semester));
  return validSemesters.sort(compareSemesters).at(-1) ?? null;
}

export function normalizeTranscriptPageText(value: string): { text: string; changes: readonly NormalizationChange[] } {
  const changes: NormalizationChange[] = [];
  const lines = value.replace(/\r\n?/g, "\n").split("\n").map((source) => {
    let line = source.replace(/[ \t ]+/g, " ").trim();
    const aiSw = line.replace(/\bAI(?:[.]|\s+)SW\b/gi, "AI·SW");
    if (aiSw !== line) changes.push({ field: "text", original: line, normalized: aiSw, reason: "AI·SW 표기 통일" });
    line = aiSw;
    return line;
  });
  return { text: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim(), changes };
}

function semesterFromLine(line: string): { semester: string; original: string } | null {
  const match = line.match(SEMESTER_HEADER_PATTERN);
  return match ? { semester: `${match[1]}-${match[2]}`, original: match[0] } : null;
}

function normalizeGrade(value: string): { grade: string; changes: readonly NormalizationChange[] } {
  const original = value.trim().toUpperCase();
  const gradeCorrections: Readonly<Record<string, string>> = { AO: "A0", BO: "B0", CO: "C0", DO: "D0" };
  const grade = gradeCorrections[original] ?? original;
  return grade === original
    ? { grade, changes: [] }
    : { grade, changes: [{ field: "grade", original, normalized: grade, reason: "문자 O를 숫자 0으로 보정" }] };
}

function normalizeCredit(value: string): { credit: number | null; bracketed: boolean; changes: readonly NormalizationChange[] } {
  const original = value.trim();
  const bracketed = /^\(.*\)$/.test(original);
  const token = original.replace(/[()\s]/g, "");
  const normalized = token === "30" ? "3.0" : token.startsWith(".") ? `0${token}` : token;
  const credit = Number(normalized);
  const changes = normalized === token ? [] : [{ field: "credit", original: token, normalized, reason: token === "30" ? "학점 위치의 소수점 누락 보정" : "선행 0 보정" }];
  return { credit: Number.isFinite(credit) ? credit : null, bracketed, changes };
}

function calculateCredits(courses: readonly ParsedCourse[]): number {
  return Math.round(
    courses.reduce(
      (sum, course) =>
        sum +
        (!course.isBracketedCredit && (course.credit ?? 0) > 0 && isEarnedCreditGrade(course.grade)
          ? course.credit ?? 0
          : 0),
      0,
    ) * 100,
  ) / 100;
}

function calculateGpa(courses: readonly ParsedCourse[]): number | null {
  let credits = 0;
  let points = 0;
  for (const course of courses) {
    const credit = course.credit ?? 0;
    const point = gradeToPoint(course.grade);
    if (course.isBracketedCredit || isPassFailGrade(course.grade) || credit <= 0 || point == null) continue;
    credits += credit;
    points += credit * point;
  }
  return credits > 0 ? Math.round((points / credits) * 100) / 100 : null;
}

function extractDeclared(text: string) {
  const total = text.match(/총\s*취득학점\s*[:：]?\s*(\d+(?:\.\d+)?)/);
  const gpa = text.match(/(?:전체\s*)?평점평균\s*[:：]?\s*([0-4](?:\.\d+)?)\s*\/\s*([0-5](?:\.\d+)?)/);
  const categoryCredits: Record<string, number> = {};
  for (const match of text.matchAll(/(교양|전공|계공|일선)\s*[:：]\s*(\d+(?:\.\d+)?)/g)) categoryCredits[match[1]] = Number(match[2]);
  return { totalCredits: total ? Number(total[1]) : null, gpa: gpa ? Number(gpa[1]) : null, scale: gpa ? Number(gpa[2]) : 4.5, categoryCredits };
}

function extractSummaries(pages: readonly TranscriptPageInput[], calculatedBySemester: ReadonlyMap<string, number>): SemesterSummary[] {
  const summaries: SemesterSummary[] = [];
  for (const page of pages) {
    let semester = "학기 미분류";
    for (const line of page.text.split(/\r?\n/)) {
      const marker = semesterFromLine(line);
      if (marker) semester = marker.semester;
      const match = line.match(/이수학점\s+(\d+(?:\.\d+)?)\s*(?:평점평균\s+(\d+(?:\.\d+)?)\s*(?:\((\d+(?:\.\d+)?)\))?)?/);
      if (match) summaries.push({ semester, credits: Number(match[1]), gpa: match[2] ? Number(match[2]) : null, percentile: match[3] ? Number(match[3]) : null, calculatedCredits: calculatedBySemester.get(semester) ?? 0 });
    }
  }
  return summaries;
}

function withReason(course: ParsedCourse, reason: string): ParsedCourse {
  return { ...course, confidence: Math.min(course.confidence, 0.75), needsReview: true, reviewReasons: [...course.reviewReasons, reason] };
}

// ---------------------------------------------------------------------------
// Legacy line parser (v3) — frozen on purpose. Kept only so Parser V2's output
// can be compared against it in regression tests; production parsing no longer
// calls this path (see parseTranscriptPages below).
// ---------------------------------------------------------------------------

function parseCourseLineLegacy(line: string, semester: string, originalSemester: string | undefined, page: number, sourceLine: number): ParsedCourse | null {
  const match = line.match(LEGACY_ROW_PATTERN);
  if (!match) return null;
  const [, category, courseCode, courseNameValue, creditValue, gradeValue] = match;
  const gradeResult = normalizeGrade(gradeValue);
  const creditResult = normalizeCredit(creditValue);
  const courseName = courseNameValue.trim();
  const reviewReasons: string[] = [];
  if (!COURSE_CODE.test(courseCode)) reviewReasons.push("과목코드 형식을 확인해주세요.");
  if (creditResult.credit == null || creditResult.credit < 0 || creditResult.credit > 6) reviewReasons.push("학점 값이 비정상적입니다.");
  else if (!ALLOWED_CREDITS.has(creditResult.credit)) reviewReasons.push("일반적이지 않은 학점 값입니다.");
  if (!ALLOWED_GRADES.has(gradeResult.grade)) reviewReasons.push("허용되지 않은 성적 코드입니다.");
  if (courseName.length < 2 || courseName.length > 40) reviewReasons.push("과목명 길이를 확인해주세요.");
  if (semester === "학기 미분류") reviewReasons.push("학기를 확인하지 못했습니다.");
  const normalizationChanges = [...creditResult.changes, ...gradeResult.changes];
  if (gradeResult.changes.length) reviewReasons.push("성적 코드가 자동 보정되었습니다.");
  if (creditResult.changes.length) reviewReasons.push("학점 값이 자동 보정되었습니다.");
  const confidence = Math.max(0.2, Math.round((1 - reviewReasons.length * 0.15) * 100) / 100);
  return {
    semester, originalSemester, category, courseCode, courseName,
    credit: creditResult.credit, originalCredit: creditValue, isBracketedCredit: creditResult.bracketed,
    grade: gradeResult.grade, confidence, needsReview: reviewReasons.length > 0, reviewReasons,
    normalizationChanges, sourcePage: page, sourceLine, sourceText: line,
  };
}

/**
 * v3 파서(giant regex, 카테고리 화이트리스트 강제, 멀티라인 미지원)를 그대로 실행합니다.
 * Parser V2 회귀 비교 테스트 전용이며, 운영 경로(app/api/evidence/extract)는 사용하지 않습니다.
 */
export function parseTranscriptPagesLegacy(pages: readonly TranscriptPageInput[]): TranscriptParseResult {
  const normalizedPages = pages.map((page) => ({ page: page.page, ...normalizeTranscriptPageText(page.text) }));
  const courses: ParsedCourse[] = [];
  const unmatchedRows: string[] = [];
  const seen = new Map<string, number>();
  let semesterCount = 0;
  for (const page of normalizedPages) {
    let semester = "학기 미분류";
    let originalSemester: string | undefined;
    page.text.split("\n").forEach((line, index) => {
      const marker = semesterFromLine(line);
      if (marker) { semester = marker.semester; originalSemester = marker.original; semesterCount += 1; return; }
      const course = parseCourseLineLegacy(line, semester, originalSemester, page.page, index + 1);
      if (!course) { if (new RegExp(`^${CATEGORY_PATTERN}\\s+`).test(line)) unmatchedRows.push(line); return; }
      const key = `${course.semester}:${course.courseCode || course.courseName}`;
      const existingIndex = seen.get(key);
      if (existingIndex != null) { courses[existingIndex] = withReason(courses[existingIndex], "동일 학기 중복 과목 가능성이 있습니다."); return; }
      seen.set(key, courses.length);
      courses.push(course);
    });
  }
  return finishParseResult(normalizedPages, courses, unmatchedRows, semesterCount);
}

// ---------------------------------------------------------------------------
// Parser V2 — field detection
//
// Instead of one regex that hard-requires "카테고리 코드 과목명 학점 성적" on a
// single physical line, each field is detected independently:
//   detectCategory -> detectCourseCode -> (remainder tokens) -> detectCreditGradeTail
// This lets unknown categories and (limited) multi-line rows survive as
// review-flagged courses instead of disappearing into unmatchedRows.
// ---------------------------------------------------------------------------

/** 이수구분 후보로 인정할 "알 수 없는 한글 단어"의 모양(순수 한글 2~6자). 문장/숫자/코드 오탐 방지용. */
const UNKNOWN_CATEGORY_SHAPE_PATTERN = /^[가-힣]{2,6}$/;
/** 미확인 이수구분 뒤에 오는 토큰이 과목코드일 가능성 — 알파벳으로 시작해야 함. 카테고리 화이트리스트가 없을 때의 유일한 정밀도 방어선. */
const CODE_LIKE_SHAPE_PATTERN = /^[A-Za-z]/;

type CategoryDetection = { result: CategoryNormalizationResult; remainder: string };

function detectCategory(line: string): CategoryDetection | null {
  const trimmed = line.trim();
  const known = trimmed.match(CATEGORY_PREFIX_PATTERN);
  if (known) {
    return {
      result: normalizeCategory(known[1]),
      remainder: trimmed.slice(known[0].length).trim(),
    };
  }

  const firstTokenMatch = trimmed.match(/^(\S+)\s+(\S.*)$/);
  if (!firstTokenMatch) return null;
  const [, firstToken, rest] = firstTokenMatch;
  if (!UNKNOWN_CATEGORY_SHAPE_PATTERN.test(firstToken)) return null;
  const [nextToken] = rest.match(/^(\S+)/) ?? [];
  if (!nextToken || !CODE_LIKE_SHAPE_PATTERN.test(nextToken)) return null;
  return { result: normalizeCategory(firstToken), remainder: rest.trim() };
}

function detectCourseCode(remainder: string): { code: string; remainder: string } | null {
  const trimmed = remainder.trim();
  if (!trimmed) return null;
  const spaceIndex = trimmed.search(/\s/);
  if (spaceIndex === -1) return { code: trimmed, remainder: "" };
  return { code: trimmed.slice(0, spaceIndex), remainder: trimmed.slice(spaceIndex + 1).trim() };
}

/** "( .0)"처럼 괄호 안에 공백이 섞인 학점 표기가 하나의 토큰으로 유지되도록 미리 붙여줍니다. */
function collapseBracketSpacing(text: string): string {
  return text.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
}

function tokenize(text: string): string[] {
  const collapsed = collapseBracketSpacing(text.trim());
  return collapsed ? collapsed.split(/\s+/) : [];
}

function detectCreditGradeTail(tokens: readonly string[]): { creditRaw: string; gradeRaw: string; nameTokens: string[] } | null {
  if (tokens.length < 2) return null;
  const gradeRaw = tokens[tokens.length - 1];
  const creditRaw = tokens[tokens.length - 2];
  if (!CREDIT_TOKEN_PATTERN.test(creditRaw)) return null;
  return { creditRaw, gradeRaw, nameTokens: tokens.slice(0, -2) };
}

function buildParsedCourse({
  categoryResult,
  courseCode,
  courseNameValue,
  creditValue,
  gradeValue,
  semester,
  originalSemester,
  page,
  sourceLine,
  sourceText,
  reconstructed,
}: {
  categoryResult: CategoryNormalizationResult;
  courseCode: string;
  courseNameValue: string;
  creditValue: string;
  gradeValue: string;
  semester: string;
  originalSemester: string | undefined;
  page: number;
  sourceLine: number;
  sourceText: string;
  reconstructed: boolean;
}): ParsedCourse {
  const gradeResult = normalizeGrade(gradeValue);
  const creditResult = normalizeCredit(creditValue);
  const courseName = courseNameValue.trim();
  const reviewReasons: string[] = [];
  if (!COURSE_CODE.test(courseCode)) reviewReasons.push("과목코드 형식을 확인해주세요.");
  if (creditResult.credit == null || creditResult.credit < 0 || creditResult.credit > 6) reviewReasons.push("학점 값이 비정상적입니다.");
  else if (!ALLOWED_CREDITS.has(creditResult.credit)) reviewReasons.push("일반적이지 않은 학점 값입니다.");
  if (!ALLOWED_GRADES.has(gradeResult.grade)) reviewReasons.push("허용되지 않은 성적 코드입니다.");
  if (courseName.length < 2 || courseName.length > 40) reviewReasons.push("과목명 길이를 확인해주세요.");
  if (semester === "학기 미분류") reviewReasons.push("학기를 확인하지 못했습니다.");
  if (!categoryResult.isKnown) reviewReasons.push(`이수구분(${categoryResult.raw})을 목록에서 확인하지 못했습니다.`);
  if (reconstructed) reviewReasons.push("여러 줄에 걸친 과목 정보를 자동으로 결합했습니다.");
  const normalizationChanges = [...creditResult.changes, ...gradeResult.changes];
  if (gradeResult.changes.length) reviewReasons.push("성적 코드가 자동 보정되었습니다.");
  if (creditResult.changes.length) reviewReasons.push("학점 값이 자동 보정되었습니다.");
  const confidence = Math.max(0.2, Math.round((1 - reviewReasons.length * 0.15) * 100) / 100);
  return {
    semester,
    originalSemester,
    category: categoryResult.isKnown ? categoryResult.normalized : categoryResult.raw,
    categoryRaw: categoryResult.raw,
    categoryNormalized: categoryResult.normalized,
    courseCode,
    courseName,
    credit: creditResult.credit,
    originalCredit: creditValue,
    isBracketedCredit: creditResult.bracketed,
    grade: gradeResult.grade,
    confidence,
    needsReview: reviewReasons.length > 0,
    reviewReasons,
    normalizationChanges,
    sourcePage: page,
    sourceLine,
    sourceText,
    reconstructed,
  };
}

function parseCourseLineV2(line: string, semester: string, originalSemester: string | undefined, page: number, sourceLine: number): ParsedCourse | null {
  const categoryDetection = detectCategory(line);
  if (!categoryDetection) return null;
  const codeDetection = detectCourseCode(categoryDetection.remainder);
  if (!codeDetection) return null;
  const tail = detectCreditGradeTail(tokenize(codeDetection.remainder));
  if (!tail || tail.nameTokens.length === 0) return null;

  return buildParsedCourse({
    categoryResult: categoryDetection.result,
    courseCode: codeDetection.code,
    courseNameValue: tail.nameTokens.join(" "),
    creditValue: tail.creditRaw,
    gradeValue: tail.gradeRaw,
    semester,
    originalSemester,
    page,
    sourceLine,
    sourceText: line,
    reconstructed: false,
  });
}

/**
 * 두 물리적 행을 하나의 과목으로 복원할 수 있는지 판단합니다. 아래 두 안전한 경우에만 병합하고,
 * 그 외에는 항상 null을 반환해 두 줄이 각자 독립적으로(또는 unmatched로) 처리되게 둡니다.
 *   1) head가 이수구분+코드+과목명까지 채웠고 credit/grade만 없는 경우 → tail은 반드시 credit+grade 2토큰뿐이어야 함
 *   2) head가 이수구분+코드만 있고 과목명이 아예 없는 경우 → tail은 과목명+credit+grade를 모두 제공해야 하고,
 *      tail 자체가 별도의 이수구분으로 시작하는(=자기 완결적인 다음 과목일 가능성이 있는) 줄이면 병합하지 않음
 */
function tryReconstructCourseLine(
  headLine: string,
  tailLine: string,
  semester: string,
  originalSemester: string | undefined,
  page: number,
  headLineNumber: number,
): ParsedCourse | null {
  const categoryDetection = detectCategory(headLine);
  if (!categoryDetection) return null;
  const codeDetection = detectCourseCode(categoryDetection.remainder);
  if (!codeDetection) return null;

  const headTailTokens = tokenize(codeDetection.remainder);
  // head만으로 이미 완결된 과목이면 reconstruction 대상이 아니다 — 일반 단일 라인 경로가 처리한다.
  if (detectCreditGradeTail(headTailTokens)?.nameTokens.length) return null;

  const trimmedTail = tailLine.trim();
  if (!trimmedTail) return null;
  // tail이 자기 자신의 이수구분으로 시작하면 이어지는 행이 아니라 다음 과목이다 — 병합 금지.
  if (detectCategory(tailLine)) return null;

  const tailTokens = tokenize(trimmedTail);
  let courseNameValue: string;
  let creditRaw: string;
  let gradeRaw: string;

  if (headTailTokens.length > 0) {
    if (tailTokens.length !== 2) return null;
    const tail = detectCreditGradeTail(tailTokens);
    if (!tail) return null;
    courseNameValue = headTailTokens.join(" ");
    creditRaw = tail.creditRaw;
    gradeRaw = tail.gradeRaw;
  } else {
    const tail = detectCreditGradeTail(tailTokens);
    if (!tail || tail.nameTokens.length === 0) return null;
    courseNameValue = tail.nameTokens.join(" ");
    creditRaw = tail.creditRaw;
    gradeRaw = tail.gradeRaw;
  }

  return buildParsedCourse({
    categoryResult: categoryDetection.result,
    courseCode: codeDetection.code,
    courseNameValue,
    creditValue: creditRaw,
    gradeValue: gradeRaw,
    semester,
    originalSemester,
    page,
    sourceLine: headLineNumber,
    sourceText: `${headLine.trim()} / ${trimmedTail}`,
    reconstructed: true,
  });
}

function finishParseResult(
  normalizedPages: readonly { page: number; text: string; changes: readonly NormalizationChange[] }[],
  courses: ParsedCourse[],
  unmatchedRows: string[],
  semesterCount: number,
): TranscriptParseResult {
  const calculatedBySemester = new Map<string, number>();
  for (const course of courses) calculatedBySemester.set(course.semester, calculateCredits(courses.filter((item) => item.semester === course.semester)));
  const semesterSummaries = extractSummaries(normalizedPages, calculatedBySemester);
  const fullText = normalizedPages.map((page) => page.text).join("\n\f\n");
  const declared = extractDeclared(fullText);
  const calculatedTotalCredits = calculateCredits(courses);
  const mismatches: TranscriptMismatch[] = [];
  if (declared.totalCredits != null && Math.abs(declared.totalCredits - calculatedTotalCredits) > 0.01) mismatches.push({ code: "TOTAL_CREDIT_MISMATCH", declared: declared.totalCredits, calculated: calculatedTotalCredits, difference: Math.round((declared.totalCredits - calculatedTotalCredits) * 100) / 100 });
  for (const item of semesterSummaries) if (item.credits != null && item.calculatedCredits != null && Math.abs(item.credits - item.calculatedCredits) > 0.01) mismatches.push({ code: "SEMESTER_CREDIT_MISMATCH", semester: item.semester, declared: item.credits, calculated: item.calculatedCredits, difference: Math.round((item.credits - item.calculatedCredits) * 100) / 100 });
  if (mismatches.length) for (let index = 0; index < courses.length; index += 1) courses[index] = withReason(courses[index], "공식 학점 합계와 과목 계산 합계가 일치하지 않습니다.");
  const normalizationChanges = normalizedPages.flatMap((page) => page.changes).concat(courses.flatMap((course) => course.normalizationChanges));
  const warnings = [...(unmatchedRows.length ? [`${unmatchedRows.length}개 과목 행의 필드 순서를 확정하지 못했습니다.`] : []), ...(mismatches.length ? ["공식 학점 합계와 계산 합계가 일치하지 않습니다."] : [])];
  const reconstructedCourseCount = courses.filter((course) => course.reconstructed).length;
  const diagnostics: TranscriptDiagnostics = {
    rawTextLength: fullText.length, detectedCourseCodeCount: [...fullText.matchAll(/[A-Z]{1,5}[-]?\d{2,4}[A-Z0-9]*/g)].length,
    detectedSemesterCount: semesterCount, parsedCourseCount: courses.length, needsReviewCount: courses.filter((course) => course.needsReview).length,
    warnings, mismatches, unmatchedRows, normalizationChanges, reconstructedCourseCount,
  };
  const confidencePercent = courses.length ? Math.round(courses.reduce((sum, course) => sum + course.confidence, 0) / courses.length * 100) : 0;
  const summary: TranscriptSummary = {
    totalCredits: declared.totalCredits ?? (semesterSummaries.length ? semesterSummaries.reduce((sum, item) => sum + (item.credits ?? 0), 0) : calculatedTotalCredits || null),
    overallGpa: declared.gpa ?? calculateGpa(courses), percentile: semesterSummaries.at(-1)?.percentile ?? null,
    courseCount: courses.length, confidencePercent, declaredTotalCredits: declared.totalCredits,
    calculatedTotalCredits: calculatedTotalCredits || null, declaredGpa: declared.gpa, calculatedGpa: calculateGpa(courses),
    gpaScale: declared.scale, categoryCredits: declared.categoryCredits,
  };
  return { courses, semesterSummaries, summary, diagnostics };
}

/** Parser V2 운영 경로. app/api/evidence/extract가 호출하는 유일한 파서입니다. */
export function parseTranscriptPages(pages: readonly TranscriptPageInput[]): TranscriptParseResult {
  const normalizedPages = pages.map((page) => ({ page: page.page, ...normalizeTranscriptPageText(page.text) }));
  const courses: ParsedCourse[] = [];
  const unmatchedRows: string[] = [];
  const seen = new Map<string, number>();
  let semesterCount = 0;

  for (const page of normalizedPages) {
    let semester = "학기 미분류";
    let originalSemester: string | undefined;
    const lines = page.text.split("\n");
    let index = 0;

    const registerCourse = (course: ParsedCourse) => {
      const key = `${course.semester}:${course.courseCode || course.courseName}`;
      const existingIndex = seen.get(key);
      if (existingIndex != null) { courses[existingIndex] = withReason(courses[existingIndex], "동일 학기 중복 과목 가능성이 있습니다."); return; }
      seen.set(key, courses.length);
      courses.push(course);
    };

    while (index < lines.length) {
      const line = lines[index];
      const marker = semesterFromLine(line);
      if (marker) { semester = marker.semester; originalSemester = marker.original; semesterCount += 1; index += 1; continue; }

      const direct = parseCourseLineV2(line, semester, originalSemester, page.page, index + 1);
      if (direct) { registerCourse(direct); index += 1; continue; }

      const nextLine = lines[index + 1];
      const reconstructed = nextLine !== undefined && !semesterFromLine(nextLine)
        ? tryReconstructCourseLine(line, nextLine, semester, originalSemester, page.page, index + 1)
        : null;
      if (reconstructed) { registerCourse(reconstructed); index += 2; continue; }

      if (detectCategory(line)) unmatchedRows.push(line);
      index += 1;
    }
  }

  return finishParseResult(normalizedPages, courses, unmatchedRows, semesterCount);
}

export function parseTranscriptText(rawText: string): ParsedCourse[] {
  return [...parseTranscriptPages([{ page: 1, text: rawText }]).courses];
}

export function extractSemesterSummaries(rawText: string): SemesterSummary[] {
  return [...parseTranscriptPages([{ page: 1, text: rawText }]).semesterSummaries];
}

export function getTranscriptDiagnostics(rawText: string, parsedCourses: ParsedCourse[]): TranscriptDiagnostics {
  const result = parseTranscriptPages([{ page: 1, text: rawText }]);
  return { ...result.diagnostics, parsedCourseCount: parsedCourses.length, needsReviewCount: parsedCourses.filter((course) => course.needsReview).length };
}

export function buildTranscriptSummary(rawText: string, courses: ParsedCourse[], diagnostics: { detectedCourseCodeCount: number }): TranscriptSummary {
  const result = parseTranscriptPages([{ page: 1, text: rawText }]);
  const confidencePercent = diagnostics.detectedCourseCodeCount > 0 ? Math.min(100, Math.round(courses.length / diagnostics.detectedCourseCodeCount * 100)) : result.summary.confidencePercent;
  return { ...result.summary, courseCount: courses.length, confidencePercent };
}
