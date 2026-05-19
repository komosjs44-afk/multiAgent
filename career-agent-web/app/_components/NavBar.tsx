import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

async function logout() {
  "use server";
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // signOut 실패(Supabase 연결 불가 등)여도 로그인 페이지로 이동해 로컬 상태를 정리함
  }
  redirect("/login");
}

export default async function NavBar() {
  let userEmail: string | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userEmail = data.user?.email ?? null;
  } catch {
    // Supabase 미설정 또는 연결 오류 — 로그인 버튼을 기본으로 표시
  }

  return (
    <nav className="border-b border-slate-200 bg-white px-5 py-3 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link
          href="/"
          className="text-sm font-semibold text-emerald-700 hover:underline"
        >
          Career Agent
        </Link>

        <div className="flex items-center gap-3">
          {userEmail ? (
            <>
              <span className="text-sm text-slate-600">{userEmail}</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="h-8 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                >
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="flex h-8 items-center rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
