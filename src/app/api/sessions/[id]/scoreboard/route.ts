import { db } from "@/lib/db";
import { assertOwned, errorResponse, requireTeacher } from "@/lib/guard";
import { buildScoreboard } from "@/lib/session";

/**
 * Live teacher scoreboard: aggregates the session's pushed exercises (its
 * EXERCISE messages, deduped, in push order — same shaping as the detail
 * GET) against ExerciseResult rows with `sessionId=id`. Deliberately tiny so
 * it's cheap to poll every 2.5s alongside the room.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTeacher();
    const { id } = await params;

    // assertOwned 404s whether the session is missing or belongs to another
    // teacher, so a foreign id can't be distinguished from one that doesn't
    // exist at all (a student never reaches here — requireTeacher 403s first).
    const session = assertOwned(await db.liveSession.findUnique({ where: { id } }), "teacherId", user.id);

    const exerciseMessageRows = await db.sessionMessage.findMany({
      where: { sessionId: session.id, type: "EXERCISE" },
      orderBy: { createdAt: "asc" },
    });

    // Dedupe re-pushed exercises, keeping first-push order — matches the
    // detail GET's results shaping exactly.
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
      where: { sessionId: session.id },
      include: { student: { select: { name: true } } },
    });

    const scoreboard = buildScoreboard(
      pushed,
      resultRows.map((r) => ({
        studentId: r.studentId,
        name: r.student.name,
        exerciseId: r.exerciseId,
        score: r.score,
        completedAt: r.completedAt,
      }))
    );

    return Response.json({ scoreboard, serverTime: new Date().toISOString() });
  } catch (error) {
    return errorResponse(error);
  }
}
