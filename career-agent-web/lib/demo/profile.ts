import type { CareerProfileRecord } from "@/types/career";

import { DEMO_USER_ID, DEMO_USER_NAME } from "./config";

export const demoProfile: CareerProfileRecord = {
  id: "00000000-0000-4000-8000-000000000101",
  user_id: DEMO_USER_ID,
  name: DEMO_USER_NAME,
  university: "데모대학교",
  major: "컴퓨터공학과",
  grade: "4",
  gpa: 3.6,
  target_company_type: "공단·준정부",
  target_company: "한국전력공사",
  target_job: "전산/ICT",
  target_career: "한국전력공사 전산/ICT",
  created_at: "2026-02-01T09:00:00.000Z",
  updated_at: "2026-07-18T09:00:00.000Z",
};
