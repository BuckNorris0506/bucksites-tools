/**
 * MISSION_FACTORY_QUEUE_GENERATOR_V1 report — stdout JSON; optional registry write-back.
 *
 *   npm run buckparts:mission-factory-queue
 *   npm run buckparts:mission-factory-queue -- --write-registry
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { runMissionFactoryQueueGeneratorV1 } from "./lib/mission-factory-queue-generator-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const { report } = runMissionFactoryQueueGeneratorV1({
    rootDir: ROOT,
    writeRegistry: process.argv.includes("--write-registry"),
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
