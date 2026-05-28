/**
 * Read-only Agent Control Plane v1 — always-on work queue for proven BuckParts agent lanes.
 * Does not dispatch, mutate product CSV, or write Supabase.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  AP_MODEL_FIRST_EVIDENCE_PACKETS_DIR_REL_V1,
  AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1,
  AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1,
  AP_MODEL_FIRST_SEARCH_PLACEHOLDER_DOMINANCE_MIN_V1,
  isModelFirstSteeringPrimaryEligibleV1,
  type ApModelFirstEvidenceQueueReportV1,
} from "./ap-model-first-evidence-queue-v1";
import {
  AP_MODEL_FIRST_HOLMES_HAPF30_RESULT_REL_V1,
  loadModelFirstEvidenceResultV1,
} from "./air-purifier-model-first-evidence-result-v1";
import {
  AP_BATCH_V3_AGENT_RESULTS_AGGREGATOR_COMMAND_V1,
  AP_BATCH_V3_RESULTS_DIR_REL_V1,
  type ApBatchV3RunInstantiationV1,
} from "./ap-batch-v3-run-instantiation-v1";
import {
  buildAirPurifierAgentResultsAggregatorV1Report,
  type AirPurifierAgentResultsAggregatorReportV1,
} from "./air-purifier-agent-results-aggregator-v1";
import type { BatchProductionOperatingDispatchV1 } from "./buckparts-batch-production-operating-dispatch-v1";
import type { BatchProductionOperatingChecklistV1 } from "./buckparts-batch-production-operating-checklist-v1";
import type { BuckpartsMarketingIntelligenceEngineV1 } from "./buckparts-marketing-intelligence-engine-v1";
import {
  BUCKPARTS_MARKETING_INTELLIGENCE_COMMAND_V1,
  BUCKPARTS_MARKETING_INTELLIGENCE_ENGINE_CONTRACT_V1,
} from "./buckparts-marketing-intelligence-engine-v1";
import {
  DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1,
  type DemandToCoverageNextLaneReportV1,
} from "./demand-to-coverage-next-lane-v1";
import { BATCH_PRODUCTION_DEMAND_TO_COVERAGE_NEXT_LANE_COMMAND_V1 } from "./buckparts-batch-production-operating-checklist-v1";
import type {
  EvidenceToLearningOutcomesCandidateImportV1,
  LearningOutcomesInsertPlanV1,
} from "./buckparts-command-center-v2-types";
import type { ExternalMeasurementFreshnessV1 } from "../../src/lib/owner-dashboard/external-measurement-freshness-v1";

export const BUCKPARTS_AGENT_CONTROL_PLANE_CONTRACT_V1 = "agent_control_plane_v1" as const;

export const AGENT_PERMISSION_LEVELS_V1 = [
  "OBSERVE_READ_ONLY",
  "EVIDENCE_ARTIFACT_WRITE",
  "PLAN_ARTIFACT_WRITE",
  "SAFE_APPLY_GATED",
  "DEPLOY_GATED",
  "OWNER_ONLY",
] as const;

export type AgentPermissionLevelV1 = (typeof AGENT_PERMISSION_LEVELS_V1)[number];

export const AGENT_LANE_IDS_V1 = [
  "ap_model_first_evidence_v1",
  "ap_batch_v3_aggregation_review",
  "ap_batch_v3_catalog_task_review",
  "demand_to_coverage_next_lane",
  "marketing_intelligence_engine_v1",
  "external_measurement_freshness_v1",
  "learning_outcomes_candidate_import",
  "owner_question_queue",
] as const;

export type AgentLaneIdV1 = (typeof AGENT_LANE_IDS_V1)[number];

/** Paths no agent job may write unless permission is SAFE_APPLY_GATED or DEPLOY_GATED. */
export const AGENT_FORBIDDEN_PRODUCT_CSV_GLOBS_V1 = [
  "data/**/filters.csv",
  "data/**/retailer_links.csv",
  "data/**/models.csv",
] as const;

export const AGENT_FORBIDDEN_SUPABASE_GLOBS_V1 = [
  "supabase/**",
  "scripts/apply-*-supabase*.ts",
] as const;

export const AGENT_FORBIDDEN_DISPATCH_RUN_REGISTRY_GLOBS_V1 = [
  "data/**/run-registry/*.json",
] as const;

export const AGENT_FORBIDDEN_DISPATCH_RUNS_DIR_GLOB_V1 =
  "data/command-center/dispatch-runs/**" as const;

export const AGENT_FORBIDDEN_BATCH_REVIEW_GLOB_V1 =
  "data/air-purifier/batch-production/batch-review/**" as const;

const GLOBAL_FORBIDDEN_WRITE_PATHS_V1 = [
  ...AGENT_FORBIDDEN_PRODUCT_CSV_GLOBS_V1,
  ...AGENT_FORBIDDEN_SUPABASE_GLOBS_V1,
  ...AGENT_FORBIDDEN_DISPATCH_RUN_REGISTRY_GLOBS_V1,
] as const;

export const AP_BATCH_V3_AGGREGATOR_REVIEW_JSON_REL_V1 =
  "data/air-purifier/batch-production/batch-review/ap-agent-results-review-v1.json" as const;

export type ApBatchV3ControlPlaneTruthV1 = {
  result_files_complete: boolean;
  result_file_count: number;
  safe_csv_mutation_count: number;
  catalog_owner_action_count: number;
  catalog_action_slugs: string[];
  classification:
    | "no_safe_apply_catalog_owner_review"
    | "safe_apply_available"
    | "results_incomplete"
    | "unknown";
  proven_facts: string[];
};

export type AgentControlPlaneJobV1 = {
  job_id: string;
  agent_lane: AgentLaneIdV1;
  permission_level: AgentPermissionLevelV1;
  eligible_now: boolean;
  queue_pull_from: string;
  required_artifact_rel_paths: string[];
  allowed_write_paths: string[];
  forbidden_write_paths: string[];
  owner_approval_required: boolean;
  blocked_reasons: string[];
  success_transition: string;
  exact_command: string | null;
  why_eligible_or_blocked: string;
};

export type BuckpartsAgentControlPlaneV1 = {
  contract: typeof BUCKPARTS_AGENT_CONTROL_PLANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  permission_levels: readonly AgentPermissionLevelV1[];
  supported_agent_lanes: readonly AgentLaneIdV1[];
  ap_batch_v3_truth: ApBatchV3ControlPlaneTruthV1;
  eligible_job_count: number;
  eligible_jobs: AgentControlPlaneJobV1[];
  all_jobs: AgentControlPlaneJobV1[];
  always_on_queue_summary: string;
  proven_facts: string[];
  unknown_facts: string[];
  derived_from: string[];
};

export type BuildBuckpartsAgentControlPlaneV1Input = {
  rootDir: string;
  generated_at: string;
  batch_production_operating_dispatch_v1: BatchProductionOperatingDispatchV1;
  ap_batch_v3_run_instantiation_v1?: ApBatchV3RunInstantiationV1 | null;
  ap_model_first_evidence_queue_v1?: ApModelFirstEvidenceQueueReportV1 | null;
  air_purifier_weak_buyer_path_audit_v1?: import("./air-purifier-weak-buyer-path-audit-v1").AirPurifierWeakBuyerPathAuditReportV1 | null;
  demand_to_coverage_next_lane_v1: DemandToCoverageNextLaneReportV1;
  marketing_intelligence_engine_v1: BuckpartsMarketingIntelligenceEngineV1;
  external_measurement_freshness_v1: ExternalMeasurementFreshnessV1;
  evidence_to_learning_outcomes_candidate_import_v1: EvidenceToLearningOutcomesCandidateImportV1;
  learning_outcomes_insert_plan_v1?: LearningOutcomesInsertPlanV1 | null;
  batch_production_operating_checklist_v1?: BatchProductionOperatingChecklistV1 | null;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
};

function defaultFileExists(p: string): boolean {
  try {
    readFileSync(p);
    return true;
  } catch {
    return false;
  }
}

function defaultReadText(p: string): string {
  return readFileSync(p, "utf8");
}

function permissionMayWriteProductCsv(level: AgentPermissionLevelV1): boolean {
  return level === "SAFE_APPLY_GATED" || level === "DEPLOY_GATED";
}

export function assertAgentJobWritePolicyV1(job: AgentControlPlaneJobV1): void {
  if (permissionMayWriteProductCsv(job.permission_level)) return;
  for (const allowed of job.allowed_write_paths) {
    const norm = allowed.replace(/\\/g, "/");
    for (const forbidden of AGENT_FORBIDDEN_PRODUCT_CSV_GLOBS_V1) {
      const pattern = forbidden.replace(/\*\*/g, "").replace(/\*/g, "");
      if (norm.includes("filters.csv") || norm.includes("retailer_links.csv") || norm.includes("models.csv")) {
        throw new Error(
          `job ${job.job_id} permission ${job.permission_level} must not allow product CSV writes (${allowed})`,
        );
      }
    }
    for (const forbidden of AGENT_FORBIDDEN_SUPABASE_GLOBS_V1) {
      if (norm.includes("supabase/") || norm.includes("apply-") && norm.includes("supabase")) {
        throw new Error(
          `job ${job.job_id} permission ${job.permission_level} must not allow Supabase writes (${allowed})`,
        );
      }
    }
  }
}

function scanApBatchV3ResultsTruthV1(args: {
  rootDir: string;
  instantiation: ApBatchV3RunInstantiationV1 | null | undefined;
  fileExists: (p: string) => boolean;
  readTextFile: (p: string) => string;
}): ApBatchV3ControlPlaneTruthV1 {
  const proven_facts: string[] = [];
  const inst = args.instantiation;
  const resultRel =
    inst?.ready_result_files_rel?.length
      ? inst.ready_result_files_rel
      : inst?.expected_result_artifact_paths_rel ?? [];

  let safe_csv_mutation_count = 0;
  let catalog_owner_action_count = 0;
  const catalog_action_slugs: string[] = [];

  if (inst?.result_stage_has_proposed_csv_mutation === true) {
    safe_csv_mutation_count += 1;
    proven_facts.push("Instantiation flags result_stage_has_proposed_csv_mutation=true.");
  }

  for (const rel of resultRel) {
    const abs = path.join(args.rootDir, rel);
    if (!args.fileExists(abs)) continue;
    try {
      const doc = JSON.parse(args.readTextFile(abs)) as {
        candidate_results?: Array<{
          filter_slug?: string;
          recommended_csv_mutation?: unknown;
          recommended_catalog_action?: unknown;
        }>;
      };
      for (const row of doc.candidate_results ?? []) {
        if (row.recommended_csv_mutation != null) {
          safe_csv_mutation_count += 1;
        }
        if (row.recommended_catalog_action != null) {
          catalog_owner_action_count += 1;
          if (row.filter_slug?.trim()) catalog_action_slugs.push(row.filter_slug.trim());
        }
      }
    } catch {
      proven_facts.push(`PARTIAL: could not parse result file ${rel}.`);
    }
  }

  const result_files_complete = inst?.result_stage_complete === true && resultRel.length >= 3;
  if (result_files_complete) {
    proven_facts.push(
      `PROVEN: AP batch-v3 has ${String(resultRel.length)} committed result file(s); safe_csv_mutation_count=${String(safe_csv_mutation_count)}; catalog_owner_action_count=${String(catalog_owner_action_count)}.`,
    );
  }

  let classification: ApBatchV3ControlPlaneTruthV1["classification"] = "unknown";
  if (!result_files_complete) {
    classification = "results_incomplete";
  } else if (safe_csv_mutation_count > 0) {
    classification = "safe_apply_available";
  } else if (catalog_owner_action_count > 0) {
    classification = "no_safe_apply_catalog_owner_review";
  } else {
    classification = "no_safe_apply_catalog_owner_review";
  }

  return {
    result_files_complete,
    result_file_count: resultRel.length,
    safe_csv_mutation_count,
    catalog_owner_action_count,
    catalog_action_slugs,
    classification,
    proven_facts,
  };
}

function laneJobBase(
  lane: AgentLaneIdV1,
  permission_level: AgentPermissionLevelV1,
  partial: Omit<
    AgentControlPlaneJobV1,
    "agent_lane" | "permission_level" | "forbidden_write_paths"
  > & { allowed_write_paths: string[] },
  options?: { extra_forbidden_write_paths?: readonly string[] },
): AgentControlPlaneJobV1 {
  const job: AgentControlPlaneJobV1 = {
    agent_lane: lane,
    permission_level,
    forbidden_write_paths: [
      ...GLOBAL_FORBIDDEN_WRITE_PATHS_V1,
      ...(options?.extra_forbidden_write_paths ?? []),
    ],
    ...partial,
  };
  assertAgentJobWritePolicyV1(job);
  return job;
}

export function buildBuckpartsAgentControlPlaneV1Report(
  input: BuildBuckpartsAgentControlPlaneV1Input,
): BuckpartsAgentControlPlaneV1 {
  const fileExists = input.fileExists ?? defaultFileExists;
  const readTextFile = input.readTextFile ?? defaultReadText;
  const dispatch = input.batch_production_operating_dispatch_v1;
  const apTruth = scanApBatchV3ResultsTruthV1({
    rootDir: input.rootDir,
    instantiation: input.ap_batch_v3_run_instantiation_v1,
    fileExists,
    readTextFile,
  });

  let aggregator: AirPurifierAgentResultsAggregatorReportV1 | null = null;
  if (apTruth.result_files_complete) {
    try {
      aggregator = buildAirPurifierAgentResultsAggregatorV1Report({
        rootDir: input.rootDir,
        resultsDir: AP_BATCH_V3_RESULTS_DIR_REL_V1,
        strict: false,
      });
    } catch {
      aggregator = null;
    }
  }

  const aggregatorReviewExists = fileExists(
    path.join(input.rootDir, AP_BATCH_V3_AGGREGATOR_REVIEW_JSON_REL_V1),
  );

  const catalogRows =
    aggregator?.review_groups.catalog_task_required.length ??
    apTruth.catalog_owner_action_count;

  const expansionBlocked =
    input.batch_production_operating_checklist_v1?.expansion_readiness
      .ready_to_add_products_or_wedges !== true || dispatch.expansion_blocked;

  const demand = input.demand_to_coverage_next_lane_v1;
  const marketing = input.marketing_intelligence_engine_v1;
  const measurement = input.external_measurement_freshness_v1;
  const evidenceImport = input.evidence_to_learning_outcomes_candidate_import_v1;

  const weakAudit = input.air_purifier_weak_buyer_path_audit_v1 ?? null;
  const modelFirstQueue = input.ap_model_first_evidence_queue_v1 ?? null;

  const modelFirstSteeringPrimary =
    modelFirstQueue != null &&
    weakAudit != null &&
    isModelFirstSteeringPrimaryEligibleV1({
      weakBuyerPathAudit: weakAudit,
      candidateCount: modelFirstQueue.candidate_count,
      apBatchV3SafeCsvMutationCount: apTruth.safe_csv_mutation_count,
    });

  const modelFirstEligible =
    modelFirstSteeringPrimary &&
    modelFirstQueue != null &&
    modelFirstQueue.candidate_count > 0 &&
    apTruth.safe_csv_mutation_count === 0;

  const aggregationEligible =
    dispatch.selected_subsystem === "ap_batch_v3_aggregation_review" &&
    apTruth.result_files_complete &&
    dispatch.dispatch_status === "READY" &&
    !modelFirstSteeringPrimary;

  const catalogEligible =
    apTruth.result_files_complete &&
    apTruth.safe_csv_mutation_count === 0 &&
    (catalogRows > 0 || apTruth.catalog_owner_action_count > 0);

  const demandEligible =
    !expansionBlocked &&
    apTruth.classification === "no_safe_apply_catalog_owner_review" &&
    aggregatorReviewExists;

  const measurementStale =
    measurement.gsc.freshness_status !== "OK" ||
    measurement.ga4.freshness_status !== "OK" ||
    measurement.overall_status !== "OK";

  const learningEligible =
    evidenceImport.contract === "evidence_to_learning_outcomes_candidate_import_v1" &&
    evidenceImport.candidate_count > 0 &&
    evidenceImport.data_mutation === false;

  const ownerQuestions: string[] = [];
  if (catalogEligible) {
    ownerQuestions.push(
      `AP catalog identity: ${apTruth.catalog_action_slugs.join(", ") || "see batch-v3 Blueair catalog action"} — owner-approved catalog task before buyer-path mutation.`,
    );
  }
  const apOwnerReview =
    input.ap_batch_v3_run_instantiation_v1?.candidates_by_task.owner_review_required ?? [];
  for (const row of apOwnerReview.slice(0, 5)) {
    ownerQuestions.push(`AP owner review: ${row.filter_slug} (${row.state})`);
  }
  const loOwnerCount = input.learning_outcomes_insert_plan_v1?.owner_review_required_count ?? 0;
  if (loOwnerCount > 0) {
    ownerQuestions.push(
      `Learning outcomes: ${String(loOwnerCount)} candidate(s) need owner confidence before insert.`,
    );
  }

  const jobs: AgentControlPlaneJobV1[] = [
    laneJobBase(
      "ap_model_first_evidence_v1",
      "EVIDENCE_ARTIFACT_WRITE",
      {
        job_id: "ap_model_first_evidence_v1",
        eligible_now: modelFirstEligible,
        queue_pull_from: "ap_model_first_evidence_queue_v1.top_candidates",
        required_artifact_rel_paths: [
          "data/air-purifier/models.csv",
          "data/air-purifier/compatibility_mappings.csv",
          "data/air-purifier/retailer_links.csv",
        ],
        allowed_write_paths: [`${AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/**`],
        owner_approval_required: false,
        blocked_reasons: modelFirstEligible
          ? []
          : [
              ...(modelFirstQueue && modelFirstQueue.candidate_count > 0
                ? []
                : modelFirstQueue &&
                    modelFirstQueue.merged_candidate_count > 0 &&
                    modelFirstQueue.result_history.no_mutation_completed_filter_slugs.length > 0
                  ? ["all_active_candidates_completed_no_mutation"]
                  : ["model_first_queue_empty"]),
              ...(apTruth.safe_csv_mutation_count === 0
                ? []
                : ["ap_batch_v3_safe_csv_mutations_present"]),
              ...(weakAudit &&
              weakAudit.search_placeholder_primary_count >=
                AP_MODEL_FIRST_SEARCH_PLACEHOLDER_DOMINANCE_MIN_V1
                ? []
                : ["search_placeholder_dominance_below_threshold"]),
              ...(modelFirstSteeringPrimary ? [] : ["model_first_steering_not_primary"]),
            ],
        success_transition:
          "Model-first evidence JSON committed under agent-results-model-first-v1/ — no product CSV or Supabase apply.",
        exact_command: modelFirstEligible ? AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1 : null,
        why_eligible_or_blocked: modelFirstEligible
          ? `Search-placeholder dominance (${String(weakAudit?.search_placeholder_primary_count ?? 0)} weak filters) and zero batch-v3 safe CSV mutations — model-first evidence is primary over filter-first aggregation.`
          : "Blocked until weak-audit dominance + queue candidates + zero safe batch-v3 mutations align.",
      },
      {
        extra_forbidden_write_paths: [
          AGENT_FORBIDDEN_DISPATCH_RUNS_DIR_GLOB_V1,
          AGENT_FORBIDDEN_BATCH_REVIEW_GLOB_V1,
          `${AP_MODEL_FIRST_EVIDENCE_PACKETS_DIR_REL_V1}/**`,
        ],
      },
    ),
    laneJobBase("ap_batch_v3_aggregation_review", "PLAN_ARTIFACT_WRITE", {
      job_id: "ap_batch_v3_aggregation_review",
      eligible_now: aggregationEligible,
      queue_pull_from: AP_BATCH_V3_RESULTS_DIR_REL_V1,
      required_artifact_rel_paths: [
        ...(input.ap_batch_v3_run_instantiation_v1?.ready_result_files_rel ?? []),
        AP_BATCH_V3_AGGREGATOR_REVIEW_JSON_REL_V1,
      ],
      allowed_write_paths: [
        "data/air-purifier/batch-production/batch-review/*.json",
        "data/air-purifier/batch-production/batch-review/*.md",
      ],
      owner_approval_required: false,
      blocked_reasons: aggregationEligible
        ? []
        : [
            ...(apTruth.result_files_complete ? [] : ["ap_batch_v3_results_incomplete"]),
            ...(dispatch.selected_subsystem === "ap_batch_v3_aggregation_review"
              ? []
              : [`dispatch_selected_subsystem=${dispatch.selected_subsystem}`]),
            ...(dispatch.dispatch_status === "READY" ? [] : [`dispatch_status=${dispatch.dispatch_status}`]),
            ...(modelFirstSteeringPrimary
              ? ["demoted_model_first_steering_primary"]
              : []),
          ],
      success_transition:
        "Aggregator review JSON committed under batch-review/ — catalog vs apply groups visible for owner closeout.",
      exact_command: aggregationEligible ? AP_BATCH_V3_AGENT_RESULTS_AGGREGATOR_COMMAND_V1 : null,
      why_eligible_or_blocked: aggregationEligible
        ? "All batch-v3 result files exist; batch dispatch selects aggregation review."
        : modelFirstSteeringPrimary
          ? "Demoted while model-first steering is primary — run model-first evidence before filter-first aggregation."
          : "Blocked until result stage complete and dispatch selects ap_batch_v3_aggregation_review.",
    }),
    laneJobBase("ap_batch_v3_catalog_task_review", "OWNER_ONLY", {
      job_id: "ap_batch_v3_catalog_task_review",
      eligible_now: catalogEligible,
      queue_pull_from: "aggregator.review_groups.catalog_task_required + batch-v3 result recommended_catalog_action",
      required_artifact_rel_paths: [
        "data/air-purifier/batch-production/agent-results-batch-v3/ap-blueair-catalog-identity-v1.results.json",
        AP_BATCH_V3_AGGREGATOR_REVIEW_JSON_REL_V1,
      ],
      allowed_write_paths: [
        "docs/drafts/**",
        "data/ops/owner-decisions/**",
      ],
      owner_approval_required: true,
      blocked_reasons: catalogEligible
        ? []
        : [
            ...(apTruth.safe_csv_mutation_count === 0
              ? []
              : ["safe_csv_mutations_present"]),
            ...(catalogRows > 0 || apTruth.catalog_owner_action_count > 0
              ? []
              : ["no_catalog_owner_actions"]),
            ...(apTruth.result_files_complete ? [] : ["results_incomplete"]),
          ],
      success_transition:
        "Owner records catalog identity decision — separate approved catalog task before any SAFE_APPLY_GATED CSV work.",
      exact_command: null,
      why_eligible_or_blocked: catalogEligible
        ? `0 safe CSV mutations; ${String(apTruth.catalog_owner_action_count)} catalog owner action(s) require identity review (not product CSV apply).`
        : "No catalog owner review queue when results incomplete or safe apply mutations exist.",
    }),
    laneJobBase("demand_to_coverage_next_lane", "OBSERVE_READ_ONLY", {
      job_id: "demand_to_coverage_next_lane",
      eligible_now: demandEligible,
      queue_pull_from: DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1,
      required_artifact_rel_paths: [
        "data/measurement/gsc/**",
        "data/air-purifier/retailer_links.csv",
      ],
      allowed_write_paths: [
        "data/ops/reports/**",
        "data/measurement/**",
      ],
      owner_approval_required: false,
      blocked_reasons: demandEligible
        ? []
        : [
            ...(expansionBlocked
              ? ["expansion_blocked_or_closeout_incomplete"]
              : []),
            ...(aggregatorReviewExists ? [] : ["aggregator_review_json_missing"]),
            ...(apTruth.classification === "no_safe_apply_catalog_owner_review"
              ? []
              : [`ap_batch_v3_classification=${apTruth.classification}`]),
          ],
      success_transition:
        "Demand-to-coverage report refreshed — next wedge/batch selection only after AP closeout and learning summary.",
      exact_command: demandEligible ? BATCH_PRODUCTION_DEMAND_TO_COVERAGE_NEXT_LANE_COMMAND_V1 : null,
      why_eligible_or_blocked: demandEligible
        ? "AP batch-v3 has no safe apply path; aggregator review exists — select next coverage lane after closeout."
        : "Blocked while AP batch-v3 still needs aggregation/catalog closeout or expansion is blocked.",
    }),
    laneJobBase("marketing_intelligence_engine_v1", "OBSERVE_READ_ONLY", {
      job_id: "marketing_intelligence_engine_v1",
      eligible_now:
        marketing.contract === BUCKPARTS_MARKETING_INTELLIGENCE_ENGINE_CONTRACT_V1 &&
        marketing.read_only === true,
      queue_pull_from: BUCKPARTS_MARKETING_INTELLIGENCE_ENGINE_CONTRACT_V1,
      required_artifact_rel_paths: [
        "data/measurement/gsc/**",
        "data/air-purifier/batch-production/**",
      ],
      allowed_write_paths: ["docs/drafts/**", "data/ops/reports/**"],
      owner_approval_required: true,
      blocked_reasons:
        marketing.contract === BUCKPARTS_MARKETING_INTELLIGENCE_ENGINE_CONTRACT_V1
          ? []
          : ["marketing_engine_unavailable"],
      success_transition:
        "Marketing brief ranked in Command Center — publish only after owner taste review (no auto-publish).",
      exact_command: BUCKPARTS_MARKETING_INTELLIGENCE_COMMAND_V1,
      why_eligible_or_blocked:
        "Read-only marketing intelligence from proven demand, coverage, and batch truth.",
    }),
    laneJobBase("external_measurement_freshness_v1", "EVIDENCE_ARTIFACT_WRITE", {
      job_id: "external_measurement_freshness_v1",
      eligible_now: measurementStale,
      queue_pull_from: "external_measurement_freshness_v1.recommended_commands",
      required_artifact_rel_paths: [
        "data/measurement/gsc/**",
        "data/measurement/ga4/**",
      ],
      allowed_write_paths: ["data/measurement/gsc/**", "data/measurement/ga4/**"],
      owner_approval_required: false,
      blocked_reasons: measurementStale ? [] : ["measurement_artifacts_fresh"],
      success_transition:
        "GSC/GA4 artifacts refreshed — Command Center external_measurement_freshness_v1 becomes OK.",
      exact_command: measurement.recommended_commands.join(" && ") || null,
      why_eligible_or_blocked: measurementStale
        ? `Measurement stale or unknown (overall=${measurement.overall_status}).`
        : "GSC and GA4 artifacts are fresh — no fetch job required.",
    }),
    laneJobBase("learning_outcomes_candidate_import", "PLAN_ARTIFACT_WRITE", {
      job_id: "learning_outcomes_candidate_import",
      eligible_now: learningEligible && !catalogEligible,
      queue_pull_from: "evidence_to_learning_outcomes_candidate_import_v1",
      required_artifact_rel_paths: ["data/evidence/**/*.json"],
      allowed_write_paths: [
        "data/ops/learning-outcomes/**",
        "data/ops/reports/**",
      ],
      owner_approval_required: true,
      blocked_reasons: learningEligible
        ? catalogEligible
          ? ["defer_until_ap_catalog_closeout"]
          : []
        : ["no_evidence_candidates_or_import_unavailable"],
      success_transition:
        "Candidate import plan artifact updated — Supabase insert remains owner-gated separately.",
      exact_command: "npx tsx scripts/report-evidence-to-learning-outcomes-candidate-import-v1.ts",
      why_eligible_or_blocked: learningEligible
        ? catalogEligible
          ? "Deferred while AP catalog owner questions are open."
          : `${String(evidenceImport.candidate_count)} evidence candidate(s) ready for read-only import planning.`
        : "No evidence candidates to plan.",
    }),
    laneJobBase("owner_question_queue", "OWNER_ONLY", {
      job_id: "owner_question_queue",
      eligible_now: ownerQuestions.length > 0,
      queue_pull_from: "owner_question_queue.synthesized",
      required_artifact_rel_paths: [],
      allowed_write_paths: ["data/ops/owner-decisions/**"],
      owner_approval_required: true,
      blocked_reasons: ownerQuestions.length > 0 ? [] : ["no_owner_questions"],
      success_transition:
        "Owner answers recorded — agent lanes unlock per Command Center proof (catalog, confidence, apply).",
      exact_command: null,
      why_eligible_or_blocked:
        ownerQuestions.length > 0
          ? `${String(ownerQuestions.length)} owner question(s) block autonomous product work.`
          : "No synthesized owner questions in this snapshot.",
    }),
  ];

  const holmesModelFirstResult = loadModelFirstEvidenceResultV1({
    rootDir: input.rootDir,
    relPath: AP_MODEL_FIRST_HOLMES_HAPF30_RESULT_REL_V1,
    fileExists,
    readText: readTextFile,
  });

  const eligible_jobs = jobs.filter((j) => j.eligible_now);
  const proven_facts = [
    ...apTruth.proven_facts,
    `eligible_job_count=${String(eligible_jobs.length)}`,
    `dispatch.selected_subsystem=${dispatch.selected_subsystem}`,
    `ap_batch_v3.classification=${apTruth.classification}`,
  ];
  if (holmesModelFirstResult) {
    proven_facts.push(
      `PROVEN: Committed model-first result ${AP_MODEL_FIRST_HOLMES_HAPF30_RESULT_REL_V1} (${String(holmesModelFirstResult.model_rows.length)} model rows; UNKNOWN=${String(holmesModelFirstResult.evidence_status_counts.UNKNOWN ?? 0)}).`,
    );
  }
  if (apTruth.safe_csv_mutation_count === 0 && apTruth.result_files_complete) {
    proven_facts.push("PROVEN: no SAFE_APPLY_GATED job — zero proposed CSV mutations in batch-v3 results.");
  }
  const unknown_facts: string[] = [];
  if (!aggregator) {
    unknown_facts.push("Aggregator report not built in control plane pass.");
  }

  const always_on_queue_summary =
    eligible_jobs.length > 0
      ? eligible_jobs.map((j) => `${j.agent_lane} (${j.permission_level})`).join("; ")
      : "No eligible agent jobs — review blocked_reasons on all_jobs.";

  return {
    contract: BUCKPARTS_AGENT_CONTROL_PLANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: input.generated_at,
    permission_levels: AGENT_PERMISSION_LEVELS_V1,
    supported_agent_lanes: AGENT_LANE_IDS_V1,
    ap_batch_v3_truth: apTruth,
    eligible_job_count: eligible_jobs.length,
    eligible_jobs,
    all_jobs: jobs,
    always_on_queue_summary,
    proven_facts,
    unknown_facts,
    derived_from: [
      "scripts/lib/ap-model-first-evidence-queue-v1.ts",
      "scripts/lib/air-purifier-model-first-evidence-result-v1.ts",
      "scripts/lib/air-purifier-weak-buyer-path-audit-v1.ts",
      "scripts/lib/buckparts-batch-production-operating-dispatch-v1.ts",
      "scripts/lib/ap-batch-v3-run-instantiation-v1.ts",
      "scripts/lib/air-purifier-agent-results-aggregator-v1.ts",
      "scripts/lib/demand-to-coverage-next-lane-v1.ts",
      "scripts/lib/buckparts-marketing-intelligence-engine-v1.ts",
      "src/lib/owner-dashboard/external-measurement-freshness-v1.ts",
    ],
  };
}
