/**
 * Read-only Executive Work Queue v1 — JSON stdout.
 *
 * Machine-parseable:
 *   node --import tsx scripts/report-buckparts-executive-work-queue-v1.ts
 *
 * Splits discovered work into EXECUTABLE WORK and BLOCKED WORK.
 * Not ranking. Not dispatch. No mutation.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  discoverExecutiveWorkQueueV1,
  type ExecutiveWorkQueueSnapshotV1,
} from "./lib/buckparts-executive-work-queue-v1";

export async function runReportBuckpartsExecutiveWorkQueueV1(
  rootDir: string = process.cwd(),
): Promise<ExecutiveWorkQueueSnapshotV1> {
  return discoverExecutiveWorkQueueV1({ rootDir });
}

async function printReport(rootDir?: string): Promise<void> {
  const snapshot = await runReportBuckpartsExecutiveWorkQueueV1(rootDir);
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
