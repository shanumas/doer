import { NextResponse } from "next/server";
import { fetchDoerIssues, fetchProjectIssues, resolveOrder } from "@/lib/github";
import { getConfig } from "@/lib/config";
import { db } from "@/lib/db";

export async function GET() {
  const repo = (await getConfig("github_repo")) ?? process.env.GITHUB_REPO;
  if (!repo) return NextResponse.json([]);

  const [labelIssues, projectIssues] = await Promise.all([
    fetchDoerIssues(repo).catch(() => []),
    fetchProjectIssues(repo).catch(() => []),
  ]);

  const seen = new Set<number>();
  const all = [...projectIssues, ...labelIssues].filter((i) => {
    if (seen.has(i.number)) return false;
    seen.add(i.number);
    return true;
  });

  // Exclude issues already tracked
  const active = await db.task.findMany({
    where: { repo, status: { in: ["PENDING_APPROVAL", "APPROVED", "RUNNING", "DONE"] } },
    select: { issueNumber: true },
  });
  const activeNums = new Set(active.map((t) => t.issueNumber));
  const available = resolveOrder(all.filter((i) => !activeNums.has(i.number)));

  return NextResponse.json(available);
}
