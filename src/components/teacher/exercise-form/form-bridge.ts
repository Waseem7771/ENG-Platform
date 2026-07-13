import type { Level } from "@/types";
import type {
  ConversationDraft,
  ExerciseDraftForType,
  GrammarItemDraft,
  ListeningItemDraft,
  PictureDraft,
  QuizItemDraft,
  StoryDraft,
  TranslationItemDraft,
  VocabularyPairDraft,
} from "./types";

/**
 * Full editable snapshot of ExerciseForm's own state — everything computeData/the builders
 * read (title, difficulty, points, timeLimit, and the active builder's draft items) — mirrored
 * to sessionStorage while a saved row exists. This is the bridge that survives the /new -> /edit
 * route-segment swap: `onSaved(id)` triggers `router.replace(...)`, which crosses segments and
 * unmounts the /new ExerciseForm, then mounts a fresh one on /edit that re-fetches from the
 * server. Any typing done between the id-capture and the unmount only ever lived in the doomed
 * /new instance's React state — the bridge is the one place it can reach the new instance.
 *
 * Each entry is stamped with a write time and only ever consumed within FORM_BRIDGE_FRESHNESS_MS
 * of that stamp (see consumeFormBridge below) — the handoff this exists for completes in well
 * under a second, so bounding freshness costs it nothing while making a leftover entry from an
 * abandoned earlier session (tab closed and reopened hours later, say) inert instead of
 * silently overriding a fresh server read.
 */
export interface ExerciseFormBridgeState {
  title: string;
  difficulty: Level;
  points: number;
  timeLimit: string;
  draft: ExerciseDraftForType;
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

function isValidGrammarItem(v: unknown): v is GrammarItemDraft {
  if (!v || typeof v !== "object") return false;
  const it = v as Partial<GrammarItemDraft>;
  return (
    isString(it._cid) &&
    (it.kind === "fill-blank" || it.kind === "error-correction" || it.kind === "reorder") &&
    isString(it.prompt) &&
    isString(it.text) &&
    isStringArray(it.options) &&
    isString(it.answer) &&
    isString(it.explanation)
  );
}

function isValidVocabularyPair(v: unknown): v is VocabularyPairDraft {
  if (!v || typeof v !== "object") return false;
  const it = v as Partial<VocabularyPairDraft>;
  return isString(it._cid) && isString(it.word) && isString(it.meaning);
}

function isValidTranslationItem(v: unknown): v is TranslationItemDraft {
  if (!v || typeof v !== "object") return false;
  const it = v as Partial<TranslationItemDraft>;
  return isString(it._cid) && (it.direction === "ar-en" || it.direction === "en-ar") && isString(it.source) && isString(it.reference);
}

function isValidListeningItem(v: unknown): v is ListeningItemDraft {
  if (!v || typeof v !== "object") return false;
  const it = v as Partial<ListeningItemDraft>;
  return isString(it._cid) && isString(it.transcript) && isString(it.question) && isStringArray(it.options) && isString(it.answer);
}

function isValidQuizItem(v: unknown): v is QuizItemDraft {
  if (!v || typeof v !== "object") return false;
  const it = v as Partial<QuizItemDraft>;
  return isString(it._cid) && isString(it.question) && isStringArray(it.options) && isString(it.answer);
}

function isValidConversationDraft(v: unknown): v is ConversationDraft {
  if (!v || typeof v !== "object") return false;
  const d = v as Partial<ConversationDraft>;
  return (
    isString(d.title) &&
    isString(d.emoji) &&
    isString(d.description) &&
    isString(d.aiRole) &&
    isString(d.userRole) &&
    isString(d.opening) &&
    isString(d.objectives) &&
    isString(d.fallbackReplies)
  );
}

function isValidPictureDraft(v: unknown): v is PictureDraft {
  if (!v || typeof v !== "object") return false;
  const d = v as Partial<PictureDraft>;
  return (
    isString(d.emojis) &&
    isString(d.title) &&
    isString(d.description) &&
    Array.isArray(d.hints) &&
    d.hints.length === 3 &&
    d.hints.every(isString) &&
    typeof d.minWords === "number"
  );
}

function isValidStoryDraft(v: unknown): v is StoryDraft {
  if (!v || typeof v !== "object") return false;
  const d = v as Partial<StoryDraft>;
  return isString(d.title) && isString(d.genre) && isString(d.opening) && typeof d.minTurns === "number";
}

function isValidDraft(v: unknown): v is ExerciseDraftForType {
  if (!v || typeof v !== "object") return false;
  const d = v as { type?: unknown; value?: unknown };
  switch (d.type) {
    case "GRAMMAR":
      return Array.isArray(d.value) && d.value.every(isValidGrammarItem);
    case "VOCABULARY":
      return Array.isArray(d.value) && d.value.every(isValidVocabularyPair);
    case "TRANSLATION":
      return Array.isArray(d.value) && d.value.every(isValidTranslationItem);
    case "LISTENING":
      return Array.isArray(d.value) && d.value.every(isValidListeningItem);
    case "QUIZ": {
      if (!d.value || typeof d.value !== "object") return false;
      const q = d.value as { items?: unknown; timePerQuestion?: unknown };
      return Array.isArray(q.items) && q.items.every(isValidQuizItem) && typeof q.timePerQuestion === "number";
    }
    case "CONVERSATION":
      return isValidConversationDraft(d.value);
    case "PICTURE":
      return isValidPictureDraft(d.value);
    case "STORY":
      return isValidStoryDraft(d.value);
    default:
      return false;
  }
}

const LEVELS: Level[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

/** Defensive shape check for a parsed sessionStorage blob — never trust it structurally. */
export function isValidBridgeState(value: unknown): value is ExerciseFormBridgeState {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<ExerciseFormBridgeState>;
  return (
    isString(s.title) &&
    LEVELS.includes(s.difficulty as Level) &&
    typeof s.points === "number" &&
    isString(s.timeLimit) &&
    isValidDraft(s.draft)
  );
}

function bridgeKey(id: string): string {
  return `sp-exercise-form-${id}`;
}

/**
 * A bridge entry is only ever meant to survive the sub-second window of the /new -> /edit
 * route-segment swap (see the module doc above) — that's the only legitimate producer of an
 * entry. Anything older than this is presumed to be an abandoned earlier editing session (tab
 * closed and reopened later, a direct visit to /[id]/edit long after the fact, etc.) rather
 * than a live handoff, and consumeFormBridge treats it as absent. This is what stops a stale
 * draft from silently overriding fresh server data on a normal, non-handoff visit to the edit
 * page — the CRITICAL bug this bounds: without it, *every* mount of an existing exercise
 * consumed whatever bridge entry happened to exist for that id, however old.
 */
export const FORM_BRIDGE_FRESHNESS_MS = 60_000;

interface BridgeEnvelope {
  writtenAt: number;
  state: ExerciseFormBridgeState;
}

function isValidEnvelope(value: unknown): value is BridgeEnvelope {
  if (!value || typeof value !== "object") return false;
  const e = value as Partial<BridgeEnvelope>;
  return typeof e.writtenAt === "number" && isValidBridgeState(e.state);
}

/** SSR-safe, best-effort mirror of the current draft — never throws (a full/unavailable store just skips the write). */
export function writeFormBridge(id: string, state: ExerciseFormBridgeState): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: BridgeEnvelope = { writtenAt: Date.now(), state };
    window.sessionStorage.setItem(bridgeKey(id), JSON.stringify(envelope));
  } catch {
    /* storage full/unavailable — bridging is best-effort and must never block typing */
  }
}

/**
 * Reads and deletes the bridge entry for `id` in one step — a bridged draft is only ever
 * meant to be applied once, by the next mount for that id. Returns null (having still deleted
 * the entry) on any parse failure, shape mismatch, or staleness (written more than
 * FORM_BRIDGE_FRESHNESS_MS ago), so a corrupted or stale entry can never resurrect on a later,
 * unrelated edit session.
 */
export function consumeFormBridge(id: string): ExerciseFormBridgeState | null {
  if (typeof window === "undefined") return null;
  const key = bridgeKey(id);
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore — worst case a stale entry lingers for the rest of the tab's session */
  }
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidEnvelope(parsed)) return null;
    if (Date.now() - parsed.writtenAt > FORM_BRIDGE_FRESHNESS_MS) return null; // stale — the genuine handoff is sub-second
    return parsed.state;
  } catch {
    return null;
  }
}
