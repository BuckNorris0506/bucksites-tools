#!/usr/bin/env node
/**
 * Read-only BuckParts security gate — repository and deploy-readiness evaluation.
 *
 *   npm run buckparts:security-gate
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  BUCKPARTS_SECURITY_GATE_CONTRACT_V1,
  buildBuckpartsSecurityGateReportV1,
  writeBuckpartsSecurityGateArtifactsV1,
} from "./lib/buckparts-security-gate-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildBuckpartsSecurityGateReportV1({ rootDir: REPO_ROOT });
  const written = writeBuckpartsSecurityGateArtifactsV1({ rootDir: REPO_ROOT, report });

  process.stderr.write(
    `Wrote ${written.jsonRelPath} and ${written.mdRelPath} (read-only audit artifacts only).\n`,
  );

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== BUCKPARTS_SECURITY_GATE_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
