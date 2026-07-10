import { ApiError, errorResponse, requireTeacher } from "@/lib/guard";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teacher = await requireTeacher();
    const { id } = await params;

    const student = await db.user.findUnique({ where: { id } });
    if (!student || student.role !== "STUDENT") throw new ApiError(404, "Student not found");

    const shared = await db.classStudent.findFirst({
      where: { studentId: id, class: { teacherId: teacher.id } },
    });
    if (!shared) throw new ApiError(403, "You don't share a class with this student");

    const progress = await db.progress.findMany({ where: { studentId: id } });

    const results = await db.exerciseResult.findMany({
      where: { studentId: id },
      orderBy: { completedAt: "desc" },
      take: 20,
      include: { exercise: { select: { title: true, type: true, difficulty: true } } },
    });

    const placements = await db.placementExam.findMany({
      where: { studentId: id },
      orderBy: { completedAt: "desc" },
      select: { score: true, level: true, completedAt: true },
    });

    const sessionsAttended = await db.sessionStudent.count({ where: { studentId: id } });

    return Response.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        level: student.level,
      },
      progress,
      results: results.map((r) => ({
        id: r.id,
        score: r.score,
        timeSpent: r.timeSpent,
        completedAt: r.completedAt,
        exercise: {
          title: r.exercise.title,
          type: r.exercise.type,
          difficulty: r.exercise.difficulty,
        },
      })),
      placements,
      sessionsAttended,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
