import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSamsungPassRepairApplyPlanV1,
  writeSamsungPassRepairApplyPlanArtifactsV1,
} from "./lib/samsung-pass-repair-apply-plan-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const plan = buildSamsungPassRepairApplyPlanV1({ rootDir });

  if (process.argv.includes("--write-artifacts")) {
    writeSamsungPassRepairApplyPlanArtifactsV1({ rootDir, plan });
  }

  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

main();
