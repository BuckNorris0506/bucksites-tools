/**
 * BuckParts Runner v1 — mission orchestration over existing read-only reports and validation.
 * Does not bypass founder approval, guarded apply, or mutation gates.
 */

import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1 } from "./buckparts-runner-safety-contract-v1";
import { RUNNER_STEP_LAYER_TRUTH_V1, tailTextV1 } from "./buckparts-runner-step-v1";
import {
  executeAgentDispatchStepV1,
  validateAgentDispatchStepConfigV1,
  type AgentDispatchStepConfigV1,
} from "./buckparts-agent-contract-v1";
import {
  ownerDecisionRequestApprovalSatisfiesRunnerGateV1,
  upsertOwnerDecisionRequestFromRunnerHaltV1,
} from "../../src/lib/owner-dashboard/owner-decision-queue-v1";
import {
  PRODUCTION_MISSION_DISPATCH_INPUT_ARTIFACTS_V1,
  PRODUCTION_MISSION_RUNNER_MISSION_ID_V1,
} from "./buckparts-production-mission-constants-v1";
import {
  buildProductionMissionPlanSyncV1,
  isProductionMissionApplyGoalSatisfiedV1,
  productionMissionDispatchObjectiveV1,
  resolveProductionMissionRunnerStepCommandV1,
  type ProductionMissionPlanV1,
} from "./buckparts-production-mission-v1";

export const BUCKPARTS_RUNNER_CONTRACT_V1 = "buckparts_runner_v1" as const;

export const BUCKPARTS_RUNNER_SOURCE_COMMAND_V1 = "npm run buckparts:runner" as const;

export const BUCKPARTS_RUNNER_RUNS_DIR_REL_V1 = "data/command-center/runner-runs" as const;

export const BUCKPARTS_RUNNER_CHECKPOINTS_DIR_REL_V1 =
  "data/command-center/runner-checkpoints" as const;

export const BUCKPARTS_RUNNER_CC_JQ_PATH_V1 = ".command_center_v2.buckparts_runner_v1" as const;

export type BuckpartsRunnerMissionIdV1 =
  | "coverage_sprint_v1"
  | "evidence_sprint_v1"
  | "safe_link_sprint_v1"
  | "production_mission_v1";

export type RunnerStepKindV1 = "tsx_report" | "npm_run" | "agent_dispatch";

export type RunnerHaltReasonV1 =
  | "FOUNDER_APPROVAL_REQUIRED"
  | "MUTATION_GATE_BLOCKED"
  | "EXTERNAL_AGENT_REQUIRED"
  | "DISPATCH_EXHAUSTED"
  | "STEP_FAILED"
  | "RESUME_MISMATCH";

export type RunnerOverallStatusV1 =
  | "COMPLETE"
  | "HALTED_APPROVAL_REQUIRED"
  | "HALTED_EXTERNAL_AGENT"
  | "HALTED_MUTATION_GATE"
  | "FAILED"
  | "RESUMED_COMPLETE";

export type RunnerStepHaltPolicyV1 =
  | "none"
  | "founder_approval_if_mutation_blocked"
  | "external_agent_if_dispatch_requires"
  | "fail_on_nonzero_exit";

export type RunnerStepPhaseV1 = "analysis" | "validation";

export type RunnerStepDefinitionV1 = {
  step_id: string;
  title: string;
  kind: RunnerStepKindV1;
  phase: RunnerStepPhaseV1;
  /** argv[0] must be node or npm — never shell strings. */
  command?: readonly string[];
  /** Required when kind=agent_dispatch — vendor-agnostic external handoff config. */
  dispatch?: AgentDispatchStepConfigV1;
  halt_policy: RunnerStepHaltPolicyV1;
  /** When set, step is skipped on resume if already in checkpoint.completed_step_ids. */
  idempotent: boolean;
  provenance: string;
};

export type BuckpartsRunnerMissionDefinitionV1 = {
  mission_id: BuckpartsRunnerMissionIdV1;
  title: string;
  description: string;
  read_only: true;
  data_mutation: false;
  steps: RunnerStepDefinitionV1[];
  validation_step_ids: string[];
  proven_facts: string[];
};

export type RunnerStepResultV1 = {
  step_id: string;
  title: string;
  kind: RunnerStepKindV1;
  status: "PASS" | "FAIL" | "SKIPPED" | "HALTED";
  exit_code: number | null;
  duration_ms: number;
  command_display: string;
  stdout_excerpt: string;
  stderr_excerpt: string;
  parsed_json_summary: unknown | null;
  halt_reason: RunnerHaltReasonV1 | null;
  halt_detail: string | null;
  owner_decision_request_id?: string | null;
  owner_decision_request_artifact_path?: string | null;
  agent_dispatch_manifest_rel_path?: string | null;
  agent_result_rel_path?: string | null;
  agent_validation_pass?: boolean | null;
};

export type BuckpartsRunnerCheckpointV1 = {
  contract: "buckparts_runner_checkpoint_v1";
  run_id: string;
  mission_id: BuckpartsRunnerMissionIdV1;
  started_at: string;
  updated_at: string;
  completed_step_ids: string[];
  last_halt_reason: RunnerHaltReasonV1 | null;
  last_halt_step_id: string | null;
  safe_buyer_path_proven_baseline?: number | null;
};

export type BuckpartsRunnerReportV1 = {
  contract: typeof BUCKPARTS_RUNNER_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof BUCKPARTS_RUNNER_CC_JQ_PATH_V1;
  source_command: typeof BUCKPARTS_RUNNER_SOURCE_COMMAND_V1;
  generated_at: string;
  run_id: string;
  mission_id: BuckpartsRunnerMissionIdV1;
  mission_title: string;
  resumed_from_checkpoint: boolean;
  overall_status: RunnerOverallStatusV1;
  layer_truth: typeof RUNNER_STEP_LAYER_TRUTH_V1;
  steps: RunnerStepResultV1[];
  completed_step_ids: string[];
  pending_step_ids: string[];
  halt_reason: RunnerHaltReasonV1 | null;
  halt_step_id: string | null;
  halt_detail: string | null;
  owner_decision_request_id: string | null;
  owner_decision_request_artifact_path: string | null;
  validation_summary: {
    lint_pass: boolean | "SKIPPED";
    build_pass: boolean | "SKIPPED";
    tests_pass: boolean | "SKIPPED";
    deploy_classifier_ran: boolean;
    security_gate_ran: boolean;
  };
  artifact_rel_path: string;
  checkpoint_rel_path: string;
  recommended_next_action: string;
  resume_command: string | null;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  production_mission_lifecycle_artifact_path?: string | null;
  operations_metrics_snapshot_recorded?: boolean;
  safe_buyer_path_proven_baseline?: number | null;
};

export type RunnerSpawnResultV1 = {
  exit_code: number | null;
  stdout: string;
  stderr: string;
};

export type RunnerSpawnFnV1 = (command: readonly string[], cwd: string) => RunnerSpawnResultV1;

const FORBIDDEN_ARG_PATTERNS_V1 = [
  "--apply",
  "--write-csv",
  "--mutate",
  "--supabase-apply",
  "supabase db",
  "git push",
  "git commit",
] as const;

const MISSION_NPM_READ_ONLY_ALLOWLIST_V1 = [
  ...RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1,
  "buckparts:deploy-classifier",
] as const;

function tsxReportStep(
  step_id: string,
  title: string,
  scriptRel: string,
  halt_policy: RunnerStepHaltPolicyV1,
  phase: RunnerStepPhaseV1,
  extraArgs: readonly string[] = [],
): RunnerStepDefinitionV1 {
  return {
    step_id,
    title,
    kind: "tsx_report",
    phase,
    command: ["node", "--import", "tsx", scriptRel, ...extraArgs],
    halt_policy,
    idempotent: true,
    provenance: scriptRel,
  };
}

export const BUCKPARTS_RUNNER_MISSIONS_V1: Record<
  BuckpartsRunnerMissionIdV1,
  BuckpartsRunnerMissionDefinitionV1
> = {
  coverage_sprint_v1: {
    mission_id: "coverage_sprint_v1",
    title: "Coverage Sprint",
    description:
      "Demand-to-coverage selection, SAFE_BUYER_PATH census, rescue readiness, Supabase-vs-CSV diff, guarded apply dry-run, validation, deploy classifier, security gate.",
    read_only: true,
    data_mutation: false,
    steps: [
      tsxReportStep(
        "demand_to_coverage",
        "Demand-to-coverage next lane",
        "scripts/report-buckparts-demand-to-coverage-next-lane.ts",
        "none",
        "analysis",
      ),
      tsxReportStep(
        "safe_buyer_path_census",
        "All-product SAFE_BUYER_PATH census",
        "scripts/report-all-product-safe-buyer-path-census-v1.ts",
        "none",
        "analysis",
      ),
      tsxReportStep(
        "rescue_readiness_gate",
        "Manufacturer safe-link rescue readiness gate",
        "scripts/report-manufacturer-safe-link-rescue-readiness-gate-v1.ts",
        "founder_approval_if_mutation_blocked",
        "analysis",
      ),
      tsxReportStep(
        "fridge_supabase_csv_diff",
        "Fridge Supabase vs CSV retailer_links diff",
        "scripts/report-fridge-supabase-vs-csv-retailer-links-diff-v1.ts",
        "founder_approval_if_mutation_blocked",
        "analysis",
      ),
      tsxReportStep(
        "lifecycle_guarded_apply_dry_run",
        "Universal batch lifecycle guarded CSV apply (dry-run)",
        "scripts/report-universal-batch-lifecycle-guarded-csv-apply-executor-v1.ts",
        "founder_approval_if_mutation_blocked",
        "analysis",
      ),
      {
        step_id: "validation_lint",
        title: "Validation — lint",
        kind: "npm_run",
        phase: "validation",
        command: ["npm", "run", "lint"],
        halt_policy: "fail_on_nonzero_exit",
        idempotent: true,
        provenance: "npm run lint",
      },
      {
        step_id: "validation_build",
        title: "Validation — build",
        kind: "npm_run",
        phase: "validation",
        command: ["npm", "run", "build"],
        halt_policy: "fail_on_nonzero_exit",
        idempotent: true,
        provenance: "npm run build",
      },
      {
        step_id: "validation_tests",
        title: "Validation — targeted runner/census tests",
        kind: "tsx_report",
        phase: "validation",
        command: [
          "node",
          "--import",
          "tsx",
          "--test",
          "scripts/lib/buckparts-runner-v1.test.ts",
          "scripts/lib/buckparts-agent-contract-v1.test.ts",
          "scripts/lib/all-product-safe-buyer-path-census-v1.test.ts",
        ],
        halt_policy: "fail_on_nonzero_exit",
        idempotent: true,
        provenance: "node --import tsx --test (runner + census)",
      },
      tsxReportStep(
        "deploy_classifier",
        "Deploy classifier (working tree)",
        "scripts/report-buckparts-deploy-classifier-v1.ts",
        "none",
        "validation",
        ["--", "--working-tree"],
      ),
      tsxReportStep(
        "security_gate",
        "BuckParts security gate",
        "scripts/report-buckparts-security-gate-v1.ts",
        "none",
        "validation",
      ),
    ],
    validation_step_ids: [
      "validation_lint",
      "validation_build",
      "validation_tests",
      "deploy_classifier",
      "security_gate",
    ],
    proven_facts: [
      "PROVEN: Coverage sprint uses only read-only report scripts and validation npm targets.",
      "PROVEN: Guarded CSV apply executor runs dry-run only — no --write-csv in mission definition.",
    ],
  },
  evidence_sprint_v1: {
    mission_id: "evidence_sprint_v1",
    title: "Evidence Sprint",
    description:
      "Batch production operating checklist, demand-selected batch lane, external agent dispatch when discovery evidence is required.",
    read_only: true,
    data_mutation: false,
    steps: [
      tsxReportStep(
        "batch_production_lane",
        "Air purifier batch production lane",
        "scripts/report-air-purifier-batch-production-lane-v1.ts",
        "none",
        "analysis",
      ),
      tsxReportStep(
        "demand_to_coverage",
        "Demand-to-coverage next lane",
        "scripts/report-buckparts-demand-to-coverage-next-lane.ts",
        "none",
        "analysis",
      ),
      {
        step_id: "external_agent_dispatch",
        title: "External agent dispatch — read-only evidence collection",
        kind: "agent_dispatch",
        phase: "analysis",
        halt_policy: "external_agent_if_dispatch_requires",
        idempotent: false,
        provenance:
          "data/air-purifier/batch-production/run-registry/ap-demand-selected-batch-run-v1-2026-06-23.json",
        dispatch: {
          template_id: "read_only_evidence_collection_v1",
          input_artifact_rel_paths: [
            "data/air-purifier/batch-production/run-registry/ap-demand-selected-batch-run-v1-2026-06-23.json",
          ],
          objective_summary:
            "Collect read-only browser/discovery evidence for demand-selected batch per run-registry; do not promote buy links or mutate product data.",
        },
      },
      {
        step_id: "validation_lint",
        title: "Validation — lint",
        kind: "npm_run",
        phase: "validation",
        command: ["npm", "run", "lint"],
        halt_policy: "fail_on_nonzero_exit",
        idempotent: true,
        provenance: "npm run lint",
      },
      {
        step_id: "validation_build",
        title: "Validation — build",
        kind: "npm_run",
        phase: "validation",
        command: ["npm", "run", "build"],
        halt_policy: "fail_on_nonzero_exit",
        idempotent: true,
        provenance: "npm run build",
      },
      tsxReportStep(
        "deploy_classifier",
        "Deploy classifier (working tree)",
        "scripts/report-buckparts-deploy-classifier-v1.ts",
        "none",
        "validation",
        ["--", "--working-tree"],
      ),
    ],
    validation_step_ids: ["validation_lint", "validation_build", "deploy_classifier"],
    proven_facts: [
      "PROVEN: Evidence sprint never sets evidence_write_authorized or csv_apply_authorized.",
      "PROVEN: External agent dispatch step halts with EXTERNAL_AGENT_REQUIRED until validated result artifact is on disk.",
    ],
  },
  safe_link_sprint_v1: {
    mission_id: "safe_link_sprint_v1",
    title: "Safe-Link Sprint",
    description:
      "Manufacturer rescue read-only factory chain through readiness gate and guarded apply bridge dry-run.",
    read_only: true,
    data_mutation: false,
    steps: [
      tsxReportStep(
        "rescue_orchestrator",
        "Manufacturer safe-link rescue orchestrator",
        "scripts/report-manufacturer-safe-link-rescue-orchestrator-v1.ts",
        "none",
        "analysis",
      ),
      tsxReportStep(
        "rescue_director",
        "Manufacturer safe-link rescue director",
        "scripts/report-manufacturer-safe-link-rescue-director-v1.ts",
        "none",
        "analysis",
      ),
      tsxReportStep(
        "rescue_runner",
        "Manufacturer safe-link rescue runner",
        "scripts/report-manufacturer-safe-link-rescue-runner-v1.ts",
        "none",
        "analysis",
      ),
      tsxReportStep(
        "rescue_readiness_gate",
        "Manufacturer safe-link rescue readiness gate",
        "scripts/report-manufacturer-safe-link-rescue-readiness-gate-v1.ts",
        "founder_approval_if_mutation_blocked",
        "analysis",
      ),
      tsxReportStep(
        "rescue_guarded_apply_bridge",
        "Manufacturer rescue guarded apply bridge (dry-run)",
        "scripts/report-manufacturer-rescue-guarded-apply-bridge-v1.ts",
        "founder_approval_if_mutation_blocked",
        "analysis",
      ),
      {
        step_id: "validation_lint",
        title: "Validation — lint",
        kind: "npm_run",
        phase: "validation",
        command: ["npm", "run", "lint"],
        halt_policy: "fail_on_nonzero_exit",
        idempotent: true,
        provenance: "npm run lint",
      },
      {
        step_id: "validation_build",
        title: "Validation — build",
        kind: "npm_run",
        phase: "validation",
        command: ["npm", "run", "build"],
        halt_policy: "fail_on_nonzero_exit",
        idempotent: true,
        provenance: "npm run build",
      },
      tsxReportStep(
        "deploy_classifier",
        "Deploy classifier (working tree)",
        "scripts/report-buckparts-deploy-classifier-v1.ts",
        "none",
        "validation",
        ["--", "--working-tree"],
      ),
    ],
    validation_step_ids: ["validation_lint", "validation_build", "deploy_classifier"],
    proven_facts: [
      "PROVEN: Safe-link sprint reuses existing rescue factories — no parallel orchestrator.",
      "PROVEN: Guarded apply bridge runs without mutation flags.",
    ],
  },
  production_mission_v1: {
    mission_id: "production_mission_v1",
    title: "Production Mission (Reference)",
    description:
      "End-to-end Foundation v2 reference: sprint ranking, census, mission plan, agent dispatch, parity factory, guarded apply dry-run, operations metrics, validation. Lifecycle artifact written on completion.",
    read_only: true,
    data_mutation: false,
    steps: [
      tsxReportStep(
        "coverage_sprint_ranking",
        "Coverage production sprint v2 — batch ranking",
        "scripts/report-coverage-production-sprint-v2.ts",
        "none",
        "analysis",
      ),
      tsxReportStep(
        "census_baseline",
        "SAFE_BUYER_PATH census baseline",
        "scripts/report-all-product-safe-buyer-path-census-v1.ts",
        "none",
        "analysis",
      ),
      tsxReportStep(
        "production_mission_plan",
        "Production mission plan resolver",
        "scripts/report-buckparts-production-mission-plan-v1.ts",
        "none",
        "analysis",
      ),
      {
        step_id: "external_agent_dispatch",
        title: "External agent dispatch — evidence packaging",
        kind: "agent_dispatch",
        phase: "analysis",
        halt_policy: "external_agent_if_dispatch_requires",
        idempotent: false,
        provenance: "buckparts_production_mission_v1 agent contract handoff",
        dispatch: {
          template_id: "read_only_evidence_collection_v1",
          input_artifact_rel_paths: [...PRODUCTION_MISSION_DISPATCH_INPUT_ARTIFACTS_V1],
          objective_summary:
            "Package read-only owner-browser-proof evidence for production mission primary slug per mission plan; reference drafts under data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-*.json; do not mutate CSV or claim truth closure.",
        },
      },
      tsxReportStep(
        "parity_factory_primary",
        "Apply plan factory — primary slug",
        "scripts/report-supabase-csv-parity-coverage-factory-v1.ts",
        "none",
        "analysis",
        ["--", "--slug", "PLACEHOLDER"],
      ),
      tsxReportStep(
        "guarded_apply_primary",
        "Guarded apply — primary slug (dry-run)",
        "scripts/report-supabase-csv-parity-guarded-apply-v1.ts",
        "founder_approval_if_mutation_blocked",
        "analysis",
        ["--", "--slug", "PLACEHOLDER"],
      ),
      tsxReportStep(
        "operations_metrics_record",
        "Operations metrics projection",
        "scripts/report-buckparts-operations-metrics-v1.ts",
        "none",
        "analysis",
      ),
      {
        step_id: "validation_lint",
        title: "Validation — lint",
        kind: "npm_run",
        phase: "validation",
        command: ["npm", "run", "lint"],
        halt_policy: "fail_on_nonzero_exit",
        idempotent: true,
        provenance: "npm run lint",
      },
      {
        step_id: "validation_build",
        title: "Validation — build",
        kind: "npm_run",
        phase: "validation",
        command: ["npm", "run", "build"],
        halt_policy: "fail_on_nonzero_exit",
        idempotent: true,
        provenance: "npm run build",
      },
      {
        step_id: "validation_tests",
        title: "Validation — production mission + foundation tests",
        kind: "tsx_report",
        phase: "validation",
        command: [
          "node",
          "--import",
          "tsx",
          "--test",
          "scripts/lib/buckparts-production-mission-v1.test.ts",
          "scripts/lib/buckparts-agent-contract-v1.test.ts",
          "scripts/lib/buckparts-operations-metrics-v1.test.ts",
        ],
        halt_policy: "fail_on_nonzero_exit",
        idempotent: true,
        provenance: "node --import tsx --test (production mission + foundation)",
      },
      tsxReportStep(
        "deploy_classifier",
        "Deploy classifier (working tree)",
        "scripts/report-buckparts-deploy-classifier-v1.ts",
        "none",
        "validation",
        ["--", "--working-tree"],
      ),
      tsxReportStep(
        "security_gate",
        "BuckParts security gate",
        "scripts/report-buckparts-security-gate-v1.ts",
        "none",
        "validation",
      ),
    ],
    validation_step_ids: [
      "validation_lint",
      "validation_build",
      "validation_tests",
      "deploy_classifier",
      "security_gate",
    ],
    proven_facts: [
      "PROVEN: Production mission v1 is the reference implementation for all future BuckParts production missions.",
      "PROVEN: Agent dispatch, owner decision queue, guarded apply dry-run, and operations metrics snapshot run without new orchestration frameworks.",
      "PROVEN: Measurable SAFE_BUYER_PATH_PROVEN delta requires founder-approved guarded apply write outside Runner.",
    ],
  },
};

export function listBuckpartsRunnerMissionIdsV1(): BuckpartsRunnerMissionIdV1[] {
  return Object.keys(BUCKPARTS_RUNNER_MISSIONS_V1) as BuckpartsRunnerMissionIdV1[];
}

export function getBuckpartsRunnerMissionV1(
  missionId: string,
): BuckpartsRunnerMissionDefinitionV1 | null {
  if (!(missionId in BUCKPARTS_RUNNER_MISSIONS_V1)) {
    return null;
  }
  return BUCKPARTS_RUNNER_MISSIONS_V1[missionId as BuckpartsRunnerMissionIdV1];
}

export function commandDisplayV1(command: readonly string[]): string {
  return command.join(" ");
}

export function validateRunnerStepCommandV1(step: RunnerStepDefinitionV1): string[] {
  const errors: string[] = [];
  if (step.kind === "agent_dispatch") {
    if (!step.dispatch) {
      errors.push(`${step.step_id}: agent_dispatch steps require dispatch config`);
    } else {
      errors.push(
        ...validateAgentDispatchStepConfigV1(step.dispatch).map(
          (e) => `${step.step_id}: ${e}`,
        ),
      );
    }
    return errors;
  }
  if (!step.command || step.command.length < 2) {
    errors.push(`${step.step_id}: command must have at least two argv entries`);
    return errors;
  }
  const joined = step.command.join(" ");
  for (const forbidden of FORBIDDEN_ARG_PATTERNS_V1) {
    if (joined.includes(forbidden)) {
      errors.push(`${step.step_id}: forbidden argv pattern ${forbidden}`);
    }
  }
  const head = step.command[0];
  if (head === "node") {
    if (step.command[1] !== "--import" || step.command[2] !== "tsx") {
      errors.push(`${step.step_id}: node steps must use node --import tsx`);
    }
    const scriptIdx = step.command[3] === "--test" ? 4 : 3;
    const scriptPath = step.command[scriptIdx];
    if (!scriptPath?.startsWith("scripts/")) {
      errors.push(`${step.step_id}: script path must be under scripts/`);
    }
  } else if (head === "npm") {
    if (step.command[1] !== "run") {
      errors.push(`${step.step_id}: npm steps must be npm run <script>`);
    } else {
      const script = step.command[2];
      if (
        !script ||
        !(MISSION_NPM_READ_ONLY_ALLOWLIST_V1 as readonly string[]).includes(script)
      ) {
        errors.push(
          `${step.step_id}: npm script ${String(script)} not in mission read-only allowlist`,
        );
      }
    }
  } else {
    errors.push(`${step.step_id}: command must start with node or npm`);
  }
  return errors;
}

export function validateMissionDefinitionV1(mission: BuckpartsRunnerMissionDefinitionV1): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const step of mission.steps) {
    if (ids.has(step.step_id)) {
      errors.push(`duplicate step_id ${step.step_id}`);
    }
    ids.add(step.step_id);
    errors.push(...validateRunnerStepCommandV1(step));
  }
  return errors;
}

function safeParseJson(stdout: string): unknown | null {
  const trimmed = stdout.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function readJsonField(obj: unknown, field: string): unknown {
  if (!obj || typeof obj !== "object") {
    return undefined;
  }
  return (obj as Record<string, unknown>)[field];
}

function asBoolean(value: unknown): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

export function evaluateStepHaltV1(args: {
  step: RunnerStepDefinitionV1;
  parsed_json: unknown | null;
  exit_code: number | null;
}): { halt: boolean; reason: RunnerHaltReasonV1 | null; detail: string | null } {
  const { step, parsed_json, exit_code } = args;

  if (step.halt_policy === "fail_on_nonzero_exit") {
    if (exit_code !== 0) {
      return {
        halt: true,
        reason: "STEP_FAILED",
        detail: `exit_code=${String(exit_code)}`,
      };
    }
    return { halt: false, reason: null, detail: null };
  }

  if (step.kind === "agent_dispatch") {
    return { halt: false, reason: null, detail: null };
  }

  if (step.halt_policy !== "founder_approval_if_mutation_blocked") {
    return { halt: false, reason: null, detail: null };
  }

  if (!parsed_json || typeof parsed_json !== "object") {
    return { halt: false, reason: null, detail: null };
  }

  const mutationAuthorized = asBoolean(readJsonField(parsed_json, "mutation_authorized"));
  const csvApplyAuthorized = asBoolean(readJsonField(parsed_json, "csv_apply_authorized"));
  const applyExecutorReady = asBoolean(readJsonField(parsed_json, "apply_executor_ready"));
  const ownerApprovalRequired = asBoolean(readJsonField(parsed_json, "owner_approval_required"));
  const readyForApplyCount = readJsonField(parsed_json, "ready_for_apply_count");
  const supabaseWinMissing = readJsonField(parsed_json, "supabase_has_win_csv_missing_count");
  const executorStatus = readJsonField(parsed_json, "executor_status");
  const bridgeStatus = readJsonField(parsed_json, "bridge_status");

  if (mutationAuthorized === true) {
    return { halt: false, reason: null, detail: null };
  }

  if (
    typeof readyForApplyCount === "number" &&
    readyForApplyCount > 0 &&
    mutationAuthorized === false
  ) {
    return {
      halt: true,
      reason: "FOUNDER_APPROVAL_REQUIRED",
      detail: `ready_for_apply_count=${String(readyForApplyCount)} but mutation_authorized=false`,
    };
  }

  if (
    typeof supabaseWinMissing === "number" &&
    supabaseWinMissing > 0 &&
    mutationAuthorized === false
  ) {
    return {
      halt: true,
      reason: "FOUNDER_APPROVAL_REQUIRED",
      detail: `supabase_has_win_csv_missing_count=${String(supabaseWinMissing)} — founder CSV export approval required before apply`,
    };
  }

  if (applyExecutorReady === false || executorStatus === "BLOCKED" || bridgeStatus === "BLOCKED") {
    return {
      halt: true,
      reason: "MUTATION_GATE_BLOCKED",
      detail:
        ownerApprovalRequired === true
          ? "Guarded apply not ready — owner approval required"
          : "Guarded apply executor or bridge blocked",
    };
  }

  if (csvApplyAuthorized === false && ownerApprovalRequired === true) {
    return {
      halt: true,
      reason: "FOUNDER_APPROVAL_REQUIRED",
      detail: "csv_apply_authorized=false with owner_approval_required=true",
    };
  }

  if (
    bridgeStatus === "DRY_RUN_READY" &&
    mutationAuthorized === false &&
    step.halt_policy === "founder_approval_if_mutation_blocked"
  ) {
    return {
      halt: true,
      reason: "FOUNDER_APPROVAL_REQUIRED",
      detail: "Guarded apply dry-run ready — founder external --write-csv required before census delta",
    };
  }

  const writeCsvBlocked = asBoolean(readJsonField(parsed_json, "write_csv_blocked_until_founder_approval"));
  if (
    writeCsvBlocked === true &&
    mutationAuthorized === false &&
    step.halt_policy === "founder_approval_if_mutation_blocked"
  ) {
    return {
      halt: true,
      reason: "FOUNDER_APPROVAL_REQUIRED",
      detail: "write_csv_blocked_until_founder_approval=true — execute guarded apply --write-csv externally",
    };
  }

  return { halt: false, reason: null, detail: null };
}

export function executeRunnerStepV1(args: {
  step: RunnerStepDefinitionV1;
  cwd: string;
  spawnFn: RunnerSpawnFnV1;
  tailChars?: number;
  skip?: boolean;
  missionId?: BuckpartsRunnerMissionIdV1;
  runId?: string;
  now?: () => Date;
  writeArtifacts?: boolean;
}): RunnerStepResultV1 {
  const tailChars = args.tailChars ?? 12_000;
  const started = Date.now();

  if (args.skip) {
    return {
      step_id: args.step.step_id,
      title: args.step.title,
      kind: args.step.kind,
      status: "SKIPPED",
      exit_code: null,
      duration_ms: 0,
      command_display: args.step.command ? commandDisplayV1(args.step.command) : args.step.provenance,
      stdout_excerpt: "",
      stderr_excerpt: tailTextV1("PROVEN SKIPPED: step already completed in checkpoint.", 500),
      parsed_json_summary: null,
      halt_reason: null,
      halt_detail: null,
    };
  }

  if (args.step.kind === "agent_dispatch") {
    if (!args.step.dispatch) {
      return {
        step_id: args.step.step_id,
        title: args.step.title,
        kind: args.step.kind,
        status: "FAIL",
        exit_code: 1,
        duration_ms: Date.now() - started,
        command_display: args.step.provenance,
        stdout_excerpt: "",
        stderr_excerpt: "agent_dispatch step missing dispatch config",
        parsed_json_summary: null,
        halt_reason: "STEP_FAILED",
        halt_detail: "agent_dispatch step missing dispatch config",
      };
    }

    const dispatchOutcome = executeAgentDispatchStepV1({
      rootDir: args.cwd,
      runId: args.runId ?? "unknown-run",
      missionId: args.missionId ?? "unknown-mission",
      stepId: args.step.step_id,
      stepTitle: args.step.title,
      config: args.step.dispatch,
      writeArtifacts: args.writeArtifacts !== false,
      now: args.now,
    });

    if (dispatchOutcome.runner_status === "PASS") {
      return {
        step_id: args.step.step_id,
        title: args.step.title,
        kind: args.step.kind,
        status: "PASS",
        exit_code: 0,
        duration_ms: Date.now() - started,
        command_display: args.step.provenance,
        stdout_excerpt: tailTextV1(
          JSON.stringify({
            contract: dispatchOutcome.manifest.contract,
            manifest_id: dispatchOutcome.manifest.manifest_id,
            validation_pass: dispatchOutcome.validation?.validation_pass ?? true,
          }),
          2000,
        ),
        stderr_excerpt: "",
        parsed_json_summary: {
          manifest_id: dispatchOutcome.manifest.manifest_id,
          validation_pass: true,
        },
        halt_reason: null,
        halt_detail: null,
        agent_dispatch_manifest_rel_path: dispatchOutcome.manifest_rel_path,
        agent_result_rel_path: dispatchOutcome.result_rel_path,
        agent_validation_pass: true,
      };
    }

    if (dispatchOutcome.runner_status === "HALTED") {
      return {
        step_id: args.step.step_id,
        title: args.step.title,
        kind: args.step.kind,
        status: "HALTED",
        exit_code: 0,
        duration_ms: Date.now() - started,
        command_display: args.step.provenance,
        stdout_excerpt: tailTextV1(
          JSON.stringify({
            manifest_rel_path: dispatchOutcome.manifest_rel_path,
            result_artifact_rel_path: dispatchOutcome.manifest.result_artifact_rel_path,
          }),
          2000,
        ),
        stderr_excerpt: "",
        parsed_json_summary: null,
        halt_reason: dispatchOutcome.halt_reason,
        halt_detail: dispatchOutcome.halt_detail,
        agent_dispatch_manifest_rel_path: dispatchOutcome.manifest_rel_path,
        agent_result_rel_path: dispatchOutcome.result_rel_path,
        agent_validation_pass: dispatchOutcome.validation?.validation_pass ?? null,
      };
    }

    return {
      step_id: args.step.step_id,
      title: args.step.title,
      kind: args.step.kind,
      status: "FAIL",
      exit_code: 1,
      duration_ms: Date.now() - started,
      command_display: args.step.provenance,
      stdout_excerpt: "",
      stderr_excerpt: dispatchOutcome.halt_detail ?? "dispatch exhausted",
      parsed_json_summary: null,
      halt_reason: dispatchOutcome.halt_reason ?? "DISPATCH_EXHAUSTED",
      halt_detail: dispatchOutcome.halt_detail,
      agent_dispatch_manifest_rel_path: dispatchOutcome.manifest_rel_path,
      agent_result_rel_path: dispatchOutcome.result_rel_path,
      agent_validation_pass: false,
    };
  }

  const command = args.step.command!;
  const validationErrors = validateRunnerStepCommandV1(args.step);
  if (validationErrors.length > 0) {
    return {
      step_id: args.step.step_id,
      title: args.step.title,
      kind: args.step.kind,
      status: "FAIL",
      exit_code: 1,
      duration_ms: Date.now() - started,
      command_display: commandDisplayV1(command),
      stdout_excerpt: "",
      stderr_excerpt: validationErrors.join("; "),
      parsed_json_summary: null,
      halt_reason: "STEP_FAILED",
      halt_detail: validationErrors.join("; "),
    };
  }

  const spawnResult = args.spawnFn(command, args.cwd);
  const parsed = safeParseJson(spawnResult.stdout);
  const haltEval = evaluateStepHaltV1({
    step: args.step,
    parsed_json: parsed,
    exit_code: spawnResult.exit_code,
  });

  let status: RunnerStepResultV1["status"] = "PASS";
  let haltReason: RunnerHaltReasonV1 | null = null;
  let haltDetail: string | null = null;
  let ownerDecisionRequestId: string | null = null;
  let ownerDecisionRequestPath: string | null = null;

  if (haltEval.halt && haltEval.reason !== "STEP_FAILED") {
    status = "HALTED";
    haltReason = haltEval.reason;
    haltDetail = haltEval.detail;

    if (
      (haltEval.reason === "FOUNDER_APPROVAL_REQUIRED" ||
        haltEval.reason === "MUTATION_GATE_BLOCKED") &&
      args.missionId &&
      args.runId
    ) {
      const upserted = upsertOwnerDecisionRequestFromRunnerHaltV1({
        rootDir: args.cwd,
        missionId: args.missionId,
        runId: args.runId,
        stepId: args.step.step_id,
        stepProvenance: args.step.provenance,
        haltReason: haltEval.reason,
        haltDetail: haltEval.detail,
        parsedJson: parsed,
        now: args.now,
        writeArtifacts: true,
      });
      ownerDecisionRequestId = upserted.request.decision_request_id;
      ownerDecisionRequestPath = upserted.request_artifact_rel_path;

      if (
        ownerDecisionRequestApprovalSatisfiesRunnerGateV1({
          rootDir: args.cwd,
          decisionRequestId: upserted.request.decision_request_id,
          now: args.now,
        })
      ) {
        status = "PASS";
        haltReason = null;
        haltDetail = null;
      }
    }
  } else if (spawnResult.exit_code !== 0) {
    status = "FAIL";
  }

  return {
    step_id: args.step.step_id,
    title: args.step.title,
    kind: args.step.kind,
    status,
    exit_code: spawnResult.exit_code,
    duration_ms: Date.now() - started,
    command_display: commandDisplayV1(command),
    stdout_excerpt: tailTextV1(spawnResult.stdout, tailChars),
    stderr_excerpt: tailTextV1(spawnResult.stderr, tailChars),
    parsed_json_summary: summarizeParsedJsonV1(parsed),
    halt_reason:
      status === "HALTED"
        ? haltReason
        : status === "FAIL"
          ? "STEP_FAILED"
          : null,
    halt_detail:
      status === "HALTED" || status === "FAIL"
        ? haltDetail ?? `exit_code=${String(spawnResult.exit_code)}`
        : null,
    owner_decision_request_id: ownerDecisionRequestId,
    owner_decision_request_artifact_path: ownerDecisionRequestPath,
  };
}

function summarizeParsedJsonV1(parsed: unknown | null): unknown | null {
  if (!parsed || typeof parsed !== "object") {
    return parsed;
  }
  const o = parsed as Record<string, unknown>;
  const keys = [
    "contract",
    "report_name",
    "overall_status",
    "runtime_status",
    "recommended_wedge",
    "classification_counts",
    "ready_for_apply_count",
    "apply_executor_ready",
    "executor_status",
    "bridge_status",
    "mutation_authorized",
    "safe_to_commit_verdict",
    "aggregate_classification",
    "supabase_has_win_csv_missing_count",
  ];
  const summary: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in o) {
      summary[key] = o[key];
    }
  }
  return Object.keys(summary).length > 0 ? summary : parsed;
}

export function checkpointRelPathV1(runId: string): string {
  return `${BUCKPARTS_RUNNER_CHECKPOINTS_DIR_REL_V1}/${runId}.json`;
}

export function runArtifactRelPathV1(missionId: string, runId: string): string {
  const safeTs = runId.replace(/[^a-zA-Z0-9-]/g, "");
  return `${BUCKPARTS_RUNNER_RUNS_DIR_REL_V1}/buckparts-runner-${missionId}-${safeTs}.json`;
}

export function loadRunnerCheckpointV1(rootDir: string, runId: string): BuckpartsRunnerCheckpointV1 | null {
  const abs = path.join(rootDir, checkpointRelPathV1(runId));
  if (!existsSync(abs)) {
    return null;
  }
  return JSON.parse(readFileSync(abs, "utf8")) as BuckpartsRunnerCheckpointV1;
}

export function saveRunnerCheckpointV1(
  rootDir: string,
  checkpoint: BuckpartsRunnerCheckpointV1,
): string {
  const rel = checkpointRelPathV1(checkpoint.run_id);
  const abs = path.join(rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
  return rel;
}

export function writeRunnerReportArtifactV1(rootDir: string, report: BuckpartsRunnerReportV1): string {
  const abs = path.join(rootDir, report.artifact_rel_path);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report.artifact_rel_path;
}

export function buildResumeCommandV1(missionId: string, runId: string): string {
  return `node --import tsx scripts/report-buckparts-runner-v1.ts --mission ${missionId} --resume ${runId}`;
}

function deriveOverallStatusV1(args: {
  failed: boolean;
  halted: boolean;
  halt_reason: RunnerHaltReasonV1 | null;
  resumed: boolean;
  allComplete: boolean;
}): RunnerOverallStatusV1 {
  if (args.failed) {
    return "FAILED";
  }
  if (args.halted && args.halt_reason === "EXTERNAL_AGENT_REQUIRED") {
    return "HALTED_EXTERNAL_AGENT";
  }
  if (args.halted && args.halt_reason === "MUTATION_GATE_BLOCKED") {
    return "HALTED_MUTATION_GATE";
  }
  if (args.halted) {
    return "HALTED_APPROVAL_REQUIRED";
  }
  if (args.allComplete && args.resumed) {
    return "RESUMED_COMPLETE";
  }
  return "COMPLETE";
}

function buildValidationSummaryV1(steps: RunnerStepResultV1[]): BuckpartsRunnerReportV1["validation_summary"] {
  const byId = new Map(steps.map((s) => [s.step_id, s]));
  const lint = byId.get("validation_lint");
  const build = byId.get("validation_build");
  const tests = byId.get("validation_tests");
  const deploy = byId.get("deploy_classifier");
  const security = byId.get("security_gate");
  return {
    lint_pass:
      lint?.status === "SKIPPED" ? "SKIPPED" : lint?.status === "PASS" ? true : lint ? false : "SKIPPED",
    build_pass:
      build?.status === "SKIPPED"
        ? "SKIPPED"
        : build?.status === "PASS"
          ? true
          : build
            ? false
            : "SKIPPED",
    tests_pass:
      tests?.status === "SKIPPED"
        ? "SKIPPED"
        : tests?.status === "PASS"
          ? true
          : tests
            ? false
            : "SKIPPED",
    deploy_classifier_ran: deploy?.status === "PASS" || deploy?.status === "SKIPPED",
    security_gate_ran: security?.status === "PASS" || security?.status === "SKIPPED",
  };
}

export function runBuckpartsRunnerV1(args: {
  rootDir: string;
  missionId: BuckpartsRunnerMissionIdV1;
  resumeRunId?: string | null;
  runId?: string;
  now?: () => Date;
  spawnFn?: RunnerSpawnFnV1;
  writeArtifacts?: boolean;
}): BuckpartsRunnerReportV1 {
  const now = args.now ?? (() => new Date());
  const mission = getBuckpartsRunnerMissionV1(args.missionId);
  if (!mission) {
    throw new Error(`Unknown mission: ${args.missionId}`);
  }
  const definitionErrors = validateMissionDefinitionV1(mission);
  if (definitionErrors.length > 0) {
    throw new Error(`Invalid mission definition: ${definitionErrors.join("; ")}`);
  }

  const spawnFn = args.spawnFn ?? defaultSpawnFnV1;
  const writeArtifacts = args.writeArtifacts !== false;

  let runId = args.runId ?? randomUUID();
  let resumed = false;
  let completedStepIds: string[] = [];

  if (args.resumeRunId) {
    const checkpoint = loadRunnerCheckpointV1(args.rootDir, args.resumeRunId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found for run_id=${args.resumeRunId}`);
    }
    if (checkpoint.mission_id !== args.missionId) {
      throw new Error(
        `Resume mismatch: checkpoint mission=${checkpoint.mission_id} cli mission=${args.missionId}`,
      );
    }
    runId = checkpoint.run_id;
    completedStepIds = [...checkpoint.completed_step_ids];
    resumed = true;
  }

  const startedAt = resumed
    ? (loadRunnerCheckpointV1(args.rootDir, runId)?.started_at ?? now().toISOString())
    : now().toISOString();

  const stepResults: RunnerStepResultV1[] = [];
  let haltReason: RunnerHaltReasonV1 | null = null;
  let haltStepId: string | null = null;
  let haltDetail: string | null = null;
  let ownerDecisionRequestId: string | null = null;
  let ownerDecisionRequestPath: string | null = null;
  let failed = false;
  let analysisHalted = false;
  let productionMissionPlan: ProductionMissionPlanV1 | null = null;
  let safeBuyerPathProvenBaseline: number | null = null;
  if (args.resumeRunId) {
    const checkpoint = loadRunnerCheckpointV1(args.rootDir, args.resumeRunId);
    safeBuyerPathProvenBaseline = checkpoint?.safe_buyer_path_proven_baseline ?? null;
  }
  if (mission.mission_id === PRODUCTION_MISSION_RUNNER_MISSION_ID_V1) {
    if (resumed || completedStepIds.includes("production_mission_plan")) {
      productionMissionPlan = buildProductionMissionPlanSyncV1({ rootDir: args.rootDir, now });
    }
  }

  for (const step of mission.steps) {
    if (analysisHalted && step.phase === "analysis") {
      stepResults.push({
        step_id: step.step_id,
        title: step.title,
        kind: step.kind,
        status: "SKIPPED",
        exit_code: null,
        duration_ms: 0,
        command_display: step.command ? commandDisplayV1(step.command) : step.provenance,
        stdout_excerpt: "",
        stderr_excerpt: tailTextV1(
          `PROVEN SKIPPED: analysis phase halted at ${String(haltStepId)} — validation phase continues.`,
          500,
        ),
        parsed_json_summary: null,
        halt_reason: null,
        halt_detail: null,
      });
      continue;
    }

    if (
      mission.mission_id === PRODUCTION_MISSION_RUNNER_MISSION_ID_V1 &&
      productionMissionPlan &&
      step.step_id === "parity_factory_primary" &&
      !productionMissionPlan.target.apply_factory_report_script
    ) {
      stepResults.push({
        step_id: step.step_id,
        title: step.title,
        kind: step.kind,
        status: "SKIPPED",
        exit_code: null,
        duration_ms: 0,
        command_display: step.command ? commandDisplayV1(step.command) : step.provenance,
        stdout_excerpt: "",
        stderr_excerpt: tailTextV1("PROVEN SKIPPED: no apply factory script for resolved target.", 500),
        parsed_json_summary: null,
        halt_reason: null,
        halt_detail: null,
      });
      if (!completedStepIds.includes(step.step_id)) {
        completedStepIds.push(step.step_id);
      }
      continue;
    }

    if (
      mission.mission_id === PRODUCTION_MISSION_RUNNER_MISSION_ID_V1 &&
      productionMissionPlan &&
      step.step_id === "guarded_apply_primary" &&
      isProductionMissionApplyGoalSatisfiedV1({
        rootDir: args.rootDir,
        plan: productionMissionPlan,
      })
    ) {
      stepResults.push({
        step_id: step.step_id,
        title: step.title,
        kind: step.kind,
        status: "PASS",
        exit_code: 0,
        duration_ms: 0,
        command_display: step.command ? commandDisplayV1(step.command) : step.provenance,
        stdout_excerpt: tailTextV1(
          JSON.stringify({
            proven: true,
            primary_apply_slug: productionMissionPlan.target.primary_apply_slug,
            reason: "external_guarded_write_already_reflected_in_census",
          }),
          2000,
        ),
        stderr_excerpt: "",
        parsed_json_summary: {
          bridge_status: "APPLIED",
          mutation_authorized: true,
          primary_apply_slug: productionMissionPlan.target.primary_apply_slug,
        },
        halt_reason: null,
        halt_detail: null,
      });
      if (!completedStepIds.includes(step.step_id)) {
        completedStepIds.push(step.step_id);
      }
      continue;
    }

    let resolvedStep = step;
    if (mission.mission_id === PRODUCTION_MISSION_RUNNER_MISSION_ID_V1 && productionMissionPlan) {
      const dynamicCommand = resolveProductionMissionRunnerStepCommandV1(
        step.step_id,
        productionMissionPlan,
      );
      if (dynamicCommand) {
        resolvedStep = { ...step, command: dynamicCommand };
      }
      if (step.kind === "agent_dispatch" && step.dispatch) {
        resolvedStep = {
          ...resolvedStep,
          dispatch: {
            ...step.dispatch,
            objective_summary: productionMissionDispatchObjectiveV1(productionMissionPlan.target),
            expected_output_artifact_rel_paths:
              productionMissionPlan.target.expected_agent_output_artifact_rel_paths,
          },
        };
      }
    }

    const skip = completedStepIds.includes(step.step_id);
    const result = executeRunnerStepV1({
      step: resolvedStep,
      cwd: args.rootDir,
      spawnFn,
      skip,
      missionId: mission.mission_id,
      runId,
      now,
      writeArtifacts,
    });
    stepResults.push(result);

    if (
      mission.mission_id === PRODUCTION_MISSION_RUNNER_MISSION_ID_V1 &&
      step.step_id === "production_mission_plan" &&
      result.status === "PASS"
    ) {
      productionMissionPlan = buildProductionMissionPlanSyncV1({ rootDir: args.rootDir, now });
    }

    if (result.owner_decision_request_id) {
      ownerDecisionRequestId = result.owner_decision_request_id;
      ownerDecisionRequestPath = result.owner_decision_request_artifact_path ?? null;
    }

    if (result.status === "PASS" || result.status === "SKIPPED") {
      if (
        step.step_id === "census_baseline" &&
        result.parsed_json_summary &&
        typeof result.parsed_json_summary === "object"
      ) {
        const counts = (result.parsed_json_summary as Record<string, unknown>).classification_counts;
        if (counts && typeof counts === "object") {
          const proven = (counts as Record<string, unknown>).SAFE_BUYER_PATH_PROVEN;
          if (typeof proven === "number") {
            safeBuyerPathProvenBaseline = proven;
          }
        }
      }
      if (!completedStepIds.includes(step.step_id)) {
        completedStepIds.push(step.step_id);
      }
      continue;
    }

    if (result.status === "HALTED") {
      haltReason = result.halt_reason;
      haltStepId = step.step_id;
      haltDetail = result.halt_detail;
      if (step.phase === "analysis") {
        analysisHalted = true;
        continue;
      }
      break;
    }

    failed = true;
    haltReason = "STEP_FAILED";
    haltStepId = step.step_id;
    haltDetail = result.halt_detail;
    break;
  }

  const allStepIds = mission.steps.map((s) => s.step_id);
  const pendingStepIds = allStepIds.filter((id) => !completedStepIds.includes(id));
  const allComplete = pendingStepIds.length === 0 && !failed;

  const overall_status = deriveOverallStatusV1({
    failed,
    halted: haltReason !== null && haltReason !== "STEP_FAILED",
    halt_reason: haltReason,
    resumed,
    allComplete,
  });

  const artifactRelPath = runArtifactRelPathV1(mission.mission_id, runId);
  const checkpointRel = checkpointRelPathV1(runId);

  const report: BuckpartsRunnerReportV1 = {
    contract: BUCKPARTS_RUNNER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: BUCKPARTS_RUNNER_CC_JQ_PATH_V1,
    source_command: BUCKPARTS_RUNNER_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    run_id: runId,
    mission_id: mission.mission_id,
    mission_title: mission.title,
    resumed_from_checkpoint: resumed,
    overall_status,
    layer_truth: RUNNER_STEP_LAYER_TRUTH_V1,
    steps: stepResults,
    completed_step_ids: completedStepIds,
    pending_step_ids: pendingStepIds,
    halt_reason: haltReason,
    halt_step_id: haltStepId,
    halt_detail: haltDetail,
    owner_decision_request_id: ownerDecisionRequestId,
    owner_decision_request_artifact_path: ownerDecisionRequestPath,
    validation_summary: buildValidationSummaryV1(stepResults),
    artifact_rel_path: artifactRelPath,
    checkpoint_rel_path: checkpointRel,
    recommended_next_action: buildRecommendedNextActionV1({
      overall_status,
      halt_reason: haltReason,
      halt_step_id: haltStepId,
      mission_id: mission.mission_id,
      run_id: runId,
    }),
    resume_command:
      pendingStepIds.length > 0 ? buildResumeCommandV1(mission.mission_id, runId) : null,
    proven_facts: [
      ...mission.proven_facts,
      "PROVEN: BuckParts Runner v1 never passes --apply, --write-csv, or Supabase mutation flags.",
      `PROVEN: mission=${mission.mission_id} run_id=${runId} completed_steps=${String(completedStepIds.length)}/${String(allStepIds.length)}.`,
    ],
    inferred_facts: [
      resumed
        ? "INFERRED: Resumed run skipped idempotent completed steps from checkpoint."
        : "INFERRED: Fresh run started new checkpoint.",
    ],
    unknown_facts:
      overall_status === "COMPLETE" || overall_status === "RESUMED_COMPLETE"
        ? ["UNKNOWN: Customer-visible coverage delta requires separate census diff — runner validates execution only."]
        : [],
    safe_buyer_path_proven_baseline: safeBuyerPathProvenBaseline,
  };

  if (mission.mission_id === PRODUCTION_MISSION_RUNNER_MISSION_ID_V1 && writeArtifacts) {
    try {
      const { finalizeProductionMissionRunV1 } =
        require("./buckparts-production-mission-v1") as typeof import("./buckparts-production-mission-v1");
      const finalized = finalizeProductionMissionRunV1({
        rootDir: args.rootDir,
        runnerReport: report,
        now,
      });
      report.production_mission_lifecycle_artifact_path = finalized.lifecycle_rel_path;
      report.operations_metrics_snapshot_recorded = finalized.metrics_history_rel_path !== null;
      report.proven_facts = [
        ...report.proven_facts,
        `PROVEN: Production mission lifecycle artifact ${finalized.lifecycle_rel_path}.`,
        finalized.metrics_history_rel_path
          ? `PROVEN: Operations metrics snapshot appended to ${finalized.metrics_history_rel_path}.`
          : "UNKNOWN: Operations metrics snapshot not recorded.",
      ];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      report.unknown_facts = [
        ...report.unknown_facts,
        `UNKNOWN: Production mission finalize failed — ${message}`,
      ];
    }
  }

  if (writeArtifacts) {
    saveRunnerCheckpointV1(args.rootDir, {
      contract: "buckparts_runner_checkpoint_v1",
      run_id: runId,
      mission_id: mission.mission_id,
      started_at: startedAt,
      updated_at: report.generated_at,
      completed_step_ids: completedStepIds,
      last_halt_reason: haltReason,
      last_halt_step_id: haltStepId,
      safe_buyer_path_proven_baseline: safeBuyerPathProvenBaseline,
    });
    writeRunnerReportArtifactV1(args.rootDir, report);
  }

  return report;
}

function buildRecommendedNextActionV1(args: {
  overall_status: RunnerOverallStatusV1;
  halt_reason: RunnerHaltReasonV1 | null;
  halt_step_id: string | null;
  mission_id: BuckpartsRunnerMissionIdV1;
  run_id: string;
}): string {
  if (args.overall_status === "FAILED") {
    return `PROVEN: Step ${String(args.halt_step_id)} failed — inspect stderr in artifact; fix and resume with ${buildResumeCommandV1(args.mission_id, args.run_id)}.`;
  }
  if (args.overall_status === "HALTED_EXTERNAL_AGENT") {
    return "PROVEN: External operator must write validated result artifact per agent dispatch manifest; resume runner when result is on disk.";
  }
  if (args.overall_status === "HALTED_MUTATION_GATE") {
    return "PROVEN: Guarded apply bridge blocked — resolve readiness gate blockers; do not bypass mutation gates.";
  }
  if (args.overall_status === "HALTED_APPROVAL_REQUIRED") {
    if (args.mission_id === PRODUCTION_MISSION_RUNNER_MISSION_ID_V1) {
      return "PROVEN: Production mission halted at guarded apply — founder approval required; lifecycle artifact documents Dispatch → Agent → Validation → ODQ → Guarded Apply dry-run; execute write-csv separately after approval.";
    }
    return "PROVEN: Record founder owner_mutation_approved in data/owner-decisions/ for scoped slugs (see owner_decision_queue_v1 pending request); then run guarded apply executor separately — runner does not mutate CSV.";
  }
  if (args.overall_status === "RESUMED_COMPLETE" || args.overall_status === "COMPLETE") {
    if (args.mission_id === PRODUCTION_MISSION_RUNNER_MISSION_ID_V1) {
      return "PROVEN: Production mission reference run complete — review lifecycle artifact under data/command-center/production-missions/.";
    }
    return "PROVEN: Mission steps complete — review consolidated artifact; commit artifacts if SAFE_TO_COMMIT; deploy only when classifier says DEPLOY_REQUIRED.";
  }
  return "UNKNOWN";
}

export function defaultSpawnFnV1(command: readonly string[], cwd: string): RunnerSpawnResultV1 {
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    exit_code: result.status,
    stdout: String(result.stdout ?? ""),
    stderr: String(result.stderr ?? ""),
  };
}

export function exitCodeForRunnerReportV1(report: BuckpartsRunnerReportV1): number {
  if (report.overall_status === "FAILED") {
    return 1;
  }
  return 0;
}

export function findLatestRunnerArtifactV1(rootDir: string): BuckpartsRunnerReportV1 | null {
  const dir = path.join(rootDir, BUCKPARTS_RUNNER_RUNS_DIR_REL_V1);
  if (!existsSync(dir)) {
    return null;
  }
  const files = readdirSync(dir)
    .filter((f) => f.startsWith("buckparts-runner-") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (files.length === 0) {
    return null;
  }
  return JSON.parse(readFileSync(path.join(dir, files[0]!), "utf8")) as BuckpartsRunnerReportV1;
}

export function runnerReportFingerprintV1(report: BuckpartsRunnerReportV1): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        run_id: report.run_id,
        mission_id: report.mission_id,
        overall_status: report.overall_status,
        completed: report.completed_step_ids,
      }),
    )
    .digest("hex")
    .slice(0, 12);
}
