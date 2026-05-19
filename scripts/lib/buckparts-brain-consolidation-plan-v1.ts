/**
 * Read-only consolidation roadmap derived from brain coverage manifest + integrity gate only.
 */

import {
  MANIFEST_DEFAULT_BYPASS_REASON,
  NON_BLOCKING_MISSING_SYSTEM_IDS,
} from "./buckparts-brain-integrity-gate-v1";
import type {
  BrainCoverageManifestEntryV1,
  BrainConsolidationPlanEntryV1,
  BrainConsolidationPlanV1,
  BrainIntegrityGateV1,
  CommandCenterBrainCoverageManifestV1,
} from "./buckparts-command-center-v2-types";

export type BuildBrainConsolidationPlanArgs = {
  manifest: CommandCenterBrainCoverageManifestV1;
  gate: BrainIntegrityGateV1;
  now: () => Date;
};

/** Preferred order for next_consolidation_slice when multiple targets remain. */
const NEXT_SLICE_PRIORITY_SYSTEM_IDS = [
  "owner_vertical_launch_policy",
  "buckparts_daily",
  "buckparts_demand-work-queue",
  "owner_gsc_external_demand",
  "owner_search_demand_and_gaps",
  "buckparts_founder_decision_registry",
  "buckparts_next_execution_packet",
  "buckparts_operating_map",
  "buckparts_runner_step",
  "buckparts_audit",
  "sentry_error_monitoring",
  "github_actions_live_status",
] as const;

function toPlanEntry(
  entry: BrainCoverageManifestEntryV1,
  consolidation_reason: string,
): BrainConsolidationPlanEntryV1 {
  return {
    system_id: entry.system_id,
    verdict: entry.verdict,
    dashboard_only: entry.dashboard_only,
    cc_json_path: entry.cc_json_path,
    consolidation_reason,
  };
}

function isMutatingSurface(entry: BrainCoverageManifestEntryV1): boolean {
  return (
    entry.system_id.includes("mutate") ||
    entry.npm_script_or_path.includes(":mutate") ||
    /mutating executor/i.test(entry.reason)
  );
}

function isTranscriptOrChatSurface(entry: BrainCoverageManifestEntryV1): boolean {
  return /transcript|chat|conversation/i.test(entry.npm_script_or_path + entry.reason);
}

function isHqHandoff(entry: BrainCoverageManifestEntryV1): boolean {
  return entry.system_id === "hq_handoff_doc" || entry.verdict === "DEPRECATED";
}

function isDoNotIntegrate(entry: BrainCoverageManifestEntryV1): boolean {
  if (isHqHandoff(entry)) return true;
  if (isMutatingSurface(entry)) return true;
  if (isTranscriptOrChatSurface(entry)) return true;
  return false;
}

function isPartialWithCcPath(entry: BrainCoverageManifestEntryV1): boolean {
  return entry.verdict === "PARTIAL" && entry.cc_json_path != null && entry.cc_json_path.length > 0;
}

function isMarkdownDownstreamDigest(entry: BrainCoverageManifestEntryV1): boolean {
  if (entry.system_id === "buckparts_founder-digest") return true;
  if (entry.npm_script_or_path.includes("buckparts:founder-digest")) return true;
  return /Markdown downstream digest; intentionally standalone/i.test(entry.reason);
}

function isAmazonInsertSafetyPrecheck(entry: BrainCoverageManifestEntryV1): boolean {
  if (entry.system_id === "buckparts_precheck_amazon-refrigerator-tokens") return true;
  if (entry.npm_script_or_path.includes("buckparts:precheck:amazon-refrigerator-tokens")) return true;
  return /insert-safety precheck; intentionally standalone/i.test(entry.reason);
}

function isIntentionallyStandalone(entry: BrainCoverageManifestEntryV1): boolean {
  if (isDoNotIntegrate(entry)) return false;
  if (entry.verdict === "CONNECTED") return false;
  if (isPartialWithCcPath(entry)) return false;
  if (isMarkdownDownstreamDigest(entry)) return true;
  if (isAmazonInsertSafetyPrecheck(entry)) return true;
  if (isMutatingSurface(entry)) return true;
  const path = `${entry.system_id} ${entry.npm_script_or_path}`;
  if (
    /guardrails|runbook|worksheet|template|write-batch|screenshot|preflight|stage_|staged-filter|cleanup_demo|discover_|repairclinic-.*-blocked|search-gap_status|report_affiliate|report_search|report_launch|report_business|operator_fridge|operator-proof|ops_cross|copy-next|command-surface_snapshot|batch-agent|batch-evidence|batch-owner|batch-production|batch_production|learning-outcomes-approved-insert/i.test(
      path,
    )
  ) {
    return true;
  }
  if (entry.reason === MANIFEST_DEFAULT_BYPASS_REASON) {
    return true;
  }
  return false;
}

function isDecisionRelevantMissing(entry: BrainCoverageManifestEntryV1): boolean {
  return (
    entry.verdict === "MISSING" &&
    !(NON_BLOCKING_MISSING_SYSTEM_IDS as readonly string[]).includes(entry.system_id)
  );
}

function isKnownDecisionSurfaceBypass(entry: BrainCoverageManifestEntryV1): boolean {
  return entry.verdict === "BYPASSING" && entry.reason !== MANIFEST_DEFAULT_BYPASS_REASON;
}

function isHighPriorityConsolidationTarget(entry: BrainCoverageManifestEntryV1): boolean {
  if (isDoNotIntegrate(entry)) return false;
  if (isIntentionallyStandalone(entry)) return false;
  if (entry.dashboard_only && entry.verdict !== "CONNECTED") return true;
  if (entry.verdict === "DUPLICATE") return true;
  if (isDecisionRelevantMissing(entry)) return true;
  if (isKnownDecisionSurfaceBypass(entry)) return true;
  if (entry.verdict === "PARTIAL" && !entry.cc_json_path) return true;
  return false;
}

function priorityIndex(system_id: string): number {
  const idx = NEXT_SLICE_PRIORITY_SYSTEM_IDS.indexOf(
    system_id as (typeof NEXT_SLICE_PRIORITY_SYSTEM_IDS)[number],
  );
  return idx === -1 ? NEXT_SLICE_PRIORITY_SYSTEM_IDS.length + 1 : idx;
}

function pickNextConsolidationSlice(
  highPriority: BrainConsolidationPlanEntryV1[],
  entries: BrainCoverageManifestEntryV1[],
): string {
  const vertical = entries.find((e) => e.system_id === "owner_vertical_launch_policy");
  if (vertical?.dashboard_only && vertical.verdict !== "CONNECTED") {
    return "Integrate owner_vertical_launch_policy into command_center_v2.owner_vertical_launch_policy_v1 (currently dashboard-only BYPASSING).";
  }

  const nonDashboard = highPriority
    .filter((t) => !t.dashboard_only)
    .sort((a, b) => priorityIndex(a.system_id) - priorityIndex(b.system_id));
  if (nonDashboard.length > 0) {
    const top = nonDashboard[0]!;
    return `Integrate ${top.system_id} into Command Center JSON (${top.verdict}; ${top.consolidation_reason}).`;
  }

  const dashboardGap = highPriority.find((t) => t.dashboard_only);
  if (dashboardGap) {
    return `Integrate ${dashboardGap.system_id} into Command Center JSON (${dashboardGap.verdict}; dashboard-only gap).`;
  }

  return "No consolidation slice required; decision-useful surfaces are CONNECTED or explicitly excluded.";
}

export function buildBrainConsolidationPlanV1(args: BuildBrainConsolidationPlanArgs): BrainConsolidationPlanV1 {
  const { manifest, gate } = args;
  const entries = manifest.entries ?? [];
  const counts = manifest.verdict_counts ?? manifest.summary.verdict_counts;

  const high_priority_consolidation_targets: BrainConsolidationPlanEntryV1[] = [];
  const intentionally_standalone_entries: BrainConsolidationPlanEntryV1[] = [];
  const do_not_integrate_entries: BrainConsolidationPlanEntryV1[] = [];

  for (const entry of entries) {
    if (isDoNotIntegrate(entry)) {
      do_not_integrate_entries.push(
        toPlanEntry(
          entry,
          isHqHandoff(entry)
            ? "HQ handoff is deprecated context only; never operating truth."
            : isMutatingSurface(entry)
              ? "Mutating executor; excluded from CC brain integration."
              : "Raw chat/transcript or non-operating surface.",
        ),
      );
      continue;
    }
    if (isIntentionallyStandalone(entry)) {
      intentionally_standalone_entries.push(
        toPlanEntry(
          entry,
          isMarkdownDownstreamDigest(entry)
            ? "Markdown downstream digest; reformats CC JSON and optional CI artifacts for founder copy/paste — not CC operating truth."
            : isAmazonInsertSafetyPrecheck(entry)
              ? "On-demand Amazon refrigerator insert-safety precheck; per-token ASIN reuse proof stays on CLI — cohort priority in command_center_v2.amazon_rescue / amazon_first_blocked_queue_summary."
              : isMutatingSurface(entry)
              ? "Mutating or write path; must remain outside read-only CC brain."
              : "Operational CLI, guardrail, runbook, or batch worksheet; standalone by design.",
        ),
      );
      continue;
    }
    if (isHighPriorityConsolidationTarget(entry)) {
      let reason = "Decision-useful surface not fully owned by Command Center JSON.";
      if (entry.dashboard_only) reason = "Dashboard-only attachment; CC brain does not own this truth yet.";
      else if (entry.verdict === "DUPLICATE") reason = "Duplicates CC neuron or summary; collapse to single CC source of truth.";
      else if (entry.verdict === "MISSING") reason = "Missing CC rollup for operator decisions.";
      else if (isKnownDecisionSurfaceBypass(entry)) reason = "Bypassing decision contract; ingest or document in CC JSON.";
      else if (entry.verdict === "PARTIAL") reason = "Partial CC path; finish explicit limits in command_center_v2.";
      high_priority_consolidation_targets.push(toPlanEntry(entry, reason));
    }
  }

  high_priority_consolidation_targets.sort(
    (a, b) => priorityIndex(a.system_id) - priorityIndex(b.system_id),
  );

  const dashboard_only_gap_count = entries.filter(
    (e) => e.dashboard_only && e.verdict !== "CONNECTED",
  ).length;

  const next_consolidation_slice = pickNextConsolidationSlice(high_priority_consolidation_targets, entries);

  const stop_rule =
    gate.brain_status === "PROCEED" && dashboard_only_gap_count === 0 && high_priority_consolidation_targets.length === 0
      ? "STOP: brain_integrity_gate_v1 is PROCEED with no dashboard-only gaps and no high-priority consolidation targets."
      : gate.brain_status === "STOP_THE_LINE"
        ? "STOP: resolve brain_integrity_gate_v1 STOP_THE_LINE before any consolidation slice."
        : "CONTINUE: execute one read-only consolidation slice at a time; never batch-integrate manifest rows in a single mutating PR.";

  return {
    contract: "brain_consolidation_plan_v1",
    read_only: true,
    data_mutation: false,
    total_entries: manifest.total_entries ?? entries.length,
    connected_count: counts.CONNECTED,
    missing_count: counts.MISSING,
    bypassing_count: counts.BYPASSING,
    duplicate_count: counts.DUPLICATE,
    deprecated_count: counts.DEPRECATED,
    partial_count: counts.PARTIAL,
    dashboard_only_gap_count,
    high_priority_consolidation_targets,
    intentionally_standalone_entries,
    do_not_integrate_entries,
    next_consolidation_slice,
    stop_rule,
    proven_facts: [
      "brain_consolidation_plan_v1 consumes command_center_brain_coverage_manifest_v1 and brain_integrity_gate_v1 only.",
      `brain_integrity_gate_v1.brain_status=${gate.brain_status}; lane_work_allowed=${gate.lane_work_allowed}.`,
      `high_priority_targets=${high_priority_consolidation_targets.length}; intentionally_standalone=${intentionally_standalone_entries.length}; do_not_integrate=${do_not_integrate_entries.length}.`,
    ],
    unknown_facts: [
      ...manifest.unknown_facts.slice(0, 2),
      "Plan does not estimate engineering time per slice; ordering is manifest-derived priority only.",
    ],
  };
}
