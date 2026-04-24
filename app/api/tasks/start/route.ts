import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { spawnAgent } from "@/lib/agent";

// Create a task and immediately start the agent (dashboard-initiated, no Teams approval needed)
export async function POST(req: NextRequest) {
  const { issueNumber, issueTitle, issueBody } = await req.json();
  const repo = (await getConfig("github_repo")) ?? process.env.GITHUB_REPO;
  if (!repo) return NextResponse.json({ error: "No repo configured" }, { status: 400 });

  const task = await db.task.upsert({
    where: { repo_issueNumber: { repo, issueNumber } },
    create: { repo, issueNumber, issueTitle, issueBody: issueBody ?? "", status: "APPROVED" },
    update: { status: "APPROVED" },
  });

  await db.log.create({
    data: { taskId: task.id, message: "Task started manually from dashboard.", level: "DECISION" },
  });

  spawnAgent(task.id).catch(async (err) => {
    await db.task.update({ where: { id: task.id }, data: { status: "FAILED" } });
    await db.log.create({ data: { taskId: task.id, message: `Failed to spawn agent: ${err.message}`, level: "ERROR" } });
  });

  return NextResponse.json({ taskId: task.id });
}
