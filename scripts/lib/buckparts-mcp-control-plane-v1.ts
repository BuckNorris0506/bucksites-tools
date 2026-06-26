/**
 * BuckParts Truth MCP v1 — Command Center control-plane projections (read-only).
 * Consumes committed CC snapshot when present, else live buildBuckpartsCommandCenterReport.
 * Does not duplicate steering, runner, or director business logic.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  buildFounderActionQueueV1,
  founderActionQueueInputFromCommandCenterJson,
} from "@/lib/owner-dashboard/founder-action-queue-v1";

import type { BuckPartsMcpDepsV1 } from "./buckparts-mcp-truth-context-v1";
import { buildBuckpartsCommandCenterReport } from "../report-buckparts-command-center";
import { loadManufacturerRescueRunnerReportV1 } from "./manufacturer-safe-link-rescue-runner-v1";

type McpReadOnlyEnvelopeV1 = {
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
};

export const BUCKPARTS_MCP_CONTROL_PLANE_CONTRACT_V1 = "buckparts_mcp_control_plane_v1" as const;

export const BUCKPARTS_COMMAND_CENTER_SNAPSHOT_JSON_REL_V1 =
  "data/reports/buckparts-command-center.json" as const;

export const COMMAND_CENTER_CONTROL_LOOP_AUDIT_JSON_REL_V1 =
  "data/control-plane/command-center-control-loop-v1.audit.json" as const;

const LANE_NAME_ALIASES_V1: Readonly<Record<string, string>> = {
  runner: "manufacturer_safe_link_rescue_runner_v1",
  rescue_runner: "manufacturer_safe_link_rescue_runner_v1",
  rescue_director: "manufacturer_safe_link_rescue_director_v1",
  director: "manufacturer_safe_link_rescue_director_v1",
  digest: "operator_digest_v1",
  operator_digest: "operator_digest_v1",
  agent_control_plane: "agent_control_plane_v1",
  demand_queue: "demand_work_queue_summary_v1",
  daily_operator: "daily_operator_summary_v1",
  brain_gate: "brain_integrity_gate_v1",
  execution_ledger: "execution_ledger_v1",
};

export type CommandCenterMcpLoadSourceV1 = "committed_snapshot" | "live_build";

export type CommandCenterMcpLoadResultV1 =
  | {
      ok: true;
      report: Record<string, unknown>;
      source: CommandCenterMcpLoadSourceV1;
      repo_paths_read: string[];
    }
  | {
      ok: false;
      truth_status: "UNKNOWN";
      repo_paths_read: string[];
      truth_note: string;
    };

function envelope(): McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_CONTROL_PLANE_CONTRACT_V1;
} {
  return {
    contract: BUCKPARTS_MCP_CONTROL_PLANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | "UNKNOWN" {
  return typeof value === "string" && value.trim() ? value : "UNKNOWN";
}

export function normalizeCommandCenterLaneNameV1(laneName: string): string {
  let normalized = laneName.trim();
  if (normalized.startsWith(".command_center_v2.")) {
    normalized = normalized.slice(".command_center_v2.".length);
  }
  if (normalized.startsWith("command_center_v2.")) {
    normalized = normalized.slice("command_center_v2.".length);
  }
  return LANE_NAME_ALIASES_V1[normalized] ?? normalized;
}

export async function loadCommandCenterForMcpV1(
  deps: BuckPartsMcpDepsV1 & {
    loadReport?: () => Promise<Record<string, unknown>>;
  },
): Promise<CommandCenterMcpLoadResultV1> {
  const fileExists = deps.fileExists ?? existsSync;
  const readText = deps.readText ?? ((abs: string) => readFileSync(abs, "utf8"));

  if (deps.loadReport) {
    try {
      const report = await deps.loadReport();
      return {
        ok: true,
        report,
        source: "live_build",
        repo_paths_read: ["injected_loadReport"],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        truth_status: "UNKNOWN",
        repo_paths_read: [],
        truth_note: `Command Center load failed: ${message}`,
      };
    }
  }

  const snapshotAbs = path.join(deps.rootDir, BUCKPARTS_COMMAND_CENTER_SNAPSHOT_JSON_REL_V1);
  if (fileExists(snapshotAbs)) {
    try {
      const report = JSON.parse(readText(snapshotAbs)) as Record<string, unknown>;
      return {
        ok: true,
        report,
        source: "committed_snapshot",
        repo_paths_read: [BUCKPARTS_COMMAND_CENTER_SNAPSHOT_JSON_REL_V1],
      };
    } catch {
      return {
        ok: false,
        truth_status: "UNKNOWN",
        repo_paths_read: [BUCKPARTS_COMMAND_CENTER_SNAPSHOT_JSON_REL_V1],
        truth_note: "Committed Command Center snapshot exists but failed JSON parse.",
      };
    }
  }

  try {
    const report = (await buildBuckpartsCommandCenterReport({
      rootDir: deps.rootDir,
      fileExists,
      readTextFile: readText,
    })) as unknown as Record<string, unknown>;
    return {
      ok: true,
      report,
      source: "live_build",
      repo_paths_read: ["scripts/report-buckparts-command-center.ts (live read-only build)"],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      truth_status: "UNKNOWN",
      repo_paths_read: [BUCKPARTS_COMMAND_CENTER_SNAPSHOT_JSON_REL_V1],
      truth_note: `Command Center unavailable. Archive JSON to ${BUCKPARTS_COMMAND_CENTER_SNAPSHOT_JSON_REL_V1} or fix live build: ${message}`,
    };
  }
}

function commandCenterV2(report: Record<string, unknown>): Record<string, unknown> | null {
  return asRecord(report.command_center_v2);
}

function loadControlLoopAudit(rootDir: string): Record<string, unknown> | null {
  const abs = path.join(rootDir, COMMAND_CENTER_CONTROL_LOOP_AUDIT_JSON_REL_V1);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export type WorkQueueItemProjectionV1 = {
  queue_id: string;
  lane: string;
  priority_rank: number;
  title: string;
  recommended_action: string;
  owner_or_agent: string;
  source_artifact: string;
};

export function projectWorkQueueFromCommandCenterV1(
  report: Record<string, unknown>,
): WorkQueueItemProjectionV1[] {
  const items: WorkQueueItemProjectionV1[] = [];
  const v2 = commandCenterV2(report);

  const nba = asString(report.next_best_action);
  if (nba !== "UNKNOWN") {
    items.push({
      queue_id: "root_next_best_action",
      lane: "buckparts_command_center_v1.root",
      priority_rank: 1,
      title: "Command Center next_best_action",
      recommended_action: nba,
      owner_or_agent: "founder_or_agent",
      source_artifact: ".next_best_action",
    });
  }

  const demandSummary = asRecord(v2?.demand_work_queue_summary_v1);
  const demandItems = Array.isArray(demandSummary?.top_items) ? demandSummary.top_items : [];
  for (const raw of demandItems) {
    const row = asRecord(raw);
    if (!row) continue;
    items.push({
      queue_id: asString(row.id),
      lane: "demand_work_queue_summary_v1",
      priority_rank: typeof row.priority_rank === "number" ? row.priority_rank + 1 : items.length + 1,
      title: `${asString(row.type)} — ${asString(row.scope)}`,
      recommended_action: asString(row.recommended_action),
      owner_or_agent: asString(row.owner_or_agent),
      source_artifact: ".command_center_v2.demand_work_queue_summary_v1.top_items",
    });
  }

  const agentPlane = asRecord(v2?.agent_control_plane_v1);
  const eligibleJobs = Array.isArray(agentPlane?.eligible_jobs) ? agentPlane.eligible_jobs : [];
  for (const raw of eligibleJobs) {
    const job = asRecord(raw);
    if (!job) continue;
    items.push({
      queue_id: asString(job.job_id),
      lane: asString(job.agent_lane),
      priority_rank: items.length + 1,
      title: asString(job.job_id),
      recommended_action: asString(job.exact_command),
      owner_or_agent: "agent",
      source_artifact: ".command_center_v2.agent_control_plane_v1.eligible_jobs",
    });
  }

  const topMoney = Array.isArray(report.top_money_queue) ? report.top_money_queue : [];
  for (const raw of topMoney) {
    const row = asRecord(raw);
    if (!row) continue;
    items.push({
      queue_id: `top_money_${asString(row.lane)}`,
      lane: asString(row.lane),
      priority_rank: items.length + 1,
      title: `Money queue — ${asString(row.lane)}`,
      recommended_action: asString(row.recommended_action),
      owner_or_agent: "founder",
      source_artifact: ".top_money_queue",
    });
  }

  const runnerLane = asRecord(v2?.manufacturer_safe_link_rescue_runner_v1);
  const executionOrder = Array.isArray(runnerLane?.execution_order)
    ? runnerLane.execution_order.slice(0, 5)
    : [];
  for (const slug of executionOrder) {
    if (typeof slug !== "string") continue;
    items.push({
      queue_id: `rescue_runner_${slug}`,
      lane: "manufacturer_safe_link_rescue_runner_v1",
      priority_rank: items.length + 1,
      title: `Rescue runner — ${slug}`,
      recommended_action:
        runnerLane?.ready_for_apply_slug === slug
          ? "READY_FOR_APPLY slot"
          : "See manufacturer_rescue_slug_state MCP tool",
      owner_or_agent: "founder",
      source_artifact: ".command_center_v2.manufacturer_safe_link_rescue_runner_v1.execution_order",
    });
  }

  const packetSummary = asRecord(v2?.next_execution_packet_summary_v1);
  if (packetSummary?.next_packet_title) {
    items.push({
      queue_id: asString(packetSummary.next_packet_id),
      lane: "next_execution_packet_summary_v1",
      priority_rank: items.length + 1,
      title: asString(packetSummary.next_packet_title),
      recommended_action: asString(packetSummary.next_packet_title),
      owner_or_agent: "founder",
      source_artifact: ".command_center_v2.next_execution_packet_summary_v1",
    });
  }

  return items.sort((a, b) => a.priority_rank - b.priority_rank || a.queue_id.localeCompare(b.queue_id));
}

export function projectNextBestActionFromCommandCenterV1(report: Record<string, unknown>): {
  lane: string;
  action: string;
  reason: string;
  blocking_prerequisites: string[];
  expected_business_impact: string;
  source_artifact: string;
} {
  const guidance = asRecord(report.execution_guidance);
  const v2 = commandCenterV2(report);
  const digest = asRecord(v2?.operator_digest_v1);
  const demandSummary = asRecord(v2?.demand_work_queue_summary_v1);
  const topDemand = Array.isArray(demandSummary?.top_items)
    ? asRecord(demandSummary.top_items[0])
    : null;

  const action = asString(digest?.next_best_action ?? report.next_best_action);
  const reason = asString(digest?.why_this_action ?? report.why_this_action);
  const blockers = Array.isArray(guidance?.mutating_block_reasons)
    ? guidance.mutating_block_reasons.map(String)
    : [];

  let lane = "buckparts_command_center_v1.root";
  if (action.includes("CORRECTNESS_RISKS")) {
    lane = "air_purifier_demand_selected_correctness_risks_v1";
  } else if (action.includes("BATCH") || action.includes("APPLY")) {
    lane = "batch_production_operating_dispatch_v1";
  } else if (action.includes("RESCUE") || action.includes("rescue")) {
    lane = "manufacturer_safe_link_rescue_runner_v1";
  } else if (topDemand) {
    lane = "demand_work_queue_summary_v1";
  }

  const impact =
    topDemand !== null
      ? `Demand queue top scope: ${asString(topDemand.scope)} (${asString(topDemand.type)})`
      : asString(asRecord(report.system_health_summary)?.recommended_next_step);

  return {
    lane,
    action,
    reason,
    blocking_prerequisites: blockers,
    expected_business_impact: impact,
    source_artifact: digest ? ".command_center_v2.operator_digest_v1" : ".next_best_action",
  };
}

export function projectLaneStatusFromCommandCenterV1(
  report: Record<string, unknown>,
  laneName: string,
): {
  lane_key: string;
  jq_path: string;
  found: boolean;
  lane: Record<string, unknown> | null;
  health: string;
  blockers: string[];
  metrics: Record<string, unknown>;
} {
  const laneKey = normalizeCommandCenterLaneNameV1(laneName);
  const jqPath = `.command_center_v2.${laneKey}`;
  const v2 = commandCenterV2(report);
  const lane = v2 ? (v2[laneKey] as unknown) : null;
  const laneRecord = asRecord(lane);

  if (!laneRecord) {
    return {
      lane_key: laneKey,
      jq_path: jqPath,
      found: false,
      lane: null,
      health: "UNKNOWN",
      blockers: [`Lane not found: ${laneKey}`],
      metrics: {},
    };
  }

  const health =
    asString(laneRecord.runtime_status) !== "UNKNOWN"
      ? asString(laneRecord.runtime_status)
      : asString(laneRecord.status) !== "UNKNOWN"
        ? asString(laneRecord.status)
        : laneRecord.read_only === true
          ? "READ_ONLY_LANE_OK"
          : "UNKNOWN";

  const blockers: string[] = [];
  if (typeof laneRecord.blocker === "string" && laneRecord.blocker.trim()) {
    blockers.push(laneRecord.blocker);
  }
  if (Array.isArray(laneRecord.blocked_reasons)) {
    blockers.push(...laneRecord.blocked_reasons.map(String));
  }
  if (Array.isArray(laneRecord.blocker_summary)) {
    for (const row of laneRecord.blocker_summary) {
      const entry = asRecord(row);
      if (entry?.reason) blockers.push(String(entry.reason));
    }
  }

  const metrics: Record<string, unknown> = {};
  if (laneRecord.inspect_summary !== undefined) metrics.inspect_summary = laneRecord.inspect_summary;
  if (laneRecord.remaining_opportunity !== undefined) {
    metrics.remaining_opportunity = laneRecord.remaining_opportunity;
  }
  if (laneRecord.ready_for_apply_slug !== undefined) {
    metrics.ready_for_apply_slug = laneRecord.ready_for_apply_slug;
  }
  if (laneRecord.item_count !== undefined) metrics.item_count = laneRecord.item_count;
  if (laneRecord.eligible_jobs !== undefined) {
    metrics.eligible_job_count = Array.isArray(laneRecord.eligible_jobs)
      ? laneRecord.eligible_jobs.length
      : "UNKNOWN";
  }

  return {
    lane_key: laneKey,
    jq_path: jqPath,
    found: true,
    lane: laneRecord,
    health,
    blockers,
    metrics,
  };
}

export type CommandCenterSummaryResultV1 = McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_CONTROL_PLANE_CONTRACT_V1;
  tool: "command_center_summary";
  truth_status: "PROVEN" | "UNKNOWN";
  load_source: CommandCenterMcpLoadSourceV1 | "UNKNOWN";
  generated_at: string | "UNKNOWN";
  system_health_status: string | "UNKNOWN";
  next_best_action: string | "UNKNOWN";
  why_this_action: string | "UNKNOWN";
  operator_can_be_away_status: string | "UNKNOWN";
  daily_operator_summary: Record<string, unknown> | null;
  operator_digest: Record<string, unknown> | null;
  brain_integrity_gate: Record<string, unknown> | null;
  repo_paths_read: string[];
  truth_note: string;
};

export type NextBestActionResultV1 = McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_CONTROL_PLANE_CONTRACT_V1;
  tool: "next_best_action";
  truth_status: "PROVEN" | "UNKNOWN";
  load_source: CommandCenterMcpLoadSourceV1 | "UNKNOWN";
  lane: string | "UNKNOWN";
  action: string | "UNKNOWN";
  reason: string | "UNKNOWN";
  blocking_prerequisites: string[];
  expected_business_impact: string | "UNKNOWN";
  source_artifact: string | "UNKNOWN";
  execution_guidance: Record<string, unknown> | null;
  repo_paths_read: string[];
  truth_note: string;
};

export type WorkQueueResultV1 = McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_CONTROL_PLANE_CONTRACT_V1;
  tool: "work_queue";
  truth_status: "PROVEN" | "UNKNOWN";
  load_source: CommandCenterMcpLoadSourceV1 | "UNKNOWN";
  queue_items: WorkQueueItemProjectionV1[];
  founder_action_queue_row_count: number | "UNKNOWN";
  repo_paths_read: string[];
  truth_note: string;
};

export type LaneStatusResultV1 = McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_CONTROL_PLANE_CONTRACT_V1;
  tool: "lane_status";
  truth_status: "PROVEN" | "UNKNOWN";
  lane_name: string;
  lane_key: string;
  jq_path: string;
  found: boolean;
  health: string | "UNKNOWN";
  blockers: string[];
  metrics: Record<string, unknown>;
  lane: Record<string, unknown> | null;
  repo_paths_read: string[];
  truth_note: string;
};

export type BusinessSnapshotResultV1 = McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_CONTROL_PLANE_CONTRACT_V1;
  tool: "business_snapshot";
  truth_status: "PROVEN" | "PARTIAL" | "UNKNOWN";
  load_source: CommandCenterMcpLoadSourceV1 | "UNKNOWN";
  coverage: Record<string, unknown>;
  rescue_progress: Record<string, unknown>;
  repo_runtime_convergence: Record<string, unknown>;
  trust_status: Record<string, unknown>;
  highest_risks: string[];
  current_phase: string | "UNKNOWN";
  next_milestone: string | "UNKNOWN";
  repo_paths_read: string[];
  truth_note: string;
};

export async function commandCenterSummaryV1(
  deps: BuckPartsMcpDepsV1 & { loadReport?: () => Promise<Record<string, unknown>> },
): Promise<CommandCenterSummaryResultV1> {
  const loaded = await loadCommandCenterForMcpV1(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "command_center_summary",
      truth_status: "UNKNOWN",
      load_source: "UNKNOWN",
      generated_at: "UNKNOWN",
      system_health_status: "UNKNOWN",
      next_best_action: "UNKNOWN",
      why_this_action: "UNKNOWN",
      operator_can_be_away_status: "UNKNOWN",
      daily_operator_summary: null,
      operator_digest: null,
      brain_integrity_gate: null,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const { report, source, repo_paths_read } = loaded;
  const v2 = commandCenterV2(report);
  const systemHealth = asRecord(report.system_health_summary);

  return {
    ...envelope(),
    tool: "command_center_summary",
    truth_status: "PROVEN",
    load_source: source,
    generated_at: asString(report.generated_at),
    system_health_status: asString(systemHealth?.status),
    next_best_action: asString(report.next_best_action),
    why_this_action: asString(report.why_this_action),
    operator_can_be_away_status: asString(report.operator_can_be_away_status),
    daily_operator_summary: asRecord(v2?.daily_operator_summary_v1),
    operator_digest: asRecord(v2?.operator_digest_v1),
    brain_integrity_gate: asRecord(v2?.brain_integrity_gate_v1),
    repo_paths_read,
    truth_note:
      source === "committed_snapshot"
        ? "Projected from committed Command Center snapshot."
        : "Projected from live read-only Command Center build; archive to data/reports/buckparts-command-center.json for deterministic MCP.",
  };
}

export async function nextBestActionV1(
  deps: BuckPartsMcpDepsV1 & { loadReport?: () => Promise<Record<string, unknown>> },
): Promise<NextBestActionResultV1> {
  const loaded = await loadCommandCenterForMcpV1(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "next_best_action",
      truth_status: "UNKNOWN",
      load_source: "UNKNOWN",
      lane: "UNKNOWN",
      action: "UNKNOWN",
      reason: "UNKNOWN",
      blocking_prerequisites: [],
      expected_business_impact: "UNKNOWN",
      source_artifact: "UNKNOWN",
      execution_guidance: null,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const projected = projectNextBestActionFromCommandCenterV1(loaded.report);
  return {
    ...envelope(),
    tool: "next_best_action",
    truth_status: "PROVEN",
    load_source: loaded.source,
    lane: projected.lane,
    action: projected.action,
    reason: projected.reason,
    blocking_prerequisites: projected.blocking_prerequisites,
    expected_business_impact: projected.expected_business_impact,
    source_artifact: projected.source_artifact,
    execution_guidance: asRecord(loaded.report.execution_guidance),
    repo_paths_read: loaded.repo_paths_read,
    truth_note: "Single highest-priority action from Command Center root steering (not recomputed in MCP).",
  };
}

export async function workQueueV1(
  deps: BuckPartsMcpDepsV1 & { loadReport?: () => Promise<Record<string, unknown>> },
): Promise<WorkQueueResultV1> {
  const loaded = await loadCommandCenterForMcpV1(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "work_queue",
      truth_status: "UNKNOWN",
      load_source: "UNKNOWN",
      queue_items: [],
      founder_action_queue_row_count: "UNKNOWN",
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  let founderRows: number | "UNKNOWN" = "UNKNOWN";
  try {
    const queueInput = founderActionQueueInputFromCommandCenterJson(loaded.report);
    const queue = buildFounderActionQueueV1(queueInput);
    founderRows = queue.rows.length;
  } catch {
    founderRows = "UNKNOWN";
  }

  return {
    ...envelope(),
    tool: "work_queue",
    truth_status: "PROVEN",
    load_source: loaded.source,
    queue_items: projectWorkQueueFromCommandCenterV1(loaded.report),
    founder_action_queue_row_count: founderRows,
    repo_paths_read: loaded.repo_paths_read,
    truth_note:
      "Queues projected from Command Center lanes (demand, agent control plane, money queue, rescue runner). Founder action queue count via founder-action-queue-v1.",
  };
}

export async function laneStatusV1(
  deps: BuckPartsMcpDepsV1 & {
    lane_name: string;
    loadReport?: () => Promise<Record<string, unknown>>;
  },
): Promise<LaneStatusResultV1> {
  const loaded = await loadCommandCenterForMcpV1(deps);
  const laneName = deps.lane_name;
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "lane_status",
      truth_status: "UNKNOWN",
      lane_name: laneName,
      lane_key: normalizeCommandCenterLaneNameV1(laneName),
      jq_path: `.command_center_v2.${normalizeCommandCenterLaneNameV1(laneName)}`,
      found: false,
      health: "UNKNOWN",
      blockers: [],
      metrics: {},
      lane: null,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const status = projectLaneStatusFromCommandCenterV1(loaded.report, laneName);
  return {
    ...envelope(),
    tool: "lane_status",
    truth_status: status.found ? "PROVEN" : "UNKNOWN",
    lane_name: laneName,
    lane_key: status.lane_key,
    jq_path: status.jq_path,
    found: status.found,
    health: status.health,
    blockers: status.blockers,
    metrics: status.metrics,
    lane: status.lane,
    repo_paths_read: loaded.repo_paths_read,
    truth_note: status.found
      ? `Lane payload projected from ${status.jq_path}.`
      : `Lane ${status.lane_key} not present in Command Center v2 report.`,
  };
}

export async function businessSnapshotV1(
  deps: BuckPartsMcpDepsV1 & { loadReport?: () => Promise<Record<string, unknown>> },
): Promise<BusinessSnapshotResultV1> {
  const { getCoverageMetricsV2 } = await import("./buckparts-mcp-tools-v2");
  const loaded = await loadCommandCenterForMcpV1(deps);
  const coverage = getCoverageMetricsV2(deps);
  const runnerLoaded = loadManufacturerRescueRunnerReportV1({ rootDir: deps.rootDir });
  const controlLoop = loadControlLoopAudit(deps.rootDir);

  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "business_snapshot",
      truth_status: "UNKNOWN",
      load_source: "UNKNOWN",
      coverage: {
        wedge_coverage: coverage.wedge_coverage,
        census_summary: coverage.census_summary,
      },
      rescue_progress: runnerLoaded
        ? {
            ready_for_apply_slug: runnerLoaded.report.ready_for_apply_slug,
            remaining_opportunity: runnerLoaded.report.inspect_summary.remaining_opportunity,
          }
        : { status: "UNKNOWN" },
    repo_runtime_convergence: {
      repo_runtime_parity: coverage.repo_runtime_parity,
    },
      trust_status: {},
      highest_risks: [],
      current_phase: "UNKNOWN",
      next_milestone: "UNKNOWN",
      repo_paths_read: [
        ...loaded.repo_paths_read,
        ...coverage.repo_paths_read,
        ...(runnerLoaded ? [runnerLoaded.runner_source_path] : []),
      ],
      truth_note: loaded.truth_note,
    };
  }

  const v2 = commandCenterV2(loaded.report);
  const brainGate = asRecord(v2?.brain_integrity_gate_v1);
  const packetSummary = asRecord(v2?.next_execution_packet_summary_v1);
  const rescueLane = asRecord(v2?.manufacturer_safe_link_rescue_runner_v1);
  const blockedSummary = asRecord(loaded.report.blocked_link_summary);

  const highest_risks: string[] = [];
  if (typeof blockedSummary?.recommended_first_action === "string") {
    highest_risks.push(blockedSummary.recommended_first_action);
  }
  const correctness = asRecord(v2?.air_purifier_demand_selected_correctness_risks_v1);
  if (Array.isArray(correctness?.top_risks)) {
    for (const risk of correctness.top_risks.slice(0, 3)) {
      const row = asRecord(risk);
      if (row?.summary) highest_risks.push(String(row.summary));
    }
  }
  if (Array.isArray(brainGate?.stop_the_line_entries)) {
    for (const entry of brainGate.stop_the_line_entries.slice(0, 3)) {
      const row = asRecord(entry);
      if (row?.system_id) highest_risks.push(String(row.system_id));
    }
  }

  const distance = asRecord(controlLoop?.distance_to_full_loop);
  const current_phase = asString(distance?.overall ?? loaded.report.next_best_action);

  return {
    ...envelope(),
    tool: "business_snapshot",
    truth_status: "PARTIAL",
    load_source: loaded.source,
    coverage: {
      wedge_coverage: coverage.wedge_coverage,
      repo_runtime_parity: coverage.repo_runtime_parity,
      census_summary: coverage.census_summary,
    },
    rescue_progress: rescueLane
      ? {
          ready_for_apply_slug: rescueLane.ready_for_apply_slug ?? null,
          remaining_opportunity:
            asRecord(rescueLane.inspect_summary)?.remaining_opportunity ?? "UNKNOWN",
          runner_artifact: runnerLoaded?.runner_source_path ?? "UNKNOWN",
        }
      : runnerLoaded
        ? {
            ready_for_apply_slug: runnerLoaded.report.ready_for_apply_slug,
            remaining_opportunity: runnerLoaded.report.inspect_summary.remaining_opportunity,
            runner_artifact: runnerLoaded.runner_source_path,
          }
        : { status: "UNKNOWN" },
    repo_runtime_convergence: {
      air_purifier_convergence: coverage.repo_runtime_parity.air_purifier_convergence,
      rescue_velocity: loaded.report.rescue_velocity_summary ?? "UNKNOWN",
    },
    trust_status: {
      brain_integrity_gate: brainGate,
      operator_can_be_away_status: loaded.report.operator_can_be_away_status ?? "UNKNOWN",
      mutating_blocked: asRecord(loaded.report.execution_guidance)?.mutating_blocked ?? "UNKNOWN",
    },
    highest_risks,
    current_phase,
    next_milestone: asString(packetSummary?.next_packet_title ?? loaded.report.next_best_action),
    repo_paths_read: [
      ...loaded.repo_paths_read,
      ...coverage.repo_paths_read,
      ...(runnerLoaded ? [runnerLoaded.runner_source_path] : []),
      ...(controlLoop ? [COMMAND_CENTER_CONTROL_LOOP_AUDIT_JSON_REL_V1] : []),
    ],
    truth_note: `buckparts_mcp_tools_v2 coverage metrics + Command Center steering; live Supabase parity UNKNOWN unless convergence artifacts prove otherwise.`,
  };
}
