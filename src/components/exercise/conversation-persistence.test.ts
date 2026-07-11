// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { isValidLocalMsg, loadPersistedMessages, maxMessageId, type LocalMsg } from "./conversation-persistence";
import type { ConversationScenario } from "@/types";

const scenario: ConversationScenario = {
  key: "restaurant",
  title: "At the restaurant",
  emoji: "🍽️",
  description: "Order a meal",
  aiRole: "waiter",
  userRole: "customer",
  opening: "Good evening! Welcome to Olive Garden Café.",
  objectives: ["Order a starter", "Ask for the bill"],
};

const KEY = "sp-conv-test";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("maxMessageId", () => {
  it("returns -1 for an empty transcript", () => {
    expect(maxMessageId([])).toBe(-1);
  });
  it("returns the highest id present, regardless of array order", () => {
    const messages: LocalMsg[] = [
      { id: 0, role: "assistant", content: "hi" },
      { id: 3, role: "user", content: "a" },
      { id: 2, role: "assistant", content: "b" },
    ];
    expect(maxMessageId(messages)).toBe(3);
  });
});

describe("isValidLocalMsg", () => {
  it("accepts a well-formed message", () => {
    expect(isValidLocalMsg({ id: 1, role: "user", content: "hi" })).toBe(true);
  });
  it("rejects non-objects", () => {
    expect(isValidLocalMsg("not-an-object")).toBe(false);
    expect(isValidLocalMsg(null)).toBe(false);
    expect(isValidLocalMsg(42)).toBe(false);
  });
  it("rejects a missing/wrong-typed id", () => {
    expect(isValidLocalMsg({ role: "user", content: "hi" })).toBe(false);
    expect(isValidLocalMsg({ id: "1", role: "user", content: "hi" })).toBe(false);
  });
  it("rejects an invalid role", () => {
    expect(isValidLocalMsg({ id: 1, role: "system", content: "hi" })).toBe(false);
  });
  it("rejects non-string content", () => {
    expect(isValidLocalMsg({ id: 1, role: "user", content: 5 })).toBe(false);
  });
});

describe("loadPersistedMessages", () => {
  it("returns the scenario's opening line when nothing is stored", () => {
    const result = loadPersistedMessages(KEY, scenario);
    expect(result).toEqual([{ id: 0, role: "assistant", content: scenario.opening }]);
  });

  it("returns the seed when persistKey is undefined (zero behavior change for non-persisted consumers)", () => {
    window.sessionStorage.setItem("irrelevant", JSON.stringify([{ id: 5, role: "user", content: "hi" }]));
    const result = loadPersistedMessages(undefined, scenario);
    expect(result).toEqual([{ id: 0, role: "assistant", content: scenario.opening }]);
  });

  it("restores a valid stored transcript with ids and feedback intact", () => {
    const stored: LocalMsg[] = [
      { id: 0, role: "assistant", content: scenario.opening },
      { id: 1, role: "user", content: "I would like a table for two." },
      {
        id: 2,
        role: "assistant",
        content: "Right this way!",
        feedback: { hasIssues: true, corrections: [{ original: "a table", corrected: "a table", note: "fine" }], tip: "Great job" },
      },
    ];
    window.sessionStorage.setItem(KEY, JSON.stringify(stored));
    const result = loadPersistedMessages(KEY, scenario);
    expect(result).toEqual(stored);
  });

  it("falls back to the seed on invalid JSON", () => {
    window.sessionStorage.setItem(KEY, "{not valid json");
    const result = loadPersistedMessages(KEY, scenario);
    expect(result).toEqual([{ id: 0, role: "assistant", content: scenario.opening }]);
  });

  it("falls back to the seed on wrong-shape JSON (array of non-messages)", () => {
    window.sessionStorage.setItem(KEY, JSON.stringify([{ x: 1 }]));
    const result = loadPersistedMessages(KEY, scenario);
    expect(result).toEqual([{ id: 0, role: "assistant", content: scenario.opening }]);
  });

  it("falls back to the seed on wrong-shape JSON (a valid-JSON non-array)", () => {
    window.sessionStorage.setItem(KEY, JSON.stringify("not-an-array"));
    const result = loadPersistedMessages(KEY, scenario);
    expect(result).toEqual([{ id: 0, role: "assistant", content: scenario.opening }]);
  });

  it("falls back to the seed on an empty array", () => {
    window.sessionStorage.setItem(KEY, JSON.stringify([]));
    const result = loadPersistedMessages(KEY, scenario);
    expect(result).toEqual([{ id: 0, role: "assistant", content: scenario.opening }]);
  });

  it("strips a tampered feedback field (hasIssues true, corrections not an array) instead of discarding the message", () => {
    const stored = [
      { id: 0, role: "assistant", content: scenario.opening },
      { id: 1, role: "user", content: "hi", feedback: { hasIssues: true, corrections: "not-an-array" } },
    ];
    window.sessionStorage.setItem(KEY, JSON.stringify(stored));
    const result = loadPersistedMessages(KEY, scenario);
    expect(result).toEqual([
      { id: 0, role: "assistant", content: scenario.opening },
      { id: 1, role: "user", content: "hi" },
    ]);
  });

  it("keeps feedback with hasIssues false even if corrections is malformed", () => {
    const stored = [
      { id: 0, role: "assistant", content: scenario.opening },
      { id: 1, role: "user", content: "hi", feedback: { hasIssues: false, corrections: "not-an-array" } },
    ];
    window.sessionStorage.setItem(KEY, JSON.stringify(stored));
    const result = loadPersistedMessages(KEY, scenario);
    expect(result[1]).toEqual(stored[1]);
  });

  it("supports reseeding nextId from the restored transcript's max id + 1", () => {
    const stored: LocalMsg[] = [
      { id: 0, role: "assistant", content: scenario.opening },
      { id: 4, role: "user", content: "hi" },
      { id: 2, role: "assistant", content: "hello" },
    ];
    window.sessionStorage.setItem(KEY, JSON.stringify(stored));
    const result = loadPersistedMessages(KEY, scenario);
    expect(maxMessageId(result) + 1).toBe(5);
  });
});
