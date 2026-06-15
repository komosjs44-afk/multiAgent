"use client";

const STEP_LABELS = ["상황 파악", "목표 설정", "스펙 현황", "경험 추가", "성적표 업로드"];

type StepProgressProps = {
  currentStep: number;
};

export default function StepProgress({ currentStep }: StepProgressProps) {
  return (
    <div className="flex items-center gap-0">
      {STEP_LABELS.map((label, index) => {
        const step = index + 1;
        const isDone = step < currentStep;
        const isActive = step === currentStep;
        return (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {index > 0 ? (
                <div className={`h-0.5 flex-1 transition-colors ${isDone || isActive ? "bg-[var(--navy)]" : "bg-[var(--line)]"}`} />
              ) : (
                <div className="flex-1" />
              )}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
                  isDone
                    ? "bg-[var(--navy)] text-[var(--lime)]"
                    : isActive
                      ? "bg-[var(--lime)] text-[var(--navy)]"
                      : "border-2 border-[var(--line)] bg-white text-slate-400"
                }`}
              >
                {isDone ? "✓" : step}
              </div>
              {index < STEP_LABELS.length - 1 ? (
                <div className={`h-0.5 flex-1 transition-colors ${isDone ? "bg-[var(--navy)]" : "bg-[var(--line)]"}`} />
              ) : (
                <div className="flex-1" />
              )}
            </div>
            <span className={`mt-1.5 hidden text-xs font-semibold sm:block ${isActive ? "text-[var(--navy)]" : "text-slate-400"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
