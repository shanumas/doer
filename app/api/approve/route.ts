import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { spawnAgent } from "@/lib/agent";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const action = req.nextUrl.searchParams.get("action");

  if (!token || !action) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const task = await db.task.findUnique({ where: { approvalToken: token } });
  if (!task) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  if (task.status !== "PENDING_APPROVAL") {
    return NextResponse.redirect(new URL(`/task/${task.id}`, req.url));
  }

  if (action === "deny") {
    await db.task.update({ where: { id: task.id }, data: { status: "DENIED" } });
    await db.log.create({ data: { taskId: task.id, message: "Task denied via Teams.", level: "INFO" } });
    return NextResponse.redirect(new URL(`/task/${task.id}`, req.url));
  }

  await db.task.update({ where: { id: task.id }, data: { status: "APPROVED" } });
  await db.log.create({ data: { taskId: task.id, message: "Task approved via Teams. Spawning agent…", level: "DECISION" } });

  spawnAgent(task.id).catch(async (err) => {
    await db.task.update({ where: { id: task.id }, data: { status: "FAILED" } });
    await db.log.create({ data: { taskId: task.id, message: `Failed to spawn agent: ${err.message}`, level: "ERROR" } });
  });

  return NextResponse.redirect(new URL(`/task/${task.id}`, req.url));
}
