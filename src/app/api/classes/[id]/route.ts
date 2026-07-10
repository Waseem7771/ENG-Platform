import { ApiError, errorResponse, requireTeacher, requireUser } from "@/lib/guard";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const cls = await db.class.findUnique({
      where: { id },
      include: {
        teacher: true,
        students: { include: { student: true } },
        sessions: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!cls) throw new ApiError(404, "Class not found");

    const isOwner = user.role === "TEACHER" && cls.teacherId === user.id;
    const isEnrolled = user.role === "STUDENT" && cls.students.some((s) => s.studentId === user.id);
    if (!isOwner && !isEnrolled) throw new ApiError(403, "Not authorized for this class");

    const studentIds = cls.students.map((s) => s.studentId);
    const overallProgress = studentIds.length
      ? await db.progress.findMany({
          where: { studentId: { in: studentIds }, category: "OVERALL" },
        })
      : [];
    const overallByStudent = new Map(overallProgress.map((p) => [p.studentId, p]));

    const students = cls.students.map((cs) => {
      const overall = overallByStudent.get(cs.studentId);
      return {
        id: cs.student.id,
        name: cs.student.name,
        ...(isOwner ? { email: cs.student.email } : {}),
        level: cs.student.level,
        overallScore: overall?.score ?? 0,
        xp: overall?.xp ?? 0,
      };
    });

    return Response.json({
      id: cls.id,
      name: cls.name,
      description: cls.description,
      level: cls.level,
      teacherName: cls.teacher.name,
      ...(isOwner ? { code: cls.code } : {}),
      students,
      sessions: cls.sessions.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTeacher();
    const { id } = await params;

    const cls = await db.class.findUnique({ where: { id } });
    if (!cls) throw new ApiError(404, "Class not found");
    if (cls.teacherId !== user.id) throw new ApiError(403, "You do not own this class");

    await db.class.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
