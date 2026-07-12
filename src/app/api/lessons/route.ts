import { ApiError, assertOwned, errorResponse, requireOwnedClass, requireTeacher } from "@/lib/guard";
import { db } from "@/lib/db";
import { LEVELS } from "@/app/api/exercises/route";
import type { Level } from "@/types";

/** Fields returned for each exercise nested under a lesson (list/create/patch responses). */
export const LESSON_EXERCISE_SELECT = { id: true, title: true, type: true, difficulty: true } as const;

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** The fields needed to create a lesson. Pure/side-effect-free (no DB/auth). */
export interface LessonCreateFields {
  classId: string;
  title: string;
  description: string | null;
  level: Level;
  unit: number;
  order: number;
  isCheckpoint: boolean;
  exerciseIds: string[];
}

/**
 * Validate a lesson-creation body and build the fields to create it with.
 * Pure: never touches the DB, so class ownership and exerciseIds ownership
 * are NOT checked here — the route does that afterward, once it has the
 * authenticated teacher's id. Throws ApiError(400, ...) on any invalid field.
 *
 * `classId` must be a non-empty string. Seeded curriculum lessons have
 * `classId: null` and this API never creates those, so a missing/null/blank
 * classId is rejected right here, before any DB access — the caller gets a
 * 400, not a 404, since there's no "class" being probed at all.
 */
export function buildLessonCreate(body: unknown): LessonCreateFields {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Invalid request body");
  }
  const b = body as Record<string, unknown>;

  if (!nonEmptyString(b.classId)) {
    throw new ApiError(400, "classId is required");
  }
  const classId = b.classId.trim();

  if (!nonEmptyString(b.title)) throw new ApiError(400, "title is required");
  const title = b.title.trim();

  let description: string | null = null;
  if (b.description !== undefined && b.description !== null) {
    if (typeof b.description !== "string") throw new ApiError(400, "description must be a string");
    description = b.description;
  }

  if (typeof b.level !== "string" || !LEVELS.includes(b.level as Level)) {
    throw new ApiError(400, "Invalid level");
  }
  const level = b.level as Level;

  if (!Number.isInteger(b.unit) || (b.unit as number) < 1) {
    throw new ApiError(400, "unit must be a positive integer");
  }
  const unit = b.unit as number;

  if (!Number.isInteger(b.order) || (b.order as number) < 0) {
    throw new ApiError(400, "order must be a non-negative integer");
  }
  const order = b.order as number;

  let isCheckpoint = false;
  if (b.isCheckpoint !== undefined) {
    if (typeof b.isCheckpoint !== "boolean") throw new ApiError(400, "isCheckpoint must be a boolean");
    isCheckpoint = b.isCheckpoint;
  }

  let exerciseIds: string[] = [];
  if (b.exerciseIds !== undefined) {
    if (!Array.isArray(b.exerciseIds) || !b.exerciseIds.every((v) => typeof v === "string" && v.length > 0)) {
      throw new ApiError(400, "exerciseIds must be an array of strings");
    }
    exerciseIds = b.exerciseIds as string[];
  }

  return { classId, title, description, level, unit, order, isCheckpoint, exerciseIds };
}

export async function GET(request: Request) {
  try {
    const classId = new URL(request.url).searchParams.get("classId");
    if (!nonEmptyString(classId)) throw new ApiError(400, "classId is required");
    // 404s if the class doesn't exist or isn't owned by the signed-in teacher.
    await requireOwnedClass(classId);

    const lessons = await db.lesson.findMany({
      where: { classId },
      orderBy: [{ unit: "asc" }, { order: "asc" }],
      include: { exercises: { select: LESSON_EXERCISE_SELECT } },
    });

    return Response.json(lessons.map((lesson) => ({ ...lesson, exerciseCount: lesson.exercises.length })));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTeacher();
    const body = await request.json().catch(() => null);
    const fields = buildLessonCreate(body);

    // Ownership of the target class: 404s a foreign/unknown classId. A null
    // classId (seeded curriculum) never reaches here — buildLessonCreate
    // already 400'd it above, before any DB access.
    assertOwned(await db.class.findUnique({ where: { id: fields.classId } }), "teacherId", user.id);

    if (fields.exerciseIds.length) {
      const owned = await db.exercise.findMany({
        where: { id: { in: fields.exerciseIds }, createdById: user.id },
        select: { id: true },
      });
      if (owned.length !== fields.exerciseIds.length) {
        throw new ApiError(400, "One or more exerciseIds are invalid or not owned by you");
      }
    }

    const created = await db.lesson.create({
      data: {
        classId: fields.classId,
        createdById: user.id,
        title: fields.title,
        description: fields.description,
        level: fields.level,
        unit: fields.unit,
        order: fields.order,
        isCheckpoint: fields.isCheckpoint,
        ...(fields.exerciseIds.length ? { exercises: { connect: fields.exerciseIds.map((id) => ({ id })) } } : {}),
      },
      include: { exercises: { select: LESSON_EXERCISE_SELECT } },
    });

    return Response.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
