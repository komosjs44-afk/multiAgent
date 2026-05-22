"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function getErrorMessage(status?: number): string {
  if (status === 429) {
    return "요청이 너무 많습니다. 60초 후 다시 시도해주세요.";
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "네트워크 연결을 확인해주세요.";
  }
  return "링크 전송에 실패했습니다. 잠시 후 다시 시도해주세요.";
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

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const supabaseConfigured = isSupabaseConfigured();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;

    if (!supabaseConfigured) {
      setErrorMessage(
        "현재는 Supabase가 연결되지 않은 체험 모드입니다. 실제 로그인은 환경변수 설정 후 사용할 수 있습니다.",
      );
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage(getErrorMessage(error.status));
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  function handleReset() {
    setStatus("idle");
    setEmail("");
    setErrorMessage("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-5">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            Career Agent
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-950">로그인</h1>
          <p className="mt-2 text-sm text-slate-500">
            Supabase가 연결되어 있으면 이메일 로그인 링크를 받을 수 있습니다.
          </p>
        </div>

        {!supabaseConfigured && (
          <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            <p className="font-semibold">현재는 체험 모드입니다</p>
            <p className="mt-1 leading-6">
              `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY`가
              설정되지 않아 실제 이메일 로그인은 사용할 수 없습니다. 분석 기능은
              로그인 없이 바로 사용할 수 있습니다.
            </p>
            <Link
              href="/"
              className="mt-3 inline-flex h-10 items-center rounded-md bg-amber-700 px-4 text-sm font-semibold text-white transition hover:bg-amber-800"
            >
              체험 분석 시작하기
            </Link>
          </div>
        )}

        {hasCallbackError && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            로그인 링크가 만료되었거나 유효하지 않습니다. 다시 시도해주세요.
          </p>
        )}

        {status === "sent" ? (
          <div className="grid gap-4">
            <div className="rounded-md bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              <p className="font-semibold">이메일을 확인해주세요</p>
              <p className="mt-1">
                <span className="font-medium">{email}</span>로 로그인 링크를
                전송했습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-slate-500 underline-offset-2 hover:underline"
            >
              다른 이메일로 시도하기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <label
              htmlFor="email"
              className="grid gap-2 text-sm font-medium text-slate-700"
            >
              이메일
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@university.ac.kr"
                required
                disabled={status === "loading" || !supabaseConfigured}
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </label>

            {status === "error" && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !supabaseConfigured}
              className="h-11 w-full rounded-md bg-emerald-700 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {!supabaseConfigured
                ? "Supabase 설정 후 사용 가능"
                : status === "loading"
                  ? "전송 중..."
                  : "로그인 링크 받기"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          로그인 없이도{" "}
          <Link href="/" className="font-medium text-emerald-700 hover:underline">
            체험 분석
          </Link>
          을 이용할 수 있습니다.
        </p>
      </div>
    </main>
  );
}
