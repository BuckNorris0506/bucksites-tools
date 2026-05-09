import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { buildLiveSiteMonitorArtifact } from "./lib/live-site-smoke";
import type { LiveSiteMonitorV1 } from "./lib/buckparts-command-center-v2-types";

type ExecSyncLike = (cmd: string, o: { cwd: string; encoding: "utf8" }) => string;

export async function runLiveSiteSmokeCheck(
  rootDir = process.cwd(),
  options: {
    env?: NodeJS.ProcessEnv;
    execSync?: ExecSyncLike;
    fetchFn?: typeof fetch;
    loadEnvFn?: (rootDir: string) => void;
    nowIso?: string;
    source?: string;
  } = {},
): Promise<LiveSiteMonitorV1> {
  const loadEnvFn = options.loadEnvFn ?? loadEnv;
  loadEnvFn(rootDir);

  return buildLiveSiteMonitorArtifact({
    cwd: rootDir,
    fetchFn: options.fetchFn ?? fetch,
    env: options.env ?? process.env,
    nowIso: options.nowIso ?? new Date().toISOString(),
    source: options.source ?? "scripts/live-site-smoke-check.ts",
    execSync: options.execSync ?? ((cmd, o) => execSync(cmd, o)),
  });
}

export async function main(): Promise<void> {
  const artifact = await runLiveSiteSmokeCheck();
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch(() => {
    console.error("[live-site-smoke-check] failed");
    process.exit(1);
  });
}
