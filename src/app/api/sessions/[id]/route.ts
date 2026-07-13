import { db } from "@/lib/db";
import { ApiError, errorResponse, requireTeacher, requireUser } from "@/lib/guard";
import { buildRoster, buildScoreboard, sessionPhase, type ScoreboardExercise } from "@/lib/session";

async function loadSessionOrThrow(id: string) {
  const session = await db.liveSession.findUnique({
    where: { id },
    include: {
      class: { select: { name: true } },
      teacher: { select: { name: true } },
    },
  });
  if (!session) throw new ApiError(404, "Session not found");
  return session;
}

function shapeSession(session: Awaited<ReturnType<typeof loadSessionOrThrow>>) {
  return {
    id: session.id,
    title: session.title,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    classId: session.classId,
    className: session.class.name,
    teacherId: session.teacherId,
    teacherName: session.teacher.name,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const session = await loadSessionOrThrow(id);

    const isTeacherOwner = user.id === session.teacherId;
    let isEnrolledStudent = false;
    if (!isTeacherOwner) {
      const enrollment = await db.classStudent.findUnique({
        where: { classId_studentId: { classId: session.classId, studentId: user.id } },
      });
      isEnrolledStudent = Boolean(enrollment);
    }
    if (!isTeacherOwner && !isEnrolledStudent) {
      throw new ApiError(403, "Not part of this session");
    }

    const url = new URL(request.url);
    const afterParam = url.searchParams.get("after");
    let after: Date | undefined;
    if (afterParam) {
      const parsed = new Date(afterParam);
      if (Number.isNaN(parsed.getTime())) {
        throw new ApiError(400, "Invalid 'after' timestamp");
      }
      after = parsed;
    }

    // Incremental polling: with `after`, fetch messages at/after that instant
    // ascending (gte, not gt, so a message sharing the boundary millisecond is
    // never skipped — clients de-dupe by id). Without `after` (first load),
    // fetch the LATEST 200 so long sessions don't lose recent chat to the cap.
    const [participantRows, messageRows, classStudentRows, exerciseMessageRows] = await Promise.all([
      db.sessionStudent.findMany({
        where: { sessionId: id },
        orderBy: { joinedAt: "asc" },
        include: { student: { select: { id: true, name: true } } },
      }),
      db.sessionMessage.findMany({
        where: { sessionId: id, ...(after ? { createdAt: { gte: after } } : {}) },
        orderBy: { createdAt: after ? "asc" : "desc" },
        take: 200,
        include: { user: { select: { id: true, name: true, role: true } } },
      }),
      // Full class roster (enrolled), unioned below with the session's joins
      // (participantRows) so the lobby can show who's present vs waiting.
      db.classStudent.findMany({
        where: { classId: session.classId },
        include: { student: { select: { id: true, name: true } } },
      }),
      // Every exercise pushed into THIS session, in push order — the basis for
      // both `pushedExercise` (the latest one) and the results/scoreboard
      // shaping below.
      db.sessionMessage.findMany({
        where: { sessionId: id, type: "EXERCISE" },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const lastExerciseMessage = exerciseMessageRows[exerciseMessageRows.length - 1] ?? null;

    // First load came back newest-first; present ascending like the poll path.
    if (!after) messageRows.reverse();

    const participants = participantRows.map((p) => ({
      id: p.student.id,
      name: p.student.name,
      joinedAt: p.joinedAt,
    }));

    const messages = messageRows.map((m) => ({
      id: m.id,
      content: m.content,
      type: m.type,
      createdAt: m.createdAt,
      user: { id: m.user.id, name: m.user.name, role: m.user.role },
    }));

    // The next-poll cursor is derived from the newest message actually returned,
    // NOT a wall-clock reading taken after the query (which could skip a message
    // committed during the request window). Falls back to the incoming cursor,
    // then to now for a brand-new empty session.
    const nextCursor =
      messages.length > 0
        ? messages[messages.length - 1].createdAt.toISOString()
        : (afterParam ?? new Date().toISOString());

    let pushedExercise: {
      id: string;
      title: string;
      type: string;
      difficulty: string;
      points: number;
      pushedAt: Date;
    } | null = null;

    if (lastExerciseMessage) {
      const exercise = await db.exercise.findUnique({
        where: { id: lastExerciseMessage.content },
      });
      if (exercise) {
        pushedExercise = {
          id: exercise.id,
          title: exercise.title,
          type: exercise.type,
          difficulty: exercise.difficulty,
          points: exercise.points,
          pushedAt: lastExerciseMessage.createdAt,
        };
      }
    }

    const roster = buildRoster(
      classStudentRows.map((cs) => ({ studentId: cs.studentId, name: cs.student.name })),
      participantRows.map((p) => ({ studentId: p.student.id, joinedAt: p.joinedAt })),
    );

    const phase = sessionPhase(session, new Date());

    // Results are only meaningful once the session has ended (final recap) or
    // to the owning teacher (a live scoreboard while it's still running). A
    // non-owner student on a non-ENDED session gets `results: undefined`,
    // which JSON.stringify drops from the response entirely.
    let results: ScoreboardExercise[] | undefined;
    if (session.status === "ENDED" || isTeacherOwner) {
      const exerciseIds = Array.from(new Set(exerciseMessageRows.map((m) => m.content)));
      const exercises = exerciseIds.length
        ? await db.exercise.findMany({ where: { id: { in: exerciseIds } } })
        : [];
      const exerciseById = new Map(exercises.map((e) => [e.id, e]));

      const pushed = exerciseIds
        .map((id) => {
          const exercise = exerciseById.get(id);
          return exercise
            ? { exerciseId: exercise.id, title: exercise.title, type: exercise.type }
            : null;
        })
        .filter((e): e is { exerciseId: string; title: string; type: string } => e !== null);

      const resultRows = await db.exerciseResult.findMany({
        where: { sessionId: id },
        include: { student: { select: { name: true } } },
      });

      results = buildScoreboard(
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

    return Response.json({
      session: shapeSession(session),
      participants,
      messages,
      pushedExercise,
      roster,
      results,
      phase,
      // `serverTime` is the polling cursor the client echoes back as `after`.
      // Named for backward compatibility; value is the newest returned message.
      serverTime: nextCursor,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTeacher();
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }
    const { action } = (body ?? {}) as { action?: unknown };
    if (action !== "start" && action !== "end") {
      throw new ApiError(400, "action must be 'start' or 'end'");
    }

    const session = await loadSessionOrThrow(id);
    if (session.teacherId !== user.id) throw new ApiError(403, "Not your session");

    if (action === "start") {
      if (session.status !== "WAITING") {
        throw new ApiError(400, "Session is not waiting to start");
      }
      const updated = await db.liveSession.update({
        where: { id },
        data: { status: "ACTIVE", startedAt: new Date() },
      });
      await db.sessionMessage.create({
        data: { sessionId: id, userId: user.id, content: "Session started", type: "SYSTEM" },
      });
      return Response.json({
        session: shapeSession({ ...session, ...updated }),
      });
    }

    // action === "end"
    if (session.status === "ENDED") {
      throw new ApiError(400, "Session has already ended");
    }
    const updated = await db.liveSession.update({
      where: { id },
      data: { status: "ENDED", endedAt: new Date() },
    });
    await db.sessionMessage.create({
      data: {
        sessionId: id,
        userId: user.id,
        content: "Session ended by the teacher",
        type: "SYSTEM",
      },
    });
    return Response.json({
      session: shapeSession({ ...session, ...updated }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
