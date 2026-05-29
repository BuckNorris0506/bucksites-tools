import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WHW_AP810_LIVE_BROWSER_RESULT_REL_V1,
  buildWhw3mAp810LiveBrowserEvidenceV1,
  writeWhwModelFirstEvidenceResultV1,
} from "./lib/whole-house-water-model-first-evidence-result-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv: string[]): { write: boolean } {
  return { write: argv.includes("--write") };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const result = buildWhw3mAp810LiveBrowserEvidenceV1();

  let artifactRel: string | null = null;
  if (args.write) {
    artifactRel = writeWhwModelFirstEvidenceResultV1({ rootDir, result });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        artifact_rel: artifactRel ?? WHW_AP810_LIVE_BROWSER_RESULT_REL_V1,
        write_requested: args.write,
        contract: result.contract,
        packet_id: result.packet_id,
        read_only: result.read_only,
        data_mutation: result.data_mutation,
        evidence_mode: result.evidence_mode,
        anchor_model_slug: result.anchor_model_slug,
        anchor_filter_slug: result.anchor_filter_slug,
        evidence_status_counts: result.evidence_status_counts,
        recommended_csv_mutation: result.recommended_csv_mutation,
        candidate_buyer_path_statuses: result.candidate_buyer_paths.map((p) => ({
          url: p.url,
          status: p.status,
        })),
      },
      null,
      2,
    )}\n`,
  );
}

main();
