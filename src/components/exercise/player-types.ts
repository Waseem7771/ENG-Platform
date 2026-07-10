import type { ExerciseType, Level } from "@/types";

export interface ExerciseSummary {
  id: string;
  title: string;
  type: ExerciseType;
  difficulty: Level;
  points: number;
  timeLimit: number | null;
}

/** Every exercise player component shares this prop shape. */
export interface PlayerProps<TData, TPayload> {
  exercise: ExerciseSummary;
  data: TData;
  onSubmit: (payload: TPayload) => void;
  submitting: boolean;
  /** Lets the shell force a submission of whatever's collected so far when a countdown expires. */
  registerForceSubmit?: (fn: () => void) => void;
}
