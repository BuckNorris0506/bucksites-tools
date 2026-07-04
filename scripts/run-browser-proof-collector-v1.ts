#!/usr/bin/env node
/**
 * Browser Proof Collector v1 — read-only draft evidence collection.
 *
 *   npm run buckparts:browser-proof-collector -- \
 *     --slug wf3cb \
 *     --token WF3CB \
 *     --url "https://www.frigidaire.com/en/p/accessories/.../WF3CB" \
 *     --forbidden EPTWFU01,ULTRAWF \
 *     --wait-ms 3000 \
 *     --timeout-ms 60000
 *
 * Optional: --headed  (owner/local validation)
 * Optional: --user-agent "..."
 * Optional: --no-write
 *
 * Does NOT mutate retailer_links.csv, Supabase, owner-browser-proof-result, or founder approvals.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseBrowserProofCollectorCliArgsV1,
  runBrowserProofCollectorV1,
} from "./lib/browser-proof-collector-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const args = parseBrowserProofCollectorCliArgsV1(process.argv.slice(2));
  if (!args.slug || !args.token || !args.url) {
    process.stderr.write(
      "Usage: npm run buckparts:browser-proof-collector -- --slug <slug> --token <TOKEN> --url <url> [--forbidden T1,T2] [--headed] [--wait-ms N] [--timeout-ms N] [--user-agent UA] [--no-write]\n",
    );
    process.exitCode = 2;
    return;
  }

  const { draft, draft_json_rel } = await runBrowserProofCollectorV1({
    rootDir: REPO_ROOT,
    input: {
      slug: args.slug,
      expected_token: args.token,
      candidate_url: args.url,
      forbidden_tokens: args.forbidden.length > 0 ? args.forbidden : undefined,
    },
    writeDrafts: args.writeDrafts,
    captureOptions: {
      headed: args.headed,
      wait_ms: args.wait_ms ?? undefined,
      timeout_ms: args.timeout_ms ?? undefined,
      user_agent: args.user_agent ?? undefined,
    },
  });

  const candidate = draft.candidates[0];
  const attemptSummary = draft.capture_attempts
    .map((a) => `${a.attempt_id}:${a.success ? "ok" : "fail"}`)
    .join(", ");
  process.stderr.write(
    `${draft.contract}: slug=${draft.slug} overall=${draft.overall_verdict} candidate=${candidate?.verdict ?? "none"} attempts=[${attemptSummary}] owner_review_required=true promotes_to_owner_browser_proof_result=false\n`,
  );
  if (draft_json_rel) {
    process.stderr.write(`Wrote draft ${draft_json_rel}\n`);
  }
  if (candidate?.screenshot_rel_path) {
    process.stderr.write(`Screenshot ${candidate.screenshot_rel_path}\n`);
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
