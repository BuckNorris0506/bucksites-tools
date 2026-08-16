#!/usr/bin/env node
/**
 * Browser Proof Collector v1 — read-only draft evidence collection.
 *
 * Recurring (no Jared slug/token/URL):
 *   npm run buckparts:browser-proof-collector
 * Selects the next manufacturer-rescue refresh-orchestrator slug, seeds
 * manufacturer URLs from committed repo truth, captures, then runs the
 * existing owner-review bridge. Stops at PENDING_OWNER_ACCEPTANCE.
 *
 * Explicit URL (legacy):
 *   npm run buckparts:browser-proof-collector -- \
 *     --slug wf3cb --token WF3CB --url "https://..."
 *
 * Optional: --urls-file, --headed, --wait-ms, --timeout-ms, --user-agent,
 * --no-write, --collect-all, --forbidden
 *
 * Does NOT mutate retailer_links.csv, Supabase, owner-browser-proof-result,
 * or founder approvals. Never grants PASS_BROWSER_PROOF.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadBrowserProofCollectorUrlsFileV1,
  parseBrowserProofCollectorCliArgsV1,
  runBrowserProofCollectorBatchV1,
} from "./lib/browser-proof-collector-v1";
import { runBrowserProofCollectorOwnerReviewBridgeV1 } from "./lib/browser-proof-collector-owner-review-bridge-v1";
import {
  isBrowserProofCollectorOrchestratorRefreshArgvV1,
  runFridgeManufacturerProofFromOrchestratorV1,
} from "./lib/fridge-manufacturer-proof-from-orchestrator-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const args = parseBrowserProofCollectorCliArgsV1(process.argv.slice(2));
  const urlsFromFile = args.urls_file
    ? loadBrowserProofCollectorUrlsFileV1({ rootDir: REPO_ROOT, relPath: args.urls_file })
    : [];
  const urls = [...args.urls, ...urlsFromFile];

  if (isBrowserProofCollectorOrchestratorRefreshArgvV1(args)) {
    const outcome = await runFridgeManufacturerProofFromOrchestratorV1({
      rootDir: REPO_ROOT,
      writeDrafts: args.writeDrafts,
      headed: args.headed,
      wait_ms: args.wait_ms ?? undefined,
      timeout_ms: args.timeout_ms ?? undefined,
      user_agent: args.user_agent,
      collectAll: args.collect_all,
    });
    process.stderr.write(
      `orchestrator_refresh: slug=${outcome.selected_slug ?? "none"} token=${outcome.oem_part_token ?? "none"} discovery=${outcome.discovery_path ?? "none"} follow_search=${String(outcome.follow_search_to_product_links)} collector=${outcome.collector_overall_verdict ?? "none"} owner_acceptance=${outcome.owner_acceptance_status ?? "none"} blocked=${outcome.blocked_reason ?? "none"} promotes_to_owner_browser_proof_result=false mutation_authorized=false\n`,
    );
    if (outcome.collector_draft_rel) {
      process.stderr.write(`Wrote draft ${outcome.collector_draft_rel}\n`);
    }
    if (outcome.owner_review_packet_rel) {
      process.stderr.write(`Wrote owner-review ${outcome.owner_review_packet_rel}\n`);
    }
    process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`);
    if (outcome.blocked_reason === "orchestrator_artifact_missing") {
      process.exitCode = 2;
    }
    return;
  }

  if (!args.slug || !args.token || urls.length === 0) {
    process.stderr.write(
      "Usage: npm run buckparts:browser-proof-collector\n" +
        "   or: npm run buckparts:browser-proof-collector -- --slug <slug> --token <TOKEN> --url <url> [--url <url> ...] [--urls-file path] [--forbidden T1,T2] [--headed] [--collect-all] [--wait-ms N] [--timeout-ms N] [--user-agent UA] [--no-write]\n",
    );
    process.exitCode = 2;
    return;
  }

  const { draft, draft_json_rel } = await runBrowserProofCollectorBatchV1({
    rootDir: REPO_ROOT,
    input: {
      slug: args.slug,
      expected_token: args.token,
      candidate_urls: urls,
      forbidden_tokens: args.forbidden.length > 0 ? args.forbidden : undefined,
    },
    writeDrafts: args.writeDrafts,
    collectAll: args.collect_all,
    captureOptions: {
      headed: args.headed,
      wait_ms: args.wait_ms ?? undefined,
      timeout_ms: args.timeout_ms ?? undefined,
      user_agent: args.user_agent ?? undefined,
    },
  });

  const best = draft.candidates.find((c) => c.candidate_url === draft.best_candidate_url);
  process.stderr.write(
    `${draft.contract}: slug=${draft.slug} batch=${String(draft.batch_mode)} overall=${draft.overall_verdict} best=${best?.verdict ?? "none"}/${best?.facts.source_class ?? "n/a"} candidates=${String(draft.candidates.length)} early_stop=${String(draft.early_stop.stopped)} owner_review_required=true promotes_to_owner_browser_proof_result=false\n`,
  );
  if (draft_json_rel) {
    process.stderr.write(`Wrote draft ${draft_json_rel}\n`);
  }
  for (const c of draft.candidates) {
    if (c.screenshot_rel_path) {
      process.stderr.write(`Screenshot ${c.screenshot_rel_path}\n`);
    }
  }

  let owner_review_packet_rel: string | null = null;
  let owner_acceptance_status: "PENDING_OWNER_ACCEPTANCE" | null = null;
  if (draft.overall_verdict === "PASS" && draft_json_rel && args.writeDrafts) {
    const bridged = runBrowserProofCollectorOwnerReviewBridgeV1({
      rootDir: REPO_ROOT,
      collectorDraftRelPath: draft_json_rel,
      writePacket: true,
    });
    owner_review_packet_rel = bridged.packet_rel_path;
    owner_acceptance_status = bridged.packet.owner_acceptance_status;
    if (owner_review_packet_rel) {
      process.stderr.write(`Wrote owner-review ${owner_review_packet_rel}\n`);
    }
  }

  process.stdout.write(
    `${JSON.stringify({ draft, draft_json_rel, owner_review_packet_rel, owner_acceptance_status }, null, 2)}\n`,
  );

  if (draft.mutation_authorized || draft.promotes_to_owner_browser_proof_result) {
    process.exitCode = 3;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
