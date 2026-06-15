"use client";

import Link from "next/link";
import { ReactNode, useCallback, useEffect, useState } from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isCareerAnalysis } from "@/lib/validation";
import type { AnalysisHistoryRow, CareerAnalysis } from "@/types/career";

export default function ResultPage() {
  const [analysis, setAnalysis] = useState<CareerAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/analyze-career", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ save: true, source: "result" }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        const error =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error?: unknown }).error)
            : "분석 실행에 실패했습니다.";
        throw new Error(error);
      }

      if (!isCareerAnalysis(payload)) {
        throw new Error("분석 API 응답 형식이 올바르지 않습니다.");
      }

      setAnalysis(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "분석 실행에 실패했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadLatestAnalysis() {
      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/analysis-history", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | { data?: AnalysisHistoryRow[] }
          | null;
        const row = Array.isArray(payload?.data) ? payload.data[0] : null;
        const latest = row?.analysis_result ?? row?.result_snapshot;

        if (!ignore && latest && isCareerAnalysis(latest)) setAnalysis(latest);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadLatestAnalysis();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              Analysis Result
            </p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              공기업 전산직 준비도 분석 결과
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              합격 예측이 아니라 현재 프로필과 공고 요구 역량을 비교한 역량 기반 적합도입니다.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/jobs" className="btn-dark">
              추천 공고 보기
            </Link>
            <Link href="/profile" className="btn-light">
              정보 수정 후 재분석
            </Link>
          </div>
        </header>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? <EmptyState title="분석 결과를 불러오는 중입니다." /> : null}

        {!isLoading && !analysis ? (
          <EmptyState
            title="아직 분석 결과가 없습니다."
            description="저장된 프로필, 성적, 경험 데이터를 기준으로 지금 바로 분석을 실행할 수 있습니다."
            action={
              <button
                type="button"
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="btn-dark mt-5 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isAnalyzing ? "분석 실행 중..." : "지금 분석 실행"}
              </button>
            }
          />
        ) : null}

        {analysis ? (
          <>
            {analysis.warning ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                {analysis.warning}
              </p>
            ) : null}

            <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
              <div className="rounded-[2rem] bg-[var(--navy)] p-7 text-white shadow-2xl shadow-slate-950/10">
                <p className="text-sm font-bold text-[var(--lime)]">전체 준비도</p>
                <p className="mt-3 text-7xl font-black text-[var(--lime)]">
                  {analysis.totalScore}
                </p>
                <p className="mt-1 text-sm text-white/60">/ 100</p>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/12">
                  <div
                    className="h-full rounded-full bg-[var(--lime)]"
                    style={{ width: `${Math.max(0, Math.min(100, analysis.totalScore))}%` }}
                  />
                </div>
                <p className="mt-6 text-base font-bold">{analysis.recommendedCareer}</p>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  {analysis.aiSummary ??
                    "규칙 기반 분석 결과를 바탕으로 강점, 부족 역량, 다음 행동을 정리했습니다."}
                </p>
              </div>

              <div className="grid gap-5">
                <ActionBox actions={analysis.nextActions.slice(0, 4)} />
                <div className="grid gap-5 md:grid-cols-2">
                  <ListCard title="강점" items={analysis.strengths} />
                  <ListCard title="부족한 역량" items={analysis.gaps} ordered />
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-extrabold">점수 상세 근거</h2>
              <div className="mt-5 grid gap-3">
                {analysis.scoreDetails.map((item) => (
                  <details
                    key={item.key}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                      <span className="font-bold">{item.label}</span>
                      <span className="rounded-full bg-[var(--navy)] px-3 py-1 text-sm font-black text-[var(--lime)]">
                        {item.score}/{item.maxScore}
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.reason}</p>
                    <p className="mt-2 text-sm font-bold text-[var(--navy)]">
                      다음 행동: {item.nextStep}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-extrabold">4주 성장 로드맵</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-4">
                {analysis.roadmap.map((week) => (
                  <article key={week.week} className="rounded-3xl bg-[var(--lime-soft)]/60 p-5">
                    <p className="text-sm font-black text-[var(--navy)]">{week.week}주차</p>
                    <h3 className="mt-2 font-extrabold">{week.title}</h3>
                    <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-700">
                      {week.actions.map((action) => (
                        <li key={action}>- {action}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-extrabold">목표 기업 적합도</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {analysis.topCareers.map((career) => (
                  <article key={career.name} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                    <p className="font-extrabold">{career.name}</p>
                    <p className="mt-2 text-3xl font-black text-[var(--navy)]">{career.fitScore}%</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{career.reason}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}

function ActionBox({ actions }: { actions: string[] }) {
  return (
    <section className="rounded-[2rem] bg-[var(--lime)] p-6">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">
        Priority Action
      </p>
      <h2 className="mt-2 text-2xl font-extrabold">지금 먼저 쌓아야 할 경력 방향</h2>
      <ol className="mt-5 grid gap-3">
        {actions.map((action, index) => (
          <li key={action} className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold">
            {index + 1}. {action}
          </li>
        ))}
      </ol>
    </section>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-dashed border-[var(--line)] bg-white p-10 text-center shadow-sm">
      <h2 className="text-xl font-extrabold">{title}</h2>
      {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
      {action ?? (
        <Link href="/profile" className="btn-dark mt-5">
          프로필 입력하기
        </Link>
      )}
    </section>
  );
}

function ListCard({
  title,
  items,
  ordered = false,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";

  return (
    <section className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-extrabold">{title}</h2>
      <List className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
        {items.map((item, index) => (
          <li key={`${title}-${item}`} className="rounded-2xl bg-slate-50 p-3">
            {ordered ? `${index + 1}. ` : "- "}
            {item}
          </li>
        ))}
      </List>
    </section>
  );
}
