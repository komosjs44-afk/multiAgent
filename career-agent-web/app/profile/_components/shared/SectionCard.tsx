"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  impactLabel?: string;
  count?: number;
  onAdd?: () => void;
  addLabel?: string;
  children: ReactNode;
};

export default function SectionCard({
  title,
  impactLabel,
  count,
  onAdd,
  addLabel,
  children,
}: Props) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-extrabold text-[var(--ink)]">{title}</h2>
            {count !== undefined ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                {count}
              </span>
            ) : null}
          </div>
          {impactLabel ? (
            <p className="mt-1 text-xs font-bold text-slate-400">
              {impactLabel}
            </p>
          ) : null}
        </div>
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="shrink-0 text-sm font-bold text-[var(--navy)] hover:underline"
          >
            + {addLabel ?? "추가"}
          </button>
        ) : null}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
