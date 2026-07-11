import { describe, it, expect } from "vitest";
import { MINI_QUESTION_IDS, miniQuestions, scorePlacementSubset, PLACEMENT_QUESTIONS } from "@/lib/placement-questions";

describe("mini placement", () => {
  it("serves exactly the 5 configured questions without answers", () => {
    const qs = miniQuestions();
    expect(qs.map((q) => q.id)).toEqual([...MINI_QUESTION_IDS]);
    for (const q of qs) expect("answer" in q).toBe(false);
  });
  it("all correct → ADVANCED, none correct → BEGINNER", () => {
    const byId = new Map(PLACEMENT_QUESTIONS.map((q) => [q.id, q]));
    const allRight: Record<string, string> = {};
    for (const id of MINI_QUESTION_IDS) allRight[id] = byId.get(id)!.answer;
    expect(scorePlacementSubset(allRight, MINI_QUESTION_IDS)).toMatchObject({ score: 100, level: "ADVANCED" });
    expect(scorePlacementSubset({}, MINI_QUESTION_IDS).level).toBe("BEGINNER");
  });
  it("scores over the subset only (unlisted answers ignored)", () => {
    const byId = new Map(PLACEMENT_QUESTIONS.map((q) => [q.id, q]));
    const answers = { g1: byId.get("g1")!.answer, g9: "whatever" };
    const { score } = scorePlacementSubset(answers, MINI_QUESTION_IDS);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});
