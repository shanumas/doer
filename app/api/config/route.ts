import { NextRequest, NextResponse } from "next/server";
import { getAllConfig, setConfig } from "@/lib/config";

export async function GET() {
  const config = await getAllConfig();
  // Never expose the token value to the frontend — just whether it's set
  return NextResponse.json({
    github_connected: !!config.github_token,
    github_repo: config.github_repo ?? "",
    teams_configured: !!config.teams_webhook_url,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, string>;
  for (const [key, value] of Object.entries(body)) {
    if (["github_repo", "teams_webhook_url"].includes(key)) {
      await setConfig(key, value);
    }
  }
  return NextResponse.json({ ok: true });
}
