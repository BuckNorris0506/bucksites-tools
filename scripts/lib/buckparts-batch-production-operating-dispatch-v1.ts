/**
 * Command Center batch production operating dispatch v1 — machine-readable next action
 * derived only from batch_production_operating_checklist_v1 (no separate guessing).
 */

import type { ApBatchV3RunInstantiationV1 } from "./ap-batch-v3-run-instantiation-v1";
import {
  AP_BATCH_V3_AGENT_RESULTS_AGGREGATOR_COMMAND_V1,
  AP_BATCH_V3_PACKETS_DIR_REL_V1,
  AP_BATCH_V3_REGISTRY_REL_V1,
  AP_BATCH_V3_RESULTS_DIR_REL_V1,
  AP_BATCH_V3_RUN_INSTANTIATION_COMMAND_V1,
} from "./ap-batch-v3-run-instantiation-v1";
import {
  AP_APPLY_PLAN_BATCH_V2_DEFAULT_PATH_V1,
  AP_APPLY_RUN_BATCH_V2_DEFAULT_JSON_V1,
} from "./air-purifier-apply-executor-v1";
import type {
  BatchProductionChecklistStageIdV1,
  BatchProductionOperatingChecklistRuntimeStatusV1,
  BatchProductionOperatingChecklistV1,
} from "./buckparts-batch-production-operating-checklist-v1";
import {
  BATCH_PRODUCTION_CHECKLIST_INSPECT_COMMAND_V1,
  BATCH_PRODUCTION_CHECKLIST_STAGE_IDS_V1,
  BATCH_PRODUCTION_DEMAND_TO_COVERAGE_NEXT_LANE_COMMAND_V1,
  BATCH_PRODUCTION_OPERATING_CHECKLIST_CONTRACT_V1,
  BATCH_PRODUCTION_PARITY_DRY_RUN_COMMAND_V1,
} from "./buckparts-batch-production-operating-checklist-v1";
import { AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_EXACT_COMMAND_V1 } from "./air-purifier-demand-selected-batch-owner-review-v1";
import type { ApDemandSelectedOpenBatchProofStatusV1 } from "./ap-demand-selected-batch-run-registry-v1";
import type { DemandToCoverageNextLaneReportV1 } from "./demand-to-coverage-next-lane-v1";

export const BATCH_PRODUCTION_OPERATING_DISPATCH_CONTRACT_V1 =
  "batch_production_operating_dispatch_v1" as const;

export type BatchProductionDispatchStatusV1 =
  | "READY"
  | "BLOCKED"
  | "OWNER_REVIEW_REQUIRED"
  | "UNKNOWN";

export type BatchProductionCommandSurfaceV1 =
  | "terminal"
  | "cursor_agent"
  | "codex"
  | "supabase_sql"
  | "browser"
  | "none";

export type BatchProductionSelectedSubsystemV1 =
  | "none"
  | "batch_run_registry"
  | "codex_packet_generation"
  | "browser_evidence_collection"
  | "aggregator_review"
  | "apply_plan_owner_review"
  | "csv_apply_executor"
  | "repo_post_apply_validation"
  | "supabase_parity_dry_run"
  | "supabase_parity_apply_proof"
  | "production_runtime_smoke_proof"
  | "operator_closeout"
  | "expansion_loop_next_batch_selection"
  | "demand_to_coverage_next_lane"
  | "air_purifier_demand_selected_batch_owner_review"
  | "ap_batch_v3_run_instantiation"
  | "ap_batch_v3_agent_evidence_required"
  | "ap_batch_v3_aggregation_review"
  | "batch_checklist_inspect";

export type BatchProductionOperatingDispatchV1 = {
  contract: typeof BATCH_PRODUCTION_OPERATING_DISPATCH_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  runtime_status: BatchProductionOperatingChecklistRuntimeStatusV1;
  dispatch_status: BatchProductionDispatchStatusV1;
  current_stage_id: BatchProductionChecklistStageIdV1 | null;
  next_stage_id: BatchProductionChecklistStageIdV1 | null;
  selected_subsystem: BatchProductionSelectedSubsystemV1;
  exact_command: string;
  command_surface: BatchProductionCommandSurfaceV1;
  allowed_mutations: string[];
  forbidden_mutations: string[];
  owner_approval_required: boolean;
  mutation_allowed: false;
  proof_required_before_execution: string;
  expected_artifact_paths: string[];
  success_transition: string;
  failure_transition: string;
  why_this_is_next: string;
  blocked_reasons: string[];
  expansion_blocked: boolean;
  derived_from_checklist_contract: typeof BATCH_PRODUCTION_OPERATING_CHECKLIST_CONTRACT_V1;
};

const FORBIDDEN_MUTATIONS_BASE_V1 = [
  "product_csv_write",
  "retailer_links_csv_apply_without_dispatch_clear",
  "supabase_apply_without_committed_parity_proof",
  "new_batch_lane_or_wedge_while_expansion_blocked",
] as const;

const FORBIDDEN_EXPANSION_V1 = [
  "add_products_or_wedges",
  "open_new_batch_lane",
  "scale_batch_size",
] as const;

const SAFE_PARITY_PROOF_COMMAND_V1 =
  "npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json" as const;

export function resolveNextBatchProductionStageIdV1(
  current: BatchProductionChecklistStageIdV1 | null,
): BatchProductionChecklistStageIdV1 | null {
  if (!current) return null;
  const idx = BATCH_PRODUCTION_CHECKLIST_STAGE_IDS_V1.indexOf(current);
  if (idx < 0 || idx >= BATCH_PRODUCTION_CHECKLIST_STAGE_IDS_V1.length - 1) return null;
  return BATCH_PRODUCTION_CHECKLIST_STAGE_IDS_V1[idx + 1] ?? null;
}

function stageToSubsystem(stage_id: BatchProductionChecklistStageIdV1): BatchProductionSelectedSubsystemV1 {
  const map: Record<BatchProductionChecklistStageIdV1, BatchProductionSelectedSubsystemV1> = {
    lane_selected: "batch_run_registry",
    packets_generated: "codex_packet_generation",
    evidence_collected: "browser_evidence_collection",
    aggregator_reviewed: "aggregator_review",
    apply_plan_ready: "apply_plan_owner_review",
    csv_apply_complete: "csv_apply_executor",
    repo_validation_complete: "repo_post_apply_validation",
    supabase_parity_dry_run_ready: "supabase_parity_dry_run",
    supabase_parity_applied: "supabase_parity_apply_proof",
    production_runtime_smoke_complete: "production_runtime_smoke_proof",
    closeout_complete: "operator_closeout",
  };
  return map[stage_id];
}

function subsystemCommandSurface(
  subsystem: BatchProductionSelectedSubsystemV1,
): BatchProductionCommandSurfaceV1 {
  switch (subsystem) {
    case "browser_evidence_collection":
    case "production_runtime_smoke_proof":
      return "browser";
    case "codex_packet_generation":
    case "aggregator_review":
      return "codex";
    case "supabase_parity_apply_proof":
      return "supabase_sql";
    case "apply_plan_owner_review":
    case "expansion_loop_next_batch_selection":
    case "ap_batch_v3_run_instantiation":
    case "ap_batch_v3_agent_evidence_required":
    case "ap_batch_v3_aggregation_review":
      return "cursor_agent";
    // Read-only allowlisted terminal report (`report-buckparts-demand-to-coverage-next-lane.ts`).
    case "demand_to_coverage_next_lane":
    // Read-only allowlisted terminal report (`report-air-purifier-demand-selected-batch-owner-review-v1.ts`).
    case "air_purifier_demand_selected_batch_owner_review":
      return "terminal";
    case "none":
      return "none";
    default:
      return "terminal";
  }
}

export type BatchProductionOperatingDispatchExpansionContextV1 = {
  ap_batch_v3_run_instantiation?: ApBatchV3RunInstantiationV1 | null;
  /**
   * When AP demand-selected open batch existence is PROVEN after START_NEW_DEMAND_SELECTED_BATCH,
   * prefer the owner-review / closeout+apply-readiness posture report over re-running demand selection.
   */
  ap_demand_selected_batch_owner_review?: {
    open_batch_proof_v1?: ApDemandSelectedOpenBatchProofStatusV1 | null;
    source_recommendation_status?: DemandToCoverageNextLaneReportV1["recommendation_status"] | null;
    recommended_wedge?: string | null;
    read_only?: boolean;
    data_mutation?: boolean;
    csv_apply_authorized?: boolean;
    supabase_mutation_authorized?: boolean;
  } | null;
};

export function buildBatchProductionOperatingDispatchV1(
  checklist: BatchProductionOperatingChecklistV1,
  expansionContext?: BatchProductionOperatingDispatchExpansionContextV1,
): BatchProductionOperatingDispatchV1 {
  const decision = checklist.operating_decision;
  const stages = checklist.stages;
  const current_stage_id = decision.current_stage;
  const next_stage_id = resolveNextBatchProductionStageIdV1(current_stage_id);
  const parityStage = stages.find((s) => s.stage_id === "supabase_parity_applied");
  const smokeStage = stages.find((s) => s.stage_id === "production_runtime_smoke_complete");
  const closeoutStage = stages.find((s) => s.stage_id === "closeout_complete");

  const parityUnknown = parityStage?.status === "unknown";
  const smokeIncomplete =
    smokeStage != null && (smokeStage.status === "unknown" || smokeStage.status === "blocked");
  const stopTheLine = checklist.setbacks.fired.some((s) => s.severity === "stop_the_line");
  const expansion_blocked =
    parityUnknown ||
    smokeIncomplete ||
    checklist.expansion_readiness.ready_to_add_products_or_wedges !== true;

  const blocked_reasons = [...decision.blocking_reasons];
  const forbidden_mutations = [
    ...FORBIDDEN_MUTATIONS_BASE_V1,
    ...(expansion_blocked ? FORBIDDEN_EXPANSION_V1 : []),
  ];
  const allowed_mutations: string[] = [];

  const apRun = checklist.runs[0] ?? null;
  const expected_artifact_paths: string[] = apRun
    ? [
        AP_APPLY_PLAN_BATCH_V2_DEFAULT_PATH_V1,
        AP_APPLY_RUN_BATCH_V2_DEFAULT_JSON_V1,
        "data/air-purifier/batch-production/supabase-parity-apply-runs/",
      ]
    : [];

  if (!checklist.active_run_id) {
    return {
      contract: BATCH_PRODUCTION_OPERATING_DISPATCH_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      runtime_status: checklist.runtime_status,
      dispatch_status: "UNKNOWN",
      current_stage_id,
      next_stage_id,
      selected_subsystem: "none",
      exact_command: BATCH_PRODUCTION_CHECKLIST_INSPECT_COMMAND_V1,
      command_surface: "terminal",
      allowed_mutations,
      forbidden_mutations: [...forbidden_mutations],
      owner_approval_required: true,
      mutation_allowed: false,
      proof_required_before_execution: "Load an active batch run from run-registry before dispatching work.",
      expected_artifact_paths,
      success_transition: "Active run loads — re-dispatch from checklist stages.",
      failure_transition: "Remain UNKNOWN — do not open batch lanes.",
      why_this_is_next: "No active batch run — Command Center cannot dispatch batch production work.",
      blocked_reasons,
      expansion_blocked: true,
      derived_from_checklist_contract: checklist.contract,
    };
  }

  if (parityUnknown) {
    const proof = decision.proof_required_before_next_stage;
    const exact_command = BATCH_PRODUCTION_PARITY_DRY_RUN_COMMAND_V1;
    const isSafeReadOnlyProofCommand =
      exact_command === SAFE_PARITY_PROOF_COMMAND_V1 &&
      !exact_command.includes("--apply");
    return {
      contract: BATCH_PRODUCTION_OPERATING_DISPATCH_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      runtime_status: checklist.runtime_status,
      dispatch_status: stopTheLine ? "BLOCKED" : isSafeReadOnlyProofCommand ? "READY" : "OWNER_REVIEW_REQUIRED",
      current_stage_id,
      next_stage_id: resolveNextBatchProductionStageIdV1("supabase_parity_applied"),
      selected_subsystem: "supabase_parity_apply_proof",
      exact_command,
      command_surface: "terminal",
      allowed_mutations: ["parity_dry_run_read_only"],
      forbidden_mutations: [...forbidden_mutations, "supabase_apply", "csv_apply"],
      owner_approval_required: stopTheLine ? true : false,
      mutation_allowed: false,
      proof_required_before_execution: proof,
      expected_artifact_paths: [
        ...expected_artifact_paths,
        "data/air-purifier/batch-production/supabase-parity-apply-runs/<parity-apply-run>.json",
      ],
      success_transition:
        "Parity apply-run JSON committed — supabase_parity_applied stage becomes complete; dispatch re-evaluates runtime smoke.",
      failure_transition: "Remain blocked — expansion and Supabase apply stay forbidden.",
      why_this_is_next:
        "Supabase parity applied proof is UNKNOWN in repo — ingest committed parity apply-run JSON before expansion or new batch lanes.",
      blocked_reasons,
      expansion_blocked: true,
      derived_from_checklist_contract: checklist.contract,
    };
  }

  if (smokeIncomplete) {
    return {
      contract: BATCH_PRODUCTION_OPERATING_DISPATCH_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      runtime_status: checklist.runtime_status,
      dispatch_status: smokeStage?.status === "blocked" ? "BLOCKED" : "OWNER_REVIEW_REQUIRED",
      current_stage_id: current_stage_id ?? "production_runtime_smoke_complete",
      next_stage_id: resolveNextBatchProductionStageIdV1("production_runtime_smoke_complete"),
      selected_subsystem: "production_runtime_smoke_proof",
      exact_command: BATCH_PRODUCTION_CHECKLIST_INSPECT_COMMAND_V1,
      command_surface: "browser",
      allowed_mutations: ["live_site_monitor_read_only", "command_center_inspect"],
      forbidden_mutations: [...forbidden_mutations, "csv_apply", "supabase_apply"],
      owner_approval_required: true,
      mutation_allowed: false,
      proof_required_before_execution:
        "Production /go and buy-gate smoke proof for applied slugs (live monitor or committed gate_by_slug artifact).",
      expected_artifact_paths,
      success_transition:
        "Runtime smoke complete — dispatch may advance to operator closeout or expansion loop.",
      failure_transition: "Remain blocked — do not scale batch size or add wedges.",
      why_this_is_next:
        smokeStage?.status === "blocked"
          ? "Production runtime smoke has gate failures — fix buy/go paths before expansion."
          : "Production runtime smoke proof is incomplete or UNKNOWN — verify live /go gates before expansion.",
      blocked_reasons,
      expansion_blocked: true,
      derived_from_checklist_contract: checklist.contract,
    };
  }

  if (
    checklist.expansion_readiness.ready_to_add_products_or_wedges === true &&
    checklist.runtime_status === "OK" &&
    closeoutStage?.status === "complete"
  ) {
    const instantiation = expansionContext?.ap_batch_v3_run_instantiation ?? null;
    if (instantiation?.may_proceed_to_packet_write === true) {
      if (instantiation.packets_stage_complete) {
        if (instantiation.result_stage_complete) {
          return {
            contract: BATCH_PRODUCTION_OPERATING_DISPATCH_CONTRACT_V1,
            read_only: true,
            data_mutation: false,
            runtime_status: checklist.runtime_status,
            dispatch_status: "READY",
            current_stage_id: "evidence_collected",
            next_stage_id: "aggregator_reviewed",
            selected_subsystem: "ap_batch_v3_aggregation_review",
            exact_command: AP_BATCH_V3_AGENT_RESULTS_AGGREGATOR_COMMAND_V1,
            command_surface: "cursor_agent",
            allowed_mutations: ["batch_run_planning_read_only", "aggregation_review_read_only"],
            forbidden_mutations: [...FORBIDDEN_MUTATIONS_BASE_V1],
            owner_approval_required: instantiation.result_stage_has_proposed_csv_mutation,
            mutation_allowed: false,
            proof_required_before_execution:
              "All expected AP batch-v3 result files are committed and valid; run read-only aggregation to surface PASS/UNKNOWN/BLOCKED and any owner-review mutation proposals.",
            expected_artifact_paths: [
              AP_BATCH_V3_REGISTRY_REL_V1,
              AP_BATCH_V3_PACKETS_DIR_REL_V1,
              AP_BATCH_V3_RESULTS_DIR_REL_V1,
              ...instantiation.expected_result_artifact_paths_rel,
            ],
            success_transition:
              "Aggregation reviewed — continue with owner-only decisions for any proposed CSV mutations and catalog actions.",
            failure_transition:
              "If aggregation is invalid or stale, remain read-only and refresh AP result artifacts only.",
            why_this_is_next: `AP batch-v3 result stage is COMPLETE for ${instantiation.run_id}; run aggregation review before any apply planning.`,
            blocked_reasons: [],
            expansion_blocked: false,
            derived_from_checklist_contract: checklist.contract,
          };
        }
        return {
          contract: BATCH_PRODUCTION_OPERATING_DISPATCH_CONTRACT_V1,
          read_only: true,
          data_mutation: false,
          runtime_status: checklist.runtime_status,
          dispatch_status: "READY",
          current_stage_id: "packets_generated",
          next_stage_id: "evidence_collected",
          selected_subsystem: "ap_batch_v3_agent_evidence_required",
          exact_command: AP_BATCH_V3_AGENT_RESULTS_AGGREGATOR_COMMAND_V1,
          command_surface: "cursor_agent",
          allowed_mutations: [
            "batch_run_planning_read_only",
            "external_browser_evidence_collection_read_only",
          ],
          forbidden_mutations: [...FORBIDDEN_MUTATIONS_BASE_V1],
          owner_approval_required: false,
          mutation_allowed: false,
          proof_required_before_execution:
            "Committed ap-batch-v3 packets are on disk — run external browser agents per packet JSON; commit *.results.json under agent-results-batch-v3 (read-only planning until aggregator review).",
          expected_artifact_paths: [
            AP_BATCH_V3_REGISTRY_REL_V1,
            AP_BATCH_V3_PACKETS_DIR_REL_V1,
            AP_BATCH_V3_RESULTS_DIR_REL_V1,
            ...instantiation.expected_result_artifact_paths_rel,
          ],
          success_transition:
            "All packet result files committed and valid — dispatch advances to ap_batch_v3_aggregation_review.",
          failure_transition: "Do not mutate CSV/Supabase; do not run agents from Command Center automatically.",
          why_this_is_next: `AP batch-v3 packet stage complete for ${instantiation.run_id}. Ready packet files: ${instantiation.ready_packet_files_rel.join(", ")}. Next: external agent evidence → ${instantiation.expected_result_artifact_paths_rel.join(", ")}.`,
          blocked_reasons: [
            ...instantiation.missing_result_files_rel.map((p) => `missing_result_file:${p}`),
            ...instantiation.invalid_result_files.map(
              (f) => `invalid_result_file:${f.path}:${f.reasons.join("|")}`,
            ),
          ],
          expansion_blocked: false,
          derived_from_checklist_contract: checklist.contract,
        };
      }

      const packetBlockedReasons = [...blocked_reasons];
      if (instantiation.packet_stage_status === "MISSING_PACKET_FILES") {
        for (const missing of instantiation.missing_packet_files_rel) {
          packetBlockedReasons.push(`missing_packet_file:${missing}`);
        }
      }
      if (instantiation.packet_stage_status === "MISSING_MANIFEST") {
        packetBlockedReasons.push(`missing_manifest:${AP_BATCH_V3_PACKETS_DIR_REL_V1}/manifest.json`);
      }
      if (instantiation.packet_stage_status === "RUN_ID_MISMATCH") {
        packetBlockedReasons.push("run_id_mismatch:registry_vs_manifest");
      }

      const dispatch_status: BatchProductionDispatchStatusV1 =
        instantiation.packet_stage_status === "MISSING_PACKET_FILES" ||
        instantiation.packet_stage_status === "RUN_ID_MISMATCH"
          ? "OWNER_REVIEW_REQUIRED"
          : "READY";

      return {
        contract: BATCH_PRODUCTION_OPERATING_DISPATCH_CONTRACT_V1,
        read_only: true,
        data_mutation: false,
        runtime_status: checklist.runtime_status,
        dispatch_status,
        current_stage_id: null,
        next_stage_id: "packets_generated",
        selected_subsystem: "ap_batch_v3_run_instantiation",
        exact_command: AP_BATCH_V3_RUN_INSTANTIATION_COMMAND_V1,
        command_surface: "cursor_agent",
        allowed_mutations: ["batch_run_planning_read_only", "ap_batch_v3_run_descriptor_read_only"],
        forbidden_mutations: [...FORBIDDEN_MUTATIONS_BASE_V1],
        owner_approval_required: instantiation.packet_stage_status !== "NOT_STARTED",
        mutation_allowed: false,
        proof_required_before_execution:
          "Command Center selected air_purifier reopen — committed run descriptor and packet manifest must exist on disk before evidence collection.",
        expected_artifact_paths: [
          instantiation.proposed_artifact_paths.run_registry,
          instantiation.proposed_artifact_paths.packets_dir,
        ],
        success_transition:
          "Committed registry + manifest + packet JSON files on disk — dispatch advances to ap_batch_v3_agent_evidence_required.",
        failure_transition: "Do not mutate CSV/Supabase or reuse ap-batch-v2 plans.",
        why_this_is_next: `Instantiate/write ap-batch-v3 packets (${String(instantiation.buyer_path_candidate_count)} buyer-path; ${String(instantiation.catalog_review_candidate_count)} catalog-review). ${instantiation.next_command_center_step}`,
        blocked_reasons: packetBlockedReasons,
        expansion_blocked: false,
        derived_from_checklist_contract: checklist.contract,
      };
    }

    const activeWedge = checklist.runs[0]?.wedge ?? "";
    const useDemandLane = activeWedge === "air_purifier";
    const ownerReviewCtx = expansionContext?.ap_demand_selected_batch_owner_review ?? null;
    const preferApDemandSelectedOwnerReview =
      useDemandLane &&
      ownerReviewCtx?.read_only === true &&
      ownerReviewCtx?.data_mutation === false &&
      ownerReviewCtx?.csv_apply_authorized === false &&
      ownerReviewCtx?.supabase_mutation_authorized === false &&
      ownerReviewCtx?.source_recommendation_status === "START_NEW_DEMAND_SELECTED_BATCH" &&
      ownerReviewCtx?.recommended_wedge === "air_purifier" &&
      ownerReviewCtx?.open_batch_proof_v1?.open_batch_existence === "PROVEN" &&
      ownerReviewCtx.open_batch_proof_v1.batch_closeout === "NOT_PROVEN" &&
      ownerReviewCtx.open_batch_proof_v1.apply_readiness === "NOT_PROVEN";

    if (preferApDemandSelectedOwnerReview) {
      return {
        contract: BATCH_PRODUCTION_OPERATING_DISPATCH_CONTRACT_V1,
        read_only: true,
        data_mutation: false,
        runtime_status: checklist.runtime_status,
        dispatch_status: "READY",
        current_stage_id: null,
        next_stage_id: "lane_selected",
        selected_subsystem: "air_purifier_demand_selected_batch_owner_review",
        exact_command: AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_EXACT_COMMAND_V1,
        command_surface: "terminal",
        allowed_mutations: ["ap_demand_selected_owner_review_read_only"],
        forbidden_mutations: [...FORBIDDEN_MUTATIONS_BASE_V1],
        owner_approval_required: false,
        mutation_allowed: false,
        proof_required_before_execution:
          "AP demand-selected open batch is proven; emit read-only owner-review packet proving closeout_complete=false and apply_readiness=NOT_PROVEN. Hard-stop before CSV/Supabase/evidence/public mutation.",
        expected_artifact_paths,
        success_transition:
          "Owner-review packet printed — batch closeout and apply readiness remain NOT_PROVEN; mutation unauthorized; do not invent buyer-path closure or revenue.",
        failure_transition:
          "Remain read-only — do not mutate CSV/Supabase/retailer_links/public guidance; conversion/revenue UNKNOWN.",
        why_this_is_next:
          "Demand selection already chose air_purifier with an open demand-selected batch; next safe stage is the read-only AP demand-selected owner-review report (closeout + apply-readiness posture), not another demand selection pass.",
        blocked_reasons: [],
        expansion_blocked: false,
        derived_from_checklist_contract: checklist.contract,
      };
    }

    const selected_subsystem: BatchProductionSelectedSubsystemV1 = useDemandLane
      ? "demand_to_coverage_next_lane"
      : "expansion_loop_next_batch_selection";
    const exact_command = useDemandLane
      ? BATCH_PRODUCTION_DEMAND_TO_COVERAGE_NEXT_LANE_COMMAND_V1
      : BATCH_PRODUCTION_CHECKLIST_INSPECT_COMMAND_V1;
    // Only the allowlisted demand-to-coverage report is auto-dispatchable as terminal;
    // expansion_loop checklist inspect stays cursor_agent (pipe/jq; not runner-allowlisted).
    const command_surface: BatchProductionCommandSurfaceV1 = useDemandLane
      ? "terminal"
      : "cursor_agent";
    return {
      contract: BATCH_PRODUCTION_OPERATING_DISPATCH_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      runtime_status: checklist.runtime_status,
      dispatch_status: "READY",
      current_stage_id: null,
      next_stage_id: "lane_selected",
      selected_subsystem,
      exact_command,
      command_surface,
      allowed_mutations: ["batch_planning_read_only", "demand_to_coverage_read_only"],
      forbidden_mutations: [...FORBIDDEN_MUTATIONS_BASE_V1],
      owner_approval_required: false,
      mutation_allowed: false,
      proof_required_before_execution:
        "Prior cycle closeout complete — read-only next-lane planning only until a new owner-approved apply plan exists.",
      expected_artifact_paths,
      success_transition: "New run-registry + lane_selected — batch loop restarts.",
      failure_transition: "Do not mutate CSV/Supabase without a fresh owner-approved plan.",
      why_this_is_next:
        checklist.spent_plan_closeout.classification === "SPENT_CLOSED_SUCCESS"
          ? "Closed batch with full apply/parity/closeout proof — return to demand-to-coverage for the next wedge or batch candidate (read-only planning first)."
          : "Growth mode ready — return to the expansion loop for the next wedge or batch candidate generation (read-only planning first).",
      blocked_reasons: [],
      expansion_blocked: false,
      derived_from_checklist_contract: checklist.contract,
    };
  }

  const subsystem =
    current_stage_id != null ? stageToSubsystem(current_stage_id) : "batch_checklist_inspect";
  const dispatch_status: BatchProductionDispatchStatusV1 = stopTheLine
    ? "BLOCKED"
    : decision.owner_action_required
      ? "OWNER_REVIEW_REQUIRED"
      : checklist.runtime_status === "OK"
        ? "READY"
        : "BLOCKED";

  return {
    contract: BATCH_PRODUCTION_OPERATING_DISPATCH_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    runtime_status: checklist.runtime_status,
    dispatch_status,
    current_stage_id,
    next_stage_id,
    selected_subsystem: subsystem,
    exact_command: decision.next_exact_command,
    command_surface: subsystemCommandSurface(subsystem),
    allowed_mutations,
    forbidden_mutations: [...forbidden_mutations],
    owner_approval_required: decision.owner_action_required,
    mutation_allowed: false,
    proof_required_before_execution: decision.proof_required_before_next_stage,
    expected_artifact_paths,
    success_transition: current_stage_id
      ? `Stage ${current_stage_id} clears — advance to ${next_stage_id ?? "expansion loop"}.`
      : "Operating loop clear.",
    failure_transition: "Dispatch remains blocked — follow forbidden_mutations.",
    why_this_is_next: decision.next_owner_action.replace(/^BATCH CHECKLIST \[[^\]]+\]: /, ""),
    blocked_reasons,
    expansion_blocked,
    derived_from_checklist_contract: checklist.contract,
  };
}

export function resolveBatchProductionDispatchDirectorOverrideV1(args: {
  dispatch: BatchProductionOperatingDispatchV1;
  brainStopTheLine: boolean;
}): {
  next_best_action: string;
  why_this_action: string;
  next_move_command: string;
  mutation_allowed: false;
  mutation_block_reasons: string[];
} | null {
  if (args.brainStopTheLine) return null;
  if (args.dispatch.dispatch_status === "UNKNOWN") return null;

  const prefix = `BATCH DISPATCH [${args.dispatch.dispatch_status}]`;
  const mutation_block_reasons = [
    ...args.dispatch.blocked_reasons,
    ...args.dispatch.forbidden_mutations.map((m) => `forbidden:${m}`),
  ];
  if (!args.dispatch.mutation_allowed) {
    mutation_block_reasons.push(
      "Batch production dispatch: mutation_allowed=false until proof and dispatch_status allow.",
    );
  }

  return {
    next_best_action: `${prefix}: ${args.dispatch.why_this_is_next}`,
    why_this_action: args.dispatch.why_this_is_next,
    next_move_command: args.dispatch.exact_command,
    mutation_allowed: false,
    mutation_block_reasons,
  };
}
