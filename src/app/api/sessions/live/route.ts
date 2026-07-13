import { db } from "@/lib/db";
import { errorResponse, requireStudent } from "@/lib/guard";

/**
 * Student "is there a class live right now?" discovery. Returns the SINGLE
 * most-recently-started ACTIVE session across ONLY the classes this student is
 * enrolled in — or `{ live: null }` when there is none.
 *
 * Deliberately tiny: it is polled frequently (see `usePoll`), so it selects
 * just `id`, `title`, and the class `name`, and takes no client input at all —
 * access is scoped entirely by the authenticated student's enrollments, so a
 * session from a class they aren't in can never leak. A non-student is rejected
 * by `requireStudent` (403) before any query runs.
 */
export async function GET() {
  try {
    const user = await requireStudent();

    // Scope strictly to the student's own enrollments. No query param drives
    // this — the only class ids considered are the ones with a ClassStudent row
    // for this studentId.
    const enrollments = await db.classStudent.findMany({
      where: { studentId: user.id },
      select: { classId: true },
    });
    const classIds = enrollments.map((e) => e.classId);

    if (classIds.length === 0) {
      return Response.json({ live: null });
    }

    const session = await db.liveSession.findFirst({
      // ACTIVE sessions always have `startedAt` set (both the go-live-now create
      // and the scheduled "start" path set it) — assert it in the query too so
      // the `startedAt`-desc ordering never has to reason about a NULL, rather
      // than depending on that invariant being enforced only in other files.
      where: { classId: { in: classIds }, status: "ACTIVE", startedAt: { not: null } },
      // Most-recent first: `startedAt` is the truest "which class is live now"
      // key; `createdAt` is a stable tiebreaker.
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        class: { select: { name: true } },
      },
    });

    const live = session
      ? { id: session.id, title: session.title, className: session.class.name }
      : null;

    return Response.json({ live });
  } catch (error) {
    return errorResponse(error);
  }
}
