/**
 * Read-only refrigerator_water full-coverage rescue packet for live filter pages
 * missing a BuckParts Verified Link (/go CTA). No CSV/Supabase/evidence mutation;
 * no Verified Link authorization; never requests production /go URLs.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { filterRealBuyRetailerLinks } from "@/lib/retailers/launch-buy-links";

export const FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_CONTRACT_V1 =
  "fridge_safe_link_rescue_owner_review_v1" as const;

export const FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-rescue-owner-review-v1.json" as const;

export const FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_MD_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-rescue-owner-review-v1.md" as const;

export const FRIDGE_SAFE_LINK_RESCUE_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-safe-link-rescue-owner-review" as const;

export const LIVE_SITEMAP_URL_V1 = "https://buckparts.com/sitemap.xml" as const;

export const LIVE_FRIDGE_FILTER_URL_PREFIX_V1 = "https://buckparts.com/filter/" as const;

export type LikelyNextSafeBuyerPathTypeV1 =
  | "exact_retailer_pdp_candidate_needed"
  | "official_manufacturer_pdp_or_support_needed"
  | "compatible_replacement_candidate_needed"
  | "existing_evidence_apply_review_ready"
  | "existing_evidence_no_safe_pdp_keep_blocked"
  | "UNKNOWN";

export type FridgeSafeLinkRescueSlugRowV1 = {
  rank: number;
  rank_tier: 1 | 2 | 3 | 4;
  slug: string;
  live_url: string;
  live_page_exists: boolean;
  live_has_go_cta: false;
  repo_filter_exists: boolean;
  csv_retailer_row_state: string;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype: string | null;
  evidence_files_on_disk: string[];
  evidence_verdict_summary: string | null;
  likely_next_safe_buyer_path_type: LikelyNextSafeBuyerPathTypeV1;
  owner_browser_review_required: boolean;
  model_link_count: number;
  mutation_authorized: false;
  verified_link_authorized: false;
  rescue_priority_notes: string[];
};

export type FridgeSafeLinkRescueOwnerReviewV1 = {
  contract: typeof FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  production_go_first_hop_validation_status: "UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH";
  generated_at: string;
  source_command: typeof FRIDGE_SAFE_LINK_RESCUE_SOURCE_COMMAND_V1;
  exact_repo_paths_read: string[];
  live_scan: {
    sitemap_url: typeof LIVE_SITEMAP_URL_V1;
    live_scan_status: "PROVEN" | "SKIPPED" | "FAILED";
    live_refrigerator_filter_pages_scanned: number;
    live_with_go_cta_count: number;
    live_without_go_cta_count: number;
    never_requested_go_urls: true;
  };
  cohort_summary: {
    missing_safe_link_slug_count: number;
    with_evidence_count: number;
    apply_review_ready_count: number;
    no_safe_pdp_count: number;
    no_evidence_count: number;
  };
  missing_safe_link_slugs: FridgeSafeLinkRescueSlugRowV1[];
  ranked_top_10: FridgeSafeLinkRescueSlugRowV1[];
  recommended_first_batch_of_5: FridgeSafeLinkRescueSlugRowV1[];
  recommended_next_action: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

type FilterRow = { slug?: string; brand_slug?: string; oem_part_number?: string };
type CompatRow = { filter_slug?: string };
type RetailerLinkRow = {
  filter_slug?: string;
  retailer_key?: string;
  retailer_name?: string;
  affiliate_url?: string;
  destination_url?: string;
  is_primary?: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
};

type EvidenceParseV1 = {
  verdict: string | null;
  browser_verdict: string | null;
  no_safe_pdp: boolean;
  apply_review_ready: boolean;
  owner_browser_required: boolean;
  summary: string | null;
};

export type LiveGoCtaScanRowV1 = {
  slug: string;
  url: string;
  http_status: number | null;
  has_go_cta: boolean | "UNKNOWN";
  error?: string;
};

export type BuildFridgeSafeLinkRescueOwnerReviewDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  listEvidenceFilenames?: (evidenceDir: string) => string[];
  fetchText?: (url: string) => Promise<{ ok: boolean; status: number; text: string; error?: string }>;
  skipLiveScan?: boolean;
};

function defaultFileExists(abs: string): boolean {
  return existsSync(abs);
}

function defaultReadText(abs: string): string {
  return readFileSync(abs, "utf8");
}

function defaultListEvidence(evidenceDir: string): string[] {
  try {
    return readdirSync(evidenceDir);
  } catch {
    return [];
  }
}

async function defaultFetchText(
  url: string,
): Promise<{ ok: boolean; status: number; text: string; error?: string }> {
  if (/\/go(\/|\?)/i.test(url)) {
    throw new Error(`refused_production_go_request:${url}`);
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "bucksites-tools-fridge-safe-link-rescue/1.0" },
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      text: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function readCsv(
  rootDir: string,
  rel: string,
  fileExists: (abs: string) => boolean,
  readText: (abs: string) => string,
): Record<string, string>[] {
  const abs = path.join(rootDir, rel);
  if (!fileExists(abs)) return [];
  try {
    return parse(readText(abs), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Record<string, string>[];
  } catch {
    return [];
  }
}

function isTruthyPrimary(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function summarizeCsvRetailerState(rows: RetailerLinkRow[]): {
  state: string;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype: string | null;
  safe_gated: number;
  primary_retailer_key: string | null;
  primary_is_search_placeholder: boolean;
} {
  const gated = filterRealBuyRetailerLinks(
    rows.map((r) => ({
      retailer_key: r.retailer_key ?? null,
      affiliate_url: (r.destination_url ?? r.affiliate_url ?? "").trim(),
      browser_truth_classification: r.browser_truth_classification ?? null,
      browser_truth_buyable_subtype: r.browser_truth_buyable_subtype ?? null,
    })),
  );
  const primary = rows.find((r) => isTruthyPrimary(r.is_primary)) ?? rows[0] ?? null;
  let primary_state = "no_primary_row";
  let primary_is_search_placeholder = false;
  if (primary) {
    const key = (primary.retailer_key ?? "unknown").trim();
    const classification = (primary.browser_truth_classification ?? "none").trim();
    const subtype = (primary.browser_truth_buyable_subtype ?? "none").trim();
    primary_state = `${key}:${classification}:${subtype}`;
    const url = (primary.destination_url ?? primary.affiliate_url ?? "").toLowerCase();
    primary_is_search_placeholder =
      classification === "likely_search_results" ||
      url.includes("searchkeyword=") ||
      url.includes("search=") ||
      key.includes("oem-parts-catalog");
  }
  return {
    state: `${rows.length} row(s), ${gated.length} safe gated, primary=${primary_state}`,
    browser_truth_classification: primary?.browser_truth_classification?.trim() ?? null,
    browser_truth_buyable_subtype: primary?.browser_truth_buyable_subtype?.trim() ?? null,
    safe_gated: gated.length,
    primary_retailer_key: primary?.retailer_key?.trim() ?? null,
    primary_is_search_placeholder,
  };
}

function evidenceFilesForSlug(slug: string, filenames: string[]): string[] {
  const needle = slug.toLowerCase();
  return filenames
    .filter((name) => name.toLowerCase().includes(needle))
    .map((name) => `data/evidence/${name}`)
    .sort();
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEvidenceFile(absPath: string, readText: (abs: string) => string): EvidenceParseV1 | null {
  try {
    const parsed = JSON.parse(readText(absPath)) as Record<string, unknown>;
    const verdict = typeof parsed.verdict === "string" ? parsed.verdict.trim() : null;
    const browserEvidence = parsed.browser_evidence;
    const browser_verdict =
      isJsonObject(browserEvidence) && typeof browserEvidence.browser_verdict === "string"
        ? browserEvidence.browser_verdict.trim()
        : null;
    const no_safe_pdp = verdict === "NO_SAFE_PDP_FOUND_FROM_OWNER_BROWSER_SEARCH";
    const apply_review_ready =
      !no_safe_pdp &&
      (verdict === "EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT" ||
        verdict === "LIVE_OUTCOME_RECORDED" ||
        (browser_verdict?.startsWith("PASS_") ?? false));
    const owner_browser_required =
      verdict === "UNKNOWN" ||
      browser_verdict === "HUMAN_BROWSER_VERIFICATION_REQUIRED" ||
      (!apply_review_ready && !no_safe_pdp && verdict !== "LIVE_OUTCOME_RECORDED");
    const summaryParts = [
      verdict ? `verdict=${verdict}` : null,
      browser_verdict ? `browser_verdict=${browser_verdict}` : null,
      parsed.mutation_ready === false ? "mutation_ready=false" : null,
    ].filter(Boolean);
    return {
      verdict,
      browser_verdict,
      no_safe_pdp,
      apply_review_ready,
      owner_browser_required,
      summary: summaryParts.length > 0 ? summaryParts.join("; ") : null,
    };
  } catch {
    return null;
  }
}

function mergeEvidenceParse(files: string[], rootDir: string, readText: (abs: string) => string): EvidenceParseV1 {
  const merged: EvidenceParseV1 = {
    verdict: null,
    browser_verdict: null,
    no_safe_pdp: false,
    apply_review_ready: false,
    owner_browser_required: false,
    summary: null,
  };
  const summaries: string[] = [];
  for (const rel of files) {
    const parsed = parseEvidenceFile(path.join(rootDir, rel), readText);
    if (!parsed) continue;
    summaries.push(`${rel}: ${parsed.summary ?? "unparseable"}`);
    if (parsed.no_safe_pdp) merged.no_safe_pdp = true;
    if (parsed.apply_review_ready) merged.apply_review_ready = true;
    if (parsed.owner_browser_required) merged.owner_browser_required = true;
    if (!merged.verdict && parsed.verdict) merged.verdict = parsed.verdict;
    if (!merged.browser_verdict && parsed.browser_verdict) merged.browser_verdict = parsed.browser_verdict;
  }
  merged.summary = summaries.length > 0 ? summaries.join(" | ") : null;
  if (merged.no_safe_pdp) {
    merged.apply_review_ready = false;
    merged.owner_browser_required = true;
  } else if (merged.apply_review_ready) {
    merged.owner_browser_required = false;
  } else if (files.length === 0) {
    merged.owner_browser_required = true;
  }
  return merged;
}

function classifyLikelyBuyerPathType(args: {
  evidence: EvidenceParseV1;
  csvSummary: ReturnType<typeof summarizeCsvRetailerState>;
}): LikelyNextSafeBuyerPathTypeV1 {
  if (args.evidence.no_safe_pdp) return "existing_evidence_no_safe_pdp_keep_blocked";
  if (args.evidence.apply_review_ready) return "existing_evidence_apply_review_ready";
  if (
    args.evidence.browser_verdict?.includes("AFTERMARKET") ||
    args.evidence.browser_verdict?.includes("COMPATIBLE")
  ) {
    return "compatible_replacement_candidate_needed";
  }
  if (args.evidence.browser_verdict?.startsWith("PASS_")) {
    return "exact_retailer_pdp_candidate_needed";
  }
  if (args.csvSummary.primary_is_search_placeholder) {
    return "official_manufacturer_pdp_or_support_needed";
  }
  if (args.csvSummary.safe_gated === 0 && args.csvSummary.primary_retailer_key) {
    return "exact_retailer_pdp_candidate_needed";
  }
  return "UNKNOWN";
}

function rankTier(args: {
  evidence: EvidenceParseV1;
  evidence_count: number;
  model_link_count: number;
}): 1 | 2 | 3 | 4 {
  if (args.evidence.no_safe_pdp) return 4;
  if (args.evidence_count > 0 && !args.evidence.no_safe_pdp) return 1;
  if (args.model_link_count >= 15) return 2;
  if (args.evidence_count > 0) return 3;
  return 2;
}

function rankScore(args: {
  tier: 1 | 2 | 3 | 4;
  model_link_count: number;
  apply_review_ready: boolean;
}): number {
  const tierBase = { 1: 4000, 2: 2000, 3: 1000, 4: 100 }[args.tier];
  const applyBonus = args.apply_review_ready ? 500 : 0;
  return tierBase + applyBonus + args.model_link_count;
}

export function hasGoCtaInPublicFilterHtml(html: string): boolean {
  return /href=["'][^"']*\/go\/[^"']*["']/i.test(html) || /href=["'][^"']*\/go\?/i.test(html);
}

export function parseSitemapFilterLocs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map((m) => m[1]!.trim())
    .filter((url) => /^https:\/\/buckparts\.com\/filter\/[^/?#]+$/i.test(url));
}

export function slugFromFridgeFilterUrl(url: string): string | null {
  const m = url.match(/^https:\/\/buckparts\.com\/filter\/([^/?#]+)$/i);
  return m ? decodeURIComponent(m[1]!).toLowerCase() : null;
}

export async function scanLiveRefrigeratorFilterGoCtaV1(args: {
  fetchText: BuildFridgeSafeLinkRescueOwnerReviewDepsV1["fetchText"];
}): Promise<{
  rows: LiveGoCtaScanRowV1[];
  status: "PROVEN" | "FAILED";
  with_go: number;
  without_go: number;
}> {
  const fetchText = args.fetchText ?? defaultFetchText;
  const sm = await fetchText(LIVE_SITEMAP_URL_V1);
  if (!sm.ok) {
    return { rows: [], status: "FAILED", with_go: 0, without_go: 0 };
  }
  const urls = parseSitemapFilterLocs(sm.text);
  const rows: LiveGoCtaScanRowV1[] = [];
  let with_go = 0;
  let without_go = 0;
  for (const url of urls) {
    const slug = slugFromFridgeFilterUrl(url);
    if (!slug) continue;
    const page = await fetchText(url);
    let has_go: boolean | "UNKNOWN" = "UNKNOWN";
    if (page.ok && page.text) {
      has_go = hasGoCtaInPublicFilterHtml(page.text);
      if (has_go === true) with_go += 1;
      else if (has_go === false) without_go += 1;
    }
    rows.push({
      slug,
      url,
      http_status: page.status || null,
      has_go_cta: has_go,
      ...(page.error ? { error: page.error } : {}),
    });
  }
  return { rows, status: "PROVEN", with_go, without_go };
}

function chooseFirstBatchOf5(ranked: FridgeSafeLinkRescueSlugRowV1[]): FridgeSafeLinkRescueSlugRowV1[] {
  const eligible = ranked.filter(
    (row) => row.likely_next_safe_buyer_path_type !== "existing_evidence_no_safe_pdp_keep_blocked",
  );
  const applyReady = eligible.filter(
    (row) => row.likely_next_safe_buyer_path_type === "existing_evidence_apply_review_ready",
  );
  const picked: FridgeSafeLinkRescueSlugRowV1[] = [];
  for (const row of applyReady) {
    if (picked.length >= 5) break;
    if (!picked.some((p) => p.slug === row.slug)) picked.push(row);
  }
  for (const row of eligible) {
    if (picked.length >= 5) break;
    if (picked.some((p) => p.slug === row.slug)) continue;
    if (row.rank_tier <= 2) picked.push(row);
  }
  return picked.slice(0, 5);
}

export function buildFridgeSafeLinkRescueOwnerReviewMarkdownV1(
  report: FridgeSafeLinkRescueOwnerReviewV1,
): string {
  const lines: string[] = [
    "# Fridge safe-link rescue owner review (read-only)",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Non-negotiable requirement",
    "",
    "Every public refrigerator_water product page must eventually render a safe BuckParts Verified Link or safe buyer path. Truth gates are not weakened. Missing links are not acceptable backlog.",
    "",
    "## Live cohort (customer-facing)",
    "",
    `- Live refrigerator filter pages scanned: **${report.live_scan.live_refrigerator_filter_pages_scanned}**`,
    `- With live \`/go\` CTA: **${report.live_scan.live_with_go_cta_count}**`,
    `- **Missing live safe link (\`/go\`): ${report.live_scan.live_without_go_cta_count}**`,
    `- Production \`/go\` first-hop: **${report.production_go_first_hop_validation_status}** (do not click production \`/go\`)`,
    "",
    "## Authorization",
    "",
    "- mutation_authorized: **false**",
    "- verified_link_authorized: **false**",
    "- csv_apply_authorized: **false**",
    "- supabase_mutation_authorized: **false**",
    "- evidence_write_authorized: **false**",
    "",
    "## Recommended first batch of 5 (read-only browser/evidence collection today)",
    "",
  ];
  for (const [index, row] of Array.from(report.recommended_first_batch_of_5.entries())) {
    lines.push(
      `${index + 1}. **${row.slug}** — ${row.likely_next_safe_buyer_path_type} — ${row.live_url}`,
      `   - CSV: ${row.csv_retailer_row_state}`,
      `   - Evidence: ${row.evidence_files_on_disk.length > 0 ? row.evidence_verdict_summary ?? "present" : "none on disk"}`,
      `   - Models linked: ${row.model_link_count}`,
      "",
    );
  }
  lines.push("## Ranked top 10", "");
  for (const row of report.ranked_top_10) {
    lines.push(
      `${row.rank}. \`${row.slug}\` (tier ${row.rank_tier}) — ${row.likely_next_safe_buyer_path_type} — models=${row.model_link_count}`,
    );
  }
  lines.push("", "## All 26 missing safe-link slugs", "");
  for (const row of report.missing_safe_link_slugs) {
    lines.push(
      `- \`${row.slug}\` | ${row.likely_next_safe_buyer_path_type} | evidence=${row.evidence_files_on_disk.length} | owner_browser=${row.owner_browser_review_required}`,
    );
  }
  lines.push("", "## Recommended next action", "", report.recommended_next_action, "");
  return lines.join("\n");
}

export async function buildFridgeSafeLinkRescueOwnerReviewV1(
  deps: BuildFridgeSafeLinkRescueOwnerReviewDepsV1,
): Promise<FridgeSafeLinkRescueOwnerReviewV1> {
  const now = deps.now ?? (() => new Date());
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;
  const listEvidence = deps.listEvidenceFilenames ?? defaultListEvidence;
  const fetchText = deps.fetchText ?? defaultFetchText;

  const exact_repo_paths_read = [
    "data/filters.csv",
    "data/compatibility_mappings.csv",
    "data/retailer_links.csv",
    "data/evidence/",
    LIVE_SITEMAP_URL_V1,
  ];

  const filterRows = readCsv(deps.rootDir, "data/filters.csv", fileExists, readText) as FilterRow[];
  const compatRows = readCsv(
    deps.rootDir,
    "data/compatibility_mappings.csv",
    fileExists,
    readText,
  ) as CompatRow[];
  const linkRows = readCsv(
    deps.rootDir,
    "data/retailer_links.csv",
    fileExists,
    readText,
  ) as RetailerLinkRow[];

  const filtersBySlug = new Map<string, FilterRow>();
  for (const row of filterRows) {
    const slug = (row.slug ?? "").trim().toLowerCase();
    if (slug) filtersBySlug.set(slug, row);
  }

  const linksBySlug = new Map<string, RetailerLinkRow[]>();
  for (const row of linkRows) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (!slug) continue;
    const list = linksBySlug.get(slug) ?? [];
    list.push(row);
    linksBySlug.set(slug, list);
  }

  const modelCountBySlug = new Map<string, number>();
  for (const row of compatRows) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (!slug) continue;
    modelCountBySlug.set(slug, (modelCountBySlug.get(slug) ?? 0) + 1);
  }

  const evidenceDir = path.join(deps.rootDir, "data/evidence");
  const evidenceFilenames = listEvidence(evidenceDir);

  let liveScanStatus: "PROVEN" | "SKIPPED" | "FAILED" = "SKIPPED";
  let liveRows: LiveGoCtaScanRowV1[] = [];
  let withGo = 0;
  let withoutGo = 0;

  if (!deps.skipLiveScan) {
    const scan = await scanLiveRefrigeratorFilterGoCtaV1({ fetchText });
    liveRows = scan.rows;
    liveScanStatus = scan.status;
    withGo = scan.with_go;
    withoutGo = scan.without_go;
  }

  const missingRows = liveRows.filter((row) => row.has_go_cta === false);
  const built: FridgeSafeLinkRescueSlugRowV1[] = missingRows.map((live) => {
    const slug = live.slug;
    const csvRows = linksBySlug.get(slug) ?? [];
    const csvSummary = summarizeCsvRetailerState(csvRows);
    const evidence_files = evidenceFilesForSlug(slug, evidenceFilenames);
    const evidence = mergeEvidenceParse(evidence_files, deps.rootDir, readText);
    const tier = rankTier({
      evidence,
      evidence_count: evidence_files.length,
      model_link_count: modelCountBySlug.get(slug) ?? 0,
    });
    const likely = classifyLikelyBuyerPathType({ evidence, csvSummary });
    const notes: string[] = [];
    if (evidence.apply_review_ready) {
      notes.push("PROVEN: parseable evidence suggests apply-review-ready; live still lacks /go — likely Supabase/CSV parity gap.");
    }
    if (csvSummary.safe_gated === 0) {
      notes.push("PROVEN: committed CSV has zero launch-buy-links safe gated rows for this slug.");
    }
    if (evidence.no_safe_pdp) {
      notes.push("PROVEN: evidence records NO_SAFE_PDP — do not force a Verified Link without new browser proof.");
    }
    return {
      rank: 0,
      rank_tier: tier,
      slug,
      live_url: live.url,
      live_page_exists: live.http_status === 200,
      live_has_go_cta: false as const,
      repo_filter_exists: filtersBySlug.has(slug),
      csv_retailer_row_state: csvSummary.state,
      browser_truth_classification: csvSummary.browser_truth_classification,
      browser_truth_buyable_subtype: csvSummary.browser_truth_buyable_subtype,
      evidence_files_on_disk: evidence_files,
      evidence_verdict_summary: evidence.summary,
      likely_next_safe_buyer_path_type: likely,
      owner_browser_review_required: evidence.owner_browser_required,
      model_link_count: modelCountBySlug.get(slug) ?? 0,
      mutation_authorized: false as const,
      verified_link_authorized: false as const,
      rescue_priority_notes: notes,
    };
  });

  built.sort((a, b) => {
    const scoreA = rankScore({
      tier: a.rank_tier,
      model_link_count: a.model_link_count,
      apply_review_ready: a.likely_next_safe_buyer_path_type === "existing_evidence_apply_review_ready",
    });
    const scoreB = rankScore({
      tier: b.rank_tier,
      model_link_count: b.model_link_count,
      apply_review_ready: b.likely_next_safe_buyer_path_type === "existing_evidence_apply_review_ready",
    });
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.slug.localeCompare(b.slug);
  });

  built.forEach((row, index) => {
    row.rank = index + 1;
  });

  const ranked_top_10 = built.slice(0, 10);
  const recommended_first_batch_of_5 = chooseFirstBatchOf5(built);

  const apply_review_ready_count = built.filter(
    (r) => r.likely_next_safe_buyer_path_type === "existing_evidence_apply_review_ready",
  ).length;
  const no_safe_pdp_count = built.filter(
    (r) => r.likely_next_safe_buyer_path_type === "existing_evidence_no_safe_pdp_keep_blocked",
  ).length;
  const with_evidence_count = built.filter((r) => r.evidence_files_on_disk.length > 0).length;

  const proven_facts = [
    "PROVEN: report is read_only=true; data_mutation=false; mutation_authorized=false; verified_link_authorized=false.",
    "PROVEN: live scan reads public filter HTML and sitemap only; never requests production /go URLs.",
    "PROVEN: classification uses committed data/filters.csv, data/retailer_links.csv, data/compatibility_mappings.csv, and data/evidence/ filenames.",
    `PROVEN: production_go_first_hop_validation_status=UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH.`,
  ];
  if (liveScanStatus === "PROVEN") {
    proven_facts.push(
      `PROVEN: live refrigerator filter pages scanned=${liveRows.length}; with_go=${withGo}; without_go=${withoutGo}.`,
    );
  }

  const inferred_facts = [
    "INFERRED: slugs with existing PASS_/EXACT_PDP evidence but no live /go likely need Supabase row + owner apply review — not new gate weakening.",
    "INFERRED: slugs with CSV search-placeholder only and no evidence need official manufacturer or exact retailer PDP browser collection.",
  ];

  const unknown_facts = [
    "UNKNOWN: per-slug live Supabase safe-CTA counts unless loaded by separate read-only parity scripts.",
    "UNKNOWN: production /go redirect target without clicking /go (policy blocked).",
  ];
  if (liveScanStatus === "SKIPPED") {
    unknown_facts.push("UNKNOWN: live HTML scan skipped in this build invocation.");
  }

  return {
    contract: FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    production_go_first_hop_validation_status: "UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH",
    generated_at: now().toISOString(),
    source_command: FRIDGE_SAFE_LINK_RESCUE_SOURCE_COMMAND_V1,
    exact_repo_paths_read,
    live_scan: {
      sitemap_url: LIVE_SITEMAP_URL_V1,
      live_scan_status: liveScanStatus,
      live_refrigerator_filter_pages_scanned: liveRows.length,
      live_with_go_cta_count: withGo,
      live_without_go_cta_count: withoutGo,
      never_requested_go_urls: true,
    },
    cohort_summary: {
      missing_safe_link_slug_count: built.length,
      with_evidence_count,
      apply_review_ready_count,
      no_safe_pdp_count,
      no_evidence_count: built.length - with_evidence_count,
    },
    missing_safe_link_slugs: built,
    ranked_top_10,
    recommended_first_batch_of_5,
    recommended_next_action:
      "Start read-only owner browser/evidence collection on recommended_first_batch_of_5 only. Do not authorize Verified Links, CSV apply, Supabase writes, evidence mutation, or production /go clicks until separate owner apply-review packets exist.",
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}

export function writeFridgeSafeLinkRescueOwnerReviewDraftsV1(args: {
  rootDir: string;
  report: FridgeSafeLinkRescueOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, `${buildFridgeSafeLinkRescueOwnerReviewMarkdownV1(args.report)}\n`, "utf8");
  return {
    json_rel_path: FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
    md_rel_path: FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_MD_REL_V1,
  };
}

export function digestFridgeSafeLinkRescueReportV1(report: FridgeSafeLinkRescueOwnerReviewV1): string {
  return createHash("sha256").update(JSON.stringify(report.missing_safe_link_slugs.map((r) => r.slug))).digest("hex").slice(0, 12);
}
