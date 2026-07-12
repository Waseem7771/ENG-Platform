export type UserRole = "STUDENT" | "TEACHER";
export type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type SessionStatus = "WAITING" | "ACTIVE" | "ENDED";

export type ExerciseType =
  | "GRAMMAR"
  | "VOCABULARY"
  | "TRANSLATION"
  | "LISTENING"
  | "QUIZ"
  | "CONVERSATION"
  | "PICTURE"
  | "STORY";

export const EXERCISE_TYPES: ExerciseType[] = [
  "GRAMMAR",
  "VOCABULARY",
  "TRANSLATION",
  "LISTENING",
  "QUIZ",
  "CONVERSATION",
  "PICTURE",
  "STORY",
];

/** Draft exercises are only visible to their owning teacher; published ones are visible to everyone. */
export type ExerciseStatus = "DRAFT" | "PUBLISHED";

export const EXERCISE_STATUSES: ExerciseStatus[] = ["DRAFT", "PUBLISHED"];

export type ProgressCategory =
  | "GRAMMAR"
  | "VOCABULARY"
  | "TRANSLATION"
  | "LISTENING"
  | "SPEAKING"
  | "OVERALL";

// ==================== EXERCISE DATA (Exercise.data JSON) ====================

export interface GrammarItem {
  id: string;
  kind: "fill-blank" | "reorder" | "error-correction";
  prompt: string;
  text?: string;
  options?: string[];
  words?: string[];
  answer: string;
  explanation: string;
}
export interface GrammarData {
  items: GrammarItem[];
}

export interface VocabularyData {
  pairs: { word: string; meaning: string }[];
}

export interface TranslationItem {
  id: string;
  direction: "ar-en" | "en-ar";
  source: string;
  reference: string;
}
export interface TranslationData {
  items: TranslationItem[];
}

export interface ListeningItem {
  id: string;
  transcript: string;
  question: string;
  options: string[];
  answer: string;
}
export interface ListeningData {
  items: ListeningItem[];
}

export interface QuizItem {
  id: string;
  question: string;
  options: string[];
  answer: string;
}
export interface QuizData {
  timePerQuestion: number;
  items: QuizItem[];
}

export interface ConversationScenario {
  key: string;
  title: string;
  emoji: string;
  description: string;
  aiRole: string;
  userRole: string;
  opening: string;
  objectives: string[];
  /** Canned replies used when the OpenAI API is unavailable */
  fallbackReplies?: string[];
}
export interface ConversationData {
  scenario: ConversationScenario;
}

export interface PictureScene {
  emojis: string;
  title: string;
  /** Ground-truth description used for AI scoring — never shown to the student */
  description: string;
  hints: string[];
  minWords: number;
}
export interface PictureData {
  scene: PictureScene;
}

export interface StoryData {
  story: {
    title: string;
    genre: string;
    opening: string;
    minTurns: number;
  };
}

export type ExerciseData =
  | GrammarData
  | VocabularyData
  | TranslationData
  | ListeningData
  | QuizData
  | ConversationData
  | PictureData
  | StoryData;

// ==================== API SHAPES ====================

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatFeedback {
  hasIssues: boolean;
  corrections: { original: string; corrected: string; note: string }[];
  tip?: string;
}

export interface GamificationUpdate {
  xp: number;
  streak: number;
  levelUp: boolean;
  level: Level;
  skills: Partial<Record<ProgressCategory, number>>;
}

export interface SubmitFeedback {
  overall: string;
  perItem?: Record<string, { correct: boolean; expected?: string; note?: string }>;
  strengths?: string[];
  improvements?: string[];
}

export interface SubmitResponse {
  score: number;
  xpEarned: number;
  feedback: SubmitFeedback;
  gamification: GamificationUpdate;
  aiAvailable?: boolean;
}

export interface ExerciseListItem {
  id: string;
  title: string;
  type: ExerciseType;
  difficulty: Level;
  points: number;
  timeLimit: number | null;
  itemCount: number;
  completed: boolean;
  bestScore: number | null;
}

export interface PlacementQuestionPublic {
  id: string;
  category: "GRAMMAR" | "VOCABULARY" | "READING";
  passage?: string;
  question: string;
  options: string[];
}

export interface PlacementResult {
  score: number;
  level: Level;
  breakdown: { grammar: number; vocabulary: number; reading: number };
}
