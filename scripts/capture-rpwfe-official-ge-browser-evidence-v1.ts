#!/usr/bin/env node
/**
 * Owner-authorized read-only browser capture for RPWFE official GE spec PDP.
 * Writes repo evidence artifact only — no CSV/Supabase/public UI/Verified Link apply.
 */
import path from "node:path";
import { captureRpwfeOfficialGeBrowserEvidenceV1 } from "./lib/rpwfe-official-ge-browser-capture-v1";

async function main() {
  const rootDir = process.cwd();
  const result = await captureRpwfeOfficialGeBrowserEvidenceV1({ rootDir, writeArtifact: true });
  const rel = path.relative(rootDir, result.artifact_path);
  console.log(
    JSON.stringify(
      {
        wrote_artifact: result.wrote_artifact,
        artifact_path: rel,
        browser_truth_status: result.artifact.browser_truth_status,
        direct_pdp_status: result.artifact.direct_pdp_status,
        exact_token_visible: result.artifact.exact_token_visible,
        direct_purchase_control_visible: result.artifact.direct_purchase_control_visible,
        blockers: result.artifact.blockers,
      },
      null,
      2,
    ),
  );
  process.exit(result.artifact.browser_truth_status === "PASS" ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
