import type { Level, PlacementQuestionPublic } from "@/types";

export interface PlacementQuestion {
  id: string;
  category: "GRAMMAR" | "VOCABULARY" | "READING";
  passage?: string;
  question: string;
  options: string[];
  answer: string;
  /** Difficulty band the question probes: 1 = A1-A2, 2 = B1-B2, 3 = C1-C2 */
  weight: 1 | 2 | 3;
}

const READING_PASSAGE_1 = `Sara works at a hospital in Amman. She starts work at eight o'clock in the morning and finishes at four in the afternoon. She likes her job because she helps people every day. After work, she studies English for one hour because she wants to work in Canada one day.`;

const READING_PASSAGE_2 = `Remote work has transformed how companies think about productivity. While some managers initially feared that employees working from home would accomplish less, several long-term studies suggest the opposite: freed from long commutes and office interruptions, many workers report deeper concentration and higher output. However, the picture is not entirely positive. Younger employees, who benefit most from observing experienced colleagues, often struggle to build professional networks remotely, and creative collaboration — the kind that thrives on spontaneous conversation — can suffer when every interaction must be scheduled in advance.`;

export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  // ==================== GRAMMAR (10) ====================
  {
    id: "g1",
    category: "GRAMMAR",
    question: "She ___ a teacher.",
    options: ["is", "are", "am", "be"],
    answer: "is",
    weight: 1,
  },
  {
    id: "g2",
    category: "GRAMMAR",
    question: "I ___ to the market yesterday.",
    options: ["go", "went", "gone", "going"],
    answer: "went",
    weight: 1,
  },
  {
    id: "g3",
    category: "GRAMMAR",
    question: "There isn't ___ milk in the fridge.",
    options: ["some", "any", "a", "many"],
    answer: "any",
    weight: 1,
  },
  {
    id: "g4",
    category: "GRAMMAR",
    question: "He has lived in Dubai ___ 2019.",
    options: ["for", "since", "from", "at"],
    answer: "since",
    weight: 2,
  },
  {
    id: "g5",
    category: "GRAMMAR",
    question: "If it rains tomorrow, we ___ the trip.",
    options: ["cancel", "will cancel", "would cancel", "cancelled"],
    answer: "will cancel",
    weight: 2,
  },
  {
    id: "g6",
    category: "GRAMMAR",
    question: "This is the restaurant ___ we had dinner last week.",
    options: ["which", "who", "where", "when"],
    answer: "where",
    weight: 2,
  },
  {
    id: "g7",
    category: "GRAMMAR",
    question: "By the time we arrived, the film ___.",
    options: ["already started", "has already started", "had already started", "was already starting"],
    answer: "had already started",
    weight: 3,
  },
  {
    id: "g8",
    category: "GRAMMAR",
    question: "The report ___ by the committee before Friday.",
    options: ["will review", "will be reviewed", "will have reviewed", "is reviewing"],
    answer: "will be reviewed",
    weight: 2,
  },
  {
    id: "g9",
    category: "GRAMMAR",
    question: "___ he studied hard, he failed the exam.",
    options: ["Despite", "Because", "Although", "However"],
    answer: "Although",
    weight: 3,
  },
  {
    id: "g10",
    category: "GRAMMAR",
    question: "I'd rather you ___ smoking in the house.",
    options: ["stop", "stopped", "to stop", "stopping"],
    answer: "stopped",
    weight: 3,
  },

  // ==================== VOCABULARY (8) ====================
  {
    id: "v1",
    category: "VOCABULARY",
    question: "The opposite of \"expensive\" is:",
    options: ["cheap", "small", "fast", "old"],
    answer: "cheap",
    weight: 1,
  },
  {
    id: "v2",
    category: "VOCABULARY",
    question: "You use a ___ to cut bread.",
    options: ["spoon", "knife", "plate", "cup"],
    answer: "knife",
    weight: 1,
  },
  {
    id: "v3",
    category: "VOCABULARY",
    question: "Someone who designs buildings is an:",
    options: ["engineer", "architect", "electrician", "accountant"],
    answer: "architect",
    weight: 2,
  },
  {
    id: "v4",
    category: "VOCABULARY",
    question: "\"I'm feeling under the weather\" means:",
    options: ["I'm slightly ill", "I'm outside in the rain", "I'm very happy", "I'm confused"],
    answer: "I'm slightly ill",
    weight: 2,
  },
  {
    id: "v5",
    category: "VOCABULARY",
    question: "Choose the word closest in meaning to \"purchase\":",
    options: ["sell", "buy", "borrow", "return"],
    answer: "buy",
    weight: 2,
  },
  {
    id: "v6",
    category: "VOCABULARY",
    question: "A decision made quickly without thinking is:",
    options: ["deliberate", "impulsive", "cautious", "rational"],
    answer: "impulsive",
    weight: 3,
  },
  {
    id: "v7",
    category: "VOCABULARY",
    question: "The company had to ___ the meeting until next week.",
    options: ["postpone", "prevent", "propose", "pretend"],
    answer: "postpone",
    weight: 2,
  },
  {
    id: "v8",
    category: "VOCABULARY",
    question: "Evidence that is \"compelling\" is:",
    options: ["weak and doubtful", "convincing and persuasive", "illegal", "complicated"],
    answer: "convincing and persuasive",
    weight: 3,
  },

  // ==================== READING (7) ====================
  {
    id: "r1",
    category: "READING",
    passage: READING_PASSAGE_1,
    question: "Where does Sara work?",
    options: ["At a school", "At a hospital", "At a bank", "At a restaurant"],
    answer: "At a hospital",
    weight: 1,
  },
  {
    id: "r2",
    category: "READING",
    passage: READING_PASSAGE_1,
    question: "How many hours does Sara work each day?",
    options: ["Six", "Seven", "Eight", "Nine"],
    answer: "Eight",
    weight: 1,
  },
  {
    id: "r3",
    category: "READING",
    passage: READING_PASSAGE_1,
    question: "Why does Sara study English?",
    options: [
      "Because her job requires it",
      "Because she wants to work in Canada",
      "Because she teaches English",
      "Because her friends speak English",
    ],
    answer: "Because she wants to work in Canada",
    weight: 1,
  },
  {
    id: "r4",
    category: "READING",
    passage: READING_PASSAGE_2,
    question: "What did some managers originally fear about remote work?",
    options: [
      "That it would cost too much",
      "That employees would get less done",
      "That offices would close",
      "That studies would be negative",
    ],
    answer: "That employees would get less done",
    weight: 2,
  },
  {
    id: "r5",
    category: "READING",
    passage: READING_PASSAGE_2,
    question: "According to the passage, why do many remote workers report higher output?",
    options: [
      "They work more hours",
      "They avoid commutes and interruptions",
      "They are paid more",
      "They attend more meetings",
    ],
    answer: "They avoid commutes and interruptions",
    weight: 2,
  },
  {
    id: "r6",
    category: "READING",
    passage: READING_PASSAGE_2,
    question: "Which group does the passage say struggles most with remote work?",
    options: ["Managers", "Younger employees", "Experienced colleagues", "Creative directors"],
    answer: "Younger employees",
    weight: 3,
  },
  {
    id: "r7",
    category: "READING",
    passage: READING_PASSAGE_2,
    question: "What does the passage imply about creative collaboration?",
    options: [
      "It improves when scheduled in advance",
      "It depends on spontaneous interaction",
      "It is impossible remotely",
      "It matters less than concentration",
    ],
    answer: "It depends on spontaneous interaction",
    weight: 3,
  },
];

export function publicQuestions(): PlacementQuestionPublic[] {
  return PLACEMENT_QUESTIONS.map(({ id, category, passage, question, options }) => ({
    id,
    category,
    ...(passage ? { passage } : {}),
    question,
    options,
  }));
}

export interface PlacementScoreResult {
  score: number;
  level: Level;
  breakdown: { grammar: number; vocabulary: number; reading: number };
}

export function scorePlacement(answers: Record<string, string>): PlacementScoreResult {
  const byCategory: Record<string, { earned: number; possible: number }> = {
    GRAMMAR: { earned: 0, possible: 0 },
    VOCABULARY: { earned: 0, possible: 0 },
    READING: { earned: 0, possible: 0 },
  };

  for (const q of PLACEMENT_QUESTIONS) {
    const bucket = byCategory[q.category];
    bucket.possible += q.weight;
    if (answers[q.id] === q.answer) bucket.earned += q.weight;
  }

  const pct = (c: { earned: number; possible: number }) =>
    c.possible === 0 ? 0 : Math.round((100 * c.earned) / c.possible);

  const breakdown = {
    grammar: pct(byCategory.GRAMMAR),
    vocabulary: pct(byCategory.VOCABULARY),
    reading: pct(byCategory.READING),
  };

  const totalEarned = Object.values(byCategory).reduce((s, c) => s + c.earned, 0);
  const totalPossible = Object.values(byCategory).reduce((s, c) => s + c.possible, 0);
  const score = Math.round((100 * totalEarned) / totalPossible);

  const level: Level = score >= 70 ? "ADVANCED" : score >= 40 ? "INTERMEDIATE" : "BEGINNER";

  return { score, level, breakdown };
}
