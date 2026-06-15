import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

async function logout() {
  "use server";
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Supabase 연결 실패 시에도 로그인 화면으로 이동합니다.
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
    // Supabase 미설정 상태에서는 로그인 CTA만 보여줍니다.
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[var(--navy)]/95 px-5 py-3 shadow-lg shadow-black/10 backdrop-blur sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <Image
            src="/icon-primary.svg.png"
            alt="Gong Fit Logo"
            width={36}
            height={36}
            className="object-contain"
            priority
          />
          <span className="text-xl font-bold tracking-tight text-white">
            GongFit
          </span>
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-4">
          <Link href="/dashboard" className="hidden text-sm font-semibold text-white/70 transition hover:text-[var(--lime)] md:inline">
            대시보드
          </Link>
          <Link href="/result" className="hidden text-sm font-semibold text-white/70 transition hover:text-[var(--lime)] md:inline">
            분석 결과
          </Link>
          <Link href="/jobs" className="hidden text-sm font-semibold text-white/70 transition hover:text-[var(--lime)] md:inline">
            추천 공고
          </Link>

          {userEmail ? (
            <>
              <span className="hidden max-w-40 truncate text-sm font-medium text-white/60 sm:inline">
                {userEmail}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="h-9 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--lime)]"
                >
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="flex h-9 items-center rounded-full border border-white/15 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--lime)]"
            >
              로그인
            </Link>
          )}
          <Link
            href="/profile"
            className="flex h-9 items-center rounded-full bg-[var(--lime)] px-4 text-sm font-extrabold text-[var(--navy)] transition hover:-translate-y-0.5 hover:bg-[var(--lime-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--lime)]"
          >
            경력 관리
          </Link>
        </div>
      </div>
    </nav>
  );
}
