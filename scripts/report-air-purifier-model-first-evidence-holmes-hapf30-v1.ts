import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildApModelFirstEvidenceQueueV1Report } from "./lib/ap-model-first-evidence-queue-v1";
import {
  AP_MODEL_FIRST_HOLMES_HAPF30_RESULT_REL_V1,
  buildHolmesHapf30ModelFirstEvidenceFromQueueV1,
} from "./lib/air-purifier-model-first-evidence-result-v1";
import { buildAirPurifierModelFirstProductionLaneV1Report } from "./lib/air-purifier-model-first-production-lane-v1";
import { buildAirPurifierWeakBuyerPathAuditV1Report } from "./lib/air-purifier-weak-buyer-path-audit-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir });
  const queue = buildApModelFirstEvidenceQueueV1Report({
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });

  const result = buildHolmesHapf30ModelFirstEvidenceFromQueueV1({
    rootDir,
    queue,
    writeResult: true,
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        artifact_rel: AP_MODEL_FIRST_HOLMES_HAPF30_RESULT_REL_V1,
        contract: result.contract,
        packet_id: result.packet_id,
        read_only: result.read_only,
        data_mutation: result.data_mutation,
        evidence_status_counts: result.evidence_status_counts,
        recommended_csv_mutation: result.recommended_csv_mutation,
        model_slugs_checked: result.model_rows.map((r) => r.model_slug),
      },
      null,
      2,
    )}\n`,
  );
}

main();
