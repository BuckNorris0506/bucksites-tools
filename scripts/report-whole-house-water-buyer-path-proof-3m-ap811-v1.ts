import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WHW_AP811_BUYER_PATH_RESULT_REL_V1,
  buildWhw3mAp811BatchBuyerPathProofV1,
  writeWhwBatchBuyerPathProofResultV1,
} from "./lib/whole-house-water-batch-buyer-path-proof-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv: string[]): { write: boolean } {
  return { write: argv.includes("--write") };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const result = buildWhw3mAp811BatchBuyerPathProofV1({ rootDir });

  let artifactRel: string | null = null;
  if (args.write) {
    artifactRel = writeWhwBatchBuyerPathProofResultV1({ rootDir, result });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        artifact_rel: artifactRel ?? WHW_AP811_BUYER_PATH_RESULT_REL_V1,
        write_requested: args.write,
        contract: result.contract,
        packet_id: result.packet_id,
        read_only: result.read_only,
        data_mutation: result.data_mutation,
        evidence_mode: result.evidence_mode,
        anchor_filter_slug: result.anchor_filter_slug,
        anchor_model_slug: result.anchor_model_slug,
        source_model_first_batch_artifact: result.source_model_first_batch_artifact,
        model_first_fit_status: result.model_first_fit_status,
        evidence_status_counts: result.evidence_status_counts,
        recommended_csv_mutation: result.recommended_csv_mutation,
        safe_apply_authorized: result.safe_apply_authorized,
        whw_public_opening_authorized: result.whw_public_opening_authorized,
        best_truthful_buyer_path: result.best_truthful_buyer_path,
        buyer_path_sources_checked: result.buyer_path_candidates.map((c) => ({
          url: c.url,
          retailer_or_source: c.retailer_or_source,
          listing_kind: c.listing_kind,
          status: c.status,
        })),
      },
      null,
      2,
    )}\n`,
  );
}

main();
