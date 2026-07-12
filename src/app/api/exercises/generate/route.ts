import { ApiError, errorResponse, requireTeacher } from "@/lib/guard";
import { generateExerciseDraft } from "@/lib/ai";
import { LEVELS } from "@/app/api/exercises/route";
import { EXERCISE_TYPES } from "@/types";
import type { ExerciseType, Level } from "@/types";

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  try {
    await requireTeacher();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") throw new ApiError(400, "Invalid request body");

    if (typeof body.type !== "string" || !EXERCISE_TYPES.includes(body.type as ExerciseType)) {
      throw new ApiError(400, "Invalid exercise type");
    }
    const type = body.type as ExerciseType;

    if (typeof body.difficulty !== "string" || !LEVELS.includes(body.difficulty as Level)) {
      throw new ApiError(400, "Invalid difficulty");
    }
    const difficulty = body.difficulty as Level;

    const topic = nonEmptyString(body.topic) ? body.topic.trim() : "general English";

    const result = await generateExerciseDraft(type, difficulty, topic);
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
