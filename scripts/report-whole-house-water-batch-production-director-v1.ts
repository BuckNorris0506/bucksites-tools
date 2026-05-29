import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildWholeHouseWaterBatchProductionDirectorV1 } from "./lib/whole-house-water-batch-production-director-v1";

/**
 * Standalone WHW batch production director JSON stdout.
 * jq proof (flat): `.inspect_summary` — see recommended_jq_paths in output.
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
