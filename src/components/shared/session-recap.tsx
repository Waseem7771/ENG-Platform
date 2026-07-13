"use client";

import Link from "next/link";
import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { durationLabel, type ScoreboardExercise } from "@/lib/session";

export type SessionRecapRole = "TEACHER" | "STUDENT";

/** Structural subset of SessionMessageDTO / SessionMessageItem — the fields the transcript needs. */
export interface SessionRecapMessage {
  id: string;
  content: string;
  type: "TEXT" | "SYSTEM" | "EXERCISE";
  createdAt: string;
  user: { id: string; name: string };
}

/**
 * Structural subset of the two room detail types (student SessionDetail /
 * teacher TeacherSessionDetail). Only the recap-relevant fields are required,
 * so both full objects — and a teacher-page-assembled partial — satisfy it.
 */
interface SessionRecapDetail {
  session: { startedAt: string | null; endedAt: string | null };
  participants: readonly unknown[];
  roster: readonly unknown[];
  results?: ScoreboardExercise[];
}

/**
 * Post-session recap, shared by both rooms' ENDED state. Shows the session
 * duration, participant + exercise counts, per-exercise results, and a
 * read-only chat transcript, then a "back to sessions" link home.
 *
 * `messages` is passed in explicitly (not read off `detail`) because each room
 * keeps the authoritative, fully-merged transcript in its own state while
 * `detail.messages` only ever holds the latest incremental poll batch.
 *
 * Results shaping is role-driven: a TEACHER sees every student's name + score
 * per exercise (a static leaderboard); a STUDENT sees only their OWN score plus
 * the class average and completion count. The peer scores are already stripped
 * server-side for students (redactScoreboardForStudent), so this is defense in
 * depth, not the sole guard.
 */
export function SessionRecap({
  detail,
  messages,
  role,
  currentUserId = null,
}: {
  detail: SessionRecapDetail;
  messages: SessionRecapMessage[];
  role: SessionRecapRole;
  currentUserId?: string | null;
}) {
  const t = useT();
  const duration = durationLabel(detail.session.startedAt, detail.session.endedAt);
  const results = detail.results ?? [];
  const total = detail.roster.length;
  const backHref = role === "TEACHER" ? "/teacher/sessions" : "/student/sessions";
  const transcript = messages.filter((m) => m.type !== "EXERCISE");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-2">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("session.recapTitle")}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <RecapStat label={t("session.recapDuration")} value={t(duration.key, duration.vars)} />
          <RecapStat label={t("session.recapParticipants")} value={String(detail.participants.length)} />
          <RecapStat label={t("session.recapExercises")} value={String(results.length)} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("session.recapExercises")}
        </h3>
        {results.length === 0 ? (
          <p className="rounded-xl border border-border bg-muted p-4 text-center text-xs text-muted-foreground">
            {t("session.recapNoResults")}
          </p>
        ) : (
          <ul className="space-y-2">
            {results.map((ex) => {
              const avg = ex.averageScore === null ? null : String(Math.round(ex.averageScore));
              // Copy before sorting so the polled/props array is never mutated.
              const ranked = [...ex.entries].sort(
                (a, b) => b.score - a.score || a.name.localeCompare(b.name),
              );
              // Students receive their own entry only (server-redacted); prefer an
              // explicit id match, falling back to the sole entry present.
              const own =
                ex.entries.find((e) => currentUserId != null && e.studentId === currentUserId) ??
                ex.entries[0];
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
                  {role === "TEACHER"
                    ? ranked.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {ranked.map((e) => (
                            <li
                              key={e.studentId}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <bdi className="truncate text-foreground">{e.name}</bdi>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {e.score}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      )
                    : (
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">{t("session.you")}</span>
                        <span className="shrink-0 tabular-nums text-foreground">
                          {own ? `${own.score}%` : t("session.notCompleted")}
                        </span>
                      </div>
                    )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("session.transcript")}
        </h3>
        <div className="space-y-3">
          {transcript.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">{t("session.chatEmpty")}</p>
          ) : (
            transcript.map((m) => {
              if (m.type === "SYSTEM") {
                return (
                  <p key={m.id} dir="auto" className="text-center text-xs italic text-muted-foreground">
                    {m.content}
                  </p>
                );
              }
              const isMe = currentUserId != null && m.user.id === currentUserId;
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && (
                    <span className="mb-1 text-[11px] text-muted-foreground">
                      <bdi>{m.user.name}</bdi>
                    </span>
                  )}
                  <div
                    dir="auto"
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <div>
        <Button render={<Link href={backHref} />} nativeButton={false} role="link" variant="outline">
          {t("session.backToSessions")}
        </Button>
      </div>
    </div>
  );
}

function RecapStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted p-4">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p dir="auto" className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
