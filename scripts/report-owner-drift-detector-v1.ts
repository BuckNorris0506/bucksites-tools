/**
 * Read-only owner drift detector — stdout JSON only.
 *
 *   npm run buckparts:owner-drift-detector
 *   npm run buckparts:owner-drift-detector -- --idea "Your idea here"
 *   npx tsx scripts/report-owner-drift-detector-v1.ts --idea "Your idea here"
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildFridgeBuyerPathBatchProposalCommandCenterLaneV1 } from "./lib/fridge-buyer-path-batch-proposal-command-center-v1";
import { buildFridgeBuyerPathOwnerReviewPacketCommandCenterLaneV1 } from "./lib/fridge-buyer-path-owner-review-packet-command-center-v1";
import { buildCommandCenterBrainCoverageManifestV1 } from "./lib/buckparts-brain-coverage-manifest-v1";
import { buildBatchProductionOperatingDispatchV1 } from "./lib/buckparts-batch-production-operating-dispatch-v1";
import { buildBatchProductionOperatingChecklistV1 } from "./lib/buckparts-batch-production-operating-checklist-v1";
import {
  buildOwnerDriftDetectorReportV1,
  OWNER_DRIFT_DETECTOR_DEFAULT_VAULT_IDEA_V1,
} from "./lib/owner-drift-detector-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function parseIdeaArg(argv: string[]): string {
  const idx = argv.indexOf("--idea");
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1]!;
  return OWNER_DRIFT_DETECTOR_DEFAULT_VAULT_IDEA_V1;
}

function resolveStandaloneNextBestActionProxy(
  batchExactCommand: string,
  fridgeRecommendedNextAction: string,
  proposalOpen: boolean,
): string {
  if (proposalOpen && fridgeRecommendedNextAction.trim().length > 0) {
    return fridgeRecommendedNextAction;
  }
  if (batchExactCommand.trim().length > 0) {
    return batchExactCommand;
  }
  return "UNKNOWN: run npm run buckparts:command-center for authoritative next_best_action.";
}

function main(): void {
  const idea = parseIdeaArg(process.argv.slice(2));
  const now = () => new Date();

  const fridge_batch_proposal = buildFridgeBuyerPathBatchProposalCommandCenterLaneV1({
    rootDir: REPO_ROOT,
    now,
  });
  const fridge_owner_review_packet = buildFridgeBuyerPathOwnerReviewPacketCommandCenterLaneV1({
    rootDir: REPO_ROOT,
    now,
  });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const batch_dispatch = buildBatchProductionOperatingDispatchV1(checklist);
  const brain_manifest = buildCommandCenterBrainCoverageManifestV1({ rootDir: REPO_ROOT, now });

  const proposalOpen =
    fridge_batch_proposal.owner_approval_required &&
    !fridge_batch_proposal.formal_batch_exists &&
    fridge_batch_proposal.proposed_row_count > 0;

  const next_best_action = resolveStandaloneNextBestActionProxy(
    batch_dispatch.exact_command,
    fridge_batch_proposal.recommended_next_action,
    proposalOpen,
  );

  const report = buildOwnerDriftDetectorReportV1({
    rootDir: REPO_ROOT,
    now,
    idea,
    next_best_action,
    fridge_batch_proposal,
    fridge_owner_review_packet,
    batch_dispatch,
    brain_manifest,
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
