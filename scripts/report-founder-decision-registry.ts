/**
 * Read-only report: JSON files under `data/owner-decisions/*.json` → Founder Decision Registry Read Model v1 on stdout.
 * PROVEN: stdout only; no writes; README.md and .gitkeep ignored by extension filter.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFounderDecisionRegistryReadModelV1,
  type FounderDecisionRegistryReadModelV1,
} from "../src/lib/owner-dashboard/founder-decision-registry-read-model-v1";
import { scanFounderDecisionRegistryJsonFilesV1 } from "../src/lib/owner-dashboard/founder-decision-registry-scan-v1";

/** PROVEN: pure read + model build; caller may pass alternate repo root (e.g. tests). */
export function runReportFounderDecisionRegistryV1(rootDir: string = process.cwd()): FounderDecisionRegistryReadModelV1 {
  const now = new Date().toISOString();
  const files = scanFounderDecisionRegistryJsonFilesV1(rootDir);
  return buildFounderDecisionRegistryReadModelV1(files, {
    generated_at: now,
    reference_time_iso: now,
  });
}

function printReportFounderDecisionRegistryV1(rootDir?: string): void {
  const model = runReportFounderDecisionRegistryV1(rootDir);
  process.stdout.write(`${JSON.stringify(model, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  printReportFounderDecisionRegistryV1();
}
