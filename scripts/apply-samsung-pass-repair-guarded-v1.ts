import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runSamsungPassRepairGuardedApplyV1,
  writeSamsungPassRepairGuardedApplyReportV1,
} from "./lib/samsung-pass-repair-guarded-apply-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
  const report = runSamsungPassRepairGuardedApplyV1({ rootDir, mode });

  if (process.argv.includes("--write-report") || mode === "apply") {
    writeSamsungPassRepairGuardedApplyReportV1({ rootDir, report });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.apply_status === "BLOCKED") {
    process.exitCode = 1;
  }
}

main();
