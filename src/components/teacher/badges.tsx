import { cn } from "@/lib/utils";
import type { ExerciseType, Level, SessionStatus } from "@/types";
import { EXERCISE_TYPE_META } from "@/lib/exercise-meta";

const LEVEL_STYLES: Record<Level, string> = {
  BEGINNER: "border-leaf bg-leaf-soft text-leaf-text",
  INTERMEDIATE: "border-sun-deep/30 bg-sun-soft text-sun-deep",
  ADVANCED: "border-primary/25 bg-secondary text-primary",
};

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function LevelBadge({ level, className }: { level: Level; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        LEVEL_STYLES[level],
        className
      )}
    >
      {titleCase(level)}
    </span>
  );
}

const SESSION_STATUS_STYLES: Record<SessionStatus, string> = {
  WAITING: "border-sun-deep/30 bg-sun-soft text-sun-deep",
  ACTIVE: "border-leaf bg-leaf-soft text-leaf-text",
  ENDED: "border-border bg-muted text-muted-foreground",
};

export function SessionStatusBadge({ status, className }: { status: SessionStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        SESSION_STATUS_STYLES[status],
        className
      )}
    >
      {status === "ACTIVE" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-leaf" />
        </span>
      )}
      {titleCase(status)}
    </span>
  );
}

export function ExerciseTypeBadge({ type, className }: { type: ExerciseType; className?: string }) {
  const meta = EXERCISE_TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground", className)}>
      <Icon className={cn("h-3 w-3", meta.color)} />
      {meta.label}
    </span>
  );
}
