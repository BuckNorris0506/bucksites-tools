import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFamilyReconciliationV1,
  writeFamilyReconciliationArtifactsV1,
} from "./lib/family-reconciliation-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildFamilyReconciliationV1({ rootDir });

  if (process.argv.includes("--write-artifacts")) {
    writeFamilyReconciliationArtifactsV1({ rootDir, report });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
