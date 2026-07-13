export type SessionPhase = "SCHEDULED" | "LOBBY" | "LIVE" | "ENDED";
// LOBBY = WAITING with no scheduledAt in the future; SCHEDULED = WAITING with scheduledAt in the future.
export function sessionPhase(
  s: { status: string; scheduledAt: Date | string | null },
  now: Date,
): SessionPhase {
  if (s.status === "ACTIVE") return "LIVE";
  if (s.status === "ENDED") return "ENDED";
  // WAITING (or any other non-terminal status)
  if (s.scheduledAt !== null && s.scheduledAt !== undefined) {
    const scheduled = new Date(s.scheduledAt);
    if (scheduled.getTime() > now.getTime()) return "SCHEDULED";
  }
  return "LOBBY";
}

export interface RosterEntry {
  studentId: string;
  name: string;
  joined: boolean;
  joinedAt: string | null;
}
// enrolled = the class's ClassStudent rows; joined = SessionStudent rows. Union: every enrolled student,
// joined flag true when a SessionStudent row exists. Sorted joined-first then name.
export function buildRoster(
  enrolled: Array<{ studentId: string; name: string }>,
  joined: Array<{ studentId: string; joinedAt: Date | string }>,
): RosterEntry[] {
  const joinedMap = new Map<string, string>();
  for (const j of joined) {
    joinedMap.set(j.studentId, new Date(j.joinedAt).toISOString());
  }

  const entries: RosterEntry[] = enrolled.map((e) => {
    const joinedAt = joinedMap.get(e.studentId) ?? null;
    return {
      studentId: e.studentId,
      name: e.name,
      joined: joinedAt !== null,
      joinedAt,
    };
  });

  entries.sort((a, b) => {
    if (a.joined !== b.joined) return a.joined ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

export interface ScoreEntry {
  studentId: string;
  name: string;
  exerciseId: string;
  score: number;
  completedAt: string;
}

export interface ScoreboardExercise {
  exerciseId: string;
  title: string;
  type: string;
  entries: ScoreEntry[];
  completedCount: number;
  averageScore: number | null;
}
// Given the exercises pushed in a session (ordered) and the ExerciseResult rows with sessionId=this session,
// group results by exercise; per exercise list one BEST entry per student (max score), completedCount = distinct
// students, averageScore = mean of those best scores (null when none).
export function buildScoreboard(
  pushed: Array<{ exerciseId: string; title: string; type: string }>,
  results: Array<{
    studentId: string;
    name: string;
    exerciseId: string;
    score: number;
    completedAt: Date | string;
  }>,
): ScoreboardExercise[] {
  return pushed.map((exercise) => {
    const bestByStudent = new Map<string, ScoreEntry>();

    for (const r of results) {
      if (r.exerciseId !== exercise.exerciseId) continue;
      const existing = bestByStudent.get(r.studentId);
      if (!existing || r.score > existing.score) {
        bestByStudent.set(r.studentId, {
          studentId: r.studentId,
          name: r.name,
          exerciseId: r.exerciseId,
          score: r.score,
          completedAt: new Date(r.completedAt).toISOString(),
        });
      }
    }

    const entries = Array.from(bestByStudent.values());
    const completedCount = entries.length;
    const averageScore =
      completedCount === 0
        ? null
        : entries.reduce((sum, e) => sum + e.score, 0) / completedCount;

    return {
      exerciseId: exercise.exerciseId,
      title: exercise.title,
      type: exercise.type,
      entries,
      completedCount,
      averageScore,
    };
  });
}

/**
 * Privacy filter for a student viewing an ENDED session's recap. A student may
 * see their OWN score per exercise, never their peers' individual scores, so we
 * strip every entry that isn't theirs. `completedCount` and `averageScore` are
 * class-level aggregates (not attributable to any one peer) and are preserved so
 * the student still sees the class average and how many classmates completed.
 *
 * Pure and non-mutating: returns fresh exercise objects with a filtered
 * `entries` array; the input board is left untouched. The route calls this for
 * any non-owner requester; the owning teacher receives the full scoreboard.
 */
export function redactScoreboardForStudent(
  board: ScoreboardExercise[],
  studentId: string,
): ScoreboardExercise[] {
  return board.map((exercise) => ({
    ...exercise,
    entries: exercise.entries.filter((entry) => entry.studentId === studentId),
  }));
}

/**
 * Pure i18n descriptor for a session's elapsed duration, derived from its
 * start/end instants. Returns a `{ key, vars }` pair the caller feeds to `t()`
 * so the units ("min", "h", "m") are localized rather than baked into the UI:
 *   - either endpoint missing        -> session.notCompleted ("—")
 *   - under a minute                 -> session.durationUnder1 ("<1 min")
 *   - under an hour                  -> session.durationMinutes ("{n} min")
 *   - an hour or more                -> session.durationHours ("{h}h {m}m")
 * Extracted from the old room-local `sessionDuration` helper and unit-tested.
 */
export function durationLabel(
  startedAt: Date | string | null,
  endedAt: Date | string | null,
): { key: string; vars?: Record<string, number> } {
  if (!startedAt || !endedAt) return { key: "session.notCompleted" };
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return { key: "session.durationUnder1" };
  if (minutes < 60) return { key: "session.durationMinutes", vars: { n: minutes } };
  return { key: "session.durationHours", vars: { h: Math.floor(minutes / 60), m: minutes % 60 } };
}
