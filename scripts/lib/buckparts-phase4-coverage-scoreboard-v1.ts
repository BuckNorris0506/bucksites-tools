/**
 * Phase 4 P4-ENTRY Coverage Scoreboard — read-only rollup of existing CC lane outputs.
 * Prefer census safe-buyer-path truth over incompatible safe_cta counters.
 * No mutation, steering, or completion claims.
 */

import type { AllProductSafeBuyerPathCensusV1 } from "./all-product-safe-buyer-path-census-v1";
import type { BuckpartsRetailerLinkParityCorrectionCommandCenterLaneV1 } from "./buckparts-command-center-v2-types";
import type { BuckpartsSitemapIndexabilityAuditV1 } from "./buckparts-sitemap-indexability-audit-v1";
import type { DemandToCoverageNextLaneReportV1 } from "./demand-to-coverage-next-lane-v1";
import type { FridgeTruthSpineV1 } from "./fridge-truth-spine-v1";
import type { WedgeTruthSpineCoverageMatrixV1 } from "./wedge-truth-spine-coverage-matrix-v1";

export const PHASE4_COVERAGE_SCOREBOARD_CONTRACT_V1 = "phase4_coverage_scoreboard_v1" as const;

export const PHASE4_COVERAGE_SCOREBOARD_CC_JQ_PATH_V1 =
  ".command_center_v2.phase4_coverage_scoreboard_v1" as const;

export const PHASE4_COVERAGE_SCOREBOARD_SOURCE_COMMAND_V1 =
  "npm run buckparts:command-center" as const;

export type Phase4CoverageEvidenceBasisV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type Phase4CoverageRuntimeStatusV1 = "OK" | "ATTENTION" | "NOT_PROVEN" | "UNKNOWN";

export type Phase4CoverageDimensionV1 = {
  dimension_id: string;
  evidence_basis: Phase4CoverageEvidenceBasisV1;
  summary: string;
  source_lanes: string[];
  counters: Record<string, number | string | boolean | null>;
  notes: string[];
};

export type Phase4CoverageScoreboardV1 = {
  contract: typeof PHASE4_COVERAGE_SCOREBOARD_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof PHASE4_COVERAGE_SCOREBOARD_CC_JQ_PATH_V1;
  source_command: typeof PHASE4_COVERAGE_SCOREBOARD_SOURCE_COMMAND_V1;
  generated_at: string;
  runtime_status: Phase4CoverageRuntimeStatusV1;
  dimensions: Phase4CoverageDimensionV1[];
  source_lanes: string[];
  blockers: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
  steering_note: string;
};

export type BuildPhase4CoverageScoreboardArgsV1 = {
  now?: () => Date;
  census?: AllProductSafeBuyerPathCensusV1 | null;
  demandNextLane?: DemandToCoverageNextLaneReportV1 | null;
  sitemapAudit?: BuckpartsSitemapIndexabilityAuditV1 | null;
  wedgeMatrix?: WedgeTruthSpineCoverageMatrixV1 | null;
  retailerLinkParity?: BuckpartsRetailerLinkParityCorrectionCommandCenterLaneV1 | null;
  fridgeTruthSpine?: FridgeTruthSpineV1 | null;
};

function sortedUnique(values: string[]): string[] {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))].sort();
}

function isCensusUsable(census: AllProductSafeBuyerPathCensusV1 | null | undefined): census is AllProductSafeBuyerPathCensusV1 {
  return (
    !!census &&
    census.contract === "all_product_safe_buyer_path_census_v1" &&
    !!census.classification_counts &&
    Array.isArray(census.wedge_coverage) &&
    census.read_only === true &&
    census.data_mutation === false &&
    census.mutation_authorized === false
  );
}

function emptyScoreboard(args: {
  generated_at: string;
  blockers: string[];
  unknown_facts: string[];
}): Phase4CoverageScoreboardV1 {
  return {
    contract: PHASE4_COVERAGE_SCOREBOARD_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: PHASE4_COVERAGE_SCOREBOARD_CC_JQ_PATH_V1,
    source_command: PHASE4_COVERAGE_SCOREBOARD_SOURCE_COMMAND_V1,
    generated_at: args.generated_at,
    runtime_status: "NOT_PROVEN",
    dimensions: [],
    source_lanes: [],
    blockers: sortedUnique(args.blockers),
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: sortedUnique(args.unknown_facts),
    recommended_next_action:
      "NOT_PROVEN: restore all_product_safe_buyer_path_census_v1 before using Phase 4 coverage scoreboard.",
    steering_note:
      "Operational coverage projection only: issue_registry remains steering; canonical_final remains NBA; credit_control remains credit; scoreboard cannot authorize mutation.",
  };
}

export function buildPhase4CoverageScoreboardV1(
  args: BuildPhase4CoverageScoreboardArgsV1 = {},
): Phase4CoverageScoreboardV1 {
  const generated_at = (args.now ?? (() => new Date()))().toISOString();
  const blockers: string[] = [];
  const proven_facts: string[] = [];
  const inferred_facts: string[] = [];
  const unknown_facts: string[] = [];
  const source_lanes: string[] = [];
  const dimensions: Phase4CoverageDimensionV1[] = [];

  if (!isCensusUsable(args.census)) {
    return emptyScoreboard({
      generated_at,
      blockers: ["phase4_scoreboard_census_required"],
      unknown_facts: [
        "UNKNOWN: Phase 4 coverage scoreboard cannot surface safe-buyer-path truth without a usable census report.",
      ],
    });
  }

  const census = args.census;
  source_lanes.push("all_product_safe_buyer_path_census_v1");
  proven_facts.push(
    `PROVEN: census classification_counts SAFE_BUYER_PATH_PROVEN=${census.classification_counts.SAFE_BUYER_PATH_PROVEN}, SUPPRESSED_TRUST=${census.classification_counts.SAFE_BUYER_PATH_SUPPRESSED_TRUST}, NOINDEX_UNPROVEN=${census.classification_counts.NOINDEX_UNPROVEN}.`,
  );
  if (census.generated_at) {
    proven_facts.push(`PROVEN: census.generated_at=${census.generated_at}.`);
  }

  dimensions.push({
    dimension_id: "safe_buyer_paths",
    evidence_basis: "PROVEN",
    summary:
      "Canonical safe buyer path counts from all_product_safe_buyer_path_census_v1 (not demand-lane safe_cta_count).",
    source_lanes: ["all_product_safe_buyer_path_census_v1"],
    counters: {
      SAFE_BUYER_PATH_PROVEN: census.classification_counts.SAFE_BUYER_PATH_PROVEN,
      NO_PRODUCT_PAGE_PROVEN: census.classification_counts.NO_PRODUCT_PAGE_PROVEN,
      UNKNOWN: census.classification_counts.UNKNOWN,
    },
    notes: [
      "Census is the canonical safe-buyer-path authority for Phase 4.",
      "Do not substitute demand_to_coverage_next_lane_v1.safe_cta_count for these counters.",
    ],
  });

  dimensions.push({
    dimension_id: "suppression_and_noindex",
    evidence_basis: "PROVEN",
    summary: "Suppressed-trust and noindex page states from the same census (not interchangeable with proven paths).",
    source_lanes: ["all_product_safe_buyer_path_census_v1"],
    counters: {
      SAFE_BUYER_PATH_SUPPRESSED_TRUST: census.classification_counts.SAFE_BUYER_PATH_SUPPRESSED_TRUST,
      NOINDEX_UNPROVEN: census.classification_counts.NOINDEX_UNPROVEN,
      top_20_rescue_queue_length: census.top_20_rescue_queue?.length ?? 0,
    },
    notes: [
      census.recommended_next_action
        ? `Census recommended_next_action: ${census.recommended_next_action}`
        : "Census recommended_next_action unavailable.",
    ],
  });

  const inventoryRows = census.wedge_coverage.map((row) => ({
    wedge: row.wedge,
    product_page_count: row.product_page_count,
    csv_inventory_source: row.csv_inventory_source,
    vertical_launch_state: row.vertical_launch_state,
    safe_buyer_path_proven_count: row.safe_buyer_path_proven_count,
    suppressed_trust_count: row.suppressed_trust_count,
    noindex_unproven_count: row.noindex_unproven_count,
  }));
  dimensions.push({
    dimension_id: "inventory",
    evidence_basis: "PROVEN",
    summary: "Committed/sample inventory and launch state by wedge from census wedge_coverage.",
    source_lanes: ["all_product_safe_buyer_path_census_v1"],
    counters: {
      wedge_count: inventoryRows.length,
      committed_csv_wedge_count: inventoryRows.filter((row) => row.csv_inventory_source === "committed_csv").length,
      sample_csv_only_wedge_count: inventoryRows.filter((row) => row.csv_inventory_source === "sample_csv_only").length,
      live_wedge_product_page_count: inventoryRows.reduce((sum, row) => sum + row.product_page_count, 0),
    },
    notes: inventoryRows.map(
      (row) =>
        `${row.wedge}: pages=${row.product_page_count}, proven=${row.safe_buyer_path_proven_count}, suppressed=${row.suppressed_trust_count}, noindex=${row.noindex_unproven_count}, launch=${String(row.vertical_launch_state)}, csv=${row.csv_inventory_source}`,
    ),
  });

  const demand = args.demandNextLane;
  if (
    demand &&
    demand.contract === "demand_to_coverage_next_lane_v1" &&
    Array.isArray(demand.wedge_rows)
  ) {
    source_lanes.push("demand_to_coverage_next_lane_v1");
    dimensions.push({
      dimension_id: "demand_gaps",
      evidence_basis: demand.runtime_status === "UNKNOWN" ? "UNKNOWN" : "PROVEN",
      summary:
        "Demand-selected gap steering from GSC×wedge join. Demand is not proof of fit/buy; safe_cta_count is not census proven-path truth.",
      source_lanes: ["demand_to_coverage_next_lane_v1"],
      counters: {
        recommendation_status: demand.recommendation_status,
        recommended_wedge: demand.recommended_wedge,
        highest_demand_wedge: demand.coverage_gap?.highest_demand_wedge ?? "UNKNOWN",
        highest_blocked_wedge: demand.coverage_gap?.highest_blocked_wedge ?? "UNKNOWN",
        wedge_row_count: demand.wedge_rows.length,
      },
      notes: [
        demand.recommended_next_action,
        "INFERRED: demand-lane safe_cta_count fields are definitionally distinct from census SAFE_BUYER_PATH_PROVEN and are not copied into safe_buyer_paths counters.",
        ...(demand.generated_at ? [`demand.generated_at=${demand.generated_at}`] : []),
      ],
    });
    proven_facts.push(
      `PROVEN: demand recommendation_status=${demand.recommendation_status}; recommended_wedge=${String(demand.recommended_wedge)}.`,
    );
    inferred_facts.push(
      "INFERRED: demand_to_coverage_next_lane_v1.safe_cta_count must not override census SAFE_BUYER_PATH_PROVEN.",
    );
    if (Array.isArray(demand.blockers) && demand.blockers.length > 0) {
      blockers.push(...demand.blockers.map((blocker) => `demand_lane:${blocker}`));
    }
  } else {
    blockers.push("phase4_scoreboard_demand_next_lane_unavailable");
    unknown_facts.push("UNKNOWN: demand_to_coverage_next_lane_v1 unavailable for demand_gaps dimension.");
    dimensions.push({
      dimension_id: "demand_gaps",
      evidence_basis: "UNKNOWN",
      summary: "Demand next-lane report unavailable.",
      source_lanes: [],
      counters: {
        recommendation_status: "UNKNOWN",
        recommended_wedge: "UNKNOWN",
      },
      notes: ["Fail-closed: do not invent demand priority."],
    });
  }

  const sitemap = args.sitemapAudit;
  if (sitemap && sitemap.contract === "buckparts_sitemap_indexability_audit_v1") {
    source_lanes.push("sitemap_indexability_audit_v1");
    const gscIndexed = sitemap.gsc_indexed_count;
    dimensions.push({
      dimension_id: "sitemap_indexability",
      evidence_basis: typeof gscIndexed === "number" ? "PROVEN" : "UNKNOWN",
      summary: "Repo expected vs live sitemap inventory; GSC indexed/discovered preserved as UNKNOWN when unavailable.",
      source_lanes: ["sitemap_indexability_audit_v1"],
      counters: {
        repo_expected_indexable_url_count: sitemap.repo_expected_indexable_url_count,
        live_sitemap_url_count: sitemap.live_sitemap_url_count,
        live_sitemap_fetch_status: sitemap.live_sitemap_fetch_status,
        gsc_indexed_count: sitemap.gsc_indexed_count,
        gsc_discovered_count: sitemap.gsc_discovered_count,
        first_campaign_indexability_status: sitemap.first_campaign_indexability_status,
        seventy_five_indexed_page_threshold_status: sitemap.seventy_five_indexed_page_threshold_status,
      },
      notes: [
        ...(sitemap.generated_at ? [`sitemap.generated_at=${sitemap.generated_at}`] : []),
        sitemap.recommended_next_action ?? "No sitemap recommended_next_action.",
      ],
    });
    proven_facts.push(
      `PROVEN: sitemap repo_expected=${String(sitemap.repo_expected_indexable_url_count)}; live=${String(sitemap.live_sitemap_url_count)}; first_campaign=${String(sitemap.first_campaign_indexability_status)}.`,
    );
    if (gscIndexed === "UNKNOWN") {
      unknown_facts.push("UNKNOWN: gsc_indexed_count unavailable in sitemap audit.");
    }
  } else {
    blockers.push("phase4_scoreboard_sitemap_audit_unavailable");
    unknown_facts.push("UNKNOWN: sitemap_indexability_audit_v1 unavailable.");
    dimensions.push({
      dimension_id: "sitemap_indexability",
      evidence_basis: "UNKNOWN",
      summary: "Sitemap indexability audit unavailable.",
      source_lanes: [],
      counters: {
        repo_expected_indexable_url_count: "UNKNOWN",
        live_sitemap_url_count: "UNKNOWN",
        gsc_indexed_count: "UNKNOWN",
      },
      notes: ["Fail-closed: do not invent indexability totals."],
    });
  }

  const parity = args.retailerLinkParity;
  if (
    parity &&
    parity.contract === "buckparts_retailer_link_parity_correction_command_center_lane_v1"
  ) {
    source_lanes.push("buckparts_retailer_link_parity_correction_v1");
    dimensions.push({
      dimension_id: "retailer_link_parity",
      evidence_basis: parity.runtime_status === "NOT_PROVEN" && !parity.blockers?.length ? "UNKNOWN" : "PROVEN",
      summary:
        "Retailer-link CSV↔Supabase parity posture. Unlocks existing CSV wins; does not create new catalog coverage by itself.",
      source_lanes: ["buckparts_retailer_link_parity_correction_v1"],
      counters: {
        runtime_status: parity.runtime_status,
        detected_count: parity.detected_count,
        discovered_count: parity.discovered_count,
        planned_count: parity.planned_count,
        awaiting_approval_count: parity.awaiting_approval_count,
        approved_ready_count: parity.approved_ready_count,
        applied_count: parity.applied_count,
        verified_count: parity.verified_count,
        failed_or_reconciliation_count: parity.failed_or_reconciliation_count,
        owner_action_count: parity.owner_action_count,
      },
      notes: [
        parity.next_action,
        "Parity blockers are surfaced exactly; they do not become FAILED_RECONCILIATION unless closeout proves that state.",
      ],
    });
    proven_facts.push(
      `PROVEN: retailer-link parity runtime_status=${parity.runtime_status}; discovered=${parity.discovered_count}; planned=${parity.planned_count}.`,
    );
    if (Array.isArray(parity.blockers) && parity.blockers.length > 0) {
      blockers.push(...parity.blockers.map((blocker) => `parity:${blocker}`));
    }
  } else {
    blockers.push("phase4_scoreboard_retailer_link_parity_unavailable");
    unknown_facts.push("UNKNOWN: buckparts_retailer_link_parity_correction_v1 unavailable.");
    dimensions.push({
      dimension_id: "retailer_link_parity",
      evidence_basis: "UNKNOWN",
      summary: "Retailer-link parity lane unavailable.",
      source_lanes: [],
      counters: { runtime_status: "UNKNOWN" },
      notes: ["Fail-closed: do not invent parity posture."],
    });
  }

  const wedgeMatrix = args.wedgeMatrix;
  if (
    wedgeMatrix &&
    wedgeMatrix.contract === "wedge_truth_spine_coverage_matrix_v1" &&
    Array.isArray(wedgeMatrix.wedges)
  ) {
    source_lanes.push("wedge_truth_spine_coverage_matrix_v1");
    const inspect = wedgeMatrix.inspect_summary;
    dimensions.push({
      dimension_id: "wedge_launch_state",
      evidence_basis: "PROVEN",
      summary: "Formal spine / partial / sample wedge truth posture. Public opening remains unauthorized by this scoreboard.",
      source_lanes: ["wedge_truth_spine_coverage_matrix_v1"],
      counters: {
        wedges_with_formal_spine_count: inspect?.wedges_with_formal_spine_count ?? "UNKNOWN",
        wedges_partial_operational_proof_count: inspect?.wedges_partial_operational_proof?.length ?? 0,
        wedges_preview_or_sample_only_count: inspect?.wedges_preview_or_sample_only?.length ?? 0,
        whw_truth_spine_gap_present: inspect?.whw_truth_spine_gap_present ?? "UNKNOWN",
        ap_truth_spine_gap_present: inspect?.ap_truth_spine_gap_present ?? "UNKNOWN",
        current_public_opening_authorized: false,
      },
      notes: [
        inspect?.recommended_next_action ?? "No wedge-matrix recommended_next_action.",
        inspect?.next_truth_gap ?? "No next_truth_gap.",
        ...wedgeMatrix.wedges.map(
          (row) => `${row.wedge}: truth_coverage_status=${row.truth_coverage_status}`,
        ),
      ],
    });
    proven_facts.push(
      `PROVEN: wedge matrix formal_spine_count=${String(inspect?.wedges_with_formal_spine_count)}; WHW gap=${String(inspect?.whw_truth_spine_gap_present)}.`,
    );
  } else {
    blockers.push("phase4_scoreboard_wedge_matrix_unavailable");
    unknown_facts.push("UNKNOWN: wedge_truth_spine_coverage_matrix_v1 unavailable.");
    dimensions.push({
      dimension_id: "wedge_launch_state",
      evidence_basis: "UNKNOWN",
      summary: "Wedge truth spine matrix unavailable.",
      source_lanes: [],
      counters: { current_public_opening_authorized: false },
      notes: ["Fail-closed: do not invent wedge launch readiness."],
    });
  }

  const liveProof = args.fridgeTruthSpine?.model_pdp_live_html_proof;
  if (
    liveProof &&
    typeof liveProof.LIVE_PROOF_PASS === "number" &&
    typeof liveProof.LIVE_PROOF_FAIL === "number"
  ) {
    source_lanes.push("fridge_truth_spine_v1.model_pdp_live_html_proof");
    dimensions.push({
      dimension_id: "customer_visible_closure",
      evidence_basis: "PROVEN",
      summary: "Fridge model PDP live HTML proof pack summary (customer-visible closure for scoped allowlist only).",
      source_lanes: ["fridge_truth_spine_v1.model_pdp_live_html_proof"],
      counters: {
        LIVE_PROOF_PASS: liveProof.LIVE_PROOF_PASS,
        LIVE_PROOF_FAIL: liveProof.LIVE_PROOF_FAIL,
        LIVE_PROOF_UNKNOWN: liveProof.LIVE_PROOF_UNKNOWN ?? "UNKNOWN",
        contract: liveProof.contract ?? "UNKNOWN",
      },
      notes: [
        "Scoped fridge proof only — not site-wide closure.",
        "AP/WHW/sample wedge customer-visible closure remains UNKNOWN unless separately proven.",
      ],
    });
    proven_facts.push(
      `PROVEN: fridge live HTML proof PASS=${liveProof.LIVE_PROOF_PASS} FAIL=${liveProof.LIVE_PROOF_FAIL}.`,
    );
    unknown_facts.push(
      "UNKNOWN: customer-visible closure outside fridge live-HTML allowlist is not proven by this scoreboard.",
    );
  } else {
    unknown_facts.push(
      "UNKNOWN: fridge_truth_spine_v1.model_pdp_live_html_proof unavailable or incomplete for customer_visible_closure.",
    );
    dimensions.push({
      dimension_id: "customer_visible_closure",
      evidence_basis: "UNKNOWN",
      summary: "Customer-visible closure evidence unavailable for scoreboard projection.",
      source_lanes: [],
      counters: {
        LIVE_PROOF_PASS: "UNKNOWN",
        LIVE_PROOF_FAIL: "UNKNOWN",
        LIVE_PROOF_UNKNOWN: "UNKNOWN",
      },
      notes: ["Fail-closed: do not invent live proof totals."],
    });
  }

  const sortedBlockers = sortedUnique(blockers);
  const sortedSources = sortedUnique(source_lanes);
  const sortedDimensions = [...dimensions].sort((a, b) => a.dimension_id.localeCompare(b.dimension_id));

  let runtime_status: Phase4CoverageRuntimeStatusV1 = "OK";
  if (sortedBlockers.some((blocker) => blocker.startsWith("phase4_scoreboard_"))) {
    runtime_status = "ATTENTION";
  }
  if (census.classification_counts.SAFE_BUYER_PATH_SUPPRESSED_TRUST > 0) {
    runtime_status = runtime_status === "OK" ? "ATTENTION" : runtime_status;
  }

  const topRescue = census.top_20_rescue_queue?.[0];
  const recommended_next_action = topRescue
    ? `Read-only evidence focus: census rescue #1 ${topRescue.slug} (${topRescue.wedge}) — ${topRescue.recommended_next_safe_action}. No mutation authorized by this scoreboard.`
    : "Read-only: continue monitoring census + demand + parity lanes. No mutation authorized by this scoreboard.";

  return {
    contract: PHASE4_COVERAGE_SCOREBOARD_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: PHASE4_COVERAGE_SCOREBOARD_CC_JQ_PATH_V1,
    source_command: PHASE4_COVERAGE_SCOREBOARD_SOURCE_COMMAND_V1,
    generated_at,
    runtime_status,
    dimensions: sortedDimensions,
    source_lanes: sortedSources,
    blockers: sortedBlockers,
    proven_facts: sortedUnique(proven_facts),
    inferred_facts: sortedUnique(inferred_facts),
    unknown_facts: sortedUnique(unknown_facts),
    recommended_next_action,
    steering_note:
      "Operational coverage projection only: issue_registry remains steering; canonical_final remains NBA; credit_control remains credit; scoreboard cannot authorize mutation or claim Phase 4 complete.",
  };
}

export function buildPhase4CoverageScoreboardUnknownV1(args: {
  reason: string;
  now?: () => Date;
}): Phase4CoverageScoreboardV1 {
  return emptyScoreboard({
    generated_at: (args.now ?? (() => new Date()))().toISOString(),
    blockers: ["phase4_scoreboard_build_failed", `phase4_scoreboard_build_failed:${args.reason}`],
    unknown_facts: [`UNKNOWN: Phase 4 scoreboard build failed: ${args.reason}`],
  });
}
