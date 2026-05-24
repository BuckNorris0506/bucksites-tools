import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AP_APPLY_PLAN_BATCH_V2_DEFAULT_OUT_JSON_V1,
  AP_APPLY_PLAN_BATCH_V2_DEFAULT_OUT_MD_V1,
  assertApplyPlanBatchV2OutPathAllowedV1,
  buildAirPurifierApplyPlannerBatchV2V1Report,
  parseAirPurifierApplyPlannerBatchV2CliArgsV1,
  writeApplyPlanBatchV2ArtifactsV1,
} from "./lib/air-purifier-apply-planner-batch-v2-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const cli = parseAirPurifierApplyPlannerBatchV2CliArgsV1(process.argv.slice(2));

  const report = buildAirPurifierApplyPlannerBatchV2V1Report({
    rootDir,
    resultsDir: cli.resultsDir ?? undefined,
  });

  const outPath = cli.outPath ?? AP_APPLY_PLAN_BATCH_V2_DEFAULT_OUT_JSON_V1;
  const markdownOutPath = cli.markdownOutPath ?? AP_APPLY_PLAN_BATCH_V2_DEFAULT_OUT_MD_V1;

  assertApplyPlanBatchV2OutPathAllowedV1(outPath, rootDir);
  writeApplyPlanBatchV2ArtifactsV1({
    report,
    outPath,
    markdownOutPath,
    rootDir,
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
