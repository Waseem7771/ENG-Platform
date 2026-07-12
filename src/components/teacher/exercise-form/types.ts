import type {
  ConversationData,
  ExerciseData,
  ExerciseType,
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

/**
 * Inverse of {@link grammarToPayload} — rehydrates draft rows from stored/AI-generated
 * `data` (e.g. for editing an existing exercise or applying an AI draft). `answer` is
 * always the correct-sentence/correct-option text regardless of `kind` (grammarToPayload
 * writes it unconditionally), so no un-shuffling of `words` is needed for reorder items.
 */
export function grammarDataToDraft(data: GrammarData): GrammarItemDraft[] {
  return data.items.map((it) => ({
    _cid: clientId(),
    kind: it.kind,
    prompt: it.prompt,
    text: it.text ?? "",
    options: it.kind === "reorder" ? [] : (it.options ?? []),
    answer: it.answer,
    explanation: it.explanation,
  }));
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

/** Inverse of {@link vocabularyToPayload}. */
export function vocabularyDataToDraft(data: VocabularyData): VocabularyPairDraft[] {
  return data.pairs.map((p) => ({ _cid: clientId(), word: p.word, meaning: p.meaning }));
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

/** Inverse of {@link translationToPayload}. */
export function translationDataToDraft(data: TranslationData): TranslationItemDraft[] {
  return data.items.map((it) => ({
    _cid: clientId(),
    direction: it.direction,
    source: it.source,
    reference: it.reference,
  }));
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

/** Inverse of {@link listeningToPayload}. */
export function listeningDataToDraft(data: ListeningData): ListeningItemDraft[] {
  return data.items.map((it) => ({
    _cid: clientId(),
    transcript: it.transcript,
    question: it.question,
    options: it.options,
    answer: it.answer,
  }));
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

/** Inverse of {@link quizToPayload}. */
export function quizDataToDraft(data: QuizData): { items: QuizItemDraft[]; timePerQuestion: number } {
  return {
    items: data.items.map((it) => ({
      _cid: clientId(),
      question: it.question,
      options: it.options,
      answer: it.answer,
    })),
    timePerQuestion: data.timePerQuestion,
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

/** Inverse of {@link conversationToPayload}. */
export function conversationDataToDraft(data: ConversationData): ConversationDraft {
  const s = data.scenario;
  return {
    title: s.title,
    emoji: s.emoji,
    description: s.description,
    aiRole: s.aiRole,
    userRole: s.userRole,
    opening: s.opening,
    objectives: s.objectives.join("\n"),
    fallbackReplies: (s.fallbackReplies ?? []).join("\n"),
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

/** Inverse of {@link pictureToPayload}. Pads/truncates `hints` to the draft's fixed 3-slot tuple. */
export function pictureDataToDraft(data: PictureData): PictureDraft {
  const scene = data.scene;
  return {
    emojis: scene.emojis,
    title: scene.title,
    description: scene.description,
    hints: [scene.hints[0] ?? "", scene.hints[1] ?? "", scene.hints[2] ?? ""],
    minWords: scene.minWords,
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

/** Inverse of {@link storyToPayload}. */
export function storyDataToDraft(data: StoryData): StoryDraft {
  const story = data.story;
  return { title: story.title, genre: story.genre, opening: story.opening, minTurns: story.minTurns };
}

// ==================== DATA -> DRAFT DISPATCH ====================

/**
 * Tagged union pairing an exercise type with its rehydrated draft shape.
 * `type` narrows `value`'s type when switched on, so callers can dispatch to
 * the right `set*` state setter with full type safety.
 */
export type ExerciseDraftForType =
  | { type: "GRAMMAR"; value: GrammarItemDraft[] }
  | { type: "VOCABULARY"; value: VocabularyPairDraft[] }
  | { type: "TRANSLATION"; value: TranslationItemDraft[] }
  | { type: "LISTENING"; value: ListeningItemDraft[] }
  | { type: "QUIZ"; value: { items: QuizItemDraft[]; timePerQuestion: number } }
  | { type: "CONVERSATION"; value: ConversationDraft }
  | { type: "PICTURE"; value: PictureDraft }
  | { type: "STORY"; value: StoryDraft };

/**
 * Inverse of the *ToPayload converters: turns a stored or AI-generated `data`
 * blob back into the builder-draft state for its type. Used both to load an
 * existing exercise for editing (`?edit=1`) and to apply an AI-generated draft
 * without disturbing the other 7 builders' state.
 */
export function dataToDraft(type: ExerciseType, data: ExerciseData): ExerciseDraftForType {
  switch (type) {
    case "GRAMMAR":
      return { type, value: grammarDataToDraft(data as GrammarData) };
    case "VOCABULARY":
      return { type, value: vocabularyDataToDraft(data as VocabularyData) };
    case "TRANSLATION":
      return { type, value: translationDataToDraft(data as TranslationData) };
    case "LISTENING":
      return { type, value: listeningDataToDraft(data as ListeningData) };
    case "QUIZ":
      return { type, value: quizDataToDraft(data as QuizData) };
    case "CONVERSATION":
      return { type, value: conversationDataToDraft(data as ConversationData) };
    case "PICTURE":
      return { type, value: pictureDataToDraft(data as PictureData) };
    case "STORY":
      return { type, value: storyDataToDraft(data as StoryData) };
  }
}
