"use client";

type SelectCardProps = {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  icon?: string;
};

export default function SelectCard({ label, description, selected, onClick, icon }: SelectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border-2 p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[var(--lime)] ${
        selected
          ? "border-[var(--navy)] bg-[var(--navy)] text-white shadow-lg"
          : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--navy)]/40 hover:shadow-sm"
      }`}
    >
      {icon ? <span className="mb-2 block text-2xl">{icon}</span> : null}
      <span className="block text-sm font-extrabold">{label}</span>
      {description ? (
        <span className={`mt-1 block text-xs leading-5 ${selected ? "text-white/70" : "text-slate-500"}`}>
          {description}
        </span>
      ) : null}
    </button>
  );
}
