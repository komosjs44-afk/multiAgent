"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  JobRecommendationResponseItem,
  JobRecommendationsApiResponse,
} from "@/types/career";

type PagePayload = {
  recommendations: JobRecommendationResponseItem[];
  topRecommendations: JobRecommendationResponseItem[];
  otherRelevantJobs: JobRecommendationResponseItem[];
  warnings: string[];
  sourceCounts?: {
    supabaseJobDescriptions: number;
    alioFilteredJobs: number;
    mergedCandidates: number;
    finalRecommendations: number;
  };
};

function isApiResponse(value: unknown): value is JobRecommendationsApiResponse {
  return value !== null && typeof value === "object" && "ok" in value;
}

function uniqueKey(job: JobRecommendationResponseItem, index: number) {
  return job.recommendationId || `${job.source.type}-${job.id}-${index}`;
}

export default function JobsPage() {
  const [payload, setPayload] = useState<PagePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadRecommendations = useCallback(async () => {
    setIsLoading(true);
    setMessage("현재 프로필과 최신 공고 데이터를 기준으로 추천공고를 계산하고 있습니다.");

    try {
      if (!isSupabaseConfigured()) {
        setPayload(null);
        setMessage("Supabase 환경변수가 설정되지 않아 추천공고를 계산할 수 없습니다.");
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setPayload(null);
        setMessage("로그인하면 추천공고를 계산할 수 있습니다.");
        return;
      }

      const response = await fetch("/api/job-recommendations?limit=30", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 30 }),
      });
      const apiResponse = (await response.json().catch(() => null)) as unknown;

      if (!isApiResponse(apiResponse)) {
        throw new Error("추천공고 API 응답 형식이 올바르지 않습니다.");
      }

      if (!apiResponse.ok) {
        throw new Error(apiResponse.error.message);
      }

      setPayload({
        recommendations: apiResponse.data.recommendations,
        topRecommendations: apiResponse.data.topRecommendations,
        otherRelevantJobs: apiResponse.data.otherRelevantJobs,
        warnings: apiResponse.meta.warnings,
        sourceCounts: {
          supabaseJobDescriptions: apiResponse.meta.sourceCounts.supabaseJobDescriptions,
          alioFilteredJobs: apiResponse.meta.sourceCounts.alioFilteredJobs,
          mergedCandidates: apiResponse.meta.sourceCounts.mergedCandidates,
          finalRecommendations: apiResponse.meta.sourceCounts.finalRecommendations,
        },
      });
      setMessage(
        `계산 완료: ${apiResponse.data.recommendations.length}개 추천공고를 불러왔습니다.`,
      );
    } catch (error) {
      setPayload(null);
      setMessage(error instanceof Error ? error.message : "추천공고 계산에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  const recommendations = payload?.recommendations ?? [];
  const averageFit = recommendations.length
    ? Math.round(
        recommendations.reduce((sum, job) => sum + job.fitScore, 0) /
          recommendations.length,
      )
    : 0;
  const maxFit = recommendations.length
    ? Math.max(...recommendations.map((job) => job.fitScore))
    : 0;

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              Recommended Jobs
            </p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              공기업 전산직 추천 공고
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              현재 프로필, Supabase 직무기술서, ALIO 후보 공고를 기준으로
              역량 기반 추천을 계산합니다.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={loadRecommendations}
              disabled={isLoading}
              className="btn-dark disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isLoading ? "계산 중..." : "최신 공고 다시 계산"}
            </button>
            <Link href="/profile" className="btn-light">
              프로필 보완하기
            </Link>
          </div>
        </header>

        {message ? (
          <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-bold text-slate-600">
            {message}
          </p>
        ) : null}

        {payload?.warnings.length ? (
          <section className="grid gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            <p>데이터 수집 경고</p>
            {payload.warnings.map((warning, index) => (
              <p key={`${warning}-${index}`}>- {warning}</p>
            ))}
          </section>
        ) : null}

        {isLoading ? (
          <EmptyJobs title="추천 공고를 계산하는 중입니다." />
        ) : null}

        {!isLoading && !payload ? (
          <EmptyJobs
            title="추천공고를 계산하지 못했습니다."
            description="로그인, 프로필 입력, Supabase 연결, job_descriptions 테이블 상태를 확인해주세요."
          />
        ) : null}

        {payload ? (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                label="추천 공고"
                value={`${recommendations.length}개`}
                description={`병합 후보 ${payload.sourceCounts?.mergedCandidates ?? 0}개 기준`}
              />
              <SummaryCard
                label="평균 적합도"
                value={`${averageFit}점`}
                description="추천 공고 전체 평균"
              />
              <SummaryCard
                label="최고 적합도"
                value={`${maxFit}점`}
                description="가장 잘 맞는 공고 기준"
              />
            </section>

            <section className="rounded-2xl border border-[var(--line)] bg-white p-4 text-sm shadow-sm">
              <p className="font-extrabold text-[var(--ink)]">데이터 소스</p>
              <p className="mt-2 text-slate-500">
                Supabase 직무기술서 {payload.sourceCounts?.supabaseJobDescriptions ?? 0}개,
                ALIO 필터 후보 {payload.sourceCounts?.alioFilteredJobs ?? 0}개,
                최종 추천 {payload.sourceCounts?.finalRecommendations ?? 0}개
              </p>
            </section>

            {payload.topRecommendations.length ? (
              <JobSection title="맞춤 추천 TOP 3" jobs={payload.topRecommendations} highlighted />
            ) : null}

            {payload.otherRelevantJobs.length ? (
              <JobSection title="관련 공고 더 보기" jobs={payload.otherRelevantJobs} />
            ) : null}

            {!recommendations.length ? (
              <EmptyJobs
                title="추천 가능한 전산직 공고가 없습니다."
                description="프로필을 보완하거나 관리자 화면에서 직무기술서를 추가해주세요."
              />
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}

function JobSection({
  title,
  jobs,
  highlighted = false,
}: {
  title: string;
  jobs: JobRecommendationResponseItem[];
  highlighted?: boolean;
}) {
  return (
    <section className="grid gap-4">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-extrabold">{title}</h2>
        <span className="text-sm font-bold text-slate-500">{jobs.length}개</span>
      </div>
      <div className="grid gap-5">
        {jobs.map((job, index) => (
          <JobCard key={uniqueKey(job, index)} job={job} highlighted={highlighted} />
        ))}
      </div>
    </section>
  );
}

function JobCard({
  job,
  highlighted,
}: {
  job: JobRecommendationResponseItem;
  highlighted: boolean;
}) {
  return (
    <article
      className={`rounded-[2rem] border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[var(--lime)] ${
        highlighted && job.isTargetCompanyMatch
          ? "border-[var(--lime)]"
          : "border-[var(--line)]"
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-extrabold text-slate-500">{job.companyName}</p>
            <span className="rounded-full bg-[var(--lime-soft)] px-3 py-1 text-xs font-black text-[var(--navy)]">
              {job.source.label}
            </span>
            {job.isTargetCompanyMatch ? (
              <span className="rounded-full bg-[var(--lime)] px-3 py-1 text-xs font-black text-[var(--navy)]">
                목표기업 매칭
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-2xl font-extrabold">{job.title}</h3>
          <p className="mt-2 text-sm text-slate-500">
            마감: {job.deadline ?? "확인 필요"} / 지역: {job.region ?? "미기재"}
          </p>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-700">{job.reason}</p>
        </div>
        <div className="rounded-3xl bg-[var(--navy)] px-6 py-5 text-center text-white">
          <p className="text-xs font-bold text-white/60">역량 기반 적합도</p>
          <p className="mt-1 text-4xl font-black text-[var(--lime)]">{job.fitScore}</p>
          <p className="text-xs text-white/50">점</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-3">
        <InfoBlock title="매칭 키워드" text={job.matchedKeywords.join(", ") || "없음"} />
        <InfoBlock title="요구 역량" text={job.requiredSkills.join(", ") || "공고 확인 필요"} />
        <InfoBlock title="부족 역량" text={job.missingSkills.join(", ") || "큰 공백 없음"} />
      </dl>

      <div className="mt-5 rounded-3xl bg-[var(--lime-soft)]/55 p-4 text-sm leading-7 text-slate-700">
        <p>
          <span className="font-extrabold text-[var(--navy)]">추천 자격증: </span>
          {job.recommendedCertificates.join(", ") || "추가 추천 없음"}
        </p>
        <p>
          <span className="font-extrabold text-[var(--navy)]">보완 루틴: </span>
          {job.boostRoutine.join(" / ") || "프로필을 더 입력하면 구체화됩니다."}
        </p>
      </div>

      <div className="mt-5 flex justify-end">
        {job.recruitUrl ? (
          <a href={job.recruitUrl} target="_blank" rel="noreferrer" className="btn-light">
            상세보기
          </a>
        ) : (
          <span className="text-sm text-slate-400">상세보기 링크 없음</span>
        )}
      </div>
    </article>
  );
}

function SummaryCard({
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

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <dt className="font-extrabold text-slate-900">{title}</dt>
      <dd className="mt-1">{text}</dd>
    </div>
  );
}

function EmptyJobs({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <section className="rounded-[2rem] border border-dashed border-[var(--line)] bg-white p-10 text-center shadow-sm">
      <h2 className="text-xl font-extrabold">{title}</h2>
      {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
      <Link href="/profile" className="btn-dark mt-5">
        프로필 확인하기
      </Link>
    </section>
  );
}
