import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1,
  buildWhwModelFirstBatchEvidenceV1,
  writeWhwModelFirstBatchEvidenceResultV1,
} from "./lib/whole-house-water-model-first-batch-evidence-result-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv: string[]): { write: boolean } {
  return { write: argv.includes("--write") };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const result = buildWhwModelFirstBatchEvidenceV1({ rootDir });

  let artifactRel: string | null = null;
  if (args.write) {
    artifactRel = writeWhwModelFirstBatchEvidenceResultV1({ rootDir, result });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        artifact_rel: artifactRel ?? WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1,
        write_requested: args.write,
        contract: result.contract,
        packet_id: result.packet_id,
        read_only: result.read_only,
        data_mutation: result.data_mutation,
        evidence_mode: result.evidence_mode,
        source_queue_head: result.source_queue_head,
        evidence_status_counts: result.evidence_status_counts,
        candidate_outcomes: result.candidate_outcomes,
        recommended_csv_mutations: result.recommended_csv_mutations,
        safe_apply_authorized: result.safe_apply_authorized,
        candidates_checked: result.candidates_checked.map((c) => ({
          filter_slug: c.filter_slug,
          model_proof_status: c.model_proof_status,
          buyer_path_status: c.buyer_path_status,
          candidate_outcome: c.candidate_outcome,
        })),
      },
      null,
      2,
    )}\n`,
  );
}

main();
