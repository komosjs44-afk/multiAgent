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
  const { data, error } = await supabase
    .from("academic_records")
    // (user_id, semester, course_name)에 unique index가 있어, 같은 과목을 다시 저장하면
    // 새 행을 만드는 대신 기존 행을 갱신합니다 — 중복 클릭·중복 업로드로부터의 DB 레벨 안전장치입니다.
    .upsert(input, { onConflict: "user_id,semester,course_name" })
    .select();

  if (error) throw error;
  return data;
}

export async function getAcademicRecords(userId: string) {
  if (isDemoMode()) {
    return demoAcademicRecords;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_records")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
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
