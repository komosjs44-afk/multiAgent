/**
 * 성적표 파싱/저장 전 구간에서 공유하는 단일 규칙 출처입니다.
 * transcriptParser.ts(파싱), academic-transcripts/route.ts(저장 재검증), academicSummary.ts(정리 판정)가
 * 각자 같은 값을 따로 정의하던 것을 이 모듈로 모았습니다 — 값을 바꿀 곳은 여기 한 곳입니다.
 */

export const CATEGORIES = [
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
] as const;

export type Category = (typeof CATEGORIES)[number];

/** 학교마다 다르게 표기하는 이수구분을 위 canonical 값으로 정규화하기 위한 별칭 사전입니다. */
export const CATEGORY_ALIASES: Readonly<Record<string, Category>> = {
  전공선택: "전선",
  "전공 선택": "전선",
  전공필수: "전필",
  "전공 필수": "전필",
  교양필수: "교필",
  "교양 필수": "교필",
  교양선택: "교선",
  "교양 선택": "교선",
  일반선택: "일선",
  "일반 선택": "일선",
};

export const COURSE_CODE_PATTERN = /^[A-Z]{1,5}\d{2,4}[A-Z0-9]*$/;
/** 저장된 canonical 학기 키 형식(예: 2026-1). 원문에서 "2026학년도 1학기"를 감지하는 정규식과는 다릅니다. */
export const SEMESTER_KEY_PATTERN = /^20\d{2}-[12]$/;
export const ALLOWED_CREDITS = new Set([0, 0.5, 1, 2, 3]);
export const ALLOWED_GRADES = new Set([
  "A+",
  "A0",
  "B+",
  "B0",
  "C+",
  "C0",
  "D+",
  "D0",
  "F",
  "P",
  "NP",
]);
/** 학점 한 토큰의 모양(괄호/부호/소수점 허용)을 판정하는 패턴 — field detection과 검증 양쪽에서 재사용합니다. */
export const CREDIT_TOKEN_PATTERN = /^\(?\s*-?\.?\d+(?:\.\d+)?\s*\)?$/;

/**
 * 취득학점(총 취득학점) 합산에서 제외할 성적. GPA 제외 대상(P/NP, isPassFailGrade)과는 기준이 다릅니다 —
 * F/NP는 "이수했지만 학점으로 인정되지 않는" 성적이므로 GPA에는 반영되더라도(F) 또는 반영되지
 * 않더라도(NP) 취득학점 총계에는 포함하면 안 됩니다.
 */
const NON_EARNING_GRADES = new Set(["F", "NP"]);

export function isEarnedCreditGrade(grade: string | null | undefined): boolean {
  if (!grade) return false;
  return !NON_EARNING_GRADES.has(grade.trim().toUpperCase());
}

export type CategoryNormalizationResult = {
  readonly raw: string;
  readonly normalized: Category | "UNKNOWN";
  readonly isKnown: boolean;
};

const SORTED_CATEGORY_KEYS = [...CATEGORIES, ...Object.keys(CATEGORY_ALIASES)].sort(
  (a, b) => b.length - a.length,
);

/**
 * 알려진 이수구분/별칭 중 하나로 줄이 시작하는지 확인하는 패턴입니다.
 * 긴 별칭(예: "전공 선택")이 짧은 값(예: "전공")에 가려 잘못 매칭되지 않도록 길이 내림차순으로 정렬했습니다.
 */
export const CATEGORY_PREFIX_PATTERN = new RegExp(
  `^(${SORTED_CATEGORY_KEYS.map((key) => key.replace(/\s+/g, "\\s+")).join("|")})(?=\\s)`,
);

export function normalizeCategory(raw: string): CategoryNormalizationResult {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if ((CATEGORIES as readonly string[]).includes(trimmed)) {
    return { raw: trimmed, normalized: trimmed as Category, isKnown: true };
  }
  const alias = CATEGORY_ALIASES[trimmed];
  if (alias) return { raw: trimmed, normalized: alias, isKnown: true };
  return { raw: trimmed, normalized: "UNKNOWN", isKnown: false };
}
