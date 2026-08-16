import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildApModelFirstEvidenceQueueV1Report } from "./lib/ap-model-first-evidence-queue-v1";
import { writeTopCandidateModelFirstEvidenceResultIfGrantActiveV1 } from "./lib/ap-model-first-evidence-result-write-from-queue-v1";
import {
  parseApModelFirstEvidenceQueueReporterArgsV1,
  writeCompletedCandidateLiveBrowserEvidenceIfGrantActiveV1,
} from "./lib/air-purifier-model-first-live-browser-from-collector-v1";
import { buildAirPurifierModelFirstProductionLaneV1Report } from "./lib/air-purifier-model-first-production-lane-v1";
import { buildAirPurifierWeakBuyerPathAuditV1Report } from "./lib/air-purifier-weak-buyer-path-audit-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const args = parseApModelFirstEvidenceQueueReporterArgsV1(process.argv.slice(2));
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir });
  const report = buildApModelFirstEvidenceQueueV1Report({
    rootDir,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });

  const resultWrite = args.live_browser_only
    ? {
        skipped: true,
        reason: "live_browser_only",
      }
    : writeTopCandidateModelFirstEvidenceResultIfGrantActiveV1({
        rootDir,
        queue: report,
      });

  const liveBrowserWrite = await writeCompletedCandidateLiveBrowserEvidenceIfGrantActiveV1({
    rootDir,
    queue: report,
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.stderr.write(
    `${JSON.stringify({
      model_first_evidence_result_write: resultWrite,
      model_first_live_browser_write: liveBrowserWrite,
    })}\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
