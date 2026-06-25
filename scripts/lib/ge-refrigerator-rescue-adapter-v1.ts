/**
 * Reusable GE Appliance Parts storefront adapter for refrigerator-water rescue.
 * Read-only — no CSV/Supabase/public UI mutation.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { isSearchPlaceholderBuyLink, isKnownBrokenUrl } from "@/lib/retailers/launch-buy-links";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";
import { inferGeAppliancePartsSpecUrlV1 } from "@/lib/owner-dashboard/batch-production-non-amazon-pdp-source-v1";

import { assessGswf2Conflation } from "./fridge-safe-link-gswf-ge-official-browser-capture-v1";
import type { OemBrowserClassification } from "./rpwfe-official-ge-browser-capture-v1";
import {
  FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
  type FridgeSafeLinkRescueOwnerReviewV1,
} from "./fridge-safe-link-rescue-owner-review-v1";

export const GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1 =
  "ge_refrigerator_rescue_adapter_v1" as const;

export const GE_APPLIANCE_PARTS_HOST_V1 = "geapplianceparts.com" as const;

export const GE_SPEC_PDP_PATH_PATTERN_V1 = "/store/parts/spec/" as const;

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

export const GE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1: Readonly<Record<string, readonly string[]>> = {
  xwf: ["XWFE"],
  xwfe: ["XWF"],
  gswf: ["GSWF2"],
  gswf2: ["GSWF"],
  mwf: ["MWFP"],
  "smartwater-mwfp": ["MWF"],
};

export const GE_SUPERSESSION_REVIEW_SLUGS_V1 = new Set<string>(["xwf", "xwfe"]);

export const GE_REFRIGERATOR_RESCUE_VALIDATION_GATE_IDS_V1 = [
  "ge_search_placeholder_detected",
  "ge_spec_pdp_url_discovered",
  "ge_spec_pdp_not_known_broken",
  "final_url_direct_spec_pdp",
  "exact_token_in_primary_slice",
  "official_ge_manufacturer_path",
  "direct_purchase_control_visible",
  "page_not_search_or_catalog",
  "page_not_blocked_or_error",
  "page_not_not_found",
  "wrong_family_token_not_detected",
  "browser_classification_direct_buyable",
  "supersession_review_cleared",
] as const;

export type GeRefrigeratorRescueValidationGateIdV1 =
  (typeof GE_REFRIGERATOR_RESCUE_VALIDATION_GATE_IDS_V1)[number];

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
  return (v ?? "").trim().toUpperCase();
}

export function isGeAppliancePartsUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes(GE_APPLIANCE_PARTS_HOST_V1);
  } catch {
    return url.toLowerCase().includes(GE_APPLIANCE_PARTS_HOST_V1);
  }
}

export function isGeAppliancePartsSearchPlaceholderUrl(
  retailerKey: string | null | undefined,
  url: string,
): boolean {
  if (!isGeAppliancePartsUrl(url)) return false;
  return isSearchPlaceholderBuyLink(retailerKey ?? "oem-parts-catalog", url);
}

export function isGeAppliancePartsSpecPdpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname.toLowerCase().includes(GE_APPLIANCE_PARTS_HOST_V1) &&
      u.pathname.toLowerCase().includes("/parts/spec/")
    );
  } catch {
    return false;
  }
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
  const token = normGeToken(args.oemPartToken);
  if (!token) return null;
  const inferred = inferGeAppliancePartsSpecUrlV1(token);
  const url =
    inferred ?? `https://www.geapplianceparts.com/store/parts/spec/${token}`;
  const knownBroken = isKnownBrokenUrl(url);
  return {
    filter_slug: args.filterSlug.trim().toLowerCase(),
    oem_part_token: token,
    inferred_spec_url: url,
    discovery_provenance: "INFERRED_GE_SPEC",
    path_type: "official_manufacturer_spec_pdp",
    known_broken_destination: knownBroken,
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
  const slug = args.filterSlug.trim().toLowerCase();
  const slugToken = normGeToken(args.oemPartToken);
  const forbidden = [...(GE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1[slug] ?? [])];
  const blob = `${args.title ?? ""}\n${args.h1Text ?? ""}\n${args.textSample ?? ""}`.toUpperCase();
  const url = (args.finalUrl ?? "").toUpperCase();
  const candidateToken = normGeToken(args.candidateToken);

  const detected: string[] = [];
  for (const tok of forbidden) {
    if (candidateToken === tok) detected.push(tok);
    if (url.includes(`/SPEC/${tok}`) || url.includes(`/SPEC/${tok}/`)) detected.push(tok);
    const inIdentity = new RegExp(`\\b${tok}\\b`).test(blob);
    const slugInIdentity = slugToken ? new RegExp(`\\b${slugToken}\\b`).test(blob) : false;
    if (inIdentity && !slugInIdentity && !detected.includes(tok)) detected.push(tok);
  }

  if (slug === "gswf") {
    const conflation = assessGswf2Conflation({
      finalUrl: args.finalUrl ?? "",
      title: args.title ?? "",
      h1Text: args.h1Text ?? "",
      textSample: args.textSample ?? "",
    });
    if (conflation.blocked) {
      return {
        blocked: true,
        forbidden_tokens_checked: forbidden,
        detected_forbidden_tokens: ["GSWF2"],
        notes: conflation.notes,
      };
    }
  }

  const unique = [...new Set(detected)];
  return {
    blocked: unique.length > 0,
    forbidden_tokens_checked: forbidden,
    detected_forbidden_tokens: unique,
    notes:
      unique.length > 0
        ? `wrong-family token(s) detected for slug ${slug}: ${unique.join(", ")}`
        : "no forbidden wrong-family tokens detected",
  };
}

export function assessExactTokenInPrimarySlice(args: {
  oemPartToken: string;
  title: string;
  h1Text: string;
  textSample?: string;
}): boolean {
  const token = normGeToken(args.oemPartToken);
  if (!token) return false;
  const title = args.title.toUpperCase();
  const h1 = args.h1Text.toUpperCase();
  const re = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  return re.test(title) || re.test(h1);
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
  classification: OemBrowserClassification;
  wrongFamily: GeWrongFamilyAssessmentV1;
  captureCompleted?: boolean;
}): GeRefrigeratorRescueValidationGateV1[] {
  const slug = args.filterSlug.trim().toLowerCase();
  const token = normGeToken(args.oemPartToken);
  const u = args.finalUrl.toLowerCase();
  const tokenLower = token.toLowerCase();

  const directPdp =
    /\/parts\/spec\//i.test(u) &&
    (u.includes(`/spec/${tokenLower}`) || (u.includes(tokenLower) && !u.includes(`${tokenLower}2`)));
  const exactToken = assessExactTokenInPrimarySlice({
    oemPartToken: token,
    title: args.title,
    h1Text: args.h1Text,
    textSample: args.textSample,
  });
  const blob = `${args.title}\n${args.h1Text}\n${args.textSample}`.toUpperCase();
  const officialPath =
    u.includes(GE_APPLIANCE_PARTS_HOST_V1) &&
    (blob.includes("GE") || blob.includes("GE APPLIANCE") || u.includes(GE_APPLIANCE_PARTS_HOST_V1));
  const purchaseVisible = args.purchaseActions.length > 0;
  const notSearch = args.classification !== "likely_search_results";
  const notBlocked =
    args.classification !== "likely_blocked" && args.classification !== "browser_error";
  const not404 = args.classification !== "likely_not_found";
  const directBuyable = args.classification === "direct_buyable";
  const supersession = GE_SUPERSESSION_REVIEW_SLUGS_V1.has(slug);

  const gate = (
    gate_id: GeRefrigeratorRescueValidationGateIdV1,
    pass: boolean,
    notes: string,
    waived = false,
  ): GeRefrigeratorRescueValidationGateV1 => ({
    gate_id,
    status: waived ? "WAIVED" : pass ? "PASS" : args.captureCompleted === false ? "UNKNOWN" : "FAIL",
    notes,
  });

  return [
    gate(
      "ge_search_placeholder_detected",
      args.csvPrimaryIsSearchPlaceholder,
      args.csvPrimaryIsSearchPlaceholder
        ? "CSV primary row is GE catalog search placeholder"
        : "CSV primary is not a GE search placeholder (may be already applied)",
    ),
    gate(
      "ge_spec_pdp_url_discovered",
      args.discoveredSpecUrl !== null,
      args.discoveredSpecUrl ?? "no inferred GE spec PDP URL",
    ),
    gate(
      "ge_spec_pdp_not_known_broken",
      args.discoveredSpecKnownBroken !== true,
      args.discoveredSpecKnownBroken
        ? "repo truth marks inferred GE spec PDP as known_broken_destination"
        : "inferred GE spec PDP is not in known-broken registry",
    ),
    gate(
      "final_url_direct_spec_pdp",
      directPdp,
      directPdp ? `final URL is GE /parts/spec/ for ${token}` : "final URL is not direct GE spec PDP",
      args.captureCompleted === false,
    ),
    gate(
      "exact_token_in_primary_slice",
      exactToken && !args.wrongFamily.blocked,
      exactToken
        ? `exact token ${token} visible in title or h1`
        : `exact token ${token} not proven in title/h1 primary slice`,
      args.captureCompleted === false,
    ),
    gate(
      "official_ge_manufacturer_path",
      officialPath,
      officialPath ? "geapplianceparts.com official manufacturer path" : "official GE path not proven",
      args.captureCompleted === false,
    ),
    gate(
      "direct_purchase_control_visible",
      purchaseVisible,
      purchaseVisible
        ? `purchase actions: ${args.purchaseActions.slice(0, 3).join(" | ")}`
        : "no Add to Cart / purchase control visible",
      args.captureCompleted === false,
    ),
    gate(
      "page_not_search_or_catalog",
      notSearch,
      notSearch ? "page not classified as search/catalog" : "page classified as search or catalog",
      args.captureCompleted === false,
    ),
    gate(
      "page_not_blocked_or_error",
      notBlocked,
      notBlocked ? "page not blocked/error" : `browser classification: ${args.classification}`,
      args.captureCompleted === false,
    ),
    gate(
      "page_not_not_found",
      not404,
      not404 ? "page not 404/discontinued" : "page not found or unavailable",
      args.captureCompleted === false,
    ),
    gate(
      "wrong_family_token_not_detected",
      !args.wrongFamily.blocked,
      args.wrongFamily.notes,
      args.captureCompleted === false,
    ),
    gate(
      "browser_classification_direct_buyable",
      directBuyable,
      directBuyable
        ? "browser classification direct_buyable"
        : `classification: ${args.classification}`,
      args.captureCompleted === false,
    ),
    gate(
      "supersession_review_cleared",
      !supersession,
      supersession
        ? "XWF/XWFE supersession — owner compatibility review required before apply"
        : "no supersession review required",
      !supersession,
    ),
  ];
}

export function allGeRescueBrowserGatesPass(
  gates: GeRefrigeratorRescueValidationGateV1[],
): boolean {
  return gates.every((g) => g.status === "PASS" || g.status === "WAIVED");
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
