#!/usr/bin/env node
/**
 * Production mission plan resolver — stdout JSON.
 *
 *   npm run buckparts:production-mission-plan
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BUCKPARTS_PRODUCTION_MISSION_PLAN_CONTRACT_V1,
  buildProductionMissionPlanV1,
} from "./lib/buckparts-production-mission-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const plan = await buildProductionMissionPlanV1({ rootDir });
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  if (plan.contract !== BUCKPARTS_PRODUCTION_MISSION_PLAN_CONTRACT_V1) {
    process.exit(2);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
