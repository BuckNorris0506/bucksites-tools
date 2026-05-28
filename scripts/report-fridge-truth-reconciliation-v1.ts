import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildFridgeTruthReconciliationV1 } from "./lib/fridge-truth-reconciliation-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildFridgeTruthReconciliationV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
