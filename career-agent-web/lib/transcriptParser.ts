export type ParsedCourse = {
  semester: string;
  category?: string;
  courseCode?: string;
  courseName: string;
  credit?: number | null;
  grade?: string;
  /** 필드 일부가 비어 있거나 이름이 비정상적으로 짧은/긴 경우 등 검토가 필요할 때 true */
  needsReview?: boolean;
};

export type SemesterSummary = {
  semester: string;
  credits: number | null;
  gpa: number | null;
  percentile: number | null;
};

export type TranscriptSummary = {
  totalCredits: number | null;
  /** 학기별 이수학점 가중평균. 별도의 총계 문구가 있으면 그 값을 우선 사용합니다. */
  overallGpa: number | null;
  percentile: number | null;
  courseCount: number;
  /** 감지된 과목 코드 대비 정상 파싱된 과목 비율 기반 추정치입니다. 실제 OCR 정확도를 보장하지 않습니다. */
  confidencePercent: number;
};

const CATEGORY_VALUES = [
  "교필",
  "교선",
  "계공",
  "전공",
  "전필",
  "전선",
  "일선",
  "기전",
  "복수",
  "부전",
  "마전",
  "교양",
  "전기",
];
const CATEGORY_PATTERN = `(?:${CATEGORY_VALUES.join("|")})`;
const COURSE_CODE_PATTERN = "[A-Z]{1,5}\\d{2,4}[A-Z0-9]*";
const GRADE_PATTERN = "(?:A\\+|A0|A-|B\\+|B0|B-|C\\+|C0|C-|D\\+|D0|D-|F|P|NP)";
// 괄호로 감싼 0학점 표기("( .0)")도 허용합니다. 캡처된 값은 parseCredit()에서 숫자만 남깁니다.
const CREDIT_TOKEN = "\\(?\\s*\\.?\\d+(?:\\.\\d+)?\\s*\\)?";
const UNCATEGORIZED_SEMESTER = "학기 미분류";
const SUMMARY_KEYWORDS = [
  "이수학점",
  "평점평균",
  "총 취득학점",
  "환산평균",
  "누적",
  "마일리지",
  "비교과",
  "교양:",
  "전공:",
  "복수:",
  "부전공:",
  "일선:",
  "총계",
  "합계",
];

// 이 파서 로직의 버전 식별자. academic_transcript_versions.parser_version에 저장되어
// 나중에 파서를 바꿨을 때 어떤 버전으로 파싱된 데이터인지 구분할 수 있게 합니다.
export const PARSER_VERSION = "transcript-parser-v2";

// 4.5 만점 기준 등급→평점 환산표. P/NP(이수/미이수)는 이 표에 없으므로 GPA 계산에서 자연히 제외됩니다.
export const GRADE_POINTS: Record<string, number> = {
  "A+": 4.5,
  A0: 4.0,
  "A-": 3.75,
  "B+": 3.5,
  B0: 3.0,
  "B-": 2.75,
  "C+": 2.5,
  C0: 2.0,
  "C-": 1.75,
  "D+": 1.5,
  D0: 1.0,
  "D-": 0.75,
  F: 0,
};

export function gradeToPoint(grade?: string | null): number | null {
  if (!grade) return null;
  const points = GRADE_POINTS[grade.trim().toUpperCase()];
  return points != null ? points : null;
}

export function isPassFailGrade(grade?: string | null): boolean {
  const normalized = grade?.trim().toUpperCase() ?? "";
  return normalized === "P" || normalized === "NP";
}

export const CORE_MAJOR_SUBJECTS = [
  "자료구조",
  "운영체제",
  "데이터베이스",
  "네트워크",
  "데이터통신",
  "컴퓨터구조",
  "논리회로",
  "알고리즘",
  "보안",
  "정보보안",
  "소프트웨어공학",
  "웹프로그래밍",
];

function normalizeText(value: string) {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

function normalizeInline(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSemester(year: string, term: string) {
  return `${year}-${term}`;
}

/** "YYYY-N" 형태 학기 문자열의 정렬 키. 형식이 아니면 맨 뒤로 보냅니다("학기 미분류" 등). */
export function semesterSortKey(semester: string): number {
  const match = semester.match(/^(\d{4})-(\d)$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 10 + Number(match[2]);
}

/** 오름차순 비교자(과거 → 최신). 내림차순이 필요하면 부호를 뒤집어 사용하세요. */
export function compareSemesters(a: string, b: string): number {
  return semesterSortKey(a) - semesterSortKey(b);
}

// "OO학년도 N학기 인정"(비교과 프로그램 인정 내역)은 실제 학기 헤더가 아니므로 제외합니다.
function findSemesterMarkers(text: string) {
  const markers = [...text.matchAll(/(20\d{2})\s*학년도\s*([12])\s*학기(?!\s*인정)/g)]
    .map((match) => ({
      index: match.index ?? 0,
      semester: normalizeSemester(match[1], match[2]),
    }))
    .sort((a, b) => a.index - b.index);

  if (markers.length) return markers;

  return [...text.matchAll(/(20\d{2})\s*(?:년|[-./])\s*([12])\s*학기?(?!\s*인정)/g)]
    .map((match) => ({
      index: match.index ?? 0,
      semester: normalizeSemester(match[1], match[2]),
    }))
    .sort((a, b) => a.index - b.index);
}

function isSummaryLine(value: string) {
  return SUMMARY_KEYWORDS.some((keyword) => value.includes(keyword));
}

function cleanCourseName(value: string) {
  return normalizeInline(value)
    .replace(new RegExp(`\\b${COURSE_CODE_PATTERN}\\b`, "g"), "")
    .replace(new RegExp(`\\b${CATEGORY_PATTERN}\\b`, "g"), "")
    .replace(/이수학점.*$/g, "")
    .replace(/평점평균.*$/g, "")
    .replace(/총 취득학점.*$/g, "")
    .replace(/환산평균.*$/g, "")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .trim();
}

/** 과목명처럼 보이지 않는 조각(숫자만, 기호만, 지나치게 짧은/긴 문자열 등)을 걸러냅니다. */
function looksLikeCourseName(value: string) {
  if (!value) return false;
  if (value.length < 2 || value.length > 40) return false;
  // 한글 음절 또는 2자 이상 이어지는 라틴 문자가 최소 하나는 있어야 합니다.
  if (!/[가-힣]/.test(value) && !/[A-Za-z]{2,}/.test(value)) return false;
  // 여러 행이 뭉친 흔적(문장 중간에 학기/이수구분 키워드가 다시 등장) 방어.
  if (isSummaryLine(value)) return false;
  if (/\d{3,}/.test(value)) return false;
  return true;
}

function parseCredit(value?: string) {
  if (!value) return null;
  const digits = value.replace(/[^\d.]/g, "");
  if (!digits) return null;
  const credit = Number(digits.startsWith(".") ? `0${digits}` : digits);
  return Number.isFinite(credit) ? credit : null;
}

function addCourse(rows: ParsedCourse[], seen: Set<string>, course: ParsedCourse) {
  const courseName = cleanCourseName(course.courseName);
  if (!looksLikeCourseName(courseName)) return;

  // (학기, 과목명) 기준으로 중복을 제거합니다. 과목코드가 잘못 붙는 경우에도 이 기준으로 걸러집니다.
  const key = `${course.semester}:${courseName}`;
  if (seen.has(key)) return;
  seen.add(key);

  const credit = course.credit ?? null;
  const grade = course.grade?.trim() || undefined;
  rows.push({
    ...course,
    courseName,
    credit,
    grade,
    needsReview: credit == null && !grade,
  });
}

function parseForward(block: string, semester: string, rows: ParsedCourse[], seen: Set<string>) {
  const pattern = new RegExp(
    `(${CATEGORY_PATTERN})\\s+(${COURSE_CODE_PATTERN})\\s+(.+?)\\s+(${CREDIT_TOKEN})\\s+(${GRADE_PATTERN})(?=\\s|$)`,
    "g",
  );
  let matchCount = 0;

  for (const match of block.matchAll(pattern)) {
    matchCount += 1;
    addCourse(rows, seen, {
      semester,
      category: match[1],
      courseCode: match[2],
      courseName: match[3],
      credit: parseCredit(match[4]),
      grade: match[5],
    });
  }

  return matchCount;
}

function parseBackward(block: string, semester: string, rows: ParsedCourse[], seen: Set<string>) {
  const pattern = new RegExp(
    `(.+?)\\s+(${CREDIT_TOKEN})\\s+(${GRADE_PATTERN})\\s+(${CATEGORY_PATTERN})\\s+(${COURSE_CODE_PATTERN})(?=\\s|$)`,
    "g",
  );

  for (const match of block.matchAll(pattern)) {
    addCourse(rows, seen, {
      semester,
      category: match[4],
      courseCode: match[5],
      courseName: match[1],
      credit: parseCredit(match[2]),
      grade: match[3],
    });
  }
}

function parseBlock(block: string, semester: string, rows: ParsedCourse[], seen: Set<string>) {
  const inline = normalizeInline(block);
  const forwardMatches = parseForward(inline, semester, rows, seen);

  // 이 학교/양식이 "이름 학점 성적 이수구분 과목코드" 순서로 인쇄되는 경우를 위한 대비책입니다.
  // forward 패턴이 이 블록에서 하나도 못 찾았을 때만 시도합니다 — 두 패턴을 항상 같이 돌리면
  // 같은 줄이 서로 다른 과목코드로 두 번 잡히는 문제가 있었습니다.
  if (forwardMatches === 0) {
    parseBackward(inline, semester, rows, seen);
  }
}

export function parseTranscriptText(rawText: string): ParsedCourse[] {
  const text = normalizeText(rawText);
  const rows: ParsedCourse[] = [];
  const seen = new Set<string>();
  const markers = findSemesterMarkers(text);

  if (!markers.length) {
    parseBlock(text, UNCATEGORIZED_SEMESTER, rows, seen);
    return rows;
  }

  // 첫 학기 마커 이전(입학 전 특별교육 등)에도 과목이 있을 수 있어 별도 블록으로 취급합니다.
  if (markers[0].index > 0) {
    const prelude = text.slice(0, markers[0].index);
    if (new RegExp(COURSE_CODE_PATTERN).test(prelude)) {
      parseBlock(prelude, UNCATEGORIZED_SEMESTER, rows, seen);
    }
  }

  markers.forEach((marker, index) => {
    const nextIndex = markers[index + 1]?.index ?? text.length;
    parseBlock(text.slice(marker.index, nextIndex), marker.semester, rows, seen);
  });

  return rows;
}

/** 학기별 "이수학점 X 평점평균 Y(Z)" 요약 줄을 추출합니다. */
export function extractSemesterSummaries(rawText: string): SemesterSummary[] {
  const text = normalizeText(rawText);
  const markers = findSemesterMarkers(text);
  const summaries: SemesterSummary[] = [];
  const pattern = /이수학점\s+(\d+(?:\.\d+)?)\s*(?:평점평균\s+(\d+(?:\.\d+)?)\s*\((\d+(?:\.\d+)?)\))?/;

  markers.forEach((marker, index) => {
    const nextIndex = markers[index + 1]?.index ?? text.length;
    const block = normalizeInline(text.slice(marker.index, nextIndex));
    const match = block.match(pattern);
    if (!match) return;

    summaries.push({
      semester: marker.semester,
      credits: Number.isFinite(Number(match[1])) ? Number(match[1]) : null,
      gpa: match[2] && Number.isFinite(Number(match[2])) ? Number(match[2]) : null,
      percentile: match[3] && Number.isFinite(Number(match[3])) ? Number(match[3]) : null,
    });
  });

  return summaries;
}

/** 학기별 요약을 학점 가중 평균으로 합산해 전체 요약을 만듭니다(PDF에 총계 줄이 없어도 계산 가능). */
export function buildTranscriptSummary(
  rawText: string,
  courses: ParsedCourse[],
  diagnostics: { detectedCourseCodeCount: number },
): TranscriptSummary {
  const semesterSummaries = extractSemesterSummaries(rawText);
  const withGpa = semesterSummaries.filter((s) => s.credits != null && s.gpa != null);
  const withPercentile = semesterSummaries.filter((s) => s.credits != null && s.percentile != null);

  const totalCredits = semesterSummaries.length
    ? semesterSummaries.reduce((sum, s) => sum + (s.credits ?? 0), 0)
    : null;

  const weightedGpaSum = withGpa.reduce((sum, s) => sum + (s.credits ?? 0) * (s.gpa ?? 0), 0);
  const weightedGpaCredits = withGpa.reduce((sum, s) => sum + (s.credits ?? 0), 0);
  const overallGpa = weightedGpaCredits > 0 ? Math.round((weightedGpaSum / weightedGpaCredits) * 100) / 100 : null;

  const weightedPercentileSum = withPercentile.reduce((sum, s) => sum + (s.credits ?? 0) * (s.percentile ?? 0), 0);
  const weightedPercentileCredits = withPercentile.reduce((sum, s) => sum + (s.credits ?? 0), 0);
  const percentile =
    weightedPercentileCredits > 0
      ? Math.round((weightedPercentileSum / weightedPercentileCredits) * 100) / 100
      : null;

  const confidencePercent =
    diagnostics.detectedCourseCodeCount > 0
      ? Math.min(100, Math.round((courses.length / diagnostics.detectedCourseCodeCount) * 100))
      : courses.length > 0
        ? 100
        : 0;

  return {
    totalCredits,
    overallGpa,
    percentile,
    courseCount: courses.length,
    confidencePercent,
  };
}

export function getTranscriptDiagnostics(rawText: string, parsedCourses: ParsedCourse[]) {
  const text = normalizeText(rawText);
  const courseCodeCount = [...text.matchAll(new RegExp(`\\b${COURSE_CODE_PATTERN}\\b`, "g"))].length;
  const semesterCount = findSemesterMarkers(text).length;
  const warnings: string[] = [];

  if (text.length < 30) {
    warnings.push("PDF에서 텍스트를 거의 읽지 못했습니다. 스캔본이면 OCR 처리가 필요합니다.");
  }

  if (courseCodeCount > 0 && parsedCourses.length === 0) {
    warnings.push("과목 코드는 감지했지만 과목명/학점/성적 조합을 분리하지 못했습니다. 미리보기에서 직접 수정해주세요.");
  }

  if (semesterCount === 0) {
    warnings.push("학기 구분을 찾지 못해 일부 과목이 '학기 미분류'로 표시될 수 있습니다.");
  }

  const needsReviewCount = parsedCourses.filter((course) => course.needsReview).length;
  if (needsReviewCount > 0) {
    warnings.push(`${needsReviewCount}개 과목은 학점 또는 성적을 확인하지 못해 직접 입력이 필요합니다.`);
  }

  return {
    rawTextLength: text.length,
    detectedCourseCodeCount: courseCodeCount,
    detectedSemesterCount: semesterCount,
    parsedCourseCount: parsedCourses.length,
    needsReviewCount,
    warnings,
  };
}
