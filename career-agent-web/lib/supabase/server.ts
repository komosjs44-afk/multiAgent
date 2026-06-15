import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

type AnalysisHistoryInput = {
  input_profile: unknown;
  analysis_result: unknown;
  user_id?: string | null;
};

type ProfileInput = {
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
};

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

function toLegacyProfileInput(input: ProfileInput) {
  return {
    user_id: input.user_id,
    name: input.name,
    university: input.university,
    major: input.major,
    grade: input.grade,
    target_career: input.target_career || input.target_job || "공기업 전산직",
    updated_at: new Date().toISOString(),
  };
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
};

export async function getJobDescriptions(limit = 50) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
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

export async function upsertProfile(input: ProfileInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
      ...input,
      updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select();

  if (error && isMissingProfilesColumnError(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from("profiles")
      .upsert(toLegacyProfileInput(input), { onConflict: "user_id" })
      .select();

    if (legacyError) throw new Error(legacyError.message);
    return legacyData;
  }

  if (error) throw new Error(error.message);
  return data;
}

export async function getProfile(userId: string) {
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
    .insert(input)
    .select();

  if (error) throw error;
  return data;
}

export async function getAcademicRecords(userId: string) {
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
