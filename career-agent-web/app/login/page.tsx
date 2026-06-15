"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function getLoginErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 맞지 않습니다. 회원가입 방식과 비밀번호를 다시 확인해주세요.";
  }

  if (normalized.includes("email not confirmed")) {
    return "이메일 인증이 아직 완료되지 않았습니다. 인증 메일 또는 Supabase Auth 설정을 확인해주세요.";
  }

  if (normalized.includes("rate limit")) {
    return "요청 제한에 걸렸습니다. 잠시 후 다시 시도해주세요.";
  }

  return message || "로그인에 실패했습니다. Supabase Auth 설정을 확인해주세요.";
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell hasCallbackError={false} />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const hasCallbackError = searchParams.get("error") === "auth_callback_failed";

  return <LoginShell hasCallbackError={hasCallbackError} />;
}

function LoginShell({ hasCallbackError }: { hasCallbackError: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const supabaseConfigured = isSupabaseConfigured();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password.trim() || !supabaseConfigured) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMessage(getLoginErrorMessage(error.message));
        setStatus("error");
        return;
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? getLoginErrorMessage(error.message)
          : "로그인 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
      setStatus("error");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-5">
      <div className="w-full max-w-sm rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm font-extrabold text-[var(--navy)] hover:underline">
          Gong Fit
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-950">로그인</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          로그인하면 프로필 입력, 분석 결과, 추천 공고를 계정 기준으로 저장합니다.
        </p>

        {!supabaseConfigured ? (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Supabase 환경변수가 설정되지 않아 실제 로그인을 사용할 수 없습니다.
          </p>
        ) : null}

        {hasCallbackError ? (
          <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            인증 처리 중 문제가 발생했습니다. 다시 로그인해주세요.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            이메일
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="example@university.ac.kr"
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
              placeholder="6자 이상"
              required
              disabled={status === "loading" || !supabaseConfigured}
              className="h-12 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm text-slate-950 outline-none focus:border-[var(--navy)] focus:ring-2 focus:ring-[var(--lime-soft)] disabled:bg-slate-50"
            />
          </label>

          {status === "error" ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === "loading" || !supabaseConfigured}
            className="btn-dark disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {status === "loading" ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          계정이 없다면{" "}
          <Link href="/signup" className="font-extrabold text-[var(--navy)] hover:underline">
            회원가입
          </Link>
          을 진행해주세요.
        </p>
      </div>
    </main>
  );
}
