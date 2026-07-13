import { db } from "@/lib/db";
import { ApiError, errorResponse, requireOwnedClass, requireUser } from "@/lib/guard";

interface ShapedSession {
  id: string;
  title: string;
  status: string;
  startedAt: Date | null;
  endedAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  participantCount: number;
  messageCount: number;
}

/** The fields needed to create a live session. Pure/side-effect-free (no DB/auth). */
export interface SessionCreateFields {
  classId: string;
  title: string;
  status: "ACTIVE" | "WAITING";
  startedAt: Date | null;
  scheduledAt: Date | null;
}

/**
 * Validate a session-creation body and build the fields to create it with.
 * Pure: never touches the DB, so class ownership is NOT checked here — the
 * route does that afterward via requireOwnedClass, once it has the
 * authenticated teacher's id. Throws ApiError(400, ...) on any invalid field.
 *
 * `mode:"now"` (the default when `mode` is omitted) is the SINGLE go-live
 * action: the session is built already ACTIVE with `startedAt: now` — no
 * separate "start" step. `mode:"schedule"` requires a future ISO
 * `scheduledAt` and builds a WAITING session for later start (PATCH
 * action:"start").
 */
export function buildSessionCreate(body: unknown, now: Date): SessionCreateFields {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Invalid request body");
  }
  const b = body as Record<string, unknown>;

  if (typeof b.classId !== "string" || b.classId.length === 0) {
    throw new ApiError(400, "classId is required");
  }
  const classId = b.classId;

  const trimmedTitle = typeof b.title === "string" ? b.title.trim() : "";
  if (trimmedTitle.length < 1 || trimmedTitle.length > 100) {
    throw new ApiError(400, "title must be 1-100 characters");
  }

  const mode = b.mode === undefined ? "now" : b.mode;
  if (mode !== "now" && mode !== "schedule") {
    throw new ApiError(400, "mode must be 'now' or 'schedule'");
  }

  if (mode === "now") {
    return { classId, title: trimmedTitle, status: "ACTIVE", startedAt: now, scheduledAt: null };
  }

  // mode === "schedule"
  if (typeof b.scheduledAt !== "string" || b.scheduledAt.length === 0) {
    throw new ApiError(400, "scheduledAt is required to schedule a session");
  }
  const scheduledAt = new Date(b.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new ApiError(400, "scheduledAt must be a valid date");
  }
  if (scheduledAt.getTime() <= now.getTime()) {
    throw new ApiError(400, "scheduledAt must be in the future");
  }

  return { classId, title: trimmedTitle, status: "WAITING", startedAt: null, scheduledAt };
}

export async function GET() {
  try {
    const user = await requireUser();

    let sessions: ShapedSession[];

    if (user.role === "TEACHER") {
      const rows = await db.liveSession.findMany({
        where: { teacherId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          class: { select: { name: true } },
          teacher: { select: { name: true } },
          _count: { select: { students: true, messages: true } },
        },
      });
      sessions = rows.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        scheduledAt: s.scheduledAt,
        createdAt: s.createdAt,
        classId: s.classId,
        className: s.class.name,
        teacherId: s.teacherId,
        teacherName: s.teacher.name,
        participantCount: s._count.students,
        messageCount: s._count.messages,
      }));
    } else {
      const enrollments = await db.classStudent.findMany({
        where: { studentId: user.id },
        select: { classId: true },
      });
      const classIds = enrollments.map((e) => e.classId);

      if (classIds.length === 0) {
        sessions = [];
      } else {
        const include = {
          class: { select: { name: true } },
          teacher: { select: { name: true } },
          _count: { select: { students: true, messages: true } },
        } as const;

        const active = await db.liveSession.findMany({
          where: { classId: { in: classIds }, status: { in: ["WAITING", "ACTIVE"] } },
          orderBy: { createdAt: "desc" },
          include,
        });
        const ended = await db.liveSession.findMany({
          where: { classId: { in: classIds }, status: "ENDED" },
          orderBy: { createdAt: "desc" },
          take: 10,
          include,
        });

        sessions = [...active, ...ended].map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          scheduledAt: s.scheduledAt,
          createdAt: s.createdAt,
          classId: s.classId,
          className: s.class.name,
          teacherId: s.teacherId,
          teacherName: s.teacher.name,
          participantCount: s._count.students,
          messageCount: s._count.messages,
        }));
      }
    }

    return Response.json({ sessions });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }
    const fields = buildSessionCreate(body, new Date());

    // requireOwnedClass 404s (not 403) whether the class is missing or
    // belongs to another teacher, so a foreign classId can't be probed.
    const { user, klass } = await requireOwnedClass(fields.classId);

    const created = await db.liveSession.create({
      data: {
        classId: fields.classId,
        teacherId: user.id,
        title: fields.title,
        status: fields.status,
        startedAt: fields.startedAt,
        scheduledAt: fields.scheduledAt,
      },
    });

    // mode:"now" is the SINGLE go-live action — mirror the "Session started"
    // SYSTEM message that PATCH action:"start" writes, since this create IS
    // the start for an immediate session (no separate start step follows).
    if (fields.status === "ACTIVE") {
      await db.sessionMessage.create({
        data: { sessionId: created.id, userId: user.id, content: "Session started", type: "SYSTEM" },
      });
    }

    const session: ShapedSession = {
      id: created.id,
      title: created.title,
      status: created.status,
      startedAt: created.startedAt,
      endedAt: created.endedAt,
      scheduledAt: created.scheduledAt,
      createdAt: created.createdAt,
      classId: created.classId,
      className: klass.name,
      teacherId: created.teacherId,
      teacherName: user.name,
      participantCount: 0,
      messageCount: fields.status === "ACTIVE" ? 1 : 0,
    };

    return Response.json({ session }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
