import { describe, it, expect } from "vitest";
import { buildSubmitBody } from "./submit-body";

describe("buildSubmitBody", () => {
  it("merges sessionId into an object payload", () => {
    const body = buildSubmitBody({ answers: { q1: "a" }, timeSpent: 12 }, "sess_1");
    expect(body).toEqual({ answers: { q1: "a" }, timeSpent: 12, sessionId: "sess_1" });
  });

  it("applies sessionId last so a forged client sessionId can't win", () => {
    const body = buildSubmitBody({ answers: {}, sessionId: "attacker" }, "sess_real");
    expect(body.sessionId).toBe("sess_real");
  });

  it("returns just the sessionId for a non-object payload", () => {
    expect(buildSubmitBody(null, "sess_2")).toEqual({ sessionId: "sess_2" });
    expect(buildSubmitBody(undefined, "sess_2")).toEqual({ sessionId: "sess_2" });
    expect(buildSubmitBody("nope", "sess_2")).toEqual({ sessionId: "sess_2" });
    expect(buildSubmitBody(42, "sess_2")).toEqual({ sessionId: "sess_2" });
  });

  it("ignores an array payload rather than spreading its indices", () => {
    expect(buildSubmitBody(["a", "b"], "sess_3")).toEqual({ sessionId: "sess_3" });
  });

  it("does not mutate the input payload", () => {
    const payload = { answers: { q1: "a" } };
    buildSubmitBody(payload, "sess_4");
    expect(payload).toEqual({ answers: { q1: "a" } });
    expect("sessionId" in payload).toBe(false);
  });
});
