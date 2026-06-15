"use client";

type Props = {
  message: string;
  onAdd?: () => void;
  addLabel?: string;
};

export default function EmptyState({ message, onAdd, addLabel }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <p className="max-w-sm text-sm leading-6 text-slate-500">{message}</p>
      {onAdd ? (
        <button type="button" onClick={onAdd} className="btn-dark">
          {addLabel ?? "+ 추가하기"}
        </button>
      ) : null}
    </div>
  );
}
