/**
 * Pure helpers for the placement exam's localStorage draft
 * (`sp-placement-draft`). Parsing and reconciliation are kept free of any
 * browser APIs so they can be unit-tested directly; the page owns the actual
 * localStorage reads and writes.
 */

export type PlacementDraft = {
  answers: Record<string, string>;
  qIndex: number;
  phase?: "exam" | "review";
};

/**
 * Parse a raw localStorage value into a structurally valid draft.
 * Returns null for anything invalid: missing or unparseable JSON, a non-object
 * root, non-object/null `answers`, a `qIndex` that is not a non-negative
 * finite integer, or an unrecognized `phase`. Non-string `answers` values are
 * dropped rather than invalidating the whole draft.
 */
export function parseDraft(raw: string | null): PlacementDraft | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;

  const { answers, qIndex, phase } = parsed as Record<string, unknown>;

  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) return null;
  if (typeof qIndex !== "number" || !Number.isInteger(qIndex) || qIndex < 0) return null;
  if (phase !== undefined && phase !== "exam" && phase !== "review") return null;

  const validAnswers: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value === "string") validAnswers[key] = value;
  }

  return { answers: validAnswers, qIndex, ...(phase ? { phase } : {}) };
}

/**
 * Reconcile a parsed draft against the actual question list: drop answer keys
 * that are not real question ids and clamp `qIndex` into
 * [0, questionIds.length - 1]. Returns null when no answers survive — there is
 * nothing worth resuming.
 */
export function reconcileDraft(draft: PlacementDraft, questionIds: string[]): PlacementDraft | null {
  const known = new Set(questionIds);

  const answers: Record<string, string> = {};
  for (const [id, value] of Object.entries(draft.answers)) {
    if (known.has(id)) answers[id] = value;
  }
  if (Object.keys(answers).length === 0) return null;

  const qIndex = Math.min(Math.max(draft.qIndex, 0), questionIds.length - 1);
  return { answers, qIndex, ...(draft.phase ? { phase: draft.phase } : {}) };
}
