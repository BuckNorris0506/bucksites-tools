/**
 * Read-only Executive Action Discovery v1 — JSON stdout.
 *
 * Machine-parseable:
 *   node --import tsx scripts/report-buckparts-executive-action-discovery-v1.ts
 *
 * Not ranking. Not dispatch. Not an NBA. No mutation.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  discoverExecutiveActionsV1,
  type ExecutiveActionDiscoverySnapshotV1,
} from "./lib/buckparts-executive-action-discovery-v1";

export function runReportBuckpartsExecutiveActionDiscoveryV1(
  rootDir: string = process.cwd(),
): ExecutiveActionDiscoverySnapshotV1 {
  return discoverExecutiveActionsV1(rootDir);
}

function printReport(rootDir?: string): void {
  const snapshot = runReportBuckpartsExecutiveActionDiscoveryV1(rootDir);
  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  printReport();
}
