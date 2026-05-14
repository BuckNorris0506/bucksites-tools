/**
 * Read-only BuckParts Operating Map v1 — JSON to stdout (no DB, no file writes).
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildBuckpartsOperatingMapV1, readPackageJsonForOperatingMap } from "./lib/buckparts-operating-map-v1";

export function runReportBuckpartsOperatingMap(): ReturnType<typeof buildBuckpartsOperatingMapV1> {
  const repoRoot = process.cwd();
  const packageJsonText = readPackageJsonForOperatingMap(repoRoot);
  return buildBuckpartsOperatingMapV1({
    generated_at: new Date().toISOString(),
    packageJsonText,
    repoRoot,
  });
}

function main(): void {
  const report = runReportBuckpartsOperatingMap();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
