/**
 * Read-only Wedge Completion Director v1 — deterministic Next Best Action engine
 * composed from Wedge Completion Evaluator v1 output. Does not mutate scoring.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buildCoverageProductionSprintV2ReportV1,
  COVERAGE_PRODUCTION_SPRINT_V2_SOURCE_COMMAND_V1,
  filterActionableCoverageSlugsV1,
  pruneSprintBatchForCensusV1,
  type CoverageProductionSprintV2ReportV1,
  type SprintProductionBatchV1,
} from "./coverage-production-sprint-v2";
import {
  buildAllProductSafeBuyerPathCensusV1,
  type AllProductSafeBuyerPathCensusV1,
} from "./all-product-safe-buyer-path-census-v1";
import {
  BUCKPARTS_PRODUCTION_MISSION_LIFECYCLE_DIR_REL_V1,
  BUCKPARTS_PRODUCTION_MISSION_SOURCE_COMMAND_V1,
} from "./buckparts-production-mission-v1";
import { BUCKPARTS_OPERATIONS_METRICS_SOURCE_COMMAND_V1 } from "./buckparts-operations-metrics-v1";
import { BUCKPARTS_RUNNER_SOURCE_COMMAND_V1 } from "./buckparts-runner-v1";
import { REFERENCEABILITY_FACTORY_SOURCE_COMMAND_V1 } from "./referenceability-factory-run-v1";
import {
  WEDGE_COMPLETION_EVALUATOR_CONTRACT_V1,
  WEDGE_COMPLETION_EVALUATOR_SOURCE_COMMAND_V1,
  WEDGE_COMPLETION_STANDARD_DESIGN_DOC_V1,
  buildWedgeCompletionEvaluatorReportV1,
  type BuildWedgeCompletionEvaluatorDepsV1,
  type WedgeCompletionCriterionResultV1,
  type WedgeCompletionCriterionStatusV1,
  type WedgeCompletionDimensionIdV1,
  type WedgeCompletionEvaluatorReportV1,
} from "./wedge-completion-evaluator-v1";

export const WEDGE_COMPLETION_DIRECTOR_CONTRACT_V1 = "wedge_completion_director_v1" as const;

export const WEDGE_COMPLETION_DIRECTOR_SOURCE_COMMAND_V1 =
  "npm run buckparts:wedge-completion-director" as const;

export const WEDGE_COMPLETION_DIRECTOR_CC_JQ_PATH_V1 =
  ".command_center_v2.wedge_completion_director_v1" as const;

/** Dimension order used by evaluator first-blocker traversal and standard §1.3. */
export const WEDGE_COMPLETION_DIRECTOR_DIMENSION_ORDER_V1: readonly WedgeCompletionDimensionIdV1[] = [
  "coverage",
  "customer_experience",
  "distribution",
  "measurement",
] as const;

export type WedgeCompletionDirectorActionIdV1 =
  | "clear_proven_slug_referenceability_debt_v1"
  | "coverage_production_mission_c3_v1"
  | "daily_operator_live_route_e4_v1"
  | "search_intent_factory_proof_d4_v1"
  | "operations_metrics_snapshot_series_m1_m5_v1"
  | "wedge_complete_no_action_v1";

export type WedgeCompletionDirectorActionTemporalityV1 =
  | "IMMEDIATE_SESSION_PASS_ELIGIBLE"
  | "RECORD_NOW_WAIT_REQUIRED"
  | "BLOCKED_OR_UNKNOWN";

export type WedgeCompletionDirectorRankedCandidateV1 = {
  action_id: WedgeCompletionDirectorActionIdV1;
  rank: number;
  primary_dimension: WedgeCompletionDimensionIdV1;
  blocking_criterion_ids: string[];
  fail_criteria_addressed_count: number;
  unknown_criteria_addressed_count: number;
  dimensions_touched: WedgeCompletionDimensionIdV1[];
  expected_completion_impact: string;
  factory_or_mission: string;
  report_script: string;
  artifact_rel_paths: string[];
  commands: string[];
  /** @deprecated Prefer action_temporality for ranking; kept for inspect parity. */
  immediate_session_pass_eligible: boolean;
  action_temporality: WedgeCompletionDirectorActionTemporalityV1;
  tie_break_notes: string[];
};

export type WedgeCompletionDirectorRecommendedActionV1 = Omit<
  WedgeCompletionDirectorRankedCandidateV1,
  "rank" | "tie_break_notes"
> & {
  tie_break_reason: string | null;
  top_blocking_slug: string | null;
  top_blocking_summary: string | null;
  /** Slugs that would yield +1 census delta on guarded apply (excludes SAFE_BUYER_PATH_PROVEN). */
  actionable_target_slugs: string[];
  /** True when an EXECUTABLE_NOW / EXECUTABLE_AFTER_APPROVAL batch has delta >= 1 after proven-slug exclusion. */
  immediate_c3_delta_available: boolean;
  /** Census-proven slugs removed from the source sprint batch recommendation. */
  excluded_proven_slugs: string[];
};

export type WedgeCompletionDirectorReportV1 = {
  contract: typeof WEDGE_COMPLETION_DIRECTOR_CONTRACT_V1;
  evaluator_contract: typeof WEDGE_COMPLETION_EVALUATOR_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  artifact_write_authorized: false;
  source_command: typeof WEDGE_COMPLETION_DIRECTOR_SOURCE_COMMAND_V1;
  evaluator_source_command: typeof WEDGE_COMPLETION_EVALUATOR_SOURCE_COMMAND_V1;
  standard_design_doc: typeof WEDGE_COMPLETION_STANDARD_DESIGN_DOC_V1;
  generated_at: string;
  wedge: WedgeCompletionEvaluatorReportV1["wedge"];
  overall_status: WedgeCompletionEvaluatorReportV1["overall_status"];
  evaluator_overall_status: WedgeCompletionEvaluatorReportV1["overall_status"];
  blocking_criteria_fail: WedgeCompletionCriterionResultV1[];
  blocking_criteria_unknown: WedgeCompletionCriterionResultV1[];
  ranked_action_candidates: WedgeCompletionDirectorRankedCandidateV1[];
  recommended_next_action: WedgeCompletionDirectorRecommendedActionV1;
  why_this_action: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

const FRIDGE_FILTER_CSV = "data/filters.csv" as const;

const ACTION_TEMPORALITY_RANK_V1: Record<WedgeCompletionDirectorActionTemporalityV1, number> = {
  IMMEDIATE_SESSION_PASS_ELIGIBLE: 0,
  RECORD_NOW_WAIT_REQUIRED: 1,
  BLOCKED_OR_UNKNOWN: 2,
};

function temporalityRank(temporality: WedgeCompletionDirectorActionTemporalityV1): number {
  return ACTION_TEMPORALITY_RANK_V1[temporality];
}

function loadFridgeCsvSlugs(rootDir: string): Set<string> {
  const abs = path.join(rootDir, FRIDGE_FILTER_CSV);
  const rows = parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ slug?: string }>;
  return new Set(rows.map((r) => r.slug).filter((s): s is string => Boolean(s)));
}

const DIMENSION_INDEX: Record<WedgeCompletionDimensionIdV1, number> = {
  coverage: 0,
  customer_experience: 1,
  distribution: 2,
  measurement: 3,
};

function criterionById(
  report: WedgeCompletionEvaluatorReportV1,
  id: string,
): WedgeCompletionCriterionResultV1 | undefined {
  for (const dim of report.dimensions) {
    const found = dim.criteria.find((c) => c.criterion_id === id);
    if (found) return found;
  }
  return undefined;
}

function allBlockingCriteria(
  report: WedgeCompletionEvaluatorReportV1,
): WedgeCompletionCriterionResultV1[] {
  return report.dimensions.flatMap((d) => d.criteria).filter((c) => c.status === "FAIL" || c.status === "UNKNOWN");
}

function dimensionForCriterion(
  report: WedgeCompletionEvaluatorReportV1,
  criterionId: string,
): WedgeCompletionDimensionIdV1 {
  const dim = report.dimensions.find((d) => d.criteria.some((c) => c.criterion_id === criterionId));
  return dim?.dimension_id ?? "coverage";
}

function statusForCriterion(
  report: WedgeCompletionEvaluatorReportV1,
  criterionId: string,
): WedgeCompletionCriterionStatusV1 {
  return criterionById(report, criterionId)?.status ?? "UNKNOWN";
}

function countStatuses(
  report: WedgeCompletionEvaluatorReportV1,
  ids: string[],
  status: WedgeCompletionCriterionStatusV1,
): number {
  return ids.filter((id) => statusForCriterion(report, id) === status).length;
}

function parseBlockingSlug(line: string): { slug: string; summary: string } | null {
  const colonIdx = line.indexOf(":");
  if (colonIdx <= 0) {
    const slugOnly = line.trim();
    return slugOnly ? { slug: slugOnly, summary: line } : null;
  }
  const slug = line.slice(0, colonIdx);
  return { slug, summary: line };
}

function pickTopBlockingSlug(
  report: WedgeCompletionEvaluatorReportV1,
  criterionIds: string[],
): { slug: string | null; summary: string | null } {
  for (const id of criterionIds) {
    const c = criterionById(report, id);
    if (!c || c.blocking_evidence.length === 0) continue;
    const parsed = parseBlockingSlug(c.blocking_evidence[0]!);
    if (parsed) return parsed;
  }
  return { slug: null, summary: null };
}

function isFridgeBatch(batch: SprintProductionBatchV1, fridgeSlugs: Set<string>): boolean {
  if (batch.target_slugs.some((s) => fridgeSlugs.has(s))) return true;
  return (
    batch.batch_id === "fridge_safe_link_first4_deblocked" ||
    batch.batch_id === "fridge_owner_browser_proof_7" ||
    batch.batch_id === "hyperagent_safe_link_14" ||
    batch.batch_id === "legacy_fridge_lifecycle_14"
  );
}

function selectCoverageDirectorBatch(args: {
  sprint: CoverageProductionSprintV2ReportV1 | null;
  fridgeSlugs: Set<string>;
  census: AllProductSafeBuyerPathCensusV1;
  rootDir: string;
}): {
  applyBatch: SprintProductionBatchV1 | null;
  evidenceBatch: SprintProductionBatchV1 | null;
  excludedProvenSlugs: string[];
} {
  const fridgeBatches =
    args.sprint?.ranked_production_batches?.filter((b) => isFridgeBatch(b, args.fridgeSlugs)) ?? [];

  const excludedProvenSlugs = new Set<string>();
  const prunedBatches: SprintProductionBatchV1[] = [];
  for (const batch of fridgeBatches) {
    const before = batch.target_slugs;
    const pruned = pruneSprintBatchForCensusV1(batch, args.census);
    for (const slug of before) {
      if (filterActionableCoverageSlugsV1(args.census, [slug]).length === 0) {
        excludedProvenSlugs.add(slug);
      }
    }
    if (pruned) prunedBatches.push(pruned);
  }

  const first4Path = path.join(
    args.rootDir,
    "data/fridge/batch-production/drafts/fridge-safe-link-rescue-first4-apply-review-v1.json",
  );
  if (existsSync(first4Path)) {
    try {
      const first4 = JSON.parse(readFileSync(first4Path, "utf8")) as {
        rows?: Array<{ slug?: string; owner_apply_review_ready?: boolean }>;
      };
      for (const row of first4.rows ?? []) {
        if (
          row.slug &&
          row.owner_apply_review_ready === true &&
          filterActionableCoverageSlugsV1(args.census, [row.slug]).length === 0
        ) {
          excludedProvenSlugs.add(row.slug);
        }
      }
    } catch {
      // ignore malformed first4 review artifact
    }
  }

  const applyBatch =
    prunedBatches.find(
      (b) =>
        (b.executability === "EXECUTABLE_NOW" || b.executability === "EXECUTABLE_AFTER_APPROVAL") &&
        b.expected_safe_buyer_path_proven_delta >= 1 &&
        b.target_slugs.length >= 1,
    ) ?? null;

  const evidenceBatch =
    prunedBatches.find(
      (b) =>
        b.executability === "EXECUTABLE_AFTER_EVIDENCE" &&
        b.expected_safe_buyer_path_proven_delta >= 1,
    ) ?? null;

  return {
    applyBatch,
    evidenceBatch,
    excludedProvenSlugs: Array.from(excludedProvenSlugs),
  };
}

function buildReferenceabilityCandidate(args: {
  report: WedgeCompletionEvaluatorReportV1;
}): WedgeCompletionDirectorRankedCandidateV1 | null {
  const ids = ["E3", "D2"];
  const active = ids.filter((id) => {
    const s = statusForCriterion(args.report, id);
    return s === "FAIL" || s === "UNKNOWN";
  });
  if (active.length === 0) return null;

  const e3 = criterionById(args.report, "E3");
  const d2 = criterionById(args.report, "D2");
  const blockingItems =
    typeof e3?.metrics.blocking_referenceability_work_items === "number"
      ? e3.metrics.blocking_referenceability_work_items
      : "UNKNOWN";
  const internalLinkDebt =
    typeof d2?.metrics.internal_link_plan_debt_count === "number"
      ? d2.metrics.internal_link_plan_debt_count
      : "UNKNOWN";

  return {
    action_id: "clear_proven_slug_referenceability_debt_v1",
    rank: 0,
    primary_dimension: "customer_experience",
    blocking_criterion_ids: active,
    fail_criteria_addressed_count: countStatuses(args.report, ids, "FAIL"),
    unknown_criteria_addressed_count: countStatuses(args.report, ids, "UNKNOWN"),
    dimensions_touched: (["customer_experience", "distribution"] as const).filter((dim) =>
      active.some((id) => dimensionForCriterion(args.report, id) === dim),
    ),
    expected_completion_impact:
      `Full resolution clears ${active.join(" + ")} (${String(failCount(args.report, ids))} FAIL now: E3 blocking_referenceability_work_items=${String(blockingItems)}, D2 internal_link_plan_debt_count=${String(internalLinkDebt)}). Unblocks customer_experience and distribution dimensions toward WEDGE_COMPLETE.`,
    factory_or_mission: "referenceability_factory_run_v1",
    report_script: "scripts/report-buckparts-referenceability-factory-v1.ts",
    artifact_rel_paths: [
      "scripts/lib/referenceability-factory-run-v1.ts",
      "scripts/lib/referenceability-factory-gap-detectors-v1.ts",
      "data/filters.csv",
    ],
    commands: [REFERENCEABILITY_FACTORY_SOURCE_COMMAND_V1],
    immediate_session_pass_eligible: true,
    action_temporality: "IMMEDIATE_SESSION_PASS_ELIGIBLE",
    tie_break_notes: [
      "Addresses the most simultaneous FAIL criteria (E3 + D2) among executable repo factories per WEDGE-COMPLETION-STANDARD-DESIGN §3–§4.",
      "D3 already PASS — referenceability debt is the remaining distribution blocker besides D4 UNKNOWN.",
    ],
  };
}

function failCount(report: WedgeCompletionEvaluatorReportV1, ids: string[]): number {
  return countStatuses(report, ids, "FAIL");
}

function buildCoverageMissionCandidate(args: {
  report: WedgeCompletionEvaluatorReportV1;
  sprint: CoverageProductionSprintV2ReportV1 | null;
  fridgeSlugs: Set<string>;
  census: AllProductSafeBuyerPathCensusV1;
  rootDir: string;
}): WedgeCompletionDirectorRankedCandidateV1 | null {
  if (statusForCriterion(args.report, "C3") !== "FAIL") return null;

  const c3 = criterionById(args.report, "C3")!;
  const { applyBatch, evidenceBatch, excludedProvenSlugs } = selectCoverageDirectorBatch({
    sprint: args.sprint,
    fridgeSlugs: args.fridgeSlugs,
    census: args.census,
    rootDir: args.rootDir,
  });
  const immediateDelta = applyBatch != null;
  const topBatch = applyBatch ?? evidenceBatch;

  const baseCommands = [
    COVERAGE_PRODUCTION_SPRINT_V2_SOURCE_COMMAND_V1,
    BUCKPARTS_PRODUCTION_MISSION_SOURCE_COMMAND_V1,
    `${BUCKPARTS_RUNNER_SOURCE_COMMAND_V1} -- --mission production_mission_v1`,
  ];

  const commands = topBatch ? [...baseCommands, ...topBatch.dry_run_commands] : baseCommands;

  const artifactPaths = [
    "scripts/lib/coverage-production-sprint-v2.ts",
    "scripts/lib/buckparts-production-mission-v1.ts",
    BUCKPARTS_PRODUCTION_MISSION_LIFECYCLE_DIR_REL_V1,
  ];
  if (topBatch) {
    artifactPaths.push(`coverage_sprint_batch:${topBatch.batch_id}`);
  }

  const tieBreakNotes = [
    "C3 requires uniform buyer-path truth on all compat-mapped filters — not merely >=1 proven slug (coverage dimension order).",
    "PROVEN lifecycle a6b27301-e040-4405-b613-5adcb6c99bb6 demonstrates production-mission progress toward clearing zero-safe mapped filters.",
  ];
  if (excludedProvenSlugs.length > 0) {
    tieBreakNotes.push(
      `Excluded census SAFE_BUYER_PATH_PROVEN slugs from actionable batch: ${excludedProvenSlugs.join(", ")}.`,
    );
  }
  if (immediateDelta && applyBatch) {
    tieBreakNotes.push(
      `Top actionable apply batch ${applyBatch.batch_id} expected_safe_buyer_path_proven_delta=${String(applyBatch.expected_safe_buyer_path_proven_delta)} executability=${applyBatch.executability}; target_slugs=${applyBatch.target_slugs.join(", ") || "none"}.`,
    );
  } else if (evidenceBatch) {
    tieBreakNotes.push(
      `No immediately executable suppressed slug with guarded-apply path — fall back to evidence batch ${evidenceBatch.batch_id} (expected delta=${String(evidenceBatch.expected_safe_buyer_path_proven_delta)} after proof).`,
    );
  } else {
    tieBreakNotes.push(
      "No fridge batch with actionable delta >= 1 after excluding census-proven slugs — run coverage sprint for bottleneck detail.",
    );
  }

  const expectedImpact =
    immediateDelta && applyBatch
      ? `Production mission can flip C3 PASS when every compat-mapped filter has a proven safe buyer path (buyer_path_truth_status PROVEN_SAFE_ROWS_EXIST — now ${String(c3.metrics.buyer_path_truth_status ?? "UNKNOWN")}, proven_count=${String(c3.metrics.safe_buyer_path_proven_count ?? "UNKNOWN")}). Next apply targets: ${applyBatch.target_slugs.join(", ")} (+${String(applyBatch.expected_safe_buyer_path_proven_delta)} delta). C4 already PASS — reuse production_mission_v1 loop.`
      : evidenceBatch
        ? `C3 still FAIL (buyer_path_truth_status=${String(c3.metrics.buyer_path_truth_status ?? "UNKNOWN")}, proven_count=${String(c3.metrics.safe_buyer_path_proven_count ?? "UNKNOWN")}). No immediately executable suppressed slug with guarded CSV apply — ${excludedProvenSlugs.length > 0 ? `recently proven: ${excludedProvenSlugs.join(", ")}. ` : ""}Next step: evidence-generation via ${evidenceBatch.batch_id} before apply-plan and guarded apply.`
        : `C3 still FAIL (buyer_path_truth_status=${String(c3.metrics.buyer_path_truth_status ?? "UNKNOWN")}, proven_count=${String(c3.metrics.safe_buyer_path_proven_count ?? "UNKNOWN")}). No immediately executable suppressed slug with guarded apply path in current sprint ranking — review bottlenecks and collect owner-browser proof.`;

  return {
    action_id: "coverage_production_mission_c3_v1",
    rank: 0,
    primary_dimension: "coverage",
    blocking_criterion_ids: ["C3"],
    fail_criteria_addressed_count: 1,
    unknown_criteria_addressed_count: 0,
    dimensions_touched: ["coverage"],
    expected_completion_impact: expectedImpact,
    factory_or_mission: immediateDelta
      ? "coverage_production_sprint_v2_v1 + production_mission_v1"
      : evidenceBatch
        ? `${evidenceBatch.batch_id} + coverage_production_sprint_v2_v1`
        : "coverage_production_sprint_v2_v1",
    report_script: "scripts/report-coverage-production-sprint-v2.ts",
    artifact_rel_paths: artifactPaths,
    commands,
    immediate_session_pass_eligible: topBatch != null,
    action_temporality: immediateDelta
      ? "IMMEDIATE_SESSION_PASS_ELIGIBLE"
      : evidenceBatch
        ? "IMMEDIATE_SESSION_PASS_ELIGIBLE"
        : "BLOCKED_OR_UNKNOWN",
    tie_break_notes: tieBreakNotes,
  };
}

function buildDailyOperatorCandidate(args: {
  report: WedgeCompletionEvaluatorReportV1;
}): WedgeCompletionDirectorRankedCandidateV1 | null {
  if (statusForCriterion(args.report, "E4") !== "UNKNOWN") return null;

  return {
    action_id: "daily_operator_live_route_e4_v1",
    rank: 0,
    primary_dimension: "customer_experience",
    blocking_criterion_ids: ["E4"],
    fail_criteria_addressed_count: 0,
    unknown_criteria_addressed_count: 1,
    dimensions_touched: ["customer_experience"],
    expected_completion_impact:
      "Supplies live-site banned phrase evidence to evaluator; resolves E4 UNKNOWN when no banned routes on LIVE wedge paths.",
    factory_or_mission: "buckparts_daily_operator_v1",
    report_script: "scripts/report-buckparts-daily-operator.ts",
    artifact_rel_paths: ["scripts/report-buckparts-daily-operator.ts", "scripts/lib/live-site-smoke.ts"],
    commands: ["npm run buckparts:daily"],
    immediate_session_pass_eligible: true,
    action_temporality: "IMMEDIATE_SESSION_PASS_ELIGIBLE",
    tie_break_notes: ["E3 still FAIL — clearing E4 alone does not pass customer_experience dimension."],
  };
}

function buildSearchIntentCandidate(args: {
  report: WedgeCompletionEvaluatorReportV1;
}): WedgeCompletionDirectorRankedCandidateV1 | null {
  const d4Status = statusForCriterion(args.report, "D4");
  if (d4Status !== "UNKNOWN" && d4Status !== "FAIL") return null;

  const d4 = criterionById(args.report, "D4");
  const moduleMissing = (d4?.blocking_evidence ?? []).some(
    (e) => e.includes("Cannot find module") || e.includes("MODULE_MISSING"),
  );
  const temporality: WedgeCompletionDirectorActionTemporalityV1 = moduleMissing
    ? "BLOCKED_OR_UNKNOWN"
    : "IMMEDIATE_SESSION_PASS_ELIGIBLE";
  const commands = ["npm run buckparts:search-intent-factory:proof-experiment"];

  return {
    action_id: "search_intent_factory_proof_d4_v1",
    rank: 0,
    primary_dimension: "distribution",
    blocking_criterion_ids: ["D4"],
    fail_criteria_addressed_count: d4Status === "FAIL" ? 1 : 0,
    unknown_criteria_addressed_count: d4Status === "UNKNOWN" ? 1 : 0,
    dimensions_touched: ["distribution"],
    expected_completion_impact: moduleMissing
      ? "D4 blocked: buckparts-search-intent-factory-proof-experiment-v1.ts requires missing ./buckparts-search-intent-alignment-experiment-v1 module — command exists but run fails until module lands."
      : "Runs search_intent_factory_proof_experiment_v1 to resolve D4 per standard §5.",
    factory_or_mission: "search_intent_factory_proof_experiment_v1",
    report_script: "scripts/report-buckparts-search-intent-factory-proof-experiment-v1.ts",
    artifact_rel_paths: ["scripts/lib/buckparts-search-intent-factory-proof-experiment-v1.ts"],
    commands,
    immediate_session_pass_eligible: temporality === "IMMEDIATE_SESSION_PASS_ELIGIBLE",
    action_temporality: temporality,
    tie_break_notes: moduleMissing
      ? ["Repo truth: D4 command fails today — ranked below executable factories."]
      : [],
  };
}

function buildOperationsMetricsCandidate(args: {
  report: WedgeCompletionEvaluatorReportV1;
}): WedgeCompletionDirectorRankedCandidateV1 | null {
  const ids = ["M1", "M5"];
  const active = ids.filter((id) => statusForCriterion(args.report, id) === "FAIL");
  if (active.length === 0) return null;

  const m1 = criterionById(args.report, "M1");
  const snapshotCount = m1?.metrics.snapshot_count ?? "UNKNOWN";

  return {
    action_id: "operations_metrics_snapshot_series_m1_m5_v1",
    rank: 0,
    primary_dimension: "measurement",
    blocking_criterion_ids: active,
    fail_criteria_addressed_count: active.length,
    unknown_criteria_addressed_count: 0,
    dimensions_touched: ["measurement"],
    expected_completion_impact:
      `Housekeeping: record another ops-metrics snapshot (now snapshot_count=${String(snapshotCount)}). M1/M5 require >=2 snapshots separated by >=24h — this cannot PASS either criterion in the current session; run after higher-priority immediate actions.`,
    factory_or_mission: "operations_metrics_v1",
    report_script: "scripts/report-buckparts-operations-metrics-v1.ts",
    artifact_rel_paths: ["data/command-center/operations-metrics/history-v1.jsonl"],
    commands: [`${BUCKPARTS_OPERATIONS_METRICS_SOURCE_COMMAND_V1} -- --record-snapshot`],
    immediate_session_pass_eligible: false,
    action_temporality: "RECORD_NOW_WAIT_REQUIRED",
    tie_break_notes: [
      "Addresses M1 + M5 FAIL on paper (2 criteria) but time-gated — ranked below any IMMEDIATE_SESSION_PASS_ELIGIBLE action.",
      "Record snapshot as housekeeping once immediate wedge blockers are in flight.",
    ],
  };
}

function buildCompleteCandidate(args: {
  report: WedgeCompletionEvaluatorReportV1;
}): WedgeCompletionDirectorRankedCandidateV1 | null {
  if (args.report.overall_status !== "WEDGE_COMPLETE") return null;

  return {
    action_id: "wedge_complete_no_action_v1",
    rank: 1,
    primary_dimension: "coverage",
    blocking_criterion_ids: [],
    fail_criteria_addressed_count: 0,
    unknown_criteria_addressed_count: 0,
    dimensions_touched: [],
    expected_completion_impact: "WEDGE_COMPLETE — founder may review expansion gate per standard §8.",
    factory_or_mission: "wedge_completion_evaluator_v1",
    report_script: "scripts/report-wedge-completion-evaluator-v1.ts",
    artifact_rel_paths: [WEDGE_COMPLETION_STANDARD_DESIGN_DOC_V1],
    commands: [WEDGE_COMPLETION_EVALUATOR_SOURCE_COMMAND_V1],
    immediate_session_pass_eligible: true,
    action_temporality: "IMMEDIATE_SESSION_PASS_ELIGIBLE",
    tie_break_notes: [],
  };
}

function compareCandidates(
  a: WedgeCompletionDirectorRankedCandidateV1,
  b: WedgeCompletionDirectorRankedCandidateV1,
): number {
  const temporalityA = temporalityRank(a.action_temporality);
  const temporalityB = temporalityRank(b.action_temporality);
  if (temporalityA !== temporalityB) {
    return temporalityA - temporalityB;
  }
  if (b.fail_criteria_addressed_count !== a.fail_criteria_addressed_count) {
    return b.fail_criteria_addressed_count - a.fail_criteria_addressed_count;
  }
  if (a.immediate_session_pass_eligible !== b.immediate_session_pass_eligible) {
    return a.immediate_session_pass_eligible ? -1 : 1;
  }
  if (b.dimensions_touched.length !== a.dimensions_touched.length) {
    return b.dimensions_touched.length - a.dimensions_touched.length;
  }
  if (b.unknown_criteria_addressed_count !== a.unknown_criteria_addressed_count) {
    return b.unknown_criteria_addressed_count - a.unknown_criteria_addressed_count;
  }
  const dimA = DIMENSION_INDEX[a.primary_dimension];
  const dimB = DIMENSION_INDEX[b.primary_dimension];
  if (dimA !== dimB) return dimA - dimB;
  return a.action_id.localeCompare(b.action_id);
}

function rankCandidates(
  candidates: WedgeCompletionDirectorRankedCandidateV1[],
): WedgeCompletionDirectorRankedCandidateV1[] {
  const sorted = [...candidates].sort(compareCandidates);
  return sorted.map((c, i) => ({ ...c, rank: i + 1 }));
}

function buildWhyThisAction(args: {
  winner: WedgeCompletionDirectorRankedCandidateV1;
  ranked: WedgeCompletionDirectorRankedCandidateV1[];
  report: WedgeCompletionEvaluatorReportV1;
}): string[] {
  const lines = [
    `PROVEN: ${args.winner.fail_criteria_addressed_count} FAIL criterion(s) addressed: ${args.winner.blocking_criterion_ids.join(", ") || "none"}.`,
    `PROVEN: overall_status=${args.report.overall_status}; blocking_dimensions=${args.report.blocking_dimensions.join(", ") || "none"}.`,
  ];
  const runnerUp = args.ranked.find((c) => c.rank === 2);
  if (runnerUp && runnerUp.fail_criteria_addressed_count === args.winner.fail_criteria_addressed_count) {
    lines.push(
      `TIE-BREAK: ${args.winner.action_id} beats ${runnerUp.action_id} — action_temporality=${args.winner.action_temporality} vs ${runnerUp.action_temporality}; dimensions_touched=${String(args.winner.dimensions_touched.length)} vs ${String(runnerUp.dimensions_touched.length)}.`,
    );
  } else if (runnerUp && temporalityRank(args.winner.action_temporality) !== temporalityRank(runnerUp.action_temporality)) {
    lines.push(
      `TIE-BREAK: ${args.winner.action_id} beats ${runnerUp.action_id} — action_temporality=${args.winner.action_temporality} before ${runnerUp.action_temporality} (immediate session work outranks time-gated housekeeping).`,
    );
  } else if (runnerUp) {
    lines.push(
      `TIE-BREAK: ${args.winner.action_id} beats ${runnerUp.action_id} — fail_criteria_addressed_count ${String(args.winner.fail_criteria_addressed_count)} vs ${String(runnerUp.fail_criteria_addressed_count)}.`,
    );
  }
  lines.push(...args.winner.tie_break_notes);
  return lines;
}

function buildTieBreakReason(
  winner: WedgeCompletionDirectorRankedCandidateV1,
  runnerUp: WedgeCompletionDirectorRankedCandidateV1 | undefined,
): string | null {
  if (!runnerUp) return null;
  if (temporalityRank(winner.action_temporality) !== temporalityRank(runnerUp.action_temporality)) {
    return `Prefer action_temporality=${winner.action_temporality} over ${runnerUp.action_temporality} (${runnerUp.action_id} is time-gated or blocked for this session).`;
  }
  if (winner.fail_criteria_addressed_count !== runnerUp.fail_criteria_addressed_count) {
    return `Higher fail_criteria_addressed_count (${String(winner.fail_criteria_addressed_count)} vs ${String(runnerUp.fail_criteria_addressed_count)}).`;
  }
  if (winner.immediate_session_pass_eligible !== runnerUp.immediate_session_pass_eligible) {
    return `Same FAIL count; prefer immediate_session_pass_eligible=${String(winner.immediate_session_pass_eligible)} over ${runnerUp.action_id}.`;
  }
  if (winner.dimensions_touched.length !== runnerUp.dimensions_touched.length) {
    return `Same FAIL count; touches more dimensions (${String(winner.dimensions_touched.length)} vs ${String(runnerUp.dimensions_touched.length)}).`;
  }
  return `Same FAIL count; primary_dimension order (${winner.primary_dimension} before ${runnerUp.primary_dimension}).`;
}

export type BuildWedgeCompletionDirectorDepsV1 = BuildWedgeCompletionEvaluatorDepsV1;

export function buildWedgeCompletionDirectorFromEvaluatorReportV1(args: {
  report: WedgeCompletionEvaluatorReportV1;
  rootDir: string;
  now?: () => Date;
  sprint?: CoverageProductionSprintV2ReportV1 | null;
  census?: AllProductSafeBuyerPathCensusV1;
  skipSprint?: boolean;
}): WedgeCompletionDirectorReportV1 {
  const now = args.now ?? (() => new Date());
  const report = args.report;

  let sprint: CoverageProductionSprintV2ReportV1 | null = args.sprint ?? null;
  if (sprint === null && !args.skipSprint) {
    throw new Error(
      "buildWedgeCompletionDirectorFromEvaluatorReportV1: load sprint in buildWedgeCompletionDirectorReportV1 or pass sprint/skipSprint",
    );
  }

  const census =
    args.census ??
    buildAllProductSafeBuyerPathCensusV1({
      rootDir: args.rootDir,
      now,
    });

  const fridgeSlugs = loadFridgeCsvSlugs(args.rootDir);

  const coverageSelection = selectCoverageDirectorBatch({
    sprint,
    fridgeSlugs,
    census,
    rootDir: args.rootDir,
  });

  const candidates = [
    buildCompleteCandidate({ report }),
    buildReferenceabilityCandidate({ report }),
    buildCoverageMissionCandidate({ report, sprint, fridgeSlugs, census, rootDir: args.rootDir }),
    buildOperationsMetricsCandidate({ report }),
    buildDailyOperatorCandidate({ report }),
    buildSearchIntentCandidate({ report }),
  ].filter((c): c is WedgeCompletionDirectorRankedCandidateV1 => c != null);

  const ranked = rankCandidates(candidates);
  const winner = ranked[0];
  if (!winner) {
    throw new Error("wedge_completion_director_v1: no action candidates for current evaluator state");
  }

  const runnerUp = ranked[1];
  const actionableSlugs =
    winner.action_id === "coverage_production_mission_c3_v1"
      ? coverageSelection.applyBatch?.target_slugs ?? []
      : [];
  const topBlock =
    actionableSlugs.length > 0
      ? {
          slug: actionableSlugs[0]!,
          summary: `${actionableSlugs[0]}: next guarded-apply target (census not yet SAFE_BUYER_PATH_PROVEN)`,
        }
      : pickTopBlockingSlug(report, winner.blocking_criterion_ids);
  const recommended: WedgeCompletionDirectorRecommendedActionV1 = {
    action_id: winner.action_id,
    primary_dimension: winner.primary_dimension,
    blocking_criterion_ids: winner.blocking_criterion_ids,
    fail_criteria_addressed_count: winner.fail_criteria_addressed_count,
    unknown_criteria_addressed_count: winner.unknown_criteria_addressed_count,
    dimensions_touched: winner.dimensions_touched,
    expected_completion_impact: winner.expected_completion_impact,
    factory_or_mission: winner.factory_or_mission,
    report_script: winner.report_script,
    artifact_rel_paths: winner.artifact_rel_paths,
    commands: winner.commands,
    immediate_session_pass_eligible: winner.immediate_session_pass_eligible,
    action_temporality: winner.action_temporality,
    tie_break_reason: buildTieBreakReason(winner, runnerUp),
    top_blocking_slug: topBlock.slug,
    top_blocking_summary: topBlock.summary,
    actionable_target_slugs: actionableSlugs,
    immediate_c3_delta_available: coverageSelection.applyBatch != null,
    excluded_proven_slugs: coverageSelection.excludedProvenSlugs,
  };

  const failBlockers = allBlockingCriteria(report).filter((c) => c.status === "FAIL");
  const unknownBlockers = allBlockingCriteria(report).filter((c) => c.status === "UNKNOWN");

  return {
    contract: WEDGE_COMPLETION_DIRECTOR_CONTRACT_V1,
    evaluator_contract: WEDGE_COMPLETION_EVALUATOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    artifact_write_authorized: false,
    source_command: WEDGE_COMPLETION_DIRECTOR_SOURCE_COMMAND_V1,
    evaluator_source_command: WEDGE_COMPLETION_EVALUATOR_SOURCE_COMMAND_V1,
    standard_design_doc: WEDGE_COMPLETION_STANDARD_DESIGN_DOC_V1,
    generated_at: now().toISOString(),
    wedge: report.wedge,
    overall_status: report.overall_status,
    evaluator_overall_status: report.overall_status,
    blocking_criteria_fail: failBlockers,
    blocking_criteria_unknown: unknownBlockers,
    ranked_action_candidates: ranked,
    recommended_next_action: recommended,
    why_this_action: buildWhyThisAction({ winner, ranked, report }),
    proven_facts: [
      ...report.proven_facts.slice(0, 3),
      `PROVEN: director read_only composes evaluator ${WEDGE_COMPLETION_EVALUATOR_CONTRACT_V1} without scoring mutation.`,
      `PROVEN: recommended action_id=${recommended.action_id}.`,
    ],
    unknown_facts: report.unknown_facts.slice(0, 5),
  };
}

export async function buildWedgeCompletionDirectorReportV1(
  deps: BuildWedgeCompletionDirectorDepsV1,
): Promise<WedgeCompletionDirectorReportV1> {
  const report = await buildWedgeCompletionEvaluatorReportV1(deps);
  const now = deps.now ?? (() => new Date());
  let census = deps.census ?? null;
  if (census === null) {
    census = buildAllProductSafeBuyerPathCensusV1({
      rootDir: deps.rootDir,
      now,
    });
  }
  let sprint: CoverageProductionSprintV2ReportV1 | null = deps.sprint ?? null;
  if (sprint === null && !deps.skipSprint) {
    try {
      sprint = await buildCoverageProductionSprintV2ReportV1({
        rootDir: deps.rootDir,
        now: deps.now,
        census,
      });
    } catch {
      sprint = null;
    }
  }
  return buildWedgeCompletionDirectorFromEvaluatorReportV1({
    report,
    rootDir: deps.rootDir,
    now: deps.now,
    sprint,
    census,
    skipSprint: true,
  });
}

export function buildWedgeCompletionDirectorReportUnknownV1(args: {
  generated_at: string;
  wedge: WedgeCompletionEvaluatorReportV1["wedge"];
  reason: string;
}): WedgeCompletionDirectorReportV1 {
  const emptyRecommended: WedgeCompletionDirectorRecommendedActionV1 = {
    action_id: "coverage_production_mission_c3_v1",
    primary_dimension: "coverage",
    blocking_criterion_ids: [],
    fail_criteria_addressed_count: 0,
    unknown_criteria_addressed_count: 0,
    dimensions_touched: [],
    expected_completion_impact: "UNKNOWN",
    factory_or_mission: "UNKNOWN",
    report_script: "scripts/report-wedge-completion-director-v1.ts",
    artifact_rel_paths: [],
    commands: [],
    immediate_session_pass_eligible: false,
    action_temporality: "BLOCKED_OR_UNKNOWN",
    tie_break_reason: null,
    top_blocking_slug: null,
    top_blocking_summary: null,
    actionable_target_slugs: [],
    immediate_c3_delta_available: false,
    excluded_proven_slugs: [],
  };

  return {
    contract: WEDGE_COMPLETION_DIRECTOR_CONTRACT_V1,
    evaluator_contract: WEDGE_COMPLETION_EVALUATOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    artifact_write_authorized: false,
    source_command: WEDGE_COMPLETION_DIRECTOR_SOURCE_COMMAND_V1,
    evaluator_source_command: WEDGE_COMPLETION_EVALUATOR_SOURCE_COMMAND_V1,
    standard_design_doc: WEDGE_COMPLETION_STANDARD_DESIGN_DOC_V1,
    generated_at: args.generated_at,
    wedge: args.wedge,
    overall_status: "EVALUATION_UNKNOWN",
    evaluator_overall_status: "EVALUATION_UNKNOWN",
    blocking_criteria_fail: [],
    blocking_criteria_unknown: [],
    ranked_action_candidates: [],
    recommended_next_action: {
      ...emptyRecommended,
      expected_completion_impact: `UNKNOWN: director failed — ${args.reason}`,
    },
    why_this_action: [args.reason],
    proven_facts: [],
    unknown_facts: [args.reason],
  };
}
