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
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
