import type { ExerciseStatus, ExerciseType, Level, ProgressCategory, SessionStatus } from "@/types";

export interface TeacherClassListItem {
  id: string;
  name: string;
  description: string | null;
  level: Level;
  code: string;
  studentCount: number;
  sessionCount: number;
  createdAt: string;
}

export interface TeacherClassStudent {
  id: string;
  name: string;
  email: string;
  level: Level | null;
  overallScore: number;
  xp: number;
}

export interface TeacherClassSession {
  id: string;
  title: string;
  status: SessionStatus;
  createdAt: string;
}

export interface TeacherClassDetail {
  id: string;
  name: string;
  description: string | null;
  level: Level;
  code: string;
  teacherName: string;
  students: TeacherClassStudent[];
  sessions: TeacherClassSession[];
}

export interface TeacherLessonExercise {
  id: string;
  title: string;
  type: ExerciseType;
  difficulty: Level;
}

export interface TeacherLessonItem {
  id: string;
  classId: string | null;
  title: string;
  description: string | null;
  level: Level;
  unit: number;
  order: number;
  isCheckpoint: boolean;
  createdAt: string;
  updatedAt: string;
  exercises: TeacherLessonExercise[];
  exerciseCount: number;
}

export interface TeacherExerciseListItem {
  id: string;
  title: string;
  type: ExerciseType;
  difficulty: Level;
  points: number;
  timeLimit: number | null;
  status: ExerciseStatus;
  resultsCount: number;
  createdAt: string;
}

export interface TeacherStudentListItem {
  id: string;
  name: string;
  email: string;
  level: Level | null;
  xp: number;
  streak: number;
  overallScore: number;
  exercisesDone: number;
  avgScore: number;
  classNames: string[];
}

export interface TeacherSessionListItem {
  id: string;
  title: string;
  status: SessionStatus;
  classId: string;
  className: string;
  participantCount: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

/** Only enrolled students who have joined show up here — the teacher is never listed as a participant. */
export interface SessionParticipant {
  id: string;
  name: string;
  joinedAt: string;
}

export interface SessionMessageItem {
  id: string;
  content: string;
  type: "TEXT" | "SYSTEM" | "EXERCISE";
  createdAt: string;
  user: { id: string; name: string; role: "STUDENT" | "TEACHER" };
}

/** Mirrors src/lib/session.ts SessionPhase (server-computed; the client never recomputes it). */
export type SessionPhase = "SCHEDULED" | "LOBBY" | "LIVE" | "ENDED";

/** Mirrors src/lib/session.ts RosterEntry: the full class roster unioned with who has joined. */
export interface SessionRosterEntry {
  studentId: string;
  name: string;
  joined: boolean;
  joinedAt: string | null;
}

export interface TeacherSessionDetail {
  session: {
    id: string;
    title: string;
    status: SessionStatus;
    classId: string;
    className: string;
    teacherId: string;
    teacherName: string;
    startedAt: string | null;
    endedAt: string | null;
    scheduledAt: string | null;
  };
  participants: SessionParticipant[];
  messages: SessionMessageItem[];
  pushedExercise: { id: string; title: string; type: ExerciseType } | null;
  roster: SessionRosterEntry[];
  phase: SessionPhase;
  serverTime: string;
}

export interface StudentProgressRow {
  id: string;
  studentId: string;
  category: ProgressCategory;
  score: number;
  streak: number;
  xp: number;
  updatedAt: string;
}

export interface StudentResultItem {
  id: string;
  score: number;
  timeSpent: number | null;
  completedAt: string;
  exercise: { title: string; type: ExerciseType; difficulty: Level };
}

export interface StudentPlacementItem {
  score: number;
  level: Level;
  completedAt: string;
}

export interface TeacherStudentDetail {
  student: { id: string; name: string; email: string; level: Level | null };
  progress: StudentProgressRow[];
  results: StudentResultItem[];
  placements: StudentPlacementItem[];
  sessionsAttended: number;
}
