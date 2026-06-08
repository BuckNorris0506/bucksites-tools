import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDangerousMappingRemediationPlanV1,
  writeDangerousMappingRemediationPlanArtifactsV1,
} from "./lib/dangerous-mapping-remediation-plan-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildDangerousMappingRemediationPlanV1({ rootDir });

  if (process.argv.includes("--write-artifacts")) {
    writeDangerousMappingRemediationPlanArtifactsV1({ rootDir, report });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
