/**
 * Local operator proof stack: git head, build, read-only live-site check, Command Center JSON,
 * compact summary (foundation scorecard uses score_contribution/max_contribution — not score/max_score).
 *
 * Live path uses `scripts/live-site-smoke-check.ts` via `node --import tsx` (same as `buckparts:live-site-smoke:check`,
 * but avoids nested `npm run` stdout noise that breaks JSON.parse).
 * For durable_write truth, run `npm run buckparts:live-site-smoke` separately (mutates when configured).
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  extractTopOfGameFoundationScorecardV1,
  formatScorecardLaneLine,
  getCommandCenterV2FromReport,
  parseJsonStdout,
} from "./lib/buckparts-operator-proof";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function runGit(args: string[], cwd: string): { ok: boolean; out: string } {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { ok: r.status === 0, out: String(r.stdout ?? "").trimEnd() };
}

function runNpm(
  script: string,
  cwd: string,
): { ok: boolean; stdout: string; stderr: string; status: number | null } {
  const r = spawnSync("npm", ["run", script], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    ok: r.status === 0,
    stdout: String(r.stdout ?? ""),
    stderr: String(r.stderr ?? ""),
    status: r.status,
  };
}

/** Same as `npm run` targets that only `tsx` a script — avoids npm lifecycle lines on stdout corrupting JSON. */
function runNodeTsx(
  scriptRelative: string,
  cwd: string,
): { ok: boolean; stdout: string; stderr: string; status: number | null } {
  const scriptAbs = path.join(cwd, scriptRelative);
  const r = spawnSync(process.execPath, ["--import", "tsx", scriptAbs], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    ok: r.status === 0,
    stdout: String(r.stdout ?? ""),
    stderr: String(r.stderr ?? ""),
    status: r.status,
  };
}

function smokeCheckSummary(stdout: string): {
  runtime_status: string;
  deploy_sync_status: string;
} {
  try {
    const j = parseJsonStdout(stdout) as Record<string, unknown>;
    return {
      runtime_status: typeof j.runtime_status === "string" ? j.runtime_status : "UNKNOWN",
      deploy_sync_status: typeof j.deploy_sync_status === "string" ? j.deploy_sync_status : "UNKNOWN",
    };
  } catch {
    return { runtime_status: "UNKNOWN", deploy_sync_status: "UNKNOWN" };
  }
}

function deployLaneLine(v2: Record<string, unknown>): string {
  const d = v2.deploy_live_site_status;
  if (!isRecord(d)) {
    return "deploy_live_site_status: UNKNOWN (missing)";
  }
  const status = typeof d.status === "string" ? d.status : "UNKNOWN";
  const mon = d.live_site_monitor;
  let sync = "UNKNOWN";
  if (isRecord(mon) && typeof mon.deploy_sync_status === "string") {
    sync = mon.deploy_sync_status;
  } else if (mon === null) {
    sync = "UNKNOWN (live_site_monitor null — artifact not loaded for Command Center)";
  }
  return `deploy_live_site.status=${status} deploy_sync_status=${sync}`;
}

export function main(): number {
  const rootDir = process.cwd();
  console.log("=== BuckParts operator proof ===\n");

  console.log("[git]");
  const st = runGit(["status", "-sb"], rootDir);
  console.log(st.ok ? st.out : `(git status failed)\n${st.out}`);
  const head = runGit(["rev-parse", "--short", "HEAD"], rootDir);
  const br = runGit(["rev-parse", "--abbrev-ref", "HEAD"], rootDir);
  console.log(`HEAD: ${head.ok ? head.out : "UNKNOWN"}`);
  console.log(`branch: ${br.ok ? br.out : "UNKNOWN"}`);
  console.log("");

  console.log("[npm run build]");
  const build = runNpm("build", rootDir);
  if (!build.ok) {
    process.stderr.write(build.stderr || build.stdout);
    console.log("\nRESULT: BUILD_FAILED (exit nonzero)");
    return 1;
  }
  console.log("RESULT: OK\n");

  console.log("[live-site-smoke-check] node --import tsx scripts/live-site-smoke-check.ts (read-only; no durable_write)");
  const smoke = runNodeTsx("scripts/live-site-smoke-check.ts", rootDir);
  if (!smoke.ok) {
    process.stderr.write(smoke.stderr || smoke.stdout);
    console.log("\nRESULT: LIVE_SITE_SMOKE_CHECK_FAILED");
    return 1;
  }
  const sm = smokeCheckSummary(smoke.stdout);
  console.log(`runtime_status: ${sm.runtime_status}`);
  console.log(`deploy_sync_status (from check stdout): ${sm.deploy_sync_status}`);
  console.log(
    "durable_write: UNKNOWN — this path does not run `buckparts:live-site-smoke` (no Supabase/file durable capture).",
  );
  console.log("");

  console.log("[command-center] node --import tsx scripts/report-buckparts-command-center.ts");
  const cc = runNodeTsx("scripts/report-buckparts-command-center.ts", rootDir);
  if (!cc.ok) {
    process.stderr.write(cc.stderr || cc.stdout);
    console.log("\nRESULT: COMMAND_CENTER_FAILED");
    return 1;
  }
  let report: unknown;
  try {
    report = parseJsonStdout(cc.stdout);
  } catch (e) {
    console.error("[command-center] stdout is not parseable JSON:", e);
    return 1;
  }

  const v2 = getCommandCenterV2FromReport(report);
  if (!v2) {
    console.error("command_center_v2 missing on parsed report");
    return 1;
  }

  console.log(deployLaneLine(v2));
  console.log(
    "deploy_sync_status (truth): if Command Center shows UNKNOWN above, treat full deploy sync as UNKNOWN until a live_site_monitor artifact is present.",
  );
  console.log("");

  const extracted = extractTopOfGameFoundationScorecardV1(report);
  if (!extracted.ok) {
    console.error(`[top_of_game_foundation_scorecard_v1] ${extracted.error}`);
    return 1;
  }
  const { scorecard } = extracted;
  console.log("[top_of_game_foundation_scorecard_v1]");
  console.log(`contract: ${scorecard.contract}`);
  console.log(`runtime_status: ${scorecard.runtime_status}`);
  console.log(`foundation_maturity_score_100: ${scorecard.foundation_maturity_score_100}`);
  console.log(`goal_reached: ${scorecard.goal_reached}`);
  console.log("lanes (lane_id, status, score_contribution/max_contribution, label):");
  for (const lane of scorecard.lanes) {
    console.log(`  ${formatScorecardLaneLine(lane)}`);
  }
  console.log(`next_best_foundation_move: ${scorecard.next_best_foundation_move}`);
  console.log("");

  const nextOwner =
    typeof v2.next_owner_action === "string" ? v2.next_owner_action : "UNKNOWN (next_owner_action missing)";
  const rootNextRaw = isRecord(report) && typeof report.next_best_action === "string" ? report.next_best_action : "";
  const rootNext = rootNextRaw.trim() ? rootNextRaw : "UNKNOWN (next_best_action missing)";
  const consolidated =
    rootNextRaw.trim() !== ""
      ? rootNextRaw.trim()
      : scorecard.next_best_foundation_move.trim() !== ""
        ? scorecard.next_best_foundation_move
        : nextOwner;
  console.log("[next actions]");
  console.log(`command_center_v2.next_owner_action: ${nextOwner}`);
  console.log(`report.next_best_action: ${rootNext}`);
  console.log(`NEXT_BEST_ACTION (consolidated): ${consolidated}`);
  console.log("");
  console.log("RESULT: OK");
  return 0;
}

const entryHref = pathToFileURL(path.resolve(process.argv[1] ?? "")).href;
if (import.meta.url === entryHref) {
  process.exitCode = main();
}
