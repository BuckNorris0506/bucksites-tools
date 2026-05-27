import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildAirPurifierModelFirstProductionLaneV1Report } from "./lib/air-purifier-model-first-production-lane-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
