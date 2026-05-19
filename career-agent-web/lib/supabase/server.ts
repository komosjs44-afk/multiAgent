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

type SupabaseConfig = {
  url: string;
  key: string;
};

type AnalysisHistoryInput = {
  input_profile: unknown;
  analysis_result: unknown;
  user_id?: string | null;
};

function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return {
    url: url.replace(/\/$/, ""),
    key,
  };
}

async function requestSupabase(path: string, init: RequestInit) {
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Supabase request failed.");
  }

  return response.json();
}

export async function saveAnalysisHistory(input: AnalysisHistoryInput) {
  return requestSupabase("career_analysis", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: input.user_id ?? null,
      input_profile: input.input_profile,
      analysis_result: input.analysis_result,
    }),
  });
}

export async function getRecentAnalysisHistory(userId: string, limit = 10) {
  const safeLimit = Math.max(1, Math.min(limit, 50));
  return requestSupabase(
    `career_analysis?select=*&user_id=eq.${userId}&order=created_at.desc&limit=${safeLimit}`,
    {
      method: "GET",
    },
  );
}
