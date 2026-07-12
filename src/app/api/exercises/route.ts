import { ApiError, errorResponse, requireTeacher, requireUser } from "@/lib/guard";
import { db } from "@/lib/db";
import { EXERCISE_STATUSES, EXERCISE_TYPES } from "@/types";
import type { ExerciseStatus, ExerciseType, Level, UserRole } from "@/types";

export const LEVELS: Level[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const GRAMMAR_MC_KINDS = new Set(["fill-blank", "error-correction"]);

function itemCountFor(type: string, data: unknown): number {
  const d = data as Record<string, unknown>;
  switch (type) {
    case "GRAMMAR":
    case "TRANSLATION":
    case "LISTENING":
    case "QUIZ":
      return Array.isArray(d?.items) ? d.items.length : 0;
    case "VOCABULARY":
      return Array.isArray(d?.pairs) ? d.pairs.length : 0;
    case "CONVERSATION":
    case "PICTURE":
    case "STORY":
      return 1;
    default:
      return 0;
  }
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "string");
}

/** Validate difficulty parameter based on user role. Teachers cannot use "ALL"; students can. */
export function validateDifficultyParam(difficulty: string | null, role: UserRole): void {
  if (!difficulty) return; // undefined/null is always valid

  if (role === "TEACHER") {
    // Teachers can only use valid LEVELS, no "ALL"
    if (!LEVELS.includes(difficulty as Level)) {
      throw new ApiError(400, "Invalid difficulty filter");
    }
  } else {
    // Students can use "ALL" or valid LEVELS
    if (difficulty !== "ALL" && !LEVELS.includes(difficulty as Level)) {
      throw new ApiError(400, "Invalid difficulty filter");
    }
  }
}

/** Structurally validate `data` against the contract for the given exercise type. Throws ApiError(400,...) on failure. */
export function validateExerciseData(type: ExerciseType, data: unknown): void {
  if (!data || typeof data !== "object") throw new ApiError(400, "data is required");
  const d = data as Record<string, unknown>;

  switch (type) {
    case "GRAMMAR": {
      if (!Array.isArray(d.items) || d.items.length === 0) {
        throw new ApiError(400, "GRAMMAR data.items must be a non-empty array");
      }
      for (const raw of d.items) {
        const item = raw as Record<string, unknown>;
        if (!nonEmptyString(item.id)) throw new ApiError(400, "Every GRAMMAR item needs an id");
        if (item.kind !== "fill-blank" && item.kind !== "reorder" && item.kind !== "error-correction") {
          throw new ApiError(400, "GRAMMAR item.kind must be fill-blank, reorder, or error-correction");
        }
        if (!nonEmptyString(item.prompt)) throw new ApiError(400, "Every GRAMMAR item needs a prompt");
        if (!nonEmptyString(item.answer)) throw new ApiError(400, "Every GRAMMAR item needs an answer");
        if (!nonEmptyString(item.explanation)) throw new ApiError(400, "Every GRAMMAR item needs an explanation");
        if (item.kind === "reorder") {
          if (!nonEmptyStringArray(item.words)) throw new ApiError(400, "reorder items need a non-empty words array");
        } else if (GRAMMAR_MC_KINDS.has(item.kind as string)) {
          if (!nonEmptyString(item.text)) throw new ApiError(400, `${item.kind} items need text`);
          if (!nonEmptyStringArray(item.options)) throw new ApiError(400, `${item.kind} items need a non-empty options array`);
          if (!(item.options as string[]).includes(item.answer as string)) {
            throw new ApiError(400, "GRAMMAR item.answer must be one of item.options");
          }
        }
      }
      break;
    }

    case "VOCABULARY": {
      if (!Array.isArray(d.pairs) || d.pairs.length < 2) {
        throw new ApiError(400, "VOCABULARY data.pairs must have at least 2 pairs");
      }
      for (const raw of d.pairs) {
        const pair = raw as Record<string, unknown>;
        if (!nonEmptyString(pair.word) || !nonEmptyString(pair.meaning)) {
          throw new ApiError(400, "Every pair needs word and meaning");
        }
      }
      break;
    }

    case "TRANSLATION": {
      if (!Array.isArray(d.items) || d.items.length === 0) {
        throw new ApiError(400, "TRANSLATION data.items must be a non-empty array");
      }
      for (const raw of d.items) {
        const item = raw as Record<string, unknown>;
        if (!nonEmptyString(item.id)) throw new ApiError(400, "Every TRANSLATION item needs an id");
        if (item.direction !== "ar-en" && item.direction !== "en-ar") {
          throw new ApiError(400, "TRANSLATION item.direction must be ar-en or en-ar");
        }
        if (!nonEmptyString(item.source) || !nonEmptyString(item.reference)) {
          throw new ApiError(400, "Every TRANSLATION item needs source and reference");
        }
      }
      break;
    }

    case "LISTENING": {
      if (!Array.isArray(d.items) || d.items.length === 0) {
        throw new ApiError(400, "LISTENING data.items must be a non-empty array");
      }
      for (const raw of d.items) {
        const item = raw as Record<string, unknown>;
        if (!nonEmptyString(item.id)) throw new ApiError(400, "Every LISTENING item needs an id");
        if (!nonEmptyString(item.transcript)) throw new ApiError(400, "Every LISTENING item needs a transcript");
        if (!nonEmptyString(item.question)) throw new ApiError(400, "Every LISTENING item needs a question");
        if (!nonEmptyStringArray(item.options)) throw new ApiError(400, "Every LISTENING item needs options");
        if (!nonEmptyString(item.answer) || !(item.options as string[]).includes(item.answer as string)) {
          throw new ApiError(400, "LISTENING item.answer must be one of item.options");
        }
      }
      break;
    }

    case "QUIZ": {
      if (typeof d.timePerQuestion !== "number" || d.timePerQuestion <= 0) {
        throw new ApiError(400, "QUIZ data.timePerQuestion must be a positive number");
      }
      if (!Array.isArray(d.items) || d.items.length === 0) {
        throw new ApiError(400, "QUIZ data.items must be a non-empty array");
      }
      for (const raw of d.items) {
        const item = raw as Record<string, unknown>;
        if (!nonEmptyString(item.id)) throw new ApiError(400, "Every QUIZ item needs an id");
        if (!nonEmptyString(item.question)) throw new ApiError(400, "Every QUIZ item needs a question");
        if (!nonEmptyStringArray(item.options)) throw new ApiError(400, "Every QUIZ item needs options");
        if (!nonEmptyString(item.answer) || !(item.options as string[]).includes(item.answer as string)) {
          throw new ApiError(400, "QUIZ item.answer must be one of item.options");
        }
      }
      break;
    }

    case "CONVERSATION": {
      const scenario = d.scenario as Record<string, unknown>;
      if (!scenario || typeof scenario !== "object") throw new ApiError(400, "CONVERSATION data.scenario is required");
      for (const field of ["key", "title", "emoji", "description", "aiRole", "userRole", "opening"]) {
        if (!nonEmptyString(scenario[field])) throw new ApiError(400, `CONVERSATION scenario.${field} is required`);
      }
      if (!nonEmptyStringArray(scenario.objectives)) throw new ApiError(400, "CONVERSATION scenario.objectives must be a non-empty array");
      break;
    }

    case "PICTURE": {
      const scene = d.scene as Record<string, unknown>;
      if (!scene || typeof scene !== "object") throw new ApiError(400, "PICTURE data.scene is required");
      if (!nonEmptyString(scene.emojis) || !nonEmptyString(scene.title) || !nonEmptyString(scene.description)) {
        throw new ApiError(400, "PICTURE scene needs emojis, title, and description");
      }
      if (!nonEmptyStringArray(scene.hints)) throw new ApiError(400, "PICTURE scene.hints must be a non-empty array");
      if (typeof scene.minWords !== "number" || scene.minWords <= 0) {
        throw new ApiError(400, "PICTURE scene.minWords must be a positive number");
      }
      break;
    }

    case "STORY": {
      const story = d.story as Record<string, unknown>;
      if (!story || typeof story !== "object") throw new ApiError(400, "STORY data.story is required");
      if (!nonEmptyString(story.title) || !nonEmptyString(story.genre) || !nonEmptyString(story.opening)) {
        throw new ApiError(400, "STORY story needs title, genre, and opening");
      }
      if (typeof story.minTurns !== "number" || story.minTurns <= 0) {
        throw new ApiError(400, "STORY story.minTurns must be a positive number");
      }
      break;
    }
  }
}

/** Students only ever see PUBLISHED exercises — DRAFT rows are the owning teacher's work-in-progress. */
export function studentExerciseWhere(params: { type?: string | null; difficulty?: string | null; userLevel?: string | null }) {
  const where: { type?: string; difficulty?: string; status: "PUBLISHED" } = { status: "PUBLISHED" };
  if (params.type) where.type = params.type;
  if (params.difficulty && params.difficulty !== "ALL") where.difficulty = params.difficulty;
  else if (!params.difficulty && params.userLevel) where.difficulty = params.userLevel;
  return where;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const difficulty = url.searchParams.get("difficulty");

    if (type && !EXERCISE_TYPES.includes(type as ExerciseType)) {
      throw new ApiError(400, "Invalid type filter");
    }
    validateDifficultyParam(difficulty, user.role);

    if (user.role === "TEACHER") {
      const where: Record<string, unknown> = {};
      if (type) where.type = type;
      if (difficulty) where.difficulty = difficulty;
      where.createdById = user.id;
      const exercises = await db.exercise.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { results: true } } },
      });

      return Response.json(
        exercises.map((ex) => ({
          id: ex.id,
          title: ex.title,
          type: ex.type,
          difficulty: ex.difficulty,
          points: ex.points,
          timeLimit: ex.timeLimit,
          status: ex.status,
          itemCount: itemCountFor(ex.type, JSON.parse(ex.data)),
          completed: false,
          bestScore: null,
          resultsCount: ex._count.results,
        }))
      );
    }

    const where = studentExerciseWhere({ type, difficulty, userLevel: user.level });
    const exercises = await db.exercise.findMany({ where, orderBy: { createdAt: "desc" } });
    const results = await db.exerciseResult.findMany({
      where: { studentId: user.id, exerciseId: { in: exercises.map((e) => e.id) } },
      select: { exerciseId: true, score: true },
    });

    const bestByExercise = new Map<string, number>();
    for (const r of results) {
      const current = bestByExercise.get(r.exerciseId);
      if (current === undefined || r.score > current) bestByExercise.set(r.exerciseId, r.score);
    }

    return Response.json(
      exercises.map((ex) => {
        const best = bestByExercise.get(ex.id);
        return {
          id: ex.id,
          title: ex.title,
          type: ex.type,
          difficulty: ex.difficulty,
          points: ex.points,
          timeLimit: ex.timeLimit,
          itemCount: itemCountFor(ex.type, JSON.parse(ex.data)),
          completed: best !== undefined,
          bestScore: best ?? null,
        };
      })
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

    const title = nonEmptyString(body.title) ? body.title.trim() : "";
    if (!title) throw new ApiError(400, "title is required");

    if (typeof body.type !== "string" || !EXERCISE_TYPES.includes(body.type as ExerciseType)) {
      throw new ApiError(400, "Invalid exercise type");
    }
    const type = body.type as ExerciseType;

    if (typeof body.difficulty !== "string" || !LEVELS.includes(body.difficulty as Level)) {
      throw new ApiError(400, "Invalid difficulty");
    }
    const difficulty = body.difficulty as Level;

    validateExerciseData(type, body.data);

    let timeLimit: number | null = null;
    if (body.timeLimit !== undefined && body.timeLimit !== null) {
      if (!Number.isInteger(body.timeLimit) || body.timeLimit <= 0) {
        throw new ApiError(400, "timeLimit must be a positive integer");
      }
      timeLimit = body.timeLimit;
    }

    const defaultPoints = difficulty === "BEGINNER" ? 10 : difficulty === "INTERMEDIATE" ? 15 : 20;
    let points = defaultPoints;
    if (body.points !== undefined && body.points !== null) {
      if (!Number.isInteger(body.points) || body.points <= 0) {
        throw new ApiError(400, "points must be a positive integer");
      }
      points = body.points;
    }

    let status: ExerciseStatus = "PUBLISHED";
    if (body.status !== undefined && body.status !== null) {
      if (typeof body.status !== "string" || !EXERCISE_STATUSES.includes(body.status as ExerciseStatus)) {
        throw new ApiError(400, "status must be DRAFT or PUBLISHED");
      }
      status = body.status as ExerciseStatus;
    }

    const created = await db.exercise.create({
      data: {
        title,
        type,
        difficulty,
        data: JSON.stringify(body.data),
        timeLimit,
        points,
        status,
        createdById: user.id,
      },
    });

    return Response.json({ ...created, data: JSON.parse(created.data) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
