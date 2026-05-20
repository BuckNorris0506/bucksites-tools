/**
 * Read-only: rank next Waterdrop exact-proof slice candidates from operator Rakuten export.
 * No Supabase mutation; optional read-only production enrichment.
 *
 *   npm run buckparts:waterdrop-proof-slice-candidates
 *   npx tsx scripts/report-waterdrop-proof-slice-candidates.ts --input data/waterdrop/operator-input/waterdrop-rakuten-links.v1.json
 *   npx tsx scripts/report-waterdrop-proof-slice-candidates.ts --html data/waterdrop/fixtures/da29-00020b-linksynergy-anchor.html
 *   npx tsx scripts/report-waterdrop-proof-slice-candidates.ts --with-production
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadBuckpartsFridgeFilterIndexFromRepo,
  matchInferredTokensToBuckpartsSlug,
} from "@/lib/retailers/buckparts-fridge-filter-index-v1";
import {
  loadWaterdropOperatorInputFromFile,
  normalizeWaterdropOperatorEntries,
  resolveDefaultOperatorInputPath,
  WATERDROP_RAKUTEN_OPERATOR_INPUT_CONTRACT_V1,
} from "@/lib/retailers/waterdrop-operator-input-v1";
import { WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 } from "@/lib/retailers/waterdrop-exact-proof-slice-v1";
import { parseWaterdropHtmlSnippet } from "@/lib/retailers/waterdrop-linksynergy-parse-v1";
import {
  buildWaterdropProofSliceCandidate,
  sortWaterdropProofSliceCandidates,
  type ProductionLinkSnapshotV1,
  type WaterdropProofSliceCandidateV1,
} from "@/lib/retailers/waterdrop-proof-slice-candidate-v1";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

type Args = {
  inputPath: string | null;
  htmlPath: string | null;
  withProduction: boolean;
  topN: number;
  ownerProofMax: number;
};

function parseArgs(argv: string[]): Args {
  let inputPath: string | null = null;
  let htmlPath: string | null = null;
  let withProduction = false;
  let topN = 10;
  let ownerProofMax = 3;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--with-production") withProduction = true;
    else if (a === "--input" && argv[i + 1]) inputPath = argv[++i]!;
    else if (a === "--html" && argv[i + 1]) htmlPath = argv[++i]!;
    else if (a === "--top" && argv[i + 1]) topN = Number(argv[++i]!);
    else if (a === "--owner-proof-max" && argv[i + 1]) ownerProofMax = Number(argv[++i]!);
  }
  return { inputPath, htmlPath, withProduction, topN, ownerProofMax };
}

async function loadProductionSnapshotsBySlug(): Promise<Map<string, ProductionLinkSnapshotV1>> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const { data: filters, error: filterErr } = await supabase.from("filters").select("id, slug");
  if (filterErr) throw filterErr;
  const slugById = new Map<string, string>();
  for (const f of filters ?? []) {
    if (f.slug && f.id) slugById.set(f.id, String(f.slug).trim().toLowerCase());
  }

  const { data: links, error: linkErr } = await supabase
    .from("retailer_links")
    .select("filter_id, retailer_key, browser_truth_classification");
  if (linkErr) throw linkErr;

  const bySlug = new Map<string, ProductionLinkSnapshotV1>();
  const empty = (): ProductionLinkSnapshotV1 => ({
    gated_buyable_count: 0,
    has_amazon_direct_buyable: false,
    has_waterdrop_row: false,
    has_repairclinic_search_only: false,
  });

  for (const link of links ?? []) {
    const slug = link.filter_id ? slugById.get(link.filter_id) : undefined;
    if (!slug) continue;
    const snap = bySlug.get(slug) ?? empty();
    const key = String(link.retailer_key ?? "").trim().toLowerCase();
    const classification = String(link.browser_truth_classification ?? "").trim();
    if (key === "waterdrop") snap.has_waterdrop_row = true;
    if (key === "amazon" && classification === "direct_buyable") snap.has_amazon_direct_buyable = true;
    if (key === "repairclinic") snap.has_repairclinic_search_only = true;
    if (classification === "direct_buyable") snap.gated_buyable_count += 1;
    bySlug.set(slug, snap);
  }
  return bySlug;
}

function loadEntriesFromArgs(args: Args) {
  if (args.htmlPath) {
    const file = path.isAbsolute(args.htmlPath) ? args.htmlPath : path.join(REPO_ROOT, args.htmlPath);
    const html = readFileSync(file, "utf8");
    return parseWaterdropHtmlSnippet(html).map((parsed, i) => ({
      entry_id: `html-${i + 1}`,
      parsed,
    }));
  }

  const inputFile = args.inputPath
    ? path.isAbsolute(args.inputPath)
      ? args.inputPath
      : path.join(REPO_ROOT, args.inputPath)
    : resolveDefaultOperatorInputPath(REPO_ROOT);

  return normalizeWaterdropOperatorEntries(loadWaterdropOperatorInputFromFile(inputFile));
}

function printReport(args: {
  inputSource: string;
  candidates: WaterdropProofSliceCandidateV1[];
  topN: number;
  ownerProofMax: number;
}): void {
  const sorted = sortWaterdropProofSliceCandidates(args.candidates);
  const top = sorted.slice(0, args.topN);
  const ownerProof = sorted
    .filter((r) => r.recommended_for_owner_browser_proof)
    .slice(0, args.ownerProofMax);

  console.log(
    JSON.stringify(
      {
        report_name: "buckparts_waterdrop_proof_slice_candidates_v1",
        read_only: true,
        data_mutation: false,
        input_source: args.inputSource,
        operator_contract: WATERDROP_RAKUTEN_OPERATOR_INPUT_CONTRACT_V1,
        live_proof_slices: WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1,
        entry_count: args.candidates.length,
        top_candidates: top,
        recommended_owner_browser_proof: ownerProof,
        notes: [
          "No insert SQL or retailer_links mutation from this report.",
          "Extend WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 only after committed evidence + controlled proof.",
          ownerProof.length === 0
            ? "Paste Rakuten product-link export into data/waterdrop/operator-input/waterdrop-rakuten-links.v1.json for ranked next slices."
            : null,
        ].filter(Boolean),
      },
      null,
      2,
    ),
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const index = loadBuckpartsFridgeFilterIndexFromRepo(REPO_ROOT);
  const entries = loadEntriesFromArgs(args);
  const productionBySlug = args.withProduction ? await loadProductionSnapshotsBySlug() : null;

  const built = entries.map(({ entry_id, parsed }) => {
    const matchedSlug = matchInferredTokensToBuckpartsSlug(
      index,
      parsed.inferred_token_candidates,
    ).matched_slug;
    const production_snapshot =
      productionBySlug && matchedSlug
        ? (productionBySlug.get(matchedSlug) ?? "UNKNOWN")
        : "UNKNOWN";
    return buildWaterdropProofSliceCandidate({
      entry_id,
      parsed,
      index,
      production_snapshot,
    });
  });

  const inputSource = args.htmlPath ?? args.inputPath ?? resolveDefaultOperatorInputPath(REPO_ROOT);
  printReport({
    inputSource,
    candidates: built,
    topN: args.topN,
    ownerProofMax: args.ownerProofMax,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
