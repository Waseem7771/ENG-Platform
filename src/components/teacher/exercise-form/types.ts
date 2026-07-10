import type {
  ConversationData,
  GrammarData,
  GrammarItem,
  ListeningData,
  PictureData,
  QuizData,
  StoryData,
  TranslationData,
  VocabularyData,
} from "@/types";
import { clientId, sequentialIds, shuffle, slugify } from "./utils";

export interface ValidationResult {
  itemErrors: string[][];
  formError?: string;
}

// ==================== GRAMMAR ====================

export interface GrammarItemDraft {
  _cid: string;
  kind: GrammarItem["kind"];
  prompt: string;
  text: string;
  options: string[];
  answer: string;
  explanation: string;
}

export function newGrammarItem(kind: GrammarItem["kind"] = "fill-blank"): GrammarItemDraft {
  const prompts: Record<GrammarItem["kind"], string> = {
    "fill-blank": "Choose the word that best completes the sentence.",
    "error-correction": "Find and fix the grammar mistake.",
    reorder: "Put the words in the correct order.",
  };
  return {
    _cid: clientId(),
    kind,
    prompt: prompts[kind],
    text: "",
    options: kind === "reorder" ? [] : ["", "", "", ""],
    answer: "",
    explanation: "",
  };
}

export function validateGrammar(items: GrammarItemDraft[]): ValidationResult {
  if (items.length === 0) return { itemErrors: [], formError: "Add at least one item." };
  const itemErrors = items.map((it) => {
    const errs: string[] = [];
    if (!it.prompt.trim()) errs.push("Instruction is required.");
    if (!it.explanation.trim()) errs.push("Explanation is required.");
    if (it.kind === "reorder") {
      const words = it.answer.trim().split(/\s+/).filter(Boolean);
      if (words.length < 3) errs.push("Correct sentence needs at least 3 words.");
      else if (new Set(words).size < 2) errs.push("Correct sentence needs at least 2 different words so it can be shuffled.");
    } else {
      if (!it.text.trim()) errs.push("Sentence text is required.");
      const opts = it.options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) errs.push("Add at least 2 options.");
      if (!it.answer.trim()) errs.push("Select the correct option.");
      else if (!it.options.includes(it.answer)) errs.push("Correct answer must match one of the options.");
    }
    return errs;
  });
  return { itemErrors, formError: itemErrors.some((e) => e.length > 0) ? "Fix the highlighted items." : undefined };
}

export function grammarToPayload(items: GrammarItemDraft[]): GrammarData {
  const ids = sequentialIds(items.length);
  return {
    items: items.map((it, i) => {
      const base: GrammarItem = {
        id: ids[i],
        kind: it.kind,
        prompt: it.prompt.trim(),
        answer: it.answer.trim(),
        explanation: it.explanation.trim(),
      };
      if (it.kind === "reorder") {
        base.words = shuffle(it.answer.trim().split(/\s+/));
      } else {
        base.text = it.text.trim();
        base.options = it.options.map((o) => o.trim()).filter(Boolean);
      }
      return base;
    }),
  };
}

// ==================== VOCABULARY ====================

export interface VocabularyPairDraft {
  _cid: string;
  word: string;
  meaning: string;
}

export function newVocabularyPair(): VocabularyPairDraft {
  return { _cid: clientId(), word: "", meaning: "" };
}

export function validateVocabulary(pairs: VocabularyPairDraft[]): ValidationResult {
  if (pairs.length < 4) return { itemErrors: pairs.map(() => []), formError: "Add at least 4 word/meaning pairs." };
  const itemErrors = pairs.map((p) => {
    const errs: string[] = [];
    if (!p.word.trim()) errs.push("Word is required.");
    if (!p.meaning.trim()) errs.push("Meaning is required.");
    return errs;
  });
  return { itemErrors, formError: itemErrors.some((e) => e.length > 0) ? "Fix the highlighted pairs." : undefined };
}

export function vocabularyToPayload(pairs: VocabularyPairDraft[]): VocabularyData {
  return { pairs: pairs.map((p) => ({ word: p.word.trim(), meaning: p.meaning.trim() })) };
}

// ==================== TRANSLATION ====================

export interface TranslationItemDraft {
  _cid: string;
  direction: "ar-en" | "en-ar";
  source: string;
  reference: string;
}

export function newTranslationItem(): TranslationItemDraft {
  return { _cid: clientId(), direction: "ar-en", source: "", reference: "" };
}

export function validateTranslation(items: TranslationItemDraft[]): ValidationResult {
  if (items.length === 0) return { itemErrors: [], formError: "Add at least one item." };
  const itemErrors = items.map((it) => {
    const errs: string[] = [];
    if (!it.source.trim()) errs.push("Source text is required.");
    if (!it.reference.trim()) errs.push("Reference translation is required.");
    return errs;
  });
  return { itemErrors, formError: itemErrors.some((e) => e.length > 0) ? "Fix the highlighted items." : undefined };
}

export function translationToPayload(items: TranslationItemDraft[]): TranslationData {
  const ids = sequentialIds(items.length);
  return {
    items: items.map((it, i) => ({
      id: ids[i],
      direction: it.direction,
      source: it.source.trim(),
      reference: it.reference.trim(),
    })),
  };
}

// ==================== LISTENING ====================

export interface ListeningItemDraft {
  _cid: string;
  transcript: string;
  question: string;
  options: string[];
  answer: string;
}

export function newListeningItem(): ListeningItemDraft {
  return { _cid: clientId(), transcript: "", question: "", options: ["", "", "", ""], answer: "" };
}

export function validateListening(items: ListeningItemDraft[]): ValidationResult {
  if (items.length === 0) return { itemErrors: [], formError: "Add at least one item." };
  const itemErrors = items.map((it) => {
    const errs: string[] = [];
    if (!it.transcript.trim()) errs.push("Transcript is required.");
    if (!it.question.trim()) errs.push("Question is required.");
    const opts = it.options.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) errs.push("Add at least 2 options.");
    if (!it.answer.trim()) errs.push("Select the correct option.");
    else if (!it.options.includes(it.answer)) errs.push("Correct answer must match one of the options.");
    return errs;
  });
  return { itemErrors, formError: itemErrors.some((e) => e.length > 0) ? "Fix the highlighted items." : undefined };
}

export function listeningToPayload(items: ListeningItemDraft[]): ListeningData {
  const ids = sequentialIds(items.length);
  return {
    items: items.map((it, i) => ({
      id: ids[i],
      transcript: it.transcript.trim(),
      question: it.question.trim(),
      options: it.options.map((o) => o.trim()).filter(Boolean),
      answer: it.answer.trim(),
    })),
  };
}

// ==================== QUIZ ====================

export interface QuizItemDraft {
  _cid: string;
  question: string;
  options: string[];
  answer: string;
}

export function newQuizItem(): QuizItemDraft {
  return { _cid: clientId(), question: "", options: ["", "", "", ""], answer: "" };
}

export function validateQuiz(items: QuizItemDraft[], timePerQuestion: number): ValidationResult {
  if (items.length === 0) return { itemErrors: [], formError: "Add at least one question." };
  if (!timePerQuestion || timePerQuestion < 3) {
    return { itemErrors: items.map(() => []), formError: "Time per question must be at least 3 seconds." };
  }
  const itemErrors = items.map((it) => {
    const errs: string[] = [];
    if (!it.question.trim()) errs.push("Question is required.");
    const opts = it.options.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) errs.push("Add at least 2 options.");
    if (!it.answer.trim()) errs.push("Select the correct option.");
    else if (!it.options.includes(it.answer)) errs.push("Correct answer must match one of the options.");
    return errs;
  });
  return { itemErrors, formError: itemErrors.some((e) => e.length > 0) ? "Fix the highlighted items." : undefined };
}

export function quizToPayload(items: QuizItemDraft[], timePerQuestion: number): QuizData {
  const ids = sequentialIds(items.length);
  return {
    timePerQuestion,
    items: items.map((it, i) => ({
      id: ids[i],
      question: it.question.trim(),
      options: it.options.map((o) => o.trim()).filter(Boolean),
      answer: it.answer.trim(),
    })),
  };
}

// ==================== CONVERSATION ====================

export interface ConversationDraft {
  title: string;
  emoji: string;
  description: string;
  aiRole: string;
  userRole: string;
  opening: string;
  objectives: string;
  fallbackReplies: string;
}

export function newConversationDraft(exerciseTitle: string): ConversationDraft {
  return {
    title: exerciseTitle,
    emoji: "💬",
    description: "",
    aiRole: "",
    userRole: "",
    opening: "",
    objectives: "",
    fallbackReplies: "",
  };
}

export function validateConversation(d: ConversationDraft): ValidationResult {
  const errs: string[] = [];
  if (!d.title.trim()) errs.push("Scenario title is required.");
  if (!d.emoji.trim()) errs.push("Emoji is required.");
  if (!d.description.trim()) errs.push("Description is required.");
  if (!d.aiRole.trim()) errs.push("AI role is required.");
  if (!d.userRole.trim()) errs.push("Student role is required.");
  if (!d.opening.trim()) errs.push("Opening line is required.");
  const objectives = d.objectives.split("\n").map((s) => s.trim()).filter(Boolean);
  if (objectives.length === 0) errs.push("Add at least one objective.");
  const fallback = d.fallbackReplies.split("\n").map((s) => s.trim()).filter(Boolean);
  if (fallback.length < 3) errs.push("Add at least 3 fallback replies (used when AI is offline).");
  return { itemErrors: [errs], formError: errs.length > 0 ? "Fix the highlighted fields." : undefined };
}

export function conversationToPayload(d: ConversationDraft): ConversationData {
  return {
    scenario: {
      key: slugify(d.title),
      title: d.title.trim(),
      emoji: d.emoji.trim(),
      description: d.description.trim(),
      aiRole: d.aiRole.trim(),
      userRole: d.userRole.trim(),
      opening: d.opening.trim(),
      objectives: d.objectives.split("\n").map((s) => s.trim()).filter(Boolean),
      fallbackReplies: d.fallbackReplies.split("\n").map((s) => s.trim()).filter(Boolean),
    },
  };
}

// ==================== PICTURE ====================

export interface PictureDraft {
  emojis: string;
  title: string;
  description: string;
  hints: [string, string, string];
  minWords: number;
}

export function newPictureDraft(): PictureDraft {
  return { emojis: "", title: "", description: "", hints: ["", "", ""], minWords: 30 };
}

export function validatePicture(d: PictureDraft): ValidationResult {
  const errs: string[] = [];
  if (!d.emojis.trim()) errs.push("Add at least one emoji for the scene.");
  if (!d.title.trim()) errs.push("Title is required.");
  if (!d.description.trim()) errs.push("Ground-truth description is required.");
  if (d.hints.some((h) => !h.trim())) errs.push("All 3 hints are required.");
  if (!d.minWords || d.minWords < 5) errs.push("Minimum words must be at least 5.");
  return { itemErrors: [errs], formError: errs.length > 0 ? "Fix the highlighted fields." : undefined };
}

export function pictureToPayload(d: PictureDraft): PictureData {
  return {
    scene: {
      emojis: d.emojis.trim(),
      title: d.title.trim(),
      description: d.description.trim(),
      hints: d.hints.map((h) => h.trim()),
      minWords: d.minWords,
    },
  };
}

// ==================== STORY ====================

export interface StoryDraft {
  title: string;
  genre: string;
  opening: string;
  minTurns: number;
}

export function newStoryDraft(): StoryDraft {
  return { title: "", genre: "", opening: "", minTurns: 6 };
}

export function validateStory(d: StoryDraft): ValidationResult {
  const errs: string[] = [];
  if (!d.title.trim()) errs.push("Title is required.");
  if (!d.genre.trim()) errs.push("Genre is required.");
  if (!d.opening.trim()) errs.push("Opening line is required.");
  if (!d.minTurns || d.minTurns < 2) errs.push("Minimum turns must be at least 2.");
  return { itemErrors: [errs], formError: errs.length > 0 ? "Fix the highlighted fields." : undefined };
}

export function storyToPayload(d: StoryDraft): StoryData {
  return {
    story: {
      title: d.title.trim(),
      genre: d.genre.trim(),
      opening: d.opening.trim(),
      minTurns: d.minTurns,
    },
  };
}
