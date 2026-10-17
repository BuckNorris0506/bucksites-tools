/**
 * Read-only Executive Work Blockers v1 — JSON stdout.
 *
 * Machine-parseable:
 *   node --import tsx scripts/report-buckparts-executive-work-blockers-v1.ts
 *
 * Ranks autonomy blockers only. Not dispatch. Not mutation. Not business ranking.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  discoverExecutiveWorkBlockersV1,
  type ExecutiveWorkBlockersSnapshotV1,
} from "./lib/buckparts-executive-work-blockers-v1";

export async function runReportBuckpartsExecutiveWorkBlockersV1(
  rootDir: string = process.cwd(),
): Promise<ExecutiveWorkBlockersSnapshotV1> {
  return discoverExecutiveWorkBlockersV1({ rootDir });
}

async function printReport(rootDir?: string): Promise<void> {
  const snapshot = await runReportBuckpartsExecutiveWorkBlockersV1(rootDir);
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
