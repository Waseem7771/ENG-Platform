import { describe, it, expect } from "vitest";
import { sessionPhase, buildRoster, buildScoreboard } from "@/lib/session";

const now = new Date("2026-07-13T12:00:00Z");

describe("sessionPhase", () => {
  it("ACTIVE -> LIVE, ENDED -> ENDED", () => {
    expect(sessionPhase({ status: "ACTIVE", scheduledAt: null }, now)).toBe("LIVE");
    expect(sessionPhase({ status: "ENDED", scheduledAt: null }, now)).toBe("ENDED");
  });
  it("WAITING with future scheduledAt -> SCHEDULED, else LOBBY", () => {
    expect(sessionPhase({ status: "WAITING", scheduledAt: "2026-07-13T13:00:00Z" }, now)).toBe("SCHEDULED");
    expect(sessionPhase({ status: "WAITING", scheduledAt: "2026-07-13T11:00:00Z" }, now)).toBe("LOBBY");
    expect(sessionPhase({ status: "WAITING", scheduledAt: null }, now)).toBe("LOBBY");
  });
});

describe("buildRoster", () => {
  it("unions enrolled with joined, joined-first then name", () => {
    const r = buildRoster(
      [{ studentId: "a", name: "Ann" }, { studentId: "b", name: "Bob" }, { studentId: "c", name: "Cy" }],
      [{ studentId: "b", joinedAt: "2026-07-13T12:01:00Z" }],
    );
    expect(r.map((e) => [e.studentId, e.joined])).toEqual([["b", true], ["a", false], ["c", false]]);
    expect(r[0].joinedAt).toBe("2026-07-13T12:01:00.000Z");
    expect(r[1].joinedAt).toBeNull();
  });
});

describe("buildScoreboard", () => {
  it("one best entry per student per exercise; completedCount + average", () => {
    const board = buildScoreboard(
      [{ exerciseId: "e1", title: "Grammar", type: "GRAMMAR" }],
      [
        { studentId: "a", name: "Ann", exerciseId: "e1", score: 40, completedAt: "2026-07-13T12:02:00Z" },
        { studentId: "a", name: "Ann", exerciseId: "e1", score: 90, completedAt: "2026-07-13T12:05:00Z" },
        { studentId: "b", name: "Bob", exerciseId: "e1", score: 60, completedAt: "2026-07-13T12:03:00Z" },
      ],
    );
    expect(board).toHaveLength(1);
    expect(board[0].completedCount).toBe(2);
    expect(board[0].averageScore).toBe(75); // (90 + 60) / 2
    expect(board[0].entries.find((e) => e.studentId === "a")!.score).toBe(90);
  });
  it("exercise with no results -> empty entries, null average", () => {
    const board = buildScoreboard([{ exerciseId: "e2", title: "Quiz", type: "QUIZ" }], []);
    expect(board[0].entries).toEqual([]);
    expect(board[0].averageScore).toBeNull();
    expect(board[0].completedCount).toBe(0);
  });
});
