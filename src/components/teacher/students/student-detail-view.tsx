"use client";

import { Award, Flame, History, Trophy, Video } from "lucide-react";
import { LevelBadge, ExerciseTypeBadge } from "@/components/teacher/badges";
import { useT } from "@/components/providers/locale-provider";
import type { ProgressCategory } from "@/types";
import type { TeacherStudentDetail } from "@/components/teacher/types";

const SKILLS: { category: ProgressCategory; key: string; color: string }[] = [
  { category: "GRAMMAR", key: "progress.skillGrammar", color: "bg-primary" },
  { category: "VOCABULARY", key: "progress.skillVocabulary", color: "bg-sun" },
  { category: "LISTENING", key: "progress.skillListening", color: "bg-leaf" },
  { category: "TRANSLATION", key: "progress.skillTranslation", color: "bg-primary" },
  { category: "SPEAKING", key: "progress.skillSpeaking", color: "bg-sun" },
];

/** Pure presentational body shared by the routed student-detail page — no fetching, loading, or error state here. */
export function StudentDetailView({ detail }: { detail: TeacherStudentDetail }) {
  const t = useT();
  const overall = detail.progress.find((p) => p.category === "OVERALL");
  const scoreByCategory = new Map(detail.progress.map((p) => [p.category, p.score]));

  return (
    <div className="space-y-6">
      <div className="rounded-card border-2 border-border bg-card p-6 shadow-sticker">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{detail.student.name}</h1>
          {detail.student.level && <LevelBadge level={detail.student.level} />}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{detail.student.email}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatChip icon={<Trophy className="h-4 w-4" />} label={t("teacher.xp")} value={String(overall?.xp ?? 0)} />
        <StatChip
          icon={<Flame className="h-4 w-4" />}
          label={t("progress.statStreak")}
          value={t("teacher.daysAbbrev", { n: overall?.streak ?? 0 })}
        />
        <StatChip icon={<Video className="h-4 w-4" />} label={t("teacher.tabSessions")} value={String(detail.sessionsAttended)} />
      </div>

      <div className="rounded-card border-2 border-border bg-card p-6 shadow-sticker">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("teacher.skillsHeading")}</h2>
        <div className="space-y-4">
          {SKILLS.map((s) => {
            const value = scoreByCategory.get(s.category) ?? 0;
            return (
              <div key={s.category}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-muted-foreground">{t(s.key)}</span>
                  <span className="text-muted-foreground">{value}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${s.color} transition-all duration-700`} style={{ width: `${value}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-card border-2 border-border bg-card p-6 shadow-sticker">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Award className="h-3.5 w-3.5" />
          {t("teacher.placementHistory")}
        </h2>
        {detail.placements.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("teacher.noPlacements")}</p>
        ) : (
          <ul className="space-y-2">
            {detail.placements.map((p, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{p.score}%</span>
                  <span className="text-muted-foreground">→</span>
                  <LevelBadge level={p.level} />
                </div>
                <span className="text-xs text-muted-foreground">{new Date(p.completedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-card border-2 border-border bg-card p-6 shadow-sticker">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          {t("teacher.recentResults")}
        </h2>
        {detail.results.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("teacher.noResults")}</p>
        ) : (
          <ul className="space-y-2">
            {detail.results.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground" dir="ltr">
                    {r.exercise.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <ExerciseTypeBadge type={r.exercise.type} />
                    <LevelBadge level={r.exercise.difficulty} />
                  </div>
                </div>
                <div className="shrink-0 text-end">
                  <p className="font-semibold text-foreground">{r.score}%</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(r.completedAt).toLocaleDateString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-card border-2 border-border bg-card p-3 shadow-sticker">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
