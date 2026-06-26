/**
 * Read-only Whirlpool/EveryDrop official accessory PDP browser capture adapter (v1).
 * Implementation delegates to manufacturer-safe-link-rescue-framework-v1 + EveryDrop config.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

import {
  assessEverydropSupersessionForSlug,
  deriveEverydropWhirlpoolProofSignalsFromFramework,
  EVERYDROP_WHIRLPOOL_MANUFACTURER_RESCUE_CONFIG_V1,
  EVERYDROP_WHIRLPOOL_OWNER_PROOF_RESULT_REL_BY_SLUG_V1,
  EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1,
  loadEverydropRepoProvenOfficialTargetUrlV1,
  WHIRLPOOL_OFFICIAL_ACCESSORY_PATH_V1,
  WHIRLPOOL_OFFICIAL_HOST_V1,
  WHIRLPOOL_PARTS_SEARCH_HOST_V1,
  type EverydropWhirlpoolRescueSlugV1,
} from "./manufacturer-safe-link-rescue-everydrop-whirlpool-config-v1";
import {
  createJsonMdDraftWriter,
  defaultBrowserCaptureStrategyV1,
  normManufacturerToken,
} from "./manufacturer-safe-link-rescue-framework-v1";
import type { OemBrowserClassification } from "./rpwfe-official-ge-browser-capture-v1";

export {
  EVERYDROP_WHIRLPOOL_OWNER_PROOF_RESULT_REL_BY_SLUG_V1,
  EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1,
  WHIRLPOOL_OFFICIAL_ACCESSORY_PATH_V1,
  WHIRLPOOL_OFFICIAL_HOST_V1,
  WHIRLPOOL_PARTS_SEARCH_HOST_V1,
  type EverydropWhirlpoolRescueSlugV1,
} from "./manufacturer-safe-link-rescue-everydrop-whirlpool-config-v1";

export const FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_ADAPTER_CONTRACT_V1 =
  "fridge_safe_link_everydrop_whirlpool_official_adapter_v1" as const;

export const FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_PROOF_CONTRACT_V1 =
  "fridge_safe_link_everydrop_whirlpool_official_owner_browser_proof_v1" as const;

export const FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_PROOF_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-everydrop-whirlpool-official-proof-v1.json" as const;

export const FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_PROOF_MD_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-everydrop-whirlpool-official-proof-v1.md" as const;

export const FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_PROOF_ALLOWED_WRITE_REL_PATHS_V1 = [
  FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_PROOF_JSON_REL_V1,
  FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_PROOF_MD_REL_V1,
] as const;

const RETAILER_LINKS_CSV_REL = "data/retailer_links.csv" as const;
const FILTERS_CSV_REL = "data/filters.csv" as const;

export type EverydropWhirlpoolOfficialProofRowV1 = {
  filter_slug: EverydropWhirlpoolRescueSlugV1;
  oem_part_token: string;
  brand_slug: string | null;
  csv_primary_is_search_placeholder: boolean;
  current_primary_affiliate_url: string | null;
  /** Null unless committed repo owner-proof or browser evidence proves an official Whirlpool accessory PDP URL. */
  repo_proven_official_target_url: string | null;
  repo_proven_target_source: "owner_browser_proof_result" | "committed_browser_evidence" | null;
  target_url_for_capture: string | null;
  path_type: "official_manufacturer_accessory_pdp" | "UNKNOWN";
  checked_at: string;
  capture_method: "playwright_headless" | "owner_browser_checklist_only";
  whirlpool_official_pdp_proof_result: "PROVEN" | "INFERRED" | "UNKNOWN";
  browser_truth_status: "PASS" | "FAIL" | "UNKNOWN";
  direct_pdp_status: "PROVEN" | "NOT_PROVEN" | "UNKNOWN";
  exact_token_proven: boolean | "UNKNOWN";
  current_direct_buyability_proven: boolean | "UNKNOWN";
  official_manufacturer_path_proven: boolean | "UNKNOWN";
  supersession_review_required: boolean;
  supersession_notes: string | null;
  evidence_summary: string;
  captured_signals: {
    final_url: string | null;
    page_title: string | null;
    h1_text: string | null;
    purchase_actions_visible: string[];
    classification: OemBrowserClassification | "UNKNOWN";
    classification_notes: string | null;
    text_sample_excerpt: string | null;
    screenshot_path: string | null;
    navigation_error: string | null;
  };
  blockers: string[];
  owner_browser_checklist: string[];
  apply_plan_proposal_justified: false;
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  production_go_click_authorized: false;
  coverage_unlocked: false;
};

export type EverydropWhirlpoolOfficialCohortProofV1 = {
  contract: typeof FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_ADAPTER_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  verified_link_authorized: false;
  coverage_unlocked: false;
  generated_at: string;
  source_paths_read: string[];
  cohort_slug_count: number;
  repo_proven_target_url_count: number;
  checklist_only_count: number;
  browser_pass_count: number;
  rows: EverydropWhirlpoolOfficialProofRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

type FilterRow = { slug?: string; brand_slug?: string; oem_part_number?: string };
type RetailerLinkRow = {
  filter_slug?: string;
  retailer_key?: string;
  retailer_name?: string;
  affiliate_url?: string;
  is_primary?: string;
  browser_truth_classification?: string | null;
};

function isTruthyPrimary(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function normEverydropToken(v: string | null | undefined): string {
  return normManufacturerToken(v);
}

export function isWhirlpoolOfficialHost(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes(WHIRLPOOL_OFFICIAL_HOST_V1);
  } catch {
    return url.toLowerCase().includes(WHIRLPOOL_OFFICIAL_HOST_V1);
  }
}

export function isWhirlpoolOfficialAccessoryPdpUrl(url: string): boolean {
  return EVERYDROP_WHIRLPOOL_MANUFACTURER_RESCUE_CONFIG_V1.pdp_discovery.isOfficialPdpUrl(url);
}

export function isWhirlpoolPartsSearchPlaceholderUrl(
  retailerKey: string | null | undefined,
  url: string,
): boolean {
  return EVERYDROP_WHIRLPOOL_MANUFACTURER_RESCUE_CONFIG_V1.search_placeholder.isSearchPlaceholderUrl(
    retailerKey,
    url,
  );
}

export function everydropWhirlpoolOfficialScreenshotRelV1(slug: string): string {
  return `data/fridge/batch-production/drafts/screenshots/fridge-safe-link-everydrop-whirlpool-official-${slug.toLowerCase()}-v1.png`;
}

function readCsv<T extends Record<string, unknown>>(
  rootDir: string,
  rel: string,
): T[] {
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return [];
  return parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

export function loadRepoProvenOfficialTargetUrlV1(args: {
  rootDir: string;
  slug: EverydropWhirlpoolRescueSlugV1;
}): {
  url: string | null;
  source: EverydropWhirlpoolOfficialProofRowV1["repo_proven_target_source"];
} {
  return loadEverydropRepoProvenOfficialTargetUrlV1(args);
}

export function assessSupersessionForSlug(args: {
  slug: EverydropWhirlpoolRescueSlugV1;
  oemToken: string;
  title: string;
  h1Text: string;
  textSample: string;
}): { required: boolean; notes: string | null } {
  return assessEverydropSupersessionForSlug(args);
}

export function deriveEverydropWhirlpoolOfficialProofSignals(args: {
  slug: EverydropWhirlpoolRescueSlugV1;
  oemToken: string;
  targetUrl: string | null;
  finalUrl: string;
  title: string;
  h1Text: string;
  textSample: string;
  purchaseActions: string[];
  classification: OemBrowserClassification;
  captureSucceeded: boolean;
}): Pick<
  EverydropWhirlpoolOfficialProofRowV1,
  | "browser_truth_status"
  | "direct_pdp_status"
  | "exact_token_proven"
  | "current_direct_buyability_proven"
  | "official_manufacturer_path_proven"
  | "whirlpool_official_pdp_proof_result"
  | "supersession_review_required"
  | "supersession_notes"
  | "blockers"
> {
  return deriveEverydropWhirlpoolProofSignalsFromFramework(args);
}

export function buildOwnerBrowserChecklistOnlyProofForSlugV1(args: {
  slug: EverydropWhirlpoolRescueSlugV1;
  oemToken: string;
  brandSlug: string | null;
  csvPrimaryUrl: string | null;
  repoProvenTargetUrl: string | null;
  now?: () => Date;
  captureError?: string;
}): EverydropWhirlpoolOfficialProofRowV1 {
  const now = args.now ?? (() => new Date());
  const checklist = [
    args.repoProvenTargetUrl
      ? `Open repo-proven official URL in owner US browser: ${args.repoProvenTargetUrl}`
      : "No repo-proven official Whirlpool accessory PDP URL — discover official manufacturer page before capture.",
    `Confirm final URL remains whirlpool.com${WHIRLPOOL_OFFICIAL_ACCESSORY_PATH_V1} accessory PDP (not whirlpoolparts.com search).`,
    `Confirm page title or H1 contains literal ${args.oemToken}.`,
    "Confirm EveryDrop / Whirlpool official manufacturer context.",
    "Confirm Add To Cart (or equivalent) and price/stock visible on single-pack PDP.",
    "Do not mutate retailer_links.csv, Supabase, or data/evidence from checklist alone.",
  ];

  return {
    filter_slug: args.slug,
    oem_part_token: args.oemToken,
    brand_slug: args.brandSlug,
    csv_primary_is_search_placeholder: args.csvPrimaryUrl
      ? isWhirlpoolPartsSearchPlaceholderUrl("oem-parts-catalog", args.csvPrimaryUrl)
      : false,
    current_primary_affiliate_url: args.csvPrimaryUrl,
    repo_proven_official_target_url: args.repoProvenTargetUrl,
    repo_proven_target_source: args.repoProvenTargetUrl ? "owner_browser_proof_result" : null,
    target_url_for_capture: args.repoProvenTargetUrl,
    path_type: args.repoProvenTargetUrl ? "official_manufacturer_accessory_pdp" : "UNKNOWN",
    checked_at: now().toISOString(),
    capture_method: "owner_browser_checklist_only",
    whirlpool_official_pdp_proof_result: "UNKNOWN",
    browser_truth_status: "UNKNOWN",
    direct_pdp_status: "UNKNOWN",
    exact_token_proven: "UNKNOWN",
    current_direct_buyability_proven: "UNKNOWN",
    official_manufacturer_path_proven: "UNKNOWN",
    supersession_review_required: args.slug === "w10413645a",
    supersession_notes:
      args.slug === "w10413645a"
        ? "Legacy W10413645A superseded by EDR2RXD1 — official replacement PDP must be owner-confirmed."
        : null,
    evidence_summary:
      "UNKNOWN: live Whirlpool official accessory PDP not captured in this environment; owner-browser checklist required.",
    captured_signals: {
      final_url: null,
      page_title: null,
      h1_text: null,
      purchase_actions_visible: [],
      classification: "UNKNOWN",
      classification_notes: args.captureError ?? "playwright capture not run or failed",
      text_sample_excerpt: null,
      screenshot_path: null,
      navigation_error: args.captureError ?? null,
    },
    blockers: [
      "live_browser_capture_unavailable_or_failed",
      ...(args.repoProvenTargetUrl ? [] : ["repo_proven_official_target_url_missing"]),
      "exact_token_not_proven",
      "mutation_authorized=false",
      "verified_link_authorized=false",
    ],
    owner_browser_checklist: checklist,
    apply_plan_proposal_justified: false,
    recommended_next_action: args.repoProvenTargetUrl
      ? `Complete owner-browser checklist or rerun capture for ${args.slug}; do not draft apply plan until whirlpool_official_pdp_proof_result=PROVEN.`
      : `No repo-proven official Whirlpool PDP for ${args.slug} — owner browser discovery required before capture.`,
    proven_facts: [
      "PROVEN: draft proof row is read_only=true; all mutation flags false.",
      "PROVEN: coverage_unlocked=false — no safe-link coverage claim.",
      ...(args.repoProvenTargetUrl
        ? [`PROVEN: repo owner-proof committed official URL: ${args.repoProvenTargetUrl}`]
        : []),
    ],
    unknown_facts: [
      "UNKNOWN: HTTP load, page title, exact token, buyability until owner browser or successful Playwright capture.",
      "UNKNOWN: production /go first-hop without clicking /go.",
    ],
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    production_go_click_authorized: false,
    coverage_unlocked: false,
  };
}

export async function captureEverydropWhirlpoolOfficialProofForSlugV1(args: {
  rootDir: string;
  slug: EverydropWhirlpoolRescueSlugV1;
  oemToken: string;
  brandSlug: string | null;
  csvPrimaryUrl: string | null;
  repoProvenTargetUrl: string | null;
  now?: () => Date;
  writeDraftScreenshot?: boolean;
  runPlaywright?: boolean;
}): Promise<EverydropWhirlpoolOfficialProofRowV1> {
  const now = args.now ?? (() => new Date());
  const targetUrl = args.repoProvenTargetUrl;

  if (!targetUrl || args.runPlaywright === false) {
    return buildOwnerBrowserChecklistOnlyProofForSlugV1({
      slug: args.slug,
      oemToken: args.oemToken,
      brandSlug: args.brandSlug,
      csvPrimaryUrl: args.csvPrimaryUrl,
      repoProvenTargetUrl: targetUrl,
      now,
      captureError: targetUrl ? "playwright_capture_skipped" : undefined,
    });
  }

  const screenshotRel = everydropWhirlpoolOfficialScreenshotRelV1(args.slug);

  let capture;
  try {
    capture = await defaultBrowserCaptureStrategyV1.captureOemPage({
      rootDir: args.rootDir,
      targetUrl,
      screenshotRel,
      writeScreenshot: args.writeDraftScreenshot,
      userAgent: EVERYDROP_WHIRLPOOL_MANUFACTURER_RESCUE_CONFIG_V1.browser_capture_user_agent,
    });
  } catch (e) {
    const gotoErr = e instanceof Error ? e.message : String(e);
    return buildOwnerBrowserChecklistOnlyProofForSlugV1({
      slug: args.slug,
      oemToken: args.oemToken,
      brandSlug: args.brandSlug,
      csvPrimaryUrl: args.csvPrimaryUrl,
      repoProvenTargetUrl: targetUrl,
      now,
      captureError: gotoErr,
    });
  }

  if (!capture.captureSucceeded) {
    return buildOwnerBrowserChecklistOnlyProofForSlugV1({
      slug: args.slug,
      oemToken: args.oemToken,
      brandSlug: args.brandSlug,
      csvPrimaryUrl: args.csvPrimaryUrl,
      repoProvenTargetUrl: targetUrl,
      now,
      captureError: capture.gotoError || "playwright_capture_failed",
    });
  }

  const {
    finalUrl,
    title,
    h1Text,
    textSample,
    purchaseActions,
    classification,
    classificationNotes: notes,
    captureSucceeded,
    gotoError: gotoErr,
  } = capture;

  const derived = deriveEverydropWhirlpoolOfficialProofSignals({
    slug: args.slug,
    oemToken: args.oemToken,
    targetUrl,
    finalUrl,
    title,
    h1Text,
    textSample,
    purchaseActions,
    classification,
    captureSucceeded,
  });

  const evidence_summary =
    derived.browser_truth_status === "PASS"
      ? `PROVEN: Whirlpool official accessory PDP for ${args.slug} with visible exact token and Add To Cart.`
      : derived.browser_truth_status === "FAIL"
        ? `FAIL: Whirlpool official capture did not pass all gates (${derived.blockers.join("; ")}).`
        : "UNKNOWN: Whirlpool official browser capture incomplete.";

  return {
    filter_slug: args.slug,
    oem_part_token: args.oemToken,
    brand_slug: args.brandSlug,
    csv_primary_is_search_placeholder: args.csvPrimaryUrl
      ? isWhirlpoolPartsSearchPlaceholderUrl("oem-parts-catalog", args.csvPrimaryUrl)
      : false,
    current_primary_affiliate_url: args.csvPrimaryUrl,
    repo_proven_official_target_url: targetUrl,
    repo_proven_target_source: "owner_browser_proof_result",
    target_url_for_capture: targetUrl,
    path_type: "official_manufacturer_accessory_pdp",
    checked_at: now().toISOString(),
    capture_method: "playwright_headless",
    whirlpool_official_pdp_proof_result: derived.whirlpool_official_pdp_proof_result,
    browser_truth_status: derived.browser_truth_status,
    direct_pdp_status: derived.direct_pdp_status,
    exact_token_proven: derived.exact_token_proven,
    current_direct_buyability_proven: derived.current_direct_buyability_proven,
    official_manufacturer_path_proven: derived.official_manufacturer_path_proven,
    supersession_review_required: derived.supersession_review_required,
    supersession_notes: derived.supersession_notes,
    evidence_summary,
    captured_signals: {
      final_url: finalUrl || null,
      page_title: title || null,
      h1_text: h1Text || null,
      purchase_actions_visible: purchaseActions,
      classification,
      classification_notes: notes,
      text_sample_excerpt: textSample.slice(0, 800) || null,
      screenshot_path: args.writeDraftScreenshot !== false ? screenshotRel : null,
      navigation_error: gotoErr || null,
    },
    blockers: derived.blockers,
    owner_browser_checklist: [
      "Owner confirms captured Whirlpool official PDP matches filter slug and single-pack identity.",
      "Do not apply CSV/Supabase/Verified Link from this draft alone.",
    ],
    apply_plan_proposal_justified: false,
    recommended_next_action:
      derived.browser_truth_status === "PASS"
        ? "Owner review draft proof — separate read-only apply-plan proposal still requires explicit authorization."
        : "Owner complete browser checklist or rerun capture; coverage remains locked.",
    proven_facts: [
      "PROVEN: draft proof row is read_only=true; coverage_unlocked=false.",
      `PROVEN: capture targeted repo-proven official URL only (${targetUrl}).`,
    ],
    unknown_facts:
      derived.browser_truth_status === "PASS"
        ? ["UNKNOWN: live Supabase retailer_links parity.", "UNKNOWN: production /go first-hop."]
        : ["UNKNOWN: current buyer path until capture passes or owner completes checklist."],
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    production_go_click_authorized: false,
    coverage_unlocked: false,
  };
}

export async function buildEverydropWhirlpoolOfficialCohortProofV1(args: {
  rootDir: string;
  now?: () => Date;
  runPlaywright?: boolean;
  writeDraftScreenshot?: boolean;
}): Promise<EverydropWhirlpoolOfficialCohortProofV1> {
  const now = args.now ?? (() => new Date());
  const filters = readCsv<FilterRow>(args.rootDir, FILTERS_CSV_REL);
  const links = readCsv<RetailerLinkRow>(args.rootDir, RETAILER_LINKS_CSV_REL);

  const filterBySlug = new Map<string, FilterRow>();
  for (const f of filters) {
    const slug = f.slug?.trim().toLowerCase();
    if (slug) filterBySlug.set(slug, f);
  }

  const primaryBySlug = new Map<string, RetailerLinkRow>();
  for (const row of links) {
    const slug = row.filter_slug?.trim().toLowerCase();
    if (!slug) continue;
    const existing = primaryBySlug.get(slug);
    if (!existing || isTruthyPrimary(row.is_primary)) primaryBySlug.set(slug, row);
  }

  const rows: EverydropWhirlpoolOfficialProofRowV1[] = [];
  for (const slug of EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1) {
    const filter = filterBySlug.get(slug);
    const primary = primaryBySlug.get(slug);
    const oemToken = normEverydropToken(filter?.oem_part_number ?? slug);
    const csvUrl = (primary?.affiliate_url ?? "").trim() || null;
    const { url: repoProvenTargetUrl } = loadRepoProvenOfficialTargetUrlV1({
      rootDir: args.rootDir,
      slug,
    });

    const row = await captureEverydropWhirlpoolOfficialProofForSlugV1({
      rootDir: args.rootDir,
      slug,
      oemToken,
      brandSlug: filter?.brand_slug?.trim() ?? null,
      csvPrimaryUrl: csvUrl,
      repoProvenTargetUrl,
      now,
      runPlaywright: args.runPlaywright,
      writeDraftScreenshot: args.writeDraftScreenshot,
    });
    rows.push(row);
  }

  const repoProvenTargetUrlCount = rows.filter((r) => r.repo_proven_official_target_url).length;
  const checklistOnlyCount = rows.filter((r) => r.capture_method === "owner_browser_checklist_only").length;
  const browserPassCount = rows.filter((r) => r.browser_truth_status === "PASS").length;

  return {
    contract: FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_ADAPTER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    verified_link_authorized: false,
    coverage_unlocked: false,
    generated_at: now().toISOString(),
    source_paths_read: [
      RETAILER_LINKS_CSV_REL,
      FILTERS_CSV_REL,
      ...Object.values(EVERYDROP_WHIRLPOOL_OWNER_PROOF_RESULT_REL_BY_SLUG_V1),
    ],
    cohort_slug_count: EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1.length,
    repo_proven_target_url_count: repoProvenTargetUrlCount,
    checklist_only_count: checklistOnlyCount,
    browser_pass_count: browserPassCount,
    rows,
    proven_facts: [
      `PROVEN: cohort is exactly ${String(EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1.length)} whirlpoolparts.com search-placeholder slugs from committed CSV.`,
      "PROVEN: read-only adapter — no CSV/Supabase/SQL mutation.",
      "PROVEN: coverage_unlocked=false on cohort and all rows.",
      `PROVEN: repo_proven_official_target_url_count=${String(repoProvenTargetUrlCount)} (owner browser proof artifacts only).`,
    ],
    unknown_facts: [
      "UNKNOWN: live Whirlpool official PDP for slugs without repo-proven target URL.",
      "UNKNOWN: production /go and Supabase parity for all cohort slugs.",
    ],
    recommended_next_action:
      browserPassCount > 0
        ? "Owner review passing capture rows — still no CSV apply without explicit authorization."
        : "All cohort slugs remain checklist-only/UNKNOWN for automated capture — complete owner browser proof for remaining slugs before apply planning.",
  };
}

export function buildEverydropWhirlpoolOfficialCohortProofMarkdownV1(
  report: EverydropWhirlpoolOfficialCohortProofV1,
): string {
  const lines = [
    "# EveryDrop / Whirlpool official rescue proof (read-only draft)",
    "",
    `Generated: ${report.generated_at}`,
    `Cohort slugs: ${String(report.cohort_slug_count)}`,
    `Repo-proven official target URLs: ${String(report.repo_proven_target_url_count)}`,
    `Checklist-only rows: ${String(report.checklist_only_count)}`,
    `Browser PASS rows: ${String(report.browser_pass_count)}`,
    "",
    "**coverage_unlocked:** false",
    "",
    report.recommended_next_action,
    "",
    "## Slugs",
    "",
  ];

  for (const row of report.rows) {
    lines.push(`### ${row.filter_slug}`);
    lines.push("");
    lines.push(`- oem: **${row.oem_part_token}**`);
    lines.push(`- repo_proven_official_target_url: ${row.repo_proven_official_target_url ?? "null"}`);
    lines.push(`- capture_method: \`${row.capture_method}\``);
    lines.push(`- whirlpool_official_pdp_proof_result: **${row.whirlpool_official_pdp_proof_result}**`);
    lines.push(`- browser_truth_status: **${row.browser_truth_status}**`);
    lines.push(`- apply_plan_proposal_justified: **false**`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function writeEverydropWhirlpoolOfficialProofDraftsV1(args: {
  rootDir: string;
  report: EverydropWhirlpoolOfficialCohortProofV1;
}): { json_rel_path: string; md_rel_path: string } {
  const writer = createJsonMdDraftWriter<EverydropWhirlpoolOfficialCohortProofV1>({
    jsonRelPath: FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_PROOF_JSON_REL_V1,
    mdRelPath: FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_PROOF_MD_REL_V1,
    buildMarkdown: buildEverydropWhirlpoolOfficialCohortProofMarkdownV1,
  });
  return writer.writeDrafts(args);
}

export function summarizeCsvPrimaryGateForSlug(args: {
  retailerKey: string | null;
  affiliateUrl: string;
  browserTruthClassification: string | null;
}): string | null {
  return buyLinkGateFailureKind({
    retailer_key: args.retailerKey,
    affiliate_url: args.affiliateUrl,
    browser_truth_classification: args.browserTruthClassification,
    browser_truth_buyable_subtype: null,
  });
}
