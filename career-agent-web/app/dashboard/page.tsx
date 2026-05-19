"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isCareerAnalysis } from "@/lib/validation";
import type { AnalysisHistoryRow } from "@/types/career";

type LoadState = "loading" | "ready" | "error";

function isHistoryRow(value: unknown): value is AnalysisHistoryRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Partial<AnalysisHistoryRow>;
  return (
    typeof row.id === "string" &&
    typeof row.created_at === "string" &&
    isCareerAnalysis(row.analysis_result)
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getTopCareer(rows: AnalysisHistoryRow[]) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const career = row.analysis_result.recommendedCareer;
    counts.set(career, (counts.get(career) ?? 0) + 1);
  });

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "기록 없음";
}

export default function DashboardPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AnalysisHistoryRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<AnalysisHistoryRow | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      if (!isSupabaseConfigured()) {
        router.replace("/login");
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch("/api/analysis-history", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch history");
        }

        const payload = (await response.json()) as { data?: unknown };
        const nextRows = Array.isArray(payload.data)
          ? payload.data.filter(isHistoryRow)
          : [];

        if (!ignore) {
          setRows(nextRows);
          setState("ready");
        }
      } catch {
        if (!ignore) {
          setErrorMessage("분석 기록을 불러오는 중 문제가 발생했습니다.");
          setState("error");
        }
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [router]);

  const summary = useMemo(() => {
    const totalCount = rows.length;
    const averageScore = totalCount
      ? Math.round(
          rows.reduce((sum, row) => sum + row.analysis_result.totalScore, 0) /
            totalCount,
        )
      : 0;

    return {
      totalCount,
      averageScore,
      topCareer: getTopCareer(rows),
    };
  }, [rows]);

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold text-emerald-700">
            Analysis Dashboard
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">
                분석 기록 Dashboard
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                저장된 Career Agent 분석 결과를 최근 순서로 확인합니다.
              </p>
            </div>
            <Link
              href="/"
              className="flex h-10 w-full items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:w-auto"
            >
              새 분석 하기
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="총 분석 횟수" value={`${summary.totalCount}건`} />
          <SummaryCard
            label="평균 점수"
            value={summary.totalCount ? `${summary.averageScore}점` : "-"}
          />
          <SummaryCard label="가장 많이 추천된 진로" value={summary.topCareer} />
        </section>

        {state === "loading" ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            분석 기록을 불러오는 중입니다.
          </div>
        ) : null}

        {state === "error" ? (
          <div className="rounded-lg border border-red-100 bg-red-50 p-6 text-sm font-medium text-red-600">
            {errorMessage}
          </div>
        ) : null}

        {state === "ready" && rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              아직 분석 기록이 없습니다.
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              첫 분석을 실행하면 이 화면에서 최근 기록을 확인할 수 있습니다.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex h-10 items-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              첫 분석 하러가기
            </Link>
          </div>
        ) : null}

        {state === "ready" && rows.length > 0 ? (
          <section className="grid gap-4">
            {rows.map((row) => (
              <button
                type="button"
                key={row.id}
                onClick={() => setSelectedRow(row)}
                className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      {formatDate(row.created_at)}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">
                      {row.analysis_result.recommendedCareer}
                    </h2>
                    <ul className="mt-3 grid gap-1 text-sm leading-6 text-slate-600">
                      {row.analysis_result.strengths.slice(0, 2).map((strength) => (
                        <li key={strength}>- {strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-emerald-50 px-4 py-3 text-center">
                    <p className="text-xs font-semibold text-emerald-700">
                      종합 점수
                    </p>
                    <p className="mt-1 text-2xl font-bold text-emerald-950">
                      {row.analysis_result.totalScore}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </section>
        ) : null}
      </section>

      {selectedRow ? (
        <AnalysisModal row={selectedRow} onClose={() => setSelectedRow(null)} />
      ) : null}
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function AnalysisModal({
  row,
  onClose,
}: {
  row: AnalysisHistoryRow;
  onClose: () => void;
}) {
  const analysis = row.analysis_result;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-0 sm:items-center sm:p-6">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:mx-auto sm:max-w-3xl sm:rounded-xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm text-slate-500">{formatDate(row.created_at)}</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              {analysis.recommendedCareer}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            닫기
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <DetailBlock label="종합 점수" items={[`${analysis.totalScore} / 100`]} />
          <DetailBlock
            label="추천 진로 TOP 3"
            items={analysis.topCareers.map(
              (career) => `${career.name} (${career.fitScore}점): ${career.reason}`,
            )}
          />
          <DetailBlock label="강점" items={analysis.strengths} />
          <DetailBlock label="부족한 점" items={analysis.gaps} />
          <DetailBlock label="다음 액션" items={analysis.nextActions} />
          <DetailBlock
            label="4주 로드맵"
            items={analysis.roadmap.map(
              (week) => `${week.week}주차 ${week.title}: ${week.actions.join(" / ")}`,
            )}
          />
          <DetailBlock label="점수 산정 이유" items={analysis.scoreReasons} />
        </div>
      </div>
    </div>
  );
}

function DetailBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-500">{label}</h3>
      <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-900">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </section>
  );
}
