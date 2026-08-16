/**
 * Read-only Executive Autonomy Backlog v1 — JSON stdout.
 *
 * Machine-parseable:
 *   node --import tsx scripts/report-buckparts-executive-autonomy-backlog-v1.ts
 *
 * Ranks only by proven autonomy gained. Not dispatch. Not mutation. Not a product roadmap.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  discoverExecutiveAutonomyBacklogV1,
  type ExecutiveAutonomyBacklogSnapshotV1,
} from "./lib/buckparts-executive-autonomy-backlog-v1";

export async function runReportBuckpartsExecutiveAutonomyBacklogV1(
  rootDir: string = process.cwd(),
): Promise<ExecutiveAutonomyBacklogSnapshotV1> {
  return discoverExecutiveAutonomyBacklogV1({ rootDir });
}

async function printReport(rootDir?: string): Promise<void> {
  const snapshot = await runReportBuckpartsExecutiveAutonomyBacklogV1(rootDir);
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
