import { NextRequest, NextResponse } from "next/server";
import { runScheduler } from "@/lib/scheduler";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await runScheduler();
  return NextResponse.json({ ok: true });
}
