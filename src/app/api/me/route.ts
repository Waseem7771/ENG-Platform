import { errorResponse, requireUser } from "@/lib/guard";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const progress = await db.progress.findMany({ where: { studentId: user.id } });

    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        level: user.level,
      },
      progress,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
