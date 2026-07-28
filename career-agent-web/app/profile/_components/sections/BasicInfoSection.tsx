"use client";

import { useState } from "react";

import { postJson } from "../apiUtils";
import Modal from "../shared/Modal";
import SectionCard from "../shared/SectionCard";
import type { CareerProfileRecord } from "@/types/career";

const GRADES = ["1학년", "2학년", "3학년", "4학년", "졸업"];

type Props = {
  profile: CareerProfileRecord | null;
  onRefresh: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

export default function BasicInfoSection({ profile, onRefresh, onToast }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    grade: profile?.grade ?? "",
    university: profile?.university ?? "",
    major: profile?.major ?? "",
    gpa: profile?.gpa != null ? String(profile.gpa) : "",
  });

  function openEdit() {
    setForm({
      grade: profile?.grade ?? "",
      university: profile?.university ?? "",
      major: profile?.major ?? "",
      gpa: profile?.gpa != null ? String(profile.gpa) : "",
    });
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      // 이 화면이 실제로 편집하는 필드만 보냅니다. 목표기업 등 다른 화면이 관리하는 값은
      // 서버가 기존 값을 그대로 유지합니다(부분 업데이트).
      await postJson("/api/career-profile", {
        university: form.university,
        major: form.major,
        grade: form.grade,
        gpa: form.gpa,
      });
      onRefresh();
      onToast("기본 정보가 저장되었습니다.", "success");
      setOpen(false);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "저장에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  }

  const hasData = profile?.grade || profile?.university || profile?.major;

  return (
    <>
      <SectionCard title="기본 정보" impactLabel="상황 파악 · 분석 기본값" onAdd={openEdit} addLabel="수정">
        {hasData ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="학년" value={profile?.grade ?? "-"} />
            <InfoRow label="학교" value={profile?.university || "-"} />
            <InfoRow label="전공" value={profile?.major || "-"} />
            <InfoRow label="전체 GPA" value={profile?.gpa != null ? `${profile.gpa} / 4.5` : "-"} />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-slate-500">
              처음에는 학년, 전공, 학점만 빠르게 입력해도 기본 분석을 시작할 수 있습니다.
            </p>
            <button type="button" onClick={openEdit} className="btn-dark">
              + 기본 정보 입력
            </button>
          </div>
        )}
      </SectionCard>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="기본 정보 수정"
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="btn-light">
              취소
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-dark disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
          </>
        }
      >
        <label className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">학년</span>
          <div className="flex flex-wrap gap-2">
            {GRADES.map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => setForm((current) => ({ ...current, grade }))}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  form.grade === grade
                    ? "bg-[var(--navy)] text-white"
                    : "border border-[var(--line)] text-slate-600 hover:border-[var(--navy)]/40"
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
        </label>
        <TextInput label="학교" value={form.university} onChange={(value) => setForm((current) => ({ ...current, university: value }))} placeholder="OO대학교" />
        <TextInput label="전공" value={form.major} onChange={(value) => setForm((current) => ({ ...current, major: value }))} placeholder="AI·SW학과" />
        <TextInput label="학점 (4.5 기준)" value={form.gpa} onChange={(value) => setForm((current) => ({ ...current, gpa: value }))} placeholder="3.7" type="number" />
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

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-extrabold text-slate-600">{label}</span>
      <input
        type={type}
        step={type === "number" ? "0.1" : undefined}
        min={type === "number" ? "0" : undefined}
        max={type === "number" ? "4.5" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)] focus:ring-2 focus:ring-[var(--lime-soft)]"
      />
    </label>
  );
}
