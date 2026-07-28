import { analyzeCareer } from "@/lib/careerAgent";
import { buildUserProfile } from "@/lib/userProfileBuilder";
import type { AnalysisHistoryRow } from "@/types/career";

import { demoAcademicRecords, demoAcademicRecordsEarlier } from "./academicRecords";
import { DEMO_USER_ID } from "./config";
import { demoEvidenceRecords, demoEvidenceRecordsEarlier } from "./evidenceRecords";
import { demoJobPostings } from "./jobPostings";
import { demoProfile } from "./profile";

const earlierProfile = buildUserProfile({
  profile: demoProfile,
  academic: demoAcademicRecordsEarlier,
  evidence: demoEvidenceRecordsEarlier,
});

const currentProfile = buildUserProfile({
  profile: demoProfile,
  academic: demoAcademicRecords,
  evidence: demoEvidenceRecords,
});

// 실제 analyzeCareer()를 이전/현재 두 시점의 스냅샷에 각각 호출해 만든 결과이므로,
// 임의로 조작한 점수가 아니라 데모 데이터 기준으로 정말 계산된 값입니다.
const earlierAnalysis = analyzeCareer(earlierProfile, demoJobPostings);
const currentAnalysis = analyzeCareer(currentProfile, demoJobPostings);

export const demoAnalysisResult = currentAnalysis;

export const demoAnalysisHistory: AnalysisHistoryRow[] = [
  {
    id: "00000000-0000-4000-8000-000000000502",
    user_id: DEMO_USER_ID,
    input_snapshot: currentProfile,
    result_snapshot: currentAnalysis,
    score: currentAnalysis.totalScore,
    created_at: "2026-07-18T09:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000501",
    user_id: DEMO_USER_ID,
    input_snapshot: earlierProfile,
    result_snapshot: earlierAnalysis,
    score: earlierAnalysis.totalScore,
    created_at: "2026-03-15T09:00:00.000Z",
  },
];
