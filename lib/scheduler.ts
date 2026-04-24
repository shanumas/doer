import { db } from "./db";
import { fetchDoerIssues, fetchProjectIssues, resolveOrder } from "./github";
import { sendApprovalCard } from "./teams";
import { getConfig } from "./config";

export async function runScheduler() {
  const repo = (await getConfig("github_repo")) ?? process.env.GITHUB_REPO;
  if (!repo) return console.error("[scheduler] No repo configured. Set it in /setup.");

  // Collect issues from both labels and projects, dedupe by number
  const [labelIssues, projectIssues] = await Promise.all([
    fetchDoerIssues(repo).catch(() => []),
    fetchProjectIssues(repo).catch(() => []),
  ]);

  const seen = new Set<number>();
  const allIssues = [...projectIssues, ...labelIssues].filter((i) => {
    if (seen.has(i.number)) return false;
    seen.add(i.number);
    return true;
  });

  if (allIssues.length === 0) return console.log("[scheduler] No doer issues found");

  // Skip issues already tracked
  const existing = await db.task.findMany({
    where: { repo, status: { in: ["PENDING_APPROVAL", "APPROVED", "RUNNING"] } },
    select: { issueNumber: true },
  });
  const activeNums = new Set(existing.map((t) => t.issueNumber));
  const candidates = allIssues.filter((i) => !activeNums.has(i.number));

  if (candidates.length === 0) return console.log("[scheduler] All issues already tracked");

  const ordered = resolveOrder(candidates);
  const pick = ordered[0];

  const task = await db.task.create({
    data: { repo, issueNumber: pick.number, issueTitle: pick.title, issueBody: pick.body },
  });

  await sendApprovalCard({
    taskId: task.id,
    token: task.approvalToken,
    issueNumber: pick.number,
    issueTitle: pick.title,
    issueBody: pick.body,
    repo,
  });

  console.log(`[scheduler] Sent approval for #${pick.number} — ${pick.title}`);
}
