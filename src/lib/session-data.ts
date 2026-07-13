import { db } from "@/lib/db";
import { buildScoreboard, type ScoreboardExercise } from "@/lib/session";

/**
 * Shared shaping for a session's exercise scoreboard: the exercises pushed
 * into the session (its EXERCISE messages, deduped by exercise id, kept in
 * first-push order) joined against ExerciseResult rows with
 * `sessionId=sessionId`, run through `buildScoreboard`.
 *
 * This is the single source of truth for that shaping — both the session
 * detail GET's `results` field (gated to ENDED-or-owner) and the live
 * scoreboard endpoint (owner-only) call this instead of duplicating the
 * dedupe/lookup/join logic, so the two can't silently drift apart.
 */
export async function loadSessionScoreboard(sessionId: string): Promise<ScoreboardExercise[]> {
  const exerciseMessageRows = await db.sessionMessage.findMany({
    where: { sessionId, type: "EXERCISE" },
    orderBy: { createdAt: "asc" },
  });

  // Dedupe re-pushed exercises, keeping first-push order.
  const exerciseIds = Array.from(new Set(exerciseMessageRows.map((m) => m.content)));
  const exercises = exerciseIds.length
    ? await db.exercise.findMany({ where: { id: { in: exerciseIds } } })
    : [];
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  const pushed = exerciseIds
    .map((exerciseId) => {
      const exercise = exerciseById.get(exerciseId);
      return exercise
        ? { exerciseId: exercise.id, title: exercise.title, type: exercise.type }
        : null;
    })
    .filter((e): e is { exerciseId: string; title: string; type: string } => e !== null);

  const resultRows = await db.exerciseResult.findMany({
    where: { sessionId },
    include: { student: { select: { name: true } } },
  });

  return buildScoreboard(
    pushed,
    resultRows.map((r) => ({
      studentId: r.studentId,
      name: r.student.name,
      exerciseId: r.exerciseId,
      score: r.score,
      completedAt: r.completedAt,
    })),
  );
}
