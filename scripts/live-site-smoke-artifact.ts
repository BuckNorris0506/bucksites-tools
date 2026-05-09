import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { buildLiveSiteMonitorArtifact } from "./lib/live-site-smoke";
import {
  OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE,
  writeOwnerArtifactToSupabase,
} from "@/lib/owner-dashboard/gsc-durable-artifact-store";
import type { LiveSiteMonitorV1 } from "./lib/buckparts-command-center-v2-types";

export async function runLiveSiteSmokeJob(rootDir = process.cwd()): Promise<{
  output_path: string;
  artifact: LiveSiteMonitorV1;
  durable_write:
    | { status: "OK"; sink: "SUPABASE"; details: string[] }
    | { status: "UNKNOWN_SUPABASE_WRITE"; details: string[] };
}> {
  loadEnv(rootDir);
  const artifact = await buildLiveSiteMonitorArtifact({
    cwd: rootDir,
    fetchFn: fetch,
    env: process.env,
    nowIso: new Date().toISOString(),
    source: "scripts/live-site-smoke-artifact.ts",
    execSync: (cmd, o) => execSync(cmd, o),
  });

  const outputPath = path.resolve(rootDir, "data/reports/buckparts-live-site-smoke.json");
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  const durableWrite = await writeOwnerArtifactToSupabase({
    artifact_key: OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE,
    status: artifact.runtime_status,
    fetched_at: artifact.checked_at,
    payload: artifact,
    source: "scripts/live-site-smoke-artifact.ts",
  });

  return {
    output_path: outputPath,
    artifact,
    durable_write: durableWrite.ok
      ? { status: "OK", sink: durableWrite.sink, details: durableWrite.details }
      : { status: "UNKNOWN_SUPABASE_WRITE", details: durableWrite.details },
  };
}

export async function main(): Promise<void> {
  const result = await runLiveSiteSmokeJob();
  process.stdout.write(
    `${JSON.stringify(
      {
        output_path: result.output_path,
        runtime_status: result.artifact.runtime_status,
        checked_at: result.artifact.checked_at,
        deploy_sync_status: result.artifact.deploy_sync_status,
        durable_write: result.durable_write,
      },
      null,
      2,
    )}\n`,
  );
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch(() => {
    console.error("[live-site-smoke-artifact] failed");
    process.exit(1);
  });
}
