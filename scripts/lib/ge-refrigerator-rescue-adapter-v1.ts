/**
 * Reusable GE Appliance Parts storefront adapter for refrigerator-water rescue.
 * Read-only — no CSV/Supabase/public UI mutation.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

import {
  GE_APPLIANCE_PARTS_HOST_V1,
  GE_MANUFACTURER_RESCUE_CONFIG_V1,
  GE_SUPERSESSION_REVIEW_SLUGS_V1,
  GE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
  toGeValidationGateInput,
  type GeRefrigeratorRescueValidationGateIdV1,
} from "./manufacturer-safe-link-rescue-ge-config-v1";
import {
  assessExactTokenInTitleOrH1WordBoundary,
  normManufacturerToken,
} from "./manufacturer-safe-link-rescue-framework-v1";
import {
  FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
  type FridgeSafeLinkRescueOwnerReviewV1,
} from "./fridge-safe-link-rescue-owner-review-v1";

export {
  GE_APPLIANCE_PARTS_HOST_V1,
  GE_SPEC_PDP_PATH_PATTERN_V1,
  GE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
  GE_SUPERSESSION_REVIEW_SLUGS_V1,
  GE_REFRIGERATOR_RESCUE_VALIDATION_GATE_IDS_V1,
  type GeRefrigeratorRescueValidationGateIdV1,
} from "./manufacturer-safe-link-rescue-ge-config-v1";

export const GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1 =
  "ge_refrigerator_rescue_adapter_v1" as const;

/** Slugs with committed GE search-placeholder primary rows (repo truth 2026-06). */
export const GE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1 = [
  "mwf",
  "mswf",
  "xwfe",
  "xwf",
  "gswf",
  "smartwater-mwfp",
  "opfg3f",
  "pfmwf",
  "gswf2",
] as const;

/** Reference slug — already direct_buyable official GE spec PDP (not in rescue cohort). */
export const GE_RESCUE_REFERENCE_APPLIED_SLUG_V1 = "rpwfe" as const;

export const GE_RESCUE_COHORT_SLUGS_V1 = [
  ...GE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1,
  GE_RESCUE_REFERENCE_APPLIED_SLUG_V1,
] as const;

export type GeRescueCohortSlugV1 = (typeof GE_RESCUE_COHORT_SLUGS_V1)[number];

export type GeRefrigeratorRescueValidationGateV1 = {
  gate_id: GeRefrigeratorRescueValidationGateIdV1;
  status: "PASS" | "FAIL" | "UNKNOWN" | "WAIVED";
  notes: string;
};

export type GeSearchPlaceholderRowV1 = {
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

export type GeSpecPdpDiscoveryV1 = {
  filter_slug: string;
  oem_part_token: string;
  inferred_spec_url: string;
  discovery_provenance: "INFERRED_GE_SPEC";
  path_type: "official_manufacturer_spec_pdp";
  known_broken_destination: boolean;
};

export type GeWrongFamilyAssessmentV1 = {
  blocked: boolean;
  forbidden_tokens_checked: string[];
  detected_forbidden_tokens: string[];
  notes: string;
};

export type GeRefrigeratorRescueCohortRowV1 = {
  filter_slug: string;
  brand_slug: string | null;
  oem_part_token: string;
  cohort_lane: "RESCUE_SEARCH_PLACEHOLDER" | "REFERENCE_ALREADY_APPLIED";
  in_fridge_rescue_queue: boolean;
  rescue_queue_rank: number | null;
  csv_primary_is_search_placeholder: boolean;
  csv_browser_truth_classification: string | null;
  current_primary_affiliate_url: string | null;
  discovered_spec_pdp_url: string | null;
  discovered_spec_known_broken: boolean;
  proposed_retailer_name: "GE Appliance Parts";
  proposed_retailer_key: "oem-parts-catalog";
  proposed_customer_label: "BuckParts Verified Link";
  proposed_label_subtype: "official_manufacturer_official_ge";
  supersession_review_required: boolean;
  wrong_family_forbidden_tokens: string[];
  browser_evidence_artifact_rel_path: string;
  validation_gates: GeRefrigeratorRescueValidationGateV1[];
  adapter_ready_for_browser_capture: boolean;
  owner_apply_packet_lane_eligible: boolean;
};

export type GeRefrigeratorRescueAdapterReportV1 = {
  contract: typeof GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  generated_at: string;
  source_paths_read: string[];
  cohort_summary: {
    ge_rescue_search_placeholder_count: number;
    ge_reference_applied_count: number;
    in_fridge_rescue_queue_count: number;
    supersession_review_slug_count: number;
    adapter_ready_for_browser_capture_count: number;
  };
  rows: GeRefrigeratorRescueCohortRowV1[];
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

const PROPOSED_RETAILER_NAME = "GE Appliance Parts" as const;
const PROPOSED_RETAILER_KEY = "oem-parts-catalog" as const;
const PROPOSED_CUSTOMER_LABEL = "BuckParts Verified Link" as const;
const PROPOSED_LABEL_SUBTYPE = "official_manufacturer_official_ge" as const;

export function geRescueBrowserEvidenceArtifactRelPathV1(slug: string): string {
  return `data/fridge/batch-production/ge-rescue/${slug.toLowerCase()}-official-ge-browser-evidence-v1.json`;
}

export function geRescueBrowserEvidenceScreenshotRelPathV1(slug: string): string {
  return `data/fridge/batch-production/ge-rescue/screenshots/${slug.toLowerCase()}-official-ge-spec-v1.png`;
}

export function normGeToken(v: string | null | undefined): string {
  return normManufacturerToken(v);
}

export function isGeAppliancePartsUrl(url: string): boolean {
  return GE_MANUFACTURER_RESCUE_CONFIG_V1.pdp_discovery.isOfficialPdpUrl(url) ||
    url.toLowerCase().includes(GE_APPLIANCE_PARTS_HOST_V1);
}

export function isGeAppliancePartsSearchPlaceholderUrl(
  retailerKey: string | null | undefined,
  url: string,
): boolean {
  return GE_MANUFACTURER_RESCUE_CONFIG_V1.search_placeholder.isSearchPlaceholderUrl(retailerKey, url);
}

export function isGeAppliancePartsSpecPdpUrl(url: string): boolean {
  return GE_MANUFACTURER_RESCUE_CONFIG_V1.pdp_discovery.isOfficialPdpUrl(url);
}

export function detectGeSearchPlaceholderRows(args: {
  retailerRows: RetailerLinkRow[];
  filterRows: FilterRow[];
}): GeSearchPlaceholderRowV1[] {
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

  const out: GeSearchPlaceholderRowV1[] = [];
  for (const slug of GE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1) {
    const rows = bySlug.get(slug) ?? [];
    const primary =
      rows.find((r) => (r.is_primary ?? "").trim().toLowerCase() === "true") ?? rows[0];
    if (!primary) continue;
    const url = (primary.affiliate_url ?? "").trim();
    if (!isGeAppliancePartsSearchPlaceholderUrl(primary.retailer_key, url)) continue;
    const filter = filtersBySlug.get(slug);
    const oemToken = normGeToken(filter?.oem_part_number ?? slug);
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

export function discoverGeSpecPdpUrl(args: {
  filterSlug: string;
  oemPartToken: string;
}): GeSpecPdpDiscoveryV1 | null {
  const discovered = GE_MANUFACTURER_RESCUE_CONFIG_V1.pdp_discovery.discoverPdpUrl(args);
  if (!discovered) return null;
  return {
    filter_slug: discovered.filter_slug,
    oem_part_token: discovered.oem_part_token,
    inferred_spec_url: discovered.discovered_url,
    discovery_provenance: "INFERRED_GE_SPEC",
    path_type: "official_manufacturer_spec_pdp",
    known_broken_destination: discovered.known_broken_destination,
  };
}

export function assessWrongFamilyTokens(args: {
  filterSlug: string;
  oemPartToken: string;
  finalUrl?: string;
  title?: string;
  h1Text?: string;
  textSample?: string;
  candidateToken?: string | null;
}): GeWrongFamilyAssessmentV1 {
  return GE_MANUFACTURER_RESCUE_CONFIG_V1.wrong_family.assess(args);
}

export function assessExactTokenInPrimarySlice(args: {
  oemPartToken: string;
  title: string;
  h1Text: string;
  textSample?: string;
}): boolean {
  return assessExactTokenInTitleOrH1WordBoundary(args);
}

export function deriveGeRescueValidationGates(args: {
  filterSlug: string;
  oemPartToken: string;
  csvPrimaryIsSearchPlaceholder: boolean;
  discoveredSpecUrl: string | null;
  discoveredSpecKnownBroken?: boolean;
  finalUrl: string;
  title: string;
  h1Text: string;
  textSample: string;
  purchaseActions: string[];
  classification: import("./rpwfe-official-ge-browser-capture-v1").OemBrowserClassification;
  wrongFamily: GeWrongFamilyAssessmentV1;
  captureCompleted?: boolean;
}): GeRefrigeratorRescueValidationGateV1[] {
  return GE_MANUFACTURER_RESCUE_CONFIG_V1.validation_gates.deriveGates(
    toGeValidationGateInput(args),
  ) as GeRefrigeratorRescueValidationGateV1[];
}

export function allGeRescueBrowserGatesPass(
  gates: GeRefrigeratorRescueValidationGateV1[],
): boolean {
  return GE_MANUFACTURER_RESCUE_CONFIG_V1.validation_gates.allGatesPass(gates);
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

export function buildGeRefrigeratorRescueCohortRowV1(args: {
  filterSlug: string;
  brandSlug: string | null;
  oemPartToken: string;
  cohortLane: GeRefrigeratorRescueCohortRowV1["cohort_lane"];
  csvPrimaryIsSearchPlaceholder: boolean;
  csvBrowserTruthClassification: string | null;
  currentPrimaryAffiliateUrl: string | null;
  inFridgeRescueQueue: boolean;
  rescueQueueRank: number | null;
}): GeRefrigeratorRescueCohortRowV1 {
  const slug = args.filterSlug.trim().toLowerCase();
  const discovery = discoverGeSpecPdpUrl({
    filterSlug: slug,
    oemPartToken: args.oemPartToken,
  });
  const supersession = GE_SUPERSESSION_REVIEW_SLUGS_V1.has(slug);
  const gates = deriveGeRescueValidationGates({
    filterSlug: slug,
    oemPartToken: args.oemPartToken,
    csvPrimaryIsSearchPlaceholder: args.csvPrimaryIsSearchPlaceholder,
    discoveredSpecUrl: discovery?.inferred_spec_url ?? null,
    discoveredSpecKnownBroken: discovery?.known_broken_destination ?? false,
    finalUrl: "",
    title: "",
    h1Text: "",
    textSample: "",
    purchaseActions: [],
    classification: "likely_valid",
    wrongFamily: assessWrongFamilyTokens({
      filterSlug: slug,
      oemPartToken: args.oemPartToken,
    }),
    captureCompleted: false,
  });

  return {
    filter_slug: slug,
    brand_slug: args.brandSlug,
    oem_part_token: normGeToken(args.oemPartToken),
    cohort_lane: args.cohortLane,
    in_fridge_rescue_queue: args.inFridgeRescueQueue,
    rescue_queue_rank: args.rescueQueueRank,
    csv_primary_is_search_placeholder: args.csvPrimaryIsSearchPlaceholder,
    csv_browser_truth_classification: args.csvBrowserTruthClassification,
    current_primary_affiliate_url: args.currentPrimaryAffiliateUrl,
    discovered_spec_pdp_url: discovery?.inferred_spec_url ?? null,
    discovered_spec_known_broken: discovery?.known_broken_destination ?? false,
    proposed_retailer_name: PROPOSED_RETAILER_NAME,
    proposed_retailer_key: PROPOSED_RETAILER_KEY,
    proposed_customer_label: PROPOSED_CUSTOMER_LABEL,
    proposed_label_subtype: PROPOSED_LABEL_SUBTYPE,
    supersession_review_required: supersession,
    wrong_family_forbidden_tokens: [...(GE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1[slug] ?? [])],
    browser_evidence_artifact_rel_path: geRescueBrowserEvidenceArtifactRelPathV1(slug),
    validation_gates: gates,
    adapter_ready_for_browser_capture:
      args.cohortLane === "RESCUE_SEARCH_PLACEHOLDER" &&
      discovery !== null &&
      !discovery.known_broken_destination,
    owner_apply_packet_lane_eligible: args.cohortLane === "RESCUE_SEARCH_PLACEHOLDER",
  };
}

export function buildGeRefrigeratorRescueAdapterReportV1(args: {
  rootDir: string;
  now?: () => Date;
  readTextFile?: (abs: string) => string;
  fileExists?: (abs: string) => boolean;
}): GeRefrigeratorRescueAdapterReportV1 {
  const now = args.now ?? (() => new Date());
  const rootDir = args.rootDir;
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile =
    args.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));
  const sourcePaths = [RETAILER_LINKS_CSV_REL, FILTERS_CSV_REL];

  const retailerRows = loadCsv<RetailerLinkRow>(
    rootDir,
    RETAILER_LINKS_CSV_REL,
    readTextFile,
  );
  const filterRows = loadCsv<FilterRow>(rootDir, FILTERS_CSV_REL, readTextFile);
  const placeholderRows = detectGeSearchPlaceholderRows({ retailerRows, filterRows });

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

  const filtersBySlug = new Map<string, FilterRow>();
  for (const f of filterRows) {
    const slug = f.slug?.trim().toLowerCase();
    if (slug) filtersBySlug.set(slug, f);
  }

  const retailerBySlug = new Map<string, RetailerLinkRow>();
  for (const r of retailerRows) {
    const slug = r.filter_slug?.trim().toLowerCase();
    if (!slug) continue;
    if ((r.is_primary ?? "").trim().toLowerCase() === "true" || !retailerBySlug.has(slug)) {
      retailerBySlug.set(slug, r);
    }
  }

  const rows: GeRefrigeratorRescueCohortRowV1[] = [];

  for (const p of placeholderRows) {
    rows.push(
      buildGeRefrigeratorRescueCohortRowV1({
        filterSlug: p.filter_slug,
        brandSlug: p.brand_slug,
        oemPartToken: p.oem_part_token,
        cohortLane: "RESCUE_SEARCH_PLACEHOLDER",
        csvPrimaryIsSearchPlaceholder: true,
        csvBrowserTruthClassification: p.browser_truth_classification,
        currentPrimaryAffiliateUrl: p.affiliate_url,
        inFridgeRescueQueue: rescueRankBySlug.has(p.filter_slug),
        rescueQueueRank: rescueRankBySlug.get(p.filter_slug) ?? null,
      }),
    );
  }

  const rpwfePrimary = retailerBySlug.get(GE_RESCUE_REFERENCE_APPLIED_SLUG_V1);
  const rpwfeFilter = filtersBySlug.get(GE_RESCUE_REFERENCE_APPLIED_SLUG_V1);
  if (rpwfePrimary && rpwfeFilter) {
    const url = (rpwfePrimary.affiliate_url ?? "").trim();
    rows.push(
      buildGeRefrigeratorRescueCohortRowV1({
        filterSlug: GE_RESCUE_REFERENCE_APPLIED_SLUG_V1,
        brandSlug: rpwfeFilter.brand_slug?.trim() ?? "ge",
        oemPartToken: rpwfeFilter.oem_part_number ?? "RPWFE",
        cohortLane: "REFERENCE_ALREADY_APPLIED",
        csvPrimaryIsSearchPlaceholder: isGeAppliancePartsSearchPlaceholderUrl(
          rpwfePrimary.retailer_key,
          url,
        ),
        csvBrowserTruthClassification: rpwfePrimary.browser_truth_classification?.trim() || null,
        currentPrimaryAffiliateUrl: url || null,
        inFridgeRescueQueue: rescueRankBySlug.has(GE_RESCUE_REFERENCE_APPLIED_SLUG_V1),
        rescueQueueRank: rescueRankBySlug.get(GE_RESCUE_REFERENCE_APPLIED_SLUG_V1) ?? null,
      }),
    );
  }

  rows.sort((a, b) => a.filter_slug.localeCompare(b.filter_slug));

  const rescueRows = rows.filter((r) => r.cohort_lane === "RESCUE_SEARCH_PLACEHOLDER");
  const inQueue = rescueRows.filter((r) => r.in_fridge_rescue_queue);

  return {
    contract: GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    generated_at: now().toISOString(),
    source_paths_read: sourcePaths,
    cohort_summary: {
      ge_rescue_search_placeholder_count: rescueRows.length,
      ge_reference_applied_count: rows.filter((r) => r.cohort_lane === "REFERENCE_ALREADY_APPLIED")
        .length,
      in_fridge_rescue_queue_count: inQueue.length,
      supersession_review_slug_count: rescueRows.filter((r) => r.supersession_review_required)
        .length,
      adapter_ready_for_browser_capture_count: rescueRows.filter(
        (r) => r.adapter_ready_for_browser_capture,
      ).length,
    },
    rows,
    proven_facts: [
      `PROVEN: ${String(rescueRows.length)} GE filter slugs have committed geapplianceparts.com search-placeholder primary rows in data/retailer_links.csv.`,
      `PROVEN: GE spec PDP discovery uses inferGeAppliancePartsSpecUrlV1 → https://www.geapplianceparts.com/store/parts/spec/{TOKEN}.`,
      `PROVEN: ${GE_RESCUE_REFERENCE_APPLIED_SLUG_V1} is reference lane — repo CSV already direct_buyable official GE spec PDP.`,
      inQueue.length > 0
        ? `PROVEN: ${String(inQueue.length)} GE rescue slugs appear in fridge-safe-link-rescue-owner-review missing_safe_link cohort.`
        : "UNKNOWN: fridge-safe-link-rescue-owner-review not loaded or no GE slugs in rescue queue.",
    ],
    inferred_facts: [
      "INFERRED: Browser capture + owner approval packet required before any CSV apply (same pattern as RPWFE official GE rescue).",
      "INFERRED: XWF/XWFE slugs require supersession compatibility review even when browser evidence PASS.",
    ],
    unknown_facts: [
      "UNKNOWN: Live geapplianceparts.com buyability for each slug until Playwright capture runs.",
      "UNKNOWN: Supabase parity state for GE rescue slugs (out of scope for adapter v1).",
    ],
  };
}
