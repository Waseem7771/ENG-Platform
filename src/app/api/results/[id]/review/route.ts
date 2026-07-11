import { ApiError, errorResponse, requireStudent } from "@/lib/guard";
import { db } from "@/lib/db";
import { buildReviewItems } from "@/lib/review";

/** JSON.parse that never throws: corrupt rows fall back to `null` data rather than a 500. */
function safeParse(json: string | null): unknown {
  if (json === null) return null;
  try {
    return JSON.parse(json);
  } catch {
    return undefined; // distinguishable "parse failed" sentinel, vs. a legitimately absent column
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStudent();
    const { id } = await params;

    const result = await db.exerciseResult.findUnique({
      where: { id },
      include: { exercise: { select: { title: true, type: true, data: true } } },
    });
    if (!result || result.studentId !== user.id) throw new ApiError(404, "Result not found");

    const data = safeParse(result.exercise.data);
    const answers = safeParse(result.answers);
    // Corrupt exercise data or a corrupt stored answers blob: never 500, just
    // decline to show a mistake breakdown for this attempt.
    const items = data === undefined || answers === undefined ? null : buildReviewItems(result.exercise.type, data, answers);

    return Response.json({
      score: result.score,
      exerciseTitle: result.exercise.title,
      type: result.exercise.type,
      items,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
