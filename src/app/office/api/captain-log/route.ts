import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { NextResponse } from "next/server";

import { CAPTAIN_LOG_WINDOWS, DEFAULT_CAPTAIN_WINDOW } from "@/app/office/captain-log";

const execFileAsync = promisify(execFile);

const J_ROOT =
  process.env.J_OFFICE_ROOT ||
  process.env.J_REPO_ROOT ||
  "/Users/jaredbuckman/Library/Application Support/J-Executive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("window") || DEFAULT_CAPTAIN_WINDOW;
  if (!CAPTAIN_LOG_WINDOWS.includes(requested as (typeof CAPTAIN_LOG_WINDOWS)[number])) {
    return NextResponse.json({ error: "captain log rejected" }, { status: 400 });
  }
  try {
    const { stdout } = await execFileAsync(
      "python3",
      ["-m", "j.captain_log", "--window", requested, "--format", "json"],
      {
        cwd: J_ROOT,
        timeout: 20000,
        env: process.env,
      },
    );
    return NextResponse.json(JSON.parse(stdout));
  } catch {
    return NextResponse.json({ error: "captain log unavailable" }, { status: 500 });
  }
}
