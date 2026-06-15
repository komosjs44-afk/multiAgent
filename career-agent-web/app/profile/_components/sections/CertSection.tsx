"use client";

import { useMemo, useState } from "react";

import { deleteRecord, postJson, updateEvidence } from "../apiUtils";
import EmptyState from "../shared/EmptyState";
import Modal from "../shared/Modal";
import SectionCard from "../shared/SectionCard";
import type { EvidenceRecord } from "@/types/career";

const PRESET_CERTS = [
  "정보처리기사",
  "SQLD",
  "컴활1급",
  "한국사1급",
  "TOPCIT",
  "정보보안기사",
  "빅데이터분석기사",
  "ADP",
];

type Props = {
  records: EvidenceRecord[];
  onRefresh: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

type FormState = { title: string; result: string; description: string };

const EMPTY_FORM: FormState = { title: "", result: "", description: "" };

export function normalizeCertificationName(value: string) {
  const compact = value.replace(/\s+/g, "").toLowerCase();
  if (compact.includes("컴활") || compact.includes("컴퓨터활용능력")) return "컴활1급";
  if (compact.includes("정보처리기사") || compact.includes("정처기")) return "정보처리기사";
  if (compact.includes("한국사")) return "한국사1급";
  if (compact.includes("sqld")) return "SQLD";
  if (compact.includes("정보보안기사")) return "정보보안기사";
  return value.trim();
}

function getStatus(record: EvidenceRecord) {
  const text = `${record.result ?? ""} ${record.description ?? ""}`;
  if (/준비|예정|공부|학습/.test(text)) return "준비중";
  if (/미취득|없음|필요/.test(text)) return "미취득";
  return "취득";
}

export default function CertSection({ records, onRefresh, onToast }: Props) {
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EvidenceRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const normalizedRecords = useMemo(() => {
    const map = new Map<string, EvidenceRecord>();
    records.forEach((record) => {
      const normalized = normalizeCertificationName(record.title);
      if (!map.has(normalized)) {
        map.set(normalized, { ...record, title: normalized });
      }
    });
    return Array.from(map.values());
  }, [records]);

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(rec: EvidenceRecord) {
    setEditTarget(rec);
    setForm({ title: rec.title, result: rec.result ?? "", description: rec.description ?? "" });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        type: "certificate",
        title: normalizeCertificationName(form.title),
        result: form.result,
        description: form.description,
        skills: ["자격증"],
      };
      if (editTarget) {
        await updateEvidence(editTarget.id, payload);
      } else {
        await postJson("/api/evidence-records", payload);
      }
      onRefresh();
      onToast("자격증이 저장되었습니다.", "success");
      setOpen(false);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "저장에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRecord(id);
      onRefresh();
      onToast("자격증을 삭제했습니다.", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "삭제에 실패했습니다.", "error");
    } finally {
      setConfirmId(null);
    }
  }

  return (
    <>
      <SectionCard title="자격증" impactLabel="자격증 · 반영률 높음" count={normalizedRecords.length} onAdd={openAdd} addLabel="자격증 추가">
        {normalizedRecords.length === 0 ? (
          <EmptyState
            message="정보처리기사, SQLD, 컴활 같은 자격증을 추가하면 공기업 전산직 적합도 계산이 더 명확해집니다."
            onAdd={openAdd}
            addLabel="+ 자격증 추가"
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {normalizedRecords.map((rec) => (
              <div key={rec.id} className="group relative">
                {confirmId === rec.id ? (
                  <div className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold">
                    <span className="text-red-700">삭제?</span>
                    <button type="button" onClick={() => void handleDelete(rec.id)} className="ml-1 text-red-600 hover:text-red-800">확인</button>
                    <button type="button" onClick={() => setConfirmId(null)} className="text-slate-400 hover:text-slate-600">취소</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--ink)]">
                    <span>{rec.title}</span>
                    <span className="text-xs text-slate-400">· {getStatus(rec)}</span>
                    <button type="button" onClick={() => openEdit(rec)} className="ml-1 text-xs text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-[var(--navy)]">수정</button>
                    <button type="button" onClick={() => setConfirmId(rec.id)} className="text-xs text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500">삭제</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editTarget ? "자격증 수정" : "자격증 추가"}
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="btn-light">취소</button>
            <button type="button" onClick={handleSave} disabled={saving || !form.title.trim()} className="btn-dark disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
          </>
        }
      >
        <div className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">자격증명</span>
          <div className="flex flex-wrap gap-2">
            {PRESET_CERTS.map((cert) => (
              <button
                key={cert}
                type="button"
                onClick={() => setForm((current) => ({ ...current, title: cert }))}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  form.title === cert
                    ? "bg-[var(--navy)] text-white"
                    : "border border-[var(--line)] text-slate-600 hover:border-[var(--navy)]/40"
                }`}
              >
                {cert}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="직접 입력"
            className="mt-1 h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]"
          />
        </div>
        <label className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">상태/점수</span>
          <input
            type="text"
            value={form.result}
            onChange={(event) => setForm((current) => ({ ...current, result: event.target.value }))}
            placeholder="취득, 준비중, 미취득"
            className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]"
          />
        </label>
      </Modal>
    </>
  );
}
