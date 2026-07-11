import type { PrismaClient } from "../src/generated/prisma/client";

const SYSTEM_TEACHER_ID = "seed-system-teacher";
type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

type LessonDef = {
  order: number;
  title: string;
  isCheckpoint?: boolean;
  exerciseIds: string[];
};
type UnitDef = { unit: number; lessons: LessonDef[] };

function level(l: string): Level {
  return l as Level;
}

// Difficulty mapping cross-checked against the actual CONVERSATION exercises
// in prisma/seed.ts: restaurant/shopping/directions = BEGINNER,
// doctor/airport/hotel/phone-call/free-talk = INTERMEDIATE,
// job-interview/business-meeting = ADVANCED.
const CONV: Record<Level, [string, string]> = {
  BEGINNER: ["seed-conversation-restaurant", "seed-conversation-shopping"],
  INTERMEDIATE: ["seed-conversation-doctor", "seed-conversation-airport"],
  ADVANCED: ["seed-conversation-job-interview", "seed-conversation-business-meeting"],
};

export function unitsFor(lvl: Level): UnitDef[] {
  const s = lvl.toLowerCase();
  return [
    {
      unit: 1,
      lessons: [
        { order: 1, title: "Grammar basics", exerciseIds: [`seed-grammar-${s}-1`, `seed-grammar-${s}-2`] },
        { order: 2, title: "Word power", exerciseIds: [`seed-vocabulary-${s}-1`, `seed-vocabulary-${s}-2`] },
        { order: 3, title: "Real conversations", exerciseIds: [...CONV[lvl]] },
        { order: 4, title: "Unit 1 Checkpoint", isCheckpoint: true, exerciseIds: [`seed-quiz-${s}-1`] },
      ],
    },
    {
      unit: 2,
      lessons: [
        { order: 1, title: "Translation lab", exerciseIds: [`seed-translation-${s}-1`, `seed-translation-${s}-2`] },
        { order: 2, title: "Listen closely", exerciseIds: [`seed-listening-${s}-1`, `seed-listening-${s}-2`] },
        { order: 3, title: "Express yourself", exerciseIds: [`seed-picture-${s}`, `seed-story-${s}`] },
        { order: 4, title: "Unit 2 Checkpoint", isCheckpoint: true, exerciseIds: [`seed-quiz-${s}-2`] },
      ],
    },
  ];
}

export const CURRICULUM: Record<Level, UnitDef[]> = {
  BEGINNER: unitsFor(level("BEGINNER")),
  INTERMEDIATE: unitsFor(level("INTERMEDIATE")),
  ADVANCED: unitsFor(level("ADVANCED")),
};

export async function seedCurriculum(db: PrismaClient): Promise<void> {
  for (const [lvl, units] of Object.entries(CURRICULUM)) {
    for (const u of units) {
      for (const l of u.lessons) {
        const id = `seed-path-${lvl.toLowerCase()}-u${u.unit}-l${l.order}`;
        await db.lesson.upsert({
          where: { id },
          create: {
            id,
            classId: null,
            createdById: SYSTEM_TEACHER_ID,
            title: l.title,
            level: lvl,
            unit: u.unit,
            order: l.order,
            isCheckpoint: l.isCheckpoint ?? false,
          },
          update: {
            title: l.title,
            level: lvl,
            unit: u.unit,
            order: l.order,
            isCheckpoint: l.isCheckpoint ?? false,
          },
        });
        for (const exId of l.exerciseIds) {
          await db.exercise
            .update({ where: { id: exId }, data: { lessonId: id } })
            .catch(() => {
              throw new Error(`curriculum references missing exercise id: ${exId}`);
            });
        }
      }
    }
  }
}
