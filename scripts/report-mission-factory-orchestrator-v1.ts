/**
 * MISSION_FACTORY_ORCHESTRATOR_V1 report — stdout JSON; optional registry + dispatch write-back.
 *
 *   npm run buckparts:mission-factory-orchestrator
 *   npm run buckparts:mission-factory-orchestrator -- --confirm-orchestrate
 *   npm run buckparts:mission-factory-orchestrator -- --max-parallel-dispatches 5
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MISSION_FACTORY_ORCHESTRATOR_DEFAULT_MAX_PARALLEL_DISPATCHES_V1,
  runMissionFactoryOrchestratorV1,
} from "./lib/mission-factory-orchestrator-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseMaxParallel(argv: string[]): number {
  const flagIndex = argv.findIndex((arg) => arg === "--max-parallel-dispatches");
  if (flagIndex >= 0 && argv[flagIndex + 1]) {
    const parsed = Number.parseInt(argv[flagIndex + 1]!, 10);
    if (Number.isFinite(parsed) && parsed >= 1) return parsed;
  }
  return MISSION_FACTORY_ORCHESTRATOR_DEFAULT_MAX_PARALLEL_DISPATCHES_V1;
}

function main(): void {
  const argv = process.argv.slice(2);
  const { report } = runMissionFactoryOrchestratorV1({
    rootDir: ROOT,
    confirmOrchestrate: argv.includes("--confirm-orchestrate"),
    maxParallelDispatches: parseMaxParallel(argv),
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
