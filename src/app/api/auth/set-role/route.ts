import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await request.json();

    if (role !== "STUDENT" && role !== "TEACHER") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { role },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to set role" }, { status: 500 });
  }
}
