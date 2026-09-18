/**
 * Executive Work Discovery v1 — read-only business work set.
 *
 * Answers: "What work can BuckParts perform right now?"
 * Not a command catalog. Not ranking. Not dispatch. Not an NBA.
 * Does not invent work, infer authority, rebuild Command Center, or mutate.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import { buildOwnerDecisionQueueProjectionV1 } from "../../src/lib/owner-dashboard/owner-decision-queue-v1";
import { buildAirPurifierModelFirstProductionLaneV1Report } from "./air-purifier-model-first-production-lane-v1";
import { buildAirPurifierWeakBuyerPathAuditV1Report } from "./air-purifier-weak-buyer-path-audit-v1";
import {
  ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_SOURCE_COMMAND_V1,
  buildAllProductSafeBuyerPathCensusV1,
} from "./all-product-safe-buyer-path-census-v1";
import {
  AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1,
  buildApModelFirstEvidenceQueueV1Report,
} from "./ap-model-first-evidence-queue-v1";
import {
  isApDemandSelectedOpenBatchRegistryProvenOpenV1,
  loadApDemandSelectedBatchRunRegistryV1,
} from "./ap-demand-selected-batch-run-registry-v1";
import { BATCH_RUN_REGISTRY_INTAKE_SOURCE_COMMAND_V1 } from "./batch-run-registry-intake-command-center-v1";
import {
  buildBatchRunRegistryIntakeReportV1,
} from "./batch-run-registry-intake-v1";
import { listActivePlanningRunRegistryWedgesV1 } from "./batch-run-registry-intake-steering-v1";
import { AP_OWNER_REVIEW_EXACT_COMMAND_V1 } from "./buckparts-command-center-dispatch-allowlist-v1";
import { buildRetailerLinkParityIssueIntakeV1 } from "./buckparts-retailer-link-parity-issue-intake-v1";
import {
  isCommandCenterIssueOpenV1,
  loadCommandCenterIssuesV1,
} from "./command-center-issue-registry-v1";
import { buildDemandToCoverageNextLaneV1Report } from "./demand-to-coverage-next-lane-v1";
import {
  bindWorkExactCommandV1,
  loadPackageScriptsV1,
  type EpistemicTagV1,
} from "./buckparts-executive-command-eligibility-v1";
import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
  buildFridgeBuyerPathBatchApplyPlanApprovalReportV1,
} from "./fridge-buyer-path-batch-apply-plan-approval-v1";
import { FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_SOURCE_COMMAND_V1 } from "./fridge-buyer-path-batch-apply-plan-approval-command-center-v1";
import { FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_SOURCE_COMMAND_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-command-center-v1";
import { buildFridgeBuyerPathBatchApplyPlanProposalV1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import {
  REFRIGERATOR_MODEL_FIRST_BATCH_RESOLVER_COMMAND_V1,
  REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1,
  buildRefrigeratorModelFirstBatchResolverV1,
} from "./refrigerator-model-first-batch-resolver-v1";

export const EXECUTIVE_WORK_DISCOVERY_CONTRACT_V1 =
  "buckparts_executive_work_discovery_v1" as const;

export const EXECUTIVE_WORK_DISCOVERY_REPORT_NAME_V1 =
  "buckparts_executive_work_discovery_v1" as const;

export type ExecutiveWorkAuthorityRequiredV1 =
  | "founder_owner_decision"
  | "dispatch_allowlist_metadata"
  | "canonical_source_command_constant"
  | "none_no_proven_command";

export type ExecutiveDiscoveredWorkV1 = {
  work_id: string;
  business_objective: string;
  executable: boolean;
  blocking_reason: string | null;
  exact_command: string | null;
  authority_required: ExecutiveWorkAuthorityRequiredV1;
  evidence: string[];
  work_exists_epistemic: EpistemicTagV1;
  executable_epistemic: EpistemicTagV1;
};

export type ExecutiveWorkUnobservedDetectorV1 = {
  detector_id: string;
  epistemic: EpistemicTagV1;
  reason: string;
  evidence: string[];
};

export type ExecutiveWorkMissingSourceV1 = {
  source_id: string;
  epistemic: EpistemicTagV1;
  present_on_head: boolean | "UNKNOWN";
  why_missing: string;
  evidence: string[];
};

export type WorkDetectionResultV1 =
  | {
      kind: "work";
      evidence: string[];
      bound_command: string | null;
      authority_required: ExecutiveWorkAuthorityRequiredV1;
      work_exists_epistemic: EpistemicTagV1;
    }
  | { kind: "no_work"; evidence: string[] }
  | { kind: "unobserved"; reason: string; epistemic: EpistemicTagV1; evidence: string[] };

export type ExecutiveWorkDetectorV1 = {
  work_id: string;
  business_objective: string;
  detect: (rootDir: string) => Promise<WorkDetectionResultV1>;
};

export type ExecutiveWorkDiscoverySnapshotV1 = {
  contract: typeof EXECUTIVE_WORK_DISCOVERY_CONTRACT_V1;
  report_name: typeof EXECUTIVE_WORK_DISCOVERY_REPORT_NAME_V1;
  generated_at: string;
  observation_kind: "business_work_set";
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  nba_authority: false;
  dispatch_authority: false;
  dispatch_invoked: false;
  steering_authority: false;
  ranking_performed: false;
  command_center_rebuilt: false;
  outcome_join_consulted: false;
  catalog_epistemic: "PROVEN";
  completeness_epistemic: "PROVEN";
  completeness_status: "INCOMPLETE";
  executive_can_know_every_work_today: false;
  work: ExecutiveDiscoveredWorkV1[];
  executable_work: ExecutiveDiscoveredWorkV1[];
  unobserved_detectors: ExecutiveWorkUnobservedDetectorV1[];
  missing_work_sources: ExecutiveWorkMissingSourceV1[];
  scale_counts: {
    closed_detectors: number;
    discovered_work: number;
    executable_work: number;
    unobserved_detectors: number;
  };
};

function filePresent(rootDir: string, rel: string): boolean {
  return existsSync(path.join(rootDir, rel));
}

async function detectIssueRegistryOpenV1(rootDir: string): Promise<WorkDetectionResultV1> {
  const loaded = loadCommandCenterIssuesV1({ rootDir });
  const open = loaded.issues.filter((issue) => isCommandCenterIssueOpenV1(issue.status));
  if (open.length === 0) {
    return {
      kind: "no_work",
      evidence: [
        `issues_loaded=${String(loaded.issues.length)}`,
        "open_issue_count=0",
        "data/command-center/issues",
      ],
    };
  }
  return {
    kind: "work",
    bound_command: null,
    authority_required: "none_no_proven_command",
    work_exists_epistemic: "PROVEN",
    evidence: [
      `open_issue_count=${String(open.length)}`,
      `open_issue_ids=${open.map((i) => i.issue_id).join(",")}`,
      "issue-specific repair commands are dynamic Command Center steering output; not bound here (would invent)",
    ],
  };
}

async function detectOwnerDecisionPendingV1(rootDir: string): Promise<WorkDetectionResultV1> {
  const queue = buildOwnerDecisionQueueProjectionV1({ rootDir });
  if (queue.pending_count === 0) {
    return {
      kind: "no_work",
      evidence: [
        `request_count=${String(queue.request_count)}`,
        "pending_count=0",
        "data/owner-decisions/queue",
      ],
    };
  }
  const top = queue.top_pending_decisions[0];
  return {
    kind: "work",
    bound_command: null,
    authority_required: "founder_owner_decision",
    work_exists_epistemic: "PROVEN",
    evidence: [
      `pending_count=${String(queue.pending_count)}`,
      top
        ? `top_pending_id=${top.decision_request_id}; decision_type=${top.decision_type}`
        : "top_pending=none",
      "exact_downstream_action_if_approved is gated on founder approval; not executable now (would infer authority)",
    ],
  };
}

async function detectSafeBuyerPathRescueV1(rootDir: string): Promise<WorkDetectionResultV1> {
  const census = buildAllProductSafeBuyerPathCensusV1({ rootDir });
  const suppressed = census.classification_counts.SAFE_BUYER_PATH_SUPPRESSED_TRUST;
  const rescue = census.top_20_rescue_queue.length;
  if (suppressed === 0 && rescue === 0) {
    return {
      kind: "no_work",
      evidence: ["SAFE_BUYER_PATH_SUPPRESSED_TRUST=0", "top_20_rescue_queue.length=0"],
    };
  }
  const sample = census.top_20_rescue_queue.slice(0, 5).map((row) => row.slug);
  return {
    kind: "work",
    bound_command: null,
    authority_required: "none_no_proven_command",
    work_exists_epistemic: "PROVEN",
    evidence: [
      `SAFE_BUYER_PATH_SUPPRESSED_TRUST=${String(suppressed)}`,
      `top_20_rescue_queue.length=${String(rescue)}`,
      sample.length > 0 ? `sample_slugs=${sample.join(",")}` : "sample_slugs=none",
      `census_source_command=${ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_SOURCE_COMMAND_V1} is an observer, not a performer of rescue; not bound`,
    ],
  };
}

async function detectApModelFirstEvidenceV1(rootDir: string): Promise<WorkDetectionResultV1> {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir });
  const queue = buildApModelFirstEvidenceQueueV1Report({
    rootDir,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });
  if (queue.queue_status === "UNKNOWN") {
    return {
      kind: "unobserved",
      epistemic: "UNKNOWN",
      reason: "AP model-first evidence queue status is UNKNOWN",
      evidence: queue.unknown_facts.slice(0, 4),
    };
  }
  if (queue.queue_status !== "READY" || queue.candidate_count === 0) {
    return {
      kind: "no_work",
      evidence: [
        `queue_status=${queue.queue_status}`,
        `candidate_count=${String(queue.candidate_count)}`,
      ],
    };
  }
  const top = queue.top_candidates[0];
  return {
    kind: "work",
    bound_command: AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1,
    authority_required: "canonical_source_command_constant",
    work_exists_epistemic: "PROVEN",
    evidence: [
      `queue_status=${queue.queue_status}`,
      `candidate_count=${String(queue.candidate_count)}`,
      top ? `top_filter_slug=${top.filter_slug}` : "top_filter_slug=none",
    ],
  };
}

async function detectApModelFirstMappingReviewV1(rootDir: string): Promise<WorkDetectionResultV1> {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir });
  const queue = buildApModelFirstEvidenceQueueV1Report({
    rootDir,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });
  const count = queue.mapping_review_opportunities.length;
  if (count === 0) {
    return {
      kind: "no_work",
      evidence: ["mapping_review_opportunities.length=0"],
    };
  }
  return {
    kind: "work",
    bound_command: AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1,
    authority_required: "canonical_source_command_constant",
    work_exists_epistemic: "PROVEN",
    evidence: [
      `mapping_review_opportunities.length=${String(count)}`,
      `sample=${queue.mapping_review_opportunities
        .slice(0, 5)
        .map((row) => row.filter_slug)
        .join(",")}`,
    ],
  };
}

async function detectRefrigeratorModelFirstMappingReviewV1(
  rootDir: string,
): Promise<WorkDetectionResultV1> {
  const manifestRel = REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1;
  if (!filePresent(rootDir, manifestRel)) {
    return {
      kind: "unobserved",
      epistemic: "UNKNOWN",
      reason: "Refrigerator model-first input manifest missing",
      evidence: [manifestRel],
    };
  }
  const resolver = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir,
    manifestRelPath: manifestRel,
  });
  const mapping = resolver.inspect_summary.confidence_counts.MAPPING_REVIEW_REQUIRED;
  const unknown = resolver.inspect_summary.confidence_counts.UNKNOWN;
  if (mapping === 0 && unknown === 0) {
    return {
      kind: "no_work",
      evidence: [
        `models_checked_count=${String(resolver.inspect_summary.models_checked_count)}`,
        "MAPPING_REVIEW_REQUIRED=0",
        "UNKNOWN=0",
      ],
    };
  }
  return {
    kind: "work",
    bound_command: REFRIGERATOR_MODEL_FIRST_BATCH_RESOLVER_COMMAND_V1,
    authority_required: "canonical_source_command_constant",
    work_exists_epistemic: "PROVEN",
    evidence: [
      `MAPPING_REVIEW_REQUIRED=${String(mapping)}`,
      `UNKNOWN=${String(unknown)}`,
      `manifest=${manifestRel}`,
    ],
  };
}

async function detectApDemandSelectedOpenBatchV1(rootDir: string): Promise<WorkDetectionResultV1> {
  const registry = loadApDemandSelectedBatchRunRegistryV1({ rootDir });
  if (!isApDemandSelectedOpenBatchRegistryProvenOpenV1(registry)) {
    return {
      kind: "no_work",
      evidence: [
        `registry.status=${registry.status}`,
        `evidence_collection_started=${String(registry.evidence_collection_started)}`,
      ],
    };
  }
  return {
    kind: "work",
    bound_command: AP_OWNER_REVIEW_EXACT_COMMAND_V1,
    authority_required: "dispatch_allowlist_metadata",
    work_exists_epistemic: "PROVEN",
    evidence: [
      `run_id=${registry.run_id ?? "UNKNOWN"}`,
      `run_registry_rel_path=${registry.run_registry_rel_path ?? "UNKNOWN"}`,
      "evidence_collection_started=true",
    ],
  };
}

async function detectBatchLifecyclePlanningGapV1(rootDir: string): Promise<WorkDetectionResultV1> {
  const intake = buildBatchRunRegistryIntakeReportV1({ rootDir });
  const active = listActivePlanningRunRegistryWedgesV1(intake);
  const fridgeOpen =
    intake.fridge_run_registry_status === "AWAITING_OWNER_APPROVAL" ||
    intake.fridge_run_registry_status === "APPROVED_FOR_PLANNING_BUT_RUN_REGISTRY_MISSING" ||
    intake.fridge_run_registry_status === "MALFORMED_RUN_REGISTRY_NOT_MUTATION_READY" ||
    intake.fridge_run_registry_status === "PROVEN_PLANNING_RUN_REGISTRY";
  if (active.length === 0 && !fridgeOpen) {
    return {
      kind: "no_work",
      evidence: [
        `active_planning_wedges=0`,
        `fridge_run_registry_status=${intake.fridge_run_registry_status}`,
      ],
    };
  }
  return {
    kind: "work",
    bound_command: BATCH_RUN_REGISTRY_INTAKE_SOURCE_COMMAND_V1,
    authority_required: "canonical_source_command_constant",
    work_exists_epistemic: "PROVEN",
    evidence: [
      `active_planning_wedges=${active.map((w) => w.wedge).join(",") || "none"}`,
      `fridge_run_registry_status=${intake.fridge_run_registry_status}`,
    ],
  };
}

async function detectFridgeApplyPlanReviewV1(rootDir: string): Promise<WorkDetectionResultV1> {
  const report = buildFridgeBuyerPathBatchApplyPlanProposalV1({ rootDir });
  if (report.plan_status !== "READY_FOR_OWNER_REVIEW" || report.planned_change_count === 0) {
    return {
      kind: "no_work",
      evidence: [
        `plan_status=${report.plan_status}`,
        `planned_change_count=${String(report.planned_change_count)}`,
      ],
    };
  }
  return {
    kind: "work",
    bound_command: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_SOURCE_COMMAND_V1,
    authority_required: "canonical_source_command_constant",
    work_exists_epistemic: "PROVEN",
    evidence: [
      `plan_status=${report.plan_status}`,
      `planned_change_count=${String(report.planned_change_count)}`,
      `proposed_batch_id=${report.proposed_batch_id}`,
    ],
  };
}

async function detectFridgeApplyPlanApprovalV1(rootDir: string): Promise<WorkDetectionResultV1> {
  const rel = FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1;
  if (!filePresent(rootDir, rel)) {
    return {
      kind: "no_work",
      evidence: [`apply-plan artifact missing at ${rel}`],
    };
  }
  const report = buildFridgeBuyerPathBatchApplyPlanApprovalReportV1({ rootDir });
  if (report.approval_status !== "awaiting_owner_approval") {
    return {
      kind: "no_work",
      evidence: [`approval_status=${report.approval_status}`],
    };
  }
  return {
    kind: "work",
    bound_command: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_SOURCE_COMMAND_V1,
    authority_required: "canonical_source_command_constant",
    work_exists_epistemic: "PROVEN",
    evidence: [
      `approval_status=${report.approval_status}`,
      `planned_change_count=${String(report.planned_change_count)}`,
    ],
  };
}

async function detectRetailerLinkParityCorrectionV1(
  rootDir: string,
): Promise<WorkDetectionResultV1> {
  const intake = await buildRetailerLinkParityIssueIntakeV1({ rootDir });
  if (intake.blockers.some((b) => b.startsWith("unknown_or_db_unavailable"))) {
    return {
      kind: "unobserved",
      epistemic: "UNKNOWN",
      reason: "Retailer-link parity detector cannot observe Supabase",
      evidence: intake.blockers.slice(0, 4),
    };
  }
  if (intake.correctable_count === 0) {
    return {
      kind: "no_work",
      evidence: [
        `detected_count=${String(intake.detected_count)}`,
        "correctable_count=0",
      ],
    };
  }
  return {
    kind: "work",
    bound_command: "npm run buckparts:retailer-link-parity-correction -- --plan-dry-run",
    authority_required: "dispatch_allowlist_metadata",
    work_exists_epistemic: "PROVEN",
    evidence: [
      `correctable_count=${String(intake.correctable_count)}`,
      `detected_count=${String(intake.detected_count)}`,
      "plan-dry-run is the lawful next command; guarded apply is excluded from dispatch",
    ],
  };
}

async function detectDemandToCoverageNextWedgeV1(rootDir: string): Promise<WorkDetectionResultV1> {
  const report = await buildDemandToCoverageNextLaneV1Report({ rootDir });
  if (report.recommendation_status === "UNKNOWN" || report.recommended_wedge === "UNKNOWN") {
    return {
      kind: "unobserved",
      epistemic: "UNKNOWN",
      reason: "Demand-to-coverage recommendation is UNKNOWN (GSC or coverage inputs missing)",
      evidence: report.blockers.slice(0, 4),
    };
  }
  return {
    kind: "work",
    bound_command: "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts",
    authority_required: "dispatch_allowlist_metadata",
    work_exists_epistemic: "PROVEN",
    evidence: [
      `recommendation_status=${report.recommendation_status}`,
      `recommended_wedge=${report.recommended_wedge}`,
      `next_lane=${report.next_lane}`,
    ],
  };
}

export const EXECUTIVE_WORK_DETECTORS_V1: readonly ExecutiveWorkDetectorV1[] = [
  {
    work_id: "issue_registry_open",
    business_objective: "Advance open Command Center trust/coverage issues to proven closure",
    detect: detectIssueRegistryOpenV1,
  },
  {
    work_id: "owner_decision_pending",
    business_objective: "Resolve explicit pending founder decisions that block automation",
    detect: detectOwnerDecisionPendingV1,
  },
  {
    work_id: "safe_buyer_path_rescue",
    business_objective: "Close proven-safe-buyer-path gaps on live-eligible product pages",
    detect: detectSafeBuyerPathRescueV1,
  },
  {
    work_id: "ap_model_first_evidence",
    business_objective: "Collect read-only model-first evidence for weak air-purifier buyer paths",
    detect: detectApModelFirstEvidenceV1,
  },
  {
    work_id: "ap_model_first_mapping_review",
    business_objective: "Reconcile air-purifier model-to-filter mapping after committed evidence",
    detect: detectApModelFirstMappingReviewV1,
  },
  {
    work_id: "refrigerator_model_first_mapping_review",
    business_objective: "Resolve refrigerator official-filter mapping unknowns before commerce changes",
    detect: detectRefrigeratorModelFirstMappingReviewV1,
  },
  {
    work_id: "ap_demand_selected_open_batch",
    business_objective: "Continue the open air-purifier demand-selected evidence-collection batch",
    detect: detectApDemandSelectedOpenBatchV1,
  },
  {
    work_id: "batch_lifecycle_planning_gap",
    business_objective: "Advance an open wedge batch through planning-registry lifecycle without mutation",
    detect: detectBatchLifecyclePlanningGapV1,
  },
  {
    work_id: "fridge_buyer_path_apply_plan_review",
    business_objective: "Owner-review a ready fridge buyer-path apply-plan (planning only; not CSV apply)",
    detect: detectFridgeApplyPlanReviewV1,
  },
  {
    work_id: "fridge_buyer_path_apply_plan_approval",
    business_objective: "Record founder approval for a fridge buyer-path apply-plan artifact",
    detect: detectFridgeApplyPlanApprovalV1,
  },
  {
    work_id: "retailer_link_parity_correction",
    business_objective: "Plan UPDATE corrections for drifted Supabase retailer_links from proven CSV/evidence wins",
    detect: detectRetailerLinkParityCorrectionV1,
  },
  {
    work_id: "demand_to_coverage_next_wedge",
    business_objective: "Identify the next Homekeep wedge from proven demand-versus-coverage signals",
    detect: detectDemandToCoverageNextWedgeV1,
  },
];

function missingWorkSourcesV1(rootDir: string): ExecutiveWorkMissingSourceV1[] {
  return [
    {
      source_id: "package_json_buckparts_scripts",
      epistemic: "PROVEN",
      present_on_head: true,
      why_missing:
        "package.json buckparts:* scripts are commands, not work. Scraping them would invent work items.",
      evidence: ["package.json"],
    },
    {
      source_id: "canonical_final_operating_decision_v1",
      epistemic: "UNKNOWN",
      present_on_head: "UNKNOWN",
      why_missing:
        "Live Command Center NBA winner is ranking. This slice does not rebuild Command Center.",
      evidence: ["command_center_rebuilt=false"],
    },
    {
      source_id: "manufacturer_browser_proof_directors",
      epistemic: "INFERRED",
      present_on_head: true,
      why_missing:
        "Manufacturer-rescue directors exist as CC orchestration islands; no standalone work-exists boolean is imported here.",
      evidence: ["data/ops/control-plane-audit/buckparts-control-plane-capability-audit-v1.json"],
    },
    {
      source_id: "executive_worker_registry",
      epistemic: "PROVEN",
      present_on_head: filePresent(rootDir, "scripts/lib/buckparts-executive-worker-registry-v1.ts"),
      why_missing: "Worker registry is not a work detector and is not on this HEAD.",
      evidence: ["scripts/lib/buckparts-executive-worker-registry-v1.ts"],
    },
    {
      source_id: "fridge_expansion_worker_v1",
      epistemic: "PROVEN",
      present_on_head: filePresent(rootDir, "scripts/run-buckparts-fridge-expansion-worker-v1.ts"),
      why_missing: "Fridge Expansion Worker v1 is not on this HEAD and is not imported as invented work.",
      evidence: ["scripts/run-buckparts-fridge-expansion-worker-v1.ts"],
    },
    {
      source_id: "buckparts_runner_mission_halt_work",
      epistemic: "PROVEN",
      present_on_head: true,
      why_missing:
        "Runner halt work exists only after a mission runs. Standing Work Discovery does not invent runner-halt items.",
      evidence: ["scripts/lib/buckparts-runner-v1.ts"],
    },
    {
      source_id: "seo_revenue_distribution_opportunity_registries",
      epistemic: "PROVEN",
      present_on_head: true,
      why_missing: "Opportunity registries rank coverage/revenue ideas; they are not proven executable work.",
      evidence: ["command_center opportunity registry lanes"],
    },
  ];
}

export async function discoverExecutiveWorkV1(args: {
  rootDir?: string;
  nowIso?: string;
  detectors?: readonly ExecutiveWorkDetectorV1[];
} = {}): Promise<ExecutiveWorkDiscoverySnapshotV1> {
  const rootDir = args.rootDir ?? process.cwd();
  const nowIso = args.nowIso ?? new Date().toISOString();
  const detectors = args.detectors ?? EXECUTIVE_WORK_DETECTORS_V1;
  const package_scripts = loadPackageScriptsV1(rootDir);
  const work: ExecutiveDiscoveredWorkV1[] = [];
  const unobserved_detectors: ExecutiveWorkUnobservedDetectorV1[] = [];

  for (const detector of detectors) {
    let detected: WorkDetectionResultV1;
    try {
      detected = await detector.detect(rootDir);
    } catch (error: unknown) {
      unobserved_detectors.push({
        detector_id: detector.work_id,
        epistemic: "UNKNOWN",
        reason: error instanceof Error ? error.message : String(error),
        evidence: ["detector threw; fail closed — work is not invented from the exception"],
      });
      continue;
    }

    if (detected.kind === "unobserved") {
      unobserved_detectors.push({
        detector_id: detector.work_id,
        epistemic: detected.epistemic,
        reason: detected.reason,
        evidence: detected.evidence,
      });
      continue;
    }
    if (detected.kind === "no_work") {
      continue;
    }

    const judged = bindWorkExactCommandV1({
      rootDir,
      exact_command: detected.bound_command,
      package_scripts,
    });
    const executable = judged.eligibility === true;
    work.push({
      work_id: detector.work_id,
      business_objective: detector.business_objective,
      executable,
      blocking_reason: executable ? null : judged.ineligible_reason,
      exact_command: executable ? detected.bound_command : null,
      authority_required: detected.authority_required,
      evidence: [
        ...detected.evidence,
        ...judged.evidence_used,
        executable
          ? "work_exists=true and exact_command is dispatch-eligible"
          : `work_exists=true; not executable now (${judged.ineligible_reason ?? "UNKNOWN"})`,
      ],
      work_exists_epistemic: detected.work_exists_epistemic,
      executable_epistemic: judged.eligibility_epistemic,
    });
  }

  const executable_work = work.filter((item) => item.executable === true);

  return {
    contract: EXECUTIVE_WORK_DISCOVERY_CONTRACT_V1,
    report_name: EXECUTIVE_WORK_DISCOVERY_REPORT_NAME_V1,
    generated_at: nowIso,
    observation_kind: "business_work_set",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    nba_authority: false,
    dispatch_authority: false,
    dispatch_invoked: false,
    steering_authority: false,
    ranking_performed: false,
    command_center_rebuilt: false,
    outcome_join_consulted: false,
    catalog_epistemic: "PROVEN",
    completeness_epistemic: "PROVEN",
    completeness_status: "INCOMPLETE",
    executive_can_know_every_work_today: false,
    work,
    executable_work,
    unobserved_detectors,
    missing_work_sources: missingWorkSourcesV1(rootDir),
    scale_counts: {
      closed_detectors: detectors.length,
      discovered_work: work.length,
      executable_work: executable_work.length,
      unobserved_detectors: unobserved_detectors.length,
    },
  };
}
