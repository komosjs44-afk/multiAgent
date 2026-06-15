"use client";

import { useEffect } from "react";

type Props = {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
};

export default function Toast({ message, type, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-bold shadow-xl ${
        type === "success"
          ? "bg-[var(--navy)] text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {type === "success" ? "✓ " : "✕ "}{message}
    </div>
  );
}
