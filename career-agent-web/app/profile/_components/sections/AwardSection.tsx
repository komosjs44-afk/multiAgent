"use client";

import { useState } from "react";

import { deleteRecord, postJson, updateEvidence } from "../apiUtils";
import EmptyState from "../shared/EmptyState";
import Modal from "../shared/Modal";
import SectionCard from "../shared/SectionCard";
import type { EvidenceRecord } from "@/types/career";

type Props = {
  records: EvidenceRecord[];
  onRefresh: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

type FormState = { title: string; organization: string; role: string; skills: string; result: string; description: string };
const EMPTY: FormState = { title: "", organization: "", role: "", skills: "", result: "", description: "" };

export default function AwardSection({ records, onRefresh, onToast }: Props) {
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EvidenceRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function openAdd() { setEditTarget(null); setForm(EMPTY); setOpen(true); }

  function openEdit(rec: EvidenceRecord) {
    setEditTarget(rec);
    setForm({ title: rec.title, organization: rec.organization ?? "", role: rec.role ?? "",
      skills: (rec.skills ?? []).join(", "), result: rec.result ?? "", description: rec.description ?? "" });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = { type: "award", title: form.title.trim(), organization: form.organization,
        role: form.role, skills: form.skills, result: form.result, description: form.description };
      if (editTarget) {
        await updateEvidence(editTarget.id, payload);
      } else {
        await postJson("/api/evidence-records", payload);
      }
      onRefresh();
      onToast(editTarget ? "공모전 정보가 수정되었습니다." : "공모전이 추가되었습니다.", "success");
      setOpen(false);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "저장 실패", "error");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRecord(id);
      onRefresh();
      onToast("삭제되었습니다.", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "삭제 실패", "error");
    } finally { setConfirmId(null); }
  }

  return (
    <>
      <SectionCard title="공모전 및 수상" count={records.length} onAdd={openAdd} addLabel="공모전/수상 추가">
        {records.length === 0 ? (
          <EmptyState
            message="등록된 공모전/수상 이력이 없습니다. 해커톤, 경진대회 경험을 추가하면 역량 평가에 반영됩니다."
            onAdd={openAdd}
            addLabel="+ 공모전/수상 추가"
          />
        ) : (
          <div className="grid gap-3">
            {records.map((rec) => (
              <div key={rec.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-[var(--ink)] truncate">{rec.title}</h3>
                    {rec.organization ? <p className="mt-0.5 text-xs text-slate-400">{rec.organization}</p> : null}
                    {rec.role ? <p className="text-xs text-slate-500">{rec.role}</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => openEdit(rec)} className="text-xs font-bold text-slate-400 hover:text-[var(--navy)]">수정</button>
                    {confirmId === rec.id ? (
                      <>
                        <button type="button" onClick={() => void handleDelete(rec.id)} className="text-xs font-bold text-red-600">확인</button>
                        <button type="button" onClick={() => setConfirmId(null)} className="text-xs text-slate-400">취소</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setConfirmId(rec.id)} className="text-xs font-bold text-red-400 hover:text-red-600">삭제</button>
                    )}
                  </div>
                </div>
                {rec.skills?.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {rec.skills.map((s) => (
                      <span key={s} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{s}</span>
                    ))}
                  </div>
                ) : null}
                {rec.result ? <p className="mt-2 text-xs font-bold text-emerald-700">🏆 {rec.result}</p> : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editTarget ? "공모전/수상 수정" : "공모전/수상 추가"}
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="btn-light">취소</button>
            <button type="button" onClick={handleSave} disabled={saving || !form.title.trim()} className="btn-dark disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
          </>
        }
      >
        <label className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">대회명</span>
          <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="예) 공개SW 개발자 대회"
            className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">주관 기관</span>
          <input type="text" value={form.organization} onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
            placeholder="예) 과학기술정보통신부"
            className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">사용 기술</span>
          <input type="text" value={form.skills} onChange={(e) => setForm((p) => ({ ...p, skills: e.target.value }))}
            placeholder="예) Python, Flask, RAG (쉼표로 구분)"
            className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">수상/결과</span>
          <input type="text" value={form.result} onChange={(e) => setForm((p) => ({ ...p, result: e.target.value }))}
            placeholder="예) 장려상, 본선 진출, 수상"
            className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">내용 설명</span>
          <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="어떤 아이디어로, 무엇을 구현했는지" rows={3}
            className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[var(--navy)]" />
        </label>
      </Modal>
    </>
  );
}
