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
  fitScore: number;
  strengths: string[];
  gaps: string[];
  nextActions: string[];
};
