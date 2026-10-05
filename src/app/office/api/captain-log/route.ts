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

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "founder decision rejected" }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const choice = record.choice;
  const duplicateKey = record.duplicate_key;
  const postDigest = record.post_digest;
  if (choice !== "APPROVE" && choice !== "DECLINE") {
    return NextResponse.json({ error: "founder decision rejected" }, { status: 400 });
  }
  if (typeof duplicateKey !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,179}$/.test(duplicateKey)) {
    return NextResponse.json({ error: "founder decision rejected" }, { status: 400 });
  }
  if (typeof postDigest !== "string" || !/^[a-f0-9]{64}$/.test(postDigest)) {
    return NextResponse.json({ error: "founder decision rejected" }, { status: 400 });
  }
  try {
    const { stdout } = await execFileAsync(
      "python3",
      [
        "-m",
        "j.buckparts_marketing_desk_handoff",
        "decide",
        "--choice",
        choice,
        "--duplicate-key",
        duplicateKey,
        "--post-digest",
        postDigest,
      ],
      {
        cwd: J_ROOT,
        timeout: 20000,
        env: process.env,
      },
    );
    const parsed = JSON.parse(stdout) as { published?: unknown; execution_state?: unknown; outcome?: unknown };
    if (parsed.published === true || parsed.execution_state === "PUBLISHED") {
      return NextResponse.json({ error: "publication refused" }, { status: 409 });
    }
    const status = parsed.outcome === "RECORDED" || parsed.outcome === "IDEMPOTENT" ? 200 : 409;
    return NextResponse.json(parsed, { status });
  } catch {
    return NextResponse.json({ error: "founder decision refused" }, { status: 409 });
  }
}
