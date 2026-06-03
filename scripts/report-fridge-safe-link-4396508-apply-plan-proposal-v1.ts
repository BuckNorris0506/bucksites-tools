#!/usr/bin/env node
/**
 * Read-only 4396508 fridge safe-link apply-plan proposal — stdout JSON + draft writes.
 *
 *   npm run buckparts:fridge-safe-link-4396508-apply-plan-proposal
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFridgeSafeLink4396508ApplyPlanProposalV1,
  writeFridgeSafeLink4396508ApplyPlanProposalDraftsV1,
} from "./lib/fridge-safe-link-4396508-apply-plan-proposal-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildFridgeSafeLink4396508ApplyPlanProposalV1({ rootDir: REPO_ROOT });
  const written = writeFridgeSafeLink4396508ApplyPlanProposalDraftsV1({ rootDir: REPO_ROOT, report });
  process.stderr.write(
    `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only proposal; no mutation authorized).\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
