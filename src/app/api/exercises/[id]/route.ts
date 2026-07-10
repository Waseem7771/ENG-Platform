import { ApiError, errorResponse, requireTeacher, requireUser } from "@/lib/guard";
import { db } from "@/lib/db";

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
      return {
        ...d,
        items: d.items.map(({ reference: _reference, ...rest }) => rest),
      };
    }
  }
  if (type === "PICTURE") {
    const d = data as { scene?: Record<string, unknown> };
    if (d.scene) {
      const { description: _description, ...scene } = d.scene;
      return { ...d, scene };
    }
  }
  return data;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;

    const exercise = await db.exercise.findUnique({ where: { id } });
    if (!exercise) throw new ApiError(404, "Exercise not found");

    let parsed: unknown;
    try {
      parsed = JSON.parse(exercise.data);
    } catch {
      throw new ApiError(500, "Exercise data is corrupted");
    }

    return Response.json({
      ...exercise,
      data: redactGroundTruth(exercise.type, parsed),
    });
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
