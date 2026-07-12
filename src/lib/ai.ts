import OpenAI from "openai";
import { validateExerciseData } from "@/app/api/exercises/route";
import type {
  ChatFeedback,
  ChatMessage,
  ConversationData,
  ConversationScenario,
  ExerciseData,
  ExerciseType,
  GrammarData,
  Level,
  ListeningData,
  PictureData,
  PictureScene,
  QuizData,
  StoryData,
  TranslationData,
  TranslationItem,
  VocabularyData,
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

// ==================== EXERCISE DRAFT GENERATION ====================

export interface DraftResult {
  data: ExerciseData;
  aiAvailable: boolean;
}

/** Describes the exact JSON shape expected for each exercise type's `data` field, for the draft prompt. */
const DRAFT_SHAPE: Record<ExerciseType, string> = {
  GRAMMAR:
    '{"items": [{"id": "g1", "kind": "fill-blank"|"reorder"|"error-correction", "prompt": "...", ' +
    '"text": "sentence with a ___ blank (fill-blank/error-correction only)", ' +
    '"options": ["...", "..."] (fill-blank/error-correction only, must include answer), ' +
    '"words": ["...", "..."] (reorder only), "answer": "...", "explanation": "..."}]} — include 3-5 items.',
  VOCABULARY: '{"pairs": [{"word": "...", "meaning": "..."}]} — include 6-8 pairs.',
  TRANSLATION:
    '{"items": [{"id": "t1", "direction": "ar-en"|"en-ar", "source": "...", "reference": "..."}]} ' +
    "— include 4-6 items, mixing both directions.",
  LISTENING:
    '{"items": [{"id": "l1", "transcript": "a short spoken passage", "question": "...", ' +
    '"options": ["...", "..."], "answer": "must equal one of options"}]} — include 3-4 items.',
  QUIZ:
    '{"timePerQuestion": 20, "items": [{"id": "q1", "question": "...", "options": ["...", "..."], ' +
    '"answer": "must equal one of options"}]} — include 5-8 items.',
  CONVERSATION:
    '{"scenario": {"key": "...", "title": "...", "emoji": "...", "description": "...", ' +
    '"aiRole": "...", "userRole": "...", "opening": "...", "objectives": ["...", "..."], ' +
    '"fallbackReplies": ["...", "...", "..."]}}.',
  PICTURE:
    '{"scene": {"emojis": "...", "title": "...", ' +
    '"description": "a detailed ground-truth description, never shown to the student", ' +
    '"hints": ["...", "..."], "minWords": 40}}.',
  STORY: '{"story": {"title": "...", "genre": "...", "opening": "2-3 sentences", "minTurns": 4}}.',
};

function draftSystemPrompt(type: ExerciseType, difficulty: Level): string {
  return `${TUTOR_CONTEXT}
${levelGuidance(difficulty)}
You are drafting a ${type} exercise for a teacher, who will review and edit it before publishing to students.
Return a single JSON object for the exercise's "data" field ONLY (no wrapper, no commentary), matching this exact shape:
${DRAFT_SHAPE[type]}
Every id must be unique within the object. Keep the language and content appropriate for the student's level and
directly related to the given topic.`;
}

/** Ensures a usable, non-empty topic string even if the caller passed blank input. */
function safeTopic(topic: string): string {
  const trimmed = topic.trim();
  return trimmed.length > 0 ? trimmed : "everyday life";
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return slug.length > 0 ? slug : "topic";
}

function fallbackGrammar(topic: string): GrammarData {
  return {
    items: [
      {
        id: "g1",
        kind: "fill-blank",
        prompt: `Choose the word that correctly completes the sentence about ${topic}.`,
        text: `I ___ interested in ${topic}.`,
        options: ["am", "is", "be"],
        answer: "am",
        explanation: 'Use "am" with the subject "I".',
      },
      {
        id: "g2",
        kind: "fill-blank",
        prompt: `Choose the word that correctly completes the sentence about ${topic}.`,
        text: `She ___ about ${topic} every week.`,
        options: ["talks", "talk", "talking"],
        answer: "talks",
        explanation: "Add -s to the verb for he/she/it in the present simple.",
      },
      {
        id: "g3",
        kind: "fill-blank",
        prompt: `Choose the word that correctly completes the sentence about ${topic}.`,
        text: `They ___ learning about ${topic} last night.`,
        options: ["were", "was", "are"],
        answer: "were",
        explanation: 'Use "were" with plural subjects in the past simple.',
      },
    ],
  };
}

function fallbackVocabulary(topic: string): VocabularyData {
  return {
    pairs: [
      { word: `${topic} — key term 1`, meaning: `A word closely related to ${topic}.` },
      { word: `${topic} — key term 2`, meaning: `Another word closely related to ${topic}.` },
      { word: `${topic} — key term 3`, meaning: `A useful word when discussing ${topic}.` },
      { word: `${topic} — key term 4`, meaning: `A common expression about ${topic}.` },
    ],
  };
}

function fallbackTranslation(topic: string): TranslationData {
  return {
    items: [
      { id: "t1", direction: "en-ar", source: `I enjoy learning about ${topic}.`, reference: `أستمتع بتعلم ${topic}.` },
      { id: "t2", direction: "ar-en", source: `أنا أحب ${topic} كثيرًا.`, reference: `I like ${topic} a lot.` },
      { id: "t3", direction: "en-ar", source: `Let's talk about ${topic} today.`, reference: `دعنا نتحدث عن ${topic} اليوم.` },
    ],
  };
}

function fallbackListening(topic: string): ListeningData {
  return {
    items: [
      {
        id: "l1",
        transcript: `Today's lesson is about ${topic}. It is an important subject for beginners.`,
        question: "What is today's lesson about?",
        options: [topic, "The weather", "Sports"],
        answer: topic,
      },
      {
        id: "l2",
        transcript: `Many students find ${topic} easier once they practice a little every day.`,
        question: "How do students find it easier?",
        options: ["By practicing every day", "By avoiding it", "By memorizing randomly"],
        answer: "By practicing every day",
      },
      {
        id: "l3",
        transcript: `Our teacher explained ${topic} using simple examples and pictures.`,
        question: "How did the teacher explain the topic?",
        options: ["Using simple examples and pictures", "Using a long lecture only", "Using a surprise test"],
        answer: "Using simple examples and pictures",
      },
    ],
  };
}

function fallbackQuiz(topic: string): QuizData {
  return {
    timePerQuestion: 20,
    items: [
      {
        id: "q1",
        question: `Which sentence about ${topic} is grammatically correct?`,
        options: [`I like ${topic}.`, `I likes ${topic}.`, `I liking ${topic}.`],
        answer: `I like ${topic}.`,
      },
      {
        id: "q2",
        question: 'Choose the correct word: "She is interested ___ this topic."',
        options: ["in", "on", "at"],
        answer: "in",
      },
      {
        id: "q3",
        question: `Which word best describes someone who enjoys ${topic}?`,
        options: ["enthusiastic", "furniture", "purple"],
        answer: "enthusiastic",
      },
    ],
  };
}

function fallbackConversation(topic: string): ConversationData {
  return {
    scenario: {
      key: `draft-${slugify(topic)}`,
      title: `Talking About ${topic}`,
      emoji: "💬",
      description: `Practice a short conversation about ${topic}.`,
      aiRole: "Curious conversation partner",
      userRole: "Student sharing their views",
      opening: `Hi! I'd love to hear what you think about ${topic}. Can you tell me more?`,
      objectives: [`Describe your opinion about ${topic}`, "Answer a follow-up question"],
      fallbackReplies: [
        "That's interesting — can you tell me more?",
        "Why do you think that is?",
        "What else comes to mind when you think about that?",
      ],
    },
  };
}

function fallbackPicture(topic: string): PictureData {
  return {
    scene: {
      emojis: "🖼️",
      title: `A Scene About ${topic}`,
      description: `A scene that relates to ${topic}, with people, objects, and actions the student should notice and describe.`,
      hints: [`Mention ${topic}`, "Describe who or what you see", "Use complete sentences"],
      minWords: 30,
    },
  };
}

function fallbackStory(topic: string): StoryData {
  return {
    story: {
      title: `A Story About ${topic}`,
      genre: "adventure",
      opening: `Once upon a time, there was a story that began with ${topic}...`,
      minTurns: 3,
    },
  };
}

function fallbackDraft(type: ExerciseType, rawTopic: string): ExerciseData {
  const topic = safeTopic(rawTopic);
  switch (type) {
    case "GRAMMAR":
      return fallbackGrammar(topic);
    case "VOCABULARY":
      return fallbackVocabulary(topic);
    case "TRANSLATION":
      return fallbackTranslation(topic);
    case "LISTENING":
      return fallbackListening(topic);
    case "QUIZ":
      return fallbackQuiz(topic);
    case "CONVERSATION":
      return fallbackConversation(topic);
    case "PICTURE":
      return fallbackPicture(topic);
    case "STORY":
      return fallbackStory(topic);
  }
}

/**
 * Draft an exercise's `data` for a teacher to review/edit. Mirrors the rest of
 * this module's degrade-to-heuristic pattern: try the model in JSON mode and
 * structurally validate the result with the SAME validator the API routes
 * use, so a malformed or hallucinated shape never reaches the editor — on
 * validation failure OR any throw, fall back to a deterministic, always-valid
 * template for the type, incorporating `topic`.
 */
export async function generateExerciseDraft(
  type: ExerciseType,
  difficulty: Level,
  topic: string
): Promise<DraftResult> {
  if (aiAvailable()) {
    try {
      const data = await completeJson<ExerciseData>(draftSystemPrompt(type, difficulty), `Topic: "${topic}"`);
      validateExerciseData(type, data);
      return { data, aiAvailable: true };
    } catch (error) {
      console.error("[ai.generateExerciseDraft]", error);
    }
  }
  return { data: fallbackDraft(type, topic), aiAvailable: false };
}
