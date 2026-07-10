import { db } from "./db";
import type { ExerciseType, GamificationUpdate, Level, ProgressCategory } from "@/types";

const SKILL_CATEGORIES: ProgressCategory[] = [
  "GRAMMAR",
  "VOCABULARY",
  "TRANSLATION",
  "LISTENING",
  "SPEAKING",
];

/** Which skill categories an exercise type feeds into. */
export function categoriesForType(type: ExerciseType): ProgressCategory[] {
  switch (type) {
    case "GRAMMAR":
      return ["GRAMMAR"];
    case "VOCABULARY":
      return ["VOCABULARY"];
    case "TRANSLATION":
      return ["TRANSLATION"];
    case "LISTENING":
      return ["LISTENING"];
    case "QUIZ":
      return ["GRAMMAR", "VOCABULARY"];
    case "CONVERSATION":
    case "PICTURE":
    case "STORY":
      return ["SPEAKING"];
  }
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(previous: Date, now: Date): boolean {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return sameDay(previous, yesterday);
}

/**
 * Record an activity result for a student: updates skill EMAs, total XP,
 * streak, and OVERALL score. Category score EMA: new = 0.7*old + 0.3*score.
 */
export async function applyGamification(
  studentId: string,
  type: ExerciseType,
  score: number,
  xpEarned: number
): Promise<GamificationUpdate> {
  const now = new Date();
  const categories = categoriesForType(type);

  const existing = await db.progress.findMany({ where: { studentId } });
  const byCategory = new Map(existing.map((p) => [p.category, p]));

  // Update touched skill categories
  for (const category of categories) {
    const row = byCategory.get(category);
    const newScore = row
      ? Math.round(0.7 * row.score + 0.3 * score)
      : Math.round(score);
    const xpShare = Math.max(1, Math.round(xpEarned / categories.length));
    const updated = await db.progress.upsert({
      where: { studentId_category: { studentId, category } },
      create: { studentId, category, score: newScore, xp: xpShare, streak: 0 },
      update: { score: newScore, xp: { increment: xpShare } },
    });
    byCategory.set(category, updated);
  }

  // Streak: based on the last OVERALL activity timestamp
  const overall = byCategory.get("OVERALL");
  let streak = 1;
  if (overall) {
    const last = overall.updatedAt;
    if (sameDay(last, now)) streak = Math.max(1, overall.streak);
    else if (isYesterday(last, now)) streak = overall.streak + 1;
    else streak = 1;
  }

  // OVERALL score = average of the 5 skill categories that exist
  const skillRows = SKILL_CATEGORIES.map((c) => byCategory.get(c)).filter(
    (r): r is NonNullable<typeof r> => Boolean(r)
  );
  const overallScore = skillRows.length
    ? Math.round(skillRows.reduce((sum, r) => sum + r.score, 0) / skillRows.length)
    : Math.round(score);

  const updatedOverall = await db.progress.upsert({
    where: { studentId_category: { studentId, category: "OVERALL" } },
    create: {
      studentId,
      category: "OVERALL",
      score: overallScore,
      xp: xpEarned,
      streak,
    },
    update: { score: overallScore, xp: { increment: xpEarned }, streak },
  });
  byCategory.set("OVERALL", updatedOverall);

  // Level progression: placement sets the level; sustained performance advances it.
  // BEGINNER -> INTERMEDIATE at OVERALL >= 80 with 10+ completed exercises;
  // INTERMEDIATE -> ADVANCED at OVERALL >= 85 with 25+. Unplaced students stay
  // unplaced until they take the placement exam.
  const user = await db.user.findUnique({ where: { id: studentId } });
  let level = (user?.level as Level | null) ?? "BEGINNER";
  let levelUp = false;

  if (user?.level === "BEGINNER" || user?.level === "INTERMEDIATE") {
    // Count DISTINCT exercises completed, so replaying the same exercise
    // can't inflate the progression threshold.
    const distinct = await db.exerciseResult.findMany({
      where: { studentId },
      distinct: ["exerciseId"],
      select: { exerciseId: true },
    });
    const resultCount = distinct.length;
    const nextLevel: Level | null =
      user.level === "BEGINNER" && overallScore >= 80 && resultCount >= 10
        ? "INTERMEDIATE"
        : user.level === "INTERMEDIATE" && overallScore >= 85 && resultCount >= 25
          ? "ADVANCED"
          : null;
    if (nextLevel) {
      await db.user.update({ where: { id: studentId }, data: { level: nextLevel } });
      level = nextLevel;
      levelUp = true;
    }
  }

  const skills: Partial<Record<ProgressCategory, number>> = {};
  for (const [category, row] of byCategory) {
    skills[category as ProgressCategory] = row.score;
  }

  return {
    xp: updatedOverall.xp,
    streak,
    levelUp,
    level,
    skills,
  };
}

/** XP for a completed exercise. */
export function xpForScore(points: number, score: number): number {
  if (score <= 0) return 0;
  return Math.max(1, Math.round((points * score) / 100));
}
