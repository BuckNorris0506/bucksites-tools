import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSamsungPassRepairApplyCloseoutV1,
  writeSamsungPassRepairApplyCloseoutArtifactsV1,
} from "./lib/samsung-pass-repair-apply-closeout-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const closeout = buildSamsungPassRepairApplyCloseoutV1({ rootDir });

  if (process.argv.includes("--write-artifacts")) {
    writeSamsungPassRepairApplyCloseoutArtifactsV1({ rootDir, closeout });
  }

  process.stdout.write(`${JSON.stringify(closeout, null, 2)}\n`);

  if (!closeout.closeout_verification_passed) {
    process.exitCode = 1;
  }
}

main();
