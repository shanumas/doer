import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Agent → App: post logs, mark done/failed
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { type: string; message?: string; level?: string; prUrl?: string; error?: string };

  if (body.type === "log") {
    await db.log.create({
      data: { taskId: id, message: body.message ?? "", level: (body.level as any) ?? "INFO" },
    });
  } else if (body.type === "done") {
    await db.task.update({ where: { id }, data: { status: "DONE", prUrl: body.prUrl } });
    await db.log.create({ data: { taskId: id, message: `✅ Done. PR: ${body.prUrl}`, level: "INFO" } });
  } else if (body.type === "failed") {
    await db.task.update({ where: { id }, data: { status: "FAILED" } });
    await db.log.create({ data: { taskId: id, message: `❌ Failed: ${body.error}`, level: "ERROR" } });
  }

  return NextResponse.json({ ok: true });
}
