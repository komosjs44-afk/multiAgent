export type UserProfile = {
  major: string;
  grade: string;
  career: string;
  skills: string;
  projects: string;
  certificates: string;
};

export type CareerAnalysis = {
  recommendedCareer: string;
  totalScore: number;
  scoreItems: {
    majorFit: number;
    techStack: number;
    projectExperience: number;
    certificates: number;
    careerClarity: number;
    actionability: number;
  };
  scoreReasons: string[];
  strengths: string[];
  gaps: string[];
  nextActions: string[];
};

export type ValidationResult = {
  isValid: boolean;
  errors: Partial<Record<keyof UserProfile, string>>;
};

export type AnalysisHistoryRow = {
  id: string;
  user_id: string | null;
  input_profile: UserProfile;
  analysis_result: CareerAnalysis;
  created_at: string;
};
