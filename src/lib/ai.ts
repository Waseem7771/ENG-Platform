import OpenAI from "openai";
import type {
  ChatFeedback,
  ChatMessage,
  ConversationScenario,
  Level,
  PictureScene,
  StoryData,
  TranslationItem,
} from "@/types";

/**
 * Single gateway for every OpenAI call in the app. Routes must never import
 * the openai package directly. Every helper has a deterministic fallback so
 * the platform stays functional when no API key is configured or the API
 * errors — responses carry `aiAvailable` so the UI can say so.
 */

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export function aiAvailable(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && key.startsWith("sk-") && !key.includes("your-openai"));
}

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

const TUTOR_CONTEXT = `You are an English tutor on SpeakPath, a platform for Arabic-speaking learners.
Common Arabic-speaker challenges to watch for: missing articles (a/an/the — Arabic has no indefinite article),
p/b confusion, preposition choice, verb tense (especially present perfect), dropped copula ("he doctor"),
and literal translations of Arabic idioms. Be warm, encouraging, and concrete.`;

function levelGuidance(level: Level | null): string {
  switch (level) {
    case "ADVANCED":
      return "The student is ADVANCED (C1-C2): use natural, idiomatic English and hold a high standard.";
    case "INTERMEDIATE":
      return "The student is INTERMEDIATE (B1-B2): use everyday vocabulary, moderately complex sentences.";
    default:
      return "The student is a BEGINNER (A1-A2): use short sentences and simple, common words.";
  }
}

async function completeText(system: string, messages: ChatMessage[]): Promise<string> {
  const res = await client().chat.completions.create({
    model: MODEL,
    temperature: 0.8,
    max_tokens: 400,
    messages: [{ role: "system" as const, content: system }, ...messages],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

async function completeJson<T>(system: string, user: string): Promise<T> {
  const res = await client().chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    max_tokens: 600,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: `${system}\nRespond with a single JSON object only.` },
      { role: "user", content: user },
    ],
  });
  return JSON.parse(res.choices[0]?.message?.content ?? "{}") as T;
}

function clampScore(n: unknown, fallback = 50): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(100, Math.max(0, v));
}

// ==================== HEURISTIC FALLBACKS ====================

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Dice-coefficient token overlap, 0-100. */
function similarityScore(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return 0;
  const setB = new Map<string, number>();
  for (const t of tb) setB.set(t, (setB.get(t) ?? 0) + 1);
  let overlap = 0;
  for (const t of ta) {
    const count = setB.get(t) ?? 0;
    if (count > 0) {
      overlap++;
      setB.set(t, count - 1);
    }
  }
  return Math.round((200 * overlap) / (ta.length + tb.length));
}

/** Length + vocabulary-diversity heuristic for free text, 0-100. */
function writingHeuristic(text: string, minWords: number): number {
  const words = tokens(text);
  if (words.length === 0) return 0;
  const lengthScore = Math.min(1, words.length / Math.max(minWords, 1));
  const diversity = new Set(words).size / words.length;
  return clampScore(Math.round(lengthScore * 70 + diversity * 30));
}

export interface AiScore {
  score: number;
  overall: string;
  strengths: string[];
  improvements: string[];
  aiAvailable: boolean;
}

const OFFLINE_NOTE =
  "Scored with basic matching — connect an OpenAI API key for detailed AI feedback.";

// ==================== CONVERSATION ====================

export async function chatReply(
  scenario: ConversationScenario,
  level: Level | null,
  messages: ChatMessage[]
): Promise<{ reply: string; aiAvailable: boolean }> {
  if (aiAvailable()) {
    try {
      const system = `${TUTOR_CONTEXT}
${levelGuidance(level)}
You are roleplaying: ${scenario.aiRole}. The student plays: ${scenario.userRole}.
Scenario: ${scenario.title} — ${scenario.description}
Stay in character, keep replies to 1-3 sentences, ask questions to keep the conversation going,
and gently steer the student toward these objectives: ${scenario.objectives.join("; ")}.
Do not correct grammar inside the roleplay — corrections are delivered separately.`;
      const reply = await completeText(system, messages.slice(-16));
      if (reply) return { reply, aiAvailable: true };
    } catch (error) {
      console.error("[ai.chatReply]", error);
    }
  }
  const canned = scenario.fallbackReplies ?? [];
  const userTurns = messages.filter((m) => m.role === "user").length;
  const reply =
    canned[(userTurns - 1) % Math.max(canned.length, 1)] ??
    "That's interesting — tell me more! (AI tutor is offline right now, but keep practicing.)";
  return { reply, aiAvailable: false };
}

export async function chatFeedback(
  level: Level | null,
  lastUserMessage: string
): Promise<ChatFeedback | null> {
  if (!aiAvailable()) return null;
  try {
    const result = await completeJson<ChatFeedback>(
      `${TUTOR_CONTEXT}\n${levelGuidance(level)}
Analyze the student's message for English errors. Return JSON:
{"hasIssues": boolean, "corrections": [{"original": "...", "corrected": "...", "note": "one short sentence"}], "tip": "optional one-line tip"}.
Only flag real errors; if the message is fine, hasIssues=false and corrections=[]. Max 3 corrections.`,
      lastUserMessage
    );
    if (typeof result.hasIssues !== "boolean" || !Array.isArray(result.corrections)) return null;
    return result;
  } catch (error) {
    console.error("[ai.chatFeedback]", error);
    return null;
  }
}

export async function scoreConversation(
  scenario: ConversationScenario,
  messages: ChatMessage[],
  level: Level | null
): Promise<AiScore> {
  if (aiAvailable()) {
    try {
      const r = await completeJson<{ score: number; overall: string; strengths: string[]; improvements: string[] }>(
        `${TUTOR_CONTEXT}\n${levelGuidance(level)}
Grade the student's side of this roleplay ("${scenario.title}") 0-100 for communication, grammar, and vocabulary,
relative to their level. Return JSON {"score": n, "overall": "2 sentences", "strengths": ["..."], "improvements": ["..."]}.`,
        `Conversation transcript:\n${messages.map((m) => `${m.role === "user" ? "Student" : "Partner"}: ${m.content}`).join("\n")}`
      );
      return {
        score: clampScore(r.score),
        overall: r.overall || "Good effort!",
        strengths: r.strengths ?? [],
        improvements: r.improvements ?? [],
        aiAvailable: true,
      };
    } catch (error) {
      console.error("[ai.scoreConversation]", error);
    }
  }
  const userTurns = messages.filter((m) => m.role === "user");
  const avgLen = userTurns.length
    ? userTurns.reduce((s, m) => s + tokens(m.content).length, 0) / userTurns.length
    : 0;
  const score = clampScore(Math.round(Math.min(1, userTurns.length / 5) * 60 + Math.min(1, avgLen / 8) * 40));
  return {
    score,
    overall: `You sent ${userTurns.length} messages in this scenario. ${OFFLINE_NOTE}`,
    strengths: userTurns.length >= 5 ? ["You kept the conversation going"] : [],
    improvements: avgLen < 6 ? ["Try writing longer, fuller sentences"] : [],
    aiAvailable: false,
  };
}

// ==================== STORY ====================

export async function storyReply(
  story: StoryData["story"],
  level: Level | null,
  turns: ChatMessage[]
): Promise<{ reply: string; aiAvailable: boolean }> {
  if (aiAvailable()) {
    try {
      const system = `${TUTOR_CONTEXT}\n${levelGuidance(level)}
You are co-writing a ${story.genre} story titled "${story.title}" with the student, taking turns.
Continue the story with 2-3 vivid but level-appropriate sentences, ending at a point that invites the student to continue.
Never finish the story yourself; keep it open.`;
      const reply = await completeText(system, [
        { role: "assistant", content: story.opening },
        ...turns.slice(-12),
      ]);
      if (reply) return { reply, aiAvailable: true };
    } catch (error) {
      console.error("[ai.storyReply]", error);
    }
  }
  const prompts = [
    "Suddenly, something unexpected happened. What was it?",
    "Then a stranger appeared and said something surprising. What did they say?",
    "The weather changed and everything felt different. Describe what happened next.",
    "Someone found a mysterious object. Continue the story!",
  ];
  const userTurns = turns.filter((t) => t.role === "user").length;
  return { reply: prompts[(userTurns - 1 + prompts.length) % prompts.length], aiAvailable: false };
}

export async function scoreStory(
  story: StoryData["story"],
  turns: ChatMessage[],
  level: Level | null
): Promise<AiScore> {
  const userText = turns.filter((t) => t.role === "user").map((t) => t.content).join("\n");
  if (aiAvailable()) {
    try {
      const r = await completeJson<{ score: number; overall: string; strengths: string[]; improvements: string[] }>(
        `${TUTOR_CONTEXT}\n${levelGuidance(level)}
Grade the student's contributions to this collaborative story 0-100 for grammar, vocabulary range, and creativity,
relative to their level. Return JSON {"score": n, "overall": "2 sentences", "strengths": ["..."], "improvements": ["..."]}.`,
        `Story: "${story.title}" (${story.genre})\nStudent's contributions:\n${userText}`
      );
      return {
        score: clampScore(r.score),
        overall: r.overall || "Nice storytelling!",
        strengths: r.strengths ?? [],
        improvements: r.improvements ?? [],
        aiAvailable: true,
      };
    } catch (error) {
      console.error("[ai.scoreStory]", error);
    }
  }
  const score = writingHeuristic(userText, story.minTurns * 12);
  return {
    score,
    overall: `You wrote ${tokens(userText).length} words across your turns. ${OFFLINE_NOTE}`,
    strengths: [],
    improvements: score < 60 ? ["Add more detail to each turn of the story"] : [],
    aiAvailable: false,
  };
}

// ==================== TRANSLATION ====================

export async function scoreTranslation(
  item: TranslationItem,
  answer: string,
  level: Level | null
): Promise<{ score: number; note: string; aiAvailable: boolean }> {
  if (!answer.trim()) return { score: 0, note: "No answer given.", aiAvailable: aiAvailable() };
  if (aiAvailable()) {
    try {
      const r = await completeJson<{ score: number; note: string }>(
        `${TUTOR_CONTEXT}\n${levelGuidance(level)}
Grade this ${item.direction === "ar-en" ? "Arabic→English" : "English→Arabic"} translation 0-100.
Meaning accuracy matters most; grammar second; word choice third. A different but correct phrasing deserves full credit.
Return JSON {"score": n, "note": "one-sentence feedback"}.`,
        `Source: ${item.source}\nReference translation: ${item.reference}\nStudent's translation: ${answer}`
      );
      return { score: clampScore(r.score), note: r.note || "", aiAvailable: true };
    } catch (error) {
      console.error("[ai.scoreTranslation]", error);
    }
  }
  const score = similarityScore(answer, item.reference);
  return {
    score,
    note:
      score >= 70
        ? "Very close to the reference translation."
        : score >= 40
          ? "Partly matches the reference — compare and spot the differences."
          : `Compare with the reference: "${item.reference}". ${OFFLINE_NOTE}`,
    aiAvailable: false,
  };
}

// ==================== PICTURE ====================

export async function scorePicture(
  scene: PictureScene,
  text: string,
  level: Level | null
): Promise<AiScore> {
  if (aiAvailable()) {
    try {
      const r = await completeJson<{ score: number; overall: string; strengths: string[]; improvements: string[] }>(
        `${TUTOR_CONTEXT}\n${levelGuidance(level)}
The student described a scene. Ground truth: "${scene.description}".
Grade 0-100 for accuracy to the scene, grammar, and vocabulary, relative to their level.
Return JSON {"score": n, "overall": "2 sentences", "strengths": ["..."], "improvements": ["..."]}.`,
        `Student's description (${scene.minWords} words expected):\n${text}`
      );
      return {
        score: clampScore(r.score),
        overall: r.overall || "Good description!",
        strengths: r.strengths ?? [],
        improvements: r.improvements ?? [],
        aiAvailable: true,
      };
    } catch (error) {
      console.error("[ai.scorePicture]", error);
    }
  }
  const base = writingHeuristic(text, scene.minWords);
  const keywordHits = similarityScore(text, scene.description);
  const score = clampScore(Math.round(base * 0.6 + keywordHits * 0.4));
  return {
    score,
    overall: `You wrote ${tokens(text).length} words. ${OFFLINE_NOTE}`,
    strengths: [],
    improvements:
      tokens(text).length < scene.minWords ? [`Aim for at least ${scene.minWords} words`] : [],
    aiAvailable: false,
  };
}
