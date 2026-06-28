#!/usr/bin/env node
/**
 * Read-only HyperAgent safe-link evidence production director — planning artifact only.
 *
 *   npm run buckparts:hyperagent-safe-link-evidence-production-director
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildHyperagentSafeLinkEvidenceProductionDirectorMarkdownV1,
  buildHyperagentSafeLinkEvidenceProductionDirectorReportV1,
  HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_CONTRACT_V1,
  HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_JSON_REL_V1,
  HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_MD_REL_V1,
} from "./lib/hyperagent-safe-link-evidence-production-director-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const report = await buildHyperagentSafeLinkEvidenceProductionDirectorReportV1({
    rootDir: REPO_ROOT,
  });
  const markdown = buildHyperagentSafeLinkEvidenceProductionDirectorMarkdownV1(report);

  const jsonAbs = path.join(REPO_ROOT, HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_JSON_REL_V1);
  const mdAbs = path.join(REPO_ROOT, HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_MD_REL_V1);

  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, markdown, "utf8");

  process.stderr.write(
    `Wrote ${HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_JSON_REL_V1} and ${HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_MD_REL_V1} (read-only evidence director; no mutation authorized).\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_CONTRACT_V1) {
    process.exit(2);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`hyperagent_safe_link_evidence_production_director_v1 failed: ${message}\n`);
  process.exit(1);
});
