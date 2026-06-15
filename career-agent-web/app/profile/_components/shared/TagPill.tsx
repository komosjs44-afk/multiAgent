"use client";

type TagPillProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
};

export default function TagPill({ label, selected, onClick }: TagPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[var(--lime)] ${
        selected
          ? "border-[var(--navy)] bg-[var(--navy)] text-white"
          : "border-[var(--line)] bg-white text-slate-700 hover:border-[var(--navy)]/40"
      }`}
    >
      {selected ? "✓ " : ""}{label}
    </button>
  );
}
