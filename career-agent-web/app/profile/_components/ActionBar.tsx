"use client";

type ActionBarProps = {
  step: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  isLoading?: boolean;
};

export default function ActionBar({
  step,
  totalSteps,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  isLoading,
}: ActionBarProps) {
  const isLast = step === totalSteps;
  const label = nextLabel ?? (isLast ? "분석 시작하기" : "다음");

  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      {step > 1 ? (
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="btn-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← 이전
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || isLoading}
        className="btn-dark disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isLoading ? "처리 중..." : label}
      </button>
    </div>
  );
}
