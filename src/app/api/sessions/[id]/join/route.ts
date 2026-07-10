import { db } from "@/lib/db";
import { ApiError, errorResponse, requireStudent } from "@/lib/guard";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStudent();
    const { id } = await params;

    const session = await db.liveSession.findUnique({ where: { id } });
    if (!session) throw new ApiError(404, "Session not found");

    const enrollment = await db.classStudent.findUnique({
      where: { classId_studentId: { classId: session.classId, studentId: user.id } },
    });
    if (!enrollment) throw new ApiError(403, "Not enrolled in this class");

    if (session.status === "ENDED") throw new ApiError(400, "Session has ended");

    const existing = await db.sessionStudent.findUnique({
      where: { sessionId_studentId: { sessionId: id, studentId: user.id } },
    });

    await db.sessionStudent.upsert({
      where: { sessionId_studentId: { sessionId: id, studentId: user.id } },
      create: { sessionId: id, studentId: user.id },
      update: {},
    });

    if (!existing) {
      await db.sessionMessage.create({
        data: {
          sessionId: id,
          userId: user.id,
          content: `${user.name} joined the session`,
          type: "SYSTEM",
        },
      });
    }

    return Response.json({ joined: true });
  } catch (error) {
    return errorResponse(error);
  }
}
