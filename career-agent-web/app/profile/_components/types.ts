export type WizardExperience = {
  id: string;
  type: string;
  title: string;
  role: string;
  skills: string;
  description: string;
  result: string;
};

export type ProfileWizardState = {
  step: number;
  // Step 1
  grade: string;
  university: string;
  major: string;
  gpa: string;
  // Step 2
  targetCompanyType: string;
  targetCompany: string;
  targetJob: string;
  // Step 3
  selectedSubjects: string[];
  selectedCertifications: string[];
  languageScore: string;
  // Step 4
  experiences: WizardExperience[];
  // Step 5
  extractedCourses: string[];
};

export const INITIAL_STATE: ProfileWizardState = {
  step: 1,
  grade: "",
  university: "",
  major: "",
  gpa: "",
  targetCompanyType: "교통/공항 공기업",
  targetCompany: "인천국제공항공사",
  targetJob: "전산직",
  selectedSubjects: [],
  selectedCertifications: [],
  languageScore: "",
  experiences: [],
  extractedCourses: [],
};
