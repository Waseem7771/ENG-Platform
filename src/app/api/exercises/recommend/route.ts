import { errorResponse, requireStudent } from "@/lib/guard";
import { recommendForStudent } from "@/lib/recommend";

export async function GET(request: Request) {
  try {
    const user = await requireStudent();
    const url = new URL(request.url);
    const excludeId = url.searchParams.get("exclude") ?? undefined;

    const recommendation = await recommendForStudent(user.id, user.level ?? null, excludeId);
    return Response.json({ recommendation });
  } catch (error) {
    return errorResponse(error);
  }
}
