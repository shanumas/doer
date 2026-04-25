import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/config";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await db.task.findUnique({ where: { id }, select: { prUrl: true } });
  if (!task?.prUrl) return NextResponse.json({ state: null });

  // Parse owner/repo/number from prUrl e.g. https://github.com/owner/repo/pull/123
  const match = task.prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return NextResponse.json({ state: null });
  const [, owner, repo, pull_number] = match;

  const token = (await getConfig("github_token")) ?? process.env.GITHUB_TOKEN ?? "";
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`, {
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return NextResponse.json({ state: null });
  const pr = await res.json();
  return NextResponse.json({ state: pr.merged ? "merged" : pr.state });
}
