import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1,
  buildWhw3mAp810BrowserTruthCaptureV1,
  writeWhwBrowserTruthCaptureResultV1,
} from "./lib/whole-house-water-browser-truth-capture-result-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv: string[]): { write: boolean } {
  return { write: argv.includes("--write") };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const result = buildWhw3mAp810BrowserTruthCaptureV1({ rootDir });

  let artifactRel: string | null = null;
  if (args.write) {
    artifactRel = writeWhwBrowserTruthCaptureResultV1({ rootDir, result });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        artifact_rel: artifactRel ?? WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1,
        write_requested: args.write,
        contract: result.contract,
        packet_id: result.packet_id,
        read_only: result.read_only,
        data_mutation: result.data_mutation,
        evidence_mode: result.evidence_mode,
        pass_count: result.pass_count,
        evidence_status_counts: result.evidence_status_counts,
        recommended_csv_mutations: result.recommended_csv_mutations,
        safe_apply_authorized: result.safe_apply_authorized,
        best_truthful_buyer_path: result.best_truthful_buyer_path,
        candidates_checked: result.candidates_checked.map((c) => ({
          source_url: c.source_url,
          evidence_status: c.evidence_status,
          browser_truth_classification: c.browser_truth_classification,
          safe_cta_gate_status: c.safe_cta_gate_status,
        })),
      },
      null,
      2,
    )}\n`,
  );
}

main();
