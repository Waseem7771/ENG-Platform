import { describe, it, expect } from "vitest";
import { parseDraft, reconcileDraft, type PlacementDraft } from "@/lib/placement-draft";

const IDS = ["g1", "g2", "v1", "r1"];

describe("parseDraft", () => {
  it("round-trips a valid draft including phase", () => {
    const draft: PlacementDraft = { answers: { g1: "is", v1: "cheap" }, qIndex: 2, phase: "review" };
    expect(parseDraft(JSON.stringify(draft))).toEqual(draft);
  });

  it("round-trips a valid draft without phase (legacy shape)", () => {
    const draft: PlacementDraft = { answers: { g1: "is" }, qIndex: 0 };
    expect(parseDraft(JSON.stringify(draft))).toEqual(draft);
  });

  it("returns null for null / empty raw", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseDraft("{not json")).toBeNull();
    expect(parseDraft('{"answers":{"g1":"is"},"qIndex":NaN}')).toBeNull();
  });

  it("returns null for non-object roots", () => {
    expect(parseDraft('"a string"')).toBeNull();
    expect(parseDraft("42")).toBeNull();
    expect(parseDraft("null")).toBeNull();
    expect(parseDraft('[{"answers":{},"qIndex":0}]')).toBeNull();
  });

  it("returns null when answers is null or not an object", () => {
    expect(parseDraft(JSON.stringify({ answers: null, qIndex: 0 }))).toBeNull();
    expect(parseDraft(JSON.stringify({ answers: "g1=is", qIndex: 0 }))).toBeNull();
    expect(parseDraft(JSON.stringify({ answers: ["is"], qIndex: 0 }))).toBeNull();
    expect(parseDraft(JSON.stringify({ qIndex: 0 }))).toBeNull();
  });

  it('returns null when qIndex is a string like "3"', () => {
    expect(parseDraft(JSON.stringify({ answers: { g1: "is" }, qIndex: "3" }))).toBeNull();
  });

  it("returns null for non-finite or non-integer qIndex", () => {
    // 1e999 parses to Infinity — JSON's only route to a non-finite number.
    expect(parseDraft('{"answers":{"g1":"is"},"qIndex":1e999}')).toBeNull();
    expect(parseDraft(JSON.stringify({ answers: { g1: "is" }, qIndex: 1.5 }))).toBeNull();
    expect(parseDraft(JSON.stringify({ answers: { g1: "is" }, qIndex: null }))).toBeNull();
  });

  it("returns null for negative qIndex", () => {
    expect(parseDraft(JSON.stringify({ answers: { g1: "is" }, qIndex: -1 }))).toBeNull();
  });

  it("returns null for an unrecognized phase", () => {
    expect(parseDraft(JSON.stringify({ answers: { g1: "is" }, qIndex: 0, phase: "results" }))).toBeNull();
  });

  it("drops non-string answer values without invalidating the draft", () => {
    const parsed = parseDraft(JSON.stringify({ answers: { g1: "is", g2: 7, v1: null }, qIndex: 1 }));
    expect(parsed).toEqual({ answers: { g1: "is" }, qIndex: 1 });
  });
});

describe("reconcileDraft", () => {
  it("keeps a fully valid draft unchanged, including phase", () => {
    const draft: PlacementDraft = { answers: { g1: "is", r1: "At a hospital" }, qIndex: 3, phase: "review" };
    expect(reconcileDraft(draft, IDS)).toEqual(draft);
  });

  it("drops answer keys that are not real question ids", () => {
    const draft: PlacementDraft = { answers: { g1: "is", ghost: "boo" }, qIndex: 0 };
    expect(reconcileDraft(draft, IDS)).toEqual({ answers: { g1: "is" }, qIndex: 0 });
  });

  it("clamps an out-of-range qIndex to the last question", () => {
    const draft: PlacementDraft = { answers: { g1: "is" }, qIndex: 99 };
    expect(reconcileDraft(draft, IDS)).toEqual({ answers: { g1: "is" }, qIndex: IDS.length - 1 });
  });

  it("clamps a negative qIndex to zero", () => {
    const draft: PlacementDraft = { answers: { g1: "is" }, qIndex: -5 };
    expect(reconcileDraft(draft, IDS)).toEqual({ answers: { g1: "is" }, qIndex: 0 });
  });

  it("returns null when no valid answers remain", () => {
    expect(reconcileDraft({ answers: { ghost: "boo", stale: "x" }, qIndex: 1 }, IDS)).toBeNull();
    expect(reconcileDraft({ answers: {}, qIndex: 0 }, IDS)).toBeNull();
  });

  it("returns null against an empty question list", () => {
    expect(reconcileDraft({ answers: { g1: "is" }, qIndex: 0 }, [])).toBeNull();
  });
});
