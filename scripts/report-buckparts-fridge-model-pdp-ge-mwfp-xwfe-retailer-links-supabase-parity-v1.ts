#!/usr/bin/env node
/**
 * Read-only GE MWFP/XWFE retailer_links CSV ↔ Supabase/runtime parity proof.
 *
 *   npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity
 *   npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_CONTRACT_V1,
  buildGeMwfpXwfeRetailerLinksSupabaseParityProofV1,
  parseGeMwfpXwfeRetailerLinksSupabaseParityArgvV1,
  writeGeMwfpXwfeRetailerLinksSupabaseParityArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const { writeArtifacts } = parseGeMwfpXwfeRetailerLinksSupabaseParityArgvV1(
    process.argv.slice(2),
  );
  const report = await buildGeMwfpXwfeRetailerLinksSupabaseParityProofV1({
    rootDir: REPO_ROOT,
  });

  if (writeArtifacts) {
    const written = writeGeMwfpXwfeRetailerLinksSupabaseParityArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only; overall=${report.overall_sync_status}; cta_cause=${report.cta_go_failure_cause ?? "null"}).\n`,
    );
  }

  process.stderr.write(
    `${report.contract}: overall=${report.overall_sync_status} supabase=${report.supabase_truth_status} drifted=${String(report.drifted_filter_count)} in_sync=${String(report.in_sync_filter_count)} mutation_authorized=${String(report.mutation_authorized)}\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (
    report.contract !==
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_CONTRACT_V1
  ) {
    process.exitCode = 2;
    return;
  }
  if (report.supabase_truth_status === "UNKNOWN_DB_UNAVAILABLE") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
