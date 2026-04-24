import { NextResponse } from "next/server";
import { listUserRepos } from "@/lib/github";

export async function GET() {
  const repos = await listUserRepos();
  return NextResponse.json(repos);
}
