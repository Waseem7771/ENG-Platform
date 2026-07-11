import { describe, it, expect } from "vitest";
import { buildReviewItems } from "@/lib/review";

const grammarData = {
  items: [
    { id: "i1", kind: "fill-blank", prompt: "She ___ to school.", answer: "goes", explanation: "3rd person -s" },
    { id: "i2", kind: "fill-blank", prompt: "I ___ tea.", answer: "drink" },
  ],
};

describe("buildReviewItems", () => {
  it("marks correct and wrong answers with expected + note", () => {
    const items = buildReviewItems("GRAMMAR", grammarData, { answers: { i1: "goes", i2: "drank" } });
    expect(items).toHaveLength(2);
    expect(items![0]).toMatchObject({ correct: true, given: "goes" });
    expect(items![1]).toMatchObject({ correct: false, given: "drank", expected: "drink" });
    expect(items![0].note).toBe("3rd person -s");
  });

  it("returns null for AI-scored types", () => {
    expect(buildReviewItems("CONVERSATION", {}, {})).toBeNull();
    expect(buildReviewItems("PICTURE", {}, {})).toBeNull();
  });

  it("returns null for VOCABULARY (no per-item expected answer)", () => {
    expect(buildReviewItems("VOCABULARY", { pairs: [] }, {})).toBeNull();
  });

  it("normalizes case/whitespace the same way submit does", () => {
    const items = buildReviewItems("GRAMMAR", grammarData, { answers: { i1: "  Goes  ", i2: "drink" } });
    expect(items![0].correct).toBe(true);
    expect(items![1].correct).toBe(true);
  });

  it("treats a missing answer as wrong with an empty given", () => {
    const items = buildReviewItems("GRAMMAR", grammarData, { answers: { i1: "goes" } });
    expect(items![1]).toMatchObject({ correct: false, given: "", expected: "drink" });
  });

  it("handles QUIZ items keyed by question instead of prompt", () => {
    const quizData = {
      timePerQuestion: 20,
      items: [{ id: "q1", question: "2 + 2 = ?", options: ["3", "4"], answer: "4" }],
    };
    const items = buildReviewItems("QUIZ", quizData, { answers: { q1: "4" } });
    expect(items).toEqual([{ prompt: "2 + 2 = ?", given: "4", expected: null, correct: true, note: null }]);
  });

  it("returns an empty array when exercise data has no items", () => {
    expect(buildReviewItems("GRAMMAR", {}, { answers: {} })).toEqual([]);
  });
});
