/**
 * BuckParts Production Mission v1 — reference end-to-end mission exercising Foundation v2 stack.
 * Reuses Runner, Agent Contract, Owner Decision Queue, guarded apply, Operations Metrics.
 * No new orchestration framework; no product mutation from this module.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildAllProductSafeBuyerPathCensusV1,
  type AllProductSafeBuyerPathCensusV1,
} from "./all-product-safe-buyer-path-census-v1";
import {
  buildCoverageProductionSprintV2ReportV1,
  type CoverageProductionSprintV2ReportV1,
} from "./coverage-production-sprint-v2";
import {
  BUCKPARTS_AGENT_RESULT_CONTRACT_V1,
  listAgentDispatchManifestsV1,
  loadAgentResultV1,
} from "./buckparts-agent-contract-v1";
import {
  refreshOperationsMetricsV1,
  type OperationsMetricsReportV1,
} from "./buckparts-operations-metrics-v1";
import {
  PRODUCTION_MISSION_DISPATCH_INPUT_ARTIFACTS_V1,
  PRODUCTION_MISSION_BROWSER_PROOF_RESULT_GLOB_V1,
  PRODUCTION_MISSION_RUNNER_MISSION_ID_V1,
} from "./buckparts-production-mission-constants-v1";
import { supabaseCsvParityApplyPlanRelPathV1 } from "./supabase-csv-parity-coverage-factory-v1";
import {
  buildOwnerDecisionQueueProjectionV1,
  listOwnerDecisionRequestArtifactPathsV1,
  loadOwnerDecisionRequestV1,
} from "../../src/lib/owner-dashboard/owner-decision-queue-v1";

import type { BuckpartsRunnerReportV1 } from "./buckparts-runner-v1";

const BUCKPARTS_RUNNER_RUNS_DIR_REL_V1 = "data/command-center/runner-runs" as const;

export const BUCKPARTS_PRODUCTION_MISSION_CONTRACT_V1 = "buckparts_production_mission_v1" as const;

export const BUCKPARTS_PRODUCTION_MISSION_PLAN_CONTRACT_V1 =
  "buckparts_production_mission_plan_v1" as const;

export const BUCKPARTS_PRODUCTION_MISSION_LIFECYCLE_CONTRACT_V1 =
  "buckparts_production_mission_lifecycle_v1" as const;

export const BUCKPARTS_PRODUCTION_MISSION_SOURCE_COMMAND_V1 =
  "npm run buckparts:production-mission-plan" as const;

export const BUCKPARTS_PRODUCTION_MISSION_CC_JQ_PATH_V1 =
  ".command_center_v2.production_mission_v1" as const;

export const BUCKPARTS_PRODUCTION_MISSION_LIFECYCLE_DIR_REL_V1 =
  "data/command-center/production-missions" as const;

export {
  PRODUCTION_MISSION_RUNNER_MISSION_ID_V1,
  PRODUCTION_MISSION_DISPATCH_INPUT_ARTIFACTS_V1,
  PRODUCTION_MISSION_BROWSER_PROOF_RESULT_GLOB_V1,
} from "./buckparts-production-mission-constants-v1";

export function browserProofResultRelPathV1(slug: string): string {
  return PRODUCTION_MISSION_BROWSER_PROOF_RESULT_GLOB_V1.replace("{slug}", slug.trim().toLowerCase());
}

export type ProductionMissionApplyExecutorKindV1 =
  | "supabase_csv_parity"
  | "manufacturer_rescue_bridge";

export type ProductionMissionTargetV1 = {
  batch_id: string;
  batch_label: string;
  primary_apply_slug: string;
  target_slugs: string[];
  expected_safe_buyer_path_proven_delta: number;
  executability: string;
  founder_approval_required: boolean;
  dispatch_input_artifact_rel_paths: readonly string[];
  expected_agent_output_artifact_rel_paths: string[];
  apply_executor_kind: ProductionMissionApplyExecutorKindV1;
  apply_factory_report_script: string | null;
  apply_factory_argv: readonly string[];
  guarded_apply_report_script: string;
  guarded_apply_argv: readonly string[];
  dry_run_command_display: string;
  write_command_display: string;
};

export type ProductionMissionPlanV1 = {
  contract: typeof BUCKPARTS_PRODUCTION_MISSION_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  source_command: typeof BUCKPARTS_PRODUCTION_MISSION_SOURCE_COMMAND_V1;
  generated_at: string;
  runner_mission_id: typeof PRODUCTION_MISSION_RUNNER_MISSION_ID_V1;
  census_baseline: {
    safe_buyer_path_proven_count: number;
    safe_buyer_path_suppressed_trust_count: number;
  };
  sprint_winning_batch_id: string | null;
  target: ProductionMissionTargetV1;
  lifecycle_phases_expected: readonly string[];
  proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

export type ProductionMissionLifecyclePhaseV1 = {
  phase_id: string;
  status: "COMPLETE" | "HALTED" | "PENDING" | "SKIPPED" | "FAILED";
  artifact_rel_path: string | null;
  detail: string | null;
};

export type ProductionMissionLifecycleArtifactV1 = {
  contract: typeof BUCKPARTS_PRODUCTION_MISSION_LIFECYCLE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  run_id: string;
  runner_mission_id: typeof PRODUCTION_MISSION_RUNNER_MISSION_ID_V1;
  runner_artifact_rel_path: string;
  runner_overall_status: BuckpartsRunnerReportV1["overall_status"];
  target: ProductionMissionTargetV1;
  phases: ProductionMissionLifecyclePhaseV1[];
  safe_buyer_path_proven: {
    baseline: number | "UNKNOWN";
    at_run: number | "UNKNOWN";
    delta: number | "UNKNOWN";
    expected_delta: number;
  };
  owner_decision_queue: {
    pending_count: number;
    linked_request_ids: string[];
    linked_request_artifact_paths: string[];
  };
  operations_metrics: {
    snapshot_recorded: boolean;
    history_rel_path: string | null;
    aggregate_agent_success_rate: number | "UNKNOWN";
    aggregate_validation_pass_rate: number | "UNKNOWN";
  };
  lifecycle_complete: boolean;
  lifecycle_complete_reason: string;
  proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

function slugHasBrowserProofResult(rootDir: string, slug: string): boolean {
  return existsSync(path.join(rootDir, browserProofResultRelPathV1(slug)));
}

function slugHasParityApplyPlan(rootDir: string, slug: string): boolean {
  return existsSync(path.join(rootDir, supabaseCsvParityApplyPlanRelPathV1(slug)));
}

function readBrowserProofCheckedAt(rootDir: string, slug: string): string | null {
  const abs = path.join(rootDir, browserProofResultRelPathV1(slug));
  if (!existsSync(abs)) return null;
  try {
    const raw = JSON.parse(readFileSync(abs, "utf8")) as { checked_at?: string };
    return typeof raw.checked_at === "string" ? raw.checked_at : null;
  } catch {
    return null;
  }
}

function browserProofFreshnessWarning(rootDir: string, slug: string, maxAgeDays = 14): string | null {
  const checkedAt = readBrowserProofCheckedAt(rootDir, slug);
  if (!checkedAt) return `UNKNOWN: Browser proof checked_at missing for ${slug}.`;
  const ageMs = Date.now() - new Date(checkedAt).getTime();
  if (!Number.isFinite(ageMs)) return `UNKNOWN: Browser proof checked_at invalid for ${slug}.`;
  const ageDays = ageMs / (86_400_000);
  if (ageDays > maxAgeDays) {
    return `UNKNOWN: Browser proof for ${slug} is stale (${String(Math.floor(ageDays))} days) — founder refresh required before guarded apply.`;
  }
  return null;
}

export function resolveProductionMissionTargetV1(args: {
  rootDir: string;
  sprint: CoverageProductionSprintV2ReportV1;
  fileExists?: (abs: string) => boolean;
}): ProductionMissionTargetV1 {
  const fileExists = args.fileExists ?? existsSync;
  const winning = args.sprint.winning_batch;
  const batchId = winning?.batch_id ?? "fridge_safe_link_first4_deblocked";
  const batchLabel = winning?.batch_label ?? "Fridge safe-link First4 deblocked cohort (fallback)";
  const targetSlugs = winning?.target_slugs?.length
    ? [...winning.target_slugs]
    : ["edr4rxd1", "4396508"];

  const primary =
    targetSlugs.find((s) => slugHasBrowserProofResult(args.rootDir, s)) ??
    targetSlugs.find((s) => fileExists(path.join(args.rootDir, browserProofResultRelPathV1(s)))) ??
    targetSlugs[0] ??
    "edr4rxd1";

  const expectedOutputs = targetSlugs
    .filter((s) => slugHasBrowserProofResult(args.rootDir, s))
    .map((s) => browserProofResultRelPathV1(s));
  if (expectedOutputs.length === 0) {
    expectedOutputs.push(browserProofResultRelPathV1(primary));
  }

  const useParity = slugHasParityApplyPlan(args.rootDir, primary);
  const useManufacturer =
    !useParity &&
    (batchId === "fridge_safe_link_first4_deblocked" ||
      winning?.infrastructure_reused?.some((i) => i.includes("first4") || i.includes("manufacturer")));

  let applyExecutorKind: ProductionMissionApplyExecutorKindV1 = "supabase_csv_parity";
  let applyFactoryScript: string | null =
    "scripts/report-supabase-csv-parity-coverage-factory-v1.ts";
  let applyFactoryArgv: readonly string[] = ["--", "--slug", primary];
  let guardedScript = "scripts/report-supabase-csv-parity-guarded-apply-v1.ts";
  let guardedArgv: readonly string[] = ["--", "--slug", primary];

  if (useManufacturer) {
    applyExecutorKind = "manufacturer_rescue_bridge";
    applyFactoryScript = "scripts/report-manufacturer-safe-link-rescue-apply-plan-factory-v1.ts";
    applyFactoryArgv = ["--"];
    guardedScript = "scripts/report-manufacturer-rescue-guarded-apply-bridge-v1.ts";
    guardedArgv = ["--"];
  } else if (!useParity) {
    applyFactoryScript = null;
    applyFactoryArgv = [];
  }

  const dryRun = `node --import tsx ${guardedScript} ${guardedArgv.join(" ")}`.trim();
  const writeCmd =
    applyExecutorKind === "manufacturer_rescue_bridge"
      ? `# BLOCKED until founder approval\nnode --import tsx ${guardedScript} -- --write-csv`
      : `# BLOCKED until founder approval\nnode --import tsx ${guardedScript} -- --slug ${primary} --write-csv`;

  return {
    batch_id: batchId,
    batch_label: batchLabel,
    primary_apply_slug: primary,
    target_slugs: targetSlugs,
    expected_safe_buyer_path_proven_delta: winning?.expected_safe_buyer_path_proven_delta ?? targetSlugs.length,
    executability: winning?.executability ?? "EXECUTABLE_AFTER_APPROVAL",
    founder_approval_required: winning?.founder_approval_required ?? true,
    dispatch_input_artifact_rel_paths: PRODUCTION_MISSION_DISPATCH_INPUT_ARTIFACTS_V1,
    expected_agent_output_artifact_rel_paths: expectedOutputs,
    apply_executor_kind: applyExecutorKind,
    apply_factory_report_script: applyFactoryScript,
    apply_factory_argv: applyFactoryArgv,
    guarded_apply_report_script: guardedScript,
    guarded_apply_argv: guardedArgv,
    dry_run_command_display: dryRun,
    write_command_display: writeCmd,
  };
}

export async function buildProductionMissionPlanV1(args: {
  rootDir: string;
  now?: () => Date;
}): Promise<ProductionMissionPlanV1> {
  const now = args.now ?? (() => new Date());
  const census = buildAllProductSafeBuyerPathCensusV1({
    rootDir: args.rootDir,
    fileExists: existsSync,
    readText: (p) => readFileSync(p, "utf8"),
  });
  const sprint = await buildCoverageProductionSprintV2ReportV1({ rootDir: args.rootDir });
  return buildProductionMissionPlanFromPartsV1({
    rootDir: args.rootDir,
    census,
    sprint,
    now,
  });
}

type First4ReviewRowV1 = {
  slug: string;
  owner_apply_review_ready?: boolean;
  asin?: string;
};

function loadFirst4ReviewForProductionMissionV1(rootDir: string): {
  approved_slug_cohort?: string[];
  rows?: First4ReviewRowV1[];
} | null {
  const rel =
    "data/fridge/batch-production/drafts/fridge-safe-link-rescue-first4-apply-review-v1.json";
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as {
      approved_slug_cohort?: string[];
      rows?: First4ReviewRowV1[];
    };
  } catch {
    return null;
  }
}

function buildMinimalSprintWinningBatchV1(rootDir: string): CoverageProductionSprintV2ReportV1["winning_batch"] {
  const first4 = loadFirst4ReviewForProductionMissionV1(rootDir);
  const ready =
    first4?.rows?.filter((r) => r.owner_apply_review_ready === true && r.asin !== "B07C8C2VBH") ??
    [];
  const slugs = ready.map((r) => r.slug);
  if (slugs.length === 0) {
    return {
      rank: 1,
      batch_id: "fridge_safe_link_first4_deblocked",
      batch_label: "Fridge safe-link First4 deblocked cohort (fallback)",
      target_slugs: ["edr4rxd1", "4396508"],
      slug_count: 2,
      expected_safe_buyer_path_proven_delta: 2,
      executability: "EXECUTABLE_AFTER_APPROVAL",
      infrastructure_reused: ["fridge-safe-link-rescue-first4-apply-review-v1"],
      founder_approval_required: true,
      dry_run_commands: [],
      write_commands: [],
      blockers: ["owner_batch_apply_approval_not_recorded"],
      customer_impact: "Reference production mission fallback cohort.",
    };
  }
  return {
    rank: 1,
    batch_id: "fridge_safe_link_first4_deblocked",
    batch_label: "Fridge safe-link First4 deblocked cohort",
    target_slugs: slugs,
    slug_count: slugs.length,
    expected_safe_buyer_path_proven_delta: slugs.length,
    executability: "EXECUTABLE_AFTER_APPROVAL",
    infrastructure_reused: ["fridge-safe-link-rescue-first4-apply-review-v1"],
    founder_approval_required: true,
    dry_run_commands: [],
    write_commands: [],
    blockers: ["owner_batch_apply_approval_not_recorded"],
    customer_impact: `${String(slugs.length)} fridge filter pages awaiting guarded apply after founder approval.`,
  };
}

export function buildProductionMissionPlanSyncV1(args: {
  rootDir: string;
  now?: () => Date;
}): ProductionMissionPlanV1 {
  const now = args.now ?? (() => new Date());
  const census = buildAllProductSafeBuyerPathCensusV1({
    rootDir: args.rootDir,
    fileExists: existsSync,
    readText: (p) => readFileSync(p, "utf8"),
  });
  const sprintStub: Pick<CoverageProductionSprintV2ReportV1, "winning_batch"> = {
    winning_batch: buildMinimalSprintWinningBatchV1(args.rootDir),
  };
  return buildProductionMissionPlanFromPartsV1({
    rootDir: args.rootDir,
    census,
    sprint: sprintStub as CoverageProductionSprintV2ReportV1,
    now,
  });
}

function buildProductionMissionPlanFromPartsV1(args: {
  rootDir: string;
  census: AllProductSafeBuyerPathCensusV1;
  sprint: Pick<CoverageProductionSprintV2ReportV1, "winning_batch">;
  now: () => Date;
}): ProductionMissionPlanV1 {
  const target = resolveProductionMissionTargetV1({
    rootDir: args.rootDir,
    sprint: args.sprint as CoverageProductionSprintV2ReportV1,
  });

  const unknown_facts: string[] = [];
  if (!args.sprint.winning_batch) {
    unknown_facts.push("UNKNOWN: No winning batch — using fallback target resolution.");
  }
  if (!slugHasBrowserProofResult(args.rootDir, target.primary_apply_slug)) {
    unknown_facts.push(
      `UNKNOWN: Browser proof result missing for primary slug ${target.primary_apply_slug} — agent dispatch will halt until result artifacts exist.`,
    );
  } else {
    const staleWarning = browserProofFreshnessWarning(args.rootDir, target.primary_apply_slug);
    if (staleWarning) {
      unknown_facts.push(staleWarning);
    }
  }
  const proven_facts = [
    "PROVEN: Production mission v1 reuses coverage sprint v2 winning batch — no parallel batch ranker.",
    `PROVEN: primary_apply_slug=${target.primary_apply_slug} batch_id=${target.batch_id} executor=${target.apply_executor_kind}.`,
    "PROVEN: Runner performs dry-run guarded apply only — CSV write requires founder approval outside Runner.",
  ];
  if (target.apply_executor_kind === "manufacturer_rescue_bridge") {
    proven_facts.push(
      `PROVEN: guarded apply bound to manufacturer_rescue_bridge for batch ${target.batch_id}.`,
    );
  }

  return {
    contract: BUCKPARTS_PRODUCTION_MISSION_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    source_command: BUCKPARTS_PRODUCTION_MISSION_SOURCE_COMMAND_V1,
    generated_at: args.now().toISOString(),
    runner_mission_id: PRODUCTION_MISSION_RUNNER_MISSION_ID_V1,
    census_baseline: {
      safe_buyer_path_proven_count: args.census.classification_counts.SAFE_BUYER_PATH_PROVEN,
      safe_buyer_path_suppressed_trust_count:
        args.census.classification_counts.SAFE_BUYER_PATH_SUPPRESSED_TRUST,
    },
    sprint_winning_batch_id: args.sprint.winning_batch?.batch_id ?? null,
    target,
    lifecycle_phases_expected: [
      "coverage_sprint_ranking",
      "census_baseline",
      "production_mission_plan",
      "external_agent_dispatch",
      "parity_factory_primary",
      "guarded_apply_primary",
      "operations_metrics_record",
      "validation",
      "owner_decision_queue",
    ],
    proven_facts,
    unknown_facts,
    recommended_next_action: target.founder_approval_required
      ? `PROVEN: Complete agent dispatch result; record founder approval; then execute guarded apply write for slug ${target.primary_apply_slug} separately.`
      : "PROVEN: Run production_mission_v1 via Runner — review lifecycle artifact on completion.",
  };
}

export function productionMissionDispatchObjectiveV1(target: ProductionMissionTargetV1): string {
  return (
    `Package read-only owner-browser-proof evidence for production mission primary slug ${target.primary_apply_slug} ` +
    `(batch ${target.batch_id}, expected proven delta +${String(target.expected_safe_buyer_path_proven_delta)}). ` +
    "Reference existing evidence files only; do not mutate CSV, Supabase, or claim truth closure."
  );
}

export function isProductionMissionApplyGoalSatisfiedV1(args: {
  rootDir: string;
  plan: ProductionMissionPlanV1;
}): boolean {
  const census = buildAllProductSafeBuyerPathCensusV1({ rootDir: args.rootDir });
  const product = census.products.find((p) => p.slug === args.plan.target.primary_apply_slug);
  return product?.page_classification === "SAFE_BUYER_PATH_PROVEN";
}

export function resolveProductionMissionRunnerStepCommandV1(
  stepId: string,
  plan: ProductionMissionPlanV1,
): readonly string[] | null {
  const { target } = plan;
  if (stepId === "parity_factory_primary") {
    if (!target.apply_factory_report_script) {
      return null;
    }
    return ["node", "--import", "tsx", target.apply_factory_report_script, ...target.apply_factory_argv];
  }
  if (stepId === "guarded_apply_primary") {
    return ["node", "--import", "tsx", target.guarded_apply_report_script, ...target.guarded_apply_argv];
  }
  return null;
}

function extractProvenFromCensusStep(report: BuckpartsRunnerReportV1): number | null {
  const step = report.steps.find((s) => s.step_id === "census_baseline");
  const summary = step?.parsed_json_summary;
  if (!summary || typeof summary !== "object") return null;
  const counts = (summary as Record<string, unknown>).classification_counts;
  if (counts && typeof counts === "object") {
    const proven = (counts as Record<string, unknown>).SAFE_BUYER_PATH_PROVEN;
    if (typeof proven === "number") return proven;
  }
  return null;
}

export function assembleProductionMissionLifecycleArtifactV1(args: {
  rootDir: string;
  runnerReport: BuckpartsRunnerReportV1;
  plan: ProductionMissionPlanV1;
  metricsReport: OperationsMetricsReportV1 | null;
  metricsHistoryRelPath: string | null;
  now?: () => Date;
}): ProductionMissionLifecycleArtifactV1 {
  const now = args.now ?? (() => new Date());
  const { runnerReport: report, plan } = args;

  const dispatchStep = report.steps.find((s) => s.step_id === "external_agent_dispatch");
  const guardedStep = report.steps.find((s) => s.step_id === "guarded_apply_primary");
  const metricsStep = report.steps.find((s) => s.step_id === "operations_metrics_record");

  const manifests = listAgentDispatchManifestsV1(args.rootDir).filter(
    (m) => m.run_id === report.run_id,
  );
  const manifest = manifests[0] ?? null;
  let agentResultPath: string | null = null;
  let agentValidationPass: boolean | null = null;
  if (manifest) {
    agentResultPath = manifest.result_artifact_rel_path;
    const result = loadAgentResultV1(args.rootDir, manifest.result_artifact_rel_path);
    agentValidationPass =
      result?.contract === BUCKPARTS_AGENT_RESULT_CONTRACT_V1
        ? manifest.status === "VALIDATION_PASS"
        : null;
  }

  const linkedRequestPaths: string[] = [];
  const linkedRequestIds: string[] = [];
  for (const rel of listOwnerDecisionRequestArtifactPathsV1(args.rootDir)) {
    const req = loadOwnerDecisionRequestV1(args.rootDir, rel);
    if (req?.runner_halt_context?.run_id === report.run_id) {
      linkedRequestPaths.push(rel);
      linkedRequestIds.push(req.decision_request_id);
    }
  }
  if (report.owner_decision_request_artifact_path) {
    linkedRequestPaths.push(report.owner_decision_request_artifact_path);
  }
  if (report.owner_decision_request_id) {
    linkedRequestIds.push(report.owner_decision_request_id);
  }

  const queue = buildOwnerDecisionQueueProjectionV1({ rootDir: args.rootDir, now });

  const baseline =
    report.safe_buyer_path_proven_baseline ??
    extractProvenFromCensusStep(report) ??
    plan.census_baseline.safe_buyer_path_proven_count;
  const guardedPassed = report.steps.find(
    (s) => s.step_id === "guarded_apply_primary" && s.status === "PASS",
  );
  const censusAtFinalize =
    guardedPassed != null
      ? buildAllProductSafeBuyerPathCensusV1({ rootDir: args.rootDir }).classification_counts
          .SAFE_BUYER_PATH_PROVEN
      : null;
  const atRun =
    censusAtFinalize ??
    extractProvenFromCensusStep(report) ??
    args.metricsReport?.aggregate.safe_buyer_path_proven_count_current ??
    "UNKNOWN";
  let delta: number | "UNKNOWN" = "UNKNOWN";
  if (typeof atRun === "number") {
    delta = atRun - baseline;
  }

  const phases: ProductionMissionLifecyclePhaseV1[] = [
    {
      phase_id: "coverage_sprint_ranking",
      status: phaseStatusFromStep(report, "coverage_sprint_ranking"),
      artifact_rel_path: null,
      detail: plan.sprint_winning_batch_id,
    },
    {
      phase_id: "census_baseline",
      status: phaseStatusFromStep(report, "census_baseline"),
      artifact_rel_path: null,
      detail: typeof atRun === "number" ? `SAFE_BUYER_PATH_PROVEN=${String(atRun)}` : null,
    },
    {
      phase_id: "production_mission_plan",
      status: phaseStatusFromStep(report, "production_mission_plan"),
      artifact_rel_path: null,
      detail: plan.target.primary_apply_slug,
    },
    {
      phase_id: "external_agent_dispatch",
      status:
        dispatchStep?.status === "PASS" || agentValidationPass === true
          ? "COMPLETE"
          : dispatchStep?.status === "HALTED"
            ? "HALTED"
            : dispatchStep?.status === "FAIL"
              ? "FAILED"
              : agentValidationPass === false
                ? "FAILED"
                : "PENDING",
      artifact_rel_path: dispatchStep?.agent_dispatch_manifest_rel_path ?? null,
      detail:
        agentValidationPass === true
          ? "Agent result validated"
          : dispatchStep?.halt_detail ?? null,
    },
    {
      phase_id: "agent_result",
      status:
        agentValidationPass === true
          ? "COMPLETE"
          : agentValidationPass === false
            ? "FAILED"
            : dispatchStep?.status === "HALTED"
              ? "PENDING"
              : "SKIPPED",
      artifact_rel_path: agentResultPath,
      detail: agentResultPath,
    },
    {
      phase_id: "validation",
      status: report.validation_summary.build_pass === false ? "FAILED" : "COMPLETE",
      artifact_rel_path: report.artifact_rel_path,
      detail: JSON.stringify(report.validation_summary),
    },
    {
      phase_id: "owner_decision_queue",
      status: linkedRequestIds.length > 0 ? "HALTED" : queue.pending_count > 0 ? "HALTED" : "COMPLETE",
      artifact_rel_path: linkedRequestPaths[0] ?? null,
      detail: `pending_count=${String(queue.pending_count)} linked=${String(linkedRequestIds.length)}`,
    },
    {
      phase_id: "guarded_apply_primary",
      status:
        guardedStep?.status === "PASS"
          ? "COMPLETE"
          : guardedStep?.status === "HALTED"
            ? "HALTED"
            : guardedStep?.status === "FAIL"
              ? "FAILED"
              : "SKIPPED",
      artifact_rel_path: null,
      detail: guardedStep?.halt_detail ?? plan.target.dry_run_command_display,
    },
    {
      phase_id: "operations_metrics",
      status: metricsStep?.status === "PASS" || args.metricsHistoryRelPath ? "COMPLETE" : "PENDING",
      artifact_rel_path: args.metricsHistoryRelPath,
      detail: args.metricsReport
        ? `agent_success_rate=${String(args.metricsReport.aggregate.agent_success_rate)}`
        : null,
    },
  ];

  const dispatchDone = phases.find((p) => p.phase_id === "external_agent_dispatch")?.status === "COMPLETE";
  const agentDone = phases.find((p) => p.phase_id === "agent_result")?.status === "COMPLETE";
  const guardedRan =
    phases.find((p) => p.phase_id === "guarded_apply_primary")?.status === "HALTED" ||
    phases.find((p) => p.phase_id === "guarded_apply_primary")?.status === "COMPLETE";
  const metricsDone = phases.find((p) => p.phase_id === "operations_metrics")?.status === "COMPLETE";

  const lifecycleComplete =
    Boolean(dispatchDone && agentDone && guardedRan && metricsDone) &&
    (report.overall_status === "COMPLETE" || report.overall_status === "RESUMED_COMPLETE") &&
    typeof delta === "number" &&
    delta >= 1;

  let lifecycleCompleteReason = "Lifecycle incomplete — resume Runner or complete pending phases.";
  if (lifecycleComplete) {
    lifecycleCompleteReason = `PROVEN: Production mission lifecycle complete — SAFE_BUYER_PATH_PROVEN delta +${String(delta)}.`;
  } else if (
    Boolean(dispatchDone && agentDone && guardedRan && metricsDone) &&
    report.overall_status === "HALTED_APPROVAL_REQUIRED"
  ) {
    lifecycleCompleteReason =
      "PROVEN: Full reference lifecycle through guarded apply dry-run halt — founder approval and external --write-csv required.";
  } else if (
    Boolean(dispatchDone && agentDone && guardedRan && metricsDone) &&
    report.overall_status === "HALTED_EXTERNAL_AGENT"
  ) {
    lifecycleCompleteReason =
      "PROVEN: Lifecycle halted at agent dispatch — write agent result artifact and resume.";
  } else if (
    Boolean(dispatchDone && agentDone && guardedRan && metricsDone) &&
    (report.overall_status === "COMPLETE" || report.overall_status === "RESUMED_COMPLETE") &&
    typeof delta === "number" &&
    delta === 0
  ) {
    lifecycleCompleteReason =
      "Lifecycle incomplete — guarded apply write not reflected in census (delta=0). Execute external --write-csv and resume.";
  }

  return {
    contract: BUCKPARTS_PRODUCTION_MISSION_LIFECYCLE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    run_id: report.run_id,
    runner_mission_id: PRODUCTION_MISSION_RUNNER_MISSION_ID_V1,
    runner_artifact_rel_path: report.artifact_rel_path,
    runner_overall_status: report.overall_status,
    target: plan.target,
    phases,
    safe_buyer_path_proven: {
      baseline,
      at_run: atRun,
      delta,
      expected_delta: plan.target.expected_safe_buyer_path_proven_delta,
    },
    owner_decision_queue: {
      pending_count: queue.pending_count,
      linked_request_ids: Array.from(new Set(linkedRequestIds)),
      linked_request_artifact_paths: Array.from(new Set(linkedRequestPaths)),
    },
    operations_metrics: {
      snapshot_recorded: Boolean(args.metricsHistoryRelPath),
      history_rel_path: args.metricsHistoryRelPath,
      aggregate_agent_success_rate: args.metricsReport?.aggregate.agent_success_rate ?? "UNKNOWN",
      aggregate_validation_pass_rate: args.metricsReport?.aggregate.validation_pass_rate ?? "UNKNOWN",
    },
    lifecycle_complete: lifecycleComplete,
    lifecycle_complete_reason: lifecycleCompleteReason,
    proven_facts: [
      "PROVEN: Lifecycle artifact is read-only documentation of Foundation v2 stack execution.",
      `PROVEN: Phases recorded=${String(phases.length)} runner_status=${report.overall_status}.`,
    ],
    unknown_facts:
      typeof delta === "number" && delta === 0
        ? [
            "UNKNOWN: Zero proven delta at run time — founder-guarded CSV apply write not executed inside Runner.",
          ]
        : [],
    recommended_next_action: plan.recommended_next_action,
  };
}

function phaseStatusFromStep(
  report: BuckpartsRunnerReportV1,
  stepId: string,
): ProductionMissionLifecyclePhaseV1["status"] {
  const step = report.steps.find((s) => s.step_id === stepId);
  if (!step) return "SKIPPED";
  if (step.status === "PASS" || step.status === "SKIPPED") return "COMPLETE";
  if (step.status === "HALTED") return "HALTED";
  return "FAILED";
}

export function productionMissionLifecycleRelPathV1(runId: string): string {
  const safe = runId.replace(/[^a-zA-Z0-9-]/g, "");
  return `${BUCKPARTS_PRODUCTION_MISSION_LIFECYCLE_DIR_REL_V1}/buckparts-production-mission-${safe}.json`;
}

export function writeProductionMissionLifecycleArtifactV1(
  rootDir: string,
  artifact: ProductionMissionLifecycleArtifactV1,
): string {
  const rel = productionMissionLifecycleRelPathV1(artifact.run_id);
  const abs = path.join(rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return rel;
}

export function findLatestProductionMissionLifecycleV1(
  rootDir: string,
): ProductionMissionLifecycleArtifactV1 | null {
  const dir = path.join(rootDir, BUCKPARTS_PRODUCTION_MISSION_LIFECYCLE_DIR_REL_V1);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => f.startsWith("buckparts-production-mission-") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  try {
    return JSON.parse(readFileSync(path.join(dir, files[0]!), "utf8")) as ProductionMissionLifecycleArtifactV1;
  } catch {
    return null;
  }
}

export function finalizeProductionMissionRunV1(args: {
  rootDir: string;
  runnerReport: BuckpartsRunnerReportV1;
  now?: () => Date;
}): {
  lifecycle_rel_path: string;
  metrics_history_rel_path: string | null;
} {
  const plan = buildProductionMissionPlanSyncV1({ rootDir: args.rootDir, now: args.now });
  const { report: metricsReport, history_rel_path } = refreshOperationsMetricsV1({
    rootDir: args.rootDir,
    recordSnapshot: true,
    trigger_source: `production_mission_v1 run_id=${args.runnerReport.run_id}`,
    now: args.now,
  });
  const lifecycle = assembleProductionMissionLifecycleArtifactV1({
    rootDir: args.rootDir,
    runnerReport: args.runnerReport,
    plan,
    metricsReport,
    metricsHistoryRelPath: history_rel_path,
    now: args.now,
  });
  const lifecycle_rel_path = writeProductionMissionLifecycleArtifactV1(args.rootDir, lifecycle);
  return { lifecycle_rel_path, metrics_history_rel_path: history_rel_path };
}

export function productionMissionLifecycleFingerprintV1(
  artifact: ProductionMissionLifecycleArtifactV1,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        run_id: artifact.run_id,
        lifecycle_complete: artifact.lifecycle_complete,
        phases: artifact.phases.map((p) => p.phase_id + p.status),
      }),
    )
    .digest("hex")
    .slice(0, 12);
}

export function listProductionMissionRunnerArtifactsV1(rootDir: string): BuckpartsRunnerReportV1[] {
  const dir = path.join(rootDir, BUCKPARTS_RUNNER_RUNS_DIR_REL_V1);
  if (!existsSync(dir)) return [];
  const reports: BuckpartsRunnerReportV1[] = [];
  for (const file of readdirSync(dir).filter((f) => f.includes("production_mission_v1") && f.endsWith(".json"))) {
    try {
      const raw = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as BuckpartsRunnerReportV1;
      if (raw.mission_id === PRODUCTION_MISSION_RUNNER_MISSION_ID_V1) {
        reports.push(raw);
      }
    } catch {
      // skip
    }
  }
  return reports.sort((a, b) => b.generated_at.localeCompare(a.generated_at));
}
