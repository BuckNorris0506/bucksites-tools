import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildModelFilterCorrectnessAuditV1,
  writeModelFilterCorrectnessAuditArtifactsV1,
} from "./lib/model-filter-correctness-audit-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildModelFilterCorrectnessAuditV1({ rootDir });

  if (process.argv.includes("--write-artifacts")) {
    writeModelFilterCorrectnessAuditArtifactsV1({ rootDir, report });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.factory_scaling.dangerous > 0) {
    process.exitCode = 1;
  }
}

main();
