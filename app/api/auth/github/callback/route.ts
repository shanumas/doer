import { NextRequest, NextResponse } from "next/server";
import { setConfig } from "@/lib/config";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/setup?error=no_code", req.url));

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await res.json() as any;
  if (data.error || !data.access_token) {
    return NextResponse.redirect(new URL(`/setup?error=${data.error ?? "oauth_failed"}`, req.url));
  }

  await setConfig("github_token", data.access_token);
  return NextResponse.redirect(new URL("/setup?github=connected", req.url));
}
