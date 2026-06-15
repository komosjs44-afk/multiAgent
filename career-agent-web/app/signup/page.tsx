"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "sent">("idle");
  const [message, setMessage] = useState("");
  const supabaseConfigured = isSupabaseConfigured();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password.trim() || !supabaseConfigured) return;

    setStatus("loading");
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${location.origin}/auth/callback?next=/profile`,
        },
      });

      if (error) {
        setMessage(error.message);
        setStatus("error");
        return;
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "회원가입 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
      setStatus("error");
      return;
    }

    setStatus("sent");
    setMessage("회원가입이 완료되었습니다. 이메일 인증이 필요한 경우 인증 메일을 확인해주세요.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-5">
      <div className="w-full max-w-sm rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm font-extrabold text-[var(--navy)] hover:underline">
          Gong Fit
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-950">회원가입</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          커리어 DB와 분석 이력을 저장할 계정을 만듭니다.
        </p>

        {!supabaseConfigured ? (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Supabase 환경변수가 설정되지 않아 회원가입을 사용할 수 없습니다.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            이메일
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={status === "loading" || !supabaseConfigured}
              className="h-12 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm text-slate-950 outline-none focus:border-[var(--navy)] focus:ring-2 focus:ring-[var(--lime-soft)] disabled:bg-slate-50"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
              disabled={status === "loading" || !supabaseConfigured}
              className="h-12 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm text-slate-950 outline-none focus:border-[var(--navy)] focus:ring-2 focus:ring-[var(--lime-soft)] disabled:bg-slate-50"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            이름 또는 닉네임
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="공핏"
              disabled={status === "loading" || !supabaseConfigured}
              className="h-12 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm text-slate-950 outline-none focus:border-[var(--navy)] focus:ring-2 focus:ring-[var(--lime-soft)] disabled:bg-slate-50"
            />
          </label>

          {message ? (
            <p
              className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                status === "error"
                  ? "border border-red-200 bg-red-50 text-red-700"
                  : "border border-[var(--line)] bg-[var(--lime-soft)] text-slate-800"
              }`}
            >
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === "loading" || !supabaseConfigured}
            className="btn-dark disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {status === "loading" ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/login" className="font-extrabold text-[var(--navy)] hover:underline">
            로그인으로 이동
          </Link>
          {status === "sent" ? (
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="font-extrabold text-slate-600 hover:underline"
            >
              프로필 입력하기
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
