import { ApiError, errorResponse, requireOwnedClass, requireTeacher, requireUser } from "@/lib/guard";
import { db } from "@/lib/db";
import { LEVELS } from "@/app/api/exercises/route";
import type { Class } from "@/generated/prisma/client";
import type { Level } from "@/types";

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

/** The subset of class fields a PATCH may touch. */
export interface ClassPatchFields {
  name?: string;
  description?: string | null;
  level?: Level;
}

/**
 * Validate a partial class-PATCH body and build the Prisma-ready fields.
 * Pure/side-effect-free (no DB access) so it can be unit-tested directly:
 * throws ApiError(400, ...) on any invalid field. `existing` isn't needed by
 * any current validation (class fields don't cross-depend on one another the
 * way an exercise's `data` depends on its stored `type`), but the parameter
 * is kept for signature symmetry with `buildExercisePatch`/`buildLessonPatch`.
 */
export function buildClassPatch(existing: Class, body: unknown): ClassPatchFields {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Invalid request body");
  }
  const b = body as Record<string, unknown>;
  const patch: ClassPatchFields = {};

  if ("name" in b) {
    if (typeof b.name !== "string" || !b.name.trim()) {
      throw new ApiError(400, "name must be a non-empty string");
    }
    patch.name = b.name.trim();
  }

  if ("description" in b) {
    if (b.description !== null && typeof b.description !== "string") {
      throw new ApiError(400, "description must be a string or null");
    }
    patch.description = typeof b.description === "string" && b.description.trim() ? b.description.trim() : null;
  }

  if ("level" in b) {
    if (typeof b.level !== "string" || !LEVELS.includes(b.level as Level)) {
      throw new ApiError(400, "Invalid level");
    }
    patch.level = b.level as Level;
  }

  return patch;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { klass } = await requireOwnedClass(id);

    const body = await request.json().catch(() => null);
    const patch = buildClassPatch(klass, body);

    const updated = await db.class.update({ where: { id: klass.id }, data: patch });
    return Response.json(updated);
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
