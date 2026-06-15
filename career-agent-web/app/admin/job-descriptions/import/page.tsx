"use client";

import Link from "next/link";
import { useState } from "react";

type ImportResult = {
  totalRows: number;
  inserted: number;
  skippedDuplicates: number;
  failed: number;
  errors: string[];
};

export default function ImportJobDescriptionsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [message, setMessage] = useState("CSV 파일을 선택해주세요.");

  async function uploadCsv() {
    if (!file) {
      setMessage("업로드할 CSV 파일이 없습니다.");
      return;
    }

    setLoading(true);
    setMessage("CSV를 검증하고 있습니다.");
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/job-descriptions/import", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();

    if (!payload.ok) {
      setMessage(payload.error?.message ?? "CSV 가져오기에 실패했습니다.");
      setLoading(false);
      return;
    }

    setResult(payload.data);
    setMessage("CSV 가져오기가 완료되었습니다.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-4 py-8 text-[var(--ink)]">
      <section className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm">
          <Link href="/admin/job-descriptions" className="text-sm font-bold text-[var(--muted)]">
            ← 직무기술서 관리로 돌아가기
          </Link>
          <h1 className="mt-4 text-3xl font-black">CSV 직무기술서 가져오기</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            중복 기준은 기관명 + 공고명 + 직무분야입니다. 이미 존재하는 행은 건너뜁니다.
          </p>
        </div>

        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm">
          <label className="block text-sm font-bold">CSV 파일</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-3 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm"
          />
          <button
            type="button"
            onClick={uploadCsv}
            disabled={loading}
            className="mt-4 rounded-full bg-[var(--lime)] px-5 py-3 text-sm font-bold text-[var(--navy)] disabled:opacity-50"
          >
            {loading ? "가져오는 중..." : "CSV 가져오기"}
          </button>
          <p className="mt-3 text-sm font-semibold text-[var(--muted)]">{message}</p>
        </div>

        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">필수 컬럼</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            company_name, recruit_title, job_field 컬럼은 반드시 필요합니다.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-[var(--paper)] p-4 text-xs">
{`company_name,recruit_title,job_field,description,required_skills,qualifications,source,source_url
한국전력공사,전산직 직무기술서,전산,전력 IT 시스템 운영,SQL|Linux|네트워크,정보처리기사,manual,https://example.com`}
          </pre>
        </div>

        {result ? (
          <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black">가져오기 결과</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <Stat label="전체 행" value={result.totalRows} />
              <Stat label="추가됨" value={result.inserted} />
              <Stat label="중복 제외" value={result.skippedDuplicates} />
              <Stat label="실패" value={result.failed} />
            </div>
            {result.errors.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-red-600">
                {result.errors.slice(0, 10).map((error) => (
                  <li key={error}>- {error}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] p-4">
      <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
