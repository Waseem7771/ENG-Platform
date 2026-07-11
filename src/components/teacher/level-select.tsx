"use client";

import type { Level } from "@/types";
import { cn } from "@/lib/utils";

const LEVELS: { value: Level; label: string }[] = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
];

const ACTIVE_STYLES: Record<Level, string> = {
  BEGINNER: "border-leaf bg-leaf-soft text-leaf-text",
  INTERMEDIATE: "border-sun-deep/30 bg-sun-soft text-sun-deep",
  ADVANCED: "border-primary/40 bg-secondary text-primary",
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
              : "border-border bg-muted text-muted-foreground hover:border-line-strong hover:text-foreground"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
