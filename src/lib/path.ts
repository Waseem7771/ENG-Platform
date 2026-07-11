import { db } from "@/lib/db";

export const PASS_SCORE = 60;

export type LessonStatus = "done" | "current" | "locked";

export interface PathExercise {
  id: string;
  title: string;
  type: string;
  completed: boolean;
  bestScore: number | null;
}

export interface PathLesson {
  id: string;
  title: string;
  order: number;
  isCheckpoint: boolean;
  status: LessonStatus;
  exercises: PathExercise[];
}

export interface PathUnit {
  unit: number;
  lessons: PathLesson[];
  unlocked: boolean;
}

export interface PathResponse {
  placed: boolean;
  level: string | null;
  units: PathUnit[]; // empty when !placed
  continue: { lessonId: string; exerciseId: string; exerciseTitle: string; lessonTitle: string; type: string } | null;
}

interface InputLesson {
  id: string;
  title: string;
  unit: number;
  order: number;
  isCheckpoint: boolean;
  exercises: Array<{ id: string; title: string; type: string }>;
}

/** Pure — fully unit-testable. Groups lessons by unit, sorted by unit then order,
 * and computes each lesson's status plus the single "continue" pointer. */
export function derivePath(
  lessons: InputLesson[],
  bestScores: Map<string, number>
): { units: PathUnit[]; continue: PathResponse["continue"] } {
  const unitNumbers = Array.from(new Set(lessons.map((l) => l.unit))).sort((a, b) => a - b);

  const lessonsByUnit = new Map<number, InputLesson[]>();
  for (const unitNum of unitNumbers) {
    lessonsByUnit.set(
      unitNum,
      lessons
        .filter((l) => l.unit === unitNum)
        .sort((a, b) => a.order - b.order)
    );
  }

  const units: PathUnit[] = [];
  let cont: PathResponse["continue"] = null;
  let previousUnitCheckpointDone: boolean = true; // unit 1 is always unlocked

  for (const unitNum of unitNumbers) {
    const unlocked: boolean = previousUnitCheckpointDone;
    const unitLessons = lessonsByUnit.get(unitNum) ?? [];

    let currentAssigned = false;
    let checkpointDone = false;
    const pathLessons: PathLesson[] = [];

    for (const lesson of unitLessons) {
      const pathExercises: PathExercise[] = lesson.exercises.map((ex) => {
        const bestScore = bestScores.get(ex.id) ?? null;
        return {
          id: ex.id,
          title: ex.title,
          type: ex.type,
          completed: bestScore !== null && bestScore >= PASS_SCORE,
          bestScore,
        };
      });

      // A lesson with zero exercises is vacuously done (passes the every() check).
      const lessonDone = pathExercises.every((ex) => ex.completed);

      let status: LessonStatus;
      if (!unlocked) {
        status = "locked";
      } else if (lessonDone) {
        status = "done";
      } else if (!currentAssigned) {
        status = "current";
        currentAssigned = true;
      } else {
        status = "locked";
      }

      if (status === "current" && cont === null) {
        const firstUnpassed = pathExercises.find((ex) => !ex.completed);
        if (firstUnpassed) {
          cont = {
            lessonId: lesson.id,
            exerciseId: firstUnpassed.id,
            exerciseTitle: firstUnpassed.title,
            lessonTitle: lesson.title,
            type: firstUnpassed.type,
          };
        }
      }

      // A unit's checkpoint only counts as done for gating the next unit if both:
      // (1) the checkpoint lesson is passed, AND
      // (2) the unit itself is unlocked (not locked due to previous unit's checkpoint failure).
      // This assumes every unit has exactly one checkpoint lesson; units without one keep later units locked.
      if (lesson.isCheckpoint && lessonDone) checkpointDone = true;

      pathLessons.push({
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        isCheckpoint: lesson.isCheckpoint,
        status,
        exercises: pathExercises,
      });
    }

    units.push({ unit: unitNum, lessons: pathLessons, unlocked });
    previousUnitCheckpointDone = unlocked && checkpointDone;
  }

  return { units, continue: cont };
}

export async function buildPathForStudent(studentId: string, level: string | null): Promise<PathResponse> {
  if (!level) return { placed: false, level: null, units: [], continue: null };

  const lessons = await db.lesson.findMany({
    where: { classId: null, level },
    orderBy: [{ unit: "asc" }, { order: "asc" }],
    include: { exercises: { select: { id: true, title: true, type: true } } },
  });

  const results = await db.exerciseResult.groupBy({
    by: ["exerciseId"],
    where: { studentId },
    _max: { score: true },
  });

  const best = new Map(results.map((r) => [r.exerciseId, r._max.score ?? 0]));
  const { units, continue: cont } = derivePath(lessons, best);

  return { placed: true, level, units, continue: cont };
}
