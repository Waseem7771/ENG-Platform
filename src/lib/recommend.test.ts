import { describe, it, expect } from "vitest";
import { pickNextExercise, weakestSkillCategory, recommendForStudent } from "@/lib/recommend";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const c = (id: string, type: string) => ({ id, title: id, type, difficulty: "BEGINNER" });

describe("pickNextExercise", () => {
  it("prefers the weakest skill's types", () => {
    const out = pickNextExercise({
      candidates: [c("a", "GRAMMAR"), c("b", "LISTENING")],
      lastType: "GRAMMAR",
      weakestCategory: "LISTENING",
    });
    expect(out?.id).toBe("b");
  });
  it("falls back to same-type continuity", () => {
    const out = pickNextExercise({
      candidates: [c("a", "VOCABULARY"), c("b", "GRAMMAR")],
      lastType: "GRAMMAR",
      weakestCategory: null,
    });
    expect(out?.id).toBe("b");
  });
  it("QUIZ serves grammar weakness", () => {
    const out = pickNextExercise({
      candidates: [c("a", "STORY"), c("q", "QUIZ")],
      lastType: null,
      weakestCategory: "GRAMMAR",
    });
    expect(out?.id).toBe("q");
  });
  it("any candidate as last resort; null when none", () => {
    expect(pickNextExercise({ candidates: [c("x", "PICTURE")], lastType: null, weakestCategory: null })?.id).toBe("x");
    expect(pickNextExercise({ candidates: [], lastType: "QUIZ", weakestCategory: "GRAMMAR" })).toBeNull();
  });
});

describe("weakestSkillCategory", () => {
  it("returns the lowest-scoring skill", () => {
    expect(
      weakestSkillCategory([
        { category: "GRAMMAR", score: 80 },
        { category: "LISTENING", score: 20 },
      ])
    ).toBe("LISTENING");
  });
  it("breaks ties alphabetically and ignores OVERALL", () => {
    expect(
      weakestSkillCategory([
        { category: "VOCABULARY", score: 50 },
        { category: "GRAMMAR", score: 50 },
        { category: "OVERALL", score: 10 },
      ])
    ).toBe("GRAMMAR");
  });
  it("returns null with no skill rows", () => {
    expect(weakestSkillCategory([{ category: "OVERALL", score: 10 }])).toBeNull();
    expect(weakestSkillCategory([])).toBeNull();
  });
});

// ==================== Integration touch: recommendForStudent + DB ====================
//
// recommendForStudent takes studentId directly (no session lookup), so unlike
// the route-handler integration tests elsewhere in this repo, no next/headers
// mock is needed here — auth.api.signUpEmail is called directly to get a real
// User row satisfying Exercise.createdById / ExerciseResult.studentId FKs.

const GRAMMAR_ITEM_DATA = {
  items: [
    { id: "g1", kind: "fill-blank", prompt: "p", text: "p", options: ["a", "b"], answer: "a", explanation: "e" },
  ],
};

async function signUp(email: string, role?: "TEACHER") {
  await auth.api.signUpEmail({
    body: { email, password: "password-123", name: "Test User" },
    query: role ? { role } : undefined,
  });
  const user = await db.user.findUnique({ where: { email } });
  return { userId: user!.id };
}

/**
 * Mark every exercise currently matching `where` as passed for `studentId`.
 * The test DB is a single on-disk file shared across the whole `npm test`
 * run (tests/global-setup.ts) with no reset between files, so without this,
 * fixtures created elsewhere would leak into the "unpassed candidates" pool
 * and make these assertions non-deterministic.
 */
async function neutralizeExisting(where: Record<string, unknown>, studentId: string) {
  const existing = await db.exercise.findMany({ where, select: { id: true } });
  for (const ex of existing) {
    await db.exerciseResult.create({ data: { exerciseId: ex.id, studentId, score: 100 } });
  }
}

describe("recommendForStudent (integration, DB-backed)", () => {
  it("never recommends a DRAFT exercise, even when it is the only unpassed candidate at the student's level", async () => {
    const teacher = await signUp("recommend-draft-teacher1@test.local", "TEACHER");
    const student = await signUp("recommend-draft-student1@test.local");
    await neutralizeExisting({ difficulty: "ADVANCED" }, student.userId);

    await db.exercise.create({
      data: {
        title: "Draft Advanced",
        type: "GRAMMAR",
        difficulty: "ADVANCED",
        data: JSON.stringify(GRAMMAR_ITEM_DATA),
        points: 20,
        status: "DRAFT",
        createdById: teacher.userId,
      },
    });

    const recommendation = await recommendForStudent(student.userId, "ADVANCED");
    expect(recommendation).toBeNull();
  });

  it("recommends a PUBLISHED exercise, never the DRAFT one, when both exist at the same level", async () => {
    const teacher = await signUp("recommend-draft-teacher2@test.local", "TEACHER");
    const student = await signUp("recommend-draft-student2@test.local");
    await neutralizeExisting({ difficulty: "ADVANCED" }, student.userId);

    const draft = await db.exercise.create({
      data: {
        title: "Draft Advanced 2",
        type: "GRAMMAR",
        difficulty: "ADVANCED",
        data: JSON.stringify(GRAMMAR_ITEM_DATA),
        points: 20,
        status: "DRAFT",
        createdById: teacher.userId,
      },
    });
    const published = await db.exercise.create({
      data: {
        title: "Published Advanced",
        type: "GRAMMAR",
        difficulty: "ADVANCED",
        data: JSON.stringify(GRAMMAR_ITEM_DATA),
        points: 20,
        status: "PUBLISHED",
        createdById: teacher.userId,
      },
    });

    const recommendation = await recommendForStudent(student.userId, "ADVANCED");
    expect(recommendation?.id).toBe(published.id);
    expect(recommendation?.id).not.toBe(draft.id);
  });

  it("an unplaced student (level=null) never receives a DRAFT — closes the 'every teacher's drafts' hole", async () => {
    const teacher = await signUp("recommend-draft-teacher3@test.local", "TEACHER");
    const student = await signUp("recommend-draft-student3@test.local"); // level defaults to null (unplaced)

    // level=null makes recommendForStudent query with `where {}` (no difficulty
    // filter), which pre-fix matched every exercise regardless of status — so
    // neutralize the whole table for this student, not just one difficulty.
    await neutralizeExisting({}, student.userId);

    await db.exercise.create({
      data: {
        title: "Draft Unplaced",
        type: "GRAMMAR",
        difficulty: "BEGINNER",
        data: JSON.stringify(GRAMMAR_ITEM_DATA),
        points: 10,
        status: "DRAFT",
        createdById: teacher.userId,
      },
    });

    const recommendation = await recommendForStudent(student.userId, null);
    expect(recommendation).toBeNull();
  });
});
