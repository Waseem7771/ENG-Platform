import { ApiError, errorResponse, requireOwnedExercise, requireTeacher, requireUser } from "@/lib/guard";
import { db } from "@/lib/db";
import { LEVELS, validateExerciseData } from "@/app/api/exercises/route";
import { EXERCISE_STATUSES } from "@/types";
import type { Exercise } from "@/generated/prisma/client";
import type { ExerciseStatus, ExerciseType, Level } from "@/types";

/** Shallow-copy `obj` without `key`. Avoids the destructure-and-discard pattern, whose unused binding trips no-unused-vars. */
function omit<T extends Record<string, unknown>>(obj: T, key: string): T {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

/**
 * Redact the hidden ground truth that the player UI never renders but that a
 * student could otherwise read to game the AI scorer: the translation
 * `reference` and the picture scene `description`. The authoritative copies
 * are re-read from the DB server-side at submit time, so scoring is unaffected.
 * Objective answers (grammar/quiz/listening) are intentionally kept so the
 * players can show instant per-item feedback, per the design brief.
 */
function redactGroundTruth(type: string, data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  if (type === "TRANSLATION") {
    const d = data as { items?: Array<Record<string, unknown>> };
    if (Array.isArray(d.items)) {
      return { ...d, items: d.items.map((item) => omit(item, "reference")) };
    }
  }
  if (type === "PICTURE") {
    const d = data as { scene?: Record<string, unknown> };
    if (d.scene) {
      return { ...d, scene: omit(d.scene, "description") };
    }
  }
  return data;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** The set of fields a PATCH may touch. `type` is deliberately absent — it is immutable after creation. */
export interface ExercisePatchFields {
  title?: string;
  difficulty?: Level;
  data?: string;
  points?: number;
  timeLimit?: number | null;
  status?: ExerciseStatus;
}

/**
 * Validate a partial PATCH body against the stored exercise and build the
 * Prisma update payload. Pure and side-effect free (no DB/network access) so
 * it can be unit-tested directly: throws ApiError(400, ...) on invalid input.
 *
 * `existing.type` (the stored row) is the only source of truth for the
 * exercise's type — the PATCH body's `type`, if present, is silently ignored,
 * so a teacher can never change an exercise's type after creation.
 */
export function buildExercisePatch(existing: Exercise, body: unknown): ExercisePatchFields {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Invalid request body");
  }
  const b = body as Record<string, unknown>;
  const patch: ExercisePatchFields = {};

  if ("title" in b) {
    if (!nonEmptyString(b.title)) throw new ApiError(400, "title must be a non-empty string");
    patch.title = b.title.trim();
  }

  if ("difficulty" in b) {
    if (typeof b.difficulty !== "string" || !LEVELS.includes(b.difficulty as Level)) {
      throw new ApiError(400, "Invalid difficulty");
    }
    patch.difficulty = b.difficulty as Level;
  }

  if ("data" in b) {
    validateExerciseData(existing.type as ExerciseType, b.data);
    patch.data = JSON.stringify(b.data);
  }

  if ("points" in b) {
    if (!Number.isInteger(b.points) || (b.points as number) <= 0) {
      throw new ApiError(400, "points must be a positive integer");
    }
    patch.points = b.points as number;
  }

  if ("timeLimit" in b) {
    if (b.timeLimit !== null && (!Number.isInteger(b.timeLimit) || (b.timeLimit as number) <= 0)) {
      throw new ApiError(400, "timeLimit must be a positive integer or null");
    }
    patch.timeLimit = b.timeLimit as number | null;
  }

  if ("status" in b) {
    if (typeof b.status !== "string" || !EXERCISE_STATUSES.includes(b.status as ExerciseStatus)) {
      throw new ApiError(400, "status must be DRAFT or PUBLISHED");
    }
    patch.status = b.status as ExerciseStatus;
  }

  return patch;
}

function parseExerciseData(exercise: Exercise): unknown {
  try {
    return JSON.parse(exercise.data);
  } catch {
    throw new ApiError(500, "Exercise data is corrupted");
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const editMode = new URL(request.url).searchParams.get("edit") === "1";

    if (editMode) {
      // Owner-only: requireOwnedExercise 404s a non-owner before we ever
      // reach the response, so a student can't request edit mode to dodge
      // redaction or to probe a draft's existence.
      const { exercise } = await requireOwnedExercise(id);
      return Response.json({ ...exercise, data: parseExerciseData(exercise) });
    }

    const user = await requireUser();
    const exercise = await db.exercise.findUnique({ where: { id } });
    if (!exercise) throw new ApiError(404, "Exercise not found");
    // Drafts are the owning teacher's work-in-progress: hide them from
    // everyone else the same way assertOwned hides other teachers' rows —
    // 404, not 403, so existence isn't leaked.
    if (exercise.status !== "PUBLISHED" && exercise.createdById !== user.id) {
      throw new ApiError(404, "Exercise not found");
    }

    return Response.json({
      ...exercise,
      data: redactGroundTruth(exercise.type, parseExerciseData(exercise)),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { exercise } = await requireOwnedExercise(id);

    const body = await request.json().catch(() => null);
    const patch = buildExercisePatch(exercise, body);

    const updated = await db.exercise.update({ where: { id: exercise.id }, data: patch });
    return Response.json({ ...updated, data: parseExerciseData(updated) });
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

    const exercise = await db.exercise.findUnique({ where: { id } });
    if (!exercise) throw new ApiError(404, "Exercise not found");
    if (exercise.createdById !== user.id) throw new ApiError(403, "You did not create this exercise");

    await db.exercise.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
