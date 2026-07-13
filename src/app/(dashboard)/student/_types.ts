import type { ExerciseData, ExerciseType, Level, ProgressCategory, UserRole } from "@/types";

// ==================== /api/me ====================

export interface ProgressRow {
  category: ProgressCategory;
  score: number;
  streak: number;
  xp: number;
  updatedAt: string;
}

export interface MeResponse {
  user: { id: string; name: string; email: string; role: UserRole; level: Level | null };
  progress: ProgressRow[];
}

// ==================== /api/classes ====================

export interface ClassSummary {
  id: string;
  name: string;
  description?: string | null;
  level: Level;
  teacherName: string;
  studentCount: number;
  joinedAt?: string;
}

// ==================== /api/exercises/[id] ====================

export interface ExerciseFull {
  id: string;
  title: string;
  type: ExerciseType;
  difficulty: Level;
  points: number;
  timeLimit: number | null;
  lessonId: string | null;
  data: ExerciseData;
}

// ==================== /api/sessions ====================

export type LiveSessionStatus = "WAITING" | "ACTIVE" | "ENDED";

export interface SessionSummary {
  id: string;
  title: string;
  status: LiveSessionStatus;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  participantCount: number;
  messageCount: number;
  createdAt: string;
}

/** A student who has explicitly joined the session (from SessionStudent rows — the teacher is not included). */
export interface ParticipantDTO {
  id: string;
  name: string;
  joinedAt: string;
}

export interface SessionMessageDTO {
  id: string;
  content: string;
  type: "TEXT" | "SYSTEM" | "EXERCISE";
  createdAt: string;
  user: { id: string; name: string; role: UserRole };
}

export interface PushedExercise {
  id: string;
  title: string;
  type: ExerciseType;
  difficulty: Level;
  points: number;
  pushedAt: string;
}

/** Mirrors src/lib/session.ts SessionPhase (server sends it — the client never recomputes it). */
export type SessionPhase = "SCHEDULED" | "LOBBY" | "LIVE" | "ENDED";

/** Mirrors src/lib/session.ts RosterEntry: the full class roster unioned with who has joined. */
export interface RosterEntry {
  studentId: string;
  name: string;
  joined: boolean;
  joinedAt: string | null;
}

export interface SessionDetail {
  session: {
    id: string;
    title: string;
    status: LiveSessionStatus;
    startedAt: string | null;
    endedAt: string | null;
    scheduledAt: string | null;
    classId: string;
    className: string;
    teacherId: string;
    teacherName: string;
  };
  participants: ParticipantDTO[];
  messages: SessionMessageDTO[];
  pushedExercise: PushedExercise | null;
  roster: RosterEntry[];
  phase: SessionPhase;
  serverTime: string;
}

// ==================== /api/results ====================

export interface ResultSummary {
  id: string;
  exerciseId: string;
  exerciseTitle: string;
  type: ExerciseType;
  score: number;
  xpEarned: null;
  completedAt: string;
}

export interface ResultsResponse {
  results: ResultSummary[];
}

// ==================== /api/results/[id]/review ====================

export interface ReviewItemDTO {
  prompt: string;
  given: string;
  expected: string | null;
  correct: boolean;
  note: string | null;
}

export interface ReviewResponse {
  score: number;
  exerciseTitle: string;
  type: ExerciseType;
  items: ReviewItemDTO[] | null;
}
