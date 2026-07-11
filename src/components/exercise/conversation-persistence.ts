import type { ChatFeedback, ChatMessage, ConversationScenario } from "@/types";

export type LocalMsg = ChatMessage & { id: number; feedback?: ChatFeedback | null };

export function isValidLocalMsg(value: unknown): value is LocalMsg {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<LocalMsg>;
  return typeof m.id === "number" && (m.role === "user" || m.role === "assistant") && typeof m.content === "string";
}

/** Highest message id in the transcript, or -1 for an empty one — callers add 1 to seed `nextId`. */
export function maxMessageId(messages: LocalMsg[]): number {
  return messages.reduce((max, m) => Math.max(max, m.id), -1);
}

/**
 * Drops a tampered/malformed `feedback` field instead of rejecting the whole message: the chat
 * bubble render does `feedback.corrections.length` whenever `hasIssues` is truthy, which would
 * throw on a stored `hasIssues: true` with a non-array `corrections` (e.g. hand-edited
 * sessionStorage). Stripping just the field keeps the message's actual text intact.
 */
function sanitizeFeedback(msg: LocalMsg): LocalMsg {
  const f = msg.feedback;
  if (f && typeof f === "object" && f.hasIssues && !Array.isArray(f.corrections)) {
    return { id: msg.id, role: msg.role, content: msg.content };
  }
  return msg;
}

/**
 * Restores a persisted transcript for `persistKey`, falling back to the scenario's
 * opening line on ANY parse failure or malformed data (also covers structurally
 * invalid JSON like `[]`/`{}`, since an empty transcript would break the
 * `canEnd`/`beforeunload` invariants in ConversationChat). SSR-safe: returns the seed whenever
 * `window` isn't available (no `persistKey` means zero behavior change too).
 */
export function loadPersistedMessages(persistKey: string | undefined, scenario: ConversationScenario): LocalMsg[] {
  const seed: LocalMsg[] = [{ id: 0, role: "assistant", content: scenario.opening }];
  if (!persistKey || typeof window === "undefined") return seed;
  try {
    const raw = window.sessionStorage.getItem(persistKey);
    if (!raw) return seed;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidLocalMsg)) {
      return parsed.map(sanitizeFeedback);
    }
    return seed;
  } catch {
    return seed;
  }
}
