import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildApModelFirstEvidenceQueueV1Report } from "./lib/ap-model-first-evidence-queue-v1";
import { buildAirPurifierModelFirstProductionLaneV1Report } from "./lib/air-purifier-model-first-production-lane-v1";
import { buildAirPurifierWeakBuyerPathAuditV1Report } from "./lib/air-purifier-weak-buyer-path-audit-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir });
  const report = buildApModelFirstEvidenceQueueV1Report({
    rootDir,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
