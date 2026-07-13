/**
 * Merge the current session's id into an exercise submit payload for an
 * in-room submission. The players emit a plain object payload (e.g.
 * `{ answers, timeSpent }`); this attaches `sessionId` so the submit route can
 * attribute the result to the live session.
 *
 * `sessionId` is applied LAST so a client-supplied `sessionId` inside `payload`
 * can never override the real one. The value is still only advisory: the server
 * re-validates it (Task 5 — must be ACTIVE, joined, and this exercise pushed
 * here) and stores null otherwise, so this helper only needs to attach it.
 *
 * Pure and side-effect free: it never mutates `payload`.
 */
export function buildSubmitBody(payload: unknown, sessionId: string): Record<string, unknown> {
  const base =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  return { ...base, sessionId };
}
