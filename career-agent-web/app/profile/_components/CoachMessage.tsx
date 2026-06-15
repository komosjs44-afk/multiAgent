"use client";

type CoachMessageProps = {
  message: string;
  sub?: string;
};

export default function CoachMessage({ message, sub }: CoachMessageProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-white px-5 py-4 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-lg">
        🤖
      </div>
      <div>
        <p className="text-sm font-bold text-[var(--ink)]">{message}</p>
        {sub ? <p className="mt-1 text-xs leading-5 text-slate-500">{sub}</p> : null}
      </div>
    </div>
  );
}
