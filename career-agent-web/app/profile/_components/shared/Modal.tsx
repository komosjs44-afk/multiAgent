"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => dialog.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === dialog || active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const widthClass = size === "wide" ? "sm:max-w-[60rem]" : "sm:max-w-lg";
  const rowClass = footer
    ? "grid-rows-[auto_minmax(0,1fr)_auto]"
    : "grid-rows-[auto_minmax(0,1fr)]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className={`grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] gap-5 overflow-hidden rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem] ${widthClass} ${rowClass}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="flex min-w-0 items-center justify-between gap-4">
          <h3 id={titleId} className="text-lg font-extrabold text-[var(--ink)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="grid min-h-0 min-w-0 gap-4 overflow-x-hidden overflow-y-auto overscroll-contain pr-1 [&_*]:min-w-0">
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
