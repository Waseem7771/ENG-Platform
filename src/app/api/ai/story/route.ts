import { storyReply } from "@/lib/ai";
import { db } from "@/lib/db";
import { ApiError, errorResponse, requireStudent } from "@/lib/guard";
import type { ChatMessage, StoryData } from "@/types";

function parseTurns(input: unknown): ChatMessage[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 40) {
    throw new ApiError(400, "turns must be an array of 1-40 items");
  }
  const turns: ChatMessage[] = input.map((m) => {
    if (
      !m ||
      typeof m !== "object" ||
      (m as { role?: unknown }).role !== "user" && (m as { role?: unknown }).role !== "assistant" ||
      typeof (m as { content?: unknown }).content !== "string" ||
      (m as { content: string }).content.length < 1 ||
      (m as { content: string }).content.length > 2000
    ) {
      throw new ApiError(400, "Each turn needs role 'user'|'assistant' and content 1-2000 chars");
    }
    const turn = m as { role: "user" | "assistant"; content: string };
    return { role: turn.role, content: turn.content };
  });
  if (turns[turns.length - 1].role !== "user") {
    throw new ApiError(400, "The last turn must be from the user");
  }
  return turns;
}

export async function POST(request: Request) {
  try {
    const user = await requireStudent();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }
    const { exerciseId, turns: rawTurns } = (body ?? {}) as {
      exerciseId?: unknown;
      turns?: unknown;
    };

    if (typeof exerciseId !== "string" || exerciseId.length === 0) {
      throw new ApiError(400, "exerciseId is required");
    }

    const exercise = await db.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) throw new ApiError(404, "Exercise not found");
    // A DRAFT is the owning teacher's work-in-progress: don't let a student
    // run AI turns against its story — same 404 as the single-GET route.
    if (exercise.status !== "PUBLISHED") throw new ApiError(404, "Exercise not found");
    if (exercise.type !== "STORY") {
      throw new ApiError(400, "Exercise is not a story exercise");
    }

    let data: StoryData;
    try {
      data = JSON.parse(exercise.data) as StoryData;
    } catch {
      throw new ApiError(500, "Exercise data is corrupted");
    }
    const story = data.story;
    if (!story) throw new ApiError(500, "Exercise data is corrupted");

    const turns = parseTurns(rawTurns);

    const result = await storyReply(story, user.level, turns);

    return Response.json({ reply: result.reply, aiAvailable: result.aiAvailable });
  } catch (error) {
    return errorResponse(error);
  }
}
