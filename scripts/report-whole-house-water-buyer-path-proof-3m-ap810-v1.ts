import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WHW_AP810_BUYER_PATH_RESULT_REL_V1,
  buildWhw3mAp810BuyerPathProofV1,
  writeWhwBuyerPathProofResultV1,
} from "./lib/whole-house-water-buyer-path-proof-result-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv: string[]): { write: boolean } {
  return { write: argv.includes("--write") };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const result = buildWhw3mAp810BuyerPathProofV1({ rootDir });

  let artifactRel: string | null = null;
  if (args.write) {
    artifactRel = writeWhwBuyerPathProofResultV1({ rootDir, result });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        artifact_rel: artifactRel ?? WHW_AP810_BUYER_PATH_RESULT_REL_V1,
        write_requested: args.write,
        contract: result.contract,
        packet_id: result.packet_id,
        read_only: result.read_only,
        data_mutation: result.data_mutation,
        evidence_mode: result.evidence_mode,
        anchor_filter_slug: result.anchor_filter_slug,
        evidence_status_counts: result.evidence_status_counts,
        recommended_csv_mutation: result.recommended_csv_mutation,
        best_truthful_buyer_path: result.best_truthful_buyer_path,
        buyer_pass_count: result.evidence_status_counts.PASS,
      },
      null,
      2,
    )}\n`,
  );
}

main();
