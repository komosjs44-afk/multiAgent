import { createAdminClient, createClient } from "@/lib/supabase/server";

export type JobDescriptionListFilters = {
  q?: string;
  jobField?: string;
  source?: string;
  active?: "true" | "false";
  limit?: number;
};

export type JobDescriptionUpsertInput = {
  company_name: string;
  recruit_title: string;
  title?: string;
  job_field?: string;
  target_job?: string;
  description?: string;
  required_knowledge?: string[];
  required_skills?: string[];
  required_attitude?: string[];
  qualifications?: string[];
  preferred_certificates?: string[];
  source?: string;
  source_url?: string | null;
  active?: boolean;
};

async function getDbClient() {
  return createAdminClient() ?? (await createClient());
}

export async function listJobDescriptions(filters: JobDescriptionListFilters = {}) {
  const db = await getDbClient();
  const limit = Math.max(1, Math.min(filters.limit ?? 100, 300));
  let query = db
    .from("job_descriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.q) {
    const q = `%${filters.q}%`;
    query = query.or(`company_name.ilike.${q},title.ilike.${q},recruit_title.ilike.${q},description.ilike.${q}`);
  }
  if (filters.jobField) query = query.eq("job_field", filters.jobField);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.active === "true") query = query.eq("active", true);
  if (filters.active === "false") query = query.eq("active", false);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateJobDescription(id: string, patch: Record<string, unknown>) {
  const db = await getDbClient();
  const { data, error } = await db
    .from("job_descriptions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteJobDescription(id: string) {
  const db = await getDbClient();
  const { data, error } = await db
    .from("job_descriptions")
    .delete()
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findExistingJobDescriptionKeys() {
  const db = await getDbClient();
  const { data, error } = await db
    .from("job_descriptions")
    .select("company_name,recruit_title,job_field");

  if (error) throw error;
  return new Set(
    (data ?? []).map((row) =>
      makeJobDescriptionKey({
        company_name: String(row.company_name ?? ""),
        recruit_title: String(row.recruit_title ?? ""),
        job_field: String(row.job_field ?? ""),
      }),
    ),
  );
}

export async function insertJobDescriptions(rows: JobDescriptionUpsertInput[]) {
  if (!rows.length) return [];
  const db = await getDbClient();
  const { data, error } = await db.from("job_descriptions").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export function makeJobDescriptionKey(input: {
  company_name: string;
  recruit_title: string;
  job_field?: string | null;
}) {
  return [input.company_name, input.recruit_title, input.job_field ?? ""]
    .map((value) => value.trim().toLowerCase())
    .join("::");
}
