"use client";

import { useState } from "react";

import CoachMessage from "../CoachMessage";
import type { ProfileWizardState, WizardExperience } from "../types";

type Props = {
  state: ProfileWizardState;
  onChange: (patch: Partial<ProfileWizardState>) => void;
};

const EMPTY_EXP: WizardExperience = {
  id: "",
  type: "project",
  title: "",
  role: "",
  skills: "",
  description: "",
  result: "",
};

type ExpType = "project" | "competition" | "intern";

const TYPE_LABELS: Record<ExpType, string> = {
  project: "프로젝트",
  competition: "공모전/대회",
  intern: "인턴/아르바이트",
};

export default function Step4Experience({ state, onChange }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WizardExperience | null>(null);

  function openAdd() {
    setEditing({ ...EMPTY_EXP, id: crypto.randomUUID() });
    setShowModal(true);
  }

  function openEdit(exp: WizardExperience) {
    setEditing({ ...exp });
    setShowModal(true);
  }

  function saveExp() {
    if (!editing) return;
    const existing = state.experiences.find((e) => e.id === editing.id);
    if (existing) {
      onChange({ experiences: state.experiences.map((e) => (e.id === editing.id ? editing : e)) });
    } else {
      onChange({ experiences: [...state.experiences, editing] });
    }
    setShowModal(false);
    setEditing(null);
  }

  function removeExp(id: string) {
    onChange({ experiences: state.experiences.filter((e) => e.id !== id) });
  }

  return (
    <div className="grid gap-6">
      <CoachMessage
        message="프로젝트, 공모전, 인턴 경험을 추가해 주세요."
        sub="경험이 없어도 괜찮습니다. 건너뛰고 분석을 시작할 수 있습니다."
      />

      <div className="grid gap-3">
        {state.experiences.map((exp) => (
          <div key={exp.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-full bg-[var(--lime-soft)] px-2 py-0.5 text-xs font-bold text-[var(--navy)]">
                    {TYPE_LABELS[exp.type as ExpType] ?? exp.type}
                  </span>
                  <h3 className="font-extrabold text-[var(--ink)] truncate">{exp.title || "(제목 없음)"}</h3>
                </div>
                {exp.role ? (
                  <p className="mt-1 text-xs text-slate-500">{exp.role}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-3">
                <button type="button" onClick={() => openEdit(exp)} className="text-xs font-bold text-slate-400 hover:text-[var(--navy)]">
                  수정
                </button>
                <button type="button" onClick={() => removeExp(exp.id)} className="text-xs font-bold text-red-400 hover:text-red-600">
                  삭제
                </button>
              </div>
            </div>
            {exp.skills ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {exp.skills.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                  <span key={s} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {s}
                  </span>
                ))}
              </div>
            ) : null}
            {exp.result ? (
              <p className="mt-2 text-xs font-bold text-emerald-700">
                🏆 {exp.result}
              </p>
            ) : null}
          </div>
        ))}

        <button
          type="button"
          onClick={openAdd}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--line)] bg-white py-5 text-sm font-bold text-slate-500 transition hover:border-[var(--navy)]/40 hover:text-[var(--navy)]"
        >
          + 경험 추가하기
        </button>
      </div>

      {showModal && editing ? (
        <ExperienceModal
          exp={editing}
          onChange={setEditing}
          onSave={saveExp}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      ) : null}
    </div>
  );
}

function ExperienceModal({
  exp,
  onChange,
  onSave,
  onClose,
}: {
  exp: WizardExperience;
  onChange: (exp: WizardExperience) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const EXP_TYPES: ExpType[] = ["project", "competition", "intern"];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-extrabold text-[var(--ink)]">경험 추가</h3>
        <div className="mt-4 grid gap-4">
          <div className="flex gap-2">
            {EXP_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onChange({ ...exp, type })}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  exp.type === type
                    ? "bg-[var(--navy)] text-white"
                    : "border border-[var(--line)] text-slate-600 hover:border-[var(--navy)]/40"
                }`}
              >
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={exp.title}
            onChange={(e) => onChange({ ...exp, title: e.target.value })}
            placeholder="제목"
            className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)] focus:ring-2 focus:ring-[var(--lime-soft)]"
          />
          <input
            type="text"
            value={exp.role}
            onChange={(e) => onChange({ ...exp, role: e.target.value })}
            placeholder="역할 (예: 백엔드 개발, 팀장)"
            className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)] focus:ring-2 focus:ring-[var(--lime-soft)]"
          />
          <input
            type="text"
            value={exp.skills}
            onChange={(e) => onChange({ ...exp, skills: e.target.value })}
            placeholder="사용 기술 (예: Python, MySQL)"
            className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)] focus:ring-2 focus:ring-[var(--lime-soft)]"
          />
          <textarea
            value={exp.description}
            onChange={(e) => onChange({ ...exp, description: e.target.value })}
            placeholder="간단한 설명"
            rows={3}
            className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[var(--navy)] focus:ring-2 focus:ring-[var(--lime-soft)]"
          />
          <input
            type="text"
            value={exp.result}
            onChange={(e) => onChange({ ...exp, result: e.target.value })}
            placeholder="성과 (예: 장려상 수상, 서비스 배포)"
            className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)] focus:ring-2 focus:ring-[var(--lime-soft)]"
          />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-light">
            취소
          </button>
          <button type="button" onClick={onSave} className="btn-dark">
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
