"use client";

import { useState } from "react";

import { postJson } from "../apiUtils";
import Modal from "../shared/Modal";
import SectionCard from "../shared/SectionCard";
import TagPill from "../shared/TagPill";
import type { CareerProfileRecord } from "@/types/career";

const COMPANY_TYPES = ["에너지 공기업", "교통/공항 공기업", "금융 공기업", "공단/준정부기관", "공공 IT 기관"];

const COMPANIES: Record<string, string[]> = {
  "에너지 공기업": ["한국전력공사", "한국가스공사", "한국수력원자력"],
  "교통/공항 공기업": ["인천국제공항공사", "한국철도공사", "한국공항공사"],
  "금융 공기업": ["금융결제원", "한국예탁결제원", "한국자산관리공사"],
  "공단/준정부기관": ["국민건강보험공단", "근로복지공단", "한국산업안전보건공단"],
  "공공 IT 기관": ["한국지능정보사회진흥원", "한국인터넷진흥원", "정보통신산업진흥원"],
};

const JOBS = ["전산직", "IT직", "정보통신직", "소프트웨어직", "시스템직"];

type Props = {
  profile: CareerProfileRecord | null;
  onRefresh: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

export default function GoalSection({ profile, onRefresh, onToast }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    targetCompanyType: profile?.target_company_type ?? "교통/공항 공기업",
    targetCompany: profile?.target_company ?? "",
    targetJob: profile?.target_job ?? "전산직",
  });

  function openEdit() {
    setForm({
      targetCompanyType: profile?.target_company_type ?? "교통/공항 공기업",
      targetCompany: profile?.target_company ?? "",
      targetJob: profile?.target_job ?? "전산직",
    });
    setOpen(true);
  }

  function handleTypeChange(type: string) {
    const firstCompany = COMPANIES[type]?.[0] ?? "";
    setForm((p) => ({ ...p, targetCompanyType: type, targetCompany: firstCompany }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await postJson("/api/career-profile", {
        university: profile?.university ?? "",
        major: profile?.major ?? "",
        grade: profile?.grade ?? "",
        gpa: profile?.gpa ?? null,
        target_company_type: form.targetCompanyType,
        target_company: form.targetCompany,
        target_job: form.targetJob,
        target_career: form.targetJob,
      });
      onRefresh();
      onToast("목표 설정이 저장되었습니다.", "success");
      setOpen(false);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "저장 실패", "error");
    } finally {
      setSaving(false);
    }
  }

  const hasData = profile?.target_company;

  return (
    <>
      <SectionCard title="목표 설정" onAdd={openEdit} addLabel="수정">
        {hasData ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoRow label="기관 유형" value={profile?.target_company_type || "—"} />
            <InfoRow label="목표 기관" value={profile?.target_company || "—"} />
            <InfoRow label="목표 직무" value={profile?.target_job || "—"} />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-slate-500">목표 기관과 직무를 설정하면 맞춤 역량 분석이 가능합니다.</p>
            <button type="button" onClick={openEdit} className="btn-dark">+ 목표 설정</button>
          </div>
        )}
      </SectionCard>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="목표 설정 수정"
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="btn-light">취소</button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-dark disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
          </>
        }
      >
        <div className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">기관 유형</span>
          <div className="flex flex-wrap gap-2">
            {COMPANY_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  form.targetCompanyType === t
                    ? "bg-[var(--navy)] text-white"
                    : "border border-[var(--line)] text-slate-600 hover:border-[var(--navy)]/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">목표 기관</span>
          <div className="flex flex-wrap gap-2">
            {(COMPANIES[form.targetCompanyType] ?? []).map((c) => (
              <TagPill
                key={c}
                label={c}
                selected={form.targetCompany === c}
                onClick={() => setForm((p) => ({ ...p, targetCompany: c }))}
              />
            ))}
            <input
              type="text"
              value={
                (COMPANIES[form.targetCompanyType] ?? []).includes(form.targetCompany)
                  ? ""
                  : form.targetCompany
              }
              onChange={(e) => setForm((p) => ({ ...p, targetCompany: e.target.value }))}
              placeholder="직접 입력"
              className="h-8 rounded-full border border-dashed border-[var(--line)] px-3 text-xs outline-none focus:border-[var(--navy)]"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">목표 직무</span>
          <div className="flex flex-wrap gap-2">
            {JOBS.map((j) => (
              <TagPill
                key={j}
                label={j}
                selected={form.targetJob === j}
                onClick={() => setForm((p) => ({ ...p, targetJob: j }))}
              />
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}
