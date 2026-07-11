/**
 * Shared objective-item scoring for GRAMMAR/LISTENING/QUIZ exercises.
 *
 * This is the single source of truth for "is this answer correct" —
 * `/api/exercises/[id]/submit` uses it to score and award XP, and
 * `/api/results/[id]/review` uses it to recompute the same result for
 * mistake review. Keeping both call sites on this one function means they
 * can never drift on normalization rules (case/whitespace).
 */

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface ObjectiveItem {
  id: string;
  answer: string;
  explanation?: string;
}

export interface ObjectiveScoreResult {
  score: number;
  perItem: Record<string, { correct: boolean; expected: string; note?: string }>;
  correctCount: number;
  total: number;
}

export function scoreObjectiveItems(
  items: ObjectiveItem[],
  answers: Record<string, unknown>,
  includeExplanation: boolean
): ObjectiveScoreResult {
  const perItem: ObjectiveScoreResult["perItem"] = {};
  let correctCount = 0;

  for (const item of items) {
    const given = typeof answers?.[item.id] === "string" ? (answers[item.id] as string) : "";
    const correct = given.length > 0 && normalizeAnswer(given) === normalizeAnswer(item.answer);
    if (correct) correctCount++;
    perItem[item.id] = {
      correct,
      expected: item.answer,
      ...(includeExplanation && item.explanation ? { note: item.explanation } : {}),
    };
  }

  const total = items.length;
  const score = total > 0 ? Math.round((100 * correctCount) / total) : 0;
  return { score, perItem, correctCount, total };
}

export interface ReviewItem {
  prompt: string;
  given: string;
  /** The correct answer, or null when the student already got it right (nothing to correct). */
  expected: string | null;
  correct: boolean;
  note: string | null;
}

const OBJECTIVE_TYPES = new Set(["GRAMMAR", "LISTENING", "QUIZ"]);

/** GRAMMAR items carry `prompt`; LISTENING/QUIZ items carry `question`. */
function promptFor(item: Record<string, unknown>): string {
  if (typeof item.prompt === "string") return item.prompt;
  if (typeof item.question === "string") return item.question;
  return "";
}

/**
 * Recompute per-item review rows for a completed attempt from the exercise's
 * stored `data` and the student's stored `answers` (the raw submit body).
 * Objective types are re-scored with `scoreObjectiveItems` — the exact
 * function submit uses — so review can't disagree with the score that was
 * actually awarded. VOCABULARY and the AI-scored types (TRANSLATION,
 * CONVERSATION, PICTURE, STORY) have no fixed per-item "expected" answer to
 * diff against, so this returns null and the caller falls back to the
 * attempt's overall score/feedback.
 */
export function buildReviewItems(type: string, data: unknown, answers: unknown): ReviewItem[] | null {
  if (!OBJECTIVE_TYPES.has(type)) return null;

  const d = data as { items?: unknown } | null | undefined;
  const rawItems = Array.isArray(d?.items) ? d.items : [];
  const items = rawItems as (ObjectiveItem & Record<string, unknown>)[];

  const answerMap =
    answers && typeof answers === "object" && (answers as Record<string, unknown>).answers
      ? (((answers as Record<string, unknown>).answers as Record<string, unknown>) ?? {})
      : {};

  const { perItem } = scoreObjectiveItems(items, answerMap, type === "GRAMMAR");

  return items.map((item) => {
    const given = typeof answerMap[item.id] === "string" ? (answerMap[item.id] as string) : "";
    const result = perItem[item.id];
    return {
      prompt: promptFor(item),
      given,
      expected: result.correct ? null : result.expected,
      correct: result.correct,
      note: result.note ?? null,
    };
  });
}
