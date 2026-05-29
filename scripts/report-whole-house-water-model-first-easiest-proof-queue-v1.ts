import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildWholeHouseWaterModelFirstEasiestProofQueueV1 } from "./lib/whole-house-water-model-first-easiest-proof-queue-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
