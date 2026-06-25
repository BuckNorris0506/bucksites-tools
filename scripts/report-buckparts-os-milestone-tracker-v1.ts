/**
 * Read-only BuckParts OS Milestone Tracker report — stdout JSON only.
 *
 *   npm run buckparts:os-milestone-tracker
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildBuckPartsOsMilestoneTrackerReportV1 } from "./lib/buckparts-os-milestone-tracker-v1";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildBuckPartsOsMilestoneTrackerReportV1({ rootDir: REPO_ROOT });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
