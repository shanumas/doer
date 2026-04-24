import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const tasks = await db.task.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, issueNumber: true, issueTitle: true,
      repo: true, status: true, prUrl: true, createdAt: true,
    },
  });
  return NextResponse.json(tasks);
}
