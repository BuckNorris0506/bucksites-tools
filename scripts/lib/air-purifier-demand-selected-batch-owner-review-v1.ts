/**
 * Read-only owner-review packet for the air_purifier demand-selected batch candidate.
 *
 * Does not start a batch, create run-registry JSON, create agent packets, collect browser evidence,
 * create owner approval rows, or mutate CSV/Supabase/evidence/public UI/Netlify.
 */

import { existsSync, readFileSync } from "node:fs";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  AIR_PURIFIER_BATCH_PRODUCTION_LANE_REPORT_NAME_V1,
  buildAirPurifierBatchProductionLaneV1Report,
  type AirPurifierBatchProductionLaneReportV1,
  type ApBatchCandidateV1,
  type ApBatchProductionLaneStateV1,
} from "./air-purifier-batch-production-lane-v1";
import type { DemandToCoverageNextLaneReportV1 } from "./demand-to-coverage-next-lane-v1";
import {
  buildApDemandSelectedOpenBatchProofStatusV1,
  isApDemandSelectedOpenBatchRegistryProvenOpenV1,
  loadApDemandSelectedBatchRunRegistryV1,
  type ApDemandSelectedBatchRunRegistryVisibilityV1,
  type ApDemandSelectedOpenBatchProofStatusV1,
} from "./ap-demand-selected-batch-run-registry-v1";
import {
  getApOwnerReviewEvidenceEntryV1,
  loadApOwnerReviewEvidenceIndexV1,
  type ApOwnerReviewEvidenceEntryV1,
  type ApOwnerReviewEvidenceIndexV1,
} from "./air-purifier-owner-review-evidence-index-v1";

export const AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_CONTRACT_V1 =
  "air_purifier_demand_selected_batch_owner_review_v1" as const;
export const AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_CC_JQ_PATH_V1 =
  ".command_center_v2.air_purifier_demand_selected_batch_owner_review_v1" as const;

export const AP_OWNER_REVIEW_ACTIONABLE_BATCH_STATES_V1 = [
  "search_placeholder_rescue_needed",
  "reference_candidate",
  "direct_buy_candidate",
  "catalog_identity_gap",
] as const satisfies readonly ApBatchProductionLaneStateV1[];

const AP_OWNER_REVIEW_ACTIONABLE_STATE_SET_V1 = new Set<ApBatchProductionLaneStateV1>(
  AP_OWNER_REVIEW_ACTIONABLE_BATCH_STATES_V1,
);

export type ApDemandSelectedCandidateRowsStatusV1 = "PROVEN" | "UNKNOWN";

export type ApDemandSelectedCandidateRowV1 = {
  rank: number;
  filter_slug: string;
  state: ApBatchProductionLaneStateV1;
  priority_score: number;
  pattern: string;
  rationale: string;
  gate_failure: string | null;
  owner_review_required: boolean;
  evidence_disposition:
    | "catalog_identity"
    | "promote_pass_reference"
    | "discovery_ready"
    | "hold_needs_owner_review"
    | null;
  primary_retailer_key: string | null;
  primary_url: string | null;
  source_report: typeof AIR_PURIFIER_BATCH_PRODUCTION_LANE_REPORT_NAME_V1;
};

export type ApDemandSelectedExcludedCandidateRowV1 = {
  filter_slug: string;
  batch_rank: number;
  priority_score: number;
  exclusion_reason: string;
  evidence_source_files: string[];
};

export type AirPurifierDemandSelectedBatchOwnerReviewLaneV1 = {
  contract: typeof AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_CC_JQ_PATH_V1;
  source_demand_to_coverage_jq_path: ".command_center_v2.demand_to_coverage_next_lane_v1";
  source_batch_production_report: typeof AIR_PURIFIER_BATCH_PRODUCTION_LANE_REPORT_NAME_V1;
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
  excluded_candidate_rows: ApDemandSelectedExcludedCandidateRowV1[];
  candidate_rows_unknown_reason: string | null;
  candidate_selection_logic: string[];
  evidence_index_source_status: ApOwnerReviewEvidenceIndexV1["source_status"];
  batch_run_registry: ApDemandSelectedBatchRunRegistryVisibilityV1;
  open_batch_proof_v1: ApDemandSelectedOpenBatchProofStatusV1;
  inputs_needed: string[];
  exact_owner_decision_needed_later: string;
  blockers: (
    | "open_batch_not_proven"
    | "owner_batch_start_approval_missing"
    | "batch_run_registry_not_created"
    | "evidence_collection_not_started"
    | "source_demand_to_coverage_not_ap_start_candidate"
    | `source_demand_to_coverage_blocker: ${string}`
  )[];
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
  batchProductionLane?: AirPurifierBatchProductionLaneReportV1;
  evidenceIndex?: ApOwnerReviewEvidenceIndexV1 | null;
  loadBatchProductionLane?: (deps: {
    rootDir: string;
    fileExists: (absolutePath: string) => boolean;
    readTextFile: (absolutePath: string) => string;
  }) => Promise<AirPurifierBatchProductionLaneReportV1>;
  loadEvidenceIndex?: (deps: {
    rootDir: string;
    fileExists: (absolutePath: string) => boolean;
    readTextFile: (absolutePath: string) => string;
  }) => ApOwnerReviewEvidenceIndexV1;
  loadDemandSelectedRunRegistry?: (
    deps: BuildAirPurifierDemandSelectedBatchOwnerReviewDepsV1,
  ) => ApDemandSelectedBatchRunRegistryVisibilityV1;
};

const AP_OWNER_REVIEW_PROMOTE_PASS_REFERENCE_BONUS_V1 = 45;
const AP_OWNER_REVIEW_MAX_LEVOIT_DISCOVERY_ROWS_V1 = 2;

type OwnerReviewSortableCandidateV1 = {
  candidate: ApBatchCandidateV1;
  evidence: ApOwnerReviewEvidenceEntryV1 | null;
  sort_tier: number;
  effective_priority_score: number;
  evidence_disposition: ApDemandSelectedCandidateRowV1["evidence_disposition"];
  owner_review_required: boolean;
  rationale: string;
};

function ownerReviewSortTierV1(args: {
  candidate: ApBatchCandidateV1;
  evidence: ApOwnerReviewEvidenceEntryV1 | null;
}): number {
  if (args.candidate.state === "catalog_identity_gap") return 0;
  if (args.evidence?.promote_pass_reference) return 1;
  if (args.evidence?.hold_needs_owner_review) return 3;
  return 2;
}

function mapEvidenceAwareOwnerReviewRowV1(
  item: OwnerReviewSortableCandidateV1,
  displayRank: number,
): ApDemandSelectedCandidateRowV1 {
  return {
    rank: displayRank,
    filter_slug: item.candidate.filter_slug,
    state: item.candidate.state,
    priority_score: item.candidate.priority_score,
    pattern: item.candidate.pattern,
    rationale: item.rationale,
    gate_failure: item.candidate.gate_failure,
    owner_review_required: item.owner_review_required,
    evidence_disposition: item.evidence_disposition,
    primary_retailer_key: item.candidate.primary_retailer_key,
    primary_url: item.candidate.primary_url,
    source_report: AIR_PURIFIER_BATCH_PRODUCTION_LANE_REPORT_NAME_V1,
  };
}

function buildOwnerReviewSortableCandidatesV1(
  actionable: ApBatchCandidateV1[],
  evidenceIndex: ApOwnerReviewEvidenceIndexV1 | null | undefined,
): {
  sortable: OwnerReviewSortableCandidateV1[];
  excluded: ApDemandSelectedExcludedCandidateRowV1[];
} {
  const sortable: OwnerReviewSortableCandidateV1[] = [];
  const excluded: ApDemandSelectedExcludedCandidateRowV1[] = [];

  for (const candidate of actionable) {
    const evidence = getApOwnerReviewEvidenceEntryV1(evidenceIndex ?? null, candidate.filter_slug);
    if (evidence?.exclude_from_owner_review) {
      excluded.push({
        filter_slug: candidate.filter_slug,
        batch_rank: candidate.rank,
        priority_score: candidate.priority_score,
        exclusion_reason: evidence.rationale,
        evidence_source_files: evidence.source_files,
      });
      continue;
    }

    const sort_tier = ownerReviewSortTierV1({ candidate, evidence });
    const promote_pass_reference = evidence?.promote_pass_reference === true;
    const hold_needs_owner_review =
      candidate.state === "catalog_identity_gap"
        ? true
        : evidence?.hold_needs_owner_review === true;
    const searchPlaceholderPrimary = candidate.gate_failure === "search_placeholder";
    const effective_priority_score =
      candidate.priority_score + (promote_pass_reference ? AP_OWNER_REVIEW_PROMOTE_PASS_REFERENCE_BONUS_V1 : 0);

    let evidence_disposition: ApDemandSelectedCandidateRowV1["evidence_disposition"] = "discovery_ready";
    if (candidate.state === "catalog_identity_gap") evidence_disposition = "catalog_identity";
    else if (promote_pass_reference) evidence_disposition = "promote_pass_reference";
    else if (hold_needs_owner_review) evidence_disposition = "hold_needs_owner_review";

    let rationale = candidate.rationale;
    if (evidence?.rationale?.trim()) {
      rationale = `${candidate.rationale} | ${evidence.rationale}`;
    }

    sortable.push({
      candidate,
      evidence,
      sort_tier,
      effective_priority_score,
      evidence_disposition,
      owner_review_required:
        hold_needs_owner_review || (promote_pass_reference && searchPlaceholderPrimary),
      rationale,
    });
  }

  sortable.sort((a, b) => {
    if (a.sort_tier !== b.sort_tier) return a.sort_tier - b.sort_tier;
    if (b.effective_priority_score !== a.effective_priority_score) {
      return b.effective_priority_score - a.effective_priority_score;
    }
    return a.candidate.rank - b.candidate.rank;
  });

  return { sortable, excluded };
}

function sliceEvidenceAwareOwnerReviewRowsV1(
  sortable: OwnerReviewSortableCandidateV1[],
  maxRows: number,
): ApDemandSelectedCandidateRowV1[] {
  const selected: OwnerReviewSortableCandidateV1[] = [];
  let levoitDiscoveryCount = 0;
  const hasPromotedReference = sortable.some((item) => item.evidence_disposition === "promote_pass_reference");

  for (const item of sortable) {
    if (selected.length >= maxRows) break;
    if (hasPromotedReference && item.candidate.pattern === "levoit_oem_discovery") {
      if (levoitDiscoveryCount >= AP_OWNER_REVIEW_MAX_LEVOIT_DISCOVERY_ROWS_V1) continue;
      levoitDiscoveryCount += 1;
    }
    selected.push(item);
  }

  return selected.map((item, index) => mapEvidenceAwareOwnerReviewRowV1(item, index + 1));
}

export function candidateRowsFromBatchProductionLaneV1(
  report: AirPurifierBatchProductionLaneReportV1 | null | undefined,
  options?: {
    maxRows?: number;
    evidenceIndex?: ApOwnerReviewEvidenceIndexV1 | null;
  },
): {
  status: ApDemandSelectedCandidateRowsStatusV1;
  rows: ApDemandSelectedCandidateRowV1[];
  excluded_rows: ApDemandSelectedExcludedCandidateRowV1[];
  unknown_reason: string | null;
} {
  const maxRows = options?.maxRows ?? 10;
  const evidenceIndex = options?.evidenceIndex ?? null;
  if (!report) {
    return {
      status: "UNKNOWN",
      rows: [],
      excluded_rows: [],
      unknown_reason:
        "air_purifier_batch_production_lane_v1 report unavailable; run npx tsx scripts/report-air-purifier-batch-production-lane-v1.ts before owner batch-start approval.",
    };
  }

  if (report.source_status === "UNKNOWN") {
    return {
      status: "UNKNOWN",
      rows: [],
      excluded_rows: [],
      unknown_reason:
        "air_purifier_batch_production_lane_v1 source_status=UNKNOWN; refresh AP filters/retailer_links/GSC inputs and re-run batch-production lane.",
    };
  }

  const actionable = report.top_candidates.filter((candidate) =>
    AP_OWNER_REVIEW_ACTIONABLE_STATE_SET_V1.has(candidate.state),
  );

  if (actionable.length === 0) {
    return {
      status: "UNKNOWN",
      rows: [],
      excluded_rows: [],
      unknown_reason:
        "No actionable AP buyer-path candidates were proven from air_purifier_batch_production_lane_v1.top_candidates.",
    };
  }

  const { sortable, excluded } = buildOwnerReviewSortableCandidatesV1(actionable, evidenceIndex);

  if (sortable.length === 0) {
    return {
      status: "UNKNOWN",
      rows: [],
      excluded_rows: excluded,
      unknown_reason:
        "No evidence-safe AP buyer-path candidates remain after excluding prior NO_SAFE_PATH / MODEL_FILTER_MAPPING_REVIEW_REQUIRED evidence.",
    };
  }

  return {
    status: "PROVEN",
    rows: sliceEvidenceAwareOwnerReviewRowsV1(sortable, maxRows),
    excluded_rows: excluded,
    unknown_reason: null,
  };
}

export async function buildAirPurifierDemandSelectedBatchOwnerReviewLaneV1(
  deps: BuildAirPurifierDemandSelectedBatchOwnerReviewDepsV1,
): Promise<AirPurifierDemandSelectedBatchOwnerReviewLaneV1> {
  const fileExists = deps.fileExists ?? existsSync;
  const readTextFile = deps.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
  const demand = deps.demandToCoverageNextLane;
  const apRow = demand.wedge_rows.find((row) => row.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier);
  const apQueries = demand.top_queries
    .filter((entry) => /air\s*purifier/i.test(entry.key))
    .slice(0, 10)
    .map((entry) => entry.key);

  const batchProductionLane =
    deps.batchProductionLane ??
    (await (deps.loadBatchProductionLane?.({ rootDir: deps.rootDir, fileExists, readTextFile }) ??
      buildAirPurifierBatchProductionLaneV1Report({
        rootDir: deps.rootDir,
        fileExists,
        readTextFile,
      })));

  const evidenceIndex =
    deps.evidenceIndex ??
    deps.loadEvidenceIndex?.({ rootDir: deps.rootDir, fileExists, readTextFile }) ??
    loadApOwnerReviewEvidenceIndexV1({
      rootDir: deps.rootDir,
      fileExists,
      readTextFile,
    });

  const candidateRows = candidateRowsFromBatchProductionLaneV1(batchProductionLane, {
    evidenceIndex,
  });
  const batchRunRegistry =
    deps.loadDemandSelectedRunRegistry?.(deps) ??
    loadApDemandSelectedBatchRunRegistryV1({
      rootDir: deps.rootDir,
      fileExists,
      readText: readTextFile,
    });
  const sourceIsApDemandSelected =
    demand.recommended_wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier &&
    demand.recommendation_status === "START_NEW_DEMAND_SELECTED_BATCH";
  const openBatchProof = buildApDemandSelectedOpenBatchProofStatusV1(batchRunRegistry);
  const openBatchExistenceProven = isApDemandSelectedOpenBatchRegistryProvenOpenV1(batchRunRegistry);
  const reconciledDemandBlockers = openBatchExistenceProven
    ? demand.blockers.filter((blocker) => blocker !== "open_batch_not_proven")
    : demand.blockers;
  const sourceBlockers = reconciledDemandBlockers.map(
    (blocker) => `source_demand_to_coverage_blocker: ${blocker}` as `source_demand_to_coverage_blocker: ${string}`,
  );
  const readOnlyEvidenceCollectionAuthorized =
    batchRunRegistry.status === "PROVEN" && batchRunRegistry.read_only_evidence_collection_authorized;
  const blockers: AirPurifierDemandSelectedBatchOwnerReviewLaneV1["blockers"] = [
    ...(openBatchExistenceProven ? [] : ["open_batch_not_proven" as const]),
    ...(!readOnlyEvidenceCollectionAuthorized ? ["owner_batch_start_approval_missing" as const] : []),
    ...(batchRunRegistry.status !== "PROVEN" ? ["batch_run_registry_not_created" as const] : []),
    ...(batchRunRegistry.evidence_collection_started ? [] : ["evidence_collection_not_started" as const]),
    ...(!sourceIsApDemandSelected ? ["source_demand_to_coverage_not_ap_start_candidate" as const] : []),
    ...sourceBlockers,
  ];
  const unknownFacts = [
    ...demand.unknown_facts,
    ...(candidateRows.unknown_reason ? [candidateRows.unknown_reason] : []),
    ...(batchRunRegistry.status !== "PROVEN"
      ? ["No batch run-registry JSON exists for this proposed AP demand-selected candidate."]
      : []),
    ...(batchRunRegistry.status === "PARSE_ERROR" && batchRunRegistry.parse_error
      ? [`Demand-selected run-registry parse error: ${batchRunRegistry.parse_error}`]
      : []),
    ...(batchRunRegistry.evidence_collection_started
      ? []
      : ["No browser evidence collection has started from this owner-review packet."]),
  ];

  return {
    contract: AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_CC_JQ_PATH_V1,
    source_demand_to_coverage_jq_path: ".command_center_v2.demand_to_coverage_next_lane_v1",
    source_batch_production_report: AIR_PURIFIER_BATCH_PRODUCTION_LANE_REPORT_NAME_V1,
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
    excluded_candidate_rows: candidateRows.excluded_rows,
    candidate_rows_unknown_reason: candidateRows.unknown_reason,
    evidence_index_source_status: evidenceIndex.source_status,
    batch_run_registry: batchRunRegistry,
    open_batch_proof_v1: openBatchProof,
    candidate_selection_logic: [
      "Source recommendation must be demand_to_coverage_next_lane_v1 with recommended_wedge=air_purifier and recommendation_status=START_NEW_DEMAND_SELECTED_BATCH.",
      "Candidate rows start from air_purifier_batch_production_lane_v1.top_candidates actionable states, then apply read-only evidence-aware ranking.",
      "Include only actionable states: search_placeholder_rescue_needed, reference_candidate, direct_buy_candidate, catalog_identity_gap.",
      "Exclude wrong_family_reject, existing_direct_buyable, existing_official_reference, and other non-actionable states.",
      "Exclude candidates with prior agent NO_SAFE_PATH or model-first MODEL_FILTER_MAPPING_REVIEW_REQUIRED evidence.",
      "Mark NEEDS_OWNER_REVIEW agent evidence as owner_review_required=true and demote below discovery-ready rows.",
      "Promote PASS_REFERENCE rows with recommended_csv_mutation when repo agent evidence proves a safer reference path.",
      "Cap plain levoit_oem_discovery rows to 2 when promoted reference candidates exist.",
      "This packet is owner review only; it does not start a batch, generate agent packets, or collect browser evidence.",
    ],
    inputs_needed: [
      ...(batchRunRegistry.status !== "PROVEN"
        ? ["Owner batch-start approval in a future explicit decision surface.", "A future batch run-registry JSON only after owner approval."]
        : readOnlyEvidenceCollectionAuthorized
          ? ["Read-only HyperAgent chat discovery output for scoped demand-selected slugs."]
          : ["Owner batch-start approval for read-only evidence collection."]),
      ...(readOnlyEvidenceCollectionAuthorized
        ? []
        : ["Read-only browser/evidence collection plan for selected AP candidate rows."]),
      "Separate future apply plan before any CSV/Supabase/public mutation.",
    ],
    exact_owner_decision_needed_later: readOnlyEvidenceCollectionAuthorized
      ? "No further owner decision needed to start read-only evidence collection; separate approval is required before evidence file writes, CSV apply, Supabase mutation, public UI mutation, buy-link promotion, Netlify API calls, or deployment."
      : "Approve starting air_purifier_demand_selected_batch_candidate for read-only AP buyer-path evidence collection; this must not authorize CSV apply, Supabase mutation, evidence writes, public UI mutation, Netlify API calls, or deployment.",
    blockers,
    proven_facts: [
      "PROVEN: owner-review packet is read_only=true and data_mutation=false.",
      `PROVEN: source demand recommendation status is ${demand.recommendation_status}.`,
      `PROVEN: source next_batch_candidate is ${String(demand.next_batch_candidate)}.`,
      `PROVEN: candidate_rows_status=${candidateRows.status}.`,
      `PROVEN: candidate_rows projected from ${AIR_PURIFIER_BATCH_PRODUCTION_LANE_REPORT_NAME_V1}.top_candidates with evidence-aware ranking.`,
      `PROVEN: batch_production_lane source_status=${batchProductionLane.source_status}.`,
      `PROVEN: evidence_index_source_status=${evidenceIndex.source_status}.`,
      `PROVEN: excluded_candidate_rows_count=${candidateRows.excluded_rows.length}.`,
      ...(batchRunRegistry.status === "PROVEN"
        ? [
            `PROVEN: demand-selected run-registry detected at ${batchRunRegistry.run_registry_rel_path}; run_id=${String(batchRunRegistry.run_id)}; stage=${String(batchRunRegistry.stage)}.`,
            `PROVEN: demand-selected batch_run_registry proposed_slug_count=${String(batchRunRegistry.proposed_slug_count)}; excluded_slug_count=${String(batchRunRegistry.excluded_slug_count)}.`,
            ...(readOnlyEvidenceCollectionAuthorized
              ? [
                  `PROVEN: founder approved read-only evidence collection for run_id=${String(batchRunRegistry.run_id)}; owner_approval_artifact_rel_path=${String(batchRunRegistry.owner_approval_artifact_rel_path)}.`,
                ]
              : []),
            ...(openBatchExistenceProven
              ? [
                  `PROVEN: open batch existence for run_id=${String(batchRunRegistry.run_id)} (stage=${String(batchRunRegistry.stage)}; evidence_collection_started=true).`,
                  "PROVEN: batch closeout is NOT_PROVEN (closeout_complete remains false on open demand-selected registry).",
                  "PROVEN: apply readiness is NOT_PROVEN; batch_start_authorized and mutation flags remain false.",
                ]
              : []),
          ]
        : []),
    ],
    inferred_facts: [
      ...demand.inferred_facts,
      ...(batchRunRegistry.status !== "PROVEN"
        ? ["INFERRED: AP demand-selected batch candidate should be owner-reviewed before any batch-start registry exists."]
        : readOnlyEvidenceCollectionAuthorized
          ? [
              "INFERRED: Founder authorized read-only browser discovery for the demand-selected run; mutation flags remain false until separate approval.",
            ]
          : ["INFERRED: Demand-selected run-registry is on disk for read-only visibility; mutation flags remain false."]),
    ],
    unknown_facts: unknownFacts,
    next_agent_action: readOnlyEvidenceCollectionAuthorized
      ? `Run read-only HyperAgent chat discovery for run_id ${String(batchRunRegistry.run_id)} scoped slugs only; do not write canonical evidence JSON, mutate CSV/Supabase/public UI, promote buy links, call Netlify, deploy, or create owner approval rows.`
      : "Use this lane for owner review only; do not start a batch, create run-registry JSON, create agent packets, collect browser evidence, mutate CSV/Supabase/evidence/public UI, call Netlify, deploy, or create owner approval rows.",
    next_owner_action: readOnlyEvidenceCollectionAuthorized
      ? "Monitor read-only evidence collection progress; authorize evidence file writes only after separate owner decision. batch_start_authorized remains false for mutation."
      : "Review whether to approve a future read-only AP demand-selected batch start; current packet leaves batch_start_authorized=false.",
  };
}
