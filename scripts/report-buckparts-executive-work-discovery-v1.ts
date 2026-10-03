/**
 * Read-only Executive Work Discovery v1 — JSON stdout.
 *
 * Machine-parseable:
 *   node --import tsx scripts/report-buckparts-executive-work-discovery-v1.ts
 *
 * Discovers business work, not commands. Not ranking. Not dispatch. No mutation.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  discoverExecutiveWorkV1,
  type ExecutiveWorkDiscoverySnapshotV1,
} from "./lib/buckparts-executive-work-discovery-v1";

export async function runReportBuckpartsExecutiveWorkDiscoveryV1(
  rootDir: string = process.cwd(),
): Promise<ExecutiveWorkDiscoverySnapshotV1> {
  return discoverExecutiveWorkV1({ rootDir });
}

async function printReport(rootDir?: string): Promise<void> {
  const snapshot = await runReportBuckpartsExecutiveWorkDiscoveryV1(rootDir);
  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  printReport().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
