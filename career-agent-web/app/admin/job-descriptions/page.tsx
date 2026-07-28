"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type JobDescriptionRow = {
  id: string;
  company_name?: string | null;
  recruit_title?: string | null;
  title?: string | null;
  job_field?: string | null;
  source?: string | null;
  active?: boolean | null;
  required_skills?: string[] | string | null;
  qualifications?: string[] | string | null;
  updated_at?: string | null;
};

type ApiResponse =
  | { ok: true; data: { items: JobDescriptionRow[] } }
  | { ok: false; error: { message: string } };

function toList(value: string[] | string | null | undefined) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value
    .split(/[,/|·\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminJobDescriptionsPage() {
  const [items, setItems] = useState<JobDescriptionRow[]>([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("true");
  const [status, setStatus] = useState("직무기술서 데이터를 불러오는 중입니다.");
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => {
    const search = new URLSearchParams();
    search.set("limit", "200");
    if (query.trim()) search.set("q", query.trim());
    if (active !== "all") search.set("active", active);
    return search.toString();
  }, [active, query]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/admin/job-descriptions?${params}`);
    const payload = (await response.json()) as ApiResponse;

    if (!payload.ok) {
      setStatus(payload.error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(payload.data.items);
    setStatus(`${payload.data.items.length}개 직무기술서를 불러왔습니다.`);
    setLoading(false);
  }, [params]);

  async function toggleActive(item: JobDescriptionRow) {
    const response = await fetch(`/api/admin/job-descriptions/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    const payload = await response.json();
    if (!payload.ok) {
      setStatus(payload.error?.message ?? "상태 변경에 실패했습니다.");
      return;
    }
    setStatus("직무기술서 상태를 변경했습니다.");
    await loadItems();
  }

  async function removeItem(item: JobDescriptionRow) {
    const confirmed = window.confirm(`${item.company_name ?? "기관"} 데이터를 삭제할까요?`);
    if (!confirmed) return;

    const response = await fetch(`/api/admin/job-descriptions/${item.id}`, {
      method: "DELETE",
    });
    const payload = await response.json();
    if (!payload.ok) {
      setStatus(payload.error?.message ?? "삭제에 실패했습니다.");
      return;
    }
    setStatus("직무기술서를 삭제했습니다.");
    await loadItems();
  }

  useEffect(() => {
    // 마운트 시 동기적으로 setState가 실행되지 않도록 다음 마이크로태스크로 미룹니다
    // (React Compiler의 react-hooks/set-state-in-effect 규칙 대응).
    void Promise.resolve().then(() => loadItems());
  }, [loadItems]);

  return (
    <main className="min-h-screen bg-[var(--paper)] px-4 py-8 text-[var(--ink)]">
      <section className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--muted)]">Admin</p>
            <h1 className="mt-2 text-3xl font-black">직무기술서 관리</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Supabase job_descriptions 데이터를 추천 엔진 후보로 관리합니다.
            </p>
          </div>
          <Link
            href="/admin/job-descriptions/import"
            className="rounded-full bg-[var(--lime)] px-5 py-3 text-sm font-bold text-[var(--navy)]"
          >
            CSV 가져오기
          </Link>
        </div>

        <div className="grid gap-3 rounded-[2rem] border border-[var(--line)] bg-white p-4 shadow-sm md:grid-cols-[1fr_160px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="기관명, 공고명, 직무 키워드 검색"
            className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[var(--lime)]"
          />
          <select
            value={active}
            onChange={(event) => setActive(event.target.value)}
            className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[var(--lime)]"
          >
            <option value="true">활성 데이터</option>
            <option value="false">비활성 데이터</option>
            <option value="all">전체</option>
          </select>
        </div>

        <p className="text-sm font-semibold text-[var(--muted)]">{loading ? "불러오는 중..." : status}</p>

        <div className="grid gap-4">
          {items.map((item) => {
            const skills = [...toList(item.required_skills), ...toList(item.qualifications)].slice(0, 8);
            return (
              <article
                key={item.id}
                className="rounded-[2rem] border border-[var(--line)] bg-white p-5 shadow-sm transition hover:border-[var(--lime)]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-lg">{item.company_name ?? "기관명 미등록"}</strong>
                      <span className="rounded-full bg-[var(--lime-soft)] px-3 py-1 text-xs font-bold">
                        {item.source ?? "supabase"}
                      </span>
                      <span className="rounded-full bg-[var(--paper-2)] px-3 py-1 text-xs font-bold">
                        {item.active ? "활성" : "비활성"}
                      </span>
                    </div>
                    <h2 className="mt-2 text-xl font-black">{item.recruit_title ?? item.title ?? "제목 미등록"}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">{item.job_field ?? "직무분야 미등록"}</p>
                    {skills.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {skills.map((skill) => (
                          <span key={skill} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold">
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-bold"
                    >
                      {item.active ? "비활성화" : "활성화"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
