import { ApiError, errorResponse, requireStudent } from "@/lib/guard";
import { db } from "@/lib/db";
import { applyGamification, xpForScore } from "@/lib/gamification";
import { scoreConversation, scorePicture, scoreStory, scoreTranslation } from "@/lib/ai";
import { scoreObjectiveItems, type ObjectiveItem } from "@/lib/review";
import type {
  ChatMessage,
  ConversationData,
  ExerciseType,
  GrammarData,
  ListeningData,
  PictureData,
  QuizData,
  StoryData,
  SubmitFeedback,
  SubmitResponse,
  TranslationData,
  VocabularyData,
} from "@/types";

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

const MAX_TURNS = 40;
const MAX_CONTENT = 2000;
const MAX_TEXT = 5000;

/** Validate + bound a chat/story transcript from an untrusted body. */
function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_TURNS)
    .filter(
      (m): m is ChatMessage =>
        Boolean(m) &&
        typeof (m as ChatMessage).content === "string" &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant")
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT) }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStudent();
    const { id } = await params;

    const exercise = await db.exercise.findUnique({ where: { id } });
    if (!exercise) throw new ApiError(404, "Exercise not found");

    const type = exercise.type as ExerciseType;
    let data: unknown;
    try {
      data = JSON.parse(exercise.data);
    } catch {
      throw new ApiError(500, "Exercise data is corrupted");
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    let score = 0;
    let feedback: SubmitFeedback;
    let aiAvailable: boolean | undefined;

    switch (type) {
      case "GRAMMAR":
      case "LISTENING":
      case "QUIZ": {
        const items = ((data as GrammarData | ListeningData | QuizData).items ?? []) as ObjectiveItem[];
        const answers =
          body.answers && typeof body.answers === "object" ? (body.answers as Record<string, unknown>) : {};
        const result = scoreObjectiveItems(items, answers, type === "GRAMMAR");
        score = result.score;
        feedback = {
          overall: `You got ${result.correctCount} out of ${result.total} correct.`,
          perItem: result.perItem,
        };
        break;
      }

      case "VOCABULARY": {
        const answers =
          body.answers && typeof body.answers === "object" ? (body.answers as Record<string, unknown>) : {};
        const pairs = (data as VocabularyData).pairs ?? [];
        // The client reports its own tallies; never trust them past the real
        // pair count, and cap matched at total so score can't exceed 100.
        const totalPairs = pairs.length > 0 ? pairs.length : Math.max(0, Math.round(asNumber(answers.totalPairs)));
        const matchedPairs = Math.min(totalPairs, Math.max(0, Math.round(asNumber(answers.matchedPairs))));
        const mistakes = Math.max(0, Math.round(asNumber(answers.mistakes)));
        const raw = totalPairs > 0 ? Math.round((100 * matchedPairs) / totalPairs) : 0;
        score = Math.max(0, raw - mistakes * 5);
        feedback = {
          overall: `You matched ${matchedPairs} of ${totalPairs} pairs with ${mistakes} mistake${mistakes === 1 ? "" : "s"}.`,
        };
        break;
      }

      case "TRANSLATION": {
        const items = (data as TranslationData).items ?? [];
        const answers =
          body.answers && typeof body.answers === "object" ? (body.answers as Record<string, unknown>) : {};
        const perItem: NonNullable<SubmitFeedback["perItem"]> = {};
        const scores: number[] = [];
        let lastAiAvailable = false;

        for (const item of items) {
          const answer = typeof answers[item.id] === "string" ? (answers[item.id] as string) : "";
          const result = await scoreTranslation(item, answer, user.level);
          scores.push(result.score);
          lastAiAvailable = result.aiAvailable;
          perItem[item.id] = {
            correct: result.score >= 70,
            expected: item.reference,
            note: result.note,
          };
        }

        score = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        feedback = {
          overall: `Average translation score: ${score}/100.`,
          perItem,
        };
        aiAvailable = lastAiAvailable;
        break;
      }

      case "PICTURE": {
        const scene = (data as PictureData).scene;
        const text = typeof body.text === "string" ? body.text.slice(0, MAX_TEXT) : "";
        const result = await scorePicture(scene, text, user.level);
        score = result.score;
        feedback = {
          overall: result.overall,
          strengths: result.strengths,
          improvements: result.improvements,
        };
        aiAvailable = result.aiAvailable;
        break;
      }

      case "CONVERSATION": {
        const scenario = (data as ConversationData).scenario;
        const messages = sanitizeMessages(body.messages);
        const userTurns = messages.filter((m) => m?.role === "user").length;
        if (userTurns < 2) throw new ApiError(400, "Have a conversation first");

        const result = await scoreConversation(scenario, messages, user.level);
        score = result.score;
        feedback = {
          overall: result.overall,
          strengths: result.strengths,
          improvements: result.improvements,
        };
        aiAvailable = result.aiAvailable;
        break;
      }

      case "STORY": {
        const story = (data as StoryData).story;
        const turns = sanitizeMessages(body.turns);
        const result = await scoreStory(story, turns, user.level);
        score = result.score;
        feedback = {
          overall: result.overall,
          strengths: result.strengths,
          improvements: result.improvements,
        };
        aiAvailable = result.aiAvailable;
        break;
      }

      default:
        throw new ApiError(400, "Unsupported exercise type");
    }

    // Final safety net: no scorer may ever leak a value outside 0-100.
    score = Math.min(100, Math.max(0, Math.round(score)));

    // XP is awarded only for a student's first attempt or a genuine improvement
    // on an exercise, so replaying a solved exercise can't farm XP/levels.
    // The attempt itself is always recorded, and skill scores still update.
    const prior = await db.exerciseResult.aggregate({
      where: { exerciseId: exercise.id, studentId: user.id },
      _max: { score: true },
    });
    const priorBest = prior._max.score;
    const isImprovement = priorBest === null || score > priorBest;
    const xpEarned = isImprovement ? xpForScore(exercise.points, score) : 0;

    const timeSpent =
      typeof body.timeSpent === "number" && Number.isFinite(body.timeSpent)
        ? Math.round(body.timeSpent as number)
        : null;

    await db.exerciseResult.create({
      data: {
        exerciseId: exercise.id,
        studentId: user.id,
        score,
        timeSpent,
        answers: JSON.stringify(body ?? {}),
      },
    });

    const gamification = await applyGamification(user.id, type, score, xpEarned);

    const response: SubmitResponse = {
      score,
      xpEarned,
      feedback,
      gamification,
      ...(aiAvailable !== undefined ? { aiAvailable } : {}),
    };

    return Response.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
