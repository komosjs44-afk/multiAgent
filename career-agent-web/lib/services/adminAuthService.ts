import { createClient } from "@/lib/supabase/server";

type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; message: string };

export async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, message: "Login required." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role,is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 403, message: error.message };
  }

  const profile = data as { role?: string | null; is_admin?: boolean | null } | null;
  if (profile?.is_admin === true || profile?.role === "admin") {
    return { ok: true, userId: user.id };
  }

  return { ok: false, status: 403, message: "Admin permission required." };
}
