import { execSync } from "child_process";
import { existsSync } from "fs";
import OpenAI from "openai";

const {
  TASK_ID, REPO, ISSUE_NUMBER, ISSUE_TITLE,
  ISSUE_BODY, GITHUB_TOKEN, GITHUB_BASE_BRANCH = "main",
  AI_API_KEY, AI_BASE_URL, AI_MODEL = "gpt-4o", APP_URL,
} = process.env;

const issueBody = Buffer.from(ISSUE_BODY ?? "", "base64").toString("utf8");
const appUrl = APP_URL ?? "http://app:3000";

const client = new OpenAI({
  apiKey: AI_API_KEY,
  ...(AI_BASE_URL ? { baseURL: AI_BASE_URL } : {}),
});

async function log(message: string, level = "INFO") {
  console.log(`[${level}] ${message}`);
  await fetch(`${appUrl}/api/tasks/${TASK_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "log", message, level }),
  }).catch(() => {});
}

function bash(cmd: string): string {
  const cwd = existsSync("/workspace") ? "/workspace" : "/";
  try {
    return execSync(cmd, { cwd, encoding: "utf8", timeout: 60_000 });
  } catch (e: any) {
    return e.stdout ?? e.message ?? "command failed";
  }
}

const TOOLS: OpenAI.ChatCompletionTool[] = [{
  type: "function",
  function: {
    name: "bash",
    description: "Run a shell command in the workspace. Use this to read files, write files, run tests, and git operations.",
    parameters: {
      type: "object",
      properties: { command: { type: "string", description: "Shell command to run" } },
      required: ["command"],
    },
  },
}];

async function run() {
  await log(`Starting agent for issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}`, "INFO");

  // Setup workspace
  await log(`Cloning ${REPO}…`, "INFO");
  bash(`git clone https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git /workspace`);
  bash(`git config user.email "doer-bot@users.noreply.github.com"`);
  bash(`git config user.name "doer"`);
  const branch = `doer/issue-${ISSUE_NUMBER}`;
  bash(`git checkout -b ${branch}`);
  await log(`Cloned ${REPO} → branch ${branch}`, "INFO");

  const messages: OpenAI.ChatCompletionMessageParam[] = [{
    role: "system",
    content: `You are an expert software engineer. Fix the GitHub issue described below by editing the code in /workspace.
Use the bash tool to read files, understand the codebase, make changes, and run tests.
When done, do NOT commit or push — just stop. The harness handles git.
Be precise. Log your key decisions with a DECISION-prefixed message via bash echo.
Repo: ${REPO}`,
  }, {
    role: "user",
    content: `Fix issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}\n\n${issueBody}`,
  }];

  await log(`Starting AI agent loop (max 25 iterations)…`, "INFO");
  let iterations = 0;
  const MAX = 25;

  while (iterations++ < MAX) {
    await log(`Iteration ${iterations}/${MAX}`, "INFO");
    const response = await client.chat.completions.create({
      model: AI_MODEL,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      max_tokens: 4096,
    });

    if (!response.choices?.length) {
      const raw = JSON.stringify(response);
      await log(`API returned no choices. Raw response: ${raw}`, "ERROR");
      throw new Error(`No choices in response: ${raw}`);
    }

    const msg = response.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls?.length) {
      await log(msg.content ?? "Agent finished with no further actions.", "INFO");
      break;
    }

    for (const call of msg.tool_calls) {
      const { command } = JSON.parse(call.function.arguments);
      await log(`$ ${command}`, "INFO");
      const output = bash(command);
      if (output) await log(output.slice(0, 2000), "INFO");

      messages.push({ role: "tool", tool_call_id: call.id, content: output || "(no output)" });
    }
  }

  await log(`Agent loop finished after ${iterations - 1} iterations`, "INFO");

  // Commit and push
  await log(`Committing changes…`, "INFO");
  const diff = bash("git diff --stat HEAD");
  if (!diff.trim()) {
    await log("No file changes detected. Nothing to commit.", "INFO");
    await fetch(`${appUrl}/api/tasks/${TASK_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "failed", error: "Agent made no file changes." }),
    });
    return;
  }

  bash("git add -A");
  bash(`git commit -m "fix: resolve issue #${ISSUE_NUMBER} — ${ISSUE_TITLE}"`);
  await log(`Pushing branch ${branch}…`, "INFO");
  bash(`git push origin ${branch}`);
  await log(`Pushed branch ${branch}`, "DECISION");

  // Open PR via GitHub API
  const prRes = await fetch(`https://api.github.com/repos/${REPO}/pulls`, {
    method: "POST",
    headers: { Authorization: `token ${GITHUB_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `fix: resolve issue #${ISSUE_NUMBER} — ${ISSUE_TITLE}`,
      head: branch,
      base: GITHUB_BASE_BRANCH,
      body: `Closes #${ISSUE_NUMBER}\n\nAutomatically fixed by [doer](https://github.com/your-org/doer).`,
    }),
  });

  const pr = await prRes.json() as any;
  if (!prRes.ok) throw new Error(pr.message ?? "Failed to create PR");

  await log(`PR opened: ${pr.html_url}`, "DECISION");
  await fetch(`${appUrl}/api/tasks/${TASK_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "done", prUrl: pr.html_url }),
  });
}

run().catch(async (err) => {
  console.error(err);
  await fetch(`${appUrl}/api/tasks/${TASK_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "failed", error: err.message }),
  }).catch(() => {});
  process.exit(1);
});
