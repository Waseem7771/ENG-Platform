import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "@/lib/db";
import type { Exercise, Class } from "@/generated/prisma/client";
import type { Level, UserRole } from "@/types";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  level: Level | null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Turn an unknown thrown value into a JSON Response. Use in every route's catch. */
export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("[api]", error);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const u = session.user as typeof session.user & {
    role?: string;
    level?: string | null;
  };
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role === "TEACHER" ? "TEACHER" : "STUDENT",
    level: (u.level as Level | undefined) ?? null,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Not signed in");
  return user;
}

export async function requireTeacher(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "TEACHER") throw new ApiError(403, "Teachers only");
  return user;
}

export async function requireStudent(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "STUDENT") throw new ApiError(403, "Students only");
  return user;
}

/**
 * Pure ownership check: throws ApiError(404) — not 403 — when the row is
 * missing OR not owned by userId, so a non-owner can't distinguish
 * "doesn't exist" from "exists but isn't yours" by probing the API.
 * Kept side-effect-free (no headers()/DB access) so it can be unit-tested
 * directly without a request context.
 */
export function assertOwned<T extends object>(row: T | null, ownerField: keyof T & string, userId: string): T {
  if (!row || (row as Record<string, unknown>)[ownerField] !== userId) {
    throw new ApiError(404, "Not found");
  }
  return row;
}

/** Load an Exercise by id and assert the current teacher owns it (404 if not). */
export async function requireOwnedExercise(id: string): Promise<{ user: SessionUser; exercise: Exercise }> {
  const user = await requireTeacher();
  const exercise = assertOwned(await db.exercise.findUnique({ where: { id } }), "createdById", user.id);
  return { user, exercise };
}

/** Load a Class by id and assert the current teacher owns it (404 if not). */
export async function requireOwnedClass(id: string): Promise<{ user: SessionUser; klass: Class }> {
  const user = await requireTeacher();
  const klass = assertOwned(await db.class.findUnique({ where: { id } }), "teacherId", user.id);
  return { user, klass };
}
