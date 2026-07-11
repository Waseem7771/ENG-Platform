import { errorResponse, requireStudent } from "@/lib/guard";
import { buildPathForStudent } from "@/lib/path";

export async function GET() {
  try {
    const user = await requireStudent();
    const path = await buildPathForStudent(user.id, user.level ?? null);
    return Response.json(path);
  } catch (error) {
    return errorResponse(error);
  }
}
