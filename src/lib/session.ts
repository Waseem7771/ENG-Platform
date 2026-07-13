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
