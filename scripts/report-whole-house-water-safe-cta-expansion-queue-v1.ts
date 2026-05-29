import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildWholeHouseWaterSafeCtaExpansionQueueV1 } from "./lib/whole-house-water-safe-cta-expansion-queue-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildWholeHouseWaterSafeCtaExpansionQueueV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
