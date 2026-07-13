import { describe, it, expect } from "vitest";
import {
  sessionPhase,
  buildRoster,
  buildScoreboard,
  redactScoreboardForStudent,
  durationLabel,
  type ScoreboardExercise,
} from "@/lib/session";

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

describe("redactScoreboardForStudent", () => {
  const board: ScoreboardExercise[] = [
    {
      exerciseId: "e1",
      title: "Grammar",
      type: "GRAMMAR",
      entries: [
        { studentId: "me", name: "Me", exerciseId: "e1", score: 90, completedAt: "2026-07-13T12:05:00.000Z" },
        { studentId: "peer", name: "Peer", exerciseId: "e1", score: 40, completedAt: "2026-07-13T12:06:00.000Z" },
      ],
      completedCount: 2,
      averageScore: 65,
    },
  ];

  it("strips peers' entries and keeps only the requesting student's own entry", () => {
    const redacted = redactScoreboardForStudent(board, "me");
    expect(redacted[0].entries).toHaveLength(1);
    expect(redacted[0].entries[0].studentId).toBe("me");
    expect(redacted[0].entries.some((e) => e.studentId === "peer")).toBe(false);
  });

  it("leaves completedCount and averageScore (aggregates) unchanged", () => {
    const redacted = redactScoreboardForStudent(board, "me");
    expect(redacted[0].completedCount).toBe(2);
    expect(redacted[0].averageScore).toBe(65);
  });

  it("yields empty entries for a student who did not complete, but keeps the aggregates", () => {
    const redacted = redactScoreboardForStudent(board, "absent");
    expect(redacted[0].entries).toEqual([]);
    expect(redacted[0].completedCount).toBe(2);
    expect(redacted[0].averageScore).toBe(65);
  });

  it("does not mutate the input board", () => {
    redactScoreboardForStudent(board, "me");
    expect(board[0].entries).toHaveLength(2);
  });
});

describe("durationLabel", () => {
  it("returns notCompleted when either endpoint is missing", () => {
    expect(durationLabel(null, "2026-07-13T12:05:00Z")).toEqual({ key: "session.notCompleted" });
    expect(durationLabel("2026-07-13T12:00:00Z", null)).toEqual({ key: "session.notCompleted" });
  });
  it("under a minute -> durationUnder1", () => {
    expect(durationLabel("2026-07-13T12:00:00Z", "2026-07-13T12:00:20Z")).toEqual({
      key: "session.durationUnder1",
    });
  });
  it("minutes-only -> durationMinutes with n", () => {
    expect(durationLabel("2026-07-13T12:00:00Z", "2026-07-13T12:05:00Z")).toEqual({
      key: "session.durationMinutes",
      vars: { n: 5 },
    });
  });
  it("an hour or more -> durationHours with h and m", () => {
    expect(durationLabel("2026-07-13T12:00:00Z", "2026-07-13T13:30:00Z")).toEqual({
      key: "session.durationHours",
      vars: { h: 1, m: 30 },
    });
    expect(durationLabel("2026-07-13T12:00:00Z", "2026-07-13T13:00:00Z")).toEqual({
      key: "session.durationHours",
      vars: { h: 1, m: 0 },
    });
  });
});
