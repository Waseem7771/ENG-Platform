import { ApiError, errorResponse, requireTeacher, requireUser } from "@/lib/guard";
import { db } from "@/lib/db";
import type { Level } from "@/types";

const LEVELS: Level[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

// Excludes ambiguous characters 0/O and 1/I.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function GET() {
  try {
    const user = await requireUser();

    if (user.role === "TEACHER") {
      const classes = await db.class.findMany({
        where: { teacherId: user.id },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { students: true, sessions: true } } },
      });

      return Response.json(
        classes.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          level: c.level,
          code: c.code,
          createdAt: c.createdAt,
          studentCount: c._count.students,
          sessionCount: c._count.sessions,
        }))
      );
    }

    const enrollments = await db.classStudent.findMany({
      where: { studentId: user.id },
      orderBy: { joinedAt: "desc" },
      include: {
        class: {
          include: { teacher: true, _count: { select: { students: true } } },
        },
      },
    });

    return Response.json(
      enrollments.map((e) => ({
        id: e.class.id,
        name: e.class.name,
        description: e.class.description,
        level: e.class.level,
        teacherName: e.class.teacher.name,
        studentCount: e.class._count.students,
        joinedAt: e.joinedAt,
      }))
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTeacher();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") throw new ApiError(400, "Invalid request body");

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) throw new ApiError(400, "name is required");

    if (typeof body.level !== "string" || !LEVELS.includes(body.level as Level)) {
      throw new ApiError(400, "Invalid level");
    }

    const description =
      typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;

    let code: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCode();
      const exists = await db.class.findUnique({ where: { code: candidate } });
      if (!exists) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new ApiError(500, "Could not generate a unique class code, please try again");

    const created = await db.class.create({
      data: {
        name,
        description,
        level: body.level,
        code,
        teacherId: user.id,
      },
    });

    return Response.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
