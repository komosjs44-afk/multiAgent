"use client";

import { useId, type ReactNode } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "wide";
};

export default function Modal({ isOpen, onClose, title, children, footer, size = "default" }: Props) {
  const titleId = useId();

  if (!isOpen) return null;

  const widthClass = size === "wide" ? "sm:max-w-[60rem]" : "sm:max-w-lg";
  const rowClass = footer
    ? "grid-rows-[auto_minmax(0,1fr)_auto]"
    : "grid-rows-[auto_minmax(0,1fr)]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className={`grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] gap-5 overflow-hidden rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem] ${widthClass} ${rowClass}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex min-w-0 items-center justify-between gap-4">
          <h3 id={titleId} className="text-lg font-extrabold text-[var(--ink)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="grid min-h-0 min-w-0 gap-4 overflow-x-hidden overflow-y-auto pr-1 [&_*]:min-w-0">
          {children}
        </div>
        {footer ? (
          <div className="flex min-w-0 flex-wrap justify-end gap-3 border-t border-[var(--line)] pt-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
