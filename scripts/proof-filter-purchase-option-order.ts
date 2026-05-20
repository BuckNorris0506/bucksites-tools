#!/usr/bin/env node
/**
 * Read-only: prove purchase-option `/go` CTA order on a live or saved filter PDP HTML.
 * Does not mutate Supabase or retailer_links.
 *
 * Usage:
 *   npx tsx scripts/proof-filter-purchase-option-order.ts --slug da29-00020b
 *   npx tsx scripts/proof-filter-purchase-option-order.ts --url https://buckparts.com/filter/da29-00020b
 *   npx tsx scripts/proof-filter-purchase-option-order.ts --file /tmp/da29-live.html --slug da29-00020b
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

import {
  compareDeployCommitToLocalHead,
  parseDeployCommitRefFromHtml,
} from "../src/lib/deploy/buckparts-deploy-identity-v1";
import {
  WATERDROP_DA29_00020B_EVIDENCE_REL_PATH,
} from "../src/lib/copy/customer-language-doctrine";
import {
  buyPathSortContextForFilter,
  filterRealBuyRetailerLinks,
  sortBestVerifiedBuyLinks,
} from "../src/lib/retailers/launch-buy-links";
import {
  checkExpectedPrimaryPurchaseOptionCta,
  extractPurchaseOptionCtaOrderFromHtml,
} from "../src/lib/retailers/purchase-option-cta-order-proof-v1";
import { isWaterdropExactProofSliceSlug } from "../src/lib/retailers/waterdrop-exact-proof-slice-v1";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

const DEFAULT_URL = "https://buckparts.com/filter/da29-00020b";
const DA29_WATERDROP_ROW_ID = "d4cbad0c-4bab-4854-89bf-59e6d6492c6b";

function parseArgs(argv: string[]): { slug: string; url: string | null; file: string | null } {
  let slug = "da29-00020b";
  let url: string | null = null;
  let file: string | null = null;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slug" && argv[i + 1]) slug = argv[++i]!;
    else if (a === "--url" && argv[i + 1]) url = argv[++i]!;
    else if (a === "--file" && argv[i + 1]) file = argv[++i]!;
  }
  return { slug, url, file };
}

async function loadHtml(args: { url: string | null; file: string | null }): Promise<string> {
  if (args.file) return readFileSync(args.file, "utf8");
  const url = args.url ?? DEFAULT_URL;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function repoExpectedPrimaryLinkId(slug: string): Promise<{
  expected_primary_link_id: string | null;
  sort_context: ReturnType<typeof buyPathSortContextForFilter>;
  sorted_ids: string[];
  evidence_path: string;
}> {
  const evidence_path = WATERDROP_DA29_00020B_EVIDENCE_REL_PATH;
  if (!isWaterdropExactProofSliceSlug(slug)) {
    return {
      expected_primary_link_id: null,
      sort_context: buyPathSortContextForFilter(slug, null, null),
      sorted_ids: [],
      evidence_path,
    };
  }

  loadEnv();
  const sb = getSupabaseAdmin();
  const { data: filter, error } = await sb
    .from("filters")
    .select("id, slug, name, oem_part_number")
    .ilike("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!filter) {
    return {
      expected_primary_link_id: DA29_WATERDROP_ROW_ID,
      sort_context: buyPathSortContextForFilter(slug, null, "DA29-00020B"),
      sorted_ids: [],
      evidence_path,
    };
  }

  const { data: links, error: lErr } = await sb
    .from("retailer_links")
    .select(
      "id, retailer_key, retailer_name, affiliate_url, browser_truth_classification, browser_truth_buyable_subtype, browser_truth_checked_at",
    )
    .eq("filter_id", filter.id);
  if (lErr) throw lErr;

  const sort_context = buyPathSortContextForFilter(
    filter.slug,
    filter.name,
    filter.oem_part_number,
  );
  const gated = filterRealBuyRetailerLinks(links ?? []);
  const sorted = sortBestVerifiedBuyLinks(gated, sort_context);

  return {
    expected_primary_link_id: sorted[0]?.id ?? DA29_WATERDROP_ROW_ID,
    sort_context,
    sorted_ids: sorted.map((l) => l.id),
    evidence_path,
  };
}

function resolveLocalHeadCommit(): string | "UNKNOWN" {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "UNKNOWN";
  }
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const html = await loadHtml({ url: args.url, file: args.file });
  const proof = extractPurchaseOptionCtaOrderFromHtml(html);
  const repo = await repoExpectedPrimaryLinkId(args.slug);
  const localHead = resolveLocalHeadCommit();
  const deploySync = compareDeployCommitToLocalHead({
    localHeadCommit: localHead,
    liveDeployCommit: parseDeployCommitRefFromHtml(html),
  });

  const lines: string[] = [];
  lines.push(`slug: ${args.slug}`);
  lines.push(`local_head_commit: ${localHead}`);
  lines.push(`live_deploy_commit: ${deploySync.live_deploy_commit}`);
  lines.push(`deploy_sync: ${deploySync.sync}`);
  lines.push(`buying_options_section_found: ${proof.buying_options_section_found}`);
  lines.push(`raw_text_index_amazon: ${proof.raw_text_index_amazon} (document-wide diagnostic only)`);
  lines.push(`raw_text_index_waterdrop: ${proof.raw_text_index_waterdrop} (document-wide diagnostic only)`);
  lines.push(`cta_order: ${proof.cta_order.map((e) => `${e.tier}:${e.link_id}:${e.retailer_label}`).join(" | ") || "(none)"}`);
  lines.push(`repo_sorted_link_ids_at_head: ${repo.sorted_ids.join(", ") || "(none)"}`);
  lines.push(`repo_sort_context: ${JSON.stringify(repo.sort_context)}`);

  let exit = 0;
  if (repo.expected_primary_link_id && isWaterdropExactProofSliceSlug(args.slug)) {
    const check = checkExpectedPrimaryPurchaseOptionCta(html, repo.expected_primary_link_id);
    lines.push(`expected_primary_link_id: ${check.expected_primary_link_id}`);
    lines.push(`actual_primary_link_id: ${check.actual_primary_link_id ?? "(none)"}`);
    lines.push(`verdict: ${check.ok ? "PASS" : "FAIL"}`);
    lines.push(`reason: ${check.reason}`);
    if (!check.ok) {
      if (deploySync.sync === "UNKNOWN_LIVE_DEPLOY_COMMIT") {
        lines.push(
          "note: Live HTML has no buckparts-deploy-commit meta yet — deployed SHA is UNKNOWN; production likely predates Waterdrop-first ranking (251cb8d+) until Netlify rebuilds with deploy marker.",
        );
      } else if (deploySync.sync === "DIFFERS_FROM_LOCAL_HEAD") {
        lines.push(
          "note: Live deploy commit differs from local HEAD — trigger Netlify production deploy for current main before re-proving CTA order.",
        );
      } else {
        lines.push(
          "note: Deploy commit matches local HEAD but CTA order still wrong — investigate runtime/env outside deploy SHA (unexpected).",
        );
      }
      exit = 1;
    }
  } else {
    lines.push("verdict: SKIPPED (no Waterdrop proof-slice expectation for this slug)");
  }

  console.log(lines.join("\n"));
  return exit;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
