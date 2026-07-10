import { errorResponse, requireTeacher } from "@/lib/guard";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const teacher = await requireTeacher();

    const classes = await db.class.findMany({
      where: { teacherId: teacher.id },
      include: { students: { include: { student: true } } },
    });

    const studentMap = new Map<
      string,
      { student: { id: string; name: string; email: string; level: string | null }; classNames: Set<string> }
    >();

    for (const cls of classes) {
      for (const cs of cls.students) {
        const entry = studentMap.get(cs.studentId);
        if (entry) {
          entry.classNames.add(cls.name);
        } else {
          studentMap.set(cs.studentId, { student: cs.student, classNames: new Set([cls.name]) });
        }
      }
    }

    const studentIds = Array.from(studentMap.keys());
    if (studentIds.length === 0) return Response.json([]);

    const overallProgress = await db.progress.findMany({
      where: { studentId: { in: studentIds }, category: "OVERALL" },
    });
    const overallByStudent = new Map(overallProgress.map((p) => [p.studentId, p]));

    const results = await db.exerciseResult.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, score: true },
    });
    const resultsByStudent = new Map<string, number[]>();
    for (const r of results) {
      const scores = resultsByStudent.get(r.studentId) ?? [];
      scores.push(r.score);
      resultsByStudent.set(r.studentId, scores);
    }

    const list = studentIds.map((id) => {
      const entry = studentMap.get(id)!;
      const overall = overallByStudent.get(id);
      const scores = resultsByStudent.get(id) ?? [];
      const avgScore = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      return {
        id: entry.student.id,
        name: entry.student.name,
        email: entry.student.email,
        level: entry.student.level,
        xp: overall?.xp ?? 0,
        streak: overall?.streak ?? 0,
        overallScore: overall?.score ?? 0,
        exercisesDone: scores.length,
        avgScore,
        classNames: Array.from(entry.classNames),
      };
    });

    return Response.json(list);
  } catch (error) {
    return errorResponse(error);
  }
}
