import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildBuckpartsMarketingIntelligenceEngineV1Report } from "./lib/buckparts-marketing-intelligence-engine-v1";
import { buildDemandToCoverageNextLaneV1Report } from "./lib/demand-to-coverage-next-lane-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir });
  const report = await buildBuckpartsMarketingIntelligenceEngineV1Report({
    rootDir,
    demandToCoverageNextLane: demand,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
