/**
 * Read-only owner-review packet for the air_purifier demand-selected batch candidate.
 *
 * Does not start a batch, create run-registry JSON, create agent packets, collect browser evidence,
 * create owner approval rows, or mutate CSV/Supabase/evidence/public UI/Netlify.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

import type { DemandToCoverageNextLaneReportV1 } from "./demand-to-coverage-next-lane-v1";

export const AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_CONTRACT_V1 =
  "air_purifier_demand_selected_batch_owner_review_v1" as const;
export const AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_CC_JQ_PATH_V1 =
  ".command_center_v2.air_purifier_demand_selected_batch_owner_review_v1" as const;
export const AP_RETAILER_LINKS_CSV_REL_V1 = "data/air-purifier/retailer_links.csv" as const;

export type ApDemandSelectedCandidateRowsStatusV1 = "PROVEN" | "UNKNOWN";

export type ApDemandSelectedCandidateRowV1 = {
  rank: number;
  filter_slug: string;
  retailer_key: string | null;
  retailer_name: string | null;
  destination_url: string | null;
  candidate_reason: string;
  source_path: typeof AP_RETAILER_LINKS_CSV_REL_V1;
};

export type AirPurifierDemandSelectedBatchOwnerReviewLaneV1 = {
  contract: typeof AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_CC_JQ_PATH_V1;
  source_demand_to_coverage_jq_path: ".command_center_v2.demand_to_coverage_next_lane_v1";
  recommended_wedge: typeof HOMEKEEP_WEDGE_CATALOG.air_purifier | "UNKNOWN";
  source_recommendation_status: DemandToCoverageNextLaneReportV1["recommendation_status"];
  next_lane: string | null;
  next_wedge: DemandToCoverageNextLaneReportV1["next_wedge"];
  next_batch_candidate: string | null;
  owner_approval_required: true;
  batch_start_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  public_ui_mutation_authorized: false;
  demand_proof: {
    air_purifier_impressions: number | "UNKNOWN";
    air_purifier_priority_score: number | "UNKNOWN";
    top_ap_pages: string[];
    top_ap_queries: string[];
    safe_cta_count: number | "UNKNOWN";
    blocked_link_count: number | "UNKNOWN";
  };
  candidate_rows_status: ApDemandSelectedCandidateRowsStatusV1;
  candidate_rows: ApDemandSelectedCandidateRowV1[];
  candidate_rows_unknown_reason: string | null;
  candidate_selection_logic: string[];
  inputs_needed: string[];
  exact_owner_decision_needed_later: string;
  blockers: [
    "open_batch_not_proven",
    "owner_batch_start_approval_missing",
    "batch_run_registry_not_created",
    "evidence_collection_not_started",
    ...string[],
  ];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  next_agent_action: string;
  next_owner_action: string;
};

export type BuildAirPurifierDemandSelectedBatchOwnerReviewDepsV1 = {
  rootDir: string;
  demandToCoverageNextLane: DemandToCoverageNextLaneReportV1;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
};

type RetailerLinkRow = {
  filter_slug?: string;
  retailer_name?: string;
  retailer_key?: string;
  destination_url?: string;
  affiliate_url?: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
};

function readCsvRows(
  rootDir: string,
  relPath: string,
  fileExists: (absolutePath: string) => boolean,
  readTextFile: (absolutePath: string) => string,
): RetailerLinkRow[] | null {
  const abs = path.join(rootDir, ...relPath.split("/"));
  if (!fileExists(abs)) return null;
  try {
    return parse(readTextFile(abs), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as RetailerLinkRow[];
  } catch {
    return null;
  }
}

function candidateRowsFromApRetailerLinks(
  rows: RetailerLinkRow[] | null,
): {
  status: ApDemandSelectedCandidateRowsStatusV1;
  rows: ApDemandSelectedCandidateRowV1[];
  unknown_reason: string | null;
} {
  if (!rows) {
    return {
      status: "UNKNOWN",
      rows: [],
      unknown_reason:
        "data/air-purifier/retailer_links.csv could not be read; run a read-only AP buyer-path candidate report before owner batch-start approval.",
    };
  }

  const seen = new Set<string>();
  const candidates: ApDemandSelectedCandidateRowV1[] = [];
  for (const row of rows) {
    const filterSlug = row.filter_slug?.trim();
    if (!filterSlug || seen.has(filterSlug)) continue;
    const gate = buyLinkGateFailureKind({
      retailer_key: row.retailer_key ?? null,
      affiliate_url: row.affiliate_url ?? row.destination_url ?? "",
      browser_truth_classification: row.browser_truth_classification ?? null,
      browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
    });
    const state = mapSignalsToRetailerLinkState({
      browserTruthClassification: row.browser_truth_classification ?? null,
      gateFailureKind: gate,
    });
    const isBlocked = gate !== null || state === "BLOCKED_SEARCH_OR_DISCOVERY";
    if (!isBlocked) continue;
    seen.add(filterSlug);
    candidates.push({
      rank: candidates.length + 1,
      filter_slug: filterSlug,
      retailer_key: row.retailer_key?.trim() || null,
      retailer_name: row.retailer_name?.trim() || null,
      destination_url: row.destination_url?.trim() || row.affiliate_url?.trim() || null,
      candidate_reason:
        gate ?? "blocked_or_search_placeholder_buyer_path_needs_read_only_evidence_collection",
      source_path: AP_RETAILER_LINKS_CSV_REL_V1,
    });
    if (candidates.length >= 10) break;
  }

  if (candidates.length === 0) {
    return {
      status: "UNKNOWN",
      rows: [],
      unknown_reason:
        "No blocked/search-placeholder AP candidate rows were proven from committed retailer_links.csv; a read-only AP buyer-path candidate report is missing.",
    };
  }

  return {
    status: "PROVEN",
    rows: candidates,
    unknown_reason: null,
  };
}

export function buildAirPurifierDemandSelectedBatchOwnerReviewLaneV1(
  deps: BuildAirPurifierDemandSelectedBatchOwnerReviewDepsV1,
): AirPurifierDemandSelectedBatchOwnerReviewLaneV1 {
  const fileExists = deps.fileExists ?? existsSync;
  const readTextFile = deps.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
  const demand = deps.demandToCoverageNextLane;
  const apRow = demand.wedge_rows.find((row) => row.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier);
  const apQueries = demand.top_queries
    .filter((entry) => /air\s*purifier/i.test(entry.key))
    .slice(0, 10)
    .map((entry) => entry.key);
  const candidateRows = candidateRowsFromApRetailerLinks(
    readCsvRows(deps.rootDir, AP_RETAILER_LINKS_CSV_REL_V1, fileExists, readTextFile),
  );
  const sourceIsApDemandSelected =
    demand.recommended_wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier &&
    demand.recommendation_status === "START_NEW_DEMAND_SELECTED_BATCH";
  const sourceBlockers = demand.blockers.map((blocker) => `source_demand_to_coverage_blocker: ${blocker}`);
  const blockers: AirPurifierDemandSelectedBatchOwnerReviewLaneV1["blockers"] = [
    "open_batch_not_proven",
    "owner_batch_start_approval_missing",
    "batch_run_registry_not_created",
    "evidence_collection_not_started",
    ...(!sourceIsApDemandSelected ? ["source_demand_to_coverage_not_ap_start_candidate"] : []),
    ...sourceBlockers,
  ];
  const unknownFacts = [
    ...demand.unknown_facts,
    ...(candidateRows.unknown_reason ? [candidateRows.unknown_reason] : []),
    "No batch run-registry JSON exists for this proposed AP demand-selected candidate.",
    "No browser evidence collection has started from this owner-review packet.",
  ];

  return {
    contract: AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_CC_JQ_PATH_V1,
    source_demand_to_coverage_jq_path: ".command_center_v2.demand_to_coverage_next_lane_v1",
    recommended_wedge: sourceIsApDemandSelected ? HOMEKEEP_WEDGE_CATALOG.air_purifier : "UNKNOWN",
    source_recommendation_status: demand.recommendation_status,
    next_lane: demand.next_lane,
    next_wedge: demand.next_wedge,
    next_batch_candidate: demand.next_batch_candidate,
    owner_approval_required: true,
    batch_start_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    public_ui_mutation_authorized: false,
    demand_proof: {
      air_purifier_impressions: apRow?.impressions ?? "UNKNOWN",
      air_purifier_priority_score: apRow?.priority_score ?? "UNKNOWN",
      top_ap_pages: apRow?.top_pages.slice(0, 10) ?? [],
      top_ap_queries: apQueries,
      safe_cta_count: apRow?.safe_cta_count ?? "UNKNOWN",
      blocked_link_count: apRow?.blocked_link_count ?? "UNKNOWN",
    },
    candidate_rows_status: candidateRows.status,
    candidate_rows: candidateRows.rows,
    candidate_rows_unknown_reason: candidateRows.unknown_reason,
    candidate_selection_logic: [
      "Source recommendation must be demand_to_coverage_next_lane_v1 with recommended_wedge=air_purifier and recommendation_status=START_NEW_DEMAND_SELECTED_BATCH.",
      "Candidate rows are read from committed data/air-purifier/retailer_links.csv only.",
      "Rows are included when launch-buy-link gates or retailer-link state classify them as blocked/search-placeholder buyer paths.",
      "This packet is owner review only; it does not start a batch or collect browser evidence.",
    ],
    inputs_needed: [
      "Owner batch-start approval in a future explicit decision surface.",
      "A future batch run-registry JSON only after owner approval.",
      "Read-only browser/evidence collection plan for selected AP candidate rows.",
      "Separate future apply plan before any CSV/Supabase/public mutation.",
    ],
    exact_owner_decision_needed_later:
      "Approve starting air_purifier_demand_selected_batch_candidate for read-only AP buyer-path evidence collection; this must not authorize CSV apply, Supabase mutation, evidence writes, public UI mutation, Netlify API calls, or deployment.",
    blockers,
    proven_facts: [
      "PROVEN: owner-review packet is read_only=true and data_mutation=false.",
      `PROVEN: source demand recommendation status is ${demand.recommendation_status}.`,
      `PROVEN: source next_batch_candidate is ${String(demand.next_batch_candidate)}.`,
      `PROVEN: candidate_rows_status=${candidateRows.status}.`,
    ],
    inferred_facts: [
      ...demand.inferred_facts,
      "INFERRED: AP demand-selected batch candidate should be owner-reviewed before any batch-start registry exists.",
    ],
    unknown_facts: unknownFacts,
    next_agent_action:
      "Use this lane for owner review only; do not start a batch, create run-registry JSON, create agent packets, collect browser evidence, mutate CSV/Supabase/evidence/public UI, call Netlify, deploy, or create owner approval rows.",
    next_owner_action:
      "Review whether to approve a future read-only AP demand-selected batch start; current packet leaves batch_start_authorized=false.",
  };
}
