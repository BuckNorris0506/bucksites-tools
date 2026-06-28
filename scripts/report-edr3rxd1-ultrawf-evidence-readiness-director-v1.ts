#!/usr/bin/env node
/**
 * Read-only edr3rxd1 + ultrawf evidence readiness director — planning artifacts only.
 *
 *   npm run buckparts:edr3rxd1-ultrawf-evidence-readiness-director
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_CONTRACT_V1,
  EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_JSON_REL_V1,
  EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_MD_REL_V1,
  writeEdr3rxd1UltrawfEvidenceReadinessDirectorDraftsV1,
} from "./lib/edr3rxd1-ultrawf-evidence-readiness-director-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const report = await writeEdr3rxd1UltrawfEvidenceReadinessDirectorDraftsV1({
    rootDir: REPO_ROOT,
  });

  process.stderr.write(
    `Wrote ${EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_JSON_REL_V1}, ${EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_MD_REL_V1}, and per-slug evidence factory drafts (read-only; no mutation authorized).\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_CONTRACT_V1) {
    process.exit(2);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`edr3rxd1_ultrawf_evidence_readiness_director_v1 failed: ${message}\n`);
  process.exit(1);
});
