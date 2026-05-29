import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildWedgeTruthSpineCoverageMatrixV1 } from "./lib/wedge-truth-spine-coverage-matrix-v1";

/**
 * Standalone wedge truth spine coverage matrix JSON stdout.
 * jq proof (flat): `.inspect_summary`
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildWedgeTruthSpineCoverageMatrixV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
