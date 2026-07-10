import { headers } from "next/headers";
import { auth } from "./auth";
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
