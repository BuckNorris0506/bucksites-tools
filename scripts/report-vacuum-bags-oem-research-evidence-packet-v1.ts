import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildVacuumBagsOemResearchEvidencePacketV1 } from "./lib/vacuum-bags-oem-research-evidence-packet-v1";

/**
 * Standalone vacuum bags OEM research evidence packet JSON stdout.
 * jq proof (flat): `.inspect_summary`
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildVacuumBagsOemResearchEvidencePacketV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
