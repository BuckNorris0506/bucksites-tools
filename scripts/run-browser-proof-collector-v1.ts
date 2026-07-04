#!/usr/bin/env node
/**
 * Browser Proof Collector v1 — read-only draft evidence collection.
 *
 * Single URL:
 *   npm run buckparts:browser-proof-collector -- \
 *     --slug wf3cb --token WF3CB --url "https://..."
 *
 * Batch candidates (repeat --url, or --urls-file):
 *   npm run buckparts:browser-proof-collector -- \
 *     --slug wf3cb --token WF3CB \
 *     --url "https://www.frigidaire.com/..." \
 *     --url "https://www.lowes.com/..." \
 *     --url "https://www.homedepot.com/..." \
 *     --forbidden EPTWFU01,ULTRAWF \
 *     --headed --collect-all
 *
 * Optional: --urls-file path (one URL per line, # comments)
 * Optional: --headed, --wait-ms, --timeout-ms, --user-agent, --no-write
 * Optional: --collect-all (do not early-stop on official/authorized PASS)
 *
 * Does NOT mutate retailer_links.csv, Supabase, owner-browser-proof-result, or founder approvals.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadBrowserProofCollectorUrlsFileV1,
  parseBrowserProofCollectorCliArgsV1,
  runBrowserProofCollectorBatchV1,
} from "./lib/browser-proof-collector-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const args = parseBrowserProofCollectorCliArgsV1(process.argv.slice(2));
  const urlsFromFile = args.urls_file
    ? loadBrowserProofCollectorUrlsFileV1({ rootDir: REPO_ROOT, relPath: args.urls_file })
    : [];
  const urls = [...args.urls, ...urlsFromFile];

  if (!args.slug || !args.token || urls.length === 0) {
    process.stderr.write(
      "Usage: npm run buckparts:browser-proof-collector -- --slug <slug> --token <TOKEN> --url <url> [--url <url> ...] [--urls-file path] [--forbidden T1,T2] [--headed] [--collect-all] [--wait-ms N] [--timeout-ms N] [--user-agent UA] [--no-write]\n",
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

  process.stdout.write(`${JSON.stringify({ draft, draft_json_rel }, null, 2)}\n`);

  if (draft.mutation_authorized || draft.promotes_to_owner_browser_proof_result) {
    process.exitCode = 3;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
