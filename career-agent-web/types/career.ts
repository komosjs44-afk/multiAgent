export type UserProfile = {
  major: string;
  grade: string;
  career: string;
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
  created_at: string;
  updated_at: string;
};

export type JobPosting = {
  id: string;
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
};

export type JobRecommendation = {
  posting: JobPosting;
  fitScore: number;
  estimatedPassRate: number;
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
  scoreReasons: string[];
  strengths: string[];
  gaps: string[];
  nextActions: string[];
  systemRisks: Array<{
    risk: string;
    cause: string;
    mitigation: string;
  }>;
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
  fileName: string;
  extractedAt: string;
  skills: string[];
  certificates: string[];
  projects: string[];
  grade?: string;
};

export type EvidenceAnalysisDraft = {
  skills: string;
  certificates: string;
  projects: string;
};
