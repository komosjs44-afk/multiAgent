import { GRADE_POINTS, gradeToPoint, isPassFailGrade } from "@/lib/transcriptParser";
import type { AcademicRecord, TranscriptVersion } from "@/types/career";

export { GRADE_POINTS, gradeToPoint, isPassFailGrade };

const COURSE_CODE_LIKE = /^[A-Z]{1,5}\d{2,4}[A-Z0-9]*$/;

const CATEGORY_VALUES = new Set([
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
]);

const JUNK_EXACT_NAMES = new Set(["과목 정보", "성적 미입력", "학기 미분류"]);

const JUNK_KEYWORDS = [
  "이수학점",
  "평점평균",
  "총 취득학점",
  "환산평균",
  "누적",
  "마일리지",
  "비교과",
  "총계",
  "합계",
  "백분율",
];

/** academic_records.course_code/category 컬럼이 비어 있으면 레거시 skill_mapping에서 추론합니다. */
export function getCourseCode(record: AcademicRecord): string | undefined {
  if (record.course_code) return record.course_code;
  return record.skill_mapping.find((item) => COURSE_CODE_LIKE.test(item));
}

export function getCategory(record: AcademicRecord): string | undefined {
  if (record.category) return record.category;
  return record.skill_mapping.find((item) => CATEGORY_VALUES.has(item));
}

export type CourseAggregate = {
  /** 0학점 과목 제외 이수학점 합계 (P 과목 포함) */
  totalCredits: number;
  /** GPA 계산에 실제로 사용된 학점 합계 (P/NP·성적 미입력·0학점 제외) */
  gpaCredits: number;
  /** 학점×평점 가중 평균 (P/NP·성적 미입력 과목 제외) */
  averageGpa: number | null;
  courseCount: number;
};

export type GradeableCourse = {
  credit: number | null;
  grade: string;
  grade_point?: number | null;
};

/** 과목 목록으로부터 이수학점/평점을 계산합니다. P 과목은 이수학점에는 포함하되 GPA 계산에서는 제외합니다. */
export function computeCourseAggregate(records: GradeableCourse[]): CourseAggregate {
  let totalCredits = 0;
  let gpaCredits = 0;
  let weightedPoints = 0;

  for (const record of records) {
    const credit = record.credit ?? 0;
    if (credit > 0) {
      totalCredits += credit;
    }

    if (isPassFailGrade(record.grade) || credit <= 0) continue;

    const points = record.grade_point ?? gradeToPoint(record.grade);
    if (points != null) {
      gpaCredits += credit;
      weightedPoints += credit * points;
    }
  }

  return {
    totalCredits: Math.round(totalCredits * 100) / 100,
    gpaCredits: Math.round(gpaCredits * 100) / 100,
    averageGpa: gpaCredits > 0 ? Math.round((weightedPoints / gpaCredits) * 100) / 100 : null,
    courseCount: records.length,
  };
}

/**
 * GPA 표시 우선순위(스펙 6절): 1) active 성적표 버전의 공식 누적 GPA 2) 과목 기반 재계산값
 * 3) career profile에 저장된 GPA 4) 값이 없으면 null("-").
 */
export function resolveGpa({
  activeVersion,
  records,
  profileGpa,
}: {
  activeVersion?: TranscriptVersion | null;
  records: AcademicRecord[];
  profileGpa?: number | null;
}): number | null {
  if (activeVersion?.cumulative_gpa != null) return activeVersion.cumulative_gpa;

  const recomputed = computeCourseAggregate(records).averageGpa;
  if (recomputed != null) return recomputed;

  return profileGpa ?? null;
}

/**
 * GPA와 마찬가지로 총 취득학점도 active 버전의 공식 값을 우선 사용하고, 없으면 과목 기반으로
 * 재계산합니다.
 */
export function resolveTotalCredits({
  activeVersion,
  records,
}: {
  activeVersion?: TranscriptVersion | null;
  records: AcademicRecord[];
}): number | null {
  if (activeVersion?.total_credits != null) return activeVersion.total_credits;
  const recomputed = computeCourseAggregate(records).totalCredits;
  return recomputed > 0 ? recomputed : null;
}

export type CleanupCandidate = {
  id: string;
  reason: string;
  course_name: string;
  semester: string;
};

export type CleanupPreview = {
  totalCount: number;
  junkCount: number;
  keepCount: number;
  candidates: CleanupCandidate[];
};

function junkReasonForRow(record: AcademicRecord): string | null {
  const name = record.course_name.trim();

  if (JUNK_EXACT_NAMES.has(name)) return "과목명이 '과목 정보/성적 미입력' 등 placeholder 값";
  if (JUNK_KEYWORDS.some((keyword) => name.includes(keyword))) {
    return "이수학점/평점평균/누적 등 요약 행이 과목으로 잘못 저장됨";
  }
  if (name.length > 60) return "여러 과목 정보가 한 문자열로 합쳐진 것으로 보임";

  const credit = record.credit;
  const hasCourseCode = Boolean(getCourseCode(record));
  if ((credit == null || credit === 0) && !hasCourseCode && !record.grade.trim()) {
    return "0학점 · 과목코드 없음 · 성적 미입력 (OCR 오류로 추정)";
  }

  return null;
}

/**
 * academic_records 정리(스펙 12/13절) 판정 규칙. cleanup-preview GET과 cleanup DELETE가
 * 반드시 동일한 함수를 사용해, "미리 본 개수"와 "실제 삭제된 개수"가 항상 일치하게 합니다.
 */
export function buildCleanupPreview(records: AcademicRecord[]): CleanupPreview {
  const candidates: CleanupCandidate[] = [];
  const seenKey = new Map<string, AcademicRecord>();

  for (const record of records) {
    const reason = junkReasonForRow(record);
    if (reason) {
      candidates.push({
        id: record.id,
        reason,
        course_name: record.course_name,
        semester: record.semester,
      });
      continue;
    }

    const key = `${record.semester.trim() || "학기 미분류"}:${record.course_name.trim()}`;
    const existing = seenKey.get(key);
    if (existing) {
      // 더 오래된(먼저 생성된) 쪽을 정리 대상으로 표시하고, 최신 행을 유지합니다.
      const older = existing.created_at <= record.created_at ? existing : record;
      const newer = older === existing ? record : existing;
      seenKey.set(key, newer);
      candidates.push({
        id: older.id,
        reason: "동일 학기·과목명 중복 (최신 행만 유지)",
        course_name: older.course_name,
        semester: older.semester,
      });
    } else {
      seenKey.set(key, record);
    }
  }

  return {
    totalCount: records.length,
    junkCount: candidates.length,
    keepCount: records.length - candidates.length,
    candidates,
  };
}
