"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

import { mergeEvidenceToProfile } from "@/lib/evidenceMapper";
import { formatCareerReport } from "@/lib/reportFormatter";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isCareerAnalysis, validateProfile } from "@/lib/validation";
import type {
  CareerAnalysis,
  EvidenceAnalysisDraft,
  EvidenceDocument,
  EvidenceDocumentType,
  ExtractedEvidence,
  UserProfile,
} from "@/types/career";

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
    placeholder: "컴퓨터공학과",
  },
  {
    id: "grade",
    label: "학년",
    placeholder: "3",
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
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceDocument[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [showDraft, setShowDraft] = useState(false);
  const [draftEdits, setDraftEdits] = useState<EvidenceAnalysisDraft>({
    skills: "",
    certificates: "",
    projects: "",
  });
  const [mergeMessage, setMergeMessage] = useState("");

  const hasInput = useMemo(() => hasAnyInput(profile), [profile]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

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
      setMessage("입력값을 기준으로 rule-based 분석 결과를 만들었습니다.");

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
        setError("분석 요청에 실패했습니다. 입력값을 확인하고 다시 시도해주세요.");
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

  function handleFileAdd(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (!files) return;

    const newDocs: EvidenceDocument[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fileName: file.name,
      docType: "certificate" as EvidenceDocumentType,
      file,
    }));

    setEvidenceFiles((prev) => [...prev, ...newDocs]);
    event.target.value = "";
  }

  function handleDocTypeChange(id: string, docType: EvidenceDocumentType) {
    setEvidenceFiles((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, docType } : doc)),
    );
  }

  function handleFileRemove(id: string) {
    setEvidenceFiles((prev) => prev.filter((doc) => doc.id !== id));
  }

  async function handleExtract() {
    if (!evidenceFiles.length) return;

    setIsExtracting(true);
    setExtractError("");

    try {
      const results = await Promise.all(
        evidenceFiles.map(async (doc) => {
          const formData = new FormData();
          formData.append("file", doc.file);
          formData.append("docType", doc.docType);
          formData.append("fileName", doc.fileName);

          const response = await fetch("/api/evidence/extract", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) throw new Error("extract_failed");
          return response.json() as Promise<ExtractedEvidence>;
        }),
      );

      const allSkills = [...new Set(results.flatMap((r) => r.skills))];
      const allCerts = [...new Set(results.flatMap((r) => r.certificates))];
      const allProjects = [...new Set(results.flatMap((r) => r.projects))];

      setDraftEdits({
        skills: allSkills.join(", "),
        certificates: allCerts.join(", "),
        projects: allProjects.join("\n"),
      });
      setShowDraft(true);
    } catch {
      setExtractError("추출 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsExtracting(false);
    }
  }

  function handleDraftChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setDraftEdits((prev) => ({ ...prev, [name]: value }));
  }

  function handleMergeToProfile() {
    setProfile((prev) => mergeEvidenceToProfile(prev, draftEdits));
    setShowDraft(false);
    setEvidenceFiles([]);
    setDraftEdits({ skills: "", certificates: "", projects: "" });
    setMergeMessage("추출된 정보가 프로필에 반영되었습니다.");
    setTimeout(() => setMergeMessage(""), 3000);
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
                대학생의 진로 목표, 기술스택, 프로젝트 경험을 바탕으로 개발 성장 전략을 제안하는 AI Agent
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
                입력값은 서버 API Route에서 rule-based 방식으로 분석됩니다.
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
                  placeholder="프로젝트 이름, 맡은 역할, 사용 기술, GitHub/배포 경험을 적어주세요."
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
                    API 응답을 바탕으로 점수, 추천 진로, 로드맵을 표시합니다.
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
                <TopCareerList careers={result.topCareers} />
                <ScoreBreakdown scoreItems={result.scoreItems} />
                <ResultList label="점수 산정 이유" items={result.scoreReasons} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <ResultList label="강점" items={result.strengths} tone="good" />
                  <ResultList label="부족한 점" items={result.gaps} tone="warn" />
                </div>
                <ActionChecklist items={result.nextActions} />
                <RoadmapList roadmap={result.roadmap} />
              </div>
            ) : (
              <EmptyResult />
            )}
          </section>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-950">
              증빙서류 업로드
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              성적표, 자격증 확인서, 공모전 수상 내역, 포트폴리오를 업로드하면
              프로필 정보를 자동으로 추출합니다.
            </p>
          </div>

          <label htmlFor="evidence-upload">
            <div className="cursor-pointer rounded-md border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-emerald-400 hover:bg-slate-50">
              <p className="text-sm font-medium text-slate-600">
                파일을 클릭하여 선택
              </p>
              <p className="mt-1 text-xs text-slate-400">
                PDF, JPG, PNG 형식 지원
              </p>
            </div>
            <input
              id="evidence-upload"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="sr-only"
              onChange={handleFileAdd}
            />
          </label>

          {evidenceFiles.length > 0 && (
            <ul className="mt-4 grid gap-2">
              {evidenceFiles.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                    {doc.fileName}
                  </p>
                  <select
                    value={doc.docType}
                    onChange={(e) =>
                      handleDocTypeChange(
                        doc.id,
                        e.target.value as EvidenceDocumentType,
                      )
                    }
                    className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="transcript">성적표</option>
                    <option value="contest">공모전/해커톤 확인서</option>
                    <option value="certificate">자격증 확인서</option>
                    <option value="portfolio">포트폴리오</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleFileRemove(doc.id)}
                    aria-label={`${doc.fileName} 삭제`}
                    className="text-sm text-slate-400 transition hover:text-red-500"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {extractError && (
            <p className="mt-3 text-sm font-medium text-red-600">
              {extractError}
            </p>
          )}

          {evidenceFiles.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleExtract}
                disabled={isExtracting}
                className="h-10 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isExtracting ? "추출 중..." : "정보 추출하기"}
              </button>
            </div>
          )}
        </section>

        {showDraft && (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-950">
                추출 결과 확인
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                추출된 정보를 확인하고 수정한 뒤 프로필에 반영하세요. 기존
                입력값은 보강됩니다.
              </p>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                기술 키워드 (쉼표로 구분)
                <input
                  type="text"
                  name="skills"
                  value={draftEdits.skills}
                  onChange={handleDraftChange}
                  placeholder="Python, React, SQL"
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                자격증 (쉼표로 구분)
                <input
                  type="text"
                  name="certificates"
                  value={draftEdits.certificates}
                  onChange={handleDraftChange}
                  placeholder="정보처리기사, SQLD"
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                프로젝트/공모전 내역
                <textarea
                  name="projects"
                  value={draftEdits.projects}
                  onChange={handleDraftChange}
                  placeholder="프로젝트 이름, 역할, 기술 등"
                  className="min-h-24 resize-none rounded-md border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDraft(false)}
                  className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleMergeToProfile}
                  className="h-10 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  이 정보로 분석에 반영하기
                </button>
              </div>
            </div>
          </section>
        )}

        {mergeMessage && (
          <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {mergeMessage}
          </p>
        )}
      </section>
    </main>
  );
}

function EmptyResult() {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-700">입력 대기 중</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        학과, 관심 진로, 보유 기술, 프로젝트 경험을 입력하고 분석하기를 누르면 rule-based 결과가 표시됩니다.
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
            <span className="text-base font-semibold text-emerald-700">
              {" "}
              / 100
            </span>
          </p>
        </div>
        <p className="text-right text-sm leading-6 text-emerald-800">
          입력 근거를 기준으로 산정한
          <br className="hidden sm:block" /> rule-based 적합도입니다.
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
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-700">부족 역량:</span>{" "}
                {career.missingSkills.length
                  ? career.missingSkills.join(", ")
                  : "큰 공백 없음"}
              </p>
              <p>
                <span className="font-semibold text-slate-700">추천 액션:</span>{" "}
                {career.recommendedActions[0]}
              </p>
            </div>
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
    ["공모전 경험", scoreItems.contestExperience, 10],
    ["자격증", scoreItems.certificates, 10],
    ["진로 명확성", scoreItems.careerClarity, 10],
    ["실행 가능성", scoreItems.actionability, 10],
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
