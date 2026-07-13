"use client";

import type { Level } from "@/types";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";

const LEVELS: Level[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

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
  const t = useT();
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {LEVELS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={cn(
            "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
            value === l
              ? ACTIVE_STYLES[l]
              : "border-border bg-muted text-muted-foreground hover:border-line-strong hover:text-foreground"
          )}
        >
          {t(`level.${l.toLowerCase()}`)}
        </button>
      ))}
    </div>
  );
}
