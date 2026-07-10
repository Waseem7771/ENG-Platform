import { db } from "@/lib/db";
import { ApiError, errorResponse, requireTeacher, requireUser } from "@/lib/guard";

interface ShapedSession {
  id: string;
  title: string;
  status: string;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  participantCount: number;
  messageCount: number;
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
    const user = await requireTeacher();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }
    const { classId, title } = (body ?? {}) as { classId?: unknown; title?: unknown };

    if (typeof classId !== "string" || classId.length === 0) {
      throw new ApiError(400, "classId is required");
    }
    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    if (trimmedTitle.length < 1 || trimmedTitle.length > 100) {
      throw new ApiError(400, "title must be 1-100 characters");
    }

    const cls = await db.class.findUnique({ where: { id: classId } });
    if (!cls) throw new ApiError(404, "Class not found");
    if (cls.teacherId !== user.id) throw new ApiError(403, "Not your class");

    const created = await db.liveSession.create({
      data: {
        classId,
        teacherId: user.id,
        title: trimmedTitle,
        status: "WAITING",
      },
    });

    const session: ShapedSession = {
      id: created.id,
      title: created.title,
      status: created.status,
      startedAt: created.startedAt,
      endedAt: created.endedAt,
      createdAt: created.createdAt,
      classId: created.classId,
      className: cls.name,
      teacherId: created.teacherId,
      teacherName: user.name,
      participantCount: 0,
      messageCount: 0,
    };

    return Response.json({ session }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
