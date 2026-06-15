"use client";

import { useState } from "react";

import { deleteRecord, postJson } from "../apiUtils";
import Modal from "../shared/Modal";
import SectionCard from "../shared/SectionCard";
import type { CareerProfileRecord, EvidenceRecord } from "@/types/career";

type Props = {
  profile: CareerProfileRecord | null;
  langRecords: EvidenceRecord[];
  onRefresh: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

const LANG_PRESETS = ["TOEIC", "OPIc", "TOEIC Speaking", "TOEFL", "한국어능력시험"];

export default function ScoreSection({ profile, langRecords, onRefresh, onToast }: Props) {
  const [langOpen, setLangOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [langForm, setLangForm] = useState({ type: "", score: "" });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function saveLang() {
    if (!langForm.type.trim() || !langForm.score.trim()) return;
    setSaving(true);
    try {
      await postJson("/api/evidence-records", {
        type: "certificate",
        title: `${langForm.type} ${langForm.score}`,
        skills: ["어학"],
        description: "어학 점수",
      });
      onRefresh();
      onToast("어학 점수가 추가되었습니다.", "success");
      setLangForm({ type: "", score: "" });
      setLangOpen(false);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "저장 실패", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLang(id: string) {
    try {
      await deleteRecord(id);
      onRefresh();
      onToast("어학 점수가 삭제되었습니다.", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "삭제 실패", "error");
    } finally {
      setConfirmId(null);
    }
  }

  return (
    <SectionCard title="성적 및 어학" onAdd={() => setLangOpen(true)} addLabel="어학 점수 추가">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* GPA */}
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-bold text-slate-400">학점 (4.5 기준)</p>
          <p className="mt-0.5 text-xl font-extrabold text-[var(--ink)]">
            {profile?.gpa != null ? `${profile.gpa}` : "—"}
          </p>
          <p className="text-xs text-slate-400">기본 정보 섹션에서 수정</p>
        </div>

        {/* Language scores */}
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="mb-2 text-xs font-bold text-slate-400">어학 점수</p>
          {langRecords.length === 0 ? (
            <button type="button" onClick={() => setLangOpen(true)} className="text-sm font-bold text-slate-400 hover:text-[var(--navy)]">
              + 어학 점수 추가
            </button>
          ) : (
            <div className="grid gap-1.5">
              {langRecords.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--ink)]">{rec.title}</span>
                  {confirmId === rec.id ? (
                    <div className="flex gap-1 text-xs">
                      <button type="button" onClick={() => void deleteLang(rec.id)} className="font-bold text-red-600">확인</button>
                      <button type="button" onClick={() => setConfirmId(null)} className="text-slate-400">취소</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmId(rec.id)} className="text-xs text-red-400 hover:text-red-600">
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={langOpen}
        onClose={() => setLangOpen(false)}
        title="어학 점수 추가"
        footer={
          <>
            <button type="button" onClick={() => setLangOpen(false)} className="btn-light">취소</button>
            <button type="button" onClick={saveLang} disabled={saving || !langForm.type.trim() || !langForm.score.trim()} className="btn-dark disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
          </>
        }
      >
        <div className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">시험 종류</span>
          <div className="flex flex-wrap gap-2">
            {LANG_PRESETS.map((l) => (
              <button key={l} type="button"
                onClick={() => setLangForm((p) => ({ ...p, type: l }))}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  langForm.type === l ? "bg-[var(--navy)] text-white" : "border border-[var(--line)] text-slate-600 hover:border-[var(--navy)]/40"
                }`}>
                {l}
              </button>
            ))}
          </div>
          <input type="text" value={langForm.type} onChange={(e) => setLangForm((p) => ({ ...p, type: e.target.value }))}
            placeholder="직접 입력"
            className="mt-1 h-10 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]" />
        </div>
        <label className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">점수/등급</span>
          <input type="text" value={langForm.score} onChange={(e) => setLangForm((p) => ({ ...p, score: e.target.value }))}
            placeholder="예) 850, IH, 155"
            className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]" />
        </label>
      </Modal>
    </SectionCard>
  );
}
