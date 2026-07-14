#!/usr/bin/env node
/**
 * Read-only BuckParts C-Suite readiness audit v1.
 *
 *   npm run buckparts:c-suite-readiness-audit
 *   npm run buckparts:c-suite-readiness-audit -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuckpartsCSuiteReadinessAuditV1,
  writeBuckpartsCSuiteReadinessAuditArtifactsV1,
} from "./lib/buckparts-c-suite-readiness-audit-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function readArgValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return null;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

async function main(): Promise<void> {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const liveBaseUrl = readArgValue("--live-base-url");
  if (liveBaseUrl) {
    process.stderr.write(
      "Note: --live-base-url requested but live fetch is DISABLED_IN_V1; no production URL fetch will run.\n",
    );
  }

  const report = buildBuckpartsCSuiteReadinessAuditV1({
    rootDir: REPO_ROOT,
    liveBaseUrl,
  });

  if (writeArtifacts) {
    const written = writeBuckpartsCSuiteReadinessAuditArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only draft artifacts; data_mutation=false).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
