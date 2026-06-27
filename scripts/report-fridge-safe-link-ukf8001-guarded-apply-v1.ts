#!/usr/bin/env node
/**
 * ukf8001 guarded CSV apply bridge — dry-run by default.
 *
 *   npm run buckparts:fridge-safe-link-ukf8001-guarded-apply
 *   npm run buckparts:fridge-safe-link-ukf8001-guarded-apply -- --write-csv  (BLOCKED until founder approval)
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_CONTRACT_V1,
  parseFridgeSafeLinkUkf8001GuardedApplyCliArgsV1,
  runFridgeSafeLinkUkf8001GuardedApplyV1,
} from "./lib/fridge-safe-link-ukf8001-guarded-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  void (async () => {
    const { writeCsv } = parseFridgeSafeLinkUkf8001GuardedApplyCliArgsV1(process.argv.slice(2));
    const report = await runFridgeSafeLinkUkf8001GuardedApplyV1({
      rootDir: REPO_ROOT,
      writeCsv,
    });

    process.stderr.write(
      `${report.bridge_status}: slug=${report.target_slug} write_csv_applied=${String(report.write_csv_applied)} founder_missing=${String(report.founder_decision_missing)} blockers=${String(report.blockers.length)}\n`,
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

    if (report.contract !== FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_CONTRACT_V1) {
      process.exitCode = 2;
      return;
    }
    if (report.bridge_status === "BLOCKED") {
      process.exitCode = 1;
    }
  })();
}

main();
