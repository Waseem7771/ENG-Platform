import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import type { ExerciseType, Level, SessionStatus } from "@/types";
import {
  BookOpen,
  BookMarked,
  Languages,
  Headphones,
  Zap,
  MessageSquare,
  Image as ImageIcon,
  ScrollText,
} from "lucide-react";

const LEVEL_STYLES: Record<Level, string> = {
  BEGINNER: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  INTERMEDIATE: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  ADVANCED: "border-violet-500/20 bg-violet-500/10 text-violet-400",
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
  WAITING: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  ACTIVE: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  ENDED: "border-white/10 bg-white/5 text-white/40",
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
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      )}
      {titleCase(status)}
    </span>
  );
}

export const EXERCISE_TYPE_META: Record<ExerciseType, { label: string; icon: ComponentType<{ className?: string }>; color: string }> = {
  GRAMMAR: { label: "Grammar", icon: BookOpen, color: "text-violet-400" },
  VOCABULARY: { label: "Vocabulary", icon: BookMarked, color: "text-blue-400" },
  TRANSLATION: { label: "Translation", icon: Languages, color: "text-cyan-400" },
  LISTENING: { label: "Listening", icon: Headphones, color: "text-emerald-400" },
  QUIZ: { label: "Speed Quiz", icon: Zap, color: "text-amber-400" },
  CONVERSATION: { label: "AI Conversation", icon: MessageSquare, color: "text-pink-400" },
  PICTURE: { label: "Picture", icon: ImageIcon, color: "text-orange-400" },
  STORY: { label: "Story", icon: ScrollText, color: "text-teal-400" },
};

export function ExerciseTypeBadge({ type, className }: { type: ExerciseType; className?: string }) {
  const meta = EXERCISE_TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/70", className)}>
      <Icon className={cn("h-3 w-3", meta.color)} />
      {meta.label}
    </span>
  );
}
