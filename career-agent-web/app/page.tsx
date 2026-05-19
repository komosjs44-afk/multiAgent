"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

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
  const [isLoading, setIsLoading] = useState(false);

  const hasInput = useMemo(() => hasAnyInput(profile), [profile]);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setProfile((current) => ({
      ...current,
      [name]: value,
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

    setIsLoading(true);
    setError("");
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
        throw new Error("분석 요청에 실패했습니다.");
      }

      const analysis = (await response.json()) as CareerAnalysis;
      setResult(analysis);
      setMessage("입력값을 기준으로 임시 분석 결과를 만들었습니다.");
    } catch {
      setResult(null);
      setError("분석 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setMessage("분석 실패");
    } finally {
      setIsLoading(false);
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
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
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
              <h2 className="text-xl font-semibold text-slate-950">
                결과 미리보기
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                입력값 기반 임시 결과입니다. 아직 LLM이나 Supabase와 연결되지 않았습니다.
              </p>
            </div>

            {result ? (
              <div className="grid gap-3">
                <ResultBlock
                  label="추천 진로"
                  value={result.recommendedCareer}
                />
                <ResultBlock
                  label="적합도 점수"
                  value={`${result.fitScore} / 100`}
                />
                <ResultList label="강점" items={result.strengths} />
                <ResultList label="부족한 점" items={result.gaps} />
                <ResultList label="다음 액션" items={result.nextActions} />
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

function ResultBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-base leading-7 text-slate-900">{value}</p>
    </div>
  );
}

function ResultList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <ul className="mt-2 grid gap-2 text-base leading-7 text-slate-900">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}
