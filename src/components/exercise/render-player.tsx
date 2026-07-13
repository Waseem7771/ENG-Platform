import type { ReactNode } from "react";
import { GrammarPlayer } from "@/components/exercise/grammar-player";
import { VocabMatch } from "@/components/exercise/vocab-match";
import { TranslationPlayer } from "@/components/exercise/translation-player";
import { ListeningPlayer } from "@/components/exercise/listening-player";
import { SpeedQuiz } from "@/components/exercise/speed-quiz";
import { ConversationChat } from "@/components/exercise/conversation-chat";
import { PicturePlayer } from "@/components/exercise/picture-player";
import { StoryPlayer } from "@/components/exercise/story-player";
import type { ExerciseFull } from "@/app/(dashboard)/student/_types";
import type {
  ConversationData,
  GrammarData,
  ListeningData,
  PictureData,
  QuizData,
  StoryData,
  TranslationData,
  VocabularyData,
} from "@/types";

/**
 * Maps an ExerciseFull to its self-contained player with the uniform player
 * props. Shared by the full-page exercise player screen and the in-room
 * EmbeddedExercise so a pushed exercise renders identically in both places.
 */
export function renderPlayer(
  exercise: ExerciseFull,
  onSubmit: (payload: unknown) => void,
  submitting: boolean,
  registerForceSubmit: (fn: () => void) => void
): ReactNode {
  const summary = { id: exercise.id, title: exercise.title, type: exercise.type, difficulty: exercise.difficulty, points: exercise.points, timeLimit: exercise.timeLimit };
  switch (exercise.type) {
    case "GRAMMAR":
      return <GrammarPlayer exercise={summary} data={exercise.data as GrammarData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />;
    case "VOCABULARY":
      return <VocabMatch exercise={summary} data={exercise.data as VocabularyData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />;
    case "TRANSLATION":
      return <TranslationPlayer exercise={summary} data={exercise.data as TranslationData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />;
    case "LISTENING":
      return <ListeningPlayer exercise={summary} data={exercise.data as ListeningData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />;
    case "QUIZ":
      return <SpeedQuiz exercise={summary} data={exercise.data as QuizData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />;
    case "CONVERSATION":
      return (
        <div className="h-[70vh]">
          <ConversationChat exercise={summary} data={exercise.data as ConversationData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />
        </div>
      );
    case "PICTURE":
      return <PicturePlayer exercise={summary} data={exercise.data as PictureData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />;
    case "STORY":
      return (
        <div className="h-[70vh]">
          <StoryPlayer exercise={summary} data={exercise.data as StoryData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />
        </div>
      );
    default:
      return <p className="text-muted-foreground">This exercise type isn&apos;t supported yet.</p>;
  }
}
