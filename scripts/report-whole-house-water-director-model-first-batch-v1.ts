import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WHW_DIRECTOR_MODEL_FIRST_BATCH_V1_RESULT_REL_V1,
  buildWholeHouseWaterDirectorModelFirstBatchV1,
  writeWholeHouseWaterDirectorModelFirstBatchV1,
} from "./lib/whole-house-water-director-model-first-batch-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv: string[]): { write: boolean } {
  return { write: argv.includes("--write") };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const result = buildWholeHouseWaterDirectorModelFirstBatchV1({ rootDir });

  let artifactRel: string | null = null;
  let perFilterRels: string[] = [];
  if (args.write) {
    const written = writeWholeHouseWaterDirectorModelFirstBatchV1({
      rootDir,
      result,
      writePerFilterArtifacts: true,
    });
    artifactRel = written.batchRel;
    perFilterRels = written.perFilterRels;
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        artifact_rel: artifactRel ?? WHW_DIRECTOR_MODEL_FIRST_BATCH_V1_RESULT_REL_V1,
        per_filter_artifact_rels: perFilterRels,
        write_requested: args.write,
        contract: result.contract,
        packet_id: result.packet_id,
        read_only: result.read_only,
        data_mutation: result.data_mutation,
        source_batch_head_filter_slug: result.source_batch_head_filter_slug,
        batch_size: result.batch_size,
        evidence_status_counts: result.evidence_status_counts,
        buyer_path_proof_targets: result.buyer_path_proof_targets,
        parked_filter_slugs: result.parked_filter_slugs,
        csv_apply_authorized: result.csv_apply_authorized,
        whw_public_opening_authorized: result.whw_public_opening_authorized,
        filters_checked: result.filters_checked.map((row) => ({
          filter_slug: row.filter_slug,
          evidence_status: row.evidence_status,
          next_recommended_lane: row.next_recommended_lane,
          anchor_model_or_system_slug: row.anchor_model_or_system_slug,
        })),
      },
      null,
      2,
    )}\n`,
  );
}

main();
