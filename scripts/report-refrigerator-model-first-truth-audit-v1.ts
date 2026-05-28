import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRefrigeratorModelFirstTruthAuditV1 } from "./lib/refrigerator-model-first-truth-audit-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildRefrigeratorModelFirstTruthAuditV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();

