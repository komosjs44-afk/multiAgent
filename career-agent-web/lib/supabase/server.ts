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
  target_career: string;
};

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

  if (error) throw error;
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
