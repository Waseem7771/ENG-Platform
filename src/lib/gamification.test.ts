import { describe, it, expect } from "vitest";
import { xpForScore, categoriesForType } from "@/lib/gamification";

describe("xpForScore", () => {
  it("scales points by score percentage", () => {
    expect(xpForScore(10, 100)).toBe(10);
    expect(xpForScore(10, 50)).toBe(5);
  });
  it("awards minimum 1 XP for any positive score", () => {
    expect(xpForScore(10, 1)).toBe(1);
  });
  it("awards 0 XP for zero score", () => {
    expect(xpForScore(10, 0)).toBe(0);
  });
});

describe("categoriesForType", () => {
  it("maps QUIZ to grammar+vocabulary", () => {
    expect(categoriesForType("QUIZ")).toEqual(["GRAMMAR", "VOCABULARY"]);
  });
  it("maps CONVERSATION to speaking", () => {
    expect(categoriesForType("CONVERSATION")).toEqual(["SPEAKING"]);
  });
});
