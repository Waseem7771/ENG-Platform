import {
  BookOpen,
  BookMarked,
  Languages,
  Headphones,
  Zap,
  MessageSquare,
  Image as ImageIcon,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { EXERCISE_TYPES, type ExerciseType } from "@/types";

export { EXERCISE_TYPES };

/**
 * Centralized exercise type metadata. Superset of the fields used across the
 * four places this used to be defined independently:
 * - label: short display name (teacher filters/badges, student filters/cards)
 * - icon: Lucide component (teacher badges + form dialog type picker)
 * - color: text color class applied to the icon (teacher badges + form dialog)
 * - blurb: one-line description (student practice library cards; previously
 *   called "description" there)
 */
export const EXERCISE_TYPE_META: Record<
  ExerciseType,
  { label: string; icon: LucideIcon; color: string; blurb: string }
> = {
  GRAMMAR: {
    label: "Grammar",
    icon: BookOpen,
    color: "text-primary",
    blurb: "Fill-in-blank, reordering, error correction",
  },
  VOCABULARY: {
    label: "Vocabulary",
    icon: BookMarked,
    color: "text-primary",
    blurb: "Match words to their meanings",
  },
  TRANSLATION: {
    label: "Translation",
    icon: Languages,
    color: "text-leaf-text",
    blurb: "Translate between Arabic and English",
  },
  LISTENING: {
    label: "Listening",
    icon: Headphones,
    color: "text-leaf-text",
    blurb: "Listen and answer comprehension questions",
  },
  QUIZ: {
    label: "Speed Quiz",
    icon: Zap,
    color: "text-sun-deep",
    blurb: "Timed multiple choice questions",
  },
  CONVERSATION: {
    label: "AI Conversation",
    icon: MessageSquare,
    color: "text-primary",
    blurb: "Practice real scenarios with AI",
  },
  PICTURE: {
    label: "Picture",
    icon: ImageIcon,
    color: "text-sun-deep",
    blurb: "Describe scenes in English",
  },
  STORY: {
    label: "Story",
    icon: ScrollText,
    color: "text-leaf-text",
    blurb: "Build stories collaboratively with AI",
  },
};
