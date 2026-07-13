"use client";

import { useCallback } from "react";
import { BarChart3 } from "lucide-react";
import { usePoll } from "@/hooks/use-poll";
import { useT } from "@/components/providers/locale-provider";
import { api } from "@/lib/api";
import type { ScoreboardExercise } from "@/lib/session";

interface ScoreboardResponse {
  scoreboard: ScoreboardExercise[];
  serverTime: string;
}

/**
 * `averageScore` from the endpoint is UNROUNDED (mean of best scores). Round it
 * to a whole-percent string for display; `null` (nobody completed) stays null so
 * the caller hides the average chip entirely. Extracted pure for unit testing.
 */
export function formatAvg(averageScore: number | null): string | null {
  if (averageScore === null) return null;
  return String(Math.round(averageScore));
}

/**
 * Live teacher-only scoreboard for the LIVE room's right rail. Polls the tiny
 * `/scoreboard` endpoint every 2.5s (via `usePoll`) and, per pushed exercise (in
 * push order), shows the done/total ratio, the rounded class average, and each
 * completed student's best score. `total` is the class roster size (the fixed
 * denominator); the endpoint only returns entries for students who have
 * completed, so this lists completed students and relies on `completedCount` /
 * `total` for the ratio — it never needs the full roster.
 */
export function Scoreboard({ sessionId, total }: { sessionId: string; total: number }) {
  const t = useT();

  const fetcher = useCallback(
    () => api<ScoreboardResponse>(`/api/sessions/${sessionId}/scoreboard`),
    [sessionId],
  );
  const { data } = usePoll(fetcher, 2500);
  const board = data?.scoreboard ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5" />
        {t("session.scoreboard")}
      </div>

      {board.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-center text-xs text-muted-foreground">
          {t("session.scoreboardEmpty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {board.map((ex) => {
            const avg = formatAvg(ex.averageScore);
            // Best-score-first so the panel reads like a leaderboard; copy before
            // sorting so we never mutate the polled array in place.
            const ranked = [...ex.entries].sort(
              (a, b) => b.score - a.score || a.name.localeCompare(b.name),
            );
            return (
              <li key={ex.exerciseId} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span dir="auto" className="truncate text-sm font-medium text-foreground">
                    {ex.title}
                  </span>
                  {avg !== null && (
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary">
                      {t("session.avgScore", { score: avg })}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("session.completedCount", { done: ex.completedCount, total })}
                </p>
                {ranked.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {ranked.map((e) => (
                      <li
                        key={e.studentId}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <bdi className="truncate text-foreground">{e.name}</bdi>
                        <span className="shrink-0 tabular-nums text-muted-foreground">{e.score}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
