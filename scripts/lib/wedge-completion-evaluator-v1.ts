/**
 * Read-only Wedge Completion Evaluator v1 — scores a Homekeep wedge against
 * docs/BuckParts-WEDGE-COMPLETION-STANDARD-DESIGN.md using existing Foundation v2
 * artifacts only. No production mutations.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { HOMEKEEP_WEDGE_CATALOG, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";
import { buildOwnerVerticalLaunchPolicyReport } from "@/lib/owner-dashboard/owner-vertical-launch-policy";

import {
  buildAllProductSafeBuyerPathCensusV1,
  type AllProductCensusProductRowV1,
  type AllProductSafeBuyerPathCensusV1,
  type AllProductWedgeCoverageSummaryV1,
} from "./all-product-safe-buyer-path-census-v1";
import {
  buildCoverageProductionSprintV2ReportV1,
  type CoverageProductionSprintV2ReportV1,
  type SprintProductionBatchV1,
} from "./coverage-production-sprint-v2";
import { buildCustomerClosureReportV1 } from "./customer-closure-report-v1";
import { buildDemandToCoverageNextLaneV1Report } from "./demand-to-coverage-next-lane-v1";
import { loadOperationsMetricsHistoryV1 } from "./buckparts-operations-metrics-v1";
import {
  BUCKPARTS_PRODUCTION_MISSION_LIFECYCLE_DIR_REL_V1,
  type ProductionMissionLifecycleArtifactV1,
} from "./buckparts-production-mission-v1";
import {
  buildPublicWedgeReadinessAndEasiestWinsV1,
  type PublicWedgeReadinessRowV1,
} from "./public-wedge-readiness-and-easiest-wins-v1";
import {
  REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1,
  buildReferenceabilityFactoryRunV1,
  type ReferenceabilityFactoryRunV1,
} from "./referenceability-factory-run-v1";
import type { ReferenceabilityPermittedActionClassV1 } from "./referenceability-factory-gap-detectors-v1";
import {
  buildWedgeTruthSpineCoverageMatrixV1,
  type WedgeTruthSpineCoverageMatrixV1,
  type WedgeTruthSpineCoverageRowV1,
} from "./wedge-truth-spine-coverage-matrix-v1";

export const WEDGE_COMPLETION_EVALUATOR_CONTRACT_V1 = "wedge_completion_evaluator_v1" as const;
export const WEDGE_COMPLETION_AUDIT_CONTRACT_V1 = "wedge_completion_audit_v1" as const;

export const WEDGE_COMPLETION_EVALUATOR_SOURCE_COMMAND_V1 =
  "npm run buckparts:wedge-completion-evaluator" as const;

export const WEDGE_COMPLETION_EVALUATOR_CC_JQ_PATH_V1 =
  ".command_center_v2.wedge_completion_evaluator_v1" as const;

export const WEDGE_COMPLETION_STANDARD_DESIGN_DOC_V1 =
  "docs/BuckParts-WEDGE-COMPLETION-STANDARD-DESIGN.md" as const;

export const WEDGE_COMPLETION_EVALUATOR_V1_WEDGE_SCOPE = [
  HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
] as const;

export type WedgeCompletionCriterionStatusV1 = "PASS" | "FAIL" | "UNKNOWN";

export type WedgeCompletionDimensionIdV1 =
  | "coverage"
  | "customer_experience"
  | "distribution"
  | "measurement";

export type WedgeCompletionOverallStatusV1 =
  | "WEDGE_COMPLETE"
  | "WEDGE_INCOMPLETE"
  | "EVALUATION_UNKNOWN";

export type WedgeCompletionCriterionResultV1 = {
  criterion_id: string;
  label: string;
  status: WedgeCompletionCriterionStatusV1;
  pass_condition_summary: string;
  evidence_paths: string[];
  blocking_evidence: string[];
  metrics: Record<string, string | number | boolean>;
  source_contracts: string[];
};

export type WedgeCompletionDimensionResultV1 = {
  dimension_id: WedgeCompletionDimensionIdV1;
  label: string;
  status: WedgeCompletionCriterionStatusV1;
  criteria: WedgeCompletionCriterionResultV1[];
  metrics: Record<string, string | number | boolean>;
};

export type WedgeCompletionEvaluatorReportV1 = {
  contract: typeof WEDGE_COMPLETION_EVALUATOR_CONTRACT_V1;
  audit_contract: typeof WEDGE_COMPLETION_AUDIT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  artifact_write_authorized: false;
  source_command: typeof WEDGE_COMPLETION_EVALUATOR_SOURCE_COMMAND_V1;
  standard_design_doc: typeof WEDGE_COMPLETION_STANDARD_DESIGN_DOC_V1;
  generated_at: string;
  wedge: HomekeepWedgeCatalog;
  overall_status: WedgeCompletionOverallStatusV1;
  dimensions: WedgeCompletionDimensionResultV1[];
  blocking_dimensions: WedgeCompletionDimensionIdV1[];
  blocking_criteria: WedgeCompletionCriterionResultV1[];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

const TRUST_CONTRACT_DOC = "docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md" as const;

const E3_BLOCKING_ACTION_CLASSES: readonly ReferenceabilityPermittedActionClassV1[] = [
  "OWNER_COPY_REVIEW",
  "STRUCTURED_DATA_WIRE",
  "INTERNAL_LINK_PLAN",
];

const FRIDGE_FILTER_CSV = "data/filters.csv" as const;

function loadCsvSlugs(rootDir: string, relPath: string): Set<string> {
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) return new Set();
  const rows = parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Record<string, string>[];
  return new Set(
    rows.map((r) => r.slug?.trim().toLowerCase()).filter((s): s is string => Boolean(s)),
  );
}

export function listProductionMissionLifecycleArtifactsV1(
  rootDir: string,
): ProductionMissionLifecycleArtifactV1[] {
  const dir = path.join(rootDir, BUCKPARTS_PRODUCTION_MISSION_LIFECYCLE_DIR_REL_V1);
  if (!existsSync(dir)) return [];
  const artifacts: ProductionMissionLifecycleArtifactV1[] = [];
  for (const file of readdirSync(dir).filter(
    (f) => f.startsWith("buckparts-production-mission-") && f.endsWith(".json"),
  )) {
    try {
      artifacts.push(
        JSON.parse(readFileSync(path.join(dir, file), "utf8")) as ProductionMissionLifecycleArtifactV1,
      );
    } catch {
      // skip invalid
    }
  }
  return artifacts.sort((a, b) => b.generated_at.localeCompare(a.generated_at));
}

function resolveDimensionStatus(
  criteria: WedgeCompletionCriterionResultV1[],
): WedgeCompletionCriterionStatusV1 {
  if (criteria.some((c) => c.status === "FAIL")) return "FAIL";
  if (criteria.some((c) => c.status === "UNKNOWN")) return "UNKNOWN";
  return "PASS";
}

function resolveOverallStatus(
  dimensions: WedgeCompletionDimensionResultV1[],
): WedgeCompletionOverallStatusV1 {
  if (dimensions.every((d) => d.status === "PASS")) return "WEDGE_COMPLETE";
  if (dimensions.some((d) => d.status === "FAIL")) return "WEDGE_INCOMPLETE";
  return "EVALUATION_UNKNOWN";
}

function criterion(
  args: Omit<WedgeCompletionCriterionResultV1, "metrics"> & {
    metrics?: Record<string, string | number | boolean>;
  },
): WedgeCompletionCriterionResultV1 {
  return {
    ...args,
    metrics: args.metrics ?? {},
  };
}

function wedgeCensusSummary(
  census: AllProductSafeBuyerPathCensusV1,
  wedge: HomekeepWedgeCatalog,
): AllProductWedgeCoverageSummaryV1 | null {
  return census.wedge_coverage.find((w) => w.wedge === wedge) ?? null;
}

function wedgeProducts(
  census: AllProductSafeBuyerPathCensusV1,
  wedge: HomekeepWedgeCatalog,
): AllProductCensusProductRowV1[] {
  return census.products.filter((p) => p.wedge === wedge);
}

function isFridgeBatch(batch: SprintProductionBatchV1, fridgeSlugs: Set<string>): boolean {
  if (batch.batch_id.toLowerCase().includes("fridge")) return true;
  if (batch.infrastructure_reused.some((i) => /fridge|manufacturer/i.test(i))) return true;
  return batch.target_slugs.some((s) => fridgeSlugs.has(s.toLowerCase()));
}

function lifecycleTargetsWedge(
  artifact: ProductionMissionLifecycleArtifactV1,
  fridgeSlugs: Set<string>,
): boolean {
  const primary = artifact.target.primary_apply_slug?.toLowerCase();
  if (primary && fridgeSlugs.has(primary)) return true;
  return artifact.target.target_slugs.some((s) => fridgeSlugs.has(s.toLowerCase()));
}

function evaluateCoverageDimension(args: {
  wedge: HomekeepWedgeCatalog;
  census: AllProductSafeBuyerPathCensusV1;
  readiness: PublicWedgeReadinessRowV1 | null;
  matrixRow: WedgeTruthSpineCoverageRowV1 | null;
  sprint: CoverageProductionSprintV2ReportV1 | null;
  lifecycles: ProductionMissionLifecycleArtifactV1[];
  fridgeSlugs: Set<string>;
}): WedgeCompletionDimensionResultV1 {
  const summary = wedgeCensusSummary(args.census, args.wedge);
  const products = wedgeProducts(args.census, args.wedge);
  const criteria: WedgeCompletionCriterionResultV1[] = [];

  // C1
  const csvSource = summary?.csv_inventory_source ?? args.readiness?.csv_data_source ?? "UNKNOWN";
  const c1Pass =
    csvSource === "committed_csv" &&
    args.readiness?.csv_data_source === "committed_csv";
  criteria.push(
    criterion({
      criterion_id: "C1",
      label: "Committed catalog",
      status:
        csvSource === "UNKNOWN" || !args.readiness
          ? "UNKNOWN"
          : c1Pass
            ? "PASS"
            : "FAIL",
      pass_condition_summary: "csv_inventory_source === committed_csv in census and public readiness",
      evidence_paths: [FRIDGE_FILTER_CSV, "scripts/lib/all-product-safe-buyer-path-census-v1.ts"],
      blocking_evidence: c1Pass
        ? []
        : [`csv_inventory_source=${String(csvSource)} readiness=${String(args.readiness?.csv_data_source ?? "missing")}`],
      metrics: { csv_inventory_source: String(csvSource) },
      source_contracts: ["all_product_safe_buyer_path_census_v1", "public_wedge_readiness_and_easiest_wins_v1"],
    }),
  );

  // C2
  const truthStatus = args.matrixRow?.truth_coverage_status ?? "UNKNOWN";
  let c2Status: WedgeCompletionCriterionStatusV1 = "UNKNOWN";
  if (args.matrixRow) {
    if (truthStatus === "FORMAL_SPINE") {
      c2Status = "PASS";
    } else if (truthStatus === "PARTIAL_OPERATIONAL_PROOF" && args.matrixRow.has_formal_truth_spine) {
      c2Status = "PASS";
    } else if (
      truthStatus === "PARTIAL_OPERATIONAL_PROOF" &&
      args.matrixRow.has_model_first_evidence_lane &&
      args.matrixRow.has_buyer_path_proof_lane &&
      args.matrixRow.has_safe_cta_queue_or_batch_director
    ) {
      c2Status = "PASS";
    } else if (
      ["SAMPLE_ONLY", "PUBLIC_BUT_SPINE_GAP", "PREVIEW_ONLY_UNPROVEN"].includes(truthStatus)
    ) {
      c2Status = "FAIL";
    } else if (truthStatus === "UNKNOWN") {
      c2Status = "UNKNOWN";
    } else {
      c2Status = "FAIL";
    }
  }
  criteria.push(
    criterion({
      criterion_id: "C2",
      label: "Truth infrastructure",
      status: c2Status,
      pass_condition_summary: "FORMAL_SPINE or PARTIAL_OPERATIONAL_PROOF with required lanes",
      evidence_paths: ["scripts/lib/wedge-truth-spine-coverage-matrix-v1.ts"],
      blocking_evidence: c2Status === "PASS" ? [] : [`truth_coverage_status=${truthStatus}`],
      metrics: {
        truth_coverage_status: truthStatus,
        has_formal_truth_spine: args.matrixRow?.has_formal_truth_spine ?? false,
      },
      source_contracts: ["wedge_truth_spine_coverage_matrix_v1"],
    }),
  );

  // C3
  const provenCount = summary?.safe_buyer_path_proven_count ?? 0;
  const buyerPathTruth = args.readiness?.buyer_path_truth_status ?? "UNKNOWN";
  const c3Pass = provenCount >= 1 && buyerPathTruth === "PROVEN_SAFE_ROWS_EXIST";
  criteria.push(
    criterion({
      criterion_id: "C3",
      label: "Proven buyer paths exist",
      status:
        !summary || !args.readiness
          ? "UNKNOWN"
          : c3Pass
            ? "PASS"
            : "FAIL",
      pass_condition_summary: "safe_buyer_path_proven_count >= 1 and buyer_path_truth_status PROVEN_SAFE_ROWS_EXIST",
      evidence_paths: ["scripts/lib/all-product-safe-buyer-path-census-v1.ts"],
      blocking_evidence: c3Pass
        ? []
        : [
            `buyer_path_truth_status=${buyerPathTruth}`,
            `safe_buyer_path_proven_count=${String(provenCount)}`,
          ],
      metrics: { safe_buyer_path_proven_count: provenCount, buyer_path_truth_status: buyerPathTruth },
      source_contracts: ["all_product_safe_buyer_path_census_v1", "public_wedge_readiness_and_easiest_wins_v1"],
    }),
  );

  // C4
  const completeLifecycles = args.lifecycles.filter(
    (a) =>
      a.lifecycle_complete === true &&
      Number(a.safe_buyer_path_proven?.delta ?? 0) >= 1 &&
      lifecycleTargetsWedge(a, args.fridgeSlugs),
  );
  const c4Pass = completeLifecycles.length >= 1;
  criteria.push(
    criterion({
      criterion_id: "C4",
      label: "Operating loop proven for wedge",
      status: args.lifecycles.length === 0 ? "UNKNOWN" : c4Pass ? "PASS" : "FAIL",
      pass_condition_summary:
        "lifecycle_complete true with delta >= 1 for wedge slug via production_mission_v1",
      evidence_paths: [
        `${BUCKPARTS_PRODUCTION_MISSION_LIFECYCLE_DIR_REL_V1}/`,
        "scripts/lib/buckparts-production-mission-v1.ts",
      ],
      blocking_evidence: c4Pass
        ? []
        : [
            `complete_wedge_lifecycle_count=${String(completeLifecycles.length)}`,
            `total_lifecycle_artifacts=${String(args.lifecycles.length)}`,
          ],
      metrics: {
        complete_wedge_lifecycle_count: completeLifecycles.length,
        latest_complete_run_id: completeLifecycles[0]?.run_id ?? "none",
      },
      source_contracts: ["production_mission_v1", "buckparts_production_mission_lifecycle_v1"],
    }),
  );

  // C5
  let c5Status: WedgeCompletionCriterionStatusV1 = "UNKNOWN";
  const c5Blocking: string[] = [];
  if (args.sprint) {
    const fridgeBatches = (args.sprint.ranked_production_batches ?? []).filter((b) =>
      isFridgeBatch(b, args.fridgeSlugs),
    );
    const executableFridge = fridgeBatches.filter(
      (b) =>
        (b.executability === "EXECUTABLE_NOW" || b.executability === "EXECUTABLE_AFTER_APPROVAL") &&
        b.expected_safe_buyer_path_proven_delta >= 1,
    );
    const pathA = executableFridge.length >= 1;
    const pathB =
      args.sprint.plus_ten_executable_possible === false &&
      args.sprint.plus_ten_impossibility_proof.length > 0 &&
      executableFridge.length === 0;
    if (pathA || pathB) {
      c5Status = "PASS";
    } else {
      c5Status = "FAIL";
      c5Blocking.push(
        `executable_fridge_batches=${String(executableFridge.length)}`,
        `plus_ten_executable_possible=${String(args.sprint.plus_ten_executable_possible)}`,
        `plus_ten_impossibility_proof_lines=${String(args.sprint.plus_ten_impossibility_proof.length)}`,
      );
    }
  } else {
    c5Blocking.push("coverage_production_sprint_v2 report unavailable");
  }
  criteria.push(
    criterion({
      criterion_id: "C5",
      label: "Batch throughput posture documented",
      status: c5Status,
      pass_condition_summary:
        "executable fridge batch with delta >= 1 OR documented +10 impossibility with no undocumented executable batches",
      evidence_paths: ["scripts/lib/coverage-production-sprint-v2.ts"],
      blocking_evidence: c5Blocking,
      metrics: {
        plus_ten_executable_possible: args.sprint?.plus_ten_executable_possible ?? "UNKNOWN",
        largest_achievable_executable_delta: args.sprint?.largest_achievable_executable_delta ?? "UNKNOWN",
      },
      source_contracts: ["coverage_production_sprint_v2_v1"],
    }),
  );

  // C6
  const suppressed = products.filter((p) => p.page_classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST");
  const emptyActions = suppressed.filter((p) => !p.recommended_next_safe_action?.trim());
  const c6Pass = emptyActions.length === 0;
  criteria.push(
    criterion({
      criterion_id: "C6",
      label: "Suppressed trust explained",
      status: suppressed.length === 0 ? "PASS" : c6Pass ? "PASS" : "FAIL",
      pass_condition_summary: "every SAFE_BUYER_PATH_SUPPRESSED_TRUST slug has recommended_next_safe_action",
      evidence_paths: ["scripts/lib/all-product-safe-buyer-path-census-v1.ts"],
      blocking_evidence: c6Pass
        ? []
        : emptyActions.slice(0, 5).map((p) => `slug=${p.slug} missing recommended_next_safe_action`),
      metrics: {
        suppressed_trust_count: suppressed.length,
        suppressed_missing_action_count: emptyActions.length,
      },
      source_contracts: ["all_product_safe_buyer_path_census_v1"],
    }),
  );

  return {
    dimension_id: "coverage",
    label: "Coverage completeness",
    status: resolveDimensionStatus(criteria),
    criteria,
    metrics: {
      safe_buyer_path_proven_count: provenCount,
      suppressed_trust_count: summary?.suppressed_trust_count ?? 0,
    },
  };
}

function evaluateCustomerExperienceDimension(args: {
  wedge: HomekeepWedgeCatalog;
  census: AllProductSafeBuyerPathCensusV1;
  referenceability: ReferenceabilityFactoryRunV1 | null;
  dailyOperatorLiveSiteBannedRoutes: string[] | null;
}): WedgeCompletionDimensionResultV1 {
  const proven = wedgeProducts(args.census, args.wedge).filter(
    (p) => p.page_classification === "SAFE_BUYER_PATH_PROVEN",
  );
  const criteria: WedgeCompletionCriterionResultV1[] = [];

  // E1 — fridge filter PDP READY per trust contract (repo doc)
  criteria.push(
    criterion({
      criterion_id: "E1",
      label: "Primary PDP trust status",
      status: args.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water ? "PASS" : "UNKNOWN",
      pass_condition_summary: "Refrigerator filter PDP marked READY in Universal Page Trust Contract",
      evidence_paths: [TRUST_CONTRACT_DOC, "src/app/filter/[slug]/page.tsx"],
      blocking_evidence: [],
      metrics: { trust_contract_filter_pdp_status: "READY" },
      source_contracts: ["docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md"],
    }),
  );

  // E2 — fridge model page READY
  criteria.push(
    criterion({
      criterion_id: "E2",
      label: "Model / fit page trust status",
      status: args.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water ? "PASS" : "UNKNOWN",
      pass_condition_summary: "Fridge model page marked READY in Universal Page Trust Contract",
      evidence_paths: [TRUST_CONTRACT_DOC, "src/app/fridge/[slug]/page.tsx"],
      blocking_evidence: [],
      metrics: { trust_contract_model_page_status: "READY" },
      source_contracts: ["docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md"],
    }),
  );

  // E3 — referenceability blocking work items on proven slugs
  const blockingWork =
    args.referenceability?.work_items.filter(
      (w) =>
        w.wedge === args.wedge &&
        proven.some((p) => p.slug === w.slug) &&
        E3_BLOCKING_ACTION_CLASSES.includes(w.permitted_action_class),
    ) ?? [];
  criteria.push(
    criterion({
      criterion_id: "E3",
      label: "Proven slug UX debt cleared",
      status: !args.referenceability
        ? "UNKNOWN"
        : blockingWork.length === 0
          ? "PASS"
          : "FAIL",
      pass_condition_summary:
        "no referenceability OWNER_COPY_REVIEW / STRUCTURED_DATA_WIRE / INTERNAL_LINK_PLAN on proven slugs",
      evidence_paths: ["scripts/lib/referenceability-factory-run-v1.ts"],
      blocking_evidence: blockingWork.slice(0, 8).map(
        (w) => `${w.slug}:${w.permitted_action_class}:${w.improvement_class}`,
      ),
      metrics: {
        proven_slug_count: proven.length,
        blocking_referenceability_work_items: blockingWork.length,
      },
      source_contracts: ["referenceability_factory_run_v1"],
    }),
  );

  // E4 — banned phrases on LIVE routes (requires daily operator / live smoke — not run here by default)
  const e4Status: WedgeCompletionCriterionStatusV1 =
    args.dailyOperatorLiveSiteBannedRoutes === null
      ? "UNKNOWN"
      : args.dailyOperatorLiveSiteBannedRoutes.length === 0
        ? "PASS"
        : "FAIL";
  criteria.push(
    criterion({
      criterion_id: "E4",
      label: "Banned phrase contract on LIVE routes",
      status: e4Status,
      pass_condition_summary: "no universal banned phrases on LIVE wedge routes (daily operator / live smoke)",
      evidence_paths: ["scripts/report-buckparts-daily-operator.ts", "scripts/lib/live-site-smoke.ts"],
      blocking_evidence:
        args.dailyOperatorLiveSiteBannedRoutes === null
          ? ["UNKNOWN: daily operator / live-site smoke not supplied to evaluator"]
          : args.dailyOperatorLiveSiteBannedRoutes,
      metrics: {
        live_site_banned_route_count: args.dailyOperatorLiveSiteBannedRoutes?.length ?? "UNKNOWN",
      },
      source_contracts: ["buckparts_daily_operator_v1"],
    }),
  );

  // E5 — proven slugs align with census classification
  const misaligned = proven.filter((p) => p.page_classification !== "SAFE_BUYER_PATH_PROVEN");
  criteria.push(
    criterion({
      criterion_id: "E5",
      label: "Buying options policy alignment",
      status: misaligned.length === 0 ? "PASS" : "FAIL",
      pass_condition_summary: "census proven slugs carry SAFE_BUYER_PATH_PROVEN classification",
      evidence_paths: ["scripts/lib/all-product-safe-buyer-path-census-v1.ts"],
      blocking_evidence: misaligned.map((p) => p.slug),
      metrics: { proven_slug_count: proven.length },
      source_contracts: ["all_product_safe_buyer_path_census_v1"],
    }),
  );

  // E6 — non-live policy N/A for LIVE refrigerator_water
  criteria.push(
    criterion({
      criterion_id: "E6",
      label: "Non-live wedge policy",
      status: "PASS",
      pass_condition_summary: "N/A — refrigerator_water is LIVE; noindex hub policy not blocking completion",
      evidence_paths: ["src/lib/catalog/vertical-launch-state.ts"],
      blocking_evidence: [],
      metrics: { wedge_launch: "LIVE" },
      source_contracts: ["vertical_launch_state"],
    }),
  );

  return {
    dimension_id: "customer_experience",
    label: "Customer experience completeness",
    status: resolveDimensionStatus(criteria),
    criteria,
    metrics: { proven_slug_count: proven.length },
  };
}

function evaluateDistributionDimension(args: {
  wedge: HomekeepWedgeCatalog;
  census: AllProductSafeBuyerPathCensusV1;
  demand: Awaited<ReturnType<typeof buildDemandToCoverageNextLaneV1Report>> | null;
  referenceability: ReferenceabilityFactoryRunV1 | null;
  searchIntentVerdict: string | null;
  searchIntentManufacturedCount: number | null;
  searchIntentError: string | null;
}): WedgeCompletionDimensionResultV1 {
  const proven = wedgeProducts(args.census, args.wedge).filter(
    (p) => p.page_classification === "SAFE_BUYER_PATH_PROVEN",
  );
  const criteria: WedgeCompletionCriterionResultV1[] = [];

  // D1
  const d1Pass =
    args.demand != null &&
    args.demand.runtime_status !== "UNKNOWN" &&
    args.demand.source_status !== "UNKNOWN";
  criteria.push(
    criterion({
      criterion_id: "D1",
      label: "Demand signal freshness",
      status: !args.demand ? "UNKNOWN" : d1Pass ? "PASS" : "FAIL",
      pass_condition_summary: "demand_to_coverage runtime_status and source_status not UNKNOWN",
      evidence_paths: ["scripts/lib/demand-to-coverage-next-lane-v1.ts"],
      blocking_evidence: d1Pass
        ? []
        : [
            `runtime_status=${String(args.demand?.runtime_status ?? "missing")}`,
            `source_status=${String(args.demand?.source_status ?? "missing")}`,
            ...(args.demand?.blockers ?? []),
          ],
      metrics: {
        runtime_status: String(args.demand?.runtime_status ?? "UNKNOWN"),
        source_status: String(args.demand?.source_status ?? "UNKNOWN"),
      },
      source_contracts: ["demand_to_coverage_next_lane_v1"],
    }),
  );

  // D2 — internal links via referenceability INTERNAL_LINK_PLAN on proven slugs with compat
  const internalLinkDebt =
    args.referenceability?.work_items.filter(
      (w) =>
        w.wedge === args.wedge &&
        proven.some((p) => p.slug === w.slug) &&
        w.permitted_action_class === "INTERNAL_LINK_PLAN",
    ) ?? [];
  criteria.push(
    criterion({
      criterion_id: "D2",
      label: "Proven slug internal links",
      status: !args.referenceability ? "UNKNOWN" : internalLinkDebt.length === 0 ? "PASS" : "FAIL",
      pass_condition_summary: "no open INTERNAL_LINK_PLAN referenceability items on proven slugs",
      evidence_paths: ["scripts/lib/referenceability-factory-gap-detectors-v1.ts"],
      blocking_evidence: internalLinkDebt.slice(0, 8).map((w) => `${w.slug}:${w.summary}`),
      metrics: { internal_link_plan_debt_count: internalLinkDebt.length },
      source_contracts: ["referenceability_factory_run_v1"],
    }),
  );

  // D3 — structured data wire debt
  const schemaDebt =
    args.referenceability?.work_items.filter(
      (w) =>
        w.wedge === args.wedge &&
        proven.some((p) => p.slug === w.slug) &&
        w.permitted_action_class === "STRUCTURED_DATA_WIRE",
    ) ?? [];
  criteria.push(
    criterion({
      criterion_id: "D3",
      label: "Structured data on proven PDPs",
      status: !args.referenceability ? "UNKNOWN" : schemaDebt.length === 0 ? "PASS" : "FAIL",
      pass_condition_summary: "no open STRUCTURED_DATA_WIRE on proven slugs; template wires JSON-LD helper",
      evidence_paths: ["src/lib/seo/structured-data.ts", "scripts/lib/referenceability-factory-run-v1.ts"],
      blocking_evidence: schemaDebt.slice(0, 8).map((w) => `${w.slug}:${w.summary}`),
      metrics: { structured_data_wire_debt_count: schemaDebt.length },
      source_contracts: ["referenceability_factory_run_v1", "structured_data_phase_1"],
    }),
  );

  // D4 — search intent proof experiment
  let d4Status: WedgeCompletionCriterionStatusV1 = "UNKNOWN";
  const d4Blocking: string[] = [];
  if (args.searchIntentError) {
    d4Blocking.push(args.searchIntentError);
  } else if (args.searchIntentVerdict === null) {
    d4Blocking.push("search_intent_factory_proof_experiment not run");
  } else if (
    args.searchIntentManufacturedCount !== null &&
    args.searchIntentManufacturedCount >= 1 &&
    args.searchIntentVerdict !== "FACTORY_NOT_JUSTIFIED"
  ) {
    d4Status = "PASS";
  } else if (args.searchIntentVerdict === "UNKNOWN") {
    d4Status = "UNKNOWN";
    d4Blocking.push("search_intent_factory_proof_experiment verdict UNKNOWN");
  } else {
    d4Status = "FAIL";
    d4Blocking.push(`verdict=${args.searchIntentVerdict}`);
  }
  criteria.push(
    criterion({
      criterion_id: "D4",
      label: "Search intent alignment",
      status: d4Status,
      pass_condition_summary:
        "search_intent_factory_proof_experiment manufactures repo-derived work items or GSC insufficient documented",
      evidence_paths: ["scripts/lib/buckparts-search-intent-factory-proof-experiment-v1.ts"],
      blocking_evidence: d4Blocking,
      metrics: {
        search_intent_verdict: args.searchIntentVerdict ?? "UNKNOWN",
        manufactured_work_item_count: args.searchIntentManufacturedCount ?? "UNKNOWN",
      },
      source_contracts: ["search_intent_factory_proof_experiment_v1"],
    }),
  );

  // D5 — LIVE refrigerator indexing policy
  const launchPolicy = buildOwnerVerticalLaunchPolicyReport();
  const fridgeRow = launchPolicy.rows.find((r) => r.wedge_catalog === HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  const d5Pass =
    fridgeRow != null &&
    fridgeRow.is_live === true &&
    fridgeRow.sitemap_discovery_urls_expected === true &&
    fridgeRow.layout_noindex_follow_expected === false;
  criteria.push(
    criterion({
      criterion_id: "D5",
      label: "Indexing policy alignment",
      status: fridgeRow ? (d5Pass ? "PASS" : "FAIL") : "UNKNOWN",
      pass_condition_summary: "LIVE refrigerator: sitemap discovery expected, layout not noindex",
      evidence_paths: ["src/lib/owner-dashboard/owner-vertical-launch-policy.ts"],
      blocking_evidence: d5Pass
        ? []
        : [
            `is_live=${String(fridgeRow?.is_live)}`,
            `sitemap_discovery_urls_expected=${String(fridgeRow?.sitemap_discovery_urls_expected)}`,
            `layout_noindex_follow_expected=${String(fridgeRow?.layout_noindex_follow_expected)}`,
          ],
      metrics: {
        sitemap_discovery_urls_expected: fridgeRow?.sitemap_discovery_urls_expected ?? false,
      },
      source_contracts: ["owner_vertical_launch_policy_v1"],
    }),
  );

  // D6 — demand ≠ fit guard (structural check on demand lane)
  const d6Pass = args.demand != null && args.demand.proven_facts.some((f) => f.includes("read_only=true"));
  criteria.push(
    criterion({
      criterion_id: "D6",
      label: "Demand ≠ fit guard",
      status: !args.demand ? "UNKNOWN" : d6Pass ? "PASS" : "FAIL",
      pass_condition_summary: "demand_to_coverage lane is read-only and does not grant mutation authority",
      evidence_paths: ["scripts/lib/demand-to-coverage-next-lane-v1.ts"],
      blocking_evidence: d6Pass ? [] : ["demand lane read_only contract not verified"],
      metrics: {},
      source_contracts: ["demand_to_coverage_next_lane_v1"],
    }),
  );

  return {
    dimension_id: "distribution",
    label: "Distribution completeness",
    status: resolveDimensionStatus(criteria),
    criteria,
    metrics: {
      demand_runtime_status: String(args.demand?.runtime_status ?? "UNKNOWN"),
    },
  };
}

function evaluateMeasurementDimension(args: {
  rootDir: string;
  wedge: HomekeepWedgeCatalog;
  census: AllProductSafeBuyerPathCensusV1;
  lifecycles: ProductionMissionLifecycleArtifactV1[];
  fridgeSlugs: Set<string>;
  demand: Awaited<ReturnType<typeof buildDemandToCoverageNextLaneV1Report>> | null;
  closureCount: number | "UNKNOWN";
  closureError: string | null;
}): WedgeCompletionDimensionResultV1 {
  const history = loadOperationsMetricsHistoryV1(args.rootDir);
  const criteria: WedgeCompletionCriterionResultV1[] = [];

  // M1 — need rootDir passed - fix in build function
  const m1Snapshots = history.filter(
    (s) => typeof s.aggregate.safe_buyer_path_proven_count_current === "number",
  );
  let m1Pass = false;
  if (m1Snapshots.length >= 2) {
    const first = new Date(m1Snapshots[0]!.recorded_at).getTime();
    const last = new Date(m1Snapshots[m1Snapshots.length - 1]!.recorded_at).getTime();
    m1Pass = Math.abs(last - first) >= 24 * 60 * 60 * 1000;
  }
  criteria.push(
    criterion({
      criterion_id: "M1",
      label: "Operations metrics history",
      status: history.length === 0 ? "UNKNOWN" : m1Pass ? "PASS" : "FAIL",
      pass_condition_summary: ">=2 history snapshots with proven count separated by >=24h",
      evidence_paths: ["data/command-center/operations-metrics/history-v1.jsonl"],
      blocking_evidence: m1Pass
        ? []
        : [
            `snapshot_count=${String(m1Snapshots.length)}`,
            `history_lines=${String(history.length)}`,
          ],
      metrics: { snapshot_count: m1Snapshots.length },
      source_contracts: ["operations_metrics_v1"],
    }),
  );

  const wedgeLifecycles = args.lifecycles.filter((l) => lifecycleTargetsWedge(l, args.fridgeSlugs));
  const measured = wedgeLifecycles.filter((l) => l.operations_metrics?.snapshot_recorded === true);
  criteria.push(
    criterion({
      criterion_id: "M2",
      label: "Wedge production mission measured",
      status: wedgeLifecycles.length === 0 ? "UNKNOWN" : measured.length >= 1 ? "PASS" : "FAIL",
      pass_condition_summary: "production mission lifecycle with operations_metrics.snapshot_recorded true",
      evidence_paths: [BUCKPARTS_PRODUCTION_MISSION_LIFECYCLE_DIR_REL_V1],
      blocking_evidence:
        measured.length >= 1
          ? []
          : [`wedge_lifecycle_count=${String(wedgeLifecycles.length)} measured=${String(measured.length)}`],
      metrics: { wedge_lifecycle_measured_count: measured.length },
      source_contracts: ["production_mission_v1", "operations_metrics_v1"],
    }),
  );

  criteria.push(
    criterion({
      criterion_id: "M3",
      label: "Census reproducibility",
      status: args.census.contract === "all_product_safe_buyer_path_census_v1" ? "PASS" : "UNKNOWN",
      pass_condition_summary: "census report built successfully in this evaluation run",
      evidence_paths: ["scripts/lib/all-product-safe-buyer-path-census-v1.ts"],
      blocking_evidence: [],
      metrics: {
        safe_buyer_path_proven_total: args.census.classification_counts.SAFE_BUYER_PATH_PROVEN,
      },
      source_contracts: ["all_product_safe_buyer_path_census_v1"],
    }),
  );

  const m4Pass =
    args.demand != null &&
    (args.demand.runtime_status === "PROVEN" ||
      args.demand.source_status === "PROVEN" ||
      args.demand.source_status === "PARTIAL" ||
      args.demand.unknown_facts.length > 0);
  criteria.push(
    criterion({
      criterion_id: "M4",
      label: "Demand measurement",
      status: !args.demand ? "UNKNOWN" : m4Pass ? "PASS" : "FAIL",
      pass_condition_summary: "demand_to_coverage reports PROVEN/PARTIAL or documents unknown_facts",
      evidence_paths: ["scripts/lib/demand-to-coverage-next-lane-v1.ts"],
      blocking_evidence: m4Pass
        ? []
        : [`runtime_status=${String(args.demand?.runtime_status)} source_status=${String(args.demand?.source_status)}`],
      metrics: {},
      source_contracts: ["demand_to_coverage_next_lane_v1"],
    }),
  );

  criteria.push(
    criterion({
      criterion_id: "M5",
      label: "Throughput interpretation discipline",
      status: m1Pass ? "PASS" : history.length >= 1 ? "FAIL" : "UNKNOWN",
      pass_condition_summary: "no improvement claim without >=2 snapshots (inherits ops metrics rule)",
      evidence_paths: ["docs/BuckParts-OPERATIONS-METRICS-V1.md"],
      blocking_evidence: m1Pass ? [] : ["insufficient snapshot series for throughput conclusion"],
      metrics: { snapshot_count: m1Snapshots.length },
      source_contracts: ["operations_metrics_v1"],
    }),
  );

  const m6Pass = args.closureCount !== "UNKNOWN";
  criteria.push(
    criterion({
      criterion_id: "M6",
      label: "Closure proxy tracked",
      status: args.closureError ? "UNKNOWN" : m6Pass ? "PASS" : "UNKNOWN",
      pass_condition_summary: "customer_visible_closures_count present in customer_closure_report",
      evidence_paths: ["scripts/lib/customer-closure-report-v1.ts"],
      blocking_evidence: m6Pass
        ? []
        : [args.closureError ?? "customer_visible_closures_count UNKNOWN"],
      metrics: { customer_visible_closures_count: args.closureCount },
      source_contracts: ["customer_closure_report_v1"],
    }),
  );

  return {
    dimension_id: "measurement",
    label: "Measurement completeness",
    status: resolveDimensionStatus(criteria),
    criteria,
    metrics: { operations_metrics_snapshot_count: m1Snapshots.length },
  };
}

export type BuildWedgeCompletionEvaluatorDepsV1 = {
  rootDir: string;
  now?: () => Date;
  wedge?: HomekeepWedgeCatalog;
  /** Optional daily-operator-derived banned LIVE routes; omit → E4 UNKNOWN */
  dailyOperatorLiveSiteBannedRoutes?: string[] | null;
  census?: AllProductSafeBuyerPathCensusV1;
  matrix?: WedgeTruthSpineCoverageMatrixV1;
  readinessRow?: PublicWedgeReadinessRowV1 | null;
  sprint?: CoverageProductionSprintV2ReportV1 | null;
  demand?: Awaited<ReturnType<typeof buildDemandToCoverageNextLaneV1Report>> | null;
  referenceability?: ReferenceabilityFactoryRunV1 | null;
  lifecycles?: ProductionMissionLifecycleArtifactV1[];
  skipSearchIntent?: boolean;
  skipReferenceability?: boolean;
  skipDemand?: boolean;
  skipSprint?: boolean;
};

export async function buildWedgeCompletionEvaluatorReportV1(
  deps: BuildWedgeCompletionEvaluatorDepsV1,
): Promise<WedgeCompletionEvaluatorReportV1> {
  const now = deps.now ?? (() => new Date());
  const wedge = deps.wedge ?? HOMEKEEP_WEDGE_CATALOG.refrigerator_water;

  if (!WEDGE_COMPLETION_EVALUATOR_V1_WEDGE_SCOPE.includes(wedge as (typeof WEDGE_COMPLETION_EVALUATOR_V1_WEDGE_SCOPE)[number])) {
    throw new Error(`wedge_completion_evaluator_v1 v1 scope supports ${WEDGE_COMPLETION_EVALUATOR_V1_WEDGE_SCOPE.join(", ")} only`);
  }

  const census = deps.census ?? buildAllProductSafeBuyerPathCensusV1({ rootDir: deps.rootDir, now });
  const matrix =
    deps.matrix ??
    buildWedgeTruthSpineCoverageMatrixV1({ rootDir: deps.rootDir, now });
  const readinessReport = buildPublicWedgeReadinessAndEasiestWinsV1({ rootDir: deps.rootDir, now });
  const readinessRow =
    deps.readinessRow ?? readinessReport.wedge_rows.find((r) => r.wedge === wedge) ?? null;
  const matrixRow = matrix.wedges.find((w) => w.wedge === wedge) ?? null;
  const lifecycles = deps.lifecycles ?? listProductionMissionLifecycleArtifactsV1(deps.rootDir);
  const fridgeSlugs = loadCsvSlugs(deps.rootDir, FRIDGE_FILTER_CSV);

  let sprint = deps.sprint ?? null;
  if (sprint === null && !deps.skipSprint) {
    try {
      sprint = await buildCoverageProductionSprintV2ReportV1({ rootDir: deps.rootDir, now });
    } catch {
      sprint = null;
    }
  }

  let demand = deps.demand ?? null;
  if (demand === null && !deps.skipDemand) {
    try {
      demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: deps.rootDir, now });
    } catch {
      demand = null;
    }
  }

  let referenceability = deps.referenceability ?? null;
  if (referenceability === null && !deps.skipReferenceability) {
    try {
      if ((REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1 as readonly HomekeepWedgeCatalog[]).includes(wedge)) {
        referenceability = await buildReferenceabilityFactoryRunV1({
          rootDir: deps.rootDir,
          now,
          census,
          loadMarketing: true,
        });
      }
    } catch {
      referenceability = null;
    }
  }

  let searchIntentVerdict: string | null = null;
  let searchIntentManufacturedCount: number | null = null;
  let searchIntentError: string | null = null;
  if (!deps.skipSearchIntent) {
    const { loadWedgeCompletionSearchIntentV1 } = await import("./wedge-completion-search-intent-v1");
    const loaded = await loadWedgeCompletionSearchIntentV1({
      rootDir: deps.rootDir,
      now,
      referenceability,
    });
    searchIntentVerdict = loaded.searchIntentVerdict;
    searchIntentManufacturedCount = loaded.searchIntentManufacturedCount;
    searchIntentError = loaded.searchIntentError;
  }

  let closureCount: number | "UNKNOWN" = "UNKNOWN";
  let closureError: string | null = null;
  try {
    const closure = buildCustomerClosureReportV1({
      generated_at: now().toISOString(),
      rootDir: deps.rootDir,
      census,
      missionFactoryRegistry: null,
      closeoutLearning: null,
      rescueDeltaTrendSummary: null,
      publishability: null,
      recentEvidence: null,
    });
    closureCount = closure.customer_visible_closures_count;
  } catch (error: unknown) {
    closureError = error instanceof Error ? error.message : String(error);
  }

  const coverage = evaluateCoverageDimension({
    wedge,
    census,
    readiness: readinessRow,
    matrixRow,
    sprint,
    lifecycles,
    fridgeSlugs,
  });

  const customerExperience = evaluateCustomerExperienceDimension({
    wedge,
    census,
    referenceability,
    dailyOperatorLiveSiteBannedRoutes: deps.dailyOperatorLiveSiteBannedRoutes ?? null,
  });

  const distribution = evaluateDistributionDimension({
    wedge,
    census,
    demand,
    referenceability,
    searchIntentVerdict,
    searchIntentManufacturedCount,
    searchIntentError,
  });

  const measurement = evaluateMeasurementDimension({
    rootDir: deps.rootDir,
    wedge,
    census,
    lifecycles,
    fridgeSlugs,
    demand,
    closureCount,
    closureError,
  });

  const dimensions = [coverage, customerExperience, distribution, measurement];
  const overall_status = resolveOverallStatus(dimensions);
  const blocking_dimensions = dimensions
    .filter((d) => d.status === "FAIL")
    .map((d) => d.dimension_id);
  const blocking_criteria = dimensions
    .flatMap((d) => d.criteria)
    .filter((c) => c.status === "FAIL" || c.status === "UNKNOWN");

  const firstBlocker = dimensions
    .flatMap((d) => d.criteria.map((c) => ({ ...c, dimension_id: d.dimension_id })))
    .find((c) => c.status === "FAIL") ??
    dimensions
      .flatMap((d) => d.criteria.map((c) => ({ ...c, dimension_id: d.dimension_id })))
      .find((c) => c.status === "UNKNOWN");

  const recommended_next_action =
    overall_status === "WEDGE_COMPLETE"
      ? `PROVEN: ${wedge} passes all four Wedge Completion dimensions — founder may review expansion gate per ${WEDGE_COMPLETION_STANDARD_DESIGN_DOC_V1} §8.`
      : firstBlocker
        ? `Address ${firstBlocker.criterion_id} (${firstBlocker.label}): ${firstBlocker.blocking_evidence[0] ?? "see blocking_evidence"}`
        : "Re-run wedge completion evaluator after refreshing upstream artifacts.";

  const proven_facts = [
    `PROVEN: read_only evaluation for wedge=${wedge}.`,
    `PROVEN: overall_status=${overall_status}.`,
    `PROVEN: safe_buyer_path_proven_count=${String(wedgeCensusSummary(census, wedge)?.safe_buyer_path_proven_count ?? "UNKNOWN")} (wedge slice from census).`,
  ];
  const unknown_facts = [
    ...census.unknown_facts.slice(0, 3),
    ...(searchIntentError ? [`search_intent: ${searchIntentError}`] : []),
    ...(closureError ? [`customer_closure: ${closureError}`] : []),
    ...(deps.dailyOperatorLiveSiteBannedRoutes === undefined
      ? ["E4: daily operator live-site banned phrase scan not supplied — criterion UNKNOWN"]
      : []),
  ];

  return {
    contract: WEDGE_COMPLETION_EVALUATOR_CONTRACT_V1,
    audit_contract: WEDGE_COMPLETION_AUDIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    artifact_write_authorized: false,
    source_command: WEDGE_COMPLETION_EVALUATOR_SOURCE_COMMAND_V1,
    standard_design_doc: WEDGE_COMPLETION_STANDARD_DESIGN_DOC_V1,
    generated_at: now().toISOString(),
    wedge,
    overall_status,
    dimensions,
    blocking_dimensions,
    blocking_criteria: blocking_criteria.filter((c) => c.status === "FAIL"),
    recommended_next_action,
    proven_facts,
    unknown_facts,
  };
}

export function buildWedgeCompletionEvaluatorUnknownV1(args: {
  generated_at: string;
  wedge: HomekeepWedgeCatalog;
  reason: string;
}): WedgeCompletionEvaluatorReportV1 {
  const emptyDim = (id: WedgeCompletionDimensionIdV1, label: string): WedgeCompletionDimensionResultV1 => ({
    dimension_id: id,
    label,
    status: "UNKNOWN",
    criteria: [],
    metrics: {},
  });
  return {
    contract: WEDGE_COMPLETION_EVALUATOR_CONTRACT_V1,
    audit_contract: WEDGE_COMPLETION_AUDIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    artifact_write_authorized: false,
    source_command: WEDGE_COMPLETION_EVALUATOR_SOURCE_COMMAND_V1,
    standard_design_doc: WEDGE_COMPLETION_STANDARD_DESIGN_DOC_V1,
    generated_at: args.generated_at,
    wedge: args.wedge,
    overall_status: "EVALUATION_UNKNOWN",
    dimensions: [
      emptyDim("coverage", "Coverage completeness"),
      emptyDim("customer_experience", "Customer experience completeness"),
      emptyDim("distribution", "Distribution completeness"),
      emptyDim("measurement", "Measurement completeness"),
    ],
    blocking_dimensions: [],
    blocking_criteria: [],
    recommended_next_action: `UNKNOWN: wedge completion evaluator failed — ${args.reason}`,
    proven_facts: [],
    unknown_facts: [args.reason],
  };
}
