import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBadMappingCorrectionBatchRunnerV1,
  writeBadMappingCorrectionBatchRunnerArtifactsV1,
} from "./lib/bad-mapping-correction-batch-runner-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildBadMappingCorrectionBatchRunnerV1({ rootDir });

  if (process.argv.includes("--write-artifacts")) {
    writeBadMappingCorrectionBatchRunnerArtifactsV1({ rootDir, report });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
