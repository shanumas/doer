# doer — Claude Code Context

## What is doer

Autonomous GitHub issue fixer for teams using GitHub + Microsoft Teams. Picks issues labelled `doer`, asks for approval, clones the repo in a Docker sandbox, uses an AI agent to fix the code, and opens a pull request. Full audit log on the dashboard.

## Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Database**: PostgreSQL + Prisma ORM
- **AI**: OpenAI-compatible SDK — model-agnostic via `AI_BASE_URL` (OpenRouter, Azure OpenAI, Ollama, etc.)
- **Sandbox**: Docker-out-of-Docker — agent runs in `doer-agent` container, spawned via dockerode
- **GitHub auth**: OAuth App (not PAT) — token stored in DB `Config` table
- **Teams**: Incoming webhook — Adaptive Card with approve/deny `Action.OpenUrl` buttons
- **Deployment**: Docker Compose (dev mode with hot reload)

## Key architecture decisions

- GitHub token and repo are stored in the `Config` DB table (set via `/setup` UI), NOT in `.env`
- `.env` only needs: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `DATABASE_URL`, `APP_URL`, `CRON_SECRET`, `DOCKER_NETWORK`, `AGENT_IMAGE`
- Teams webhook URL is also stored in DB `Config` table, set via `/setup`
- Agent containers join the `doer` Docker network and post logs back to `http://app:3000/api/tasks/[id]/events`
- Scheduler uses `setInterval` (NOT node-cron — causes webpack bundling issues in Next.js)
- `instrumentation.ts` starts the scheduler on app boot (Node.js runtime only)

## Running locally

```bash
cp .env.example .env   # fill in GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, AI_API_KEY, AI_BASE_URL, AI_MODEL
docker compose up --build   # first time only
docker compose up           # subsequent runs — hot reload active, no rebuild needed
```

Rebuild only needed when `package.json` or `prisma/schema.prisma` changes.

## Setup flow (first run)

1. Open `http://localhost:3000/setup`
2. Click **Connect GitHub** → OAuth flow → token stored in DB
3. Select repository from dropdown
4. Paste Teams incoming webhook URL
5. Click Save → go to dashboard

## Dashboard

- **Available** section: open GitHub issues with `doer` label not yet tracked — each has **⚡ Fix it** button
- **Tasks** section: tracked tasks with status badges — `PENDING_APPROVAL` tasks also show **⚡ Fix it**
- Right panel: real-time SSE log stream for selected task
- Clicking Fix it from dashboard skips Teams approval and spawns agent directly

## File map

```
app/
  page.tsx                        Dashboard (issues + tasks + log stream)
  setup/page.tsx                  OAuth + config UI
  task/[id]/page.tsx              Direct task thread link
  api/approve/route.ts            Teams approve/deny handler
  api/issues/route.ts             GitHub issues not yet tracked
  api/tasks/route.ts              List tasks
  api/tasks/start/route.ts        Dashboard-initiated fix (skips Teams)
  api/tasks/[id]/events/route.ts  Agent → App (POST logs, done, failed)
  api/tasks/[id]/logs/route.ts    Dashboard SSE stream
  api/cron/route.ts               Manual scheduler trigger
  api/config/route.ts             GET/POST runtime config
  api/auth/github/route.ts        Start GitHub OAuth
  api/auth/github/callback/       Handle OAuth callback, store token
  api/auth/github/repos/          List user repos after auth
lib/
  db.ts          Prisma singleton
  config.ts      DB key-value config helper (getConfig / setConfig)
  github.ts      Octokit wrapper — issues, projects, PR creation, repo list
  teams.ts       Teams Adaptive Card sender
  agent.ts       Dockerode container spawner — reads github_token from DB
  scheduler.ts   Pick next issue, create task, notify Teams
agent/
  index.ts       Coding agent — OpenAI tool loop, bash tool, clone→fix→PR
  Dockerfile     node:20-alpine + git + ca-certificates
instrumentation.ts   Starts scheduler via setInterval on app boot
prisma/schema.prisma Task + Log + Config models
docker-compose.yml   app (dev mode) + db + agent image
```

## Known issues / gotchas

- **Corporate networks with Zscaler SSL inspection**: agent containers can't reach OpenRouter. Fix: add Zscaler CA cert to agent image, OR test on a non-proxied network (mobile hotspot). `NODE_TLS_REJECT_UNAUTHORIZED=0` is set but Zscaler may still intercept.
- **node-cron**: do NOT use — causes `Module not found: Can't resolve 'path'` webpack error in Next.js. Use `setInterval` instead (already done in `instrumentation.ts`).
- **Prisma on Alpine**: requires `openssl` package + `binaryTargets = ["native", "linux-musl-openssl-3.0.x", "linux-musl-arm64-openssl-3.0.x"]` in schema.

## GitHub repos

- **doer** (this repo): `shanumas/doer`
- **doer-landing** (test repo): `shanumas/doer-landing` — plain HTML/CSS/JS landing page used to test doer end-to-end

## Environment variables

| Variable | Where set | Purpose |
|---|---|---|
| `DATABASE_URL` | `.env` | Postgres connection string |
| `GITHUB_CLIENT_ID` | `.env` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | `.env` | GitHub OAuth App secret |
| `GITHUB_BASE_BRANCH` | `.env` | Base branch for PRs (default: main) |
| `AI_API_KEY` | `.env` | AI provider API key |
| `AI_BASE_URL` | `.env` | Provider base URL (blank = OpenAI) |
| `AI_MODEL` | `.env` | Model name (e.g. anthropic/claude-sonnet-4-5) |
| `APP_URL` | `.env` | Public URL of the app (for Teams card links) |
| `CRON_SECRET` | `.env` | Secret for `/api/cron?secret=` endpoint |
| `SCHEDULER_INTERVAL_MINUTES` | `.env` | How often to poll GitHub (default: 10) |
| `DOCKER_NETWORK` | `.env` | Docker network name (default: doer) |
| `AGENT_IMAGE` | `.env` | Agent Docker image name (default: doer-agent) |
| `github_token` | DB Config | GitHub OAuth access token (set via /setup) |
| `github_repo` | DB Config | Target repo e.g. shanumas/doer-landing (set via /setup) |
| `teams_webhook_url` | DB Config | Teams incoming webhook URL (set via /setup) |
