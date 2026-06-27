#!/usr/bin/env node
/**
 * Read-only ukf8001 fridge safe-link apply-plan proposal — stdout JSON + draft writes.
 *
 *   npm run buckparts:fridge-safe-link-ukf8001-apply-plan-proposal
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFridgeSafeLinkUkf8001ApplyPlanProposalV1,
  writeFridgeSafeLinkUkf8001ApplyPlanProposalDraftsV1,
} from "./lib/fridge-safe-link-ukf8001-apply-plan-proposal-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildFridgeSafeLinkUkf8001ApplyPlanProposalV1({ rootDir: REPO_ROOT });
  const written = writeFridgeSafeLinkUkf8001ApplyPlanProposalDraftsV1({ rootDir: REPO_ROOT, report });
  process.stderr.write(
    `Wrote ${written.json_rel_path}, ${written.md_rel_path}, ${written.founder_template_rel_path} (read-only proposal; no mutation authorized).\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
