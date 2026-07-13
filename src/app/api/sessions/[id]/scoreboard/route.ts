import { db } from "@/lib/db";
import { assertOwned, errorResponse, requireTeacher } from "@/lib/guard";
import { loadSessionScoreboard } from "@/lib/session-data";

/**
 * Live teacher scoreboard: aggregates the session's pushed exercises (its
 * EXERCISE messages, deduped, in push order — same shaping as the detail
 * GET, via the shared `loadSessionScoreboard`) against ExerciseResult rows
 * with `sessionId=id`. Deliberately tiny so it's cheap to poll every 2.5s
 * alongside the room.
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

    const scoreboard = await loadSessionScoreboard(session.id);

    return Response.json({ scoreboard, serverTime: new Date().toISOString() });
  } catch (error) {
    return errorResponse(error);
  }
}
