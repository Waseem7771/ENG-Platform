import { ApiError, errorResponse, requireOwnedClass } from "@/lib/guard";
import { db } from "@/lib/db";

/**
 * Removes a student from a class (deletes the ClassStudent enrollment row
 * only — the student's User row, progress, and results are untouched). 404s
 * if the caller doesn't own the class (via requireOwnedClass) OR if the
 * student isn't currently enrolled, so classes are no longer create-or-destroy
 * only (spec §8).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id, studentId } = await params;
    await requireOwnedClass(id);

    const enrollment = await db.classStudent.findUnique({
      where: { classId_studentId: { classId: id, studentId } },
    });
    if (!enrollment) throw new ApiError(404, "This student is not enrolled in this class");

    await db.classStudent.delete({ where: { id: enrollment.id } });

    // A revoked enrollment must not leave a usable session join token: the chat
    // and submit-attribution paths authorize on a SessionStudent row, so drop
    // this student's joins for every session of this class. Otherwise a removed
    // student could still post messages or submit a pushed exercise (and land on
    // the live scoreboard/recap) even though the room GET now 403s them.
    await db.sessionStudent.deleteMany({
      where: { studentId, session: { classId: id } },
    });

    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
