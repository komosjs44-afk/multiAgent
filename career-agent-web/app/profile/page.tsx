"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo/config";
import { resolveGpa } from "@/lib/academicSummary";
import type {
  AcademicRecord,
  CareerProfileRecord,
  EvidenceRecord,
  EvidenceSkillRow,
  SemesterSummaryRecord,
  TranscriptVersion,
} from "@/types/career";
import ActivitySection from "./_components/sections/ActivitySection";
import AwardSection from "./_components/sections/AwardSection";
import BasicInfoSection from "./_components/sections/BasicInfoSection";
import CertSection from "./_components/sections/CertSection";
import ProjectSection from "./_components/sections/ProjectSection";
import QuickAnalysisSection from "./_components/sections/QuickAnalysisSection";
import ScoreSection from "./_components/sections/ScoreSection";
import SubjectSection from "./_components/sections/SubjectSection";
import Toast from "./_components/shared/Toast";
import { getJson } from "./_components/apiUtils";

type PageData = {
  profile: CareerProfileRecord | null;
  academic: AcademicRecord[];
  evidence: EvidenceRecord[];
  skillsByEvidenceId: Record<string, EvidenceSkillRow[]>;
  activeVersion: TranscriptVersion | null;
  semesterSummaries: SemesterSummaryRecord[];
  pendingReviewVersion: TranscriptVersion | null;
};

function groupSkillsByEvidenceId(rows: EvidenceSkillRow[]): Record<string, EvidenceSkillRow[]> {
  const grouped: Record<string, EvidenceSkillRow[]> = {};
  for (const row of rows) {
    (grouped[row.evidence_id] ??= []).push(row);
  }
  return grouped;
}

type ToastState = { message: string; type: "success" | "error" } | null;
type TabKey = "quick" | "academic" | "certs" | "projects" | "awards" | "activities" | "scores";

function calcCompletion(data: PageData): number {
  const effectiveGpa = resolveGpa({
    activeVersion: data.activeVersion,
    records: data.academic,
    profileGpa: data.profile?.gpa,
  });
  const checks = [
    Boolean(data.profile?.grade),
    Boolean(data.profile?.university),
    Boolean(effectiveGpa),
    Boolean(data.profile?.target_company),
    data.evidence.some((r) => r.type === "certificate" && !r.skills.includes("어학")),
    data.academic.length > 0,
    data.evidence.some((r) => r.type === "project"),
    data.evidence.some((r) => r.type === "award" || r.type === "hackathon"),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

type TabDef = { key: TabKey; label: string; getCount: (d: PageData) => number };

const TABS: TabDef[] = [
  { key: "quick", label: "빠른 분석", getCount: () => 0 },
  { key: "academic", label: "학업·성적", getCount: (d) => d.academic.length },
  {
    key: "certs",
    label: "자격증",
    getCount: (d) =>
      d.evidence.filter((r) => r.type === "certificate" && !r.skills.includes("어학")).length,
  },
  {
    key: "projects",
    label: "프로젝트",
    getCount: (d) => d.evidence.filter((r) => r.type === "project").length,
  },
  {
    key: "awards",
    label: "수상·공모전",
    getCount: (d) =>
      d.evidence.filter((r) => r.type === "award" || r.type === "hackathon").length,
  },
  {
    key: "activities",
    label: "활동·경험",
    getCount: (d) =>
      d.evidence.filter(
        (r) => r.type === "internship" || r.type === "activity" || r.type === "study",
      ).length,
  },
  {
    key: "scores",
    label: "어학·점수",
    getCount: (d) =>
      d.evidence.filter((r) => r.type === "certificate" && r.skills.includes("어학")).length,
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<PageData>({
    profile: null,
    academic: [],
    evidence: [],
    skillsByEvidenceId: {},
    activeVersion: null,
    semesterSummaries: [],
    pendingReviewVersion: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("quick");
  const [loadError, setLoadError] = useState("");

  const loadData = useCallback(async () => {
    const [profilePayload, academicPayload, evidencePayload] = await Promise.all([
      getJson<{ data?: CareerProfileRecord | null }>("/api/career-profile"),
      getJson<{
        data?: AcademicRecord[];
        activeVersion?: TranscriptVersion | null;
        semesterSummaries?: SemesterSummaryRecord[];
        pendingReviewVersion?: TranscriptVersion | null;
      }>("/api/academic-records"),
      getJson<{ data?: EvidenceRecord[]; skills?: EvidenceSkillRow[] }>("/api/evidence-records"),
    ]);
    setData({
      profile: profilePayload.data ?? null,
      academic: academicPayload.data ?? [],
      evidence: evidencePayload.data ?? [],
      skillsByEvidenceId: groupSkillsByEvidenceId(evidencePayload.skills ?? []),
      activeVersion: academicPayload.activeVersion ?? null,
      semesterSummaries: academicPayload.semesterSummaries ?? [],
      pendingReviewVersion: academicPayload.pendingReviewVersion ?? null,
    });
  }, []);

  useEffect(() => {
    async function init() {
      if (!isDemoMode()) {
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
      }
      try {
        await loadData();
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "프로필 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [router, loadData]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
  }

  function onRefresh() {
    void loadData();
  }

  async function handleAnalyze() {
    if (!canAnalyze) {
      showToast("기본 정보, 학업 정보, 목표 설정을 먼저 입력해주세요.", "error");
      return;
    }

    if (!data.activeVersion && data.pendingReviewVersion) {
      showToast("검토 중인 성적표가 있습니다. 적용 후 분석해주세요.", "error");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analyze-career", { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "분석 실행에 실패했습니다.");
      }
      router.push("/result");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "분석 실행에 실패했습니다.",
        "error",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--paper)]">
        <div className="grid w-full max-w-3xl gap-4 px-5">
          <div className="h-24 animate-pulse rounded-[2rem] bg-white" />
          <div className="h-48 animate-pulse rounded-[2rem] bg-white" />
          <div className="h-48 animate-pulse rounded-[2rem] bg-white" />
        </div>
      </main>
    );
  }

  const certs = data.evidence.filter(
    (r) => r.type === "certificate" && !r.skills.includes("어학"),
  );
  const langScores = data.evidence.filter(
    (r) => r.type === "certificate" && r.skills.includes("어학"),
  );
  const projects = data.evidence.filter((r) => r.type === "project");
  const awards = data.evidence.filter(
    (r) => r.type === "award" || r.type === "hackathon",
  );
  const activities = data.evidence.filter(
    (r) => r.type === "internship" || r.type === "activity" || r.type === "study",
  );
  const pct = calcCompletion(data);
  const effectiveGpa = resolveGpa({
    activeVersion: data.activeVersion,
    records: data.academic,
    profileGpa: data.profile?.gpa,
  });
  const analysisRequirements = [
    {
      label: "기본 정보",
      done: Boolean(data.profile?.grade && data.profile?.major),
      detail: "학년과 전공",
    },
    {
      label: "학업 정보",
      done: Boolean(data.profile?.gpa || data.academic.length > 0),
      detail: "GPA 또는 수강 과목",
    },
    {
      label: "목표 설정",
      done: Boolean(data.profile?.target_company || data.profile?.target_job),
      detail: "목표 기업 또는 목표 직무",
    },
    {
      label: "경험 데이터",
      done: data.evidence.length > 0,
      detail: "자격증, 프로젝트, 활동 중 1개 이상",
    },
  ];
  const canAnalyze = analysisRequirements.slice(0, 3).every((item) => item.done);

  return (
    <main className="min-h-screen bg-[var(--paper)] pb-32">
      {toast ? (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      ) : null}

      {/* Page header */}
      <div className="pt-8">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 lg:px-10">
          {loadError ? (
            <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {loadError}
            </p>
          ) : null}
          {isDemoMode() ? (
            <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              데모 모드로 표시 중입니다. 실제 Supabase 데이터가 아닌 고정 데모 데이터입니다.
            </p>
          ) : null}
          <header className="mb-6">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Gong Fit
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[var(--ink)]">커리어 DB</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              성적, 자격증, 프로젝트, 공모전 경험을 모아 공기업 전산직 적합도를 높여가세요.
            </p>

            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-[var(--ink)]">프로필 완성도</span>
                  <span className="rounded-full bg-[var(--lime)] px-2.5 py-0.5 text-xs font-black text-[var(--navy)]">
                    {pct}%
                  </span>
                </div>
                <Link href="/result" className="btn-dark text-sm">
                  분석 결과 보기
                </Link>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[var(--lime)] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                프로필을 채울수록 분석 정확도가 올라갑니다.
              </p>
            </div>

            <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-extrabold text-[var(--ink)]">
                    {canAnalyze ? "분석 실행 가능" : "분석 전 필수 정보가 부족합니다"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    필수 항목은 기본 정보, 학업 정보, 목표 설정입니다. 경험 데이터는 선택이지만 입력할수록 추천 정확도가 올라갑니다.
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                    canAnalyze
                      ? "bg-[var(--lime)] text-[var(--navy)]"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {canAnalyze ? "READY" : "NEED INPUT"}
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {analysisRequirements.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[var(--ink)]">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.detail}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        item.done
                          ? "bg-[var(--lime-soft)] text-[var(--navy)]"
                          : "bg-white text-slate-400"
                      }`}
                    >
                      {item.done ? "완료" : "필요"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </header>
        </div>
      </div>

      {/* Tab bar ??sticky, edge-to-edge, horizontally scrollable on mobile */}
      <div className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto max-w-3xl">
          <div className="overflow-x-auto px-5 sm:px-8 lg:px-10">
            <div className="flex min-w-max gap-0">
              {TABS.map(({ key, label, getCount }) => {
                const count = getCount(data);
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
                      isActive
                        ? "border-[var(--navy)] text-[var(--navy)]"
                        : "border-transparent text-slate-400 hover:text-[var(--ink)]"
                    }`}
                  >
                    {label}
                    {count > 0 ? (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-xs font-black ${
                          isActive
                            ? "bg-[var(--lime)] text-[var(--navy)]"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="mx-auto max-w-3xl px-5 pt-6 sm:px-8 lg:px-10">
        <div className="grid gap-5">
          {activeTab === "quick" && (
            <>
              <BasicInfoSection
                profile={data.profile}
                effectiveGpa={effectiveGpa}
                onRefresh={onRefresh}
                onToast={showToast}
              />
              <QuickAnalysisSection
                profile={data.profile}
                effectiveGpa={effectiveGpa}
                activeVersion={data.activeVersion}
                pendingReviewVersion={data.pendingReviewVersion}
                onRefresh={onRefresh}
                onToast={showToast}
                onViewDetail={() => setActiveTab("academic")}
              />
            </>
          )}
          {activeTab === "academic" && (
            <SubjectSection
              records={data.academic}
              activeVersion={data.activeVersion}
              semesterSummaries={data.semesterSummaries}
              onRefresh={onRefresh}
              onToast={showToast}
            />
          )}
          {activeTab === "certs" && (
            <CertSection records={certs} onRefresh={onRefresh} onToast={showToast} />
          )}
          {activeTab === "projects" && (
            <ProjectSection
              records={projects}
              skillsByEvidenceId={data.skillsByEvidenceId}
              onRefresh={onRefresh}
              onToast={showToast}
            />
          )}
          {activeTab === "awards" && (
            <AwardSection
              records={awards}
              skillsByEvidenceId={data.skillsByEvidenceId}
              onRefresh={onRefresh}
              onToast={showToast}
            />
          )}
          {activeTab === "activities" && (
            <ActivitySection
              records={activities}
              skillsByEvidenceId={data.skillsByEvidenceId}
              onRefresh={onRefresh}
              onToast={showToast}
            />
          )}
          {activeTab === "scores" && (
            <ScoreSection
              profile={data.profile}
              langRecords={langScores}
              onRefresh={onRefresh}
              onToast={showToast}
            />
          )}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--line)] bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            프로필 완성도{" "}
            <span className="font-extrabold text-[var(--ink)]">{pct}%</span>
          </p>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !canAnalyze}
            className="btn-dark text-sm disabled:opacity-50"
          >
            {isAnalyzing ? "분석 중..." : "준비도 분석하기"}
          </button>
        </div>
      </div>
    </main>
  );
}

