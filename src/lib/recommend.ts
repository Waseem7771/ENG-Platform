import { db } from "@/lib/db";
import { PASS_SCORE } from "@/lib/path";
import type { ExerciseType, ProgressCategory } from "@/types";

export interface Recommendation {
  id: string;
  title: string;
  type: string;
  difficulty: string;
}

/**
 * Pure core: find the weakest skill category from a list of progress rows.
 * Excludes OVERALL, returns the lowest-scoring category, with ties broken
 * alphabetically. Returns null if no non-OVERALL rows or empty list.
 */
export function weakestSkillCategory(
  rows: Array<{ category: string; score: number }>
): string | null {
  const filtered = rows.filter((r) => r.category !== "OVERALL");
  if (filtered.length === 0) return null;

  // Sort by score ascending, then category ascending for deterministic tie-break
  const sorted = [...filtered].sort((a, b) => {
    const scoreCompare = a.score - b.score;
    if (scoreCompare !== 0) return scoreCompare;
    return a.category.localeCompare(b.category);
  });

  return sorted[0].category;
}

interface Candidate {
  id: string;
  title: string;
  type: string;
  difficulty: string;
}

/** Inverse of categoriesForType: which exercise types serve a given weak skill category. */
const TYPES_FOR_CATEGORY: Record<ProgressCategory, ExerciseType[]> = {
  GRAMMAR: ["GRAMMAR", "QUIZ"],
  VOCABULARY: ["VOCABULARY", "QUIZ"],
  TRANSLATION: ["TRANSLATION"],
  LISTENING: ["LISTENING"],
  SPEAKING: ["CONVERSATION", "PICTURE", "STORY"],
  OVERALL: [],
};

/**
 * Pure core: pick the next exercise for a student out of already-filtered
 * candidates (uncompleted, at user level, excluding current). Priority:
 * (1) a candidate whose type serves the weakest skill category,
 * (2) a candidate matching the last-completed type (continuity),
 * (3) any candidate.
 * Within each bucket, the first candidate by input order wins (stable).
 */
export function pickNextExercise(opts: {
  candidates: Candidate[];
  lastType: string | null;
  weakestCategory: string | null;
}): Recommendation | null {
  const { candidates, lastType, weakestCategory } = opts;
  if (candidates.length === 0) return null;

  if (weakestCategory) {
    const wantedTypes = TYPES_FOR_CATEGORY[weakestCategory as ProgressCategory] ?? [];
    const match = candidates.find((c) => wantedTypes.includes(c.type as ExerciseType));
    if (match) return { id: match.id, title: match.title, type: match.type, difficulty: match.difficulty };
  }

  if (lastType) {
    const match = candidates.find((c) => c.type === lastType);
    if (match) return { id: match.id, title: match.title, type: match.type, difficulty: match.difficulty };
  }

  const first = candidates[0];
  return { id: first.id, title: first.title, type: first.type, difficulty: first.difficulty };
}

/**
 * Db-backed: loads uncompleted-at-level candidates (excluding anything the
 * student already passed at >= PASS_SCORE and, optionally, excludeId), the
 * student's weakest skill category from Progress (excluding OVERALL; null
 * when no rows), and the type of the student's most recently completed
 * exercise, then delegates to pickNextExercise.
 */
export async function recommendForStudent(
  studentId: string,
  level: string | null,
  excludeId?: string
): Promise<Recommendation | null> {
  // Drafts are the owning teacher's work-in-progress and must never be a
  // recommendation candidate — same convention as studentExerciseWhere and
  // the single-GET draft-404. Without this, an unplaced student (level=null)
  // falls into `where {}`, which would surface every teacher's drafts.
  const where: { difficulty?: string; status: "PUBLISHED" } = { status: "PUBLISHED" };
  if (level) where.difficulty = level;

  const [exercises, passedResults] = await Promise.all([
    db.exercise.findMany({
      where,
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, type: true, difficulty: true },
    }),
    db.exerciseResult.groupBy({
      by: ["exerciseId"],
      where: { studentId },
      _max: { score: true },
    }),
  ]);
  const passedIds = new Set(
    passedResults
      .filter((r) => (r._max.score ?? 0) >= PASS_SCORE)
      .map((r) => r.exerciseId)
  );

  const candidates: Candidate[] = exercises
    .filter((ex) => !passedIds.has(ex.id) && ex.id !== excludeId)
    .map((ex) => ({ id: ex.id, title: ex.title, type: ex.type, difficulty: ex.difficulty }));

  const progress = await db.progress.findMany({
    where: { studentId },
    orderBy: { category: "asc" },
  });
  const weakestCategory = weakestSkillCategory(progress);

  const lastResult = await db.exerciseResult.findFirst({
    where: { studentId },
    orderBy: { completedAt: "desc" },
    include: { exercise: { select: { type: true } } },
  });
  const lastType = lastResult?.exercise.type ?? null;

  return pickNextExercise({ candidates, lastType, weakestCategory });
}
