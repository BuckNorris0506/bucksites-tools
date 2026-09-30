import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

const MODES = new Set(["GREEN", "YELLOW", "RED"]);
const J_ROOT =
  process.env.J_OFFICE_ROOT ||
  process.env.J_REPO_ROOT ||
  "/Users/jaredbuckman/Library/Application Support/J-Executive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function runOperatingState(args: string[]) {
  const { stdout } = await execFileAsync("python3", ["-m", "j.operating_state", ...args], {
    cwd: J_ROOT,
    timeout: 15000,
    env: process.env,
  });
  return JSON.parse(stdout) as Record<string, unknown>;
}

export async function GET() {
  try {
    return NextResponse.json(await runOperatingState(["show"]));
  } catch {
    return NextResponse.json({ error: "operating state unavailable" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "operating state rejected" }, { status: 400 });
  }
  const mode = body && typeof body === "object" ? (body as { mode?: unknown }).mode : null;
  if (typeof mode !== "string" || !MODES.has(mode)) {
    return NextResponse.json({ error: "operating state rejected" }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await runOperatingState(["set", mode, "founder_local_office"]),
    );
  } catch {
    return NextResponse.json({ error: "operating state rejected" }, { status: 400 });
  }
}
