import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

/**
 * Idempotent seed script. Safe to run repeatedly — every row is upserted by a
 * fixed, human-readable id, so re-running never creates duplicates.
 *
 * Run with: npx tsx prisma/seed.ts
 *
 * NOTE: this file intentionally does NOT import from "@/lib/*" — the "@/..."
 * path alias is a Next.js/tsconfig construct and is not guaranteed to resolve
 * under a plain tsx invocation, so the Prisma client is instantiated here
 * directly (mirroring the pattern in src/lib/db.ts) using relative imports.
 */

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

const db = new PrismaClient({ adapter });

const SYSTEM_TEACHER_ID = "seed-system-teacher";

type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

const POINTS_BY_DIFFICULTY: Record<Difficulty, number> = {
  BEGINNER: 10,
  INTERMEDIATE: 15,
  ADVANCED: 20,
};

interface SeedExercise {
  id: string;
  title: string;
  type: string;
  difficulty: Difficulty;
  data: unknown;
  timeLimit?: number | null;
  points?: number;
}

// ==================== GRAMMAR ====================
// Targeting common Arabic-speaker pain points: articles (Arabic has no
// indefinite article), dropped copula ("he doctor" -> "he IS a doctor"),
// prepositions, present perfect vs simple past, and p/b spelling confusion
// (Arabic has no /p/ phoneme).

const grammarExercises: SeedExercise[] = [
  {
    id: "seed-grammar-beginner-1",
    title: "Everyday Grammar: Articles & the Verb 'To Be'",
    type: "GRAMMAR",
    difficulty: "BEGINNER",
    data: {
      items: [
        {
          id: "g-b1-1",
          kind: "fill-blank",
          prompt: "Choose the correct article.",
          text: "My brother is ___ engineer.",
          options: ["a", "an", "the", "-"],
          answer: "an",
          explanation: "Use 'an' before words that start with a vowel sound, like 'engineer'.",
        },
        {
          id: "g-b1-2",
          kind: "fill-blank",
          prompt: "Complete the sentence with the correct form of 'to be'.",
          text: "She ___ a doctor.",
          options: ["is", "are", "am", "-"],
          answer: "is",
          explanation:
            "Arabic doesn't need 'to be' in the present tense ('هي طبيبة' literally means 'she doctor'), but English requires it: 'She IS a doctor.'",
        },
        {
          id: "g-b1-3",
          kind: "error-correction",
          prompt: "Find and correct the error.",
          text: "My father busy today.",
          options: [
            "My father busy today.",
            "My father is busy today.",
            "My father busies today.",
            "My father been busy today.",
          ],
          answer: "My father is busy today.",
          explanation:
            "English sentences need a form of 'to be' (is/am/are) before an adjective — Arabic doesn't.",
        },
        {
          id: "g-b1-4",
          kind: "fill-blank",
          prompt: "Choose the correct preposition.",
          text: "I arrived ___ the airport at 9 PM.",
          options: ["at", "in", "on", "to"],
          answer: "at",
          explanation: "Use 'at' for specific points and places like airports, not 'in' or 'on'.",
        },
        {
          id: "g-b1-5",
          kind: "reorder",
          prompt: "Put the words in the correct order.",
          words: ["is", "sister", "my", "a", "teacher"],
          answer: "My sister is a teacher",
          explanation: "English word order is Subject + Verb ('is') + Article ('a') + Noun ('teacher').",
        },
        {
          id: "g-b1-6",
          kind: "fill-blank",
          prompt: "Choose the correct article.",
          text: "___ sun is very hot today.",
          options: ["A", "An", "The", "-"],
          answer: "The",
          explanation: "Use 'the' for unique things there's only one of, like the sun.",
        },
      ],
    },
  },
  {
    id: "seed-grammar-beginner-2",
    title: "Everyday Grammar: Prepositions & Spelling Traps",
    type: "GRAMMAR",
    difficulty: "BEGINNER",
    data: {
      items: [
        {
          id: "g-b2-1",
          kind: "fill-blank",
          prompt: "Choose the correct article.",
          text: "Can I have ___ apple, please?",
          options: ["a", "an", "the", "-"],
          answer: "an",
          explanation: "Use 'an' before words starting with a vowel sound, like 'apple'.",
        },
        {
          id: "g-b2-2",
          kind: "error-correction",
          prompt: "Find and correct the spelling error.",
          text: "I want to buy a new bhone.",
          options: [
            "I want to buy a new bhone.",
            "I want to buy a new phone.",
            "I want to buy a new fone.",
            "I want to buy a new vone.",
          ],
          answer: "I want to buy a new phone.",
          explanation:
            "Arabic has no /p/ sound, so learners sometimes write 'b' instead of 'p'. Remember: 'phone' starts with 'p', not 'b'.",
        },
        {
          id: "g-b2-3",
          kind: "fill-blank",
          prompt: "Choose the correct preposition.",
          text: "The book is ___ the table.",
          options: ["in", "on", "at", "under"],
          answer: "on",
          explanation: "'On' means the book is touching the top surface of the table.",
        },
        {
          id: "g-b2-4",
          kind: "fill-blank",
          prompt: "Complete the sentence with the correct form of 'to be'.",
          text: "They ___ students at this school.",
          options: ["is", "am", "are", "be"],
          answer: "are",
          explanation: "Use 'are' with plural subjects like 'they'.",
        },
        {
          id: "g-b2-5",
          kind: "reorder",
          prompt: "Put the words in the correct order.",
          words: ["like", "coffee", "I", "morning", "in", "the"],
          answer: "I like coffee in the morning",
          explanation: "Standard word order: Subject + Verb + Object + Time phrase.",
        },
        {
          id: "g-b2-6",
          kind: "fill-blank",
          prompt: "Choose the correct preposition.",
          text: "She is good ___ mathematics.",
          options: ["in", "at", "on", "for"],
          answer: "at",
          explanation: "Use 'good at' + skill or subject, not 'good in'.",
        },
      ],
    },
  },
  {
    id: "seed-grammar-intermediate-1",
    title: "Present Perfect vs. Simple Past",
    type: "GRAMMAR",
    difficulty: "INTERMEDIATE",
    data: {
      items: [
        {
          id: "g-i1-1",
          kind: "fill-blank",
          prompt: "Choose the correct verb form.",
          text: "I ___ this movie three times.",
          options: ["watched", "have watched", "am watching", "watch"],
          answer: "have watched",
          explanation:
            "Use present perfect ('have watched') for repeated actions with an unspecified time, not simple past.",
        },
        {
          id: "g-i1-2",
          kind: "fill-blank",
          prompt: "Choose the correct verb form.",
          text: "She ___ to Egypt last summer.",
          options: ["has gone", "went", "goes", "go"],
          answer: "went",
          explanation: "Use simple past for a specific, finished time in the past ('last summer').",
        },
        {
          id: "g-i1-3",
          kind: "error-correction",
          prompt: "Find and correct the error.",
          text: "I have seen him yesterday.",
          options: [
            "I have seen him yesterday.",
            "I saw him yesterday.",
            "I have see him yesterday.",
            "I was seeing him yesterday.",
          ],
          answer: "I saw him yesterday.",
          explanation:
            "Never use present perfect with a specific past-time word like 'yesterday' — use simple past instead.",
        },
        {
          id: "g-i1-4",
          kind: "fill-blank",
          prompt: "Choose the correct preposition.",
          text: "He has been working here ___ five years.",
          options: ["since", "for", "from", "during"],
          answer: "for",
          explanation: "Use 'for' with a duration ('five years') and 'since' with a starting point ('2019').",
        },
        {
          id: "g-i1-5",
          kind: "reorder",
          prompt: "Put the words in the correct order.",
          words: ["never", "have", "I", "sushi", "eaten"],
          answer: "I have never eaten sushi",
          explanation: "Present perfect word order: Subject + have/has + never + past participle.",
        },
        {
          id: "g-i1-6",
          kind: "fill-blank",
          prompt: "Choose the correct auxiliary verb.",
          text: "___ you ever visited London?",
          options: ["Did", "Have", "Do", "Was"],
          answer: "Have",
          explanation: "'Have you ever...?' asks about life experience up to now — present perfect.",
        },
      ],
    },
  },
  {
    id: "seed-grammar-intermediate-2",
    title: "Prepositions, Agreement & Spelling",
    type: "GRAMMAR",
    difficulty: "INTERMEDIATE",
    data: {
      items: [
        {
          id: "g-i2-1",
          kind: "error-correction",
          prompt: "Find and correct the spelling error.",
          text: "The broblem is very simple.",
          options: [
            "The broblem is very simple.",
            "The problem is very simple.",
            "The proplem is very simple.",
            "The prablem is very simple.",
          ],
          answer: "The problem is very simple.",
          explanation: "Watch the initial /p/ sound in 'problem' — Arabic speakers often substitute 'b'.",
        },
        {
          id: "g-i2-2",
          kind: "fill-blank",
          prompt: "Choose the correct preposition.",
          text: "I'm looking forward ___ seeing you.",
          options: ["to", "for", "at", "with"],
          answer: "to",
          explanation: "'Look forward to' is followed by 'to' + -ing, not 'for'.",
        },
        {
          id: "g-i2-3",
          kind: "fill-blank",
          prompt: "Choose the correct verb form.",
          text: "By next year, I ___ my degree.",
          options: ["will finish", "will have finished", "finish", "have finished"],
          answer: "will have finished",
          explanation: "Future perfect describes an action that will be completed before a future point in time.",
        },
        {
          id: "g-i2-4",
          kind: "error-correction",
          prompt: "Find and correct the agreement error.",
          text: "Each of the students have a book.",
          options: [
            "Each of the students have a book.",
            "Each of the students has a book.",
            "Each of the students having a book.",
            "Each of the students had have a book.",
          ],
          answer: "Each of the students has a book.",
          explanation: "'Each' is grammatically singular, so it takes 'has', even though 'students' is plural.",
        },
        {
          id: "g-i2-5",
          kind: "reorder",
          prompt: "Put the words in the correct order.",
          words: ["married", "she", "since", "has", "been", "2015"],
          answer: "She has been married since 2015",
          explanation: "Present perfect with 'since' + a starting point in time.",
        },
        {
          id: "g-i2-6",
          kind: "fill-blank",
          prompt: "Choose the correct preposition.",
          text: "The meeting is scheduled ___ 3 PM.",
          options: ["at", "in", "on", "for"],
          answer: "at",
          explanation: "Use 'at' with a specific clock time, not 'in' or 'on'.",
        },
      ],
    },
  },
  {
    id: "seed-grammar-advanced-1",
    title: "Advanced Structures: Passive, Conditionals & Inversion",
    type: "GRAMMAR",
    difficulty: "ADVANCED",
    data: {
      items: [
        {
          id: "g-a1-1",
          kind: "fill-blank",
          prompt: "Choose the correct passive form.",
          text: "The bridge ___ in 1990.",
          options: ["built", "was built", "has built", "builds"],
          answer: "was built",
          explanation: "Use passive voice ('was built') when the agent of the action is unknown or unimportant.",
        },
        {
          id: "g-a1-2",
          kind: "fill-blank",
          prompt: "Choose the correct conditional form.",
          text: "If I ___ harder, I would have passed the exam.",
          options: ["studied", "had studied", "have studied", "study"],
          answer: "had studied",
          explanation:
            "The third conditional (hypothetical past) uses 'if + past perfect', 'would have + past participle'.",
        },
        {
          id: "g-a1-3",
          kind: "error-correction",
          prompt: "Find and correct the error.",
          text: "Despite he was tired, he finished the project.",
          options: [
            "Despite he was tired, he finished the project.",
            "Despite being tired, he finished the project.",
            "Despite of being tired, he finished the project.",
            "Although being tired, he finished the project.",
          ],
          answer: "Despite being tired, he finished the project.",
          explanation:
            "'Despite' is followed by a noun or gerund, not a full clause with a subject — use 'although' for that.",
        },
        {
          id: "g-a1-4",
          kind: "fill-blank",
          prompt: "Choose the correct inverted form.",
          text: "Rarely ___ such dedication in a new employee.",
          options: ["we see", "do we see", "we do see", "did we saw"],
          answer: "do we see",
          explanation: "Negative adverbs like 'rarely' placed at the start of a sentence trigger subject-auxiliary inversion.",
        },
        {
          id: "g-a1-5",
          kind: "reorder",
          prompt: "Put the words in the correct order.",
          words: ["report", "have", "the", "reviewed", "should", "you"],
          answer: "You should have reviewed the report",
          explanation: "Modal perfect 'should have + past participle' expresses regret about the past.",
        },
        {
          id: "g-a1-6",
          kind: "fill-blank",
          prompt: "Choose the correct subjunctive form.",
          text: "It is essential that he ___ present at the meeting.",
          options: ["is", "be", "was", "being"],
          answer: "be",
          explanation: "The subjunctive mood after 'essential that' uses the base form 'be', not 'is'.",
        },
      ],
    },
  },
  {
    id: "seed-grammar-advanced-2",
    title: "Advanced Structures: Mixed Conditionals & Collocations",
    type: "GRAMMAR",
    difficulty: "ADVANCED",
    data: {
      items: [
        {
          id: "g-a2-1",
          kind: "error-correction",
          prompt: "Find and correct the spelling error.",
          text: "We need to broduce more before the deadline.",
          options: [
            "We need to broduce more before the deadline.",
            "We need to produce more before the deadline.",
            "We need to prodouce more before the deadline.",
            "We need to broduse more before the deadline.",
          ],
          answer: "We need to produce more before the deadline.",
          explanation: "Mind the initial /p/ sound in 'produce' — a common substitution for Arabic speakers is 'b'.",
        },
        {
          id: "g-a2-2",
          kind: "fill-blank",
          prompt: "Choose the correct word.",
          text: "___ the heavy rain, the flight departed on time.",
          options: ["Despite", "Although", "Even though", "In spite"],
          answer: "Despite",
          explanation: "'Despite' is followed directly by a noun phrase ('the heavy rain'); 'in spite' needs 'of'.",
        },
        {
          id: "g-a2-3",
          kind: "fill-blank",
          prompt: "Choose the correct preposition.",
          text: "The committee is responsible ___ approving the budget.",
          options: ["for", "of", "to", "with"],
          answer: "for",
          explanation: "'Responsible for' is the correct collocation.",
        },
        {
          id: "g-a2-4",
          kind: "fill-blank",
          prompt: "Choose the correct mixed conditional form.",
          text: "If she ___ the warning, she wouldn't be in trouble now.",
          options: ["heeded", "had heeded", "heeds", "would heed"],
          answer: "had heeded",
          explanation: "Mixed conditional: a past condition ('had heeded') with a present result ('wouldn't be').",
        },
        {
          id: "g-a2-5",
          kind: "reorder",
          prompt: "Put the words in the correct order.",
          words: ["hardly", "had", "we", "sat", "down", "when", "the", "phone", "rang"],
          answer: "Hardly had we sat down when the phone rang",
          explanation: "'Hardly... when' requires inversion after 'hardly' in formal English.",
        },
        {
          id: "g-a2-6",
          kind: "error-correction",
          prompt: "Find and correct the agreement error.",
          text: "Neither of the answers were correct.",
          options: [
            "Neither of the answers were correct.",
            "Neither of the answers was correct.",
            "Neither of the answers is correct.",
            "Neither of the answer were correct.",
          ],
          answer: "Neither of the answers was correct.",
          explanation:
            "'Neither' is grammatically singular, so it takes a singular verb ('was'), even though it's followed by a plural noun.",
        },
      ],
    },
  },
];

// ==================== VOCABULARY ====================

const vocabularyExercises: SeedExercise[] = [
  {
    id: "seed-vocabulary-beginner-1",
    title: "Vocabulary Match: Daily Life",
    type: "VOCABULARY",
    difficulty: "BEGINNER",
    data: {
      pairs: [
        { word: "breakfast", meaning: "the first meal of the day, eaten in the morning" },
        { word: "alarm clock", meaning: "a device that makes a sound to wake you up" },
        { word: "toothbrush", meaning: "a small brush used to clean your teeth" },
        { word: "shower", meaning: "to wash your body while standing under running water" },
        { word: "commute", meaning: "to travel regularly between home and work" },
        { word: "chores", meaning: "small jobs done regularly at home, like cleaning" },
        { word: "neighbor", meaning: "a person who lives next to you or nearby" },
        { word: "bedtime", meaning: "the time you usually go to sleep" },
      ],
    },
  },
  {
    id: "seed-vocabulary-beginner-2",
    title: "Vocabulary Match: Food",
    type: "VOCABULARY",
    difficulty: "BEGINNER",
    data: {
      pairs: [
        { word: "recipe", meaning: "a set of instructions for cooking a dish" },
        { word: "ingredient", meaning: "one of the foods used to make a dish" },
        { word: "leftovers", meaning: "food that remains after a meal, saved for later" },
        { word: "grocery store", meaning: "a shop where you buy food and household items" },
        { word: "appetite", meaning: "the desire to eat food" },
        { word: "delicious", meaning: "having a very pleasant taste" },
        { word: "snack", meaning: "a small amount of food eaten between meals" },
        { word: "fresh", meaning: "recently made or grown, not old or frozen" },
      ],
    },
  },
  {
    id: "seed-vocabulary-intermediate-1",
    title: "Vocabulary Match: Travel",
    type: "VOCABULARY",
    difficulty: "INTERMEDIATE",
    data: {
      pairs: [
        { word: "itinerary", meaning: "a planned schedule of places to visit on a trip" },
        { word: "layover", meaning: "a short stop between flights during a journey" },
        { word: "customs", meaning: "the checkpoint at a border where officials inspect luggage" },
        { word: "accommodation", meaning: "a place to stay, such as a hotel or hostel" },
        { word: "boarding pass", meaning: "the document that allows you to get on a plane" },
        { word: "souvenir", meaning: "an item you keep to remember a trip" },
        { word: "jet lag", meaning: "tiredness caused by traveling across time zones" },
        { word: "excursion", meaning: "a short trip taken for pleasure, often as part of a tour" },
      ],
    },
  },
  {
    id: "seed-vocabulary-intermediate-2",
    title: "Vocabulary Match: Work",
    type: "VOCABULARY",
    difficulty: "INTERMEDIATE",
    data: {
      pairs: [
        { word: "deadline", meaning: "the time by which a task must be finished" },
        { word: "colleague", meaning: "a person you work with" },
        { word: "promotion", meaning: "a move to a higher position at work" },
        { word: "resign", meaning: "to formally quit your job" },
        { word: "salary", meaning: "the fixed regular payment for work, usually monthly" },
        { word: "negotiate", meaning: "to discuss something to reach an agreement" },
        { word: "workload", meaning: "the amount of work someone has to do" },
        { word: "multitask", meaning: "to do more than one task at the same time" },
      ],
    },
  },
  {
    id: "seed-vocabulary-advanced-1",
    title: "Vocabulary Match: Health",
    type: "VOCABULARY",
    difficulty: "ADVANCED",
    data: {
      pairs: [
        { word: "diagnosis", meaning: "the identification of an illness by examining its symptoms" },
        { word: "prescription", meaning: "a doctor's written instruction for medicine" },
        { word: "chronic", meaning: "describing a condition that lasts for a long time" },
        { word: "symptom", meaning: "a physical sign that shows you might be ill" },
        { word: "immune system", meaning: "the body's natural defense against disease" },
        { word: "recovery", meaning: "the process of getting better after an illness" },
        { word: "side effect", meaning: "an unwanted result caused by a medicine" },
        { word: "well-being", meaning: "the state of being healthy, happy, and comfortable" },
      ],
    },
  },
  {
    id: "seed-vocabulary-advanced-2",
    title: "Vocabulary Match: Technology",
    type: "VOCABULARY",
    difficulty: "ADVANCED",
    data: {
      pairs: [
        { word: "algorithm", meaning: "a set of rules a computer follows to solve a problem" },
        { word: "encryption", meaning: "the process of converting data into a secure code" },
        { word: "bandwidth", meaning: "the amount of data that can be transferred over a connection" },
        { word: "firmware", meaning: "software built permanently into a hardware device" },
        { word: "scalability", meaning: "a system's ability to grow to handle more demand" },
        { word: "latency", meaning: "the delay before data begins to transfer" },
        { word: "interface", meaning: "the point where a user interacts with a system" },
        { word: "breach", meaning: "an incident where security is broken and data is exposed" },
      ],
    },
  },
];

// ==================== TRANSLATION ====================
// Real MSA Arabic sentences with natural English references.

const translationExercises: SeedExercise[] = [
  {
    id: "seed-translation-beginner-1",
    title: "Translate: Everyday Sentences (Arabic to English)",
    type: "TRANSLATION",
    difficulty: "BEGINNER",
    data: {
      items: [
        {
          id: "t-b1-1",
          direction: "ar-en",
          source: "أين أقرب محطة قطار؟",
          reference: "Where is the nearest train station?",
        },
        {
          id: "t-b1-2",
          direction: "ar-en",
          source: "اسمي أحمد وأنا من الأردن.",
          reference: "My name is Ahmad and I am from Jordan.",
        },
        {
          id: "t-b1-3",
          direction: "ar-en",
          source: "كم الساعة الآن؟",
          reference: "What time is it now?",
        },
        {
          id: "t-b1-4",
          direction: "ar-en",
          source: "أنا أحب شرب الشاي في الصباح.",
          reference: "I like drinking tea in the morning.",
        },
      ],
    },
  },
  {
    id: "seed-translation-beginner-2",
    title: "Translate: Simple Requests (Arabic to English)",
    type: "TRANSLATION",
    difficulty: "BEGINNER",
    data: {
      items: [
        {
          id: "t-b2-1",
          direction: "ar-en",
          source: "هل يمكنني الحصول على كوب من الماء من فضلك؟",
          reference: "Can I have a glass of water, please?",
        },
        {
          id: "t-b2-2",
          direction: "ar-en",
          source: "أختي تدرس في الجامعة.",
          reference: "My sister studies at the university.",
        },
        {
          id: "t-b2-3",
          direction: "ar-en",
          source: "الجو حار جدا اليوم.",
          reference: "The weather is very hot today.",
        },
        {
          id: "t-b2-4",
          direction: "ar-en",
          source: "أين يقع أقرب مطعم؟",
          reference: "Where is the nearest restaurant located?",
        },
      ],
    },
  },
  {
    id: "seed-translation-intermediate-1",
    title: "Translate: Work & Travel (Arabic to English)",
    type: "TRANSLATION",
    difficulty: "INTERMEDIATE",
    data: {
      items: [
        {
          id: "t-i1-1",
          direction: "ar-en",
          source: "أعمل في هذه الشركة منذ خمس سنوات.",
          reference: "I have been working at this company for five years.",
        },
        {
          id: "t-i1-2",
          direction: "ar-en",
          source: "يجب أن نصل إلى المطار قبل ساعتين من موعد الرحلة.",
          reference: "We must arrive at the airport two hours before the flight time.",
        },
        {
          id: "t-i1-3",
          direction: "ar-en",
          source: "لم أستطع حضور الاجتماع لأنني كنت مريضاً.",
          reference: "I couldn't attend the meeting because I was sick.",
        },
        {
          id: "t-i1-4",
          direction: "ar-en",
          source: "من الأفضل أن تحجز تذكرتك مبكراً لتوفير المال.",
          reference: "It's better to book your ticket early to save money.",
        },
      ],
    },
  },
  {
    id: "seed-translation-intermediate-2",
    title: "Translate: Everyday Requests (English to Arabic)",
    type: "TRANSLATION",
    difficulty: "INTERMEDIATE",
    data: {
      items: [
        {
          id: "t-i2-1",
          direction: "en-ar",
          source: "I would like to schedule an appointment with the doctor.",
          reference: "أود أن أحجز موعداً مع الطبيب.",
        },
        {
          id: "t-i2-2",
          direction: "en-ar",
          source: "Could you please send me the report by tomorrow morning?",
          reference: "هل يمكنك إرسال التقرير لي بحلول صباح الغد من فضلك؟",
        },
        {
          id: "t-i2-3",
          direction: "en-ar",
          source: "The flight was delayed because of bad weather.",
          reference: "تأخرت الرحلة بسبب سوء الأحوال الجوية.",
        },
        {
          id: "t-i2-4",
          direction: "en-ar",
          source: "She has decided to continue her studies abroad.",
          reference: "قررت أن تكمل دراستها في الخارج.",
        },
      ],
    },
  },
  {
    id: "seed-translation-advanced-1",
    title: "Translate: Business & Policy (Arabic to English)",
    type: "TRANSLATION",
    difficulty: "ADVANCED",
    data: {
      items: [
        {
          id: "t-a1-1",
          direction: "ar-en",
          source: "على الرغم من التحديات الاقتصادية، تمكنت الشركة من زيادة أرباحها هذا العام.",
          reference: "Despite the economic challenges, the company managed to increase its profits this year.",
        },
        {
          id: "t-a1-2",
          direction: "ar-en",
          source: "ينبغي على الحكومة أن تتخذ إجراءات فورية للحد من التلوث البيئي.",
          reference: "The government should take immediate measures to reduce environmental pollution.",
        },
        {
          id: "t-a1-3",
          direction: "ar-en",
          source: "لو كنت أعلم بالمشكلة مسبقاً، لكنت تصرفت بشكل مختلف.",
          reference: "If I had known about the problem beforehand, I would have acted differently.",
        },
        {
          id: "t-a1-4",
          direction: "ar-en",
          source: "تشير الدراسات الحديثة إلى أن العمل عن بعد يزيد من إنتاجية الموظفين.",
          reference: "Recent studies indicate that remote work increases employee productivity.",
        },
      ],
    },
  },
  {
    id: "seed-translation-advanced-2",
    title: "Translate: Abstract & Analytical Ideas (Arabic to English)",
    type: "TRANSLATION",
    difficulty: "ADVANCED",
    data: {
      items: [
        {
          id: "t-a2-1",
          direction: "ar-en",
          source: "من الضروري أن نوازن بين حياتنا المهنية والشخصية لتجنب الإرهاق.",
          reference: "It is essential to balance our professional and personal lives to avoid burnout.",
        },
        {
          id: "t-a2-2",
          direction: "ar-en",
          source: "أثار القرار الجديد جدلاً واسعاً بين أعضاء البرلمان.",
          reference: "The new decision sparked widespread debate among members of parliament.",
        },
        {
          id: "t-a2-3",
          direction: "ar-en",
          source: "بحلول نهاية العام، سيكون الفريق قد أنجز جميع مراحل المشروع.",
          reference: "By the end of the year, the team will have completed all phases of the project.",
        },
        {
          id: "t-a2-4",
          direction: "ar-en",
          source: "كلما زاد الطلب على المنتج، ارتفع سعره في السوق.",
          reference: "The greater the demand for the product, the higher its price rises in the market.",
        },
      ],
    },
  },
];

// ==================== LISTENING ====================

const listeningExercises: SeedExercise[] = [
  {
    id: "seed-listening-beginner-1",
    title: "Listening: Introductions & Routines",
    type: "LISTENING",
    difficulty: "BEGINNER",
    data: {
      items: [
        {
          id: "l-b1-1",
          transcript: "Hi, my name is Layla. I am twenty-five years old and I live in Amman.",
          question: "How old is Layla?",
          options: ["Twenty", "Twenty-two", "Twenty-five", "Thirty"],
          answer: "Twenty-five",
        },
        {
          id: "l-b1-2",
          transcript: "The bus to downtown leaves at nine fifteen every morning. Please arrive ten minutes early.",
          question: "What time does the bus leave?",
          options: ["Nine o'clock", "Nine fifteen", "Nine thirty", "Ten fifteen"],
          answer: "Nine fifteen",
        },
        {
          id: "l-b1-3",
          transcript:
            "Excuse me, could you tell me where the nearest pharmacy is? I think it's next to the bank.",
          question: "Where is the pharmacy?",
          options: ["Next to the bank", "Next to the school", "Across from the hospital", "Inside the mall"],
          answer: "Next to the bank",
        },
        {
          id: "l-b1-4",
          transcript: "I usually have eggs and bread for breakfast, but today I only had coffee.",
          question: "What did the speaker have for breakfast today?",
          options: ["Eggs and bread", "Only coffee", "Eggs and coffee", "Nothing"],
          answer: "Only coffee",
        },
      ],
    },
  },
  {
    id: "seed-listening-beginner-2",
    title: "Listening: Shopping & Weather",
    type: "LISTENING",
    difficulty: "BEGINNER",
    data: {
      items: [
        {
          id: "l-b2-1",
          transcript: "Welcome to City Market. Today we have a big sale — fresh apples for one dinar per kilo.",
          question: "What is on sale?",
          options: ["Bananas", "Apples", "Oranges", "Bread"],
          answer: "Apples",
        },
        {
          id: "l-b2-2",
          transcript: "The weather today is sunny with a light breeze. Tomorrow, we expect rain in the afternoon.",
          question: "What will the weather be like tomorrow afternoon?",
          options: ["Sunny", "Windy", "Rainy", "Snowy"],
          answer: "Rainy",
        },
        {
          id: "l-b2-3",
          transcript: "My brother works as a nurse at the city hospital. He usually works night shifts.",
          question: "What is the speaker's brother's job?",
          options: ["Doctor", "Nurse", "Teacher", "Driver"],
          answer: "Nurse",
        },
        {
          id: "l-b2-4",
          transcript: "Can you pass me the salt, please? This soup needs a little more flavor.",
          question: "What does the speaker ask for?",
          options: ["Sugar", "Pepper", "Salt", "Water"],
          answer: "Salt",
        },
      ],
    },
  },
  {
    id: "seed-listening-intermediate-1",
    title: "Listening: Travel & Customer Service",
    type: "LISTENING",
    difficulty: "INTERMEDIATE",
    data: {
      items: [
        {
          id: "l-i1-1",
          transcript:
            "Good morning, passengers. Flight 204 to Dubai has been delayed by forty-five minutes due to technical issues.",
          question: "Why was the flight delayed?",
          options: ["Bad weather", "Technical issues", "A staff shortage", "A security check"],
          answer: "Technical issues",
        },
        {
          id: "l-i1-2",
          transcript:
            "I've been trying to reach the customer service line for an hour, but the wait time keeps increasing.",
          question: "What problem does the speaker have?",
          options: ["The line is busy", "The wait time is long", "The number is wrong", "The office is closed"],
          answer: "The wait time is long",
        },
        {
          id: "l-i1-3",
          transcript:
            "Our meeting has been moved from Tuesday to Thursday because two team members are traveling.",
          question: "Why was the meeting rescheduled?",
          options: ["The room was booked", "Two members are traveling", "The client canceled", "It's a holiday"],
          answer: "Two members are traveling",
        },
        {
          id: "l-i1-4",
          transcript:
            "If you'd like to return this item, please keep the receipt and bring it back within thirty days.",
          question: "What is required to return the item?",
          options: ["A photo ID", "The original box", "The receipt", "A credit card"],
          answer: "The receipt",
        },
      ],
    },
  },
  {
    id: "seed-listening-intermediate-2",
    title: "Listening: Workplace Announcements",
    type: "LISTENING",
    difficulty: "INTERMEDIATE",
    data: {
      items: [
        {
          id: "l-i2-1",
          transcript:
            "The seminar covers three main topics: negotiation skills, time management, and effective communication.",
          question: "How many topics does the seminar cover?",
          options: ["Two", "Three", "Four", "Five"],
          answer: "Three",
        },
        {
          id: "l-i2-2",
          transcript:
            "Due to the increase in demand, we're now offering same-day delivery for orders placed before noon.",
          question: "What is required for same-day delivery?",
          options: ["Orders placed before noon", "Orders over fifty dollars", "A membership card", "Orders placed on weekends"],
          answer: "Orders placed before noon",
        },
        {
          id: "l-i2-3",
          transcript: "I recommend booking your hotel at least two months in advance during the summer season.",
          question: "When does the speaker recommend booking a hotel in summer?",
          options: ["One week ahead", "One month ahead", "Two months ahead", "The day before"],
          answer: "Two months ahead",
        },
        {
          id: "l-i2-4",
          transcript:
            "The new policy requires all employees to complete safety training before starting their shift.",
          question: "What must employees complete before their shift?",
          options: ["A medical exam", "Safety training", "A background check", "An interview"],
          answer: "Safety training",
        },
      ],
    },
  },
  {
    id: "seed-listening-advanced-1",
    title: "Listening: Business & Economic Analysis",
    type: "LISTENING",
    difficulty: "ADVANCED",
    data: {
      items: [
        {
          id: "l-a1-1",
          transcript:
            "Despite initial skepticism from investors, the startup's revenue tripled within eighteen months of launching its subscription model.",
          question: "What happened to the startup's revenue?",
          options: ["It stayed the same", "It doubled", "It tripled", "It declined"],
          answer: "It tripled",
        },
        {
          id: "l-a1-2",
          transcript:
            "The panel concluded that while automation increases efficiency, it also raises concerns about long-term job displacement.",
          question: "What concern did the panel raise about automation?",
          options: ["Higher costs", "Job displacement", "Lower quality", "Environmental damage"],
          answer: "Job displacement",
        },
        {
          id: "l-a1-3",
          transcript:
            "Although the merger was expected to close by the end of the quarter, regulatory delays have pushed the timeline back significantly.",
          question: "Why was the merger delayed?",
          options: ["Financial issues", "Regulatory delays", "Shareholder disputes", "Market crash"],
          answer: "Regulatory delays",
        },
        {
          id: "l-a1-4",
          transcript:
            "The report highlights that emerging markets, rather than developed economies, are now driving most of the global growth.",
          question: "According to the report, what is driving global growth?",
          options: ["Developed economies", "Emerging markets", "Government spending", "Technology firms"],
          answer: "Emerging markets",
        },
      ],
    },
  },
  {
    id: "seed-listening-advanced-2",
    title: "Listening: Policy & Research Findings",
    type: "LISTENING",
    difficulty: "ADVANCED",
    data: {
      items: [
        {
          id: "l-a2-1",
          transcript:
            "Critics argue that the policy, though well-intentioned, fails to address the root causes of the housing shortage.",
          question: "What do critics say about the policy?",
          options: ["It solves the problem", "It fails to address root causes", "It is too expensive", "It was never implemented"],
          answer: "It fails to address root causes",
        },
        {
          id: "l-a2-2",
          transcript:
            "The committee recommended a phased rollout to minimize disruption, rather than implementing the changes all at once.",
          question: "What did the committee recommend?",
          options: ["Immediate implementation", "A phased rollout", "Canceling the changes", "A public vote"],
          answer: "A phased rollout",
        },
        {
          id: "l-a2-3",
          transcript:
            "Researchers found a correlation between sleep quality and productivity, though they cautioned against assuming causation.",
          question: "What did researchers find?",
          options: [
            "No connection between sleep and productivity",
            "A correlation between sleep and productivity",
            "That sleep causes productivity",
            "That productivity causes sleep",
          ],
          answer: "A correlation between sleep and productivity",
        },
        {
          id: "l-a2-4",
          transcript:
            "The ambassador emphasized that the agreement, while symbolic, lays the groundwork for more substantial cooperation in the future.",
          question: "How did the ambassador describe the agreement?",
          options: ["Meaningless", "Symbolic but foundational", "Legally binding", "Temporary"],
          answer: "Symbolic but foundational",
        },
      ],
    },
  },
];

// ==================== QUIZ (Speed Quiz) ====================

const quizExercises: SeedExercise[] = [
  {
    id: "seed-quiz-beginner-1",
    title: "Speed Quiz: Basics I",
    type: "QUIZ",
    difficulty: "BEGINNER",
    data: {
      timePerQuestion: 15,
      items: [
        { id: "q-b1-1", question: "What is the plural of 'child'?", options: ["childs", "children", "childes", "child"], answer: "children" },
        { id: "q-b1-2", question: "Choose the correct word: 'She ___ to school every day.'", options: ["go", "goes", "going", "gone"], answer: "goes" },
        { id: "q-b1-3", question: "What do you call the meal you eat in the morning?", options: ["lunch", "dinner", "breakfast", "snack"], answer: "breakfast" },
        { id: "q-b1-4", question: "Complete: 'There ___ two books on the table.'", options: ["is", "are", "be", "was"], answer: "are" },
        { id: "q-b1-5", question: "What is the opposite of 'big'?", options: ["small", "tall", "wide", "heavy"], answer: "small" },
        { id: "q-b1-6", question: "Choose the correct sentence.", options: ["He don't like tea.", "He doesn't like tea.", "He not like tea.", "He no like tea."], answer: "He doesn't like tea." },
        { id: "q-b1-7", question: "What color is the sky on a clear day?", options: ["Green", "Blue", "Red", "Yellow"], answer: "Blue" },
        { id: "q-b1-8", question: "Complete: 'I ___ my homework yesterday.'", options: ["do", "did", "does", "doing"], answer: "did" },
      ],
    },
  },
  {
    id: "seed-quiz-beginner-2",
    title: "Speed Quiz: Basics II",
    type: "QUIZ",
    difficulty: "BEGINNER",
    data: {
      timePerQuestion: 15,
      items: [
        { id: "q-b2-1", question: "What is the past tense of 'eat'?", options: ["eated", "ate", "eaten", "eating"], answer: "ate" },
        { id: "q-b2-2", question: "Choose the correct article: '___ apple a day keeps the doctor away.'", options: ["A", "An", "The", "-"], answer: "An" },
        { id: "q-b2-3", question: "What do you call a person who teaches students?", options: ["doctor", "teacher", "driver", "farmer"], answer: "teacher" },
        { id: "q-b2-4", question: "Complete: 'My parents ___ from Egypt.'", options: ["is", "am", "are", "be"], answer: "are" },
        { id: "q-b2-5", question: "What is the opposite of 'hot'?", options: ["cold", "warm", "dry", "wet"], answer: "cold" },
        { id: "q-b2-6", question: "Choose the correct sentence.", options: ["She have a car.", "She has a car.", "She having a car.", "She haves a car."], answer: "She has a car." },
        { id: "q-b2-7", question: "How many days are there in a week?", options: ["Five", "Six", "Seven", "Eight"], answer: "Seven" },
        { id: "q-b2-8", question: "Complete: 'We ___ watching TV right now.'", options: ["is", "am", "are", "be"], answer: "are" },
      ],
    },
  },
  {
    id: "seed-quiz-intermediate-1",
    title: "Speed Quiz: Verb Tenses & Meaning",
    type: "QUIZ",
    difficulty: "INTERMEDIATE",
    data: {
      timePerQuestion: 12,
      items: [
        { id: "q-i1-1", question: "Choose the correct sentence.", options: ["I have been to Paris last year.", "I went to Paris last year.", "I have gone to Paris last year.", "I go to Paris last year."], answer: "I went to Paris last year." },
        { id: "q-i1-2", question: "What is a synonym for 'happy'?", options: ["furious", "joyful", "tired", "anxious"], answer: "joyful" },
        { id: "q-i1-3", question: "Complete: 'If it rains, we ___ the picnic.'", options: ["cancel", "will cancel", "canceled", "would cancel"], answer: "will cancel" },
        { id: "q-i1-4", question: "Choose the correct preposition: 'She is good ___ solving problems.'", options: ["in", "at", "on", "for"], answer: "at" },
        { id: "q-i1-5", question: "What does 'to postpone' mean?", options: ["to cancel", "to delay", "to finish", "to start"], answer: "to delay" },
        { id: "q-i1-6", question: "Choose the correct sentence.", options: ["He has been working here since three years.", "He has been working here for three years.", "He works here since three years.", "He worked here for three years now."], answer: "He has been working here for three years." },
        { id: "q-i1-7", question: "What is the comparative form of 'good'?", options: ["gooder", "more good", "better", "best"], answer: "better" },
        { id: "q-i1-8", question: "Complete: 'I ___ finished my report before the meeting started.'", options: ["have", "has", "had", "having"], answer: "had" },
      ],
    },
  },
  {
    id: "seed-quiz-intermediate-2",
    title: "Speed Quiz: Vocabulary & Structure",
    type: "QUIZ",
    difficulty: "INTERMEDIATE",
    data: {
      timePerQuestion: 12,
      items: [
        { id: "q-i2-1", question: "Choose the word closest in meaning to 'purchase'.", options: ["sell", "buy", "borrow", "return"], answer: "buy" },
        { id: "q-i2-2", question: "Complete: 'By the time she arrived, the movie ___.'", options: ["already started", "has already started", "had already started", "was starting"], answer: "had already started" },
        { id: "q-i2-3", question: "What is the correct passive form of 'They built the house in 1990'?", options: ["The house built in 1990.", "The house was built in 1990.", "The house has built in 1990.", "The house is building in 1990."], answer: "The house was built in 1990." },
        { id: "q-i2-4", question: "Choose the correct preposition: 'He apologized ___ being late.'", options: ["for", "of", "to", "with"], answer: "for" },
        { id: "q-i2-5", question: "What does 'impulsive' mean?", options: ["careful and slow", "done without thinking", "expensive", "boring"], answer: "done without thinking" },
        { id: "q-i2-6", question: "Complete: 'I wish I ___ more time to study.'", options: ["have", "had", "has", "having"], answer: "had" },
        { id: "q-i2-7", question: "Choose the correct sentence.", options: ["Neither of the answers were correct.", "Neither of the answers was correct.", "Neither of the answer was correct.", "Neither answers was correct."], answer: "Neither of the answers was correct." },
        { id: "q-i2-8", question: "What is a synonym for 'compelling'?", options: ["boring", "convincing", "confusing", "careless"], answer: "convincing" },
      ],
    },
  },
  {
    id: "seed-quiz-advanced-1",
    title: "Speed Quiz: Advanced Structures",
    type: "QUIZ",
    difficulty: "ADVANCED",
    data: {
      timePerQuestion: 10,
      items: [
        { id: "q-a1-1", question: "Choose the correct sentence.", options: ["Despite he was tired, he finished.", "Despite being tired, he finished.", "Despite of being tired, he finished.", "Despite tired, he finished."], answer: "Despite being tired, he finished." },
        { id: "q-a1-2", question: "Complete: 'If I had studied harder, I ___ the exam.'", options: ["would pass", "would have passed", "will pass", "passed"], answer: "would have passed" },
        { id: "q-a1-3", question: "What is the meaning of 'ubiquitous'?", options: ["rare", "present everywhere", "hidden", "expensive"], answer: "present everywhere" },
        { id: "q-a1-4", question: "Choose the correct sentence with inversion.", options: ["Rarely we see such talent.", "Rarely do we see such talent.", "Rarely we do see such talent.", "Rarely did we saw such talent."], answer: "Rarely do we see such talent." },
        { id: "q-a1-5", question: "What does 'meticulous' mean?", options: ["careless", "very careful and precise", "fast", "confident"], answer: "very careful and precise" },
        { id: "q-a1-6", question: "Complete: 'It is essential that he ___ present.'", options: ["is", "be", "was", "being"], answer: "be" },
        { id: "q-a1-7", question: "Choose the correct sentence.", options: ["The data suggest the theory is correct.", "The data suggests the theorys is correct.", "The datas suggest theory correct.", "The data suggesting theory is correct."], answer: "The data suggest the theory is correct." },
        { id: "q-a1-8", question: "What is a synonym for 'ambiguous'?", options: ["clear", "unclear", "certain", "obvious"], answer: "unclear" },
      ],
    },
  },
  {
    id: "seed-quiz-advanced-2",
    title: "Speed Quiz: Nuance & Formal English",
    type: "QUIZ",
    difficulty: "ADVANCED",
    data: {
      timePerQuestion: 10,
      items: [
        { id: "q-a2-1", question: "Choose the correct sentence.", options: ["Hardly we had sat down when the phone rang.", "Hardly had we sat down when the phone rang.", "Hardly we sat down when the phone rang.", "Hardly did we sat down when the phone rang."], answer: "Hardly had we sat down when the phone rang." },
        { id: "q-a2-2", question: "What does 'meticulous attention to detail' suggest about a person?", options: ["They are careless", "They are very thorough", "They are impatient", "They are indecisive"], answer: "They are very thorough" },
        { id: "q-a2-3", question: "Complete: 'If she had heeded the warning, she ___ in trouble now.'", options: ["wouldn't be", "wouldn't have been", "won't be", "isn't"], answer: "wouldn't be" },
        { id: "q-a2-4", question: "Choose the correct sentence.", options: ["The committee is responsible of the budget.", "The committee is responsible for the budget.", "The committee is responsible to the budget.", "The committee is responsible with the budget."], answer: "The committee is responsible for the budget." },
        { id: "q-a2-5", question: "What is the meaning of 'unprecedented'?", options: ["never done before", "very common", "expected", "illegal"], answer: "never done before" },
        { id: "q-a2-6", question: "Complete: 'The report, ___ was released yesterday, sparked debate.'", options: ["who", "which", "whose", "what"], answer: "which" },
        { id: "q-a2-7", question: "Choose the correct sentence.", options: ["Neither the manager nor the employees was informed.", "Neither the manager nor the employees were informed.", "Neither the manager or the employees were informed.", "Neither manager nor employees was informed."], answer: "Neither the manager nor the employees were informed." },
        { id: "q-a2-8", question: "What does 'to mitigate' mean?", options: ["to make worse", "to reduce the severity of something", "to ignore", "to celebrate"], answer: "to reduce the severity of something" },
      ],
    },
  },
];

// ==================== CONVERSATION ====================
// Exactly 10 scenarios, one per PRD scenario.

const conversationExercises: SeedExercise[] = [
  {
    id: "seed-conversation-restaurant",
    title: "Conversation: Ordering at a Restaurant",
    type: "CONVERSATION",
    difficulty: "BEGINNER",
    data: {
      scenario: {
        key: "restaurant",
        title: "Ordering at a Restaurant",
        emoji: "🍽️",
        description: "Practice ordering food, asking about the menu, and paying the bill at a restaurant.",
        aiRole: "a friendly waiter or waitress at a casual restaurant",
        userRole: "a customer ordering a meal",
        opening: "Good evening! Welcome to Olive Garden Café. Here's the menu — can I start you off with something to drink?",
        objectives: ["Order a drink and a main dish", "Ask a question about the menu", "Ask for the bill at the end"],
        fallbackReplies: [
          "Great choice! Would you like anything else with that?",
          "Sure, that comes with a side salad or fries — which would you prefer?",
          "No problem, I'll bring that right out for you.",
          "Of course! I'll get you the bill right away.",
        ],
      },
    },
  },
  {
    id: "seed-conversation-job-interview",
    title: "Conversation: Job Interview",
    type: "CONVERSATION",
    difficulty: "ADVANCED",
    data: {
      scenario: {
        key: "job-interview",
        title: "Job Interview",
        emoji: "💼",
        description: "Practice answering common job interview questions with confidence and professionalism.",
        aiRole: "a hiring manager interviewing candidates for a marketing position",
        userRole: "a candidate being interviewed for the job",
        opening: "Thanks for coming in today. To start, could you tell me a little about yourself and your experience?",
        objectives: [
          "Describe your background and experience",
          "Explain why you want this job",
          "Ask the interviewer a question about the role",
        ],
        fallbackReplies: [
          "That's great to hear. Can you tell me about a challenge you faced at work and how you handled it?",
          "Interesting — what would you say is your greatest strength?",
          "I see. Where do you see yourself in five years?",
          "Thank you for sharing that. Do you have any questions for me about the position?",
        ],
      },
    },
  },
  {
    id: "seed-conversation-doctor",
    title: "Conversation: At the Doctor's Office",
    type: "CONVERSATION",
    difficulty: "INTERMEDIATE",
    data: {
      scenario: {
        key: "doctor",
        title: "At the Doctor's Office",
        emoji: "🩺",
        description: "Practice describing symptoms and understanding medical advice during a doctor's visit.",
        aiRole: "a general practitioner doctor examining a patient",
        userRole: "a patient describing symptoms",
        opening: "Hello, please have a seat. What brings you in today?",
        objectives: [
          "Describe your symptoms clearly",
          "Answer questions about how long you've felt this way",
          "Ask what you should do next",
        ],
        fallbackReplies: [
          "I see. How long have you been feeling this way?",
          "Okay, and have you taken any medicine for it already?",
          "That's helpful to know. I'd recommend getting some rest and drinking plenty of water.",
          "Let's do a quick check — do you have a fever or any pain elsewhere?",
        ],
      },
    },
  },
  {
    id: "seed-conversation-shopping",
    title: "Conversation: Shopping for Clothes",
    type: "CONVERSATION",
    difficulty: "BEGINNER",
    data: {
      scenario: {
        key: "shopping",
        title: "Shopping for Clothes",
        emoji: "🛍️",
        description: "Practice asking about sizes, prices, and trying on clothes in a clothing store.",
        aiRole: "a helpful shop assistant in a clothing store",
        userRole: "a customer shopping for clothes",
        opening: "Hi there! Welcome in — are you looking for anything in particular today?",
        objectives: [
          "Ask if an item comes in your size",
          "Ask about the price of an item",
          "Ask to try something on",
        ],
        fallbackReplies: [
          "Sure, let me check if we have that in your size.",
          "That one is on sale today — it's twenty percent off!",
          "Of course, the fitting rooms are right over there.",
          "Would you like me to find a different color for you?",
        ],
      },
    },
  },
  {
    id: "seed-conversation-directions",
    title: "Conversation: Asking for Directions",
    type: "CONVERSATION",
    difficulty: "BEGINNER",
    data: {
      scenario: {
        key: "directions",
        title: "Asking for Directions",
        emoji: "🗺️",
        description: "Practice asking for and understanding directions to a location in an unfamiliar city.",
        aiRole: "a friendly local giving directions to a tourist",
        userRole: "a tourist who is lost and needs directions",
        opening: "Hi! You look a little lost — can I help you find something?",
        objectives: [
          "Ask how to get to a specific place",
          "Ask how long it will take to walk there",
          "Confirm you understood the directions",
        ],
        fallbackReplies: [
          "Sure! Just go straight for two blocks, then turn left at the traffic light.",
          "It's about a ten-minute walk from here.",
          "You can't miss it — it's right next to the big blue building.",
          "No problem, just ask again if you get lost!",
        ],
      },
    },
  },
  {
    id: "seed-conversation-airport",
    title: "Conversation: At the Airport",
    type: "CONVERSATION",
    difficulty: "INTERMEDIATE",
    data: {
      scenario: {
        key: "airport",
        title: "At the Airport",
        emoji: "✈️",
        description: "Practice checking in, going through security, and finding your gate at the airport.",
        aiRole: "an airline check-in agent at the airport counter",
        userRole: "a passenger checking in for an international flight",
        opening: "Good morning! May I see your passport and booking confirmation, please?",
        objectives: [
          "Check in for your flight and answer baggage questions",
          "Ask which gate your flight departs from",
          "Ask about the boarding time",
        ],
        fallbackReplies: [
          "Thank you. Will you be checking any bags today?",
          "Your flight departs from gate 22 — boarding starts in forty-five minutes.",
          "Here's your boarding pass. Please head to security next.",
          "Have a safe flight! Let me know if you have any other questions.",
        ],
      },
    },
  },
  {
    id: "seed-conversation-hotel",
    title: "Conversation: Checking Into a Hotel",
    type: "CONVERSATION",
    difficulty: "INTERMEDIATE",
    data: {
      scenario: {
        key: "hotel",
        title: "Checking Into a Hotel",
        emoji: "🏨",
        description: "Practice checking into a hotel, asking about amenities, and requesting services.",
        aiRole: "a hotel receptionist at the front desk",
        userRole: "a guest checking into the hotel",
        opening: "Welcome to Cedar Hotel! Do you have a reservation with us?",
        objectives: [
          "Check in and confirm your reservation details",
          "Ask about hotel amenities like breakfast or Wi-Fi",
          "Ask for a wake-up call or late checkout",
        ],
        fallbackReplies: [
          "Let me pull up your reservation — could I have your last name, please?",
          "Breakfast is served from seven to ten in the morning on the second floor.",
          "The Wi-Fi password is on the card in your room key folder.",
          "Of course, I can arrange a wake-up call for you — what time would you like?",
        ],
      },
    },
  },
  {
    id: "seed-conversation-phone-call",
    title: "Conversation: Making a Phone Call",
    type: "CONVERSATION",
    difficulty: "INTERMEDIATE",
    data: {
      scenario: {
        key: "phone-call",
        title: "Making a Phone Call",
        emoji: "📞",
        description: "Practice making a phone call to schedule or reschedule an appointment.",
        aiRole: "a receptionist at a dental clinic answering the phone",
        userRole: "a caller trying to book an appointment",
        opening: "Hello, thank you for calling Bright Smile Dental Clinic. How can I help you today?",
        objectives: [
          "Explain the reason for your call",
          "Agree on a date and time for the appointment",
          "Confirm the appointment details before hanging up",
        ],
        fallbackReplies: [
          "Sure, let me check the doctor's schedule for you.",
          "We have an opening on Thursday at eleven a.m. — does that work for you?",
          "Great, I've booked that appointment for you.",
          "Is there anything else I can help you with today?",
        ],
      },
    },
  },
  {
    id: "seed-conversation-business-meeting",
    title: "Conversation: Leading a Business Meeting",
    type: "CONVERSATION",
    difficulty: "ADVANCED",
    data: {
      scenario: {
        key: "business-meeting",
        title: "Leading a Business Meeting",
        emoji: "📊",
        description: "Practice leading a professional meeting, presenting updates, and responding to questions.",
        aiRole: "a colleague attending your project update meeting",
        userRole: "a team lead presenting a project status update",
        opening: "Thanks for organizing this meeting. Whenever you're ready, go ahead and walk us through the project status.",
        objectives: [
          "Summarize the current project status",
          "Address a concern or risk in the project",
          "Propose next steps and assign action items",
        ],
        fallbackReplies: [
          "That's a good update. What's the biggest risk to the timeline right now?",
          "Understood. How can the rest of the team support you on that?",
          "Makes sense — what do you need from us before the next milestone?",
          "Thanks for the clear summary. Let's follow up on this next week.",
        ],
      },
    },
  },
  {
    id: "seed-conversation-free-talk",
    title: "Conversation: Free Talk",
    type: "CONVERSATION",
    difficulty: "INTERMEDIATE",
    data: {
      scenario: {
        key: "free-talk",
        title: "Free Conversation",
        emoji: "💬",
        description:
          "An open-ended conversation practice on any topic you'd like to discuss — hobbies, news, plans, or anything on your mind.",
        aiRole: "a friendly conversation partner interested in getting to know you",
        userRole: "yourself, chatting casually about any topic",
        opening: "Hi! It's great to chat with you. What have you been up to lately?",
        objectives: [
          "Share something about your day or week",
          "Ask your conversation partner a question",
          "Keep the conversation going for at least a few exchanges",
        ],
        fallbackReplies: [
          "That sounds interesting! Tell me more about that.",
          "I see — how did that make you feel?",
          "That's a great point. What do you think about it now?",
          "Nice! What are you planning to do next?",
        ],
      },
    },
  },
];

// ==================== PICTURE ====================

const pictureExercises: SeedExercise[] = [
  {
    id: "seed-picture-beginner",
    title: "Picture Description: A Day at the Beach",
    type: "PICTURE",
    difficulty: "BEGINNER",
    data: {
      scene: {
        emojis: "☀️🏖️👨‍👩‍👧‍👦🏐🍉",
        title: "A Day at the Beach",
        description:
          "A family is spending a sunny day at the beach. The parents and their child are playing volleyball together near the water, and there is a fresh watermelon waiting for them to eat afterward.",
        hints: ["Who is at the beach?", "What are they doing?", "What food do you see?"],
        minWords: 20,
      },
    },
  },
  {
    id: "seed-picture-intermediate",
    title: "Picture Description: Running Late in the Rain",
    type: "PICTURE",
    difficulty: "INTERMEDIATE",
    data: {
      scene: {
        emojis: "🌧️🚌🏃‍♂️💼⏰",
        title: "Running Late in the Rain",
        description:
          "It is raining heavily and a businessman is running to catch the bus because he is late for work. He is holding his briefcase tightly and glancing at his watch, worried about the time.",
        hints: ["What is the weather like?", "Why is the man running?", "How do you think he feels?"],
        minWords: 40,
      },
    },
  },
  {
    id: "seed-picture-advanced",
    title: "Picture Description: A Turning Point for the Company",
    type: "PICTURE",
    difficulty: "ADVANCED",
    data: {
      scene: {
        emojis: "🏙️🌆📉💹🤝",
        title: "A Turning Point for the Company",
        description:
          "In a city skyline at dusk, two business partners are shaking hands after negotiating a deal that reversed their company's declining stock performance, turning a period of financial decline into a moment of renewed growth and partnership.",
        hints: [
          "What kind of deal is being made?",
          "How did the company's situation change?",
          "What does the handshake represent?",
        ],
        minWords: 60,
      },
    },
  },
];

// ==================== STORY ====================

const storyExercises: SeedExercise[] = [
  {
    id: "seed-story-beginner",
    title: "Story Time: The Lost Key",
    type: "STORY",
    difficulty: "BEGINNER",
    data: {
      story: {
        title: "The Lost Key",
        genre: "mystery",
        opening:
          "Sara couldn't find her house key anywhere. She looked in her bag, on the table, and under the sofa. Then she noticed the front door was already open.",
        minTurns: 4,
      },
    },
  },
  {
    id: "seed-story-intermediate",
    title: "Story Time: The Unexpected Message",
    type: "STORY",
    difficulty: "INTERMEDIATE",
    data: {
      story: {
        title: "The Unexpected Message",
        genre: "drama",
        opening:
          "Omar's phone buzzed with a message from a number he didn't recognize. It simply said, 'Meet me at the old café at midnight — it's about your father.' His hands trembled as he read it again.",
        minTurns: 5,
      },
    },
  },
  {
    id: "seed-story-advanced",
    title: "Story Time: The Last Transmission",
    type: "STORY",
    difficulty: "ADVANCED",
    data: {
      story: {
        title: "The Last Transmission",
        genre: "science fiction",
        opening:
          "Captain Reyes stared at the flickering console as the ship's systems failed one by one. A single message crackled through the static from a source that shouldn't exist — a signal from a planet no human had ever reached. She reached for the comm switch, her heart pounding.",
        minTurns: 6,
      },
    },
  },
];

const allExercises: SeedExercise[] = [
  ...grammarExercises,
  ...vocabularyExercises,
  ...translationExercises,
  ...listeningExercises,
  ...quizExercises,
  ...conversationExercises,
  ...pictureExercises,
  ...storyExercises,
];

async function main() {
  // Wait up to 10s for a busy DB lock instead of failing instantly: on
  // redeploy the app may briefly hold a write lock while this seed runs.
  try {
    await db.$executeRawUnsafe("PRAGMA busy_timeout = 10000");
  } catch {
    // Non-fatal — the pragma is best-effort lock patience.
  }

  await db.user.upsert({
    where: { id: SYSTEM_TEACHER_ID },
    create: {
      id: SYSTEM_TEACHER_ID,
      email: "system@speakpath.local",
      name: "SpeakPath Library",
      role: "TEACHER",
      emailVerified: true,
    },
    update: {
      email: "system@speakpath.local",
      name: "SpeakPath Library",
      role: "TEACHER",
      emailVerified: true,
    },
  });

  for (const ex of allExercises) {
    const points = ex.points ?? POINTS_BY_DIFFICULTY[ex.difficulty];
    const timeLimit = ex.timeLimit ?? null;
    const dataJson = JSON.stringify(ex.data);

    await db.exercise.upsert({
      where: { id: ex.id },
      create: {
        id: ex.id,
        title: ex.title,
        type: ex.type,
        difficulty: ex.difficulty,
        data: dataJson,
        timeLimit,
        points,
        createdById: SYSTEM_TEACHER_ID,
      },
      update: {
        title: ex.title,
        type: ex.type,
        difficulty: ex.difficulty,
        data: dataJson,
        timeLimit,
        points,
      },
    });
  }

  const counts = {
    GRAMMAR: grammarExercises.length,
    VOCABULARY: vocabularyExercises.length,
    TRANSLATION: translationExercises.length,
    LISTENING: listeningExercises.length,
    QUIZ: quizExercises.length,
    CONVERSATION: conversationExercises.length,
    PICTURE: pictureExercises.length,
    STORY: storyExercises.length,
  };

  return counts;
}

main()
  .then(async (counts) => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log("Seed complete.");
    console.log(`  System teacher: ${SYSTEM_TEACHER_ID}`);
    console.log(`  Exercises seeded: ${total}`);
    for (const [type, count] of Object.entries(counts)) {
      console.log(`    ${type}: ${count}`);
    }
    await db.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await db.$disconnect();
    process.exit(1);
  });
