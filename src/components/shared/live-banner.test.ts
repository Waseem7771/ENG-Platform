import { describe, it, expect } from "vitest";
import {
  isSessionRoomRoute,
  shouldShowBanner,
  type LiveInfo,
} from "./live-banner-logic";

const live: LiveInfo = { id: "sess_A", title: "Unit 3", className: "Beginners A1" };

describe("isSessionRoomRoute", () => {
  it("is true inside a session room (/student/sessions/<id>)", () => {
    expect(isSessionRoomRoute("/student/sessions/sess_A")).toBe(true);
  });
  it("is true for deeper nested room routes", () => {
    expect(isSessionRoomRoute("/student/sessions/sess_A/anything")).toBe(true);
  });
  it("is FALSE on the sessions list page (exact /student/sessions)", () => {
    expect(isSessionRoomRoute("/student/sessions")).toBe(false);
  });
  it("is false on other student pages", () => {
    expect(isSessionRoomRoute("/student")).toBe(false);
    expect(isSessionRoomRoute("/student/practice")).toBe(false);
    expect(isSessionRoomRoute("/student/progress")).toBe(false);
  });
  it("is false on teacher session routes", () => {
    expect(isSessionRoomRoute("/teacher/sessions/sess_A")).toBe(false);
  });
});

describe("shouldShowBanner", () => {
  it("hides when there is no live session", () => {
    expect(shouldShowBanner(null, "/student", null)).toBe(false);
  });

  it("shows on a normal student page when a class is live and not dismissed", () => {
    expect(shouldShowBanner(live, "/student", null)).toBe(true);
    expect(shouldShowBanner(live, "/student/practice", null)).toBe(true);
    expect(shouldShowBanner(live, "/student/progress", null)).toBe(true);
  });

  it("shows on the sessions LIST page (not a room)", () => {
    expect(shouldShowBanner(live, "/student/sessions", null)).toBe(true);
  });

  it("hides inside the live session's own room", () => {
    expect(shouldShowBanner(live, "/student/sessions/sess_A", null)).toBe(false);
  });

  it("hides inside ANY session room, even a different session's", () => {
    expect(shouldShowBanner(live, "/student/sessions/sess_OTHER", null)).toBe(false);
  });

  it("hides when THIS live session's id has been dismissed", () => {
    expect(shouldShowBanner(live, "/student", "sess_A")).toBe(false);
  });

  it("still shows after dismissing a DIFFERENT (earlier) session — dismissal is per-id", () => {
    // Student dismissed session B earlier; a new session A is live now → re-show.
    expect(shouldShowBanner(live, "/student", "sess_B")).toBe(true);
  });
});
