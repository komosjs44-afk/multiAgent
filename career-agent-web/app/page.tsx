"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";
import { formatCareerReport } from "@/lib/reportFormatter";
import { isCareerAnalysis, validateProfile } from "@/lib/validation";
import type { CareerAnalysis, UserProfile } from "@/types/career";

const initialProfile: UserProfile = {
  major: "",
  grade: "",
  career: "",
  skills: "",
  projects: "",
  certificates: "",
};

const profileFields: Array<{
  id: keyof Pick<UserProfile, "major" | "grade" | "career" | "skills">;
  label: string;
  placeholder: string;
}> = [
  {
    id: "major",
    label: "학과",
    placeholder: "컴퓨터공학",
  },
  {
    id: "grade",
    label: "학년",
    placeholder: "3학년",
  },
  {
    id: "career",
    label: "관심 진로",
    placeholder: "공기업 전산직",
  },
  {
    id: "skills",
    label: "보유 기술",
    placeholder: "Python, SQL, React",
  },
];

function hasAnyInput(profile: UserProfile) {
  return Object.values(profile).some((value) => value.trim().length > 0);
}

function EmptyResult() {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-700">입력 대기 중</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        학과, 관심 진로, 보유 기술, 프로젝트 경험을 입력한 뒤 분석하기를
        누르면 임시 rule-based 결과가 표시됩니다.
      </p>
    </div>
  );
}

export default function Home() {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [result, setResult] = useState<CareerAnalysis | null>(null);
  const [message, setMessage] = useState("아직 분석 전입니다.");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof UserProfile, string>>
  >({});
  const [copyMessage, setCopyMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");

  const hasInput = useMemo(() => hasAnyInput(profile), [profile]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => setUserId(user?.id ?? null))
      .catch(() => setUserId(null));
  }, []);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setProfile((current) => ({
      ...current,
      [name]: value,
    }));
    setCopyMessage("");
    setFieldErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
  }

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasAnyInput(profile)) {
      setResult(null);
      setError("");
      setMessage("먼저 프로필 정보를 하나 이상 입력해주세요.");
      return;
    }

    const validation = validateProfile(profile);
    if (!validation.isValid) {
      setResult(null);
      setError("입력값을 확인해주세요.");
      setFieldErrors(validation.errors);
      setMessage("필수 입력과 학년 형식을 확인해야 합니다.");
      return;
    }

    setIsLoading(true);
    setError("");
    setFieldErrors({});
    setSaveStatus("idle");
    setMessage("입력값을 분석하고 있습니다.");

    try {
      const response = await fetch("/api/analyze-career", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          errors?: Partial<Record<keyof UserProfile, string>>;
        } | null;

        if (errorBody?.errors) {
          setFieldErrors(errorBody.errors);
        }

        throw new Error("server");
      }

      const json: unknown = await response.json();
      if (!isCareerAnalysis(json)) {
        throw new Error("invalid_response");
      }

      setResult(json);
      setCopyMessage("");
      setMessage("입력값을 기준으로 임시 분석 결과를 만들었습니다.");

      if (userId) {
        setSaveStatus("saving");
        fetch("/api/analysis-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input_profile: profile,
            analysis_result: json,
          }),
        })
          .then((res) => setSaveStatus(res.ok ? "saved" : "failed"))
          .catch(() => setSaveStatus("failed"));
      }
    } catch (err) {
      setResult(null);
      const msg = err instanceof Error ? err.message : "";
      if (msg === "invalid_response") {
        setError("서버에서 올바르지 않은 응답을 받았습니다. 잠시 후 다시 시도해주세요.");
      } else if (msg === "server") {
        setError("분석 요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
      } else {
        setError("네트워크 연결을 확인하고 다시 시도해주세요.");
      }
      setMessage("분석 실패");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopyReport() {
    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(formatCareerReport(result));
      setCopyMessage("Markdown 리포트를 클립보드에 복사했습니다.");
    } catch {
      setCopyMessage("복사에 실패했습니다. 브라우저 권한을 확인해주세요.");
    }
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
                Career Agent
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
                대학생의 진로 목표, 기술스택, 프로젝트 경험을 바탕으로 개발
                성장 전략을 제안하는 AI Agent
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  프로필 입력
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  현재는 서버 API Route에서 임시 rule-based 결과를 만듭니다.
                </p>
              </div>
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
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:border-red-500 aria-[invalid=true]:focus:ring-red-100"
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
                  placeholder="프로젝트 이름, 맡은 역할, 사용 기술을 적어주세요."
                  className="min-h-28 resize-none rounded-md border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label
                htmlFor="certificates"
                className="grid gap-2 text-sm font-medium text-slate-700"
              >
                자격증
                <input
                  id="certificates"
                  name="certificates"
                  type="text"
                  value={profile.certificates}
                  onChange={handleChange}
                  placeholder="정보처리기사 필기, SQLD 등"
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
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
                  className="h-12 w-full rounded-md bg-emerald-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                  disabled={!hasInput || isLoading}
                >
                  {isLoading ? "분석 중..." : "분석하기"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    결과 미리보기
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    입력값 기반 임시 결과입니다. 아직 LLM이나 Supabase와 연결되지 않았습니다.
                  </p>
                </div>
                {result ? (
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="h-10 w-full rounded-md border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:w-auto"
                  >
                    리포트 복사하기
                  </button>
                ) : null}
              </div>
              {saveStatus !== "idle" && (
                <p
                  className={`mt-2 text-xs font-medium ${
                    saveStatus === "saved"
                      ? "text-emerald-600"
                      : saveStatus === "failed"
                        ? "text-red-500"
                        : "text-slate-400"
                  }`}
                >
                  {saveStatus === "saving" && "저장 중..."}
                  {saveStatus === "saved" && "분석 기록이 저장되었습니다."}
                  {saveStatus === "failed" && "저장에 실패했습니다."}
                </p>
              )}
              {copyMessage ? (
                <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {copyMessage}
                </p>
              ) : null}
            </div>

            {result ? (
              <div className="grid gap-4">
                <TotalScoreCard score={result.totalScore} />
                <TopCareerList result={result} />
                <ScoreBreakdown scoreItems={result.scoreItems} />
                <ResultList label="점수 산정 이유" items={result.scoreReasons} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <ResultList label="강점" items={result.strengths} tone="good" />
                  <ResultList label="약점" items={result.gaps} tone="warn" />
                </div>
                <ActionChecklist items={result.nextActions} />
              </div>
            ) : (
              <EmptyResult />
            )}
          </section>
        </div>
      </section>
    </main>
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
            <span className="text-base font-semibold text-emerald-700">
              {" "}
              / 100
            </span>
          </p>
        </div>
        <p className="text-right text-sm leading-6 text-emerald-800">
          입력 근거를 기준으로 산정한
          <br className="hidden sm:block" /> 임시 적합도입니다.
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

function TopCareerList({ result }: { result: CareerAnalysis }) {
  const careers = [
    {
      name: result.recommendedCareer,
      score: result.totalScore,
      note: "입력한 관심 진로 기준",
    },
    {
      name: "백엔드 개발자",
      score: Math.max(45, result.totalScore - 8),
      note: "기술스택과 프로젝트 경험 기반",
    },
    {
      name: "IT 서비스 기획형 개발자",
      score: Math.max(40, result.totalScore - 14),
      note: "문제 정의와 문서화 역량 확장 후보",
    },
  ];

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">추천 진로 TOP 3</p>
      <ol className="mt-3 grid gap-3">
        {careers.map((career, index) => (
          <li
            key={`${career.name}-${index}`}
            className="flex flex-col gap-2 rounded-md bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-slate-500">
                TOP {index + 1}
              </p>
              <p className="mt-1 text-base font-semibold text-slate-950">
                {career.name}
              </p>
              <p className="mt-1 text-sm text-slate-500">{career.note}</p>
            </div>
            <p className="text-lg font-bold text-emerald-700">
              {career.score}점
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ScoreBreakdown({
  scoreItems,
}: {
  scoreItems: CareerAnalysis["scoreItems"];
}) {
  const items = [
    ["전공 적합도", scoreItems.majorFit, 20],
    ["기술스택", scoreItems.techStack, 20],
    ["프로젝트 경험", scoreItems.projectExperience, 20],
    ["자격증", scoreItems.certificates, 10],
    ["진로 명확성", scoreItems.careerClarity, 15],
    ["실행 가능성", scoreItems.actionability, 15],
  ] as const;

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">항목별 점수</p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map(([label, score, maxScore]) => (
          <div key={label} className="rounded-md bg-white p-3">
            <div className="flex items-center justify-between gap-4 text-sm">
              <dt className="font-medium text-slate-600">{label}</dt>
              <dd className="font-semibold text-slate-950">
                {score} / {maxScore}
              </dd>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${(score / maxScore) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
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
