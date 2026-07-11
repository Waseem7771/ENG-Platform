import { ApiError, errorResponse, requireStudent } from "@/lib/guard";
import { db } from "@/lib/db";
import {
  MINI_QUESTION_IDS,
  miniQuestions,
  publicQuestions,
  scorePlacement,
  scorePlacementSubset,
} from "@/lib/placement-questions";

const SKILL_CATEGORIES = ["GRAMMAR", "VOCABULARY", "LISTENING", "TRANSLATION", "SPEAKING"] as const;

export async function GET(request: Request) {
  try {
    const user = await requireStudent();
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");
    const isMini = mode === "mini";

    const last = await db.placementExam.findFirst({
      where: { studentId: user.id },
      orderBy: { completedAt: "desc" },
    });

    return Response.json({
      questions: isMini ? miniQuestions() : publicQuestions(),
      taken: Boolean(last),
      lastResult: last
        ? {
            score: last.score,
            level: last.level,
            breakdown: last.breakdown ? JSON.parse(last.breakdown) : null,
            completedAt: last.completedAt,
          }
        : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStudent();
    const body = await request.json().catch(() => null);

    if (!body || typeof body.answers !== "object" || body.answers === null || Array.isArray(body.answers)) {
      throw new ApiError(400, "answers must be an object of { questionId: answer }");
    }

    if (body.mode !== undefined && body.mode !== "mini") {
      throw new ApiError(400, "mode must be \"mini\" or omitted");
    }

    const answers: Record<string, string> = {};
    for (const [key, value] of Object.entries(body.answers as Record<string, unknown>)) {
      if (typeof value !== "string") throw new ApiError(400, "Each answer must be a string");
      answers[key] = value;
    }

    if (body.mode === "mini") {
      const miniIds = new Set<string>(MINI_QUESTION_IDS);
      for (const id of Object.keys(answers)) {
        if (!miniIds.has(id)) {
          throw new ApiError(400, "answers may only reference mini-placement question ids");
        }
      }

      const result = scorePlacementSubset(answers, MINI_QUESTION_IDS);

      await db.placementExam.create({
        data: {
          studentId: user.id,
          score: result.score,
          level: result.level,
          answers: JSON.stringify({ mini: true, answers }),
        },
      });

      await db.user.update({ where: { id: user.id }, data: { level: result.level } });

      return Response.json({
        score: result.score,
        level: result.level,
        mini: true,
      });
    }

    const result = scorePlacement(answers);

    await db.placementExam.create({
      data: {
        studentId: user.id,
        score: result.score,
        level: result.level,
        answers: JSON.stringify(answers),
        breakdown: JSON.stringify(result.breakdown),
      },
    });

    await db.user.update({ where: { id: user.id }, data: { level: result.level } });

    const existing = await db.progress.findMany({ where: { studentId: user.id } });
    const byCategory = new Map(existing.map((p) => [p.category, p]));

    // GRAMMAR / VOCABULARY: always set from breakdown
    await db.progress.upsert({
      where: { studentId_category: { studentId: user.id, category: "GRAMMAR" } },
      create: { studentId: user.id, category: "GRAMMAR", score: result.breakdown.grammar, xp: 0, streak: 0 },
      update: { score: result.breakdown.grammar },
    });
    await db.progress.upsert({
      where: { studentId_category: { studentId: user.id, category: "VOCABULARY" } },
      create: { studentId: user.id, category: "VOCABULARY", score: result.breakdown.vocabulary, xp: 0, streak: 0 },
      update: { score: result.breakdown.vocabulary },
    });

    // LISTENING / TRANSLATION / SPEAKING: create-if-absent with score 0
    for (const category of ["LISTENING", "TRANSLATION", "SPEAKING"] as const) {
      if (!byCategory.has(category)) {
        await db.progress.create({
          data: { studentId: user.id, category, score: 0, xp: 0, streak: 0 },
        });
      }
    }

    const refreshed = await db.progress.findMany({ where: { studentId: user.id } });
    const skillScores = SKILL_CATEGORIES.map(
      (category) => refreshed.find((p) => p.category === category)?.score ?? 0
    );
    const overallScore = Math.round(
      skillScores.reduce((sum, s) => sum + s, 0) / skillScores.length
    );
    const overallExisting = refreshed.find((p) => p.category === "OVERALL");
    const overallStreak = Math.max(overallExisting?.streak ?? 0, 1);

    await db.progress.upsert({
      where: { studentId_category: { studentId: user.id, category: "OVERALL" } },
      create: { studentId: user.id, category: "OVERALL", score: overallScore, xp: 50, streak: overallStreak },
      update: { score: overallScore, xp: { increment: 50 }, streak: overallStreak },
    });

    return Response.json({
      score: result.score,
      level: result.level,
      breakdown: result.breakdown,
      xpBonus: 50,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
