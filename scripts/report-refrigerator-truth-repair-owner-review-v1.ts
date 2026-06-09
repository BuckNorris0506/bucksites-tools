import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildRefrigeratorTruthRepairOwnerReviewV1,
  writeRefrigeratorTruthRepairOwnerReviewArtifactsV1,
} from "./lib/refrigerator-truth-repair-owner-review-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const packet = buildRefrigeratorTruthRepairOwnerReviewV1({ rootDir });

  if (process.argv.includes("--write-artifacts")) {
    writeRefrigeratorTruthRepairOwnerReviewArtifactsV1({ rootDir, packet });
  }

  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
}

main();
