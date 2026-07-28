"use client";

import { useState } from "react";

import { deleteRecord, fetchSkillPreview, postJson, toSkillCandidates, updateEvidence } from "../apiUtils";
import EmptyState from "../shared/EmptyState";
import Modal from "../shared/Modal";
import SectionCard from "../shared/SectionCard";
import SkillCandidateReview from "../shared/SkillCandidateReview";
import type { EvidenceRecord, EvidenceSkillCandidate, EvidenceSkillRow } from "@/types/career";

type Props = {
  records: EvidenceRecord[];
  skillsByEvidenceId: Record<string, EvidenceSkillRow[]>;
  onRefresh: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

type FormState = {
  title: string;
  role: string;
  skills: string;
  description: string;
  result: string;
  organization: string;
  implementedFeatures: string;
  problemSolved: string;
  evidenceUrl: string;
  startedAt: string;
  endedAt: string;
};

const EMPTY: FormState = {
  title: "",
  role: "",
  skills: "",
  description: "",
  result: "",
  organization: "",
  implementedFeatures: "",
  problemSolved: "",
  evidenceUrl: "",
  startedAt: "",
  endedAt: "",
};

export default function ProjectSection({ records, skillsByEvidenceId, onRefresh, onToast }: Props) {
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EvidenceRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [candidates, setCandidates] = useState<EvidenceSkillCandidate[]>([]);
  const [extracting, setExtracting] = useState(false);

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY);
    setCandidates([]);
    setShowDetails(false);
    setOpen(true);
  }

  function openEdit(rec: EvidenceRecord) {
    setEditTarget(rec);
    setForm({
      title: rec.title,
      role: rec.role ?? "",
      skills: (rec.skills ?? []).join(", "),
      description: rec.description ?? "",
      result: rec.result ?? "",
      organization: rec.organization ?? "",
      implementedFeatures: rec.implemented_features ?? "",
      problemSolved: rec.problem_solved ?? "",
      evidenceUrl: rec.evidence_url ?? "",
      startedAt: rec.started_at ?? "",
      endedAt: rec.ended_at ?? "",
    });
    setCandidates(toSkillCandidates(skillsByEvidenceId[rec.id] ?? []));
    setShowDetails(Boolean(rec.implemented_features || rec.problem_solved || rec.evidence_url));
    setOpen(true);
  }

  async function extractCandidates() {
    if (!form.title.trim()) return;
    setExtracting(true);
    try {
      const result = await fetchSkillPreview({
        type: "project",
        title: form.title,
        description: form.description,
        skills: form.skills,
        role: form.role,
        implemented_features: form.implementedFeatures,
        problem_solved: form.problemSolved,
        result: form.result,
        evidence_url: form.evidenceUrl,
      });
      setCandidates(result);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "역량 후보 추출 실패", "error");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        type: "project",
        title: form.title.trim(),
        role: form.role,
        skills: form.skills,
        description: form.description,
        result: form.result,
        organization: form.organization,
        implemented_features: form.implementedFeatures,
        problem_solved: form.problemSolved,
        evidence_url: form.evidenceUrl,
        started_at: form.startedAt,
        ended_at: form.endedAt,
        confirmedSkills: candidates,
      };
      if (editTarget) {
        await updateEvidence(editTarget.id, payload);
      } else {
        await postJson("/api/evidence-records", payload);
      }
      onRefresh();
      onToast(editTarget ? "프로젝트가 수정되었습니다." : "프로젝트가 추가되었습니다.", "success");
      setOpen(false);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "저장 실패", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRecord(id);
      onRefresh();
      onToast("프로젝트가 삭제되었습니다.", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "삭제 실패", "error");
    } finally {
      setConfirmId(null);
    }
  }

  return (
    <>
      <SectionCard title="프로젝트 경험" count={records.length} onAdd={openAdd} addLabel="프로젝트 추가">
        {records.length === 0 ? (
          <EmptyState
            message="등록된 프로젝트가 없습니다. DB, 웹, AI 프로젝트 경험을 추가하면 직무 추천 정확도가 올라갑니다."
            onAdd={openAdd}
            addLabel="+ 프로젝트 추가"
          />
        ) : (
          <div className="grid gap-3">
            {records.map((rec) => (
              <ExperienceCard
                key={rec.id}
                record={rec}
                skillCount={(skillsByEvidenceId[rec.id] ?? []).length}
                confirmId={confirmId}
                onEdit={() => openEdit(rec)}
                onConfirmDelete={() => setConfirmId(rec.id)}
                onCancelDelete={() => setConfirmId(null)}
                onDelete={() => void handleDelete(rec.id)}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editTarget ? "프로젝트 수정" : "프로젝트 추가"}
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
          <span className="text-xs font-extrabold text-slate-600">제목</span>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="예) Career Agent 웹 서비스 개발"
            className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">내 역할</span>
          <input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="예) 백엔드 개발, 팀장, DB 설계"
            className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">사용 기술</span>
          <input type="text" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })}
            placeholder="예) Next.js, Supabase, SQL (쉼표로 구분)"
            className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">간단한 설명</span>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="무엇을 개발/기여했는지 간략히"
            rows={3}
            className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[var(--navy)]" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">성과/결과</span>
          <input type="text" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}
            placeholder="예) 배포 완료, 월 1,000명 사용, 수상"
            className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]" />
        </label>

        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="text-left text-xs font-bold text-[var(--navy)] underline decoration-dotted"
        >
          {showDetails ? "상세 정보 접기" : "+ 상세 정보 추가 (구현 기능, 해결한 문제, 증빙 URL, 기간)"}
        </button>

        {showDetails ? (
          <div className="grid gap-3 rounded-2xl border border-dashed border-[var(--line)] p-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-extrabold text-slate-600">구현 기능</span>
              <textarea value={form.implementedFeatures} onChange={(e) => setForm({ ...form, implementedFeatures: e.target.value })}
                placeholder="예) 로그인 API, RLS 기반 권한 분리, 관리자 대시보드"
                rows={2}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[var(--navy)]" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-extrabold text-slate-600">해결한 문제</span>
              <textarea value={form.problemSolved} onChange={(e) => setForm({ ...form, problemSolved: e.target.value })}
                placeholder="예) 기존 방식의 어떤 문제를 어떻게 해결했는지"
                rows={2}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[var(--navy)]" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-extrabold text-slate-600">증빙 URL</span>
              <input type="text" value={form.evidenceUrl} onChange={(e) => setForm({ ...form, evidenceUrl: e.target.value })}
                placeholder="예) GitHub, 배포 링크"
                className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]" />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-extrabold text-slate-600">시작일</span>
                <input type="date" value={form.startedAt} onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
                  className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]" />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-extrabold text-slate-600">종료일</span>
                <input type="date" value={form.endedAt} onChange={(e) => setForm({ ...form, endedAt: e.target.value })}
                  className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)]" />
              </label>
            </div>
          </div>
        ) : null}

        <SkillCandidateReview
          candidates={candidates}
          onChange={setCandidates}
          onRegenerate={() => void extractCandidates()}
          isRegenerating={extracting}
        />
      </Modal>
    </>
  );
}

function ExperienceCard({
  record,
  skillCount,
  confirmId,
  onEdit,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: {
  record: EvidenceRecord;
  skillCount: number;
  confirmId: string | null;
  onEdit: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const isConfirming = confirmId === record.id;
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-extrabold text-[var(--ink)] truncate">{record.title}</h3>
          {record.role ? <p className="mt-0.5 text-xs text-slate-500">{record.role}</p> : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onEdit} className="text-xs font-bold text-slate-400 hover:text-[var(--navy)]">수정</button>
          {isConfirming ? (
            <>
              <button type="button" onClick={onDelete} className="text-xs font-bold text-red-600">확인</button>
              <button type="button" onClick={onCancelDelete} className="text-xs text-slate-400">취소</button>
            </>
          ) : (
            <button type="button" onClick={onConfirmDelete} className="text-xs font-bold text-red-400 hover:text-red-600">삭제</button>
          )}
        </div>
      </div>
      {record.skills?.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {record.skills.map((s) => (
            <span key={s} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {s}
            </span>
          ))}
        </div>
      ) : null}
      {record.result ? (
        <p className="mt-2 text-xs font-bold text-emerald-700">🏆 {record.result}</p>
      ) : null}
      {record.description ? (
        <p className="mt-2 text-xs leading-5 text-slate-500 line-clamp-2">{record.description}</p>
      ) : null}
      {skillCount > 0 ? (
        <p className="mt-2 text-xs font-bold text-[var(--navy)]">확정 역량 {skillCount}개</p>
      ) : null}
    </div>
  );
}
