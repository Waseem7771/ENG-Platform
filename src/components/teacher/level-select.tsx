"use client";

import type { Level } from "@/types";
import { cn } from "@/lib/utils";

const LEVELS: { value: Level; label: string }[] = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
];

const ACTIVE_STYLES: Record<Level, string> = {
  BEGINNER: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  INTERMEDIATE: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  ADVANCED: "border-violet-500/40 bg-violet-500/15 text-violet-300",
};

export function LevelSelect({
  value,
  onChange,
  className,
}: {
  value: Level;
  onChange: (value: Level) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {LEVELS.map((l) => (
        <button
          key={l.value}
          type="button"
          onClick={() => onChange(l.value)}
          className={cn(
            "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
            value === l.value
              ? ACTIVE_STYLES[l.value]
              : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
