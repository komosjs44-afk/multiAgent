export type NormalizationChange = {
  readonly field: string;
  readonly original: string;
  readonly normalized: string;
  readonly reason: string;
};

export type ParsedCourse = {
  readonly semester: string;
  readonly originalSemester?: string;
  readonly category?: string;
  /** 원문에서 감지된 이수구분 표기(별칭 정규화 전 원본). */
  readonly categoryRaw?: string;
  /** 정규화된 canonical 이수구분, 목록에 없으면 "UNKNOWN". */
  readonly categoryNormalized?: string;
  readonly courseCode?: string;
  readonly courseName: string;
  readonly credit?: number | null;
  readonly originalCredit?: string;
  readonly isBracketedCredit?: boolean;
  readonly grade?: string;
  readonly confidence: number;
  readonly needsReview: boolean;
  readonly reviewReasons: readonly string[];
  readonly normalizationChanges: readonly NormalizationChange[];
  readonly sourcePage: number;
  readonly sourceLine: number;
  readonly sourceText: string;
  /** 인접한 두 물리적 행을 하나의 과목으로 자동 결합해 만든 행이면 true. */
  readonly reconstructed?: boolean;
};

export type SemesterSummary = {
  readonly semester: string;
  readonly credits: number | null;
  readonly gpa: number | null;
  readonly percentile: number | null;
  readonly calculatedCredits?: number | null;
};

export type TranscriptMismatch = {
  readonly code: "TOTAL_CREDIT_MISMATCH" | "SEMESTER_CREDIT_MISMATCH";
  readonly declared: number;
  readonly calculated: number;
  readonly difference: number;
  readonly semester?: string;
};

export type TranscriptSummary = {
  readonly totalCredits: number | null;
  readonly overallGpa: number | null;
  readonly percentile: number | null;
  readonly courseCount: number;
  readonly confidencePercent: number;
  readonly declaredTotalCredits: number | null;
  readonly calculatedTotalCredits: number | null;
  readonly declaredGpa: number | null;
  readonly calculatedGpa: number | null;
  readonly gpaScale: number;
  readonly categoryCredits: Readonly<Record<string, number>>;
};

export type TranscriptDiagnostics = {
  readonly rawTextLength: number;
  readonly detectedCourseCodeCount: number;
  readonly detectedSemesterCount: number;
  readonly parsedCourseCount: number;
  readonly needsReviewCount: number;
  readonly warnings: readonly string[];
  readonly mismatches: readonly TranscriptMismatch[];
  readonly unmatchedRows: readonly string[];
  readonly normalizationChanges: readonly NormalizationChange[];
  /** 인접한 두 줄을 자동 결합해 복원한 과목 수. */
  readonly reconstructedCourseCount?: number;
};

export type TranscriptPageInput = {
  readonly page: number;
  readonly text: string;
};

export type TranscriptParseResult = {
  readonly courses: readonly ParsedCourse[];
  readonly semesterSummaries: readonly SemesterSummary[];
  readonly summary: TranscriptSummary;
  readonly diagnostics: TranscriptDiagnostics;
};
