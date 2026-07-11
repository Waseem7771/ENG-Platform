import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { seedCurriculum, CURRICULUM } from "../prisma/curriculum";

beforeAll(async () => {
  // Curriculum needs the exercise library; reuse the real seed (idempotent).
  const { seedLibrary } = await import("../prisma/seed");
  await seedLibrary(db);
  await seedCurriculum(db);
  await seedCurriculum(db); // idempotency: second run must not duplicate
});

describe("starter curriculum", () => {
  it("creates 8 lessons per level (2 units x 4), 24 total, classId null", async () => {
    const lessons = await db.lesson.findMany({ where: { classId: null } });
    expect(lessons).toHaveLength(24);
    for (const level of ["BEGINNER", "INTERMEDIATE", "ADVANCED"]) {
      expect(lessons.filter((l) => l.level === level)).toHaveLength(8);
    }
  });
  it("marks exactly one checkpoint per unit per level", async () => {
    const checkpoints = await db.lesson.findMany({ where: { classId: null, isCheckpoint: true } });
    expect(checkpoints).toHaveLength(6);
    for (const c of checkpoints) expect(c.order).toBe(4);
  });
  it("assigns every lesson at least one exercise of the lesson's level", async () => {
    const lessons = await db.lesson.findMany({
      where: { classId: null },
      include: { exercises: true },
    });
    for (const l of lessons) {
      expect(l.exercises.length, `${l.id} has no exercises`).toBeGreaterThan(0);
      for (const ex of l.exercises) expect(ex.difficulty).toBe(l.level);
    }
  });
  it("checkpoint lessons contain exactly one QUIZ", async () => {
    const cps = await db.lesson.findMany({ where: { isCheckpoint: true }, include: { exercises: true } });
    for (const c of cps) {
      expect(c.exercises).toHaveLength(1);
      expect(c.exercises[0].type).toBe("QUIZ");
    }
  });
});
