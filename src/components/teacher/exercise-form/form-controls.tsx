"use client";

import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-foreground placeholder:text-white/20 outline-none transition-colors focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <label className="text-xs uppercase tracking-wider text-white/50">{label}</label>
        {hint && <span className="text-[11px] normal-case text-white/25">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function ItemCard({
  index,
  onRemove,
  children,
  canRemove = true,
}: {
  index: number;
  onRemove: () => void;
  children: React.ReactNode;
  canRemove?: boolean;
}) {
  return (
    <div className="relative space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-white/30">Item {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
            aria-label={`Remove item ${index + 1}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2.5 text-sm font-medium text-white/50 transition-colors hover:border-violet-500/30 hover:text-violet-300"
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export function OptionsEditor({
  options,
  answer,
  onChange,
  onAnswerChange,
  error,
}: {
  options: string[];
  answer: string;
  onChange: (options: string[]) => void;
  onAnswerChange: (answer: string) => void;
  error?: string;
}) {
  function updateOption(i: number, value: string) {
    const next = [...options];
    const prev = next[i];
    next[i] = value;
    onChange(next);
    if (answer === prev) onAnswerChange(value);
  }

  function removeOption(i: number) {
    const next = options.filter((_, idx) => idx !== i);
    onChange(next);
  }

  return (
    <Field label="Options" hint="select the radio next to the correct one" error={error}>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              checked={answer !== "" && answer === opt}
              onChange={() => onAnswerChange(opt)}
              className="h-4 w-4 shrink-0 accent-violet-500"
              aria-label={`Mark option ${i + 1} as correct`}
            />
            <input
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className={inputClass}
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="shrink-0 rounded-md p-1.5 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
                aria-label={`Remove option ${i + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <button
            type="button"
            onClick={() => onChange([...options, ""])}
            className="text-xs font-medium text-violet-300/80 transition-colors hover:text-violet-300"
          >
            + Add option
          </button>
        )}
      </div>
    </Field>
  );
}
