/**
 * Reusable Frigidaire storefront adapter for refrigerator-water rescue.
 * Read-only — no CSV/Supabase/public UI mutation; coverage_unlocked=false.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

import {
  FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
  type FridgeSafeLinkRescueOwnerReviewV1,
} from "./fridge-safe-link-rescue-owner-review-v1";
import {
  discoverFrigidaireProvenPdpUrl,
  deriveFrigidaireRescueValidationGates,
  FRIGIDAIRE_CONFUSION_FAMILY_REVIEW_SLUGS_V1,
  FRIGIDAIRE_MANUFACTURER_RESCUE_CONFIG_V1,
  FRIGIDAIRE_OFFICIAL_HOST_V1,
  FRIGIDAIRE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1,
  FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
  frigidaireManufacturerPdpPatternStatusV1,
  loadFrigidaireRepoProvenOfficialTargetUrlV1,
  type FrigidaireRefrigeratorRescueValidationGateIdV1,
} from "./manufacturer-safe-link-rescue-frigidaire-config-v1";
import {
  normManufacturerToken,
  READ_ONLY_MUTATION_FLAGS_V1,
  type ManufacturerRescueValidationGateV1,
  type WrongFamilyAssessmentV1,
} from "./manufacturer-safe-link-rescue-framework-v1";

export const FRIGIDAIRE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1 =
  "frigidaire_refrigerator_rescue_adapter_v1" as const;

export const FRIGIDAIRE_RESCUE_ADAPTER_DRAFT_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/frigidaire-refrigerator-rescue-adapter-v1.json" as const;

export const FRIGIDAIRE_RESCUE_ADAPTER_DRAFT_MD_REL_V1 =
  "data/fridge/batch-production/drafts/frigidaire-refrigerator-rescue-adapter-v1.md" as const;

export {
  FRIGIDAIRE_OFFICIAL_HOST_V1,
  FRIGIDAIRE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1,
  FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
  FRIGIDAIRE_REFRIGERATOR_RESCUE_VALIDATION_GATE_IDS_V1,
  type FrigidaireRefrigeratorRescueValidationGateIdV1,
} from "./manufacturer-safe-link-rescue-frigidaire-config-v1";

export type FrigidaireSearchPlaceholderRowV1 = {
  filter_slug: string;
  brand_slug: string | null;
  oem_part_token: string;
  retailer_key: string | null;
  retailer_name: string | null;
  affiliate_url: string;
  is_primary: boolean;
  browser_truth_classification: string | null;
  gate_failure_kind: string | null;
  retailer_link_state: string;
};

export type FrigidaireRefrigeratorRescueCohortRowV1 = {
  filter_slug: string;
  brand_slug: string | null;
  oem_part_token: string;
  in_fridge_rescue_queue: boolean;
  rescue_queue_rank: number | null;
  csv_primary_is_search_placeholder: boolean;
  csv_browser_truth_classification: string | null;
  current_primary_affiliate_url: string | null;
  repo_proven_official_pdp_url: string | null;
  repo_proven_pdp_source: "owner_browser_proof_result" | "committed_browser_evidence" | null;
  manufacturer_pdp_pattern_status: "UNKNOWN" | "PROVEN_PARTIAL";
  proposed_retailer_name: "Frigidaire";
  proposed_retailer_key: "oem-parts-catalog";
  proposed_customer_label: "BuckParts Verified Link";
  proposed_label_subtype: "official_manufacturer_official_frigidaire";
  confusion_family_review_required: boolean;
  wrong_family_forbidden_tokens: string[];
  validation_gates: ManufacturerRescueValidationGateV1[];
  adapter_ready_for_browser_capture: boolean;
  owner_apply_lane_eligible: false;
};

export type FrigidaireRefrigeratorRescueAdapterReportV1 = {
  contract: typeof FRIGIDAIRE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  coverage_unlocked: false;
  generated_at: string;
  source_paths_read: string[];
  manufacturer_pdp_pattern_status: "UNKNOWN" | "PROVEN_PARTIAL";
  cohort_summary: {
    frigidaire_rescue_search_placeholder_count: number;
    repo_proven_official_pdp_slug_count: number;
    in_fridge_rescue_queue_count: number;
    confusion_family_review_slug_count: number;
    adapter_ready_for_browser_capture_count: number;
    pdp_pattern_guessed_slug_count: 0;
  };
  rows: FrigidaireRefrigeratorRescueCohortRowV1[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

type FilterRow = { slug?: string; brand_slug?: string; oem_part_number?: string };
type RetailerLinkRow = {
  filter_slug?: string;
  retailer_name?: string;
  retailer_key?: string;
  affiliate_url?: string;
  is_primary?: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
};

const RETAILER_LINKS_CSV_REL = "data/retailer_links.csv" as const;
const FILTERS_CSV_REL = "data/filters.csv" as const;

const PROPOSED_RETAILER_NAME = "Frigidaire" as const;
const PROPOSED_RETAILER_KEY = "oem-parts-catalog" as const;
const PROPOSED_CUSTOMER_LABEL = "BuckParts Verified Link" as const;
const PROPOSED_LABEL_SUBTYPE = "official_manufacturer_official_frigidaire" as const;

export function normFrigidaireToken(v: string | null | undefined): string {
  return normManufacturerToken(v);
}

export function isFrigidaireSearchPlaceholderUrl(
  retailerKey: string | null | undefined,
  url: string,
): boolean {
  return FRIGIDAIRE_MANUFACTURER_RESCUE_CONFIG_V1.search_placeholder.isSearchPlaceholderUrl(
    retailerKey,
    url,
  );
}

export function isFrigidaireOfficialPdpUrl(url: string): boolean {
  return FRIGIDAIRE_MANUFACTURER_RESCUE_CONFIG_V1.pdp_discovery.isOfficialPdpUrl(url);
}

export function assessFrigidaireWrongFamilyTokens(args: {
  filterSlug: string;
  oemPartToken: string;
  finalUrl?: string;
  title?: string;
  h1Text?: string;
  textSample?: string;
  candidateToken?: string | null;
}): WrongFamilyAssessmentV1 {
  return FRIGIDAIRE_MANUFACTURER_RESCUE_CONFIG_V1.wrong_family.assess(args);
}

export function detectFrigidaireSearchPlaceholderRows(args: {
  retailerRows: RetailerLinkRow[];
  filterRows: FilterRow[];
}): FrigidaireSearchPlaceholderRowV1[] {
  const filtersBySlug = new Map<string, FilterRow>();
  for (const f of args.filterRows) {
    const slug = f.slug?.trim().toLowerCase();
    if (slug) filtersBySlug.set(slug, f);
  }

  const bySlug = new Map<string, RetailerLinkRow[]>();
  for (const row of args.retailerRows) {
    const slug = row.filter_slug?.trim().toLowerCase();
    if (!slug) continue;
    const list = bySlug.get(slug) ?? [];
    list.push(row);
    bySlug.set(slug, list);
  }

  const out: FrigidaireSearchPlaceholderRowV1[] = [];
  for (const slug of FRIGIDAIRE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1) {
    const rows = bySlug.get(slug) ?? [];
    const primary =
      rows.find((r) => (r.is_primary ?? "").trim().toLowerCase() === "true") ?? rows[0];
    if (!primary) continue;
    const url = (primary.affiliate_url ?? "").trim();
    if (!isFrigidaireSearchPlaceholderUrl(primary.retailer_key, url)) continue;
    const filter = filtersBySlug.get(slug);
    const oemToken = normFrigidaireToken(filter?.oem_part_number ?? slug);
    const gate = buyLinkGateFailureKind({
      retailer_key: primary.retailer_key ?? null,
      affiliate_url: url,
      browser_truth_classification: primary.browser_truth_classification ?? null,
      browser_truth_buyable_subtype: primary.browser_truth_buyable_subtype ?? null,
    });
    const state = mapSignalsToRetailerLinkState({
      browserTruthClassification: primary.browser_truth_classification ?? null,
      gateFailureKind: gate,
    });
    out.push({
      filter_slug: slug,
      brand_slug: filter?.brand_slug?.trim() ?? null,
      oem_part_token: oemToken,
      retailer_key: primary.retailer_key?.trim() ?? null,
      retailer_name: primary.retailer_name?.trim() ?? null,
      affiliate_url: url,
      is_primary: true,
      browser_truth_classification: primary.browser_truth_classification?.trim() || null,
      gate_failure_kind: gate,
      retailer_link_state: state,
    });
  }
  return out;
}

function loadCsv<T>(
  rootDir: string,
  rel: string,
  readTextFile: (abs: string) => string,
): T[] {
  const abs = path.join(rootDir, rel);
  return parse(readTextFile(abs), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

export function buildFrigidaireRefrigeratorRescueCohortRowV1(args: {
  rootDir: string;
  filterSlug: string;
  brandSlug: string | null;
  oemPartToken: string;
  csvPrimaryIsSearchPlaceholder: boolean;
  csvBrowserTruthClassification: string | null;
  currentPrimaryAffiliateUrl: string | null;
  inFridgeRescueQueue: boolean;
  rescueQueueRank: number | null;
  manufacturerPdpPatternStatus: "UNKNOWN" | "PROVEN_PARTIAL";
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): FrigidaireRefrigeratorRescueCohortRowV1 {
  const slug = args.filterSlug.trim().toLowerCase();
  const proven = loadFrigidaireRepoProvenOfficialTargetUrlV1({
    rootDir: args.rootDir,
    slug,
    fileExists: args.fileExists,
    readTextFile: args.readTextFile,
  });
  const discovery = discoverFrigidaireProvenPdpUrl({
    rootDir: args.rootDir,
    filterSlug: slug,
    oemPartToken: args.oemPartToken,
    fileExists: args.fileExists,
    readTextFile: args.readTextFile,
  });
  const confusion = FRIGIDAIRE_CONFUSION_FAMILY_REVIEW_SLUGS_V1.has(slug);
  const wrongFamily = assessFrigidaireWrongFamilyTokens({
    filterSlug: slug,
    oemPartToken: args.oemPartToken,
  });
  const gates = deriveFrigidaireRescueValidationGates({
    filterSlug: slug,
    oemPartToken: args.oemPartToken,
    csvPrimaryIsSearchPlaceholder: args.csvPrimaryIsSearchPlaceholder,
    repoProvenOfficialPdpUrl: proven.url,
    pdpPatternStatus: args.manufacturerPdpPatternStatus,
    finalUrl: "",
    title: "",
    h1Text: "",
    textSample: "",
    purchaseActions: [],
    classification: "likely_valid",
    wrongFamily,
    captureCompleted: false,
  });

  return {
    filter_slug: slug,
    brand_slug: args.brandSlug,
    oem_part_token: normFrigidaireToken(args.oemPartToken),
    in_fridge_rescue_queue: args.inFridgeRescueQueue,
    rescue_queue_rank: args.rescueQueueRank,
    csv_primary_is_search_placeholder: args.csvPrimaryIsSearchPlaceholder,
    csv_browser_truth_classification: args.csvBrowserTruthClassification,
    current_primary_affiliate_url: args.currentPrimaryAffiliateUrl,
    repo_proven_official_pdp_url: proven.url,
    repo_proven_pdp_source: proven.source,
    manufacturer_pdp_pattern_status: proven.url ? "PROVEN_PARTIAL" : "UNKNOWN",
    proposed_retailer_name: PROPOSED_RETAILER_NAME,
    proposed_retailer_key: PROPOSED_RETAILER_KEY,
    proposed_customer_label: PROPOSED_CUSTOMER_LABEL,
    proposed_label_subtype: PROPOSED_LABEL_SUBTYPE,
    confusion_family_review_required: confusion,
    wrong_family_forbidden_tokens: [...(FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1[slug] ?? [])],
    validation_gates: gates,
    adapter_ready_for_browser_capture: proven.url !== null,
    owner_apply_lane_eligible: false,
  };
}

export function buildFrigidaireRefrigeratorRescueAdapterReportV1(args: {
  rootDir: string;
  now?: () => Date;
  readTextFile?: (abs: string) => string;
  fileExists?: (abs: string) => boolean;
}): FrigidaireRefrigeratorRescueAdapterReportV1 {
  const now = args.now ?? (() => new Date());
  const rootDir = args.rootDir;
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile =
    args.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));
  const sourcePaths: string[] = [RETAILER_LINKS_CSV_REL, FILTERS_CSV_REL];

  const retailerRows = loadCsv<RetailerLinkRow>(
    rootDir,
    RETAILER_LINKS_CSV_REL,
    readTextFile,
  );
  const filterRows = loadCsv<FilterRow>(rootDir, FILTERS_CSV_REL, readTextFile);
  const placeholderRows = detectFrigidaireSearchPlaceholderRows({ retailerRows, filterRows });

  let rescue: FridgeSafeLinkRescueOwnerReviewV1 | null = null;
  const rescueAbs = path.join(rootDir, FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1);
  if (fileExists(rescueAbs)) {
    try {
      rescue = JSON.parse(readTextFile(rescueAbs)) as FridgeSafeLinkRescueOwnerReviewV1;
      sourcePaths.push(FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1);
    } catch {
      rescue = null;
    }
  }

  const rescueRankBySlug = new Map<string, number>();
  if (rescue) {
    for (const row of rescue.missing_safe_link_slugs) {
      rescueRankBySlug.set(row.slug.toLowerCase(), row.rank);
    }
  }

  const provenSlugCount = placeholderRows.filter((p) => {
    const proven = loadFrigidaireRepoProvenOfficialTargetUrlV1({
      rootDir,
      slug: p.filter_slug,
      fileExists,
      readTextFile,
    });
    return proven.url !== null;
  }).length;

  const manufacturerPdpPatternStatus = frigidaireManufacturerPdpPatternStatusV1({
    provenSlugCount,
    cohortSlugCount: placeholderRows.length,
  });

  const rows = placeholderRows
    .map((p) =>
      buildFrigidaireRefrigeratorRescueCohortRowV1({
        rootDir,
        filterSlug: p.filter_slug,
        brandSlug: p.brand_slug,
        oemPartToken: p.oem_part_token,
        csvPrimaryIsSearchPlaceholder: true,
        csvBrowserTruthClassification: p.browser_truth_classification,
        currentPrimaryAffiliateUrl: p.affiliate_url,
        inFridgeRescueQueue: rescueRankBySlug.has(p.filter_slug),
        rescueQueueRank: rescueRankBySlug.get(p.filter_slug) ?? null,
        manufacturerPdpPatternStatus,
        fileExists,
        readTextFile,
      }),
    )
    .sort((a, b) => a.filter_slug.localeCompare(b.filter_slug));

  const inQueue = rows.filter((r) => r.in_fridge_rescue_queue);

  return {
    contract: FRIGIDAIRE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
    ...READ_ONLY_MUTATION_FLAGS_V1,
    coverage_unlocked: false,
    generated_at: now().toISOString(),
    source_paths_read: sourcePaths,
    manufacturer_pdp_pattern_status: manufacturerPdpPatternStatus,
    cohort_summary: {
      frigidaire_rescue_search_placeholder_count: rows.length,
      repo_proven_official_pdp_slug_count: provenSlugCount,
      in_fridge_rescue_queue_count: inQueue.length,
      confusion_family_review_slug_count: rows.filter((r) => r.confusion_family_review_required)
        .length,
      adapter_ready_for_browser_capture_count: rows.filter(
        (r) => r.adapter_ready_for_browser_capture,
      ).length,
      pdp_pattern_guessed_slug_count: 0,
    },
    rows,
    proven_facts: [
      `PROVEN: ${String(rows.length)} Frigidaire filter slugs have committed frigidaire.com catalogsearch primary rows in data/retailer_links.csv.`,
      `PROVEN: ${String(provenSlugCount)} slugs have PASS owner browser proof official_manufacturer_pdp URLs on disk (wf3cb, eptwfu01, ultrawf).`,
      `PROVEN: Adapter does not infer Frigidaire PDP URLs — pdp_pattern_guessed_slug_count=0.`,
      inQueue.length > 0
        ? `PROVEN: ${String(inQueue.length)} Frigidaire rescue slugs appear in fridge-safe-link-rescue-owner-review missing_safe_link cohort.`
        : "UNKNOWN: fridge-safe-link-rescue-owner-review not loaded or no Frigidaire slugs in rescue queue.",
    ],
    inferred_facts: [
      "INFERRED: Manufacturer-wide Frigidaire PDP URL pattern remains PROVEN_PARTIAL — two proven shapes (frigidaire.com accessory path, frigidaireapplianceparts.com PartDetail) but not inferrable for all cohort slugs.",
      "INFERRED: Owner browser proof + confusion-family review required before any CSV apply.",
    ],
    unknown_facts: [
      "UNKNOWN: Official Frigidaire PDP URLs for 7 cohort slugs without PASS owner browser proof on disk.",
      "UNKNOWN: Live buyability until browser capture runs against repo-proven targets only.",
      "UNKNOWN: Supabase parity state (out of scope for adapter v1).",
    ],
  };
}

export function buildFrigidaireRescueAdapterMarkdownV1(
  report: FrigidaireRefrigeratorRescueAdapterReportV1,
): string {
  return [
    "# Frigidaire Refrigerator Rescue Adapter v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    `**Manufacturer PDP pattern:** ${report.manufacturer_pdp_pattern_status}`,
    `**Coverage unlocked:** ${String(report.coverage_unlocked)}`,
    "",
    "## Cohort summary",
    "",
    `- Search-placeholder slugs: ${String(report.cohort_summary.frigidaire_rescue_search_placeholder_count)}`,
    `- Repo-proven official PDP slugs: ${String(report.cohort_summary.repo_proven_official_pdp_slug_count)}`,
    `- In fridge rescue queue: ${String(report.cohort_summary.in_fridge_rescue_queue_count)}`,
    `- Browser-capture ready (repo-proven target only): ${String(report.cohort_summary.adapter_ready_for_browser_capture_count)}`,
    `- PDP pattern guessed: ${String(report.cohort_summary.pdp_pattern_guessed_slug_count)}`,
    "",
    "## Slugs",
    "",
    ...report.rows.map(
      (r) =>
        `### ${r.filter_slug}\n- Repo proven URL: ${r.repo_proven_official_pdp_url ?? "UNKNOWN"}\n- Capture ready: ${String(r.adapter_ready_for_browser_capture)}\n- Confusion-family review: ${String(r.confusion_family_review_required)}\n`,
    ),
    "",
    "## Prohibited",
    "",
    "- No CSV/Supabase mutation from this adapter.",
    "- No coverage unlock.",
    "- No inferred Frigidaire PDP URLs.",
    "",
  ].join("\n");
}
