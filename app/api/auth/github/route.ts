import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "GITHUB_CLIENT_ID not set in .env" }, { status: 500 });

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "repo read:org read:project",
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
