import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildVacuumBagsResearchSeedPacketV1 } from "./lib/vacuum-bags-research-seed-packet-v1";

/**
 * Standalone vacuum bags research seed packet JSON stdout.
 * jq proof (flat): `.inspect_summary`
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildVacuumBagsResearchSeedPacketV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
