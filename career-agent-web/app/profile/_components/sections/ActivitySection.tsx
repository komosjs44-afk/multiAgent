"use client";

import { useState } from "react";

import { deleteRecord, patchJson, postJson } from "../apiUtils";
import EmptyState from "../shared/EmptyState";
import Modal from "../shared/Modal";
import SectionCard from "../shared/SectionCard";
import type { EvidenceRecord, EvidenceRecordType } from "@/types/career";

type ActivityCategory =
  | "internship"
  | "external"
  | "club"
  | "school"
  | "study"
  | "work";

type ActivitySafeType = Extract<EvidenceRecordType, "internship" | "activity" | "study">;

type ActivityOption = {
  category: ActivityCategory;
  type: ActivitySafeType;
  label: string;
  impactLabel: string;
};

type FieldLabels = {
  title: string;
  organization: string;
  role: string;
  description: string;
  result: string;
  organizationPlaceholder: string;
  descriptionPlaceholder: string;
  resultPlaceholder: string;
};

type ActivityMeta = {
  category?: ActivityCategory;
  startDate?: string;
  endDate?: string;
  isOngoing?: boolean;
};

type Props = {
  records: EvidenceRecord[];
  onRefresh: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

type FormState = {
  type: ActivitySafeType;
  activityCategory: ActivityCategory;
  title: string;
  organization: string;
  role: string;
  skills: string;
  result: string;
  description: string;
  startDate: string;
  endDate: string;
  isOngoing: boolean;
};

const ACTIVITY_OPTIONS: ActivityOption[] = [
  { label: "인턴", type: "internship", category: "internship", impactLabel: "반영도 높음" },
  { label: "대외활동", type: "activity", category: "external", impactLabel: "반영도 중간" },
  { label: "동아리", type: "activity", category: "club", impactLabel: "반영도 중간~높음" },
  { label: "학교활동", type: "activity", category: "school", impactLabel: "반영도 중간" },
  { label: "학습/스터디", type: "study", category: "study", impactLabel: "반영도 중간~높음" },
  { label: "알바/근무경험", type: "activity", category: "work", impactLabel: "반영도 낮음" },
];

const FALLBACK_LABELS: Record<EvidenceRecordType, string> = {
  award: "수상",
  project: "프로젝트",
  certificate: "자격증",
  hackathon: "공모전",
  study: "학습/스터디",
  internship: "인턴",
  activity: "대외활동",
};

const FIELD_LABELS: Record<ActivityCategory, FieldLabels> = {
  internship: {
    title: "직무명",
    organization: "기관/회사명",
    role: "역할",
    description: "주요 업무",
    result: "성과/배운 점",
    organizationPlaceholder: "예: 한국전력공사, IT 인턴",
    descriptionPlaceholder: "맡았던 업무와 사용한 기술을 적어주세요.",
    resultPlaceholder: "성과, 개선 경험, 배운 점",
  },
  external: {
    title: "활동명",
    organization: "주관기관",
    role: "내 역할",
    description: "활동 내용",
    result: "성과/수료 여부",
    organizationPlaceholder: "예: 공공데이터 서포터즈",
    descriptionPlaceholder: "활동 주제와 수행 내용을 적어주세요.",
    resultPlaceholder: "수료, 발표, 산출물, 수상 등",
  },
  club: {
    title: "동아리명",
    organization: "소속/기관",
    role: "역할",
    description: "참여 프로젝트",
    result: "성과",
    organizationPlaceholder: "예: 한신대학교 SW중심대학사업단",
    descriptionPlaceholder: "참여한 프로젝트와 기여 내용을 적어주세요.",
    resultPlaceholder: "배포, 발표, 팀 리딩, 기능 구현 등",
  },
  school: {
    title: "활동명",
    organization: "소속",
    role: "역할",
    description: "활동 내용",
    result: "배운 점",
    organizationPlaceholder: "예: 학과, 학생회, 교내 프로그램",
    descriptionPlaceholder: "학교 안에서 수행한 활동을 적어주세요.",
    resultPlaceholder: "협업, 운영, 발표, 문제 해결 경험",
  },
  study: {
    title: "스터디명",
    organization: "학습 주제",
    role: "역할",
    description: "학습 내용",
    result: "결과물/학습 성과",
    organizationPlaceholder: "예: NCS, 정보처리기사, 네트워크",
    descriptionPlaceholder: "학습 범위와 진행 방식을 적어주세요.",
    resultPlaceholder: "정리 자료, 모의고사 점수, 자격증 준비 성과",
  },
  work: {
    title: "근무처",
    organization: "근무기간 또는 기관명",
    role: "역할",
    description: "주요 업무",
    result: "문제 해결 경험/배운 점",
    organizationPlaceholder: "예: 교내 근로, 아르바이트 근무처",
    descriptionPlaceholder: "맡은 업무와 책임 범위를 적어주세요.",
    resultPlaceholder: "문제 해결, 커뮤니케이션, 업무 개선 경험",
  },
};

const DEFAULT_OPTION = ACTIVITY_OPTIONS[0];
const EMPTY: FormState = {
  type: DEFAULT_OPTION.type,
  activityCategory: DEFAULT_OPTION.category,
  title: "",
  organization: "",
  role: "",
  skills: "",
  result: "",
  description: "",
  startDate: "",
  endDate: "",
  isOngoing: false,
};

function getOptionByCategory(category: ActivityCategory) {
  return ACTIVITY_OPTIONS.find((option) => option.category === category) ?? DEFAULT_OPTION;
}

function getOptionByType(type: EvidenceRecordType) {
  if (type === "internship") return ACTIVITY_OPTIONS[0];
  if (type === "study") return ACTIVITY_OPTIONS[4];
  return ACTIVITY_OPTIONS[1];
}

function parseActivityMeta(record: EvidenceRecord): ActivityMeta {
  const firstLine = record.evidence_text?.split("\n")[0];
  if (!firstLine?.startsWith("__activity_meta__:")) return {};

  try {
    const payload = JSON.parse(firstLine.replace("__activity_meta__:", "")) as ActivityMeta;
    return payload;
  } catch {
    return {};
  }
}

function isActivityCategory(value: unknown): value is ActivityCategory {
  return (
    value === "internship" ||
    value === "external" ||
    value === "club" ||
    value === "school" ||
    value === "study" ||
    value === "work"
  );
}

function stripActivityMeta(value: string | null) {
  return (value ?? "")
    .split("\n")
    .filter((line) => !line.startsWith("__activity_meta__:"))
    .join("\n")
    .trim();
}

function getDisplayOption(record: EvidenceRecord) {
  const meta = parseActivityMeta(record);
  return isActivityCategory(meta.category)
    ? getOptionByCategory(meta.category)
    : getOptionByType(record.type);
}

function formatMonth(value?: string) {
  return value ? value.replace("-", ".") : "";
}

function formatPeriod(meta: ActivityMeta) {
  const start = formatMonth(meta.startDate);
  const end = meta.isOngoing ? "진행중" : formatMonth(meta.endDate);

  if (start && end) return `${start} ~ ${end}`;
  if (start) return `${start} ~`;
  if (end) return `~ ${end}`;
  return "";
}

function buildEvidenceText(form: FormState) {
  const meta: ActivityMeta = {
    category: form.activityCategory,
    startDate: form.startDate || undefined,
    endDate: form.isOngoing ? undefined : form.endDate || undefined,
    isOngoing: form.isOngoing,
  };

  return [
    `__activity_meta__:${JSON.stringify(meta)}`,
    form.title.trim(),
    form.organization.trim(),
    formatPeriod(meta),
    form.role.trim(),
    form.description.trim(),
    form.result.trim(),
    form.skills.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

export default function ActivitySection({ records, onRefresh, onToast }: Props) {
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EvidenceRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const selectedOption = getOptionByCategory(form.activityCategory);
  const labels = FIELD_LABELS[form.activityCategory];

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(record: EvidenceRecord) {
    const option = getDisplayOption(record);
    const meta = parseActivityMeta(record);

    setEditTarget(record);
    setForm({
      type: option.type,
      activityCategory: option.category,
      title: record.title,
      organization: record.organization ?? "",
      role: record.role ?? "",
      skills: (record.skills ?? []).join(", "),
      result: record.result ?? "",
      description: record.description ?? stripActivityMeta(record.evidence_text),
      startDate: meta.startDate ?? "",
      endDate: meta.endDate ?? "",
      isOngoing: Boolean(meta.isOngoing),
    });
    setOpen(true);
  }

  function selectOption(option: ActivityOption) {
    setForm((current) => ({
      ...current,
      type: option.type,
      activityCategory: option.category,
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) return;

    setSaving(true);
    try {
      const payload = {
        type: form.type,
        activity_category: form.activityCategory,
        title: form.title.trim(),
        organization: form.organization,
        role: form.role,
        skills: form.skills,
        result: form.result,
        description: form.description,
        evidence_text: buildEvidenceText(form),
      };

      if (editTarget) {
        await patchJson("/api/evidence-records", { id: editTarget.id, ...payload });
      } else {
        await postJson("/api/evidence-records", payload);
      }
      onRefresh();
      onToast(editTarget ? "경험을 수정했습니다." : "경험을 추가했습니다.", "success");
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
      onToast("삭제했습니다.", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "삭제 실패", "error");
    } finally {
      setConfirmId(null);
    }
  }

  return (
    <>
      <SectionCard
        title="인턴·활동 경험"
        count={records.length}
        onAdd={openAdd}
        addLabel="경험 추가"
      >
        {records.length === 0 ? (
          <EmptyState
            message="인턴, 대외활동, 동아리, 학교활동, 스터디 경험을 추가하면 직무 적합도에 반영됩니다."
            onAdd={openAdd}
            addLabel="+ 경험 추가"
          />
        ) : (
          <div className="grid gap-3">
            {records.map((record) => {
              const option = getDisplayOption(record);
              const period = formatPeriod(parseActivityMeta(record));

              return (
                <div
                  key={record.id}
                  className="rounded-2xl border border-[var(--line)] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[var(--lime-soft)] px-2 py-0.5 text-xs font-bold text-[var(--navy)]">
                          {option.label}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                          {option.impactLabel}
                        </span>
                        <h3 className="truncate font-extrabold text-[var(--ink)]">
                          {record.title}
                        </h3>
                      </div>
                      {record.organization ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {record.organization}
                          {record.role ? ` · ${record.role}` : ""}
                        </p>
                      ) : null}
                      {period ? (
                        <p className="mt-1 text-xs font-bold text-slate-400">{period}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(record)}
                        className="text-xs font-bold text-slate-400 hover:text-[var(--navy)]"
                      >
                        수정
                      </button>
                      {confirmId === record.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleDelete(record.id)}
                            className="text-xs font-bold text-red-600"
                          >
                            확인
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            className="text-xs text-slate-400"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(record.id)}
                          className="text-xs font-bold text-red-400 hover:text-red-600"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  {record.skills?.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {record.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {record.description ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                      {record.description}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editTarget ? "경험 수정" : "경험 추가"}
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="btn-light">
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="btn-dark disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </>
        }
      >
        <div className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">유형</span>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_OPTIONS.map((option) => (
              <button
                key={option.category}
                type="button"
                onClick={() => selectOption(option)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  form.activityCategory === option.category
                    ? "bg-[var(--navy)] text-white"
                    : "border border-[var(--line)] text-slate-600 hover:border-[var(--navy)]/40"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs font-bold text-slate-400">
            저장 타입: {FALLBACK_LABELS[selectedOption.type]} · {selectedOption.impactLabel}
          </p>
        </div>

        <Input
          label={labels.title}
          value={form.title}
          onChange={(value) => setForm((current) => ({ ...current, title: value }))}
          placeholder={labels.title}
        />
        <Input
          label={labels.organization}
          value={form.organization}
          onChange={(value) =>
            setForm((current) => ({ ...current, organization: value }))
          }
          placeholder={labels.organizationPlaceholder}
        />
        <div className="grid gap-2 rounded-2xl border border-[var(--line)] p-4">
          <span className="text-xs font-extrabold text-slate-600">활동 기간</span>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              label="시작일"
              type="month"
              value={form.startDate}
              onChange={(value) =>
                setForm((current) => ({ ...current, startDate: value }))
              }
            />
            <Input
              label="종료일"
              type="month"
              value={form.endDate}
              disabled={form.isOngoing}
              onChange={(value) =>
                setForm((current) => ({ ...current, endDate: value }))
              }
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={form.isOngoing}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isOngoing: event.target.checked,
                  endDate: event.target.checked ? "" : current.endDate,
                }))
              }
              className="h-4 w-4 rounded border-[var(--line)]"
            />
            진행중
          </label>
        </div>
        <Input
          label={labels.role}
          value={form.role}
          onChange={(value) => setForm((current) => ({ ...current, role: value }))}
          placeholder={labels.role}
        />
        <label className="grid gap-1.5">
          <span className="text-xs font-extrabold text-slate-600">
            {labels.description}
          </span>
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder={labels.descriptionPlaceholder}
            rows={3}
            className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[var(--navy)]"
          />
        </label>
        <Input
          label={labels.result}
          value={form.result}
          onChange={(value) => setForm((current) => ({ ...current, result: value }))}
          placeholder={labels.resultPlaceholder}
        />
        <Input
          label="관련 역량"
          value={form.skills}
          onChange={(value) => setForm((current) => ({ ...current, skills: value }))}
          placeholder="예: 협업, Java, SQL, 문서화"
        />
      </Modal>
    </>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-extrabold text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-2xl border border-[var(--line)] px-4 text-sm outline-none focus:border-[var(--navy)] disabled:bg-slate-100 disabled:text-slate-400"
      />
    </label>
  );
}
