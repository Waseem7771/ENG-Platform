import { ApiError, errorResponse, requireStudent } from "@/lib/guard";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await requireStudent();
    const body = await request.json().catch(() => null);

    const codeRaw = body && typeof body.code === "string" ? body.code.trim() : "";
    if (!codeRaw) throw new ApiError(400, "code is required");
    const code = codeRaw.toUpperCase();

    const cls = await db.class.findUnique({ where: { code } });
    if (!cls) throw new ApiError(404, "No class with that code");

    const existing = await db.classStudent.findUnique({
      where: { classId_studentId: { classId: cls.id, studentId: user.id } },
    });

    if (existing) {
      return Response.json({ alreadyJoined: true, class: cls });
    }

    await db.classStudent.create({
      data: { classId: cls.id, studentId: user.id },
    });

    return Response.json({ alreadyJoined: false, class: cls });
  } catch (error) {
    return errorResponse(error);
  }
}
