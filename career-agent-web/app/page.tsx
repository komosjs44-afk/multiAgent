"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { DEMO_USER_NAME, isDemoMode } from "@/lib/demo/config";

type AuthState = {
  isLoading: boolean;
  isLoggedIn: boolean;
  userName: string;
};

const jobCards = [
  {
    org: "인천국제공항공사",
    role: "전산직 / 정보시스템 운영",
    deadline: "D-12",
    fit: 72,
    gaps: ["정보처리기사", "네트워크"],
  },
  {
    org: "한국전력공사",
    role: "ICT / 데이터 시스템",
    deadline: "D-18",
    fit: 68,
    gaps: ["NCS", "보안"],
  },
  {
    org: "한국철도공사",
    role: "전산 운영 / DB 관리",
    deadline: "D-25",
    fit: 61,
    gaps: ["SQLD", "Linux"],
  },
];

const features = [
  {
    title: "나에게 맞는 채용공고",
    description: "공기업 전산직 공고를 현재 프로필과 매칭해 우선순위로 보여줍니다.",
  },
  {
    title: "목표 준비 진행도",
    description: "1~3순위 목표 기업별 준비도와 부족 역량을 한눈에 정리합니다.",
  },
  {
    title: "부족 역량 진단",
    description: "전공, 자격증, 프로젝트, NCS 기준으로 보완할 부분을 찾습니다.",
  },
  {
    title: "다음 행동 추천",
    description: "지금 해야 할 공부, 자격증, 프로젝트 방향을 구체적으로 제안합니다.",
  },
];

export default function HomePage() {
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    isLoggedIn: false,
    userName: "",
  });

  useEffect(() => {
    let ignore = false;

    async function loadAuthState() {
      if (isDemoMode()) {
        setAuthState({ isLoading: false, isLoggedIn: true, userName: DEMO_USER_NAME });
        return;
      }

      if (!isSupabaseConfigured()) {
        setAuthState({ isLoading: false, isLoggedIn: false, userName: "" });
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (ignore) return;

        const metadata = user?.user_metadata as
          | { name?: string; full_name?: string; nickname?: string }
          | undefined;
        const emailName = user?.email?.split("@")[0] ?? "";
        const userName =
          metadata?.name ||
          metadata?.full_name ||
          metadata?.nickname ||
          emailName ||
          "사용자";

        setAuthState({
          isLoading: false,
          isLoggedIn: Boolean(user),
          userName,
        });
      } catch {
        if (!ignore) {
          setAuthState({ isLoading: false, isLoggedIn: false, userName: "" });
        }
      }
    }

    loadAuthState();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <section className="bg-[radial-gradient(circle_at_85%_10%,rgba(200,255,77,0.24),transparent_30%),linear-gradient(135deg,var(--navy)_0%,var(--navy-2)_100%)] px-5 py-16 text-white sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          {authState.isLoading ? (
            <HeroSkeleton />
          ) : authState.isLoggedIn ? (
            <LoggedInHero userName={authState.userName} />
          ) : (
            <GuestHero />
          )}

          <HeroPreview isLoggedIn={authState.isLoggedIn} />
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              What You See First
            </p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              결론, 이유, 다음 행동 순서로 보여줍니다
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-extrabold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-10 sm:px-8 lg:px-10">
        <div className="mx-auto h-3 max-w-5xl rounded-full bg-[var(--lime)] sm:h-4" />
      </section>
    </main>
  );
}

function GuestHero() {
  return (
    <div>
      <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-[var(--lime)]">
        Gong Fit Career Agent
      </p>
      <h1 className="mt-7 text-4xl font-extrabold leading-tight sm:text-6xl">
        공기업 전산직 준비,
        <br />
        지금 뭘 해야 할지 바로 보여드립니다
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
        채용공고, 목표 기업 적합도, 부족 역량, 다음 행동을 한 화면에서
        정리하는 AI 커리어 대시보드입니다.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--lime)] px-7 text-sm font-extrabold text-[var(--navy)] transition hover:-translate-y-0.5 hover:bg-[var(--lime-soft)]"
        >
          로그인하고 경력 관리
        </Link>
        <Link
          href="/signup"
          className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/8 px-7 text-sm font-bold text-white transition hover:bg-white/14"
        >
          무료 회원가입
        </Link>
      </div>
    </div>
  );
}

function LoggedInHero({ userName }: { userName: string }) {
  return (
    <div>
      <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-[var(--lime)]">
        내 맞춤 서비스 준비 완료
      </p>
      <h1 className="mt-7 text-4xl font-extrabold leading-tight sm:text-6xl">
        안녕하세요, {userName}님
        <br />
        오늘의 맞춤 공고를 확인해보세요
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
        현재 스펙 기준 가장 유리한 공기업과 부족 역량, 지금 해야 할 다음
        행동을 바로 분석해드립니다.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--lime)] px-7 text-sm font-extrabold text-[var(--navy)] transition hover:-translate-y-0.5 hover:bg-[var(--lime-soft)]"
        >
          내 대시보드 보기
        </Link>
        <Link
          href="/jobs"
          className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/8 px-7 text-sm font-bold text-white transition hover:bg-white/14"
        >
          추천 공고 새로 계산
        </Link>
      </div>
      <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
        {["맞춤 공고", "현재 지원 적합도", "다음 행동"].map((item) => (
          <div key={item} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
            <p className="text-sm font-extrabold text-white">{item}</p>
            <p className="mt-1 text-xs text-white/55">로그인 계정 기준 분석</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroPreview({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl shadow-black/25 backdrop-blur">
      <div className="rounded-[1.5rem] bg-white p-5 text-[var(--ink)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-500">
              {isLoggedIn ? "내 맞춤 매칭" : "실시간 매칭"}
            </p>
            <h2 className="mt-1 text-2xl font-extrabold">
              오늘 뜨는 맞춤형 채용 공고
            </h2>
          </div>
          <span className="rounded-full bg-[var(--lime)] px-3 py-1 text-xs font-black">
            {isLoggedIn ? "LIVE" : "DEMO"}
          </span>
        </div>
        <div className="mt-5 grid gap-3">
          {jobCards.map((job) => (
            <article
              key={job.org}
              className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold text-slate-500">{job.org}</p>
                  <h3 className="mt-1 font-extrabold">{job.role}</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    마감일 {job.deadline}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--navy)] px-4 py-3 text-center text-white">
                  <p className="text-2xl font-black text-[var(--lime)]">
                    {job.fit}%
                  </p>
                  <p className="text-xs text-white/60">적합도</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.gaps.map((gap) => (
                  <span
                    key={gap}
                    className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600"
                  >
                    {gap}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="max-w-2xl">
      <div className="h-10 w-56 animate-pulse rounded-full bg-white/10" />
      <div className="mt-8 h-14 w-full animate-pulse rounded-2xl bg-white/10" />
      <div className="mt-3 h-14 w-4/5 animate-pulse rounded-2xl bg-white/10" />
      <div className="mt-6 h-24 w-full animate-pulse rounded-2xl bg-white/10" />
      <div className="mt-8 flex gap-3">
        <div className="h-12 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="h-12 w-36 animate-pulse rounded-full bg-white/10" />
      </div>
    </div>
  );
}
