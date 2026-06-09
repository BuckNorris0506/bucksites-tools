import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRefrigeratorTruthScoreboardV1 } from "./lib/refrigerator-truth-scoreboard-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildRefrigeratorTruthScoreboardV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.counts.wrong_part_risk_count > 0) {
    process.exitCode = 1;
  }
}

main();
