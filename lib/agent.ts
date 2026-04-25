import Dockerode from "dockerode";
import { db } from "./db";
import { getConfig } from "./config";

const docker = new Dockerode(
  process.env.DOCKER_SOCKET ? { socketPath: process.env.DOCKER_SOCKET } : undefined
);

export async function spawnAgent(taskId: string) {
  const task = await db.task.findUniqueOrThrow({ where: { id: taskId } });
  const githubToken = (await getConfig("github_token")) ?? process.env.GITHUB_TOKEN ?? "";

  const env = [
    `TASK_ID=${task.id}`,
    `REPO=${task.repo}`,
    `ISSUE_NUMBER=${task.issueNumber}`,
    `ISSUE_TITLE=${task.issueTitle}`,
    `ISSUE_BODY=${Buffer.from(task.issueBody).toString("base64")}`,
    `GITHUB_TOKEN=${githubToken}`,
    `GITHUB_BASE_BRANCH=${process.env.GITHUB_BASE_BRANCH ?? "main"}`,
    `AI_API_KEY=${process.env.AI_API_KEY}`,
    `AI_BASE_URL=${process.env.AI_BASE_URL ?? ""}`,
    `AI_MODEL=${process.env.AI_MODEL ?? "gpt-4o"}`,
    `APP_URL=http://app:3000`,
    `NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt`,
    `NODE_TLS_REJECT_UNAUTHORIZED=0`,
  ];

  const container = await docker.createContainer({
    Image: process.env.AGENT_IMAGE ?? "doer-agent",
    Env: env,
    HostConfig: { NetworkMode: process.env.DOCKER_NETWORK ?? "doer" },
  });

  await container.start();
  await db.task.update({
    where: { id: taskId },
    data: { status: "RUNNING", containerId: container.id },
  });

  return container.id;
}
