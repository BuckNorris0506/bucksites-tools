/**
 * Read-only owner-review packet for the RPWFE purchase-option rescue.
 *
 * Does not add buy links, write evidence, query Supabase, mutate CSV/public UI, create owner approvals,
 * call Netlify, deploy, or start any batch.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

import { isRpwfeRepoCsvOfficialGeDirectBuyableApplied } from "./rpwfe-official-ge-repo-csv-state-v1";

export const RPWFE_PURCHASE_OPTION_RESCUE_OWNER_REVIEW_CONTRACT_V1 =
  "rpwfe_purchase_option_rescue_owner_review_v1" as const;
export const RPWFE_PURCHASE_OPTION_RESCUE_OWNER_REVIEW_CC_JQ_PATH_V1 =
  ".command_center_v2.rpwfe_purchase_option_rescue_owner_review_v1" as const;

const FILTER_SLUG = "rpwfe" as const;
const PUBLIC_ROUTE = "/filter/rpwfe" as const;
const FILTERS_CSV_REL = "data/filters.csv" as const;
const COMPATIBILITY_CSV_REL = "data/compatibility_mappings.csv" as const;
const RETAILER_LINKS_CSV_REL = "data/retailer_links.csv" as const;
const RPWFE_RESCUE_DOC_REL = "docs/RPWFE-PURCHASE-OPTION-RESCUE-V1.md" as const;
const WATERDROP_INTELLIGENCE_DOC_REL = "docs/WATERDROP-CATALOG-INTELLIGENCE-V1.md" as const;

type RetailerLinkRow = {
  filter_slug?: string;
  retailer_name?: string;
  affiliate_url?: string;
  retailer_key?: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
  browser_truth_notes?: string | null;
};

type CompatibilityRow = {
  fridge_slug?: string;
  filter_slug?: string;
};

type FilterRow = {
  brand_slug?: string;
  slug?: string;
  filter_slug?: string;
  oem_part_number?: string;
  name?: string;
};

export type RpwfeExistingRetailerRowStatusV1 =
  | "SEARCH_PLACEHOLDER_BLOCKED"
  | "REPO_DIRECT_BUYABLE_OFFICIAL_GE_APPLIED"
  | "NO_RETAILER_ROW_PROVEN"
  | "UNKNOWN";
export type RpwfeOfficialGePathStatusV1 =
  | "PROVEN_IN_REPO_DOC_NOT_APPLIED"
  | "PROVEN_IN_REPO_CSV_APPLIED"
  | "UNKNOWN";
export type RpwfeOwnerReviewPhaseV1 = "PRE_APPLY_RESCUE" | "POST_CSV_APPLY_NOOP";
export type RpwfeCurrentPublicStateV1 =
  | "no_buy_options"
  | "repo_csv_direct_buyable_supabase_parity_pending";
export type RpwfeCompatibleWaterdropPathStatusV1 =
  | "UNPROVEN_UNAUTHORIZED"
  | "UNKNOWN";

export type RpwfePurchaseOptionRescueOwnerReviewLaneV1 = {
  contract: typeof RPWFE_PURCHASE_OPTION_RESCUE_OWNER_REVIEW_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof RPWFE_PURCHASE_OPTION_RESCUE_OWNER_REVIEW_CC_JQ_PATH_V1;
  filter_slug: typeof FILTER_SLUG;
  public_route: typeof PUBLIC_ROUTE;
  customer_visible_problem: true;
  owner_review_phase: RpwfeOwnerReviewPhaseV1;
  current_public_state: RpwfeCurrentPublicStateV1;
  compatible_model_count: number | "UNKNOWN";
  existing_retailer_row_status: RpwfeExistingRetailerRowStatusV1;
  existing_retailer_row: {
    source_path: typeof RETAILER_LINKS_CSV_REL;
    retailer_name: string | null;
    retailer_key: string | null;
    affiliate_url: string | null;
    gate_failure_kind: string | null;
    retailer_link_state: string;
  } | null;
  official_ge_path_status: RpwfeOfficialGePathStatusV1;
  official_ge_candidate_url: "https://www.geapplianceparts.com/store/parts/spec/RPWFE" | null;
  compatible_waterdrop_path_status: RpwfeCompatibleWaterdropPathStatusV1;
  candidate_waterdrop_product: "WD-F19C" | "UNKNOWN";
  safe_labeling_required: true;
  official_label_authorized: false;
  compatible_label_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  public_ui_mutation_authorized: false;
  netlify_api_authorized: false;
  customer_trust_impact: string[];
  blockers: string[];
  next_safe_evidence_packet_recommendations: Array<{
    packet_id: string;
    status: "RECOMMENDED_READ_ONLY";
    purpose: string;
  }>;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  next_agent_action: string;
  next_owner_action: string;
};

export type BuildRpwfePurchaseOptionRescueOwnerReviewDepsV1 = {
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
};

function readCsvRows<T>(
  rootDir: string,
  relPath: string,
  fileExists: (absolutePath: string) => boolean,
  readTextFile: (absolutePath: string) => string,
): T[] | null {
  const abs = path.join(rootDir, ...relPath.split("/"));
  if (!fileExists(abs)) return null;
  try {
    return parse(readTextFile(abs), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as T[];
  } catch {
    return null;
  }
}

function readDoc(
  rootDir: string,
  relPath: string,
  fileExists: (absolutePath: string) => boolean,
  readTextFile: (absolutePath: string) => string,
): string | null {
  const abs = path.join(rootDir, ...relPath.split("/"));
  if (!fileExists(abs)) return null;
  try {
    return readTextFile(abs);
  } catch {
    return null;
  }
}

function getCompatibilityCount(rows: CompatibilityRow[] | null): number | "UNKNOWN" {
  if (!rows) return "UNKNOWN";
  const uniqueModels = new Set(
    rows
      .filter((row) => row.filter_slug?.trim().toLowerCase() === FILTER_SLUG)
      .map((row) => row.fridge_slug?.trim())
      .filter((slug): slug is string => Boolean(slug)),
  );
  return uniqueModels.size;
}

function resolveExistingRetailerRow(rows: RetailerLinkRow[] | null) {
  if (!rows) {
    return {
      status: "UNKNOWN" as const,
      row: null,
    };
  }
  const row = rows.find((candidate) => candidate.filter_slug?.trim().toLowerCase() === FILTER_SLUG);
  if (!row) {
    return {
      status: "NO_RETAILER_ROW_PROVEN" as const,
      row: null,
    };
  }
  const gate = buyLinkGateFailureKind({
    retailer_key: row.retailer_key ?? null,
    affiliate_url: row.affiliate_url ?? "",
    browser_truth_classification: row.browser_truth_classification ?? null,
    browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
  });
  const state = mapSignalsToRetailerLinkState({
    browserTruthClassification: row.browser_truth_classification ?? null,
    gateFailureKind: gate,
  });
  if (isRpwfeRepoCsvOfficialGeDirectBuyableApplied(row)) {
    return {
      status: "REPO_DIRECT_BUYABLE_OFFICIAL_GE_APPLIED" as const,
      row: {
        source_path: RETAILER_LINKS_CSV_REL,
        retailer_name: row.retailer_name?.trim() || null,
        retailer_key: row.retailer_key?.trim() || null,
        affiliate_url: row.affiliate_url?.trim() || null,
        gate_failure_kind: gate,
        retailer_link_state: state,
      },
    };
  }
  return {
    status: gate === "search_placeholder" || state === "BLOCKED_SEARCH_OR_DISCOVERY"
      ? ("SEARCH_PLACEHOLDER_BLOCKED" as const)
      : ("UNKNOWN" as const),
    row: {
      source_path: RETAILER_LINKS_CSV_REL,
      retailer_name: row.retailer_name?.trim() || null,
      retailer_key: row.retailer_key?.trim() || null,
      affiliate_url: row.affiliate_url?.trim() || null,
      gate_failure_kind: gate,
      retailer_link_state: state,
    },
  };
}

export function buildRpwfePurchaseOptionRescueOwnerReviewLaneV1(
  deps: BuildRpwfePurchaseOptionRescueOwnerReviewDepsV1,
): RpwfePurchaseOptionRescueOwnerReviewLaneV1 {
  const fileExists = deps.fileExists ?? existsSync;
  const readTextFile = deps.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
  const filtersRows = readCsvRows<FilterRow>(deps.rootDir, FILTERS_CSV_REL, fileExists, readTextFile);
  const compatibilityRows = readCsvRows<CompatibilityRow>(
    deps.rootDir,
    COMPATIBILITY_CSV_REL,
    fileExists,
    readTextFile,
  );
  const retailerRows = readCsvRows<RetailerLinkRow>(deps.rootDir, RETAILER_LINKS_CSV_REL, fileExists, readTextFile);
  const rescueDoc = readDoc(deps.rootDir, RPWFE_RESCUE_DOC_REL, fileExists, readTextFile);
  const waterdropDoc = readDoc(deps.rootDir, WATERDROP_INTELLIGENCE_DOC_REL, fileExists, readTextFile);
  const filterExists =
    filtersRows?.some((row) => (row.slug ?? row.filter_slug)?.trim().toLowerCase() === FILTER_SLUG) ?? false;
  const retailer = resolveExistingRetailerRow(retailerRows);
  const repoCsvApplied = retailer.status === "REPO_DIRECT_BUYABLE_OFFICIAL_GE_APPLIED";
  const compatibleModelCount = getCompatibilityCount(compatibilityRows);
  const officialGeDocProven =
    Boolean(rescueDoc?.includes("https://www.geapplianceparts.com/store/parts/spec/RPWFE")) &&
    /PROVEN[\s\S]{0,120}Add to Cart|Add to Cart[\s\S]{0,120}PROVEN/.test(rescueDoc ?? "");
  const waterdropCandidateKnown =
    Boolean(rescueDoc?.includes("WD-F19C")) || Boolean(waterdropDoc?.includes("WD-F19C"));
  const waterdropUnproven =
    waterdropCandidateKnown &&
    (/Waterdrop WD-F19C[\s\S]{0,250}UNKNOWN/.test(rescueDoc ?? "") ||
      /not in-repo browser proof yet/.test(waterdropDoc ?? ""));

  const blockers: RpwfePurchaseOptionRescueOwnerReviewLaneV1["blockers"] = [
    ...(repoCsvApplied ? [] : ["official_ge_direct_pdp_not_proven_or_not_applied"]),
    "waterdrop_wd_f19c_evidence_not_proven",
    "compatible_replacement_labeling_not_authorized",
    ...(repoCsvApplied ? ["supabase_parity_not_applied"] : ["owner_rescue_approval_missing"]),
    "csv_supabase_mutation_not_authorized",
    ...(!filterExists ? ["rpwfe_filter_catalog_row_missing"] : []),
    ...(retailer.status === "SEARCH_PLACEHOLDER_BLOCKED"
      ? []
      : repoCsvApplied
        ? []
        : ["rpwfe_search_placeholder_row_not_proven"]),
    ...(repoCsvApplied ? ["live_page_not_revalidated_after_supabase_parity"] : []),
  ];

  const ownerReviewPhase: RpwfeOwnerReviewPhaseV1 = repoCsvApplied
    ? "POST_CSV_APPLY_NOOP"
    : "PRE_APPLY_RESCUE";
  const currentPublicState: RpwfeCurrentPublicStateV1 = repoCsvApplied
    ? "repo_csv_direct_buyable_supabase_parity_pending"
    : "no_buy_options";
  const officialGePathStatus: RpwfeOfficialGePathStatusV1 = repoCsvApplied
    ? "PROVEN_IN_REPO_CSV_APPLIED"
    : officialGeDocProven
      ? "PROVEN_IN_REPO_DOC_NOT_APPLIED"
      : "UNKNOWN";

  return {
    contract: RPWFE_PURCHASE_OPTION_RESCUE_OWNER_REVIEW_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: RPWFE_PURCHASE_OPTION_RESCUE_OWNER_REVIEW_CC_JQ_PATH_V1,
    filter_slug: FILTER_SLUG,
    public_route: PUBLIC_ROUTE,
    customer_visible_problem: true,
    owner_review_phase: ownerReviewPhase,
    current_public_state: currentPublicState,
    compatible_model_count: compatibleModelCount,
    existing_retailer_row_status: retailer.status,
    existing_retailer_row: retailer.row,
    official_ge_path_status: officialGePathStatus,
    official_ge_candidate_url: officialGeDocProven
      ? "https://www.geapplianceparts.com/store/parts/spec/RPWFE"
      : null,
    compatible_waterdrop_path_status: waterdropUnproven ? "UNPROVEN_UNAUTHORIZED" : "UNKNOWN",
    candidate_waterdrop_product: waterdropCandidateKnown ? "WD-F19C" : "UNKNOWN",
    safe_labeling_required: true,
    official_label_authorized: false,
    compatible_label_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    public_ui_mutation_authorized: false,
    netlify_api_authorized: false,
    customer_trust_impact: repoCsvApplied
      ? [
          "RPWFE repo CSV now has a direct_buyable official GE spec PDP row; live customer buy path still depends on Supabase parity and page revalidation.",
          "Waterdrop-compatible replacement labeling must stay separate from official GE labeling.",
        ]
      : [
          "RPWFE has many compatible refrigerator models but no customer-visible buy CTA.",
          "The current no-buy state can make BuckParts look incomplete even though search-placeholder gating is correctly protecting trust.",
          "Waterdrop-compatible replacement labeling must stay separate from official GE labeling.",
        ],
    blockers,
    next_safe_evidence_packet_recommendations: [
      {
        packet_id: "official_ge_rpwfe_direct_pdp_proof_packet",
        status: "RECOMMENDED_READ_ONLY",
        purpose:
          "Re-prove or package the GE Appliance Parts RPWFE spec PDP as exact-token, direct-buyable, official GE evidence before any CSV/Supabase apply.",
      },
      {
        packet_id: "waterdrop_wd_f19c_compatible_replacement_browser_evidence_packet",
        status: "RECOMMENDED_READ_ONLY",
        purpose:
          "Collect browser-visible RPWFE/RPWF + WD-F19C + buy-action proof and explicit not-official-GE compatible-replacement labeling.",
      },
      {
        packet_id: "refrigerator_water_high_demand_no_buy_audit",
        status: "RECOMMENDED_READ_ONLY",
        purpose:
          "Audit whether other refrigerator_water pages with compatibility mappings have no safe CTA because only search placeholders or unproven compatible replacements exist.",
      },
    ],
    proven_facts: [
      "PROVEN: lane is read_only=true and data_mutation=false.",
      `PROVEN: owner_review_phase=${ownerReviewPhase}; current_public_state=${currentPublicState}.`,
      `PROVEN: existing_retailer_row_status=${retailer.status}.`,
      `PROVEN: compatible_model_count=${String(compatibleModelCount)} from ${COMPATIBILITY_CSV_REL}.`,
      `PROVEN: official_ge_path_status=${officialGePathStatus}.`,
      `PROVEN: compatible_waterdrop_path_status=${waterdropUnproven ? "UNPROVEN_UNAUTHORIZED" : "UNKNOWN"}.`,
    ],
    inferred_facts: [
      "INFERRED: RPWFE is a customer trust rescue candidate because a high-compatibility page renders no buy options after correct safety gating.",
      "INFERRED: Waterdrop WD-F19C may be a compatible replacement candidate, not an official GE replacement, but only after exact visible browser evidence.",
    ],
    unknown_facts: [
      ...(filtersRows ? [] : [`${FILTERS_CSV_REL} could not be read.`]),
      ...(compatibilityRows ? [] : [`${COMPATIBILITY_CSV_REL} could not be read.`]),
      ...(retailerRows ? [] : [`${RETAILER_LINKS_CSV_REL} could not be read.`]),
      ...(rescueDoc ? [] : [`${RPWFE_RESCUE_DOC_REL} could not be read.`]),
      ...(waterdropDoc ? [] : [`${WATERDROP_INTELLIGENCE_DOC_REL} could not be read.`]),
      "No Supabase parity is queried or proven by this lane.",
      "No new browser evidence is collected or written by this lane.",
      "No Waterdrop WD-F19C CTA is authorized by this lane.",
    ],
    next_agent_action: repoCsvApplied
      ? "Owner-review lane is post-CSV-apply noop for official GE CSV rescue. Use rpwfe_official_ge_supabase_parity_plan_v1 next; do not re-apply CSV, mutate Supabase, change public UI, or authorize Waterdrop/Amazon/compatible replacement."
      : "Use this lane for owner review only; do not add buy links, write evidence, query/mutate Supabase, mutate data/retailer_links.csv, change public UI, call Netlify, deploy, create owner approval rows, apply rules, or start a batch.",
    next_owner_action: repoCsvApplied
      ? "Review read-only Supabase parity plan for rpwfe official GE only. CSV apply is already spent; next gated step is owner-authorized Supabase parity plus live /filter/rpwfe revalidation."
      : "Review whether to authorize a future read-only RPWFE evidence packet for official GE PDP proof and separate Waterdrop WD-F19C compatible-replacement proof; current lane authorizes no buy CTA.",
  };
}
