"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

import { formatCareerReport } from "@/lib/reportFormatter";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isCareerAnalysis, validateProfile } from "@/lib/validation";
import type {
  AcademicRecord,
  CareerAnalysis,
  EvidenceRecord,
  EvidenceRecordType,
  UserProfile,
} from "@/types/career";

type RoadmapChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const initialProfile: UserProfile = {
  major: "",
  grade: "",
  career: "공기업 전산직",
  skills: "",
  projects: "",
  certificates: "",
};

const profileFields: Array<{
  id: keyof Pick<UserProfile, "major" | "grade" | "career" | "skills">;
  label: string;
  placeholder: string;
}> = [
  { id: "major", label: "학과", placeholder: "컴퓨터공학과" },
  { id: "grade", label: "학년", placeholder: "3" },
  { id: "career", label: "목표 진로", placeholder: "공기업 전산직" },
  { id: "skills", label: "보유 기술", placeholder: "SQL, Python, 운영체제" },
];

function hasAnyInput(profile: UserProfile) {
  return Object.values(profile).some((value) => value.trim().length > 0);
}

export default function Home() {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [result, setResult] = useState<CareerAnalysis | null>(null);
  const [message, setMessage] = useState("프로필을 입력하면 공고 기반 분석을 시작합니다.");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof UserProfile, string>>
  >({});
  const [copyMessage, setCopyMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.localStorage.getItem("career-agent-privacy-consent") === "true",
  );
  const [canSaveToDb, setCanSaveToDb] = useState(false);

  const hasInput = useMemo(() => hasAnyInput(profile), [profile]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setCanSaveToDb(Boolean(user)))
      .catch(() => setCanSaveToDb(false));
  }, []);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
    setCopyMessage("");
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasAnyInput(profile)) {
      setResult(null);
      setError("");
      setMessage("먼저 프로필 정보를 하나 이상 입력해 주세요.");
      return;
    }

    const validation = validateProfile(profile);
    if (!validation.isValid) {
      setResult(null);
      setError("입력값을 확인해 주세요.");
      setFieldErrors(validation.errors);
      setMessage("학과, 학년, 목표 진로는 필수입니다.");
      return;
    }

    setIsLoading(true);
    setError("");
    setFieldErrors({});
    setMessage("공고와 역량을 비교하고 있습니다.");

    try {
      const response = await fetch("/api/analyze-career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          errors?: Partial<Record<keyof UserProfile, string>>;
        } | null;
        if (errorBody?.errors) setFieldErrors(errorBody.errors);
        throw new Error("server");
      }

      const json: unknown = await response.json();
      if (!isCareerAnalysis(json)) throw new Error("invalid_response");

      setResult(json);
      setCopyMessage("");
      setMessage("공고 추천, 예상 적합도, 보완 루틴을 생성했습니다.");

      if (privacyConsent && canSaveToDb) {
        fetch("/api/analysis-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input_profile: profile,
            analysis_result: json,
          }),
        }).catch(() => {
          // 분석 자체는 성공했으므로 이력 저장 실패는 화면 흐름을 막지 않습니다.
        });
      }
    } catch (err) {
      setResult(null);
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg === "invalid_response"
          ? "서버 응답 형식이 올바르지 않습니다."
          : "분석 요청에 실패했습니다. 입력값이나 API 설정을 확인해 주세요.",
      );
      setMessage("분석 실패");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopyReport() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(formatCareerReport(result));
      setCopyMessage("Markdown 리포트를 클립보드에 복사했습니다.");
    } catch {
      setCopyMessage("복사에 실패했습니다. 브라우저 권한을 확인해 주세요.");
    }
  }

  function handleConsentChange(event: ChangeEvent<HTMLInputElement>) {
    const checked = event.target.checked;
    setPrivacyConsent(checked);
    window.localStorage.setItem("career-agent-privacy-consent", String(checked));
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold text-emerald-700">
            Evidence-based Career Agent
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">
                공고 기반 커리어 분석
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
                현재 역량을 공기업 전산직 공고 요구사항과 비교해 추천 공고,
                역량 기반 예상 적합도, 보완 루틴, 시스템 리스크를 함께 정리합니다.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              분석 기록 보기
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-950">
                프로필 입력
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                이력서 검증 전 단계이므로 학습/프로젝트/자격증 키워드만
                사용해 역량 기반으로 분석합니다.
              </p>
            </div>

            <form className="grid gap-4" onSubmit={handleAnalyze}>
              <div className="grid gap-4 sm:grid-cols-2">
                {profileFields.map((field) => (
                  <label
                    key={field.id}
                    htmlFor={field.id}
                    className="grid gap-2 text-sm font-medium text-slate-700"
                  >
                    {field.label}
                    <input
                      id={field.id}
                      name={field.id}
                      type="text"
                      value={profile[field.id]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      aria-invalid={Boolean(fieldErrors[field.id])}
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 aria-[invalid=true]:border-red-400"
                    />
                    {fieldErrors[field.id] ? (
                      <span className="text-xs font-medium text-red-600">
                        {fieldErrors[field.id]}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>

              <label
                htmlFor="projects"
                className="grid gap-2 text-sm font-medium text-slate-700"
              >
                프로젝트 경험
                <textarea
                  id="projects"
                  name="projects"
                  value={profile.projects}
                  onChange={handleChange}
                  placeholder="DB 프로젝트, 알고리즘/운영체제 학습, 팀 프로젝트 역할, GitHub/배포 경험 등을 적어 주세요."
                  className="min-h-28 resize-none rounded-md border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label
                htmlFor="certificates"
                className="grid gap-2 text-sm font-medium text-slate-700"
              >
                자격증/시험 준비
                <input
                  id="certificates"
                  name="certificates"
                  type="text"
                  value={profile.certificates}
                  onChange={handleChange}
                  placeholder="정보처리기사 필기 준비, SQLD 등"
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <span className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={handleConsentChange}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                  />
                  <span>
                    <span className="font-semibold text-slate-900">
                      개인정보 및 활동 기록 저장에 동의합니다.
                    </span>
                    <span className="mt-1 block text-slate-500">
                      입력한 프로필, 프로젝트, 성적, 활동 기록은 개인 맞춤형 진로
                      분석과 역량 추천을 위해 저장됩니다. 사용자는 언제든지 저장된
                      데이터를 수정하거나 삭제할 수 있습니다. 본 서비스는 실제
                      합격률을 예측하지 않으며, 입력 데이터와 공고 요구역량을
                      기반으로 한 참고용 분석 결과를 제공합니다.
                    </span>
                    <span className="mt-1 block text-slate-400">
                      동의하지 않아도 체험 분석은 가능합니다. 단, DB 저장과 이력
                      저장은 비활성화됩니다.
                    </span>
                  </span>
                </span>
              </label>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-1">
                  <p className="text-sm text-slate-500">{message}</p>
                  {error ? (
                    <p className="text-sm font-medium text-red-600">{error}</p>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={!hasInput || isLoading}
                  className="h-12 w-full rounded-md bg-emerald-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                >
                  {isLoading ? "분석 중..." : "분석하기"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  결과 미리보기
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  합격률은 실제 확률이 아니라 공고 요구역량 기반 예상 적합도입니다.
                </p>
              </div>
              {result ? (
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="h-10 w-full rounded-md border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:w-auto"
                >
                  리포트 복사
                </button>
              ) : null}
            </div>

            {copyMessage ? (
              <p className="mb-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {copyMessage}
              </p>
            ) : null}

            {result ? (
              <div className="grid gap-4">
                {result.aiSummary ? (
                  <AISummaryCard summary={result.aiSummary} />
                ) : null}
                <RoadmapChatPanel profile={profile} analysis={result} />
                <TotalScoreCard score={result.totalScore} />
                <JobRecommendationList recommendations={result.jobRecommendations} />
                <TopCareerList careers={result.topCareers} />
                <ScoreBreakdown scoreDetails={result.scoreDetails} />
                <ResultList label="강점" items={result.strengths} tone="good" />
                <ResultList label="부족 역량" items={result.gaps} tone="warn" />
                <ActionChecklist items={result.nextActions} />
                <RoadmapList roadmap={result.roadmap} />
                <SystemRiskList risks={result.systemRisks} />
              </div>
            ) : (
              <EmptyResult />
            )}
          </section>
        </div>

        <CareerDbPanel profile={profile} privacyConsent={privacyConsent} />
      </section>
    </main>
  );
}

const evidenceTypeLabels: Record<EvidenceRecordType, string> = {
  award: "수상",
  project: "프로젝트",
  certificate: "자격증",
  hackathon: "해커톤",
  study: "스터디",
  internship: "인턴십",
  activity: "활동",
};

const emptyEvidenceForm = {
  type: "project" as EvidenceRecordType,
  title: "",
  organization: "",
  description: "",
  role: "",
  result: "",
  skills: "",
};

const emptyAcademicForm = {
  course_name: "",
  credit: "",
  grade: "",
  semester: "",
  skill_mapping: "",
};

function CareerDbPanel({
  profile,
  privacyConsent,
}: {
  profile: UserProfile;
  privacyConsent: boolean;
}) {
  const [isConfigured] = useState(isSupabaseConfigured);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [evidenceRows, setEvidenceRows] = useState<EvidenceRecord[]>([]);
  const [academicRows, setAcademicRows] = useState<AcademicRecord[]>([]);
  const [form, setForm] = useState(emptyEvidenceForm);
  const [academicForm, setAcademicForm] = useState(emptyAcademicForm);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!isConfigured) {
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsLoggedIn(false);
          setIsLoading(false);
          return;
        }

        setIsLoggedIn(true);
        const [evidenceResponse, academicResponse] = await Promise.all([
          fetch("/api/evidence-records", { cache: "no-store" }),
          fetch("/api/academic-records", { cache: "no-store" }),
        ]);
        const evidencePayload = (await evidenceResponse.json().catch(() => null)) as {
          data?: EvidenceRecord[];
        } | null;
        const academicPayload = (await academicResponse.json().catch(() => null)) as {
          data?: AcademicRecord[];
        } | null;

        if (!ignore && evidenceResponse.ok && Array.isArray(evidencePayload?.data)) {
          setEvidenceRows(evidencePayload.data);
        }
        if (!ignore && academicResponse.ok && Array.isArray(academicPayload?.data)) {
          setAcademicRows(academicPayload.data);
        }
      } catch {
        if (!ignore) {
          setMessage("Career DB 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [isConfigured]);

  function handleEvidenceChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleAcademicChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setAcademicForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSaveProfile() {
    setMessage("");
    if (!privacyConsent) {
      setMessage("개인정보 저장 동의 후 Career Profile을 저장할 수 있습니다.");
      return;
    }

    const response = await fetch("/api/career-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "",
        university: "",
        major: profile.major,
        grade: profile.grade,
        target_career: profile.career,
      }),
    });

    setMessage(
      response.ok
        ? "Career Profile을 저장했습니다."
        : "Profile 저장에 실패했습니다. 로그인 상태와 Supabase 설정을 확인해 주세요.",
    );
  }

  async function handleSaveEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!privacyConsent) {
      setMessage("개인정보 저장 동의 후 Evidence를 저장할 수 있습니다.");
      return;
    }

    const response = await fetch("/api/evidence-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = (await response.json().catch(() => null)) as {
      data?: EvidenceRecord[];
    } | null;

    if (response.ok) {
      setEvidenceRows((current) => [
        ...((Array.isArray(payload?.data) ? payload.data : []) as EvidenceRecord[]),
        ...current,
      ]);
      setForm(emptyEvidenceForm);
      setMessage("Evidence를 저장했습니다. 다음 분석부터 자동 반영됩니다.");
    } else {
      setMessage("Evidence 저장에 실패했습니다. 로그인 상태와 테이블 설정을 확인해 주세요.");
    }
  }

  async function handleDeleteEvidence(id: string) {
    const response = await fetch(`/api/evidence-records?id=${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setEvidenceRows((current) => current.filter((item) => item.id !== id));
      setMessage("Evidence를 삭제했습니다.");
    } else {
      setMessage("Evidence 삭제에 실패했습니다.");
    }
  }

  async function handleSaveAcademic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!privacyConsent) {
      setMessage("개인정보 저장 동의 후 성적/수업 기록을 저장할 수 있습니다.");
      return;
    }

    const response = await fetch("/api/academic-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(academicForm),
    });

    const payload = (await response.json().catch(() => null)) as {
      data?: AcademicRecord[];
    } | null;

    if (response.ok) {
      setAcademicRows((current) => [
        ...((Array.isArray(payload?.data) ? payload.data : []) as AcademicRecord[]),
        ...current,
      ]);
      setAcademicForm(emptyAcademicForm);
      setMessage("성적/수업 기록을 저장했습니다. 다음 분석부터 자동 반영됩니다.");
    } else {
      setMessage("성적/수업 기록 저장에 실패했습니다. 로그인 상태와 테이블 설정을 확인해 주세요.");
    }
  }

  if (!isConfigured) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-semibold text-slate-950">
          Career DB / Evidence 저장
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          현재는 Supabase 환경변수가 없어 체험 모드로 동작합니다. 로그인 기반
          Career DB와 Evidence 저장은 `NEXT_PUBLIC_SUPABASE_URL`,
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 후 사용할 수 있습니다.
        </p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm text-slate-500">Career DB 상태를 확인하는 중입니다.</p>
      </section>
    );
  }

  if (!isLoggedIn) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-semibold text-slate-950">
          Career DB / Evidence 저장
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          로그인하면 Career Profile과 Evidence를 개인 DB에 저장하고 다음 분석에
          자동 반영할 수 있습니다.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex h-10 items-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          로그인하기
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">
            Career DB / Evidence 저장
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            저장한 Evidence는 다음 분석 요청 때 기술역량으로 변환되어 공고 매칭에
            반영됩니다.
          </p>
          {!privacyConsent ? (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              개인정보 저장 동의가 꺼져 있어 DB 저장은 비활성화되어 있습니다.
              체험 분석은 그대로 사용할 수 있습니다.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={!privacyConsent}
          className="h-10 rounded-md border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          현재 Profile 저장
        </button>
      </div>

      {message ? (
        <p className="mb-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {message}
        </p>
      ) : null}

      <form className="grid gap-4" onSubmit={handleSaveEvidence}>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Evidence type
            <select
              name="type"
              value={form.type}
              onChange={handleEvidenceChange}
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              {Object.entries(evidenceTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            제목
            <input
              name="title"
              value={form.title}
              onChange={handleEvidenceChange}
              required
              placeholder="Pay-Mate 프로젝트, 정보보안 발표, SQLD 등"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            기관/소속
            <input
              name="organization"
              value={form.organization}
              onChange={handleEvidenceChange}
              placeholder="학교, 동아리, 주최 기관"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            역할
            <input
              name="role"
              value={form.role}
              onChange={handleEvidenceChange}
              placeholder="백엔드, 팀장, 발표자"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          설명
          <textarea
            name="description"
            value={form.description}
            onChange={handleEvidenceChange}
            placeholder="무엇을 했고 어떤 문제를 해결했는지 적어 주세요."
            className="min-h-24 resize-none rounded-md border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            결과
            <input
              name="result"
              value={form.result}
              onChange={handleEvidenceChange}
              placeholder="수상, 배포, 발표 완료, 성능 개선"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            매핑 역량
            <input
              name="skills"
              value={form.skills}
              onChange={handleEvidenceChange}
              placeholder="DB, 백엔드, 보안, 문서화"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!privacyConsent}
            className="h-11 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Evidence 저장
          </button>
        </div>
      </form>

      <form className="mt-8 grid gap-4 border-t border-slate-100 pt-6" onSubmit={handleSaveAcademic}>
        <div>
          <h3 className="text-sm font-semibold text-slate-500">
            성적/수업 기록 저장
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            PDF 자동 파싱은 아직 제외되어 있으며, 현재는 사용자가 확인한 과목 기록을 직접 저장합니다.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            과목명
            <input
              name="course_name"
              value={academicForm.course_name}
              onChange={handleAcademicChange}
              required
              placeholder="데이터베이스, 운영체제, 네트워크"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            학점
            <input
              name="credit"
              value={academicForm.credit}
              onChange={handleAcademicChange}
              placeholder="3"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            성적
            <input
              name="grade"
              value={academicForm.grade}
              onChange={handleAcademicChange}
              placeholder="A+"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            학기
            <input
              name="semester"
              value={academicForm.semester}
              onChange={handleAcademicChange}
              placeholder="2025-1"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            매핑 역량
            <input
              name="skill_mapping"
              value={academicForm.skill_mapping}
              onChange={handleAcademicChange}
              placeholder="DB, SQL, 운영체제"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!privacyConsent}
            className="h-11 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            성적/수업 기록 저장
          </button>
        </div>
      </form>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-500">저장된 Evidence</h3>
        {evidenceRows.length ? (
          <ul className="mt-3 grid gap-3">
            {evidenceRows.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    [{evidenceTypeLabels[item.type]}] {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {item.evidence_text}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    역량: {item.skills.join(", ") || "미지정"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteEvidence(item.id)}
                  className="h-8 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-500 transition hover:text-red-600"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            아직 저장된 Evidence가 없습니다.
          </p>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-500">저장된 성적/수업 기록</h3>
        {academicRows.length ? (
          <ul className="mt-3 grid gap-3">
            {academicRows.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm font-semibold text-slate-950">
                  {item.course_name} {item.grade ? `(${item.grade})` : ""}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {item.semester || "학기 미입력"} / {item.credit ?? "-"}학점
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  역량: {item.skill_mapping.join(", ") || "미지정"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            아직 저장된 성적/수업 기록이 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}

function EmptyResult() {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-700">입력 대기 중</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        학과, 학년, 목표 진로, 보유 기술, 프로젝트 경험을 입력하면 분석 결과가
        표시됩니다.
      </p>
    </div>
  );
}

function RoadmapChatPanel({
  profile,
  analysis,
}: {
  profile: UserProfile;
  analysis: CareerAnalysis;
}) {
  const [messages, setMessages] = useState<RoadmapChatMessage[]>([
    {
      role: "assistant",
      content:
        "분석 결과를 바탕으로 로드맵을 상담해드릴게요. 어떤 역량부터 준비할지, 이번 주에 무엇을 만들지 물어보세요.",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const suggestions = [
    "이번 주에 뭘 먼저 해야 해?",
    "내 부족 역량 중 우선순위 정해줘",
    "공기업 전산직 포트폴리오 주제 추천해줘",
  ];

  async function sendQuestion(nextQuestion = question) {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion || isSending) {
      return;
    }

    const nextMessages: RoadmapChatMessage[] = [
      ...messages,
      { role: "user", content: cleanQuestion },
    ];
    setMessages(nextMessages);
    setQuestion("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch("/api/roadmap-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuestion,
          profile,
          analysis,
          messages,
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as {
          detail?: string;
          error?: string;
        } | null;
        throw new Error(errorPayload?.detail || errorPayload?.error || "request_failed");
      }

      const payload = (await response.json()) as { answer?: string };
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            payload.answer ??
            "답변을 만들지 못했습니다. 로드맵의 부족 역량과 다음 액션을 기준으로 다시 질문해 주세요.",
        },
      ]);
    } catch {
      setError("로드맵 상담 답변을 가져오지 못했습니다.");
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            "지금은 기본 상담으로 안내할게요. 가장 먼저 추천 공고의 보완 역량 1개를 고르고, 1주 안에 README나 1페이지 보고서로 남길 수 있는 작은 산출물을 만드세요.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-emerald-800">
          로드맵 상담 챗봇
        </p>
        <p className="text-sm leading-6 text-emerald-900">
          알리오 공고 분석 결과와 4주 로드맵을 기준으로 다음 행동을 상담합니다.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => sendQuestion(item)}
            disabled={isSending}
            className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 grid max-h-80 gap-3 overflow-y-auto pr-1">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-md p-3 text-sm leading-6 ${
              message.role === "user"
                ? "ml-8 bg-emerald-700 text-white"
                : "mr-8 bg-white text-slate-800"
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              sendQuestion();
            }
          }}
          placeholder="예: 2주차 로드맵을 더 구체적으로 짜줘"
          className="min-w-0 flex-1 rounded-md border border-emerald-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="button"
          onClick={() => sendQuestion()}
          disabled={!question.trim() || isSending}
          className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSending ? "상담 중" : "전송"}
        </button>
      </div>
    </div>
  );
}

function AISummaryCard({ summary }: { summary: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-700">AI 종합 요약</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
        {summary}
      </p>
    </div>
  );
}

function TotalScoreCard({ score }: { score: number }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">총점</p>
          <p className="mt-1 text-3xl font-bold text-emerald-950">
            {score}
            <span className="text-base font-semibold text-emerald-700"> / 100</span>
          </p>
        </div>
        <p className="text-right text-sm leading-6 text-emerald-800">
          입력 근거와 공고 요구역량을 기준으로 계산했습니다.
        </p>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-emerald-700 transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function JobRecommendationList({
  recommendations,
}: {
  recommendations: CareerAnalysis["jobRecommendations"];
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">
        공고 추천 및 역량 기반 예상 적합도
      </p>
      <div className="mt-3 grid gap-3">
        {recommendations.map((job) => (
          <section key={job.posting.id} className="rounded-md bg-white p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-500">
                    {job.posting.organization}
                  </p>
                  <ApiStatusBadge status={job.posting.sourceStatus} />
                </div>
                <h3 className="mt-1 text-base font-semibold text-slate-950">
                  {job.posting.title}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  출처: {job.posting.source}
                </p>
              </div>
              <p className="text-lg font-bold text-emerald-700">
                {job.estimatedPassRate}점
              </p>
            </div>
            <dl className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
              <div>
                <dt className="font-semibold text-slate-700">공고 상태</dt>
                <dd>
                  {job.posting.sourceStatus === "DEMO"
                    ? "실제 API 데이터가 아닌 데모 공고입니다."
                    : "외부 공고 API에서 가져온 LIVE 공고입니다."}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">매칭 역량</dt>
                <dd>{job.matchedSkills.join(", ") || "확인된 항목 없음"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">보완 역량</dt>
                <dd>{job.missingSkills.join(", ") || "큰 공백 없음"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">추천 자격증</dt>
                <dd>{job.recommendedCertificates.join(", ")}</dd>
              </div>
            </dl>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
              {job.boostRoutine.slice(0, 2).map((routine) => (
                <li key={routine}>- {routine}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function ApiStatusBadge({ status }: { status: "DEMO" | "LIVE" }) {
  const isLive = status === "LIVE";

  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-bold ${
        isLive
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {status}
    </span>
  );
}

function TopCareerList({
  careers,
}: {
  careers: CareerAnalysis["topCareers"];
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">추천 진로 TOP 3</p>
      <ol className="mt-3 grid gap-3">
        {careers.map((career, index) => (
          <li key={`${career.name}-${index}`} className="rounded-md bg-white p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  TOP {index + 1}
                </p>
                <p className="mt-1 text-base font-semibold text-slate-950">
                  {career.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {career.reason}
                </p>
              </div>
              <p className="text-lg font-bold text-emerald-700">
                {career.fitScore}점
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ScoreBreakdown({
  scoreDetails,
}: {
  scoreDetails: CareerAnalysis["scoreDetails"];
}) {
  const statusClass = {
    good: "bg-emerald-100 text-emerald-700",
    watch: "bg-amber-100 text-amber-700",
    needsWork: "bg-red-100 text-red-700",
  };
  const statusLabel = {
    good: "좋음",
    watch: "보완",
    needsWork: "주의",
  };

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">항목별 점수</p>
      <div className="mt-3 grid gap-3">
        {scoreDetails.map((item) => {
          const percent = item.maxScore ? Math.round((item.score / item.maxScore) * 100) : 0;

          return (
            <section key={item.key} className="rounded-md bg-white p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {item.label}
                    </h3>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass[item.status]}`}>
                      {statusLabel[item.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.reason}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-bold text-slate-950">
                  {item.score} / {item.maxScore}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-700"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                보완 팁: {item.nextStep}
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ResultList({
  label,
  items,
  tone = "default",
}: {
  label: string;
  items: string[];
  tone?: "default" | "good" | "warn";
}) {
  const markerClass =
    tone === "good"
      ? "bg-emerald-600"
      : tone === "warn"
        ? "bg-amber-500"
        : "bg-slate-400";

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <ul className="mt-2 grid gap-2 text-base leading-7 text-slate-900">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span
              className={`mt-3 h-1.5 w-1.5 shrink-0 rounded-full ${markerClass}`}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionChecklist({ items }: { items: string[] }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">다음 액션 플랜</p>
      <ul className="mt-3 grid gap-3">
        {items.map((item, index) => (
          <li key={item} className="flex gap-3 rounded-md bg-white p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-700">
              {index + 1}
            </span>
            <span className="text-sm leading-6 text-slate-900">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoadmapList({
  roadmap,
}: {
  roadmap: CareerAnalysis["roadmap"];
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">4주 성장 로드맵</p>
      <div className="mt-3 grid gap-3">
        {roadmap.map((week) => (
          <section key={week.week} className="rounded-md bg-white p-3">
            <h3 className="text-sm font-semibold text-slate-950">
              {week.week}주차: {week.title}
            </h3>
            <ul className="mt-2 grid gap-1 text-sm leading-6 text-slate-600">
              {week.actions.map((action) => (
                <li key={action}>- {action}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function SystemRiskList({
  risks,
}: {
  risks: CareerAnalysis["systemRisks"];
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">
        시스템 예상 문제점과 해결책
      </p>
      <div className="mt-3 grid gap-3">
        {risks.map((risk) => (
          <section key={risk.risk} className="rounded-md bg-white p-3">
            <h3 className="text-sm font-semibold text-slate-950">{risk.risk}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{risk.cause}</p>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              해결책: {risk.mitigation}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
