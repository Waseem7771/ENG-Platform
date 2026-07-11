"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { api, ApiClientError } from "@/lib/api";
import { EXERCISE_TYPES, type ExerciseData, type ExerciseType, type Level } from "@/types";
import { EXERCISE_TYPE_META } from "@/components/teacher/badges";
import { LevelSelect } from "@/components/teacher/level-select";
import { Field, inputClass } from "./form-controls";
import { DEFAULT_POINTS } from "./utils";
import {
  conversationToPayload,
  grammarToPayload,
  listeningToPayload,
  newConversationDraft,
  newGrammarItem,
  newListeningItem,
  newPictureDraft,
  newQuizItem,
  newStoryDraft,
  newTranslationItem,
  newVocabularyPair,
  pictureToPayload,
  quizToPayload,
  storyToPayload,
  translationToPayload,
  validateConversation,
  validateGrammar,
  validateListening,
  validatePicture,
  validateQuiz,
  validateStory,
  validateTranslation,
  validateVocabulary,
  vocabularyToPayload,
  type ConversationDraft,
  type GrammarItemDraft,
  type ListeningItemDraft,
  type PictureDraft,
  type QuizItemDraft,
  type StoryDraft,
  type TranslationItemDraft,
  type VocabularyPairDraft,
} from "./types";
import { GrammarBuilder } from "./grammar-builder";
import { VocabularyBuilder } from "./vocabulary-builder";
import { TranslationBuilder } from "./translation-builder";
import { ListeningBuilder } from "./listening-builder";
import { QuizBuilder } from "./quiz-builder";
import { ConversationBuilder } from "./conversation-builder";
import { PictureBuilder } from "./picture-builder";
import { StoryBuilder } from "./story-builder";

export function ExerciseFormDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<string[][]>([]);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<ExerciseType>("GRAMMAR");
  const [difficulty, setDifficulty] = useState<Level>("BEGINNER");
  const [points, setPoints] = useState(DEFAULT_POINTS.BEGINNER);
  const [pointsTouched, setPointsTouched] = useState(false);
  const [timeLimit, setTimeLimit] = useState("");

  const [grammarItems, setGrammarItems] = useState<GrammarItemDraft[]>([newGrammarItem()]);
  const [vocabPairs, setVocabPairs] = useState<VocabularyPairDraft[]>([
    newVocabularyPair(),
    newVocabularyPair(),
    newVocabularyPair(),
    newVocabularyPair(),
  ]);
  const [translationItems, setTranslationItems] = useState<TranslationItemDraft[]>([newTranslationItem()]);
  const [listeningItems, setListeningItems] = useState<ListeningItemDraft[]>([newListeningItem()]);
  const [quizItems, setQuizItems] = useState<QuizItemDraft[]>([newQuizItem()]);
  const [timePerQuestion, setTimePerQuestion] = useState(20);
  const [conversation, setConversation] = useState<ConversationDraft>(newConversationDraft(""));
  const [picture, setPicture] = useState<PictureDraft>(newPictureDraft());
  const [story, setStory] = useState<StoryDraft>(newStoryDraft());

  useEffect(() => {
    if (!pointsTouched) setPoints(DEFAULT_POINTS[difficulty]);
  }, [difficulty, pointsTouched]);

  function reset() {
    setFormError(null);
    setItemErrors([]);
    setTitle("");
    setType("GRAMMAR");
    setDifficulty("BEGINNER");
    setPoints(DEFAULT_POINTS.BEGINNER);
    setPointsTouched(false);
    setTimeLimit("");
    setGrammarItems([newGrammarItem()]);
    setVocabPairs([newVocabularyPair(), newVocabularyPair(), newVocabularyPair(), newVocabularyPair()]);
    setTranslationItems([newTranslationItem()]);
    setListeningItems([newListeningItem()]);
    setQuizItems([newQuizItem()]);
    setTimePerQuestion(20);
    setConversation(newConversationDraft(""));
    setPicture(newPictureDraft());
    setStory(newStoryDraft());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setItemErrors([]);

    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!points || points < 1) {
      setFormError("Points must be at least 1.");
      return;
    }

    let data: ExerciseData | undefined;
    switch (type) {
      case "GRAMMAR": {
        const result = validateGrammar(grammarItems);
        if (result.formError) return fail(result.formError, result.itemErrors);
        data = grammarToPayload(grammarItems);
        break;
      }
      case "VOCABULARY": {
        const result = validateVocabulary(vocabPairs);
        if (result.formError) return fail(result.formError, result.itemErrors);
        data = vocabularyToPayload(vocabPairs);
        break;
      }
      case "TRANSLATION": {
        const result = validateTranslation(translationItems);
        if (result.formError) return fail(result.formError, result.itemErrors);
        data = translationToPayload(translationItems);
        break;
      }
      case "LISTENING": {
        const result = validateListening(listeningItems);
        if (result.formError) return fail(result.formError, result.itemErrors);
        data = listeningToPayload(listeningItems);
        break;
      }
      case "QUIZ": {
        const result = validateQuiz(quizItems, timePerQuestion);
        if (result.formError) return fail(result.formError, result.itemErrors);
        data = quizToPayload(quizItems, timePerQuestion);
        break;
      }
      case "CONVERSATION": {
        const result = validateConversation(conversation);
        if (result.formError) return fail(result.formError, result.itemErrors);
        data = conversationToPayload(conversation);
        break;
      }
      case "PICTURE": {
        const result = validatePicture(picture);
        if (result.formError) return fail(result.formError, result.itemErrors);
        data = pictureToPayload(picture);
        break;
      }
      case "STORY": {
        const result = validateStory(story);
        if (result.formError) return fail(result.formError, result.itemErrors);
        data = storyToPayload(story);
        break;
      }
      default:
        return;
    }
    if (!data) return;

    setSubmitting(true);
    try {
      await api<{ id: string }>("/api/exercises", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          type,
          difficulty,
          data,
          points,
          timeLimit: timeLimit ? Number(timeLimit) : undefined,
        }),
      });
      toast.success("Exercise created");
      onCreated();
      setOpen(false);
      reset();
    } catch (e) {
      setFormError(e instanceof ApiClientError ? e.message : "Couldn't create the exercise.");
    } finally {
      setSubmitting(false);
    }
  }

  function fail(message: string, errors: string[][]) {
    setFormError(message);
    setItemErrors(errors);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <button className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="h-4 w-4" />
            Create Exercise
          </button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto border border-border bg-popover text-foreground sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create exercise</DialogTitle>
          <DialogDescription className="text-muted-foreground">Build content students will practice with.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>}

          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Present Simple Practice" className={inputClass} />
          </Field>

          <Field label="Exercise type">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {EXERCISE_TYPES.map((t) => {
                const meta = EXERCISE_TYPE_META[t];
                const Icon = meta.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
                      type === t ? "border-primary/40 bg-secondary text-primary" : "border-border bg-muted text-muted-foreground hover:border-line-strong"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", type === t ? "text-primary" : meta.color)} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Difficulty" className="sm:col-span-2">
              <LevelSelect value={difficulty} onChange={setDifficulty} />
            </Field>
            <Field label="Points">
              <input
                type="number"
                min={1}
                value={points}
                onChange={(e) => {
                  setPoints(Number(e.target.value));
                  setPointsTouched(true);
                }}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Time limit (seconds)" hint="optional">
            <input
              type="number"
              min={1}
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              placeholder="No limit"
              className={inputClass}
            />
          </Field>

          <div className="border-t border-border pt-4">
            {type === "GRAMMAR" && <GrammarBuilder value={grammarItems} onChange={setGrammarItems} itemErrors={itemErrors} />}
            {type === "VOCABULARY" && <VocabularyBuilder value={vocabPairs} onChange={setVocabPairs} itemErrors={itemErrors} />}
            {type === "TRANSLATION" && <TranslationBuilder value={translationItems} onChange={setTranslationItems} itemErrors={itemErrors} />}
            {type === "LISTENING" && <ListeningBuilder value={listeningItems} onChange={setListeningItems} itemErrors={itemErrors} />}
            {type === "QUIZ" && (
              <QuizBuilder
                value={quizItems}
                timePerQuestion={timePerQuestion}
                onChangeItems={setQuizItems}
                onChangeTime={setTimePerQuestion}
                itemErrors={itemErrors}
              />
            )}
            {type === "CONVERSATION" && <ConversationBuilder value={conversation} onChange={setConversation} errors={itemErrors[0]} />}
            {type === "PICTURE" && <PictureBuilder value={picture} onChange={setPicture} errors={itemErrors[0]} />}
            {type === "STORY" && <StoryBuilder value={story} onChange={setStory} errors={itemErrors[0]} />}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save exercise
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
