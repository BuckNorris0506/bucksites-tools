import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { buildApModelFirstEvidenceQueueV1Report } from "./lib/ap-model-first-evidence-queue-v1";
import {
  AP_MODEL_FIRST_HOLMES_HAPF30_RESULT_REL_V1,
  buildHolmesHapf30ModelFirstEvidenceFromQueueV1,
} from "./lib/air-purifier-model-first-evidence-result-v1";
import { buildAirPurifierModelFirstProductionLaneV1Report } from "./lib/air-purifier-model-first-production-lane-v1";
import { buildAirPurifierWeakBuyerPathAuditV1Report } from "./lib/air-purifier-weak-buyer-path-audit-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv: string[]): { write: boolean; outDir: string | null } {
  let write = false;
  let outDir: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--write") {
      write = true;
      continue;
    }
    if (arg === "--out-dir") {
      outDir = argv[i + 1] ?? null;
      i += 1;
    }
  }
  return { write, outDir };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir });
  const queue = buildApModelFirstEvidenceQueueV1Report({
    rootDir,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });

  const result = buildHolmesHapf30ModelFirstEvidenceFromQueueV1({
    rootDir,
    queue,
    writeResult: false,
  });

  let artifactRel: string | null = null;
  if (args.write) {
    if (args.outDir) {
      const absOutDir = path.isAbsolute(args.outDir) ? args.outDir : path.join(rootDir, args.outDir);
      mkdirSync(absOutDir, { recursive: true });
      const outPath = path.join(absOutDir, "ap-model-first-holmes-hapf30-v1.results.json");
      writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
      artifactRel = path.relative(rootDir, outPath) || outPath;
    } else {
      const abs = path.join(rootDir, AP_MODEL_FIRST_HOLMES_HAPF30_RESULT_REL_V1);
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, `${JSON.stringify(result, null, 2)}\n`, "utf8");
      artifactRel = AP_MODEL_FIRST_HOLMES_HAPF30_RESULT_REL_V1;
    }
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        artifact_rel: artifactRel,
        write_requested: args.write,
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
