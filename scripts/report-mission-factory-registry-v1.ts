/**
 * MISSION_FACTORY_REGISTRY_V1 report — stdout JSON; optional TTL enforcement write-back.
 *
 *   npm run buckparts:mission-factory-registry
 *   npm run buckparts:mission-factory-registry -- --enforce-ttl
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMissionFactoryRegistryReportV1,
  enforceMissionFactoryRegistryTtlV1,
  loadMissionFactoryRegistryV1,
  saveMissionFactoryRegistryV1,
} from "./lib/mission-factory-registry-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  if (process.argv.includes("--enforce-ttl")) {
    const loaded = loadMissionFactoryRegistryV1(ROOT);
    const enforced = enforceMissionFactoryRegistryTtlV1({ doc: loaded });
    saveMissionFactoryRegistryV1(ROOT, enforced.doc);
  }

  const report = buildMissionFactoryRegistryReportV1({ rootDir: ROOT });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
