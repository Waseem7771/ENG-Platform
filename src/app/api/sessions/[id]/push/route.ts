import { db } from "@/lib/db";
import { ApiError, errorResponse, requireTeacher } from "@/lib/guard";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTeacher();
    const { id } = await params;

    const session = await db.liveSession.findUnique({ where: { id } });
    if (!session) throw new ApiError(404, "Session not found");
    if (session.teacherId !== user.id) throw new ApiError(403, "Not your session");
    if (session.status !== "ACTIVE") throw new ApiError(400, "Start the session first");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }
    const { exerciseId } = (body ?? {}) as { exerciseId?: unknown };
    if (typeof exerciseId !== "string" || exerciseId.length === 0) {
      throw new ApiError(400, "exerciseId is required");
    }

    const exercise = await db.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) throw new ApiError(404, "Exercise not found");
    // A teacher may only push an exercise THEY created into their own live
    // session — otherwise teacher A could push teacher B's exercise (DRAFT or
    // not) and the response would leak its id/title/type as an existence
    // oracle. 404, not 403, so a foreign id can't be distinguished from one
    // that doesn't exist at all.
    if (exercise.createdById !== user.id) throw new ApiError(404, "Exercise not found");
    // Can't push a draft into a live session: a pushed exercise must already
    // be PUBLISHED. 404 (not a distinct "not published" error) so a DRAFT's
    // existence isn't distinguishable from a nonexistent/foreign id.
    if (exercise.status !== "PUBLISHED") throw new ApiError(404, "Exercise not found");

    await db.sessionMessage.create({
      data: { sessionId: id, userId: user.id, content: exerciseId, type: "EXERCISE" },
    });

    return Response.json({
      pushed: true,
      exercise: { id: exercise.id, title: exercise.title, type: exercise.type },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
