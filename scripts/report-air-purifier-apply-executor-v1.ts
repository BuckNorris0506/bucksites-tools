import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AP_APPLY_PLAN_DEFAULT_PATH_V1,
  AP_APPLY_RUN_DEFAULT_JSON_V1,
  AP_APPLY_RUN_DEFAULT_MD_V1,
  parseAirPurifierApplyExecutorCliArgsV1,
  resolveDefaultApplyRunPathsV1,
  runAirPurifierApplyExecutorV1,
  writeApplyRunArtifactsV1,
} from "./lib/air-purifier-apply-executor-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const cli = parseAirPurifierApplyExecutorCliArgsV1(process.argv.slice(2));
  const mode = cli.apply ? "apply" : "dry_run";

  const relPlanPath = cli.planPath ?? AP_APPLY_PLAN_DEFAULT_PATH_V1;
  const report = runAirPurifierApplyExecutorV1({
    rootDir,
    mode,
    planPath: relPlanPath,
  });

  const defaultRunPaths = resolveDefaultApplyRunPathsV1(relPlanPath);
  const outPath = cli.outPath ?? defaultRunPaths.jsonPath;
  const markdownOutPath = cli.markdownOutPath ?? defaultRunPaths.markdownPath;

  writeApplyRunArtifactsV1({
    report,
    outPath,
    markdownOutPath,
    rootDir,
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.apply_status === "BLOCKED") {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
