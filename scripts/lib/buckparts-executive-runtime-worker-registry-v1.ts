/**
 * Executive Runtime Worker Registry v1.
 * Observe-only projection of workers that already exist in-repo.
 * Not an authority source. Does not dispatch, schedule, mutate, or mint NBA.
 *
 * Sources (existing only):
 * - DISPATCH_ALLOWLIST_ENTRIES_V1
 * - AGENT_DISPATCH_TEMPLATES_V1
 * - BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1 (explicitly not allowlisted)
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  AGENT_DISPATCH_TEMPLATES_V1,
  BUCKPARTS_AGENT_CC_JQ_PATH_V1,
} from "./buckparts-agent-contract-v1";
import {
  BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1,
  DISPATCH_ALLOWLIST_ENTRIES_V1,
  type DispatchAllowlistEntryV1,
} from "./buckparts-command-center-dispatch-allowlist-v1";

export const EXECUTIVE_RUNTIME_WORKER_REGISTRY_CONTRACT_V1 =
  "buckparts_executive_runtime_worker_registry_v1" as const;

export const EXECUTIVE_RUNTIME_WORKER_REGISTRY_SOURCE_COMMAND_V1 =
  "node --import tsx scripts/run-buckparts-executive-runtime-worker-registry-v1.ts" as const;

export const EXECUTIVE_RUNTIME_WORKER_REGISTRY_SLICE_V1 = "WORKER_REGISTRY_OBSERVE_STOP" as const;

export type HonestyLabelV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type WorkerRuntimeStatusV1 =
  | "IMPLEMENTED"
  | "ENTRYPOINT_MISSING"
  | "IMPLEMENTED_NOT_DISPATCH_ELIGIBLE";

export type WorkerAuthorityV1 = {
  this_registry_is_not_an_authority_source: true;
  source:
    | "dispatch_allowlist_v1"
    | "agent_contract_v1"
    | "allowlist_excluded_guarded_apply";
  dispatch_eligible: boolean;
  mutation_allowed: false;
  nba_authority: false;
  owner_review_required: boolean;
};

export type ExecutiveRuntimeWorkerV1 = {
  worker_id: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  authority: WorkerAuthorityV1;
  required_tools: string[];
  founder_gate: boolean;
  can_run_unattended: boolean | null;
  can_run_unattended_honesty: HonestyLabelV1;
  estimated_duration: null;
  estimated_duration_honesty: "UNKNOWN";
  completion_evidence: string[];
  failure_evidence: string[];
  current_runtime_status: WorkerRuntimeStatusV1;
  exact_command: string;
  source_artifact: string;
  entrypoint_rel: string | null;
};

export type MissingWorkerNoteV1 = {
  label: string;
  reason: string;
  honesty: HonestyLabelV1;
};

export type ExecutiveRuntimeWorkerRegistrySnapshotV1 = {
  contract: typeof EXECUTIVE_RUNTIME_WORKER_REGISTRY_CONTRACT_V1;
  runtime_slice: typeof EXECUTIVE_RUNTIME_WORKER_REGISTRY_SLICE_V1;
  source_command: typeof EXECUTIVE_RUNTIME_WORKER_REGISTRY_SOURCE_COMMAND_V1;
  generated_at: string;
  cycle_status: "OBSERVED_STOP" | "FAIL_CLOSED";
  question: "Which workers already exist for the Executive to observe?";
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  steering_authority: false;
  nba_authority: false;
  dispatch_authority: false;
  dispatch_invoked: false;
  selected_work: null;
  recommended_action: null;
  persistent_world_model_written: false;
  authority_source: false;
  workers: ExecutiveRuntimeWorkerV1[];
  dispatch_eligible_count: number;
  not_dispatch_eligible_count: number;
  missing_workers: MissingWorkerNoteV1[];
  blocked_reasons: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type WorkerRegistryDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (absPath: string) => boolean;
  readTextFile?: (absPath: string) => string;
};

function parseNpmRunScript(exactCommand: string): string | null {
  const match = exactCommand.match(/^npm run ([^\s]+)/);
  return match?.[1] ?? null;
}

function parseTsxScript(exactCommand: string): string | null {
  const match = exactCommand.match(/(?:npx tsx|tsx) (scripts\/[^\s]+\.ts)/);
  return match?.[1] ?? null;
}

function loadPackageScripts(args: {
  rootDir: string;
  readTextFile: (abs: string) => string;
}): Record<string, string> {
  const pkgAbs = path.join(args.rootDir, "package.json");
  const parsed = JSON.parse(args.readTextFile(pkgAbs)) as { scripts?: Record<string, string> };
  return parsed.scripts ?? {};
}

function resolveEntrypointRel(args: {
  exactCommand: string;
  packageScripts: Record<string, string>;
}): string | null {
  const tsx = parseTsxScript(args.exactCommand);
  if (tsx) return tsx;
  const npmName = parseNpmRunScript(args.exactCommand);
  if (!npmName) {
    if (args.exactCommand === "npm run lint" || args.exactCommand.startsWith("npm run lint ")) {
      return args.packageScripts.lint ? "package.json#scripts.lint" : null;
    }
    if (args.exactCommand === "npm run build" || args.exactCommand.startsWith("npm run build ")) {
      return args.packageScripts.build ? "package.json#scripts.build" : null;
    }
    return null;
  }
  const script = args.packageScripts[npmName];
  if (!script) return null;
  const nestedTsx = parseTsxScript(script);
  if (nestedTsx) return nestedTsx;
  return `package.json#scripts.${npmName}`;
}

function requiredToolsFromCommand(exactCommand: string): string[] {
  const tools: string[] = [];
  if (/\bnpm\b/.test(exactCommand)) tools.push("npm");
  if (/\b(npx tsx|tsx)\b/.test(exactCommand) || exactCommand.includes("node --import tsx")) {
    tools.push("node", "tsx");
  }
  if (tools.length === 0) tools.push("UNKNOWN");
  return [...new Set(tools)];
}

function allowlistWorker(args: {
  entry: DispatchAllowlistEntryV1;
  entrypointRel: string | null;
  entrypointExists: boolean;
}): ExecutiveRuntimeWorkerV1 {
  const founder_gate = args.entry.owner_review_required;
  const unattended = !founder_gate && args.entry.mutation_posture.mutation_allowed === false;
  return {
    worker_id: `dispatch:${args.entry.selected_subsystem}`,
    purpose: `Existing dispatch-allowlisted ${args.entry.command_kind} (${args.entry.selected_subsystem}).`,
    inputs: ["canonical_final_operating_decision_v1.exact_command must equal this worker exact_command"],
    outputs: [
      args.entry.artifact_write_behavior === "required"
        ? "dispatch-run artifact under data/command-center/dispatch-runs (when executed by existing dispatch runner)"
        : "stdout and/or optional artifact (no_artifact_allowed=" +
          String(args.entry.no_artifact_allowed) +
          ")",
    ],
    authority: {
      this_registry_is_not_an_authority_source: true,
      source: "dispatch_allowlist_v1",
      dispatch_eligible: true,
      mutation_allowed: false,
      nba_authority: false,
      owner_review_required: args.entry.owner_review_required,
    },
    required_tools: requiredToolsFromCommand(args.entry.exact_command),
    founder_gate,
    can_run_unattended: unattended,
    can_run_unattended_honesty: founder_gate ? "PROVEN" : "INFERRED",
    estimated_duration: null,
    estimated_duration_honesty: "UNKNOWN",
    completion_evidence: [
      "dispatch runner execution_status=EXECUTED",
      "subprocess_exit_code=0",
    ],
    failure_evidence: [
      "dispatch runner execution_status=REFUSED|FAILED",
      "blocked_reasons[]",
      "subprocess_exit_code!=0",
    ],
    current_runtime_status: args.entrypointExists ? "IMPLEMENTED" : "ENTRYPOINT_MISSING",
    exact_command: args.entry.exact_command,
    source_artifact: "scripts/lib/buckparts-command-center-dispatch-allowlist-v1.ts",
    entrypoint_rel: args.entrypointRel,
  };
}

function agentContractWorker(): ExecutiveRuntimeWorkerV1 {
  const template = AGENT_DISPATCH_TEMPLATES_V1.read_only_evidence_collection_v1;
  return {
    worker_id: `agent_contract:${template.template_id}`,
    purpose: `${template.title} (${template.objective_class}). External operator halt; not dispatch-allowlisted.`,
    inputs: ["Runner dispatch manifest under data/command-center/agent-dispatch/manifests/"],
    outputs: [
      "result artifact under data/command-center/agent-dispatch/results/",
      "output_artifact_rel_paths on buckparts_agent_result_v1",
    ],
    authority: {
      this_registry_is_not_an_authority_source: true,
      source: "agent_contract_v1",
      dispatch_eligible: false,
      mutation_allowed: false,
      nba_authority: false,
      owner_review_required: true,
    },
    required_tools: ["EXTERNAL_OPERATOR"],
    founder_gate: true,
    can_run_unattended: false,
    can_run_unattended_honesty: "PROVEN",
    estimated_duration: null,
    estimated_duration_honesty: "UNKNOWN",
    completion_evidence: [
      "result completion_status=COMPLETE",
      "validation_pass=true",
      "mutation_authorized=false",
    ],
    failure_evidence: [
      "TIMED_OUT",
      "VALIDATION_FAIL",
      "DISPATCH_EXHAUSTED",
      "completion_status=FAILED",
    ],
    current_runtime_status: "IMPLEMENTED_NOT_DISPATCH_ELIGIBLE",
    exact_command: `agent_contract_template:${template.template_id}`,
    source_artifact: "scripts/lib/buckparts-agent-contract-v1.ts",
    entrypoint_rel: BUCKPARTS_AGENT_CC_JQ_PATH_V1,
  };
}

function guardedApplyExcludedWorker(args: {
  entrypointRel: string | null;
  entrypointExists: boolean;
}): ExecutiveRuntimeWorkerV1 {
  return {
    worker_id: "guarded_apply:excluded_from_dispatch",
    purpose:
      "Guarded mutation executor named in the dispatch allowlist module as never dispatch-allowlisted. Execution remains AGENTS.md + OAR, not Executive dispatch.",
    inputs: ["owner-approval row under data/owner-decisions/", "plan-file"],
    outputs: ["guarded apply report / CSV-or-Supabase mutation only after explicit --apply"],
    authority: {
      this_registry_is_not_an_authority_source: true,
      source: "allowlist_excluded_guarded_apply",
      dispatch_eligible: false,
      mutation_allowed: false,
      nba_authority: false,
      owner_review_required: true,
    },
    required_tools: requiredToolsFromCommand(
      BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1,
    ),
    founder_gate: true,
    can_run_unattended: false,
    can_run_unattended_honesty: "PROVEN",
    estimated_duration: null,
    estimated_duration_honesty: "UNKNOWN",
    completion_evidence: ["post-apply dry-run fail-closed PASS after explicit founder --apply"],
    failure_evidence: ["dry-run BLOCKED", "missing OAR", "no --apply"],
    current_runtime_status: args.entrypointExists
      ? "IMPLEMENTED_NOT_DISPATCH_ELIGIBLE"
      : "ENTRYPOINT_MISSING",
    exact_command: BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1,
    source_artifact: "scripts/lib/buckparts-command-center-dispatch-allowlist-v1.ts",
    entrypoint_rel: args.entrypointRel,
  };
}

const MISSING_WORKERS_V1: MissingWorkerNoteV1[] = [
  {
    label: "hyperagent_named_worker",
    reason:
      "HQ names HyperAgent as an execution surface. No vendor-named worker is implemented. Agent Contract read_only_evidence_collection_v1 is the existing vendor-agnostic halt.",
    honesty: "PROVEN",
  },
  {
    label: "wake_scheduler",
    reason: "Runtime Contract forbids treating the contract as a wake daemon or cron. No scheduler worker exists.",
    honesty: "PROVEN",
  },
  {
    label: "mutation_dispatch_worker",
    reason:
      "Dispatch allowlist mutation_posture.mutation_allowed is false for every entry. Guarded apply is excluded from dispatch.",
    honesty: "PROVEN",
  },
];

export function buildExecutiveRuntimeWorkerRegistryV1(
  deps: WorkerRegistryDepsV1,
): ExecutiveRuntimeWorkerRegistrySnapshotV1 {
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const exists = deps.fileExists ?? existsSync;
  const readText = deps.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));
  const blocked: string[] = [];

  let packageScripts: Record<string, string> = {};
  try {
    packageScripts = loadPackageScripts({ rootDir: deps.rootDir, readTextFile: readText });
  } catch (error) {
    blocked.push(
      `missing_required_source:package.json (${error instanceof Error ? error.message : String(error)})`,
    );
  }

  if (DISPATCH_ALLOWLIST_ENTRIES_V1.length === 0) {
    blocked.push("missing_required_source:DISPATCH_ALLOWLIST_ENTRIES_V1");
  }

  const allowlistWorkers = DISPATCH_ALLOWLIST_ENTRIES_V1.map((entry) => {
    const entrypointRel = resolveEntrypointRel({
      exactCommand: entry.exact_command,
      packageScripts,
    });
    const entrypointExists = entrypointRel
      ? entrypointRel.startsWith("package.json#")
        ? true
        : exists(path.join(deps.rootDir, entrypointRel))
      : false;
    return allowlistWorker({ entry, entrypointRel, entrypointExists });
  });

  const guardedRel = parseTsxScript(BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1);
  const guardedExists = guardedRel ? exists(path.join(deps.rootDir, guardedRel)) : false;

  const workers: ExecutiveRuntimeWorkerV1[] = [
    ...allowlistWorkers,
    agentContractWorker(),
    guardedApplyExcludedWorker({
      entrypointRel: guardedRel,
      entrypointExists: guardedExists,
    }),
  ];

  const dispatch_eligible_count = workers.filter((row) => row.authority.dispatch_eligible).length;
  const not_dispatch_eligible_count = workers.length - dispatch_eligible_count;

  const snapshot: ExecutiveRuntimeWorkerRegistrySnapshotV1 = {
    contract: EXECUTIVE_RUNTIME_WORKER_REGISTRY_CONTRACT_V1,
    runtime_slice: EXECUTIVE_RUNTIME_WORKER_REGISTRY_SLICE_V1,
    source_command: EXECUTIVE_RUNTIME_WORKER_REGISTRY_SOURCE_COMMAND_V1,
    generated_at,
    cycle_status: blocked.length === 0 ? "OBSERVED_STOP" : "FAIL_CLOSED",
    question: "Which workers already exist for the Executive to observe?",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    steering_authority: false,
    nba_authority: false,
    dispatch_authority: false,
    dispatch_invoked: false,
    selected_work: null,
    recommended_action: null,
    persistent_world_model_written: false,
    authority_source: false,
    workers,
    dispatch_eligible_count,
    not_dispatch_eligible_count,
    missing_workers: MISSING_WORKERS_V1,
    blocked_reasons: blocked,
    proven_facts: [
      "PROVEN: this registry is not an authority source.",
      "PROVEN: dispatch_invoked=false; selected_work=null; mutation_authorized=false; nba_authority=false.",
      `PROVEN: dispatch-eligible workers are a 1:1 projection of DISPATCH_ALLOWLIST_ENTRIES_V1 (${String(DISPATCH_ALLOWLIST_ENTRIES_V1.length)}).`,
      "PROVEN: agent_contract:read_only_evidence_collection_v1 exists and is not dispatch-allowlisted.",
      "PROVEN: guarded apply write command is named as never dispatch-allowlisted.",
    ],
    inferred_facts: workers
      .filter((row) => row.can_run_unattended_honesty === "INFERRED")
      .map(
        (row) =>
          `INFERRED: ${row.worker_id} can_run_unattended=${String(row.can_run_unattended)} (read-only allowlist; env/secrets not proven).`,
      ),
    unknown_facts: [
      "UNKNOWN: estimated_duration is not recorded on allowlist, agent contract, or guarded-apply exclusion.",
      ...workers
        .filter((row) => row.current_runtime_status === "ENTRYPOINT_MISSING")
        .map((row) => `UNKNOWN: entrypoint missing for ${row.worker_id} (${row.exact_command}).`),
    ],
  };

  return snapshot;
}

export function workerRegistrySucceededV1(
  snapshot: ExecutiveRuntimeWorkerRegistrySnapshotV1,
): boolean {
  return snapshot.cycle_status === "OBSERVED_STOP" && snapshot.blocked_reasons.length === 0;
}
