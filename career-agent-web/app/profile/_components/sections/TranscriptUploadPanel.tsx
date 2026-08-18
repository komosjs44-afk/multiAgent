"use client";

import type { TranscriptVersion } from "@/types/career";

type Props = {
  activeVersion: TranscriptVersion | null;
  pendingReviewVersion: TranscriptVersion | null;
  isExtracting: boolean;
  isResuming: boolean;
  onSelect: (file: File | undefined) => void;
  onResume: () => void;
  onViewDetail: () => void;
};

export default function TranscriptUploadPanel({
  activeVersion,
  pendingReviewVersion,
  isExtracting,
  isResuming,
  onSelect,
  onResume,
  onViewDetail,
}: Props) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)] p-5">
      <h3 className="text-sm font-extrabold text-[var(--ink)]">성적표 PDF</h3>

      {activeVersion ? (
        <div className="mt-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-black text-white">
              현재 적용 중
            </span>
            <span className="text-sm font-extrabold">
              {activeVersion.file_name || "파일명 미확인"}
            </span>
          </div>
          <p className="mt-1 text-xs font-bold text-emerald-700">
            {formatAcademicTerm(activeVersion.academic_term)}
          </p>
          <div className="mt-3 grid gap-2 text-xs font-bold sm:grid-cols-4">
            <Metric label={`업로드 ${formatDate(activeVersion.uploaded_at)}`} />
            <Metric label={`총 취득학점 ${activeVersion.total_credits ?? "-"}`} />
            <Metric label={`누적 GPA ${activeVersion.cumulative_gpa ?? "-"}`} />
            <Metric label={`저장 과목 ${activeVersion.total_course_count}과목`} />
          </div>
          <button
            type="button"
            onClick={onViewDetail}
            className="mt-3 rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50"
          >
            성적 상세 보기
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm leading-6 text-slate-500">
          텍스트 선택이 가능한 성적표 PDF를 올리면 학기, 과목명, 학점, 성적을 추출합니다.
          저장 전 미리보기에서 수정할 수 있습니다.
        </p>
      )}

      {pendingReviewVersion ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-bold leading-5 text-amber-800">
            검토 중인 성적표가 있습니다 ({pendingReviewVersion.file_name || "파일명 미확인"}).
            적용해야 분석과 GPA에 반영됩니다.
          </p>
          <button
            type="button"
            onClick={onResume}
            disabled={isResuming}
            className="shrink-0 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {isResuming ? "불러오는 중..." : "검토 계속하기"}
          </button>
        </div>
      ) : null}

      <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
        현재는 PDF 텍스트 레이어를 우선 사용합니다. 스캔본은 OCR 제공자가 연결되지 않아
        자동 추출하지 않고 명확한 오류를 표시합니다.
      </p>
      <label className="mt-4 inline-flex cursor-pointer rounded-full bg-[var(--navy)] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--navy-2)]">
        {isExtracting ? "추출 중..." : activeVersion ? "새 성적표 업로드" : "PDF 선택"}
        <input
          type="file"
          accept=".pdf,application/pdf"
          disabled={isExtracting}
          className="sr-only"
          onChange={(event) => {
            onSelect(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function Metric({ label }: { label: string }) {
  return <span className="rounded-full bg-white px-3 py-1.5 text-center">{label}</span>;
}

function formatAcademicTerm(term: string) {
  const match = term.match(/^(\d{4})-(\d)$/);
  return match ? `${match[1]}년 ${match[2]}학기 반영본` : term || "반영 학기 미확인";
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("ko-KR") : "-";
}
