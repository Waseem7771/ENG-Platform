import { ApiError, assertOwned, errorResponse, requireOwnedClass, requireTeacher } from "@/lib/guard";
import { db } from "@/lib/db";
import { LESSON_EXERCISE_SELECT } from "@/app/api/lessons/route";

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * The subset of lesson fields a PATCH may touch. `classId`/`level` are
 * deliberately absent — immutable after creation. `title` IS patchable per
 * the brief (unlike Exercise.type, which is immutable).
 */
export interface LessonPatchFields {
  title?: string;
  description?: string | null;
  unit?: number;
  order?: number;
  isCheckpoint?: boolean;
  exerciseIds?: string[];
}

/**
 * Validate a partial lesson-PATCH body and build the Prisma-ready fields.
 * Pure/side-effect-free (no DB access): exerciseIds ownership and the
 * lesson's own ownership/immutability rules are checked by the route, not
 * here. Throws ApiError(400, ...) on any invalid field.
 */
export function buildLessonPatch(body: unknown): LessonPatchFields {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Invalid request body");
  }
  const b = body as Record<string, unknown>;
  const patch: LessonPatchFields = {};

  if ("title" in b) {
    if (!nonEmptyString(b.title)) throw new ApiError(400, "title must be a non-empty string");
    patch.title = b.title.trim();
  }

  if ("description" in b) {
    if (b.description !== null && typeof b.description !== "string") {
      throw new ApiError(400, "description must be a string or null");
    }
    patch.description = b.description as string | null;
  }

  if ("unit" in b) {
    if (!Number.isInteger(b.unit) || (b.unit as number) < 1) {
      throw new ApiError(400, "unit must be a positive integer");
    }
    patch.unit = b.unit as number;
  }

  if ("order" in b) {
    if (!Number.isInteger(b.order) || (b.order as number) < 0) {
      throw new ApiError(400, "order must be a non-negative integer");
    }
    patch.order = b.order as number;
  }

  if ("isCheckpoint" in b) {
    if (typeof b.isCheckpoint !== "boolean") throw new ApiError(400, "isCheckpoint must be a boolean");
    patch.isCheckpoint = b.isCheckpoint;
  }

  if ("exerciseIds" in b) {
    if (!Array.isArray(b.exerciseIds) || !b.exerciseIds.every((v) => typeof v === "string" && v.length > 0)) {
      throw new ApiError(400, "exerciseIds must be an array of strings");
    }
    patch.exerciseIds = b.exerciseIds as string[];
  }

  return patch;
}

/**
 * Load a lesson this teacher created, that still belongs to a class they own
 * (both checks — belt and suspenders: `createdById` is the direct author
 * check, `requireOwnedClass` re-verifies the lesson's class hasn't drifted
 * out from under them). 404s (not 403) on a missing/foreign lesson, matching
 * `assertOwned`'s existence-hiding convention.
 *
 * `classId: null` (seeded curriculum) is rejected with 400 here, before
 * `requireOwnedClass` ever runs — that helper takes a non-null class id, and
 * seeded rows are globally read-only via this API regardless of who
 * "created" them.
 */
async function requireOwnedLesson(id: string, userId: string) {
  const lesson = assertOwned(await db.lesson.findUnique({ where: { id } }), "createdById", userId);
  if (lesson.classId === null) {
    throw new ApiError(400, "Seeded curriculum lessons cannot be modified via this API");
  }
  await requireOwnedClass(lesson.classId);
  return lesson;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireTeacher();
    const { id } = await params;
    const lesson = await requireOwnedLesson(id, user.id);

    const body = await request.json().catch(() => null);
    const patch = buildLessonPatch(body);
    const { exerciseIds, ...rest } = patch;

    if (exerciseIds && exerciseIds.length) {
      const owned = await db.exercise.findMany({
        where: { id: { in: exerciseIds }, createdById: user.id },
        select: { id: true },
      });
      const ownedIds = new Set(owned.map((e) => e.id));
      const allOwned = exerciseIds.every((id) => ownedIds.has(id));
      if (!allOwned) {
        throw new ApiError(400, "One or more exerciseIds are invalid or not owned by you");
      }
    }

    const updated = await db.lesson.update({
      where: { id: lesson.id },
      data: {
        ...rest,
        // `set` replaces the full connected-exercises list (re-connect set),
        // so removed ids are disconnected and new ones connected in one shot.
        ...(exerciseIds ? { exercises: { set: exerciseIds.map((eid) => ({ id: eid })) } } : {}),
      },
      include: { exercises: { select: LESSON_EXERCISE_SELECT } },
    });

    return Response.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireTeacher();
    const { id } = await params;
    const lesson = await requireOwnedLesson(id, user.id);

    // Exercise.lessonId is onDelete: SetNull in the schema — deleting the
    // lesson orphans its exercises (lessonId -> null), it does not delete them.
    await db.lesson.delete({ where: { id: lesson.id } });
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
