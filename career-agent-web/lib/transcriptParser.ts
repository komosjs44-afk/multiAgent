export type ParsedCourse = {
  semester: string;
  category?: string;
  courseCode?: string;
  courseName: string;
  credit?: number | null;
  grade?: string;
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

function findSemesterMarkers(text: string) {
  const markers = [...text.matchAll(/(20\d{2})\s*학년도\s*([12])\s*학기/g)]
    .map((match) => ({
      index: match.index ?? 0,
      semester: normalizeSemester(match[1], match[2]),
    }))
    .sort((a, b) => a.index - b.index);

  if (markers.length) return markers;

  return [...text.matchAll(/(20\d{2})\s*(?:년|[-./])\s*([12])\s*학기?/g)]
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

function parseCredit(value?: string) {
  if (!value) return null;
  const credit = Number(value.startsWith(".") ? `0${value}` : value);
  return Number.isFinite(credit) ? credit : null;
}

function addCourse(
  rows: ParsedCourse[],
  seen: Set<string>,
  course: ParsedCourse,
) {
  const courseName = cleanCourseName(course.courseName);
  if (!courseName) return;
  if (isSummaryLine(courseName)) return;
  if (courseName.length > 80) return;

  const key = [
    course.semester,
    course.courseCode ?? "",
    courseName,
  ].join(":");

  if (seen.has(key)) return;
  seen.add(key);

  rows.push({
    ...course,
    courseName,
    credit: course.credit ?? null,
  });
}

function parseForward(block: string, semester: string, rows: ParsedCourse[], seen: Set<string>) {
  const pattern = new RegExp(
    `(${CATEGORY_PATTERN})\\s+(${COURSE_CODE_PATTERN})\\s+(.+?)\\s+(\\.?\\d+(?:\\.\\d+)?)\\s+(${GRADE_PATTERN})\\b`,
    "g",
  );

  for (const match of block.matchAll(pattern)) {
    addCourse(rows, seen, {
      semester,
      category: match[1],
      courseCode: match[2],
      courseName: match[3],
      credit: parseCredit(match[4]),
      grade: match[5],
    });
  }
}

function parseBackward(block: string, semester: string, rows: ParsedCourse[], seen: Set<string>) {
  const pattern = new RegExp(
    `(.+?)\\s+(\\.?\\d+(?:\\.\\d+)?)\\s+(${GRADE_PATTERN})\\s+(${CATEGORY_PATTERN})\\s+(${COURSE_CODE_PATTERN})\\b`,
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
  parseForward(inline, semester, rows, seen);
  parseBackward(inline, semester, rows, seen);
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

  markers.forEach((marker, index) => {
    const nextIndex = markers[index + 1]?.index ?? text.length;
    parseBlock(text.slice(marker.index, nextIndex), marker.semester, rows, seen);
  });

  return rows;
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

  return {
    rawTextLength: text.length,
    detectedCourseCodeCount: courseCodeCount,
    detectedSemesterCount: semesterCount,
    parsedCourseCount: parsedCourses.length,
    warnings,
  };
}
