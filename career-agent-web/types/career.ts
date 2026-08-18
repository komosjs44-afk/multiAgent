export type UserProfile = {
  major: string;
  grade: string;
  career: string;
  targetCompany?: string;
  targetCompanyType?: string;
  skills: string;
  projects: string;
  certificates: string;
};

export type CareerProfileRecord = {
  id: string;
  user_id: string;
  name: string;
  university: string;
  major: string;
  grade: string;
  gpa: number | null;
  target_company_type: string;
  target_company: string;
  target_job: string;
  target_career: string;
  created_at: string;
  updated_at: string;
};

export type AcademicRecord = {
  id: string;
  user_id: string;
  course_name: string;
  credit: number | null;
  grade: string;
  semester: string;
  skill_mapping: string[];
  created_at: string;
  transcript_version_id?: string | null;
  course_code?: string | null;
  category?: string | null;
  grade_point?: number | null;
  is_pass_fail?: boolean;
  extraction_confidence?: number | null;
  requires_review?: boolean;
  source?: "pdf" | "manual";
};

export type TranscriptVersionStatus = "parsing" | "review" | "active" | "archived" | "failed";

export type TranscriptVersion = {
  id: string;
  user_id: string;
  file_name: string;
  uploaded_at: string;
  academic_term: string;
  total_credits: number | null;
  cumulative_gpa: number | null;
  gpa_scale: number;
  percentile: number | null;
  total_course_count: number;
  status: TranscriptVersionStatus;
  is_active: boolean;
  parser_version: string | null;
  source_type: "pdf" | "manual";
  created_at: string;
  updated_at: string;
};

export type SemesterSummaryRecord = {
  id: string;
  user_id: string;
  transcript_version_id: string;
  semester: string;
  earned_credits: number | null;
  gpa_credits: number | null;
  semester_gpa: number | null;
  percentile: number | null;
  course_count: number;
  created_at: string;
};

export type TranscriptDiff = {
  addedCount: number;
  changedCount: number;
  removedCount: number;
  previousGpa: number | null;
  newGpa: number | null;
  previousCredits: number | null;
  newCredits: number | null;
};

export type EvidenceRecordType =
  | "award"
  | "project"
  | "certificate"
  | "hackathon"
  | "study"
  | "internship"
  | "activity";

export type EvidenceRecord = {
  id: string;
  user_id: string;
  type: EvidenceRecordType;
  title: string;
  organization: string | null;
  description: string | null;
  role: string | null;
  result: string | null;
  skills: string[];
  evidence_text: string;
  implemented_features: string | null;
  problem_solved: string | null;
  evidence_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SkillCode =
  | "programming"
  | "web_development"
  | "api_design"
  | "database"
  | "operating_system"
  | "network"
  | "security"
  | "data_analysis"
  | "ai_ml"
  | "cloud"
  | "system_operation"
  | "problem_solving"
  | "collaboration"
  | "documentation"
  | "communication";

export type SkillConfidence = "high" | "medium" | "low";
export type SkillContributionLevel = "strong" | "medium" | "weak";
export type EvidenceSkillSource = "rule" | "ai" | "user";

export type EvidenceSkillCandidate = {
  skillCode: SkillCode;
  contributionLevel: SkillContributionLevel;
  confidence: SkillConfidence;
  matchedKeywords: string[];
  reason: string;
  source: EvidenceSkillSource;
};

export type EvidenceSkillRow = {
  id: string;
  user_id: string;
  evidence_id: string;
  skill_code: SkillCode;
  source: EvidenceSkillSource;
  confidence: SkillConfidence;
  contribution_level: SkillContributionLevel;
  matched_keywords: string[];
  reason: string | null;
  is_confirmed: boolean;
  created_at: string;
  updated_at: string;
};

export type JobPosting = {
  id: string;
  recommendationId?: string;
  title: string;
  organization: string;
  source: string;
  sourceStatus: "DEMO" | "LIVE";
  url?: string;
  deadline?: string;
  location?: string;
  employmentType?: string;
  description: string;
  rawText: string;
  requiredSkills: string[];
  preferredCertificates: string[];
  requiredExperience?: string;
  /** ISO timestamp of when this posting data was actually fetched (or, for fallback data, when it was last known-good). */
  fetchedAt?: string;
  /** true if this posting came from a fallback tier (cache or demo data), not a live API response. */
  isFallback?: boolean;
  /** true if this posting is static demo/sample data, not real collected data. */
  isDemo?: boolean;
};

export type JobRecommendation = {
  posting: JobPosting;
  fitScore: number;
  estimatedPassRate: number;
  scoreBreakdown: {
    academic: number;
    certificate: number;
    project: number;
    skills: number;
    preference: number;
    penalty: number;
    total: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  recommendedCertificates: string[];
  boostRoutine: string[];
  expectedProblems: Array<{
    problem: string;
    impact: string;
    solution: string;
  }>;
};

export type JobRecommendationSource = {
  type: "supabase" | "alio";
  label: "직무기술서 기반" | "실시간 채용공고";
  confidence: number;
};

export type JobRecommendationResponseItem = {
  id: string;
  recommendationId: string;
  companyName: string;
  title: string;
  region: string | null;
  deadline: string | null;
  source: JobRecommendationSource;
  fitScore: number;
  scoreBreakdown: JobRecommendation["scoreBreakdown"];
  matchedKeywords: string[];
  reason: string;
  recruitUrl: string | null;
  isTargetCompanyMatch: boolean;
  requiredSkills: string[];
  missingSkills: string[];
  recommendedCertificates: string[];
  boostRoutine: string[];
  fetchedAt?: string;
  isFallback?: boolean;
  isDemo?: boolean;
};

export type JobRecommendationMeta = {
  sourceCounts: {
    supabaseJobDescriptions: number;
    supabaseRawRows: number;
    alioRawJobs: number;
    alioFilteredJobs: number;
    alioReturnedJobs: number;
    mergedCandidates: number;
    deduplicatedCandidates: number;
    filteredCandidates: number;
    finalRecommendations: number;
    duplicatedRecommendationIds: string[];
  };
  debug: Record<string, unknown>;
  warnings: string[];
};

export type JobRecommendationsApiResponse =
  | {
      ok: true;
      data: {
        recommendations: JobRecommendationResponseItem[];
        topRecommendations: JobRecommendationResponseItem[];
        otherRelevantJobs: JobRecommendationResponseItem[];
      };
      meta: JobRecommendationMeta;
    }
  | {
      ok: false;
      error: {
        code: "LOGIN_REQUIRED" | "PROFILE_REQUIRED" | "NO_JOB_MATCH_FOUND" | "JOB_RECOMMENDATION_FAILED";
        message: string;
        hint?: string;
      };
      meta?: Partial<JobRecommendationMeta>;
    };

export type JobDescriptionRecord = {
  id: string;
  company_name: string;
  title: string;
  target_job: string | null;
  description: string;
  required_skills: string[] | null;
  preferred_certificates: string[] | null;
  source_url: string | null;
  created_at: string;
};

export type JobFitResult = {
  jobDescription: JobDescriptionRecord;
  fitScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchedCertificates: string[];
  missingCertificates: string[];
  reasons: string[];
  preparationActions: string[];
};

export type CareerAnalysis = {
  recommendedCareer: string;
  totalScore: number;
  scoreItems: {
    majorFit: number;
    techStack: number;
    projectExperience: number;
    contestExperience: number;
    certificates: number;
    careerClarity: number;
    actionability: number;
  };
  scoreDetails: Array<{
    key: keyof CareerAnalysis["scoreItems"];
    label: string;
    score: number;
    maxScore: number;
    status: "good" | "watch" | "needsWork";
    reason: string;
    nextStep: string;
  }>;
  topCareers: Array<{
    name: string;
    fitScore: number;
    reason: string;
    missingSkills: string[];
    recommendedActions: string[];
  }>;
  jobRecommendations: JobRecommendation[];
  roadmap: Array<{
    week: number;
    title: string;
    actions: string[];
  }>;
  aiSummary?: string;
  scoreReasons: string[];
  strengths: string[];
  gaps: string[];
  nextActions: string[];
  systemRisks: Array<{
    risk: string;
    cause: string;
    mitigation: string;
  }>;
  jobDataSource?: "alio" | "env_api" | "job_alio_html" | "demo";
  warning?: string;
};

export type ValidationResult = {
  isValid: boolean;
  errors: Partial<Record<keyof UserProfile, string>>;
};

export type AnalysisHistoryRow = {
  id: string;
  user_id: string | null;
  input_profile?: UserProfile;
  analysis_result?: CareerAnalysis;
  input_snapshot?: UserProfile;
  result_snapshot?: CareerAnalysis;
  score?: number;
  created_at: string;
};

export type EvidenceDocumentType =
  | "transcript"
  | "contest"
  | "certificate"
  | "portfolio";

export type EvidenceDocument = {
  id: string;
  fileName: string;
  docType: EvidenceDocumentType;
  file: File;
};

export type ExtractedEvidence = {
  documentType: EvidenceDocumentType;
  type?: EvidenceDocumentType;
  fileName: string;
  extractedAt: string;
  skills: string[];
  certificates: string[];
  projects: string[];
  courses?: Array<{
    courseName: string;
    courseCode?: string;
    category?: string;
    categoryRaw?: string;
    categoryNormalized?: string;
    credit?: number | null;
    originalCredit?: string;
    isBracketedCredit?: boolean;
    grade?: string;
    semester?: string;
    originalSemester?: string;
    skillMapping: string[];
    confidence?: number;
    needsReview?: boolean;
    reviewReasons?: string[];
    normalizationChanges?: Array<{
      field: string;
      original: string;
      normalized: string;
      reason: string;
    }>;
    sourcePage?: number;
    sourceLine?: number;
    sourceText?: string;
  }>;
  grade?: string;
  extractionMethod?: "pdf-text" | "ocr";
  originalText?: string;
  normalizedText?: string;
  pages?: Array<{
    page: number;
    text: string;
  }>;
  pageCount?: number;
  diagnostics?: {
    rawTextLength: number;
    detectedCourseCodeCount: number;
    detectedSemesterCount: number;
    parsedCourseCount: number;
    needsReviewCount?: number;
    warnings: string[];
    mismatches?: Array<{
      code: "TOTAL_CREDIT_MISMATCH" | "SEMESTER_CREDIT_MISMATCH";
      semester?: string;
      declared: number;
      calculated: number;
      difference: number;
    }>;
    unmatchedRows?: string[];
    normalizationChanges?: Array<{
      field: string;
      original: string;
      normalized: string;
      reason: string;
    }>;
  };
  /** PDF에서 읽거나 계산해 낸 학업 요약. 값이 없으면 표시하지 않습니다. */
  summary?: {
    totalCredits: number | null;
    overallGpa: number | null;
    percentile: number | null;
    courseCount: number;
    confidencePercent: number;
    declaredTotalCredits?: number | null;
    calculatedTotalCredits?: number | null;
    declaredGpa?: number | null;
    calculatedGpa?: number | null;
    gpaScale?: number;
    categoryCredits?: Readonly<Record<string, number>>;
  };
  /** PDF에서 읽은 학기별 "이수학점 X 평점평균 Y(Z)" 요약. 성적표 버전 저장 시 학기별 요약에 우선 사용됩니다. */
  semesterSummaries?: Array<{
    semester: string;
    credits: number | null;
    gpa: number | null;
    percentile: number | null;
    calculatedCredits?: number | null;
  }>;
  warning?: string;
};

export type EvidenceAnalysisDraft = {
  skills: string;
  certificates: string;
  projects: string;
};
