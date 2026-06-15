"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isCareerAnalysis } from "@/lib/validation";
import type { AnalysisHistoryRow, CareerAnalysis } from "@/types/career";

type HistoryItem = {
  id: string;
  createdAt: string;
  analysis: CareerAnalysis;
};

const scoreLabels: Record<keyof CareerAnalysis["scoreItems"], string> = {
  majorFit: "전공 적합도",
  techStack: "기술 스택",
  projectExperience: "프로젝트",
  contestExperience: "활동/공모전",
  certificates: "자격증",
  careerClarity: "목표 명확도",
  actionability: "실행 가능성",
};

const scoreMax: Record<keyof CareerAnalysis["scoreItems"], number> = {
  majorFit: 20,
  techStack: 20,
  projectExperience: 20,
  contestExperience: 10,
  certificates: 10,
  careerClarity: 10,
  actionability: 10,
};

export default function DashboardPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const latest = history[0]?.analysis ?? null;

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
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
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        const parsed = rows
          .map((row) => {
            const analysis = row.analysis_result ?? row.result_snapshot;
            if (!analysis || !isCareerAnalysis(analysis)) return null;
            return {
              id: row.id,
              createdAt: row.created_at,
              analysis,
            };
          })
          .filter((item): item is HistoryItem => Boolean(item));

        if (!ignore) setHistory(parsed);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadHistory();

    return () => {
      ignore = true;
    };
  }, []);

  const chartItems = useMemo(() => [...history].reverse(), [history]);
  const latestJobs = latest?.jobRecommendations ?? [];
  const averageJobFit = latestJobs.length
    ? Math.round(
        latestJobs.reduce((sum, job) => sum + job.fitScore, 0) /
          latestJobs.length,
      )
    : 0;
  const maxJobFit = latestJobs.length
    ? Math.max(...latestJobs.map((job) => job.fitScore))
    : 0;
  const topGaps = latest?.gaps.slice(0, 4) ?? [];
  const topActions = latest?.nextActions.slice(0, 4) ?? [];

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              커리어 준비도 대시보드
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              분석을 다시 실행할 때마다 준비도 점수와 부족 역량 변화가 누적됩니다.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/profile" className="btn-dark">
              정보 추가 후 재분석
            </Link>
            <Link href="/jobs" className="btn-light">
              추천 공고 보기
            </Link>
          </div>
        </header>

        {isLoading ? (
          <InfoBox text="분석 히스토리를 불러오는 중입니다." />
        ) : null}

        {!isLoading && !latest ? (
          <section className="rounded-[2rem] border border-dashed border-[var(--line)] bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-extrabold">아직 분석 결과가 없습니다.</h2>
            <p className="mt-2 text-sm text-slate-500">
              프로필 정보를 입력하고 분석을 실행하면 대시보드 그래프가 채워집니다.
            </p>
            <Link href="/profile" className="btn-dark mt-5">
              분석 시작하기
            </Link>
          </section>
        ) : null}

        {latest ? (
          <>
            {latest.warning ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                {latest.warning}
              </p>
            ) : null}

            <section className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
              <ScoreHero analysis={latest} historyCount={history.length} />
              <TrendCard items={chartItems} />
            </section>

            <section className="grid gap-5 md:grid-cols-3">
              <MetricCard label="추천 공고" value={`${latestJobs.length}개`} description="현재 분석 결과에 포함된 전산직 공고" />
              <MetricCard label="평균 공고 적합도" value={`${averageJobFit}점`} description="추천 공고 전체 평균" />
              <MetricCard label="최고 공고 적합도" value={`${maxJobFit}점`} description="가장 잘 맞는 공고 기준" />
            </section>

            <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <ScoreBreakdown analysis={latest} />
              <ActionPanel gaps={topGaps} actions={topActions} />
            </section>

            <section className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-extrabold">상위 추천 공고</h2>
                <Link href="/jobs" className="text-sm font-extrabold text-[var(--navy)] hover:underline">
                  전체 보기
                </Link>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {latestJobs.slice(0, 6).map((job) => (
                  <article key={job.posting.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-extrabold text-slate-600">
                        {job.posting.organization}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-black ${
                        job.posting.sourceStatus === "LIVE"
                          ? "bg-[var(--lime-soft)] text-[var(--navy)]"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {job.posting.sourceStatus === "LIVE" ? "실시간" : "데모"}
                      </span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 font-extrabold leading-6">
                      {job.posting.title}
                    </h3>
                    <p className="mt-4 text-4xl font-black text-[var(--navy)]">
                      {job.fitScore}
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      역량 기반 적합도
                    </p>
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

function ScoreHero({
  analysis,
  historyCount,
}: {
  analysis: CareerAnalysis;
  historyCount: number;
}) {
  return (
    <section className="rounded-[2rem] bg-[var(--navy)] p-7 text-white shadow-2xl shadow-slate-950/10">
      <p className="text-sm font-bold text-[var(--lime)]">전체 준비도</p>
      <p className="mt-3 text-7xl font-black text-[var(--lime)]">
        {analysis.totalScore}
      </p>
      <p className="mt-1 text-sm text-white/60">점 / 100</p>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/12">
        <div
          className="h-full rounded-full bg-[var(--lime)]"
          style={{ width: `${Math.max(0, Math.min(100, analysis.totalScore))}%` }}
        />
      </div>
      <p className="mt-5 text-base font-bold">{analysis.recommendedCareer}</p>
      <p className="mt-3 text-sm leading-7 text-white/65">
        누적 분석 {historyCount}회 기준 최신 결과입니다. 점수는 합격률이 아니라 역량 기반 준비도입니다.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/result" className="rounded-full border border-white/20 px-4 py-2 text-xs font-extrabold text-white/80 transition hover:bg-white/10">
          상세 결과 보기
        </Link>
        <Link href="/profile" className="rounded-full border border-[var(--lime)]/50 px-4 py-2 text-xs font-extrabold text-[var(--lime)] transition hover:bg-[var(--lime)]/10">
          경력 추가하기
        </Link>
      </div>
    </section>
  );
}

function TrendCard({ items }: { items: HistoryItem[] }) {
  const points = items.length
    ? items.map((item, index) => {
        const x = items.length === 1 ? 50 : (index / (items.length - 1)) * 100;
        const y = 100 - Math.max(0, Math.min(100, item.analysis.totalScore));
        return { x, y, item };
      })
    : [];
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold">준비도 발전 그래프</h2>
          <p className="mt-1 text-sm text-slate-500">최근 분석 히스토리 기준 점수 변화</p>
        </div>
        <span className="rounded-full bg-[var(--lime-soft)] px-3 py-1 text-xs font-black text-[var(--navy)]">
          {items.length}회
        </span>
      </div>
      <div className="mt-6 rounded-3xl bg-slate-50 p-4">
        <svg viewBox="0 0 100 100" className="h-56 w-full overflow-visible">
          {[20, 40, 60, 80].map((line) => (
            <line
              key={line}
              x1="0"
              x2="100"
              y1={100 - line}
              y2={100 - line}
              stroke="#dcd8ca"
              strokeWidth="0.6"
            />
          ))}
          {polyline ? (
            <polyline
              points={polyline}
              fill="none"
              stroke="#10182b"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {points.map((point) => (
            <circle key={point.item.id} cx={point.x} cy={point.y} r="3.5" fill="#c8ff4d" stroke="#10182b" strokeWidth="2" />
          ))}
        </svg>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {items.slice(-4).map((item) => (
            <div key={item.id} className="rounded-2xl bg-white px-3 py-2 text-xs">
              <p className="font-black text-[var(--navy)]">{item.analysis.totalScore}점</p>
              <p className="mt-1 text-slate-500">{formatDate(item.createdAt)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScoreBreakdown({ analysis }: { analysis: CareerAnalysis }) {
  const entries = Object.entries(analysis.scoreItems) as Array<
    [keyof CareerAnalysis["scoreItems"], number]
  >;

  return (
    <section className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-extrabold">영역별 준비도</h2>
      <div className="mt-5 grid gap-4">
        {entries.map(([key, score]) => {
          const max = scoreMax[key];
          const ratio = max ? Math.round((score / max) * 100) : 0;
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-extrabold">{scoreLabels[key]}</span>
                <span className="font-black text-[var(--navy)]">{score}/{max}</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[var(--lime)]" style={{ width: `${ratio}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActionPanel({ gaps, actions }: { gaps: string[]; actions: string[] }) {
  return (
    <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--lime-soft)]/35 p-6 shadow-sm">
      <h2 className="text-xl font-extrabold">다음 성장 방향</h2>
      <div className="mt-5 grid gap-5">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">
            부족 역량
          </p>
          <ol className="mt-3 grid gap-2 text-sm leading-7 text-slate-700">
            {gaps.map((gap, index) => (
              <li key={gap} className="rounded-2xl bg-white px-4 py-3">
                {index + 1}. {gap}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">
            추천 행동
          </p>
          <ul className="mt-3 grid gap-2 text-sm leading-7 text-slate-700">
            {actions.map((action) => (
              <li key={action} className="rounded-2xl bg-white px-4 py-3 font-bold">
                {action}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm">
      <p className="text-sm font-extrabold text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-black text-[var(--navy)]">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </article>
  );
}

function InfoBox({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-bold text-slate-600">
      {text}
    </p>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}
