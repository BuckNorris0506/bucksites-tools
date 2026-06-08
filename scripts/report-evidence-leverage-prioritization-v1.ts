import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildEvidenceLeveragePrioritizationV1,
  writeEvidenceLeveragePrioritizationArtifactsV1,
} from "./lib/evidence-leverage-prioritization-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildEvidenceLeveragePrioritizationV1({ rootDir });

  if (process.argv.includes("--write-artifacts")) {
    writeEvidenceLeveragePrioritizationArtifactsV1({ rootDir, report });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
