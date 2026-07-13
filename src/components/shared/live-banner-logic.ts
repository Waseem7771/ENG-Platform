/**
 * Pure, dependency-free logic for the cross-page "class is live" banner.
 * Extracted from the client component so the show/suppress/dismiss rules can be
 * unit-tested without React, jsdom, or router mocks (see live-banner.test.ts).
 */

/** The shape of the live session surfaced by GET /api/sessions/live. */
export interface LiveInfo {
  id: string;
  title: string;
  className: string;
}

/**
 * A student session ROOM route looks like `/student/sessions/<id>`. The sessions
 * LIST page is exactly `/student/sessions` (no trailing segment) and is NOT a
 * room, so the banner is still allowed there. Any route nested under
 * `/student/sessions/` counts as being inside a room.
 */
export function isSessionRoomRoute(pathname: string): boolean {
  return pathname.startsWith("/student/sessions/");
}

/**
 * Whether the "class is live now" banner should render.
 *
 * Hidden when any of:
 * - there is no live session,
 * - the student has already dismissed THIS live session's id (dismissal is
 *   per-session-id, so a later, different live session re-shows the banner),
 * - the student is already inside a session room (don't nag in-room).
 */
export function shouldShowBanner(
  live: LiveInfo | null,
  pathname: string,
  dismissedId: string | null,
): boolean {
  if (!live) return false;
  if (dismissedId === live.id) return false;
  if (isSessionRoomRoute(pathname)) return false;
  return true;
}
