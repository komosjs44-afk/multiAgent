"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { postJson } from "../apiUtils";
import SectionCard from "../shared/SectionCard";
import TranscriptReviewModal from "./TranscriptReviewModal";
import TranscriptUploadPanel from "./TranscriptUploadPanel";
import useTranscriptReview from "./useTranscriptReview";
import type {
  CareerProfileRecord,
  TranscriptVersion,
} from "@/types/career";

const COMPANY_OPTIONS = [
  "한국전력공사",
  "인천국제공항공사",
  "국민건강보험공단",
  "한국도로공사",
  "코레일",
  "한국수자원공사",
  "한국가스공사",
  "근로복지공단",
];

type Props = {
  profile: CareerProfileRecord | null;
  /** active 성적표 버전 → 과목 재계산 → profile.gpa 순으로 우선순위를 매긴 표시용 GPA. */
  effectiveGpa: number | null;
  activeVersion: TranscriptVersion | null;
  pendingReviewVersion: TranscriptVersion | null;
  onRefresh: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
  /** "성적 상세 보기" 클릭 시 프로필 탭을 "학업·성적"으로 전환합니다. */
  onViewDetail: () => void;
};

function splitTargets(value?: string | null) {
  const targets = (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return [targets[0] ?? "", targets[1] ?? "", targets[2] ?? ""];
}

export default function QuickAnalysisSection({
  profile,
  effectiveGpa,
  activeVersion,
  pendingReviewVersion,
  onRefresh,
  onToast,
  onViewDetail,
}: Props) {
  const router = useRouter();
  const [targets, setTargets] = useState(() => splitTargets(profile?.target_company));
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const transcriptReview = useTranscriptReview({
    pendingReviewVersion,
    onRefresh,
    onToast,
  });
  const {
    isExtracting, isResuming, isSavingTranscript, isActivating, previewOpen, setPreviewOpen,
    modalStage, versionDiff, transcriptRows, extractedGpa, setExtractedGpa, diagnostics,
    transcriptSummary, lastFileName, sourceUrl, extractionMethod, transcriptNotice,
    updateTranscriptRow, removeTranscriptRow, addTranscriptRow, handleTranscriptSelect,
    resumeReview, saveTranscriptVersion, activateTranscriptVersion,
  } = transcriptReview;
  const visibleTargets = targets.filter(Boolean);

  // profile.target_company는 이 화면 밖(새로고침, 다른 저장 동작의 refetch)에서도 바뀔 수 있으므로,
  // 마운트 시 한 번만 초기화하는 useState 대신, 렌더 중 값이 바뀐 것을 감지하면 즉시 다시 동기화합니다.
  // (useEffect로 처리하면 한 프레임 늦게 반영되고 React Compiler가 경고하는 패턴이라, React가
  // 권장하는 "렌더 중 상태 조정" 방식을 사용합니다.)
  const [syncedTargetCompany, setSyncedTargetCompany] = useState(profile?.target_company ?? null);
  if (syncedTargetCompany !== (profile?.target_company ?? null)) {
    setSyncedTargetCompany(profile?.target_company ?? null);
    setTargets(splitTargets(profile?.target_company));
  }

  function updateTarget(index: number, value: string) {
    setTargets((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  }

  async function saveAndAnalyze() {
    if (!activeVersion && pendingReviewVersion) {
      onToast("검토 중인 성적표가 있습니다. 적용 후 분석해주세요.", "error");
      return;
    }

    setIsSaving(true);
    try {
      await postJson("/api/career-profile", {
        target_company: targets.filter(Boolean).join(", "),
      });
      onRefresh();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "목표 기업 저장에 실패했습니다.",
        "error",
      );
      setIsSaving(false);
      return;
    }
    setIsSaving(false);

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analyze-career", { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "분석 실행에 실패했습니다.");
      }
      onToast("목표 기업 기준으로 분석이 업데이트되었습니다.", "success");
      router.push("/result");
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "분석 실행에 실패했습니다.",
        "error",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <>
      <SectionCard title="빠른 분석 설정" impactLabel="목표 기업과 성적표 기반 자동 입력">
        <div className="grid gap-6">
          <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 sm:grid-cols-4">
            <SummaryField label="학년" value={profile?.grade || "-"} />
            <SummaryField label="학교" value={profile?.university || "-"} />
            <SummaryField label="전공" value={profile?.major || "-"} />
            <SummaryField label="GPA" value={effectiveGpa != null ? `${effectiveGpa} / 4.5` : "-"} />
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-extrabold text-[var(--ink)]">
                목표 기업 TOP 3
              </h3>
              {visibleTargets.length ? (
                <div className="hidden flex-wrap gap-2 sm:flex">
                  {visibleTargets.map((target, index) => (
                    <span
                      key={`${target}-${index}`}
                      className="rounded-full bg-[var(--lime-soft)] px-3 py-1 text-xs font-black text-[var(--navy)]"
                    >
                      {index + 1}순위 {target}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[0, 1, 2].map((index) => {
                const currentValue = targets[index];
                // 저장된 값이 COMPANY_OPTIONS 목록에 없으면(예: 과거에 자유 입력된 값) select에
                // 해당 옵션을 동적으로 추가해, placeholder("선택하기")로 비어 보이지 않게 합니다.
                const options =
                  currentValue && !COMPANY_OPTIONS.includes(currentValue)
                    ? [currentValue, ...COMPANY_OPTIONS]
                    : COMPANY_OPTIONS;

                return (
                  <label key={index} className="grid gap-1.5">
                    <span className="text-xs font-bold text-slate-500">
                      {index + 1}순위 목표기관
                    </span>
                    <select
                      value={currentValue}
                      onChange={(event) => updateTarget(index, event.target.value)}
                      className="h-11 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm outline-none focus:border-[var(--navy)]"
                    >
                      <option value="">선택하기</option>
                      {options.map((company) => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          </div>

          <TranscriptUploadPanel
            activeVersion={activeVersion}
            pendingReviewVersion={pendingReviewVersion}
            isExtracting={isExtracting}
            isResuming={isResuming}
            onSelect={(file) => void handleTranscriptSelect(file)}
            onResume={() => void resumeReview()}
            onViewDetail={onViewDetail}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-500">
              목표 기업을 저장하면 추천 공고와 적합도 계산에 즉시 반영됩니다.
            </p>
            <button
              type="button"
              onClick={saveAndAnalyze}
              disabled={isSaving || isAnalyzing}
              className="h-12 rounded-full bg-[var(--lime)] px-6 text-sm font-black text-[var(--navy)] transition hover:bg-[var(--lime-soft)] disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : isAnalyzing ? "분석 중..." : "저장하고 분석하기"}
            </button>
          </div>
        </div>
      </SectionCard>

      <TranscriptReviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileName={lastFileName}
        notice={transcriptNotice}
        rows={transcriptRows}
        onUpdateRow={updateTranscriptRow}
        onRemoveRow={removeTranscriptRow}
        onAddRow={() => addTranscriptRow()}
        gpa={extractedGpa}
        onGpaChange={setExtractedGpa}
        summary={transcriptSummary}
        diagnostics={diagnostics}
        sourceUrl={sourceUrl}
        extractionMethod={extractionMethod}
        stage={modalStage}
        diff={versionDiff}
        onSave={() => void saveTranscriptVersion()}
        isSaving={isSavingTranscript}
        onActivate={() => void activateTranscriptVersion()}
        isActivating={isActivating}
      />
    </>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-extrabold text-[var(--ink)]">{value}</p>
    </div>
  );
}
