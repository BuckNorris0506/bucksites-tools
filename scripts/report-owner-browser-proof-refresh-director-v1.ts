#!/usr/bin/env node
/**
 * Read-only owner browser proof refresh director — production-managed refresh queue.
 *
 *   npm run buckparts:owner-browser-proof-refresh-director
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_CONTRACT_V1,
  OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_JSON_REL_V1,
  OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_MD_REL_V1,
  writeOwnerBrowserProofRefreshDirectorDraftsV1,
} from "./lib/owner-browser-proof-refresh-director-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const report = await writeOwnerBrowserProofRefreshDirectorDraftsV1({ rootDir: REPO_ROOT });

  process.stderr.write(
    `Wrote ${OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_JSON_REL_V1} and ${OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_MD_REL_V1} (read-only refresh director; no mutation authorized).\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_CONTRACT_V1) {
    process.exit(2);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`owner_browser_proof_refresh_director_v1 failed: ${message}\n`);
  process.exit(1);
});
