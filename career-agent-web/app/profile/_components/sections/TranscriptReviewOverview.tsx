import type { ExtractedEvidence, TranscriptDiff } from "@/types/career";

type Props = {
  fileName?: string;
  notice?: { message: string; type: "success" | "error" } | null;
  courseCount: number;
  needsReviewCount: number;
  summary?: ExtractedEvidence["summary"];
  stage: "review" | "saved";
  diff?: TranscriptDiff | null;
  gpa: string;
  onGpaChange: (value: string) => void;
  sourceUrl?: string;
  extractionMethod?: "pdf-text" | "ocr";
};

export default function TranscriptReviewOverview({
  fileName,
  notice,
  courseCount,
  needsReviewCount,
  summary,
  stage,
  diff,
  gpa,
  onGpaChange,
  sourceUrl,
  extractionMethod,
}: Props) {
  const creditMismatch =
    summary?.declaredTotalCredits != null &&
    summary.calculatedTotalCredits != null &&
    summary.declaredTotalCredits !== summary.calculatedTotalCredits;

  return (
    <>
      {notice ? (
        <p
          className={`break-keep rounded-2xl px-4 py-2 text-xs font-bold [overflow-wrap:anywhere] ${
            notice.type === "error"
              ? "bg-amber-50 text-amber-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {notice.message}
        </p>
      ) : fileName ? (
        <p className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
          {fileName}에서 {courseCount}개 과목을 추출했습니다. 저장 전에 확인해주세요.
        </p>
      ) : null}

      {needsReviewCount > 0 ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
          자동 보정, 형식 오류 또는 공식 합계 불일치가 있는 {needsReviewCount}개 과목을 확인해주세요.
        </p>
      ) : null}

      {stage === "saved" && diff ? (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
          <p className="text-xs font-extrabold text-[var(--ink)]">최종 저장 요약 · 이전 성적표와 비교</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-bold text-slate-600 sm:grid-cols-5">
            <DiffChip label={`신규 ${diff.addedCount}개`} tone="good" />
            <DiffChip label={`변경 ${diff.changedCount}개`} tone="warn" />
            <DiffChip label={`삭제 ${diff.removedCount}개`} tone="danger" />
            <DiffChip label={`GPA ${diff.previousGpa ?? "-"} → ${diff.newGpa ?? "-"}`} />
            <DiffChip label={`학점 ${diff.previousCredits ?? "-"} → ${diff.newCredits ?? "-"}`} />
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="공식 총 취득학점" value={formatNumber(summary?.declaredTotalCredits)} />
        <SummaryCard
          label="과목 합산 학점"
          value={formatNumber(summary?.calculatedTotalCredits)}
          tone={creditMismatch ? "warn" : "default"}
        />
        <SummaryCard
          label="공식 누적평점"
          value={formatGpa(summary?.declaredGpa, summary?.gpaScale)}
        />
        <SummaryCard
          label="과목 계산 평점"
          value={formatGpa(summary?.calculatedGpa, summary?.gpaScale)}
        />
        <SummaryCard label="백분위" value={formatNumber(summary?.percentile)} />
        <SummaryCard
          label={extractionMethod === "ocr" ? "OCR 신뢰도" : "PDF 텍스트 신뢰도"}
          value={summary ? `${summary.confidencePercent}% · ${summary.courseCount}과목` : "-"}
          tone={summary && summary.confidencePercent < 80 ? "warn" : "default"}
        />
      </div>

      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-500">
          최종 확인 GPA (저장값, 직접 수정 가능)
        </span>
        <input
          value={gpa}
          onChange={(event) => onGpaChange(event.target.value)}
          placeholder="3.69"
          inputMode="decimal"
          className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--navy)]"
        />
      </label>

      {sourceUrl ? (
        <details className="rounded-2xl border border-[var(--line)] bg-white">
          <summary className="cursor-pointer px-4 py-3 text-xs font-extrabold text-[var(--ink)]">
            원본 PDF와 추출 결과 대조하기
          </summary>
          <iframe
            src={sourceUrl}
            title="업로드한 성적표 PDF 원본"
            className="h-[32rem] w-full border-t border-[var(--line)]"
          />
        </details>
      ) : null}
    </>
  );
}

function formatNumber(value?: number | null) {
  return value == null ? "-" : String(value);
}

function formatGpa(value?: number | null, scale = 4.5) {
  return value == null ? "-" : `${value} / ${scale}`;
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--line)] px-3 py-2 ${
        tone === "warn" ? "bg-amber-50" : "bg-white"
      }`}
    >
      <p className="text-xs font-bold text-slate-600">{label}</p>
      <p className="mt-0.5 text-sm font-extrabold text-[var(--ink)]">{value}</p>
    </div>
  );
}

function DiffChip({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "good" | "warn" | "danger";
}) {
  const toneClass = {
    default: "bg-slate-50",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-600",
  }[tone];
  return <span className={`rounded-full px-2 py-1 text-center ${toneClass}`}>{label}</span>;
}
