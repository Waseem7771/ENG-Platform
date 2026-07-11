import { describe, it, expect } from "vitest";
import { derivePath, PASS_SCORE } from "@/lib/path";

const lesson = (id: string, unit: number, order: number, exIds: string[], isCheckpoint = false) => ({
  id, title: id, unit, order, isCheckpoint,
  exercises: exIds.map((e) => ({ id: e, title: e, type: "GRAMMAR" })),
});

const LESSONS = [
  lesson("u1l1", 1, 1, ["a", "b"]),
  lesson("u1l2", 1, 2, ["c"]),
  lesson("u1cp", 1, 3, ["q1"], true),
  lesson("u2l1", 2, 1, ["d"]),
];

describe("derivePath", () => {
  it("fresh student: first lesson current, rest locked, unit 2 locked", () => {
    const { units, continue: cont } = derivePath(LESSONS, new Map());
    expect(units[0].lessons.map((l) => l.status)).toEqual(["current", "locked", "locked"]);
    expect(units[1].unlocked).toBe(false);
    expect(units[1].lessons[0].status).toBe("locked");
    expect(cont).toMatchObject({ lessonId: "u1l1", exerciseId: "a" });
  });
  it("passing threshold is PASS_SCORE inclusive", () => {
    const { units } = derivePath(LESSONS, new Map([["a", PASS_SCORE], ["b", PASS_SCORE - 1]]));
    expect(units[0].lessons[0].status).toBe("current");
    expect(units[0].lessons[0].exercises[0].completed).toBe(true);
    expect(units[0].lessons[0].exercises[1].completed).toBe(false);
  });
  it("finishing a lesson advances current; continue points into it", () => {
    const { units, continue: cont } = derivePath(LESSONS, new Map([["a", 80], ["b", 70]]));
    expect(units[0].lessons.map((l) => l.status)).toEqual(["done", "current", "locked"]);
    expect(cont).toMatchObject({ lessonId: "u1l2", exerciseId: "c" });
  });
  it("checkpoint pass unlocks unit 2", () => {
    const scores = new Map([["a", 80], ["b", 70], ["c", 90], ["q1", 65]]);
    const { units, continue: cont } = derivePath(LESSONS, scores);
    expect(units[1].unlocked).toBe(true);
    expect(units[1].lessons[0].status).toBe("current");
    expect(cont).toMatchObject({ lessonId: "u2l1", exerciseId: "d" });
  });
  it("all done → continue null", () => {
    const scores = new Map([["a", 80], ["b", 70], ["c", 90], ["q1", 65], ["d", 100]]);
    const { units, continue: cont } = derivePath(LESSONS, scores);
    expect(cont).toBeNull();
    expect(units.every((u) => u.lessons.every((l) => l.status === "done"))).toBe(true);
  });
});
