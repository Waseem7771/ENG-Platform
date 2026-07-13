import { chatFeedback, chatReply } from "@/lib/ai";
import { db } from "@/lib/db";
import { ApiError, errorResponse, requireStudent } from "@/lib/guard";
import type { ChatMessage, ConversationData } from "@/types";

function parseMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 40) {
    throw new ApiError(400, "messages must be an array of 1-40 items");
  }
  const messages: ChatMessage[] = input.map((m) => {
    if (
      !m ||
      typeof m !== "object" ||
      (m as { role?: unknown }).role !== "user" && (m as { role?: unknown }).role !== "assistant" ||
      typeof (m as { content?: unknown }).content !== "string" ||
      (m as { content: string }).content.length < 1 ||
      (m as { content: string }).content.length > 2000
    ) {
      throw new ApiError(400, "Each message needs role 'user'|'assistant' and content 1-2000 chars");
    }
    const msg = m as { role: "user" | "assistant"; content: string };
    return { role: msg.role, content: msg.content };
  });
  if (messages[messages.length - 1].role !== "user") {
    throw new ApiError(400, "The last message must be from the user");
  }
  return messages;
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
    const { exerciseId, messages: rawMessages } = (body ?? {}) as {
      exerciseId?: unknown;
      messages?: unknown;
    };

    if (typeof exerciseId !== "string" || exerciseId.length === 0) {
      throw new ApiError(400, "exerciseId is required");
    }

    const exercise = await db.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) throw new ApiError(404, "Exercise not found");
    // A DRAFT is the owning teacher's work-in-progress: don't let a student
    // run AI turns against its scenario — same 404 as the single-GET route.
    if (exercise.status !== "PUBLISHED") throw new ApiError(404, "Exercise not found");
    if (exercise.type !== "CONVERSATION") {
      throw new ApiError(400, "Exercise is not a conversation exercise");
    }

    let data: ConversationData;
    try {
      data = JSON.parse(exercise.data) as ConversationData;
    } catch {
      throw new ApiError(500, "Exercise data is corrupted");
    }
    const scenario = data.scenario;
    if (!scenario) throw new ApiError(500, "Exercise data is corrupted");

    const messages = parseMessages(rawMessages);
    const lastUserMessage = messages[messages.length - 1].content;

    const [chatResult, feedback] = await Promise.all([
      chatReply(scenario, user.level, messages),
      chatFeedback(user.level, lastUserMessage),
    ]);

    return Response.json({
      reply: chatResult.reply,
      feedback,
      aiAvailable: chatResult.aiAvailable,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
