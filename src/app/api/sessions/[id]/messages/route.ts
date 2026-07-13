import { db } from "@/lib/db";
import { ApiError, errorResponse, requireUser } from "@/lib/guard";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const session = await db.liveSession.findUnique({ where: { id } });
    if (!session) throw new ApiError(404, "Session not found");

    const isTeacherOwner = user.id === session.teacherId;
    let isJoinedStudent = false;
    if (!isTeacherOwner) {
      const joined = await db.sessionStudent.findUnique({
        where: { sessionId_studentId: { sessionId: id, studentId: user.id } },
      });
      isJoinedStudent = Boolean(joined);
    }
    if (!isTeacherOwner && !isJoinedStudent) {
      throw new ApiError(403, "Join the session before sending messages");
    }

    // Pre-start lobby chat is allowed (WAITING) as well as the live room
    // (ACTIVE); only an ENDED session is closed to new messages.
    if (session.status !== "WAITING" && session.status !== "ACTIVE") {
      throw new ApiError(403, "Session has ended");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }
    const { content } = (body ?? {}) as { content?: unknown };
    const trimmed = typeof content === "string" ? content.trim() : "";
    if (trimmed.length < 1 || trimmed.length > 1000) {
      throw new ApiError(400, "content must be 1-1000 characters");
    }

    const message = await db.sessionMessage.create({
      data: { sessionId: id, userId: user.id, content: trimmed, type: "TEXT" },
      include: { user: { select: { id: true, name: true, role: true } } },
    });

    return Response.json(
      {
        message: {
          id: message.id,
          content: message.content,
          type: message.type,
          createdAt: message.createdAt,
          user: message.user,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
