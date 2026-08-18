import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  DEMO_USER_ID,
  demoAcademicRecords,
  demoEvidenceRecords,
  demoAnalysisHistory,
  demoJobDescriptions,
  demoProfile,
  isDemoMode,
} from "@/lib/demo";
import { isMissingSchemaError } from "@/lib/supabase/errors";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components에서는 쿠키를 설정할 수 없음; Route Handler/Server Action만 가능
        }
      },
    },
  });
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * 데모 모드에서는 실제 Supabase 세션 없이 고정 데모 사용자로 취급합니다.
 * 데모 모드가 아니면 기존과 동일하게 Supabase 세션에서 로그인 사용자를 조회합니다.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (isDemoMode()) {
    return DEMO_USER_ID;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

type AnalysisHistoryInput = {
  input_profile: unknown;
  analysis_result: unknown;
  user_id?: string | null;
  transcript_version_id?: string | null;
  cumulative_gpa?: number | null;
  total_credits?: number | null;
  target_organizations?: string[];
};

type ProfilePatch = Partial<{
  name: string;
  university: string;
  major: string;
  grade: string;
  gpa: number | null;
  target_company_type: string;
  target_company: string;
  target_job: string;
  target_career: string;
}>;

function isMissingProfilesColumnError(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return false;
  }

  const message = String((error as { message?: unknown }).message ?? "");
  return (
    message.includes("schema cache") &&
    message.includes("profiles") &&
    (message.includes("gpa") ||
      message.includes("target_company_type") ||
      message.includes("target_company") ||
      message.includes("target_job"))
  );
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return (error as { code?: unknown }).code === "23505";
}

/** 구버전 스키마(gpa/target_* 컬럼 없음) 대응용 — patch에서 legacy 컬럼만 남깁니다. */
function toLegacyProfilePatch(patch: ProfilePatch) {
  const legacy: Record<string, unknown> = {};
  if ("name" in patch) legacy.name = patch.name;
  if ("university" in patch) legacy.university = patch.university;
  if ("major" in patch) legacy.major = patch.major;
  if ("grade" in patch) legacy.grade = patch.grade;
  if ("target_career" in patch || "target_job" in patch) {
    legacy.target_career = patch.target_career || patch.target_job || "공기업 전산직";
  }
  return legacy;
}

/**
 * 요청에 포함된 필드만 UPDATE로 직접 반영합니다. 기존 행 전체를 읽어와 병합한 뒤
 * 다시 쓰는 방식이 아니므로(read-modify-write가 없으므로), 동시에 다른 필드를 저장하는
 * 다른 요청과 경쟁해도 서로의 값을 되돌리지 않습니다. 아직 프로필 행이 없는 최초
 * 사용자에 한해서만 INSERT로 새 행을 만듭니다.
 */
export async function savePartialProfile(userId: string, patch: ProfilePatch) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  if (Object.keys(patch).length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...patch, updated_at: now })
      .eq("user_id", userId)
      .select();

    if (error && isMissingProfilesColumnError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("profiles")
        .update({ ...toLegacyProfilePatch(patch), updated_at: now })
        .eq("user_id", userId)
        .select();
      if (legacyError) throw new Error(legacyError.message);
      if (legacyData && legacyData.length > 0) return legacyData;
    } else if (error) {
      throw new Error(error.message);
    } else if (data && data.length > 0) {
      return data;
    }
  }

  // UPDATE가 0행에 적용됨 = 아직 프로필 행이 없는 최초 사용자. INSERT로 생성합니다.
  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({ user_id: userId, ...patch, updated_at: now })
    .select();

  if (!insertError) return inserted;

  if (isUniqueViolation(insertError)) {
    // 그 사이 동시 요청이 먼저 행을 만들었다면 UPDATE로 재시도합니다.
    const { data: retried, error: retryError } = await supabase
      .from("profiles")
      .update({ ...patch, updated_at: now })
      .eq("user_id", userId)
      .select();
    if (retryError) throw new Error(retryError.message);
    return retried;
  }

  if (isMissingProfilesColumnError(insertError)) {
    const { data: legacyInserted, error: legacyInsertError } = await supabase
      .from("profiles")
      .insert({ user_id: userId, ...toLegacyProfilePatch(patch), updated_at: now })
      .select();
    if (legacyInsertError) throw new Error(legacyInsertError.message);
    return legacyInserted;
  }

  throw new Error(insertError.message);
}

type AcademicRecordInput = {
  user_id: string;
  course_name: string;
  credit: number | null;
  grade: string;
  semester: string;
  skill_mapping: string[];
  transcript_version_id?: string | null;
  course_code?: string | null;
  category?: string | null;
  grade_point?: number | null;
  is_pass_fail?: boolean;
  extraction_confidence?: number | null;
  requires_review?: boolean;
  source?: "pdf" | "manual";
};

type TranscriptVersionInput = {
  user_id: string;
  file_name: string;
  academic_term: string;
  total_credits: number | null;
  cumulative_gpa: number | null;
  gpa_scale: number;
  percentile: number | null;
  total_course_count: number;
  parser_version: string | null;
  source_type: "pdf" | "manual";
};

type SemesterSummaryInput = {
  user_id: string;
  transcript_version_id: string;
  semester: string;
  earned_credits: number | null;
  gpa_credits: number | null;
  semester_gpa: number | null;
  percentile: number | null;
  course_count: number;
};

type EvidenceRecordInput = {
  user_id: string;
  type: string;
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
};

type EvidenceSkillInput = {
  skill_code: string;
  source: string;
  confidence: string;
  contribution_level: string;
  matched_keywords: string[];
  reason: string | null;
  is_confirmed: boolean;
};

export async function getJobDescriptions(limit = 50) {
  const safeLimit = Math.max(1, Math.min(limit, 100));

  if (isDemoMode()) {
    return demoJobDescriptions.slice(0, safeLimit);
  }

  const supabase = createAdminClient() ?? (await createClient());
  const { data, error } = await supabase
    .from("job_descriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    console.error("[supabase] failed to read public.job_descriptions", error);
    throw error;
  }
  return data;
}

export function hasSupabaseServiceRoleKey() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function saveAnalysisHistory(input: AnalysisHistoryInput) {
  if (!input.user_id) {
    throw new Error("user_id is required to save analysis history.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("career_analysis_history")
    .insert({
      user_id: input.user_id,
      input_snapshot: input.input_profile,
      result_snapshot: input.analysis_result,
      transcript_version_id: input.transcript_version_id ?? null,
      cumulative_gpa: input.cumulative_gpa ?? null,
      total_credits: input.total_credits ?? null,
      target_organizations: input.target_organizations ?? [],
      score:
        typeof input.analysis_result === "object" &&
        input.analysis_result &&
        "totalScore" in input.analysis_result &&
        typeof input.analysis_result.totalScore === "number"
          ? input.analysis_result.totalScore
          : 0,
    })
    .select();

  if (error) throw error;
  return data;
}

export async function getRecentAnalysisHistory(userId: string, limit = 10) {
  const safeLimit = Math.max(1, Math.min(limit, 50));

  if (isDemoMode()) {
    return demoAnalysisHistory.slice(0, safeLimit);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("career_analysis_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data;
}

export async function getProfile(userId: string) {
  if (isDemoMode()) {
    return [demoProfile];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .limit(1);

  if (error) throw error;
  return data;
}

export async function saveAcademicRecord(input: AcademicRecordInput) {
  const supabase = await createClient();

  // (user_id, transcript_version_id, semester, course_name)가 이미 있으면 새 행을 만드는 대신
  // 기존 행을 갱신합니다. 네이티브 upsert(ON CONFLICT DO UPDATE)는 INSERT/UPDATE RLS 정책이
  // 분리되어 있는 이 테이블에서 "new row violates row-level security policy (USING expression)"
  // 오류를 유발해(직접 재현 확인), 대신 조회 후 UPDATE 또는 INSERT를 명시적으로 분기합니다.
  // 두 요청이 동시에 들어와도 부분 유니크 인덱스가 마지막 방어선 역할을 합니다.
  let lookup = supabase
    .from("academic_records")
    .select("id")
    .eq("user_id", input.user_id)
    .eq("semester", input.semester)
    .eq("course_name", input.course_name);
  lookup = input.transcript_version_id
    ? lookup.eq("transcript_version_id", input.transcript_version_id)
    : lookup.is("transcript_version_id", null);

  const { data: existing, error: lookupError } = await lookup.maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    const { data, error } = await supabase
      .from("academic_records")
      .update(input)
      .eq("id", existing.id)
      .eq("user_id", input.user_id)
      .select();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("academic_records")
    .insert(input)
    .select();

  if (error) throw error;
  return data;
}

/**
 * 학업·성적 탭/분석에는 항상 "active 버전 소속 과목" + "수동 입력 과목(버전 없음)"만 노출합니다.
 * activeVersionId가 없으면 수동 입력 과목만 반환합니다(과거 활성 버전이었던 archived 과목은
 * 숨겨집니다 — 새 성적표를 적용하기 전까지의 레거시 데이터만 예외적으로 이 필터에서 제외됩니다).
 */
export async function getAcademicRecords(userId: string, activeVersionId?: string | null) {
  if (isDemoMode()) {
    return demoAcademicRecords;
  }

  const supabase = await createClient();
  let query = supabase.from("academic_records").select("*").eq("user_id", userId);
  query = activeVersionId
    ? query.or(`transcript_version_id.eq.${activeVersionId},transcript_version_id.is.null`)
    : query.is("transcript_version_id", null);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    // transcript_version_id 컬럼이 아직 없는 경우(마이그레이션 미적용) — 버전 필터 없이
    // 예전처럼 사용자의 모든 과목을 그대로 반환합니다. 기존 데이터를 화면에서 계속 볼 수 있게
    // 하는 안전장치이며, 마이그레이션을 적용하면 자동으로 새 필터링 방식으로 전환됩니다.
    if (isMissingSchemaError(error)) {
      const fallback = await supabase
        .from("academic_records")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (fallback.error) throw fallback.error;
      return fallback.data;
    }
    throw error;
  }
  return data;
}

/** 레거시 정리(cleanup) 대상 판정을 위해, 버전에 속하지 않은(transcript_version_id is null) 모든 행을 가져옵니다. */
export async function getLegacyAcademicRecords(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_records")
    .select("*")
    .eq("user_id", userId)
    .is("transcript_version_id", null)
    .order("created_at", { ascending: true });

  if (error) {
    // 마이그레이션 미적용으로 transcript_version_id 컬럼이 없으면, 현재 모든 행이 곧
    // "버전 없는" 행이므로 필터 없이 전체를 반환합니다.
    if (isMissingSchemaError(error)) {
      const fallback = await supabase
        .from("academic_records")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (fallback.error) throw fallback.error;
      return fallback.data;
    }
    throw error;
  }
  return data;
}

export async function getActiveTranscriptVersion(userId: string) {
  if (isDemoMode()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_transcript_versions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  // 마이그레이션 미적용으로 테이블 자체가 없으면(성적표 버전 기능 도입 전 상태) 버전이
  // 아예 없는 것으로 취급합니다 — 화면 전체가 깨지는 대신 예전 방식으로 계속 동작합니다.
  if (error) {
    if (isMissingSchemaError(error)) return null;
    throw error;
  }
  return data;
}

export async function getPendingReviewVersion(userId: string) {
  if (isDemoMode()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_transcript_versions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "review")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) return null;
    throw error;
  }
  return data;
}

export async function getTranscriptVersion(userId: string, versionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_transcript_versions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", versionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getSemesterSummaries(userId: string, transcriptVersionId: string) {
  if (isDemoMode()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_semester_summaries")
    .select("*")
    .eq("user_id", userId)
    .eq("transcript_version_id", transcriptVersionId);

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
  return data;
}

export async function createTranscriptVersion(input: TranscriptVersionInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_transcript_versions")
    .insert({ ...input, status: "review", is_active: false })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function insertTranscriptCourses(rows: AcademicRecordInput[]) {
  if (!rows.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("academic_records").insert(rows).select();

  if (error) throw error;
  return data;
}

export async function insertSemesterSummaries(rows: SemesterSummaryInput[]) {
  if (!rows.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("academic_semester_summaries").insert(rows).select();

  if (error) throw error;
  return data;
}

export async function deleteTranscriptReviewBundle(userId: string, versionId: string) {
  const supabase = await createClient();
  const { error: courseError } = await supabase
    .from("academic_records")
    .delete()
    .eq("user_id", userId)
    .eq("transcript_version_id", versionId);
  if (courseError) throw courseError;

  const { error: versionError } = await supabase
    .from("academic_transcript_versions")
    .delete()
    .eq("user_id", userId)
    .eq("id", versionId)
    .eq("is_active", false);
  if (versionError) throw versionError;
}

/**
 * 대상 버전을 active로 바꾸기 전에, 이 사용자의 기존 active 버전을 archived로 내립니다.
 * (academic_transcript_versions_one_active_idx 부분 유니크 인덱스 때문에 순서가 중요합니다 —
 * 먼저 내리지 않으면 새 버전을 active로 바꾸는 UPDATE가 제약을 위반합니다.)
 */
export async function activateTranscriptVersion(userId: string, versionId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: target, error: targetError } = await supabase
    .from("academic_transcript_versions")
    .select("id")
    .eq("id", versionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!target) throw new Error("성적표 버전을 찾을 수 없습니다.");

  const { data: previousActive, error: previousError } = await supabase
    .from("academic_transcript_versions")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true);
  if (previousError) throw previousError;

  const { error: archiveError } = await supabase
    .from("academic_transcript_versions")
    .update({ status: "archived", is_active: false, updated_at: now })
    .eq("user_id", userId)
    .eq("is_active", true);
  if (archiveError) throw archiveError;

  const { data, error } = await supabase
    .from("academic_transcript_versions")
    .update({ status: "active", is_active: true, updated_at: now })
    .eq("id", versionId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    const previousIds = (previousActive ?? []).map((item) => item.id);
    if (previousIds.length) {
      const { error: restoreError } = await supabase
        .from("academic_transcript_versions")
        .update({ status: "active", is_active: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .in("id", previousIds);
      if (restoreError) {
        throw new AggregateError(
          [error, restoreError],
          "새 성적표 적용과 이전 활성 버전 복구에 모두 실패했습니다.",
        );
      }
    }
    throw error;
  }
  return data;
}

export async function saveEvidenceRecord(input: EvidenceRecordInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evidence_records")
    .insert(input)
    .select();

  if (error) throw error;
  return data;
}

export async function getEvidenceRecords(userId: string) {
  if (isDemoMode()) {
    return demoEvidenceRecords;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evidence_records")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteEvidenceRecord(userId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evidence_records")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select();

  if (error) throw error;
  return data;
}

export async function getAcademicRecordsByVersion(userId: string, versionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_records")
    .select("*")
    .eq("user_id", userId)
    .eq("transcript_version_id", versionId);

  if (error) throw error;
  return data;
}

/** 정리(cleanup) 삭제 전, 삭제될 원본 행을 백업 로그 테이블에 남깁니다. */
export async function backupAndDeleteAcademicRecords(
  userId: string,
  rows: Array<{ id: string; reason: string; row: Record<string, unknown> }>,
) {
  if (!rows.length) return 0;
  const supabase = await createClient();

  const { error: logError } = await supabase.from("academic_records_cleanup_log").insert(
    rows.map((item) => ({
      user_id: userId,
      rule: item.reason,
      original_row: item.row,
    })),
  );
  if (logError) throw logError;

  const { error: deleteError, count } = await supabase
    .from("academic_records")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .in(
      "id",
      rows.map((item) => item.id),
    );
  if (deleteError) throw deleteError;

  return count ?? rows.length;
}

export async function getEvidenceSkills(userId: string) {
  if (isDemoMode()) {
    // 데모 모드는 이번 단계에서 evidence_skills 고정 데이터를 제공하지 않습니다.
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evidence_skills")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * 특정 Evidence의 역량 매핑을 사용자가 최종 확인한 목록으로 통째로 교체합니다.
 * (기존 매핑 삭제 후 재삽입 — Evidence 수정 시 매핑을 갱신하는 데 사용됩니다.)
 */
export async function replaceEvidenceSkills(
  userId: string,
  evidenceId: string,
  skills: EvidenceSkillInput[],
) {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("evidence_skills")
    .delete()
    .eq("user_id", userId)
    .eq("evidence_id", evidenceId);

  if (deleteError) throw deleteError;

  if (!skills.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("evidence_skills")
    .insert(
      skills.map((skill) => ({
        ...skill,
        user_id: userId,
        evidence_id: evidenceId,
      })),
    )
    .select();

  if (error) throw error;
  return data;
}
