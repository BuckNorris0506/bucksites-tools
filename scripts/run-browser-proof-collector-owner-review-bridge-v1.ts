#!/usr/bin/env node
/**
 * Browser Proof Collector → owner-review packet bridge v1 (draft only).
 *
 *   npm run buckparts:browser-proof-collector-owner-review-bridge -- \
 *     --draft data/fridge/batch-production/drafts/browser-proof-collector/wf3cb/browser-proof-collector-batch-....json
 *
 * Optional: --no-write
 *
 * Does NOT write owner-browser-proof-result, data/evidence/, founder approvals,
 * retailer_links.csv, Supabase, readiness, or apply artifacts.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseBrowserProofCollectorOwnerReviewBridgeCliArgsV1,
  runBrowserProofCollectorOwnerReviewBridgeV1,
} from "./lib/browser-proof-collector-owner-review-bridge-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const args = parseBrowserProofCollectorOwnerReviewBridgeCliArgsV1(process.argv.slice(2));
  if (!args.draft) {
    process.stderr.write(
      "Usage: npm run buckparts:browser-proof-collector-owner-review-bridge -- --draft <collector-draft.json> [--no-write]\n",
    );
    process.exitCode = 2;
    return;
  }

  const { packet, packet_rel_path } = runBrowserProofCollectorOwnerReviewBridgeV1({
    rootDir: REPO_ROOT,
    collectorDraftRelPath: args.draft,
    writePacket: args.writePacket,
  });

  process.stderr.write(
    `${packet.contract}: slug=${packet.slug} best=${packet.best_candidate.source_class} owner_acceptance=${packet.owner_acceptance_status} activates_owner_browser_proof_result=false founder_approval_authorized=false\n`,
  );
  if (packet_rel_path) {
    process.stderr.write(`Wrote ${packet_rel_path}\n`);
  }

  process.stdout.write(`${JSON.stringify({ packet, packet_rel_path }, null, 2)}\n`);

  if (
    packet.mutation_authorized ||
    packet.activates_owner_browser_proof_result ||
    packet.founder_approval_authorized
  ) {
    process.exitCode = 3;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
