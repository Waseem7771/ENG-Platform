import { describe, it, expect } from "vitest";
import { pickNextExercise, weakestSkillCategory } from "@/lib/recommend";

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
