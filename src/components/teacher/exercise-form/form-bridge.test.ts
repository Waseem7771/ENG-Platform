// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { consumeFormBridge, isValidBridgeState, writeFormBridge, type ExerciseFormBridgeState } from "./form-bridge";
import { newGrammarItem } from "./types";

const ID = "ex_123";
const KEY = `sp-exercise-form-${ID}`;

function validState(): ExerciseFormBridgeState {
  return {
    title: "My lesson",
    difficulty: "BEGINNER",
    points: 10,
    timeLimit: "60",
    draft: { type: "GRAMMAR", value: [newGrammarItem()] },
  };
}

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("isValidBridgeState", () => {
  it("accepts a well-formed GRAMMAR state", () => {
    expect(isValidBridgeState(validState())).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(isValidBridgeState("nope")).toBe(false);
    expect(isValidBridgeState(null)).toBe(false);
    expect(isValidBridgeState(42)).toBe(false);
  });

  it("rejects a missing/wrong-typed title", () => {
    const s = validState() as unknown as Record<string, unknown>;
    delete s.title;
    expect(isValidBridgeState(s)).toBe(false);
    expect(isValidBridgeState({ ...validState(), title: 5 })).toBe(false);
  });

  it("rejects an invalid difficulty level", () => {
    expect(isValidBridgeState({ ...validState(), difficulty: "EXPERT" })).toBe(false);
  });

  it("rejects a non-numeric points", () => {
    expect(isValidBridgeState({ ...validState(), points: "10" })).toBe(false);
  });

  it("rejects a non-string timeLimit", () => {
    expect(isValidBridgeState({ ...validState(), timeLimit: 60 })).toBe(false);
  });

  it("rejects an unknown draft type", () => {
    expect(isValidBridgeState({ ...validState(), draft: { type: "BOGUS", value: [] } })).toBe(false);
  });

  it("rejects a GRAMMAR draft with a malformed item (missing explanation)", () => {
    const item = { ...newGrammarItem() } as Record<string, unknown>;
    delete item.explanation;
    expect(isValidBridgeState({ ...validState(), draft: { type: "GRAMMAR", value: [item] } })).toBe(false);
  });

  it("rejects a GRAMMAR draft with a bad kind", () => {
    const item = { ...newGrammarItem(), kind: "not-a-kind" };
    expect(isValidBridgeState({ ...validState(), draft: { type: "GRAMMAR", value: [item] } })).toBe(false);
  });

  it("accepts a well-formed VOCABULARY state", () => {
    const state: ExerciseFormBridgeState = {
      ...validState(),
      draft: { type: "VOCABULARY", value: [{ _cid: "c1", word: "cat", meaning: "قطة" }] },
    };
    expect(isValidBridgeState(state)).toBe(true);
  });

  it("rejects a VOCABULARY draft item missing a field", () => {
    const state: ExerciseFormBridgeState = {
      ...validState(),
      draft: { type: "VOCABULARY", value: [{ _cid: "c1", word: "cat" } as never] },
    };
    expect(isValidBridgeState(state)).toBe(false);
  });

  it("accepts a well-formed TRANSLATION state", () => {
    const state: ExerciseFormBridgeState = {
      ...validState(),
      draft: { type: "TRANSLATION", value: [{ _cid: "c1", direction: "ar-en", source: "مرحبا", reference: "hello" }] },
    };
    expect(isValidBridgeState(state)).toBe(true);
  });

  it("rejects a TRANSLATION draft with a bad direction", () => {
    const state = {
      ...validState(),
      draft: { type: "TRANSLATION", value: [{ _cid: "c1", direction: "xx", source: "a", reference: "b" }] },
    };
    expect(isValidBridgeState(state)).toBe(false);
  });

  it("accepts a well-formed LISTENING state", () => {
    const state: ExerciseFormBridgeState = {
      ...validState(),
      draft: {
        type: "LISTENING",
        value: [{ _cid: "c1", transcript: "t", question: "q", options: ["a", "b"], answer: "a" }],
      },
    };
    expect(isValidBridgeState(state)).toBe(true);
  });

  it("rejects a LISTENING draft with non-string options", () => {
    const state = {
      ...validState(),
      draft: {
        type: "LISTENING",
        value: [{ _cid: "c1", transcript: "t", question: "q", options: [1, 2], answer: "a" }],
      },
    };
    expect(isValidBridgeState(state)).toBe(false);
  });

  it("accepts a well-formed QUIZ state", () => {
    const state: ExerciseFormBridgeState = {
      ...validState(),
      draft: {
        type: "QUIZ",
        value: { items: [{ _cid: "c1", question: "q", options: ["a", "b"], answer: "a" }], timePerQuestion: 20 },
      },
    };
    expect(isValidBridgeState(state)).toBe(true);
  });

  it("rejects a QUIZ draft with a non-numeric timePerQuestion", () => {
    const state = {
      ...validState(),
      draft: {
        type: "QUIZ",
        value: { items: [{ _cid: "c1", question: "q", options: ["a", "b"], answer: "a" }], timePerQuestion: "20" },
      },
    };
    expect(isValidBridgeState(state)).toBe(false);
  });

  it("accepts a well-formed CONVERSATION state", () => {
    const state: ExerciseFormBridgeState = {
      ...validState(),
      draft: {
        type: "CONVERSATION",
        value: {
          title: "At the restaurant",
          emoji: "🍽️",
          description: "d",
          aiRole: "waiter",
          userRole: "customer",
          opening: "hi",
          objectives: "order food",
          fallbackReplies: "ok\nsure\nyes",
        },
      },
    };
    expect(isValidBridgeState(state)).toBe(true);
  });

  it("rejects a CONVERSATION draft missing a required field", () => {
    const value = {
      title: "At the restaurant",
      emoji: "🍽️",
      description: "d",
      aiRole: "waiter",
      userRole: "customer",
      opening: "hi",
      objectives: "order food",
      // fallbackReplies omitted
    };
    expect(isValidBridgeState({ ...validState(), draft: { type: "CONVERSATION", value } })).toBe(false);
  });

  it("accepts a well-formed PICTURE state", () => {
    const state: ExerciseFormBridgeState = {
      ...validState(),
      draft: {
        type: "PICTURE",
        value: { emojis: "🏖️", title: "Beach", description: "d", hints: ["a", "b", "c"], minWords: 30 },
      },
    };
    expect(isValidBridgeState(state)).toBe(true);
  });

  it("rejects a PICTURE draft with the wrong number of hints", () => {
    const state = {
      ...validState(),
      draft: {
        type: "PICTURE",
        value: { emojis: "🏖️", title: "Beach", description: "d", hints: ["a", "b"], minWords: 30 },
      },
    };
    expect(isValidBridgeState(state)).toBe(false);
  });

  it("accepts a well-formed STORY state", () => {
    const state: ExerciseFormBridgeState = {
      ...validState(),
      draft: { type: "STORY", value: { title: "t", genre: "g", opening: "o", minTurns: 6 } },
    };
    expect(isValidBridgeState(state)).toBe(true);
  });

  it("rejects a STORY draft with a non-numeric minTurns", () => {
    const state = {
      ...validState(),
      draft: { type: "STORY", value: { title: "t", genre: "g", opening: "o", minTurns: "6" } },
    };
    expect(isValidBridgeState(state)).toBe(false);
  });
});

describe("writeFormBridge / consumeFormBridge", () => {
  it("round-trips a written state and deletes it on read", () => {
    const state = validState();
    writeFormBridge(ID, state);
    expect(window.sessionStorage.getItem(KEY)).not.toBeNull();

    const consumed = consumeFormBridge(ID);
    expect(consumed).toEqual(state);
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it("returns null when nothing is stored", () => {
    expect(consumeFormBridge(ID)).toBeNull();
  });

  it("returns null (and clears the key) on invalid JSON", () => {
    window.sessionStorage.setItem(KEY, "{not valid json");
    expect(consumeFormBridge(ID)).toBeNull();
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it("returns null (and clears the key) on well-formed JSON with the wrong shape", () => {
    window.sessionStorage.setItem(KEY, JSON.stringify({ foo: "bar" }));
    expect(consumeFormBridge(ID)).toBeNull();
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it("is one-shot — a second consume after the first returns null", () => {
    writeFormBridge(ID, validState());
    expect(consumeFormBridge(ID)).not.toBeNull();
    expect(consumeFormBridge(ID)).toBeNull();
  });

  it("keys different exercise ids independently", () => {
    writeFormBridge("a", { ...validState(), title: "A" });
    writeFormBridge("b", { ...validState(), title: "B" });
    expect(consumeFormBridge("a")?.title).toBe("A");
    expect(consumeFormBridge("b")?.title).toBe("B");
  });

  it("does not throw when the state contains a value JSON.stringify cannot serialize", () => {
    const circular: Record<string, unknown> = { title: "x" };
    circular.self = circular;
    expect(() => writeFormBridge(ID, circular as unknown as ExerciseFormBridgeState)).not.toThrow();
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });
});
