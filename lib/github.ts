import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";
import { getConfig } from "./config";

async function getToken() {
  return (await getConfig("github_token")) ?? process.env.GITHUB_TOKEN ?? "";
}

async function octokit() {
  return new Octokit({ auth: await getToken() });
}

async function gql() {
  const token = await getToken();
  return graphql.defaults({ headers: { authorization: `token ${token}` } });
}

export interface Issue {
  number: number;
  title: string;
  body: string;
  dependsOn: number[];
}

const DEP_PATTERN = /(?:depends on|blocked by|after)\s+#(\d+)/gi;

function parseDeps(body: string): number[] {
  const deps: number[] = [];
  let m;
  while ((m = DEP_PATTERN.exec(body ?? "")) !== null) deps.push(Number(m[1]));
  return deps;
}

export async function fetchDoerIssues(repo: string): Promise<Issue[]> {
  const [owner, name] = repo.split("/");
  const client = await octokit();
  const { data } = await client.issues.listForRepo({
    owner, repo: name, state: "open", labels: "doer", per_page: 50,
  });
  return data.map((i) => ({
    number: i.number, title: i.title,
    body: i.body ?? "", dependsOn: parseDeps(i.body ?? ""),
  }));
}

export async function fetchProjectIssues(repo: string): Promise<Issue[]> {
  const [owner, name] = repo.split("/");
  const client = await gql();
  const data: any = await client(`
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        projectsV2(first: 5) {
          nodes {
            items(first: 50, orderBy: { field: POSITION, direction: ASC }) {
              nodes {
                content {
                  ... on Issue {
                    number title body state
                    labels(first: 10) { nodes { name } }
                  }
                }
              }
            }
          }
        }
      }
    }
  `, { owner, name });

  const issues: Issue[] = [];
  for (const project of data.repository.projectsV2.nodes) {
    for (const item of project.items.nodes) {
      const c = item.content;
      if (!c || c.state !== "OPEN") continue;
      if (!c.labels?.nodes?.some((l: any) => l.name === "doer")) continue;
      issues.push({ number: c.number, title: c.title, body: c.body ?? "", dependsOn: parseDeps(c.body) });
    }
  }
  return issues;
}

export function resolveOrder(issues: Issue[]): Issue[] {
  const open = new Set(issues.map((i) => i.number));
  const ready = issues.filter((i) => i.dependsOn.every((d) => !open.has(d)));
  return ready.length > 0 ? ready : issues;
}

export async function createPR(repo: string, branch: string, title: string, body: string) {
  const [owner, name] = repo.split("/");
  const client = await octokit();
  const { data } = await client.pulls.create({
    owner, repo: name, head: branch,
    base: process.env.GITHUB_BASE_BRANCH ?? "main",
    title, body,
  });
  return data.html_url;
}

export async function listUserRepos(): Promise<{ full_name: string; private: boolean }[]> {
  const client = await octokit();
  const { data } = await client.repos.listForAuthenticatedUser({
    sort: "updated", per_page: 50, affiliation: "owner,collaborator",
  });
  return data.map((r) => ({ full_name: r.full_name, private: r.private }));
}
