import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertApplyPlanOutPathAllowedV1,
  buildAirPurifierApplyPlannerV1Report,
  parseAirPurifierApplyPlannerCliArgsV1,
  writeApplyPlanArtifactsV1,
} from "./lib/air-purifier-apply-planner-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const cli = parseAirPurifierApplyPlannerCliArgsV1(process.argv.slice(2));

  const report = buildAirPurifierApplyPlannerV1Report({
    rootDir,
    reviewPath: cli.reviewPath ?? undefined,
  });

  if (cli.outPath) {
    assertApplyPlanOutPathAllowedV1(cli.outPath, rootDir);
    writeApplyPlanArtifactsV1({
      report,
      outPath: cli.outPath,
      markdownOutPath: cli.markdownOutPath,
      rootDir,
    });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
