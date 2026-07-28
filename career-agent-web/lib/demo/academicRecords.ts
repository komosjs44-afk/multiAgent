import type { AcademicRecord } from "@/types/career";

import { DEMO_USER_ID } from "./config";

export const demoAcademicRecords: AcademicRecord[] = [
  {
    id: "00000000-0000-4000-8000-000000000201",
    user_id: DEMO_USER_ID,
    course_name: "데이터베이스",
    credit: 3,
    grade: "A0",
    semester: "2025-2",
    skill_mapping: ["DB", "SQL"],
    created_at: "2025-12-20T09:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    user_id: DEMO_USER_ID,
    course_name: "운영체제",
    credit: 3,
    grade: "B+",
    semester: "2025-2",
    skill_mapping: ["운영체제"],
    created_at: "2025-12-20T09:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000203",
    user_id: DEMO_USER_ID,
    course_name: "데이터통신",
    credit: 3,
    grade: "B0",
    semester: "2026-1",
    skill_mapping: ["네트워크"],
    created_at: "2026-06-15T09:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000204",
    user_id: DEMO_USER_ID,
    course_name: "정보보호개론",
    credit: 3,
    grade: "A+",
    semester: "2026-1",
    skill_mapping: ["보안"],
    created_at: "2026-06-15T09:00:00.000Z",
  },
];

// 성장 추적(분석 이력) 계산용 — "이전" 시점 스냅샷. 네트워크/보안 과목 이수 전 상태.
export const demoAcademicRecordsEarlier: AcademicRecord[] = demoAcademicRecords.slice(0, 2);
