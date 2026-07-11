import { errorResponse, requireStudent } from "@/lib/guard";
import { db } from "@/lib/db";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Parse the `?limit=` query param: defaults to 20, always clamped to [1, 50]. */
export function parseResultsLimit(raw: string | null): number {
  if (raw === null) return DEFAULT_LIMIT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.round(parsed));
}

export async function GET(request: Request) {
  try {
    const user = await requireStudent();
    const url = new URL(request.url);
    const limit = parseResultsLimit(url.searchParams.get("limit"));

    const results = await db.exerciseResult.findMany({
      where: { studentId: user.id },
      orderBy: { completedAt: "desc" },
      take: limit,
      include: { exercise: { select: { title: true, type: true } } },
    });

    return Response.json({
      results: results.map((r) => ({
        id: r.id,
        exerciseId: r.exerciseId,
        exerciseTitle: r.exercise.title,
        type: r.exercise.type,
        score: r.score,
        // Per-attempt XP isn't stored (only the running Progress.xp total is),
        // so this is intentionally always null — the contract reserves the
        // field for a future migration rather than faking a number.
        xpEarned: null,
        completedAt: r.completedAt,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
