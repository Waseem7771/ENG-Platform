"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, ApiClientError } from "@/lib/api";
import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { EXERCISE_TYPE_META, EXERCISE_TYPES } from "@/lib/exercise-meta";
import { LevelSelect } from "@/components/teacher/level-select";
import { Field, inputClass } from "./form-controls";
import { DEFAULT_POINTS } from "./utils";
import { consumeFormBridge, writeFormBridge, type ExerciseFormBridgeState } from "./form-bridge";
import {
  conversationToPayload,
  dataToDraft,
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
  type ExerciseDraftForType,
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
import type { ExerciseData, ExerciseStatus, ExerciseType, Level } from "@/types";

/** Debounce window after the last edit before autosave persists a draft. */
const AUTOSAVE_DELAY_MS = 1200;

interface ExerciseEditResponse {
  id: string;
  title: string;
  type: ExerciseType;
  difficulty: Level;
  data: ExerciseData;
  points: number;
  timeLimit: number | null;
  status: ExerciseStatus;
}

interface ExercisePersistResponse {
  id: string;
  status: ExerciseStatus;
}

interface ComputeDataResult {
  data?: ExerciseData;
  formError?: string;
  itemErrors?: string[][];
}

/**
 * Coordinates the very first "create" persist() call against any concurrent one that starts
 * while it's in flight — e.g. an explicit Save draft/Publish click firing while the first
 * autosave POST hasn't resolved yet. Both calls would otherwise take the same POST branch
 * (neither has a saved id yet) and create two exercise rows.
 *
 * If `lockRef` is empty, starts `create()`, publishes a never-throwing copy of it on `lockRef`
 * (cleared once the request settles, success or failure) for any concurrent caller to piggyback
 * on, and returns `{ started: true, request }` where `request` is the ORIGINAL (throwing)
 * promise — so the call that actually started it keeps its normal error handling. If `lockRef`
 * is already populated, returns `{ started: false, request: lockRef.current }`, a promise that
 * resolves to `null` instead of throwing — a failed create belongs to whichever call started
 * it, not to a piggybacking one.
 *
 * Pure and React-free by design so the de-dup logic is unit-testable without rendering the form.
 */
export function joinOrStartCreate<T>(
  lockRef: { current: Promise<T | null> | null },
  create: () => Promise<T>
): { started: true; request: Promise<T> } | { started: false; request: Promise<T | null> } {
  if (lockRef.current) {
    return { started: false, request: lockRef.current };
  }
  const request = create();
  lockRef.current = request.then(
    (result): T | null => result,
    (): T | null => null
  );
  const clearLock = () => {
    lockRef.current = null;
  };
  request.then(clearLock, clearLock);
  return { started: true, request };
}

export function ExerciseForm({
  exerciseId,
  onSaved,
}: {
  exerciseId?: string;
  onSaved?: (id: string) => void;
}) {
  const t = useT();

  const [loading, setLoading] = useState(Boolean(exerciseId));
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [status, setStatus] = useState<ExerciseStatus>("DRAFT");

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

  const [aiTopic, setAiTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // The id of the persisted row once one exists — either the loaded exerciseId or the id
  // captured from autosave/save's first POST. A ref (not just state) so the debounced
  // autosave closure always sees the latest value without re-subscribing.
  const savedIdRef = useRef<string | null>(exerciseId ?? null);
  const typeLocked = Boolean(exerciseId);

  // Suppresses exactly one autosave pass: the one triggered by the initial data load
  // populating form state. Cleared after that first pass so real edits autosave normally.
  const skipAutosaveRef = useRef(Boolean(exerciseId));

  // Monotonic counter bumped at the start of every persist() call. Lets a save discard its
  // own response if a *newer* save started (and possibly finished) while it was in flight —
  // closes the race where a stale autosave PATCH resolves after an explicit Publish/Save-draft
  // PATCH and would otherwise clobber the just-saved title/data/points/timeLimit with its
  // older snapshot.
  const saveSeqRef = useRef(0);
  // The pending debounce timer for autosave, if one is currently scheduled. Exposed via ref
  // (not just the effect-local variable) so persist() can cancel a queued-but-not-yet-fired
  // autosave the instant an explicit save starts — otherwise it could fire moments after a
  // Publish and re-open the same race.
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guards the very first (creating) POST: set the instant that request starts, cleared once
  // it settles. A concurrent persist() call (e.g. Save draft/Publish firing while the first
  // autosave POST is still in flight) awaits this SAME create instead of issuing a second POST
  // — see joinOrStartCreate above and persist()'s create branch below.
  const creatingRef = useRef<Promise<ExercisePersistResponse | null> | null>(null);

  // Mirrors the form's full editable state on every render (not inside an effect, so it is
  // always current). persist() reads this synchronously right after capturing a brand-new id
  // so the very first save can snapshot whatever was typed during that POST's network
  // round-trip to the bridge — the keystroke-triggered bridge-write effect further below can't
  // have written it yet at that point (its guard requires savedIdRef to already be set, and a
  // ref mutation alone doesn't re-run effects).
  const latestBridgeSnapshotRef = useRef<ExerciseFormBridgeState>({
    title,
    difficulty,
    points,
    timeLimit,
    draft: currentDraftForBridge(),
  });
  latestBridgeSnapshotRef.current = {
    title,
    difficulty,
    points,
    timeLimit,
    draft: currentDraftForBridge(),
  };

  useEffect(() => {
    if (!pointsTouched) setPoints(DEFAULT_POINTS[difficulty]);
  }, [difficulty, pointsTouched]);

  // Load the existing exercise (unredacted owner view) when editing.
  useEffect(() => {
    if (!exerciseId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    api<ExerciseEditResponse>(`/api/exercises/${exerciseId}?edit=1`)
      .then((ex) => {
        if (cancelled) return;
        // A bridged draft (written by a previous mount of this form under the same id — most
        // commonly the /new instance, right before onSaved's router.replace remounted us here)
        // reflects the teacher's latest local typing, which is always fresher than this GET's
        // snapshot — so it wins over the server response when present. Consumed exactly once:
        // reading it also deletes the sessionStorage entry.
        const bridged = consumeFormBridge(exerciseId);
        if (bridged) {
          setTitle(bridged.title);
          setType(bridged.draft.type);
          setDifficulty(bridged.difficulty);
          setPoints(bridged.points);
          setPointsTouched(true);
          setTimeLimit(bridged.timeLimit);
          setStatus(ex.status);
          applyDraftUnion(bridged.draft);
        } else {
          setTitle(ex.title);
          setType(ex.type);
          setDifficulty(ex.difficulty);
          setPoints(ex.points);
          setPointsTouched(true);
          setTimeLimit(ex.timeLimit ? String(ex.timeLimit) : "");
          setStatus(ex.status);
          applyDraft(ex.type, ex.data);
        }
        savedIdRef.current = ex.id;
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof ApiClientError ? e.message : t("teacher.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId]);

  /** Applies an already-tagged draft union into the matching builder's state only. */
  function applyDraftUnion(draft: ExerciseDraftForType) {
    switch (draft.type) {
      case "GRAMMAR":
        setGrammarItems(draft.value);
        break;
      case "VOCABULARY":
        setVocabPairs(draft.value);
        break;
      case "TRANSLATION":
        setTranslationItems(draft.value);
        break;
      case "LISTENING":
        setListeningItems(draft.value);
        break;
      case "QUIZ":
        setQuizItems(draft.value.items);
        setTimePerQuestion(draft.value.timePerQuestion);
        break;
      case "CONVERSATION":
        setConversation(draft.value);
        break;
      case "PICTURE":
        setPicture(draft.value);
        break;
      case "STORY":
        setStory(draft.value);
        break;
    }
  }

  /** Applies a data blob (loaded or AI-generated) into the matching builder's state only. */
  function applyDraft(draftType: ExerciseType, data: ExerciseData) {
    applyDraftUnion(dataToDraft(draftType, data));
  }

  /** Snapshots the active builder's live draft state — the inverse of applyDraftUnion — for mirroring to the sessionStorage bridge (see form-bridge.ts). */
  function currentDraftForBridge(): ExerciseDraftForType {
    switch (type) {
      case "GRAMMAR":
        return { type, value: grammarItems };
      case "VOCABULARY":
        return { type, value: vocabPairs };
      case "TRANSLATION":
        return { type, value: translationItems };
      case "LISTENING":
        return { type, value: listeningItems };
      case "QUIZ":
        return { type, value: { items: quizItems, timePerQuestion } };
      case "CONVERSATION":
        return { type, value: conversation };
      case "PICTURE":
        return { type, value: picture };
      case "STORY":
        return { type, value: story };
    }
  }

  /** Runs the active builder's validate + toPayload pair — identical logic to the dialog's handleSubmit. */
  function computeData(): ComputeDataResult {
    switch (type) {
      case "GRAMMAR": {
        const result = validateGrammar(grammarItems);
        if (result.formError) return { formError: result.formError, itemErrors: result.itemErrors };
        return { data: grammarToPayload(grammarItems) };
      }
      case "VOCABULARY": {
        const result = validateVocabulary(vocabPairs);
        if (result.formError) return { formError: result.formError, itemErrors: result.itemErrors };
        return { data: vocabularyToPayload(vocabPairs) };
      }
      case "TRANSLATION": {
        const result = validateTranslation(translationItems);
        if (result.formError) return { formError: result.formError, itemErrors: result.itemErrors };
        return { data: translationToPayload(translationItems) };
      }
      case "LISTENING": {
        const result = validateListening(listeningItems);
        if (result.formError) return { formError: result.formError, itemErrors: result.itemErrors };
        return { data: listeningToPayload(listeningItems) };
      }
      case "QUIZ": {
        const result = validateQuiz(quizItems, timePerQuestion);
        if (result.formError) return { formError: result.formError, itemErrors: result.itemErrors };
        return { data: quizToPayload(quizItems, timePerQuestion) };
      }
      case "CONVERSATION": {
        const result = validateConversation(conversation);
        if (result.formError) return { formError: result.formError, itemErrors: result.itemErrors };
        return { data: conversationToPayload(conversation) };
      }
      case "PICTURE": {
        const result = validatePicture(picture);
        if (result.formError) return { formError: result.formError, itemErrors: result.itemErrors };
        return { data: pictureToPayload(picture) };
      }
      case "STORY": {
        const result = validateStory(story);
        if (result.formError) return { formError: result.formError, itemErrors: result.itemErrors };
        return { data: storyToPayload(story) };
      }
    }
  }

  /**
   * POST-then-PATCH persistence. `explicitStatus` is only sent for the deliberate
   * Save-draft/Publish actions; autosave omits it so a routine content edit never
   * flips an already-PUBLISHED exercise back to DRAFT behind the teacher's back.
   * The very first successful save (POST) captures the new id and calls onSaved —
   * every later save (autosave or explicit) PATCHes that same id.
   *
   * Save-sequence guard: every call bumps `saveSeqRef` and cancels any pending (not yet
   * fired) autosave timer before its own fetch goes out. After the await resolves, this
   * call's `seq` is compared against `saveSeqRef.current` — if a newer persist() started
   * in the meantime, this response is stale and is discarded (returns null) instead of
   * applying its (possibly older) snapshot over whatever the newer save already wrote.
   * In the normal, non-racing case `seq` always still matches, so behavior is unchanged:
   * state updates + the POST branch's onSaved fire exactly once.
   *
   * Create-race guard: before the id exists, a concurrent persist() call (e.g. autosave's POST
   * still in flight when Save draft/Publish is clicked) would otherwise take this same POST
   * branch and create a second row. joinOrStartCreate (see above) serializes that: only the
   * first caller issues the POST, everyone else awaits and then PATCHes the resulting id.
   */
  async function persist(data: ExerciseData, explicitStatus?: ExerciseStatus): Promise<ExercisePersistResponse | null> {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    const seq = ++saveSeqRef.current;

    const body: Record<string, unknown> = {
      title: title.trim(),
      difficulty,
      data,
      points,
      timeLimit: timeLimit ? Number(timeLimit) : null,
    };
    if (explicitStatus) body.status = explicitStatus;

    if (savedIdRef.current) {
      const updated = await api<ExercisePersistResponse>(`/api/exercises/${savedIdRef.current}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (seq !== saveSeqRef.current) return null; // superseded — discard silently
      setStatus(updated.status);
      return updated;
    }

    // No id yet. joinOrStartCreate makes sure only ONE POST is ever issued for the first
    // create: if another persist() call already started it (e.g. autosave's POST is still in
    // flight when the teacher clicks Save draft/Publish), this call piggybacks on that SAME
    // request instead of racing a second one — without this, both calls would see no saved id
    // and each create their own row.
    const createAttempt = joinOrStartCreate(creatingRef, () =>
      api<ExercisePersistResponse>("/api/exercises", {
        method: "POST",
        body: JSON.stringify({ ...body, type, status: explicitStatus ?? "DRAFT" }),
      })
    );

    if (!createAttempt.started) {
      const created = await createAttempt.request; // never throws — see joinOrStartCreate
      if (seq !== saveSeqRef.current) return null; // superseded — discard silently
      if (!created) return null; // the in-flight create failed elsewhere; nothing to attach to
      const updated = await api<ExercisePersistResponse>(`/api/exercises/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (seq !== saveSeqRef.current) return null; // superseded — discard silently
      setStatus(updated.status);
      return updated;
    }

    const created = await createAttempt.request; // rethrows to this call's own catch on failure
    // Capturing the id (and bridging/notifying about it) is a one-time, order-independent
    // event — NOT gated by the seq check below. A concurrent piggybacking call (see the branch
    // above) bumps saveSeqRef the instant it starts, typically well before this POST resolves,
    // so gating this on `seq === saveSeqRef.current` would routinely discard it in exactly the
    // race this lock exists for — leaving savedIdRef permanently null despite a row already
    // existing server-side, so a later call would see neither an id nor an in-flight create and
    // mint a second (duplicate) row, and onSaved (hence the /new -> /edit route replace) would
    // never fire. Only `status` below — which a genuinely newer save's data can legitimately
    // supersede — stays behind the guard.
    savedIdRef.current = created.id;
    // Snapshot right at id-capture: anything typed during this POST's network round-trip would
    // otherwise never reach the bridge (see latestBridgeSnapshotRef's comment above).
    writeFormBridge(created.id, latestBridgeSnapshotRef.current);
    onSaved?.(created.id);
    if (seq !== saveSeqRef.current) return null; // superseded — a newer save owns status/toast
    setStatus(created.status);
    return created;
  }

  // Autosave: debounce ~1.2s after any change to the serialized form, skip the pass
  // caused by the initial load, and only fire once there's a title to save under.
  useEffect(() => {
    if (loading) return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    if (!title.trim()) return;

    autosaveTimeoutRef.current = setTimeout(() => {
      autosaveTimeoutRef.current = null;
      const result = computeData();
      if (!result.data) return; // quietly wait for valid content — no error banner while typing
      setAutosaving(true);
      persist(result.data)
        .then((saved) => {
          if (saved) setLastSavedAt(Date.now()); // stale (superseded) response — leave state as-is
        })
        .catch(() => {
          /* silent — explicit Save draft/Publish surface errors; autosave just retries next change */
        })
        .finally(() => setAutosaving(false));
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loading,
    title,
    type,
    difficulty,
    points,
    timeLimit,
    grammarItems,
    vocabPairs,
    translationItems,
    listeningItems,
    quizItems,
    timePerQuestion,
    conversation,
    picture,
    story,
  ]);

  // Mirrors the full editable draft to sessionStorage on every change, once a row exists to key
  // it under — this is what lets a fresh ExerciseForm mount (e.g. the /edit instance after
  // onSaved/router.replace remounts across the /new -> /edit route segment) recover typing the
  // just-unmounted instance never got to autosave. Same field list as the autosave effect above;
  // unlike autosave this write is synchronous (no debounce) and never touches the network — see
  // form-bridge.ts. Skipped during the initial ?edit=1 load same as autosave, though for a
  // different reason: `loading` only goes false once state already reflects the server (or a
  // just-consumed bridge), so there is nothing new to mirror yet.
  useEffect(() => {
    if (loading) return;
    if (!savedIdRef.current) return;
    writeFormBridge(savedIdRef.current, {
      title,
      difficulty,
      points,
      timeLimit,
      draft: currentDraftForBridge(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loading,
    title,
    type,
    difficulty,
    points,
    timeLimit,
    grammarItems,
    vocabPairs,
    translationItems,
    listeningItems,
    quizItems,
    timePerQuestion,
    conversation,
    picture,
    story,
  ]);

  function fail(message: string, errors: string[][]) {
    setFormError(message);
    setItemErrors(errors);
  }

  function guardRequiredFields(): boolean {
    if (!title.trim()) {
      setFormError(t("teacher.titleRequired"));
      return false;
    }
    if (!points || points < 1) {
      setFormError(t("teacher.pointsMin"));
      return false;
    }
    return true;
  }

  async function handleSaveDraft() {
    setFormError(null);
    setItemErrors([]);
    if (!guardRequiredFields()) return;
    const result = computeData();
    if (!result.data) {
      fail(result.formError ?? t("common.error"), result.itemErrors ?? []);
      return;
    }

    setSubmitting(true);
    try {
      const saved = await persist(result.data, "DRAFT");
      if (saved) {
        setLastSavedAt(Date.now());
        toast.success(t("teacher.draftSaved"));
      } // else: superseded by a newer save started meanwhile — that save owns the toast/state
    } catch (e) {
      setFormError(e instanceof ApiClientError ? e.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish() {
    setFormError(null);
    setItemErrors([]);
    if (!guardRequiredFields()) return;
    const result = computeData();
    if (!result.data) {
      fail(result.formError ?? t("common.error"), result.itemErrors ?? []);
      return;
    }

    setSubmitting(true);
    try {
      const saved = await persist(result.data, "PUBLISHED");
      if (saved) {
        setLastSavedAt(Date.now());
        toast.success(t("teacher.published_toast"));
        onSaved?.(saved.id);
      } // else: superseded by a newer save started meanwhile — that save owns the toast/state
    } catch (e) {
      setFormError(e instanceof ApiClientError ? e.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerate() {
    setAiLoading(true);
    try {
      const result = await api<{ data: ExerciseData; aiAvailable: boolean }>("/api/exercises/generate", {
        method: "POST",
        body: JSON.stringify({ type, difficulty, topic: aiTopic }),
      });
      applyDraft(type, result.data);
      toast.success(result.aiAvailable ? t("teacher.aiFilled") : t("teacher.aiUnavailable"));
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("common.error"));
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-9 w-1/2 animate-pulse rounded-lg bg-muted" />
        <div className="h-96 animate-pulse rounded-card border-2 border-border bg-card shadow-sticker" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-card border-2 border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive shadow-sticker">
        {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {exerciseId ? t("teacher.editExercise") : t("teacher.newExercise")}
        </h1>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {status === "PUBLISHED" ? (
            <span className="rounded-full border border-leaf bg-leaf-soft px-2.5 py-1 font-medium text-leaf-text">
              {t("teacher.published")}
            </span>
          ) : (
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 font-medium">{t("teacher.draft")}</span>
          )}
          {autosaving ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("teacher.savingDraft")}
            </span>
          ) : lastSavedAt ? (
            <span>{t("teacher.draftSaved")}</span>
          ) : null}
        </div>
      </div>

      {formError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>
      )}

      <div className="space-y-5 rounded-card border-2 border-border bg-card p-6 shadow-sticker">
        <Field label={t("teacher.exerciseTitle")}>
          <input
            dir="ltr"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("teacher.exerciseTitlePlaceholder")}
            className={inputClass}
          />
        </Field>

        <Field label={t("teacher.exerciseType")} hint={typeLocked ? t("teacher.typeLocked") : undefined}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {EXERCISE_TYPES.map((tp) => {
              const meta = EXERCISE_TYPE_META[tp];
              const Icon = meta.icon;
              const active = type === tp;
              return (
                <button
                  key={tp}
                  type="button"
                  disabled={typeLocked && !active}
                  onClick={() => setType(tp)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
                    active ? "border-primary/40 bg-secondary text-primary" : "border-border bg-muted text-muted-foreground hover:border-line-strong",
                    typeLocked && !active && "cursor-not-allowed opacity-40"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-primary" : meta.color)} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("teacher.difficulty")} className="sm:col-span-2">
            <LevelSelect value={difficulty} onChange={setDifficulty} />
          </Field>
          <Field label={t("teacher.points")}>
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

        <Field label={t("teacher.timeLimit")} hint={t("teacher.optional")}>
          <input
            type="number"
            min={1}
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            placeholder={t("teacher.noLimit")}
            className={inputClass}
          />
        </Field>

        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="min-w-[200px] flex-1">
            <Field label={t("teacher.aiTopic")}>
              <input
                dir="ltr"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder={t("teacher.aiTopicPlaceholder")}
                className={inputClass}
              />
            </Field>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={aiLoading} onClick={handleGenerate}>
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("teacher.generateAi")}
          </Button>
        </div>

        <div dir="ltr" className="border-t border-border pt-4 text-start">
          {type === "GRAMMAR" && <GrammarBuilder value={grammarItems} onChange={setGrammarItems} itemErrors={itemErrors} />}
          {type === "VOCABULARY" && <VocabularyBuilder value={vocabPairs} onChange={setVocabPairs} itemErrors={itemErrors} />}
          {type === "TRANSLATION" && (
            <TranslationBuilder value={translationItems} onChange={setTranslationItems} itemErrors={itemErrors} />
          )}
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
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="ghost" disabled={submitting} onClick={handleSaveDraft}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("teacher.saveDraft")}
        </Button>
        <Button type="button" variant="brand" disabled={submitting} onClick={handlePublish}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("teacher.publish")}
        </Button>
      </div>
    </div>
  );
}
