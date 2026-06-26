/**
 * BuckParts Execution Ledger v1 — read-only history from committed operational artifacts.
 * Indexes dispatch runs, batch run-registry closeouts, and closeout learning packets.
 * Does not mutate CSV, Supabase, or production state.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  COMMAND_CENTER_DISPATCH_RUN_REPORT_NAME_V1,
  COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1,
} from "./buckparts-command-center-dispatch-runner-v1";
import { FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1 } from "./fridge-buyer-path-owner-review-bridge-v1";
import { BATCH_PRODUCTION_CHECKLIST_DEFAULT_REGISTRY_PATH_V1 } from "./buckparts-batch-production-operating-checklist-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_JSON_REL_V1,
} from "./manufacturer-safe-link-rescue-readiness-gate-v1";
import {
  MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
  MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1,
} from "./manufacturer-browser-proof-factory-v1";
import {
  MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CONTRACT_V1,
  MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_JSON_REL_V1,
} from "./manufacturer-rescue-owner-approval-packet-factory-v1";

export const BUCKPARTS_EXECUTION_LEDGER_CONTRACT_V1 = "buckparts_execution_ledger_v1" as const;

export const BUCKPARTS_EXECUTION_LEDGER_JSON_REL_V1 =
  "data/command-center/execution-ledger-v1.json" as const;

export const BUCKPARTS_EXECUTION_LEDGER_SOURCE_COMMAND_V1 =
  "npm run buckparts:execution-ledger" as const;

export const EXECUTION_LEDGER_STALE_AFTER_MS_V1 = 24 * 60 * 60 * 1000;

export const EXECUTION_LEDGER_TRIGGER_COMMAND_CENTER_V1 =
  "npm run buckparts:command-center" as const;

export const EXECUTION_LEDGER_TRIGGER_MANUFACTURER_RESCUE_ORCHESTRATOR_V1 =
  "npm run buckparts:manufacturer-safe-link-rescue-orchestrator" as const;

export const EXECUTION_LEDGER_TRIGGER_MANUFACTURER_RESCUE_DIRECTOR_V1 =
  "npm run buckparts:manufacturer-safe-link-rescue-director" as const;

export const EXECUTION_LEDGER_TRIGGER_MANUFACTURER_RESCUE_RUNNER_V1 =
  "npm run buckparts:manufacturer-safe-link-rescue-runner" as const;

export const EXECUTION_LEDGER_TRIGGER_MANUFACTURER_RESCUE_READINESS_GATE_V1 =
  "npm run buckparts:manufacturer-safe-link-rescue-readiness-gate" as const;

export const EXECUTION_LEDGER_TRIGGER_MANUFACTURER_BROWSER_PROOF_FACTORY_V1 =
  "npm run buckparts:manufacturer-browser-proof-factory" as const;

export const EXECUTION_LEDGER_TRIGGER_MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_V1 =
  "npm run buckparts:manufacturer-rescue-owner-approval-packet-factory" as const;

export const EXECUTION_LEDGER_TRIGGER_REPO_RUNTIME_CONVERGENCE_V1 =
  "npm run buckparts:repo-runtime-convergence:check" as const;

export const EXECUTION_LEDGER_TRIGGER_RUN_REGISTRY_CLOSEOUT_V1 =
  "npm run buckparts:fridge-buyer-path-batch-run-registry-closeout" as const;

export type ExecutionLedgerFreshnessStatusV1 = "FRESH" | "STALE" | "UNKNOWN";

export type ExecutionLedgerFreshnessV1 = {
  last_generated_at: string;
  source_artifact_count: number;
  stale_after: string;
  freshness_status: ExecutionLedgerFreshnessStatusV1;
  last_refresh_trigger_source: string | "UNKNOWN";
};

export type ExecutionLedgerSafeToCommitStatusV1 =
  | "SAFE_TO_COMMIT"
  | "NOT_SAFE_TO_COMMIT"
  | "UNKNOWN";

export type ExecutionLedgerEntryV1 = {
  entry_id: string;
  commit_sha: string | "UNKNOWN";
  completion_timestamp: string;
  operational_lane: string;
  artifacts_produced: string[];
  validation_performed: string[];
  safe_to_commit_status: ExecutionLedgerSafeToCommitStatusV1;
  pushed_to_origin: boolean | "UNKNOWN";
  business_capability_unlocked: string | "UNKNOWN";
  superseded_by: string | null;
  source_contract: string;
  source_artifact_rel_path: string;
  provenance_tier: "COMMITTED_SOURCE";
};

export type ExecutionLedgerCapabilityGroupV1 = {
  capability_key: string;
  operational_lane: string;
  entries: ExecutionLedgerEntryV1[];
  latest_entry_id: string | "UNKNOWN";
  latest_completion_timestamp: string | "UNKNOWN";
};

export type BuckpartsExecutionLedgerReportV1 = {
  contract: typeof BUCKPARTS_EXECUTION_LEDGER_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  source_command: typeof BUCKPARTS_EXECUTION_LEDGER_SOURCE_COMMAND_V1;
  entry_count: number;
  entries: ExecutionLedgerEntryV1[];
  capability_timeline: ExecutionLedgerCapabilityGroupV1[];
  last_completed_capability: ExecutionLedgerEntryV1 | null;
  source_paths_read: string[];
  inspect_summary: {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary";
      command_center: ".command_center_v2.execution_ledger_v1";
      entries: ".entries";
      capability_timeline: ".capability_timeline";
      last_completed_capability: ".last_completed_capability";
    };
    recommended_next_action: string;
  };
  proven_facts: string[];
  unknown_facts: string[];
  freshness: ExecutionLedgerFreshnessV1;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function artifactPathsFromRecord(record: Record<string, unknown>): string[] {
  const paths: string[] = [];
  const artifactPaths = asRecord(record.artifact_paths);
  if (artifactPaths) {
    for (const value of Object.values(artifactPaths)) {
      if (typeof value === "string" && value.trim()) paths.push(value);
    }
  }
  const sourceArtifacts = asRecord(record.source_artifacts);
  if (sourceArtifacts) {
    for (const value of Object.values(sourceArtifacts)) {
      if (typeof value === "string" && value.trim()) paths.push(value);
    }
  }
  if (typeof record.closeout_policy_artifact_rel_path === "string") {
    paths.push(record.closeout_policy_artifact_rel_path);
  }
  if (typeof record.owner_approval_artifact_rel_path === "string") {
    paths.push(record.owner_approval_artifact_rel_path);
  }
  return Array.from(new Set(paths)).sort();
}

function validationFromDispatch(exactCommand: string, executionStatus: string): string[] {
  const validation: string[] = [];
  if (executionStatus === "EXECUTED") validation.push("dispatch_execution_status=EXECUTED");
  if (exactCommand.includes("npm run build")) validation.push("npm run build");
  if (exactCommand.includes("npm run lint")) validation.push("npm run lint");
  if (exactCommand.includes("report-buckparts-command-center")) {
    validation.push("buckparts:command-center report");
  }
  if (validation.length === 0) validation.push("UNKNOWN");
  return validation;
}

function inferPushedFromCloseout(record: Record<string, unknown>): boolean | "UNKNOWN" {
  const commits = Array.isArray(record.commits_involved) ? record.commits_involved : [];
  const pushed = commits.some((row) => {
    const entry = asRecord(row);
    const role = entry?.role;
    return typeof role === "string" && role.toLowerCase().includes("pushed");
  });
  return pushed ? true : "UNKNOWN";
}

function applySupersession(entries: ExecutionLedgerEntryV1[]): ExecutionLedgerEntryV1[] {
  const sorted = [...entries].sort(
    (a, b) =>
      b.completion_timestamp.localeCompare(a.completion_timestamp) ||
      a.entry_id.localeCompare(b.entry_id),
  );
  const latestByLane = new Map<string, string>();
  return sorted.map((entry) => {
    const prior = latestByLane.get(entry.operational_lane);
    latestByLane.set(entry.operational_lane, entry.entry_id);
    return {
      ...entry,
      superseded_by: prior ?? null,
    };
  });
}

function buildCapabilityTimeline(entries: ExecutionLedgerEntryV1[]): ExecutionLedgerCapabilityGroupV1[] {
  const byLane = new Map<string, ExecutionLedgerEntryV1[]>();
  for (const entry of entries) {
    const list = byLane.get(entry.operational_lane) ?? [];
    list.push(entry);
    byLane.set(entry.operational_lane, list);
  }
  return Array.from(byLane.entries())
    .map(([operational_lane, laneEntries]) => {
      const sorted = [...laneEntries].sort((a, b) =>
        b.completion_timestamp.localeCompare(a.completion_timestamp),
      );
      const latest = sorted[0];
      return {
        capability_key: operational_lane.replace(/[^a-z0-9]+/gi, "_").toLowerCase(),
        operational_lane,
        entries: sorted,
        latest_entry_id: latest?.entry_id ?? "UNKNOWN",
        latest_completion_timestamp: latest?.completion_timestamp ?? "UNKNOWN",
      };
    })
    .sort((a, b) =>
      b.latest_completion_timestamp.localeCompare(a.latest_completion_timestamp) ||
      a.operational_lane.localeCompare(b.operational_lane),
    );
}

function intakeDispatchRuns(rootDir: string, sourcePaths: Set<string>): ExecutionLedgerEntryV1[] {
  const dirAbs = path.join(rootDir, COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1);
  if (!existsSync(dirAbs)) return [];
  const entries: ExecutionLedgerEntryV1[] = [];
  for (const file of readdirSync(dirAbs).filter((f) => f.endsWith(".json")).sort()) {
    const rel = path.posix.join(COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1, file);
    const abs = path.join(rootDir, rel);
    sourcePaths.add(rel);
    try {
      const parsed = JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
      if (parsed.report_name !== COMMAND_CENTER_DISPATCH_RUN_REPORT_NAME_V1) continue;
      const executionStatus = asString(parsed.execution_status) ?? "UNKNOWN";
      if (executionStatus !== "EXECUTED") continue;
      const exactCommand = asString(parsed.exact_command) ?? "UNKNOWN";
      const generatedAt = asString(parsed.generated_at) ?? "UNKNOWN";
      entries.push({
        entry_id: `dispatch_${file.replace(/\.json$/, "")}`,
        commit_sha: asString(parsed.source_commit) ?? "UNKNOWN",
        completion_timestamp: generatedAt,
        operational_lane: `command_center_dispatch:${asString(parsed.selected_subsystem) ?? "UNKNOWN"}`,
        artifacts_produced: [rel],
        validation_performed: validationFromDispatch(exactCommand, executionStatus),
        safe_to_commit_status: "UNKNOWN",
        pushed_to_origin: "UNKNOWN",
        business_capability_unlocked:
          asString(parsed.next_expected_state) ?? `dispatch:${executionStatus}`,
        superseded_by: null,
        source_contract: COMMAND_CENTER_DISPATCH_RUN_REPORT_NAME_V1,
        source_artifact_rel_path: rel,
        provenance_tier: "COMMITTED_SOURCE",
      });
    } catch {
      continue;
    }
  }
  return entries;
}

function intakeRunRegistryFile(
  rootDir: string,
  rel: string,
  sourcePaths: Set<string>,
): ExecutionLedgerEntryV1 | null {
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return null;
  sourcePaths.add(rel);
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
    const closeoutComplete = parsed.closeout_complete === true;
    const provenAt = asString(parsed.proven_at);
    const closedAt = asString(parsed.closed_at);
    const generatedAt = asString(parsed.generated_at);
    const completion = closedAt ?? provenAt ?? generatedAt;
    if (!completion) return null;
    if (!closeoutComplete && parsed.contract !== "batch_production_proven_run_v1") return null;

    const wedge = asString(parsed.wedge) ?? "UNKNOWN";
    const runId = asString(parsed.run_id) ?? path.basename(rel, ".json");
    const stage = asString(parsed.stage) ?? asString(parsed.lane_label) ?? "batch_closeout";
    const artifacts = artifactPathsFromRecord(parsed);
    artifacts.unshift(rel);

    const validation: string[] = [];
    if (closeoutComplete) validation.push("closeout_complete=true");
    if (asString(parsed.post_apply_parity_status)) {
      validation.push(`post_apply_parity=${parsed.post_apply_parity_status}`);
    }
    if (asString(parsed.production_go_first_hop_validation_status)) {
      validation.push(`go_first_hop=${parsed.production_go_first_hop_validation_status}`);
    }
    if (validation.length === 0) validation.push("UNKNOWN");

    return {
      entry_id: `run_registry_${runId}`,
      commit_sha: "UNKNOWN",
      completion_timestamp: completion,
      operational_lane: `${wedge}:${stage}`,
      artifacts_produced: Array.from(new Set(artifacts)),
      validation_performed: validation,
      safe_to_commit_status: "UNKNOWN",
      pushed_to_origin: "UNKNOWN",
      business_capability_unlocked:
        closeoutComplete
          ? `${wedge} batch closeout recorded`
          : asString(parsed.lane_label) ?? "proven batch run",
      superseded_by: null,
      source_contract: asString(parsed.contract) ?? "run_registry",
      source_artifact_rel_path: rel,
      provenance_tier: "COMMITTED_SOURCE",
    };
  } catch {
    return null;
  }
}

function intakeRunRegistries(rootDir: string, sourcePaths: Set<string>): ExecutionLedgerEntryV1[] {
  const rels = [
    path.posix.join(FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1, "fridge-buyer-path-batch-run-v1-0fec4a7b623a.json"),
    BATCH_PRODUCTION_CHECKLIST_DEFAULT_REGISTRY_PATH_V1,
  ];
  return rels
    .map((rel) => intakeRunRegistryFile(rootDir, rel, sourcePaths))
    .filter((entry): entry is ExecutionLedgerEntryV1 => entry !== null);
}

function intakeCloseoutPackets(rootDir: string, sourcePaths: Set<string>): ExecutionLedgerEntryV1[] {
  const rel =
    "data/fridge/batch-production/closeout/fridge-buyer-path-batch-closeout-learning-packet-v1-0fec4a7b623a.json";
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return [];
  sourcePaths.add(rel);
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
    const generatedAt = asString(parsed.generated_at) ?? "UNKNOWN";
    const commits = Array.isArray(parsed.commits_involved) ? parsed.commits_involved : [];
    const primaryCommit =
      asRecord(commits[commits.length - 1])?.commit?.toString() ?? "UNKNOWN";
    const artifacts = artifactPathsFromRecord(parsed);
    artifacts.unshift(rel);

    const postApplyParity = asRecord(parsed.post_apply_parity);
    const goSmoke = asRecord(parsed.live_page_smoke_result_summary);

    return [
      {
        entry_id: `closeout_${asString(parsed.run_id) ?? "unknown"}`,
        commit_sha: typeof primaryCommit === "string" ? primaryCommit : "UNKNOWN",
        completion_timestamp: generatedAt,
        operational_lane: `${asString(parsed.wedge) ?? "UNKNOWN"}:batch_closeout_learning`,
        artifacts_produced: Array.from(new Set(artifacts)),
        validation_performed: [
          `post_apply_parity=${asString(postApplyParity?.status) ?? "UNKNOWN"}`,
          `go_first_hop_smoke=${asString(goSmoke?.status) ?? "UNKNOWN"}`,
        ],
        safe_to_commit_status: "UNKNOWN",
        pushed_to_origin: inferPushedFromCloseout(parsed),
        business_capability_unlocked: "refrigerator_water guarded CSV batch applied with parity learning packet",
        superseded_by: null,
        source_contract: asString(parsed.contract) ?? "closeout_learning_packet",
        source_artifact_rel_path: rel,
        provenance_tier: "COMMITTED_SOURCE",
      },
    ];
  } catch {
    return [];
  }
}

function intakeManufacturerRescueOwnerApprovalPacketFactory(
  rootDir: string,
  sourcePaths: Set<string>,
): ExecutionLedgerEntryV1 | null {
  const rel = MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_JSON_REL_V1;
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return null;
  sourcePaths.add(rel);
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
    if (parsed.contract !== MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CONTRACT_V1) return null;
    const generatedAt = asString(parsed.generated_at) ?? "UNKNOWN";
    const cohortCount =
      typeof parsed.approval_cohort_count === "number" ? parsed.approval_cohort_count : "UNKNOWN";
    const readyCount =
      typeof parsed.ready_for_owner_review_plan_count === "number"
        ? parsed.ready_for_owner_review_plan_count
        : "UNKNOWN";
    return {
      entry_id: `manufacturer_rescue_owner_approval_packet_factory_${generatedAt}`,
      commit_sha: "UNKNOWN",
      completion_timestamp: generatedAt,
      operational_lane: "manufacturer_safe_link_rescue:owner_approval_packet_factory",
      artifacts_produced: [rel],
      validation_performed: [
        `approval_cohort_count=${String(cohortCount)}`,
        `ready_for_owner_review_plan_count=${String(readyCount)}`,
        "auto_approval_forbidden=true",
      ],
      safe_to_commit_status: "UNKNOWN",
      pushed_to_origin: "UNKNOWN",
      business_capability_unlocked:
        cohortCount === 0
          ? "manufacturer rescue owner approval packet factory indexed (no cohorts)"
          : "manufacturer rescue owner approval cohort packets produced (founder decision required)",
      superseded_by: null,
      source_contract: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CONTRACT_V1,
      source_artifact_rel_path: rel,
      provenance_tier: "COMMITTED_SOURCE",
    };
  } catch {
    return null;
  }
}

function intakeManufacturerBrowserProofFactory(
  rootDir: string,
  sourcePaths: Set<string>,
): ExecutionLedgerEntryV1 | null {
  const rel = MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1;
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return null;
  sourcePaths.add(rel);
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
    if (parsed.contract !== MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1) return null;
    const generatedAt = asString(parsed.generated_at) ?? "UNKNOWN";
    const captureWork =
      typeof parsed.capture_work_required_count === "number"
        ? parsed.capture_work_required_count
        : "UNKNOWN";
    const batchCount = Array.isArray(parsed.capture_batches) ? parsed.capture_batches.length : 0;
    const orchestratorAt = asString(parsed.orchestrator_generated_at) ?? "UNKNOWN";
    return {
      entry_id: `manufacturer_browser_proof_factory_${generatedAt}`,
      commit_sha: "UNKNOWN",
      completion_timestamp: generatedAt,
      operational_lane: "manufacturer_safe_link_rescue:browser_proof_factory",
      artifacts_produced: [rel],
      validation_performed: [
        `capture_work_required_count=${String(captureWork)}`,
        `capture_batch_count=${String(batchCount)}`,
        `orchestrator_generated_at=${orchestratorAt}`,
        "auto_pass_forbidden=true",
      ],
      safe_to_commit_status: "UNKNOWN",
      pushed_to_origin: "UNKNOWN",
      business_capability_unlocked:
        captureWork === 0
          ? "manufacturer browser proof factory indexed (no pending capture work)"
          : "manufacturer browser proof batched capture queue produced (owner review required)",
      superseded_by: null,
      source_contract: MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
      source_artifact_rel_path: rel,
      provenance_tier: "COMMITTED_SOURCE",
    };
  } catch {
    return null;
  }
}

function intakeManufacturerRescueReadinessGate(
  rootDir: string,
  sourcePaths: Set<string>,
): ExecutionLedgerEntryV1 | null {
  const rel = MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_JSON_REL_V1;
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return null;
  sourcePaths.add(rel);
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
    if (parsed.contract !== MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1) return null;
    const generatedAt = asString(parsed.generated_at) ?? "UNKNOWN";
    const readyCount =
      typeof parsed.ready_for_apply_count === "number" ? parsed.ready_for_apply_count : "UNKNOWN";
    const orchestratorAt = asString(parsed.orchestrator_generated_at) ?? "UNKNOWN";
    const directorAt = asString(parsed.director_generated_at) ?? "UNKNOWN";
    return {
      entry_id: `manufacturer_rescue_readiness_gate_${generatedAt}`,
      commit_sha: "UNKNOWN",
      completion_timestamp: generatedAt,
      operational_lane: "manufacturer_safe_link_rescue:readiness_gate_promotion",
      artifacts_produced: [rel],
      validation_performed: [
        `ready_for_apply_count=${String(readyCount)}`,
        `orchestrator_generated_at=${orchestratorAt}`,
        `director_generated_at=${directorAt}`,
      ],
      safe_to_commit_status: "UNKNOWN",
      pushed_to_origin: "UNKNOWN",
      business_capability_unlocked:
        readyCount === 0
          ? "manufacturer rescue promotion gate indexed (no READY_FOR_APPLY)"
          : "manufacturer rescue READY_FOR_APPLY promotion proven in committed gate",
      superseded_by: null,
      source_contract: MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1,
      source_artifact_rel_path: rel,
      provenance_tier: "COMMITTED_SOURCE",
    };
  } catch {
    return null;
  }
}

export function buildBuckpartsExecutionLedgerReportV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): BuckpartsExecutionLedgerReportV1 {
  const now = args.now ?? (() => new Date());
  const sourcePaths = new Set<string>();

  const rawEntries = [
    ...intakeDispatchRuns(args.rootDir, sourcePaths),
    ...intakeRunRegistries(args.rootDir, sourcePaths),
    ...intakeCloseoutPackets(args.rootDir, sourcePaths),
    ...((): ExecutionLedgerEntryV1[] => {
      const entry = intakeManufacturerRescueReadinessGate(args.rootDir, sourcePaths);
      return entry ? [entry] : [];
    })(),
    ...((): ExecutionLedgerEntryV1[] => {
      const entry = intakeManufacturerBrowserProofFactory(args.rootDir, sourcePaths);
      return entry ? [entry] : [];
    })(),
    ...((): ExecutionLedgerEntryV1[] => {
      const entry = intakeManufacturerRescueOwnerApprovalPacketFactory(args.rootDir, sourcePaths);
      return entry ? [entry] : [];
    })(),
  ];

  const entries = applySupersession(
    rawEntries.sort(
      (a, b) =>
        b.completion_timestamp.localeCompare(a.completion_timestamp) ||
        a.entry_id.localeCompare(b.entry_id),
    ),
  );
  const capability_timeline = buildCapabilityTimeline(entries);
  const last_completed_capability = entries[0] ?? null;

  const freshness = computeExecutionLedgerFreshnessV1({
    generated_at: now().toISOString(),
    source_artifact_count: sourcePaths.size,
    now: args.now,
    last_refresh_trigger_source: "UNKNOWN",
  });

  return {
    contract: BUCKPARTS_EXECUTION_LEDGER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    source_command: BUCKPARTS_EXECUTION_LEDGER_SOURCE_COMMAND_V1,
    entry_count: entries.length,
    entries,
    capability_timeline,
    last_completed_capability,
    source_paths_read: Array.from(sourcePaths).sort(),
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        command_center: ".command_center_v2.execution_ledger_v1",
        entries: ".entries",
        capability_timeline: ".capability_timeline",
        last_completed_capability: ".last_completed_capability",
      },
      recommended_next_action: last_completed_capability
        ? `Review last completed capability ${last_completed_capability.operational_lane} at ${last_completed_capability.completion_timestamp}.`
        : "UNKNOWN — no committed execution ledger entries found on disk.",
    },
    proven_facts: [
      "PROVEN: Execution ledger is read-only and indexes committed dispatch runs, run-registry closeouts, and closeout learning packets only.",
      `PROVEN: entry_count=${String(entries.length)} from ${String(sourcePaths.size)} source artifact path(s).`,
    ],
    unknown_facts: [
      "UNKNOWN: pushed_to_origin unless closeout commits_involved explicitly mention push.",
      "UNKNOWN: safe_to_commit_status unless future source artifacts include explicit verdict fields.",
      "UNKNOWN: live git remote parity for entries without committed push attestations.",
    ],
    freshness,
  };
}

export function computeExecutionLedgerFreshnessV1(args: {
  generated_at: string;
  source_artifact_count: number;
  now?: () => Date;
  last_refresh_trigger_source?: string;
}): ExecutionLedgerFreshnessV1 {
  const now = args.now ?? (() => new Date());
  const generatedMs = Date.parse(args.generated_at);
  if (!Number.isFinite(generatedMs)) {
    return {
      last_generated_at: args.generated_at,
      source_artifact_count: args.source_artifact_count,
      stale_after: "UNKNOWN",
      freshness_status: "UNKNOWN",
      last_refresh_trigger_source: args.last_refresh_trigger_source ?? "UNKNOWN",
    };
  }
  const staleAfterMs = generatedMs + EXECUTION_LEDGER_STALE_AFTER_MS_V1;
  const stale_after = new Date(staleAfterMs).toISOString();
  const freshness_status: ExecutionLedgerFreshnessStatusV1 =
    now().getTime() < staleAfterMs ? "FRESH" : "STALE";
  return {
    last_generated_at: args.generated_at,
    source_artifact_count: args.source_artifact_count,
    stale_after,
    freshness_status,
    last_refresh_trigger_source: args.last_refresh_trigger_source ?? "UNKNOWN",
  };
}

export function resolveExecutionLedgerFreshnessV1(
  report: BuckpartsExecutionLedgerReportV1,
  now?: () => Date,
): ExecutionLedgerFreshnessV1 {
  if (report.freshness) {
    const recomputed = computeExecutionLedgerFreshnessV1({
      generated_at: report.freshness.last_generated_at,
      source_artifact_count: report.freshness.source_artifact_count,
      now,
      last_refresh_trigger_source: report.freshness.last_refresh_trigger_source,
    });
    return {
      ...report.freshness,
      stale_after: recomputed.stale_after,
      freshness_status: recomputed.freshness_status,
    };
  }
  return computeExecutionLedgerFreshnessV1({
    generated_at: report.generated_at,
    source_artifact_count: report.source_paths_read.length,
    now,
    last_refresh_trigger_source: "UNKNOWN",
  });
}

export function refreshBuckpartsExecutionLedgerV1(args: {
  rootDir: string;
  trigger_source: string;
  now?: () => Date;
}): { report: BuckpartsExecutionLedgerReportV1; jsonRelPath: string } {
  const now = args.now ?? (() => new Date());
  const report = buildBuckpartsExecutionLedgerReportV1({ rootDir: args.rootDir, now });
  const reportWithFreshness: BuckpartsExecutionLedgerReportV1 = {
    ...report,
    freshness: computeExecutionLedgerFreshnessV1({
      generated_at: report.generated_at,
      source_artifact_count: report.source_paths_read.length,
      now: args.now,
      last_refresh_trigger_source: args.trigger_source,
    }),
  };
  const written = writeBuckpartsExecutionLedgerArtifactsV1({
    rootDir: args.rootDir,
    report: reportWithFreshness,
  });
  return { report: reportWithFreshness, jsonRelPath: written.jsonRelPath };
}

export function loadBuckpartsExecutionLedgerReportV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): BuckpartsExecutionLedgerReportV1 | null {
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, BUCKPARTS_EXECUTION_LEDGER_JSON_REL_V1);
  if (!fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(readTextFile(abs)) as BuckpartsExecutionLedgerReportV1;
    if (parsed.contract !== BUCKPARTS_EXECUTION_LEDGER_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeBuckpartsExecutionLedgerArtifactsV1(args: {
  rootDir: string;
  report: BuckpartsExecutionLedgerReportV1;
}): { jsonRelPath: string } {
  const abs = path.join(args.rootDir, BUCKPARTS_EXECUTION_LEDGER_JSON_REL_V1);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  return { jsonRelPath: BUCKPARTS_EXECUTION_LEDGER_JSON_REL_V1 };
}
