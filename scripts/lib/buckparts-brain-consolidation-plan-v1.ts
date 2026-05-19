/**
 * Read-only consolidation roadmap derived from brain coverage manifest + integrity gate only.
 */

import {
  MANIFEST_DEFAULT_BYPASS_REASON,
  NON_BLOCKING_MISSING_SYSTEM_IDS,
} from "./buckparts-brain-integrity-gate-v1";
import type {
  BrainConsolidationClassificationCountsV1,
  BrainConsolidationClassificationV1,
  BrainCoverageManifestEntryV1,
  BrainConsolidationPlanEntryV1,
  BrainConsolidationPlanV1,
  BrainIntegrityGateV1,
  CommandCenterBrainCoverageManifestV1,
} from "./buckparts-command-center-v2-types";
import { BRAIN_CONSOLIDATION_CLASSIFICATIONS_V1 } from "./buckparts-command-center-v2-types";

export type BuildBrainConsolidationPlanArgs = {
  manifest: CommandCenterBrainCoverageManifestV1;
  gate: BrainIntegrityGateV1;
  now: () => Date;
};

/** Preferred order for next_safe_integration_target when multiple INTEGRATE candidates remain. */
const INTEGRATE_SLICE_PRIORITY_SYSTEM_IDS = [
  "owner_vertical_launch_policy",
  "buckparts_daily",
  "buckparts_demand-work-queue",
  "buckparts_founder_decision_registry",
  "buckparts_next_execution_packet",
  "buckparts_operating_map",
  "buckparts_audit",
] as const;

const STANDALONE_CLASSIFICATIONS: readonly BrainConsolidationClassificationV1[] = [
  "INTENTIONALLY_STANDALONE_DOWNSTREAM_VIEW",
  "INTENTIONALLY_STANDALONE_VALIDATION_HARNESS",
  "INTENTIONALLY_STANDALONE_ON_DEMAND_DEEP_PROOF",
];

function emptyClassificationCounts(): BrainConsolidationClassificationCountsV1 {
  return Object.fromEntries(
    BRAIN_CONSOLIDATION_CLASSIFICATIONS_V1.map((key) => [key, 0]),
  ) as BrainConsolidationClassificationCountsV1;
}

function toPlanEntry(
  entry: BrainCoverageManifestEntryV1,
  consolidation_classification: BrainConsolidationClassificationV1,
  consolidation_reason: string,
): BrainConsolidationPlanEntryV1 {
  return {
    system_id: entry.system_id,
    verdict: entry.verdict,
    dashboard_only: entry.dashboard_only,
    cc_json_path: entry.cc_json_path,
    consolidation_classification,
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

function isRunnerStepValidationHarness(entry: BrainCoverageManifestEntryV1): boolean {
  if (entry.system_id === "buckparts_runner-step") return true;
  if (entry.npm_script_or_path.includes("buckparts:runner-step")) return true;
  return /validation harness; intentionally standalone/i.test(entry.reason);
}

function isGenericIntentionallyStandalone(entry: BrainCoverageManifestEntryV1): boolean {
  if (entry.verdict === "CONNECTED") return false;
  if (isPartialWithCcPath(entry)) return false;
  if (isMarkdownDownstreamDigest(entry)) return false;
  if (isAmazonInsertSafetyPrecheck(entry)) return false;
  if (isRunnerStepValidationHarness(entry)) return false;
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

function isDedupeExistingCcTruth(entry: BrainCoverageManifestEntryV1): boolean {
  if (entry.system_id === "owner_gsc_external_demand" || entry.system_id === "owner_search_demand_and_gaps") {
    return true;
  }
  return entry.verdict === "DUPLICATE";
}

function isExternalLiveTruthRequired(entry: BrainCoverageManifestEntryV1): boolean {
  return entry.system_id === "sentry_error_monitoring" || entry.system_id === "github_actions_live_status";
}

function isKnownDecisionSurfaceBypass(entry: BrainCoverageManifestEntryV1): boolean {
  return entry.verdict === "BYPASSING" && entry.reason !== MANIFEST_DEFAULT_BYPASS_REASON;
}

function isDecisionRelevantMissing(entry: BrainCoverageManifestEntryV1): boolean {
  return (
    entry.verdict === "MISSING" &&
    !(NON_BLOCKING_MISSING_SYSTEM_IDS as readonly string[]).includes(entry.system_id)
  );
}

function wouldIntegrateAsOperatingSummary(entry: BrainCoverageManifestEntryV1): boolean {
  if (entry.verdict === "CONNECTED") return false;
  if (isPartialWithCcPath(entry)) return false;
  if (entry.dashboard_only) {
    return entry.verdict === "BYPASSING" || entry.verdict === "PARTIAL";
  }
  if (isDecisionRelevantMissing(entry)) return true;
  if (isKnownDecisionSurfaceBypass(entry)) return true;
  if (entry.verdict === "PARTIAL" && !entry.cc_json_path) return true;
  return false;
}

function consolidationReasonForClassification(
  entry: BrainCoverageManifestEntryV1,
  classification: BrainConsolidationClassificationV1,
): string {
  switch (classification) {
    case "INTEGRATE_AS_CC_OPERATING_SUMMARY":
      if (entry.dashboard_only) return "Dashboard-only attachment; CC brain does not own this truth yet.";
      if (entry.verdict === "MISSING") return "Missing CC rollup for operator decisions.";
      if (isKnownDecisionSurfaceBypass(entry)) return "Bypassing decision contract; ingest or document in CC JSON.";
      if (entry.verdict === "PARTIAL") return "Partial CC path; finish explicit limits in command_center_v2.";
      return "Decision-useful surface not fully owned by Command Center JSON.";
    case "INTENTIONALLY_STANDALONE_DOWNSTREAM_VIEW":
      return "Markdown downstream digest; reformats CC JSON and optional CI artifacts for founder copy/paste — not CC operating truth.";
    case "INTENTIONALLY_STANDALONE_ON_DEMAND_DEEP_PROOF":
      return "On-demand Amazon refrigerator insert-safety precheck; per-token ASIN reuse proof stays on CLI — cohort priority in command_center_v2.amazon_rescue / amazon_first_blocked_queue_summary.";
    case "INTENTIONALLY_STANDALONE_VALIDATION_HARNESS":
      if (isRunnerStepValidationHarness(entry)) {
        return "Runner Step v1 validation harness; nested npm validation capture stays on CLI/CI — packet truth in command_center_v2.next_execution_packet_summary_v1; must not run inside Command Center.";
      }
      return "Operational CLI, guardrail, runbook, or batch worksheet; standalone by design.";
    case "DO_NOT_INTEGRATE_MUTATING_EXECUTOR":
      return "Mutating executor; excluded from CC brain integration.";
    case "DO_NOT_INTEGRATE_DEPRECATED_CONTEXT":
      if (isHqHandoff(entry)) return "HQ handoff is deprecated context only; never operating truth.";
      return "Raw chat/transcript or non-operating surface.";
    case "EXTERNAL_LIVE_TRUTH_REQUIRED":
      return "Requires live external service or CI last-run truth; not safe to infer from repo files alone.";
    case "DEDUPE_EXISTING_CC_TRUTH":
      return "Duplicates CC neuron or summary; collapse to single CC source of truth.";
    case "UNKNOWN_CLASSIFICATION_REQUIRES_REVIEW":
      return "Manifest row needs explicit consolidation classification before CC integration.";
    default:
      return "UNKNOWN";
  }
}

/** Classify a manifest row before recommending next_consolidation_slice. */
export function classifyBrainConsolidationCandidateV1(
  entry: BrainCoverageManifestEntryV1,
): BrainConsolidationClassificationV1 {
  if (isHqHandoff(entry)) return "DO_NOT_INTEGRATE_DEPRECATED_CONTEXT";
  if (isMutatingSurface(entry)) return "DO_NOT_INTEGRATE_MUTATING_EXECUTOR";
  if (isTranscriptOrChatSurface(entry)) return "DO_NOT_INTEGRATE_DEPRECATED_CONTEXT";
  if (isMarkdownDownstreamDigest(entry)) return "INTENTIONALLY_STANDALONE_DOWNSTREAM_VIEW";
  if (isRunnerStepValidationHarness(entry)) return "INTENTIONALLY_STANDALONE_VALIDATION_HARNESS";
  if (isAmazonInsertSafetyPrecheck(entry)) return "INTENTIONALLY_STANDALONE_ON_DEMAND_DEEP_PROOF";
  if (isDedupeExistingCcTruth(entry)) return "DEDUPE_EXISTING_CC_TRUTH";
  if (isExternalLiveTruthRequired(entry)) return "EXTERNAL_LIVE_TRUTH_REQUIRED";
  if (entry.verdict === "CONNECTED") {
    return "UNKNOWN_CLASSIFICATION_REQUIRES_REVIEW";
  }
  if (isGenericIntentionallyStandalone(entry)) {
    return "UNKNOWN_CLASSIFICATION_REQUIRES_REVIEW";
  }
  if (wouldIntegrateAsOperatingSummary(entry)) {
    return "INTEGRATE_AS_CC_OPERATING_SUMMARY";
  }
  return "UNKNOWN_CLASSIFICATION_REQUIRES_REVIEW";
}

function priorityIndex(system_id: string): number {
  const idx = INTEGRATE_SLICE_PRIORITY_SYSTEM_IDS.indexOf(
    system_id as (typeof INTEGRATE_SLICE_PRIORITY_SYSTEM_IDS)[number],
  );
  return idx === -1 ? INTEGRATE_SLICE_PRIORITY_SYSTEM_IDS.length + 1 : idx;
}

function pickNextConsolidationSlice(
  integrateTargets: BrainConsolidationPlanEntryV1[],
): { next_consolidation_slice: string | null; next_safe_integration_target: BrainConsolidationPlanEntryV1 | null } {
  const sorted = [...integrateTargets].sort((a, b) => priorityIndex(a.system_id) - priorityIndex(b.system_id));
  const top = sorted[0];
  if (!top) {
    return { next_consolidation_slice: null, next_safe_integration_target: null };
  }
  return {
    next_safe_integration_target: top,
    next_consolidation_slice: `Integrate ${top.system_id} into Command Center JSON (${top.verdict}; ${top.consolidation_reason}).`,
  };
}

export function buildBrainConsolidationPlanV1(args: BuildBrainConsolidationPlanArgs): BrainConsolidationPlanV1 {
  const { manifest, gate } = args;
  const entries = manifest.entries ?? [];
  const counts = manifest.verdict_counts ?? manifest.summary.verdict_counts;

  const classification_counts = emptyClassificationCounts();
  const high_priority_consolidation_targets: BrainConsolidationPlanEntryV1[] = [];
  const intentionally_standalone_entries: BrainConsolidationPlanEntryV1[] = [];
  const do_not_integrate_entries: BrainConsolidationPlanEntryV1[] = [];

  for (const entry of entries) {
    const consolidation_classification = classifyBrainConsolidationCandidateV1(entry);
    if (entry.verdict !== "CONNECTED") {
      classification_counts[consolidation_classification] += 1;
    }
    const consolidation_reason = consolidationReasonForClassification(entry, consolidation_classification);
    const planEntry = toPlanEntry(entry, consolidation_classification, consolidation_reason);

    switch (consolidation_classification) {
      case "INTEGRATE_AS_CC_OPERATING_SUMMARY":
        high_priority_consolidation_targets.push(planEntry);
        break;
      case "INTENTIONALLY_STANDALONE_DOWNSTREAM_VIEW":
      case "INTENTIONALLY_STANDALONE_VALIDATION_HARNESS":
      case "INTENTIONALLY_STANDALONE_ON_DEMAND_DEEP_PROOF":
        intentionally_standalone_entries.push(planEntry);
        break;
      case "DO_NOT_INTEGRATE_MUTATING_EXECUTOR":
      case "DO_NOT_INTEGRATE_DEPRECATED_CONTEXT":
        do_not_integrate_entries.push(planEntry);
        break;
      case "UNKNOWN_CLASSIFICATION_REQUIRES_REVIEW":
        if (isGenericIntentionallyStandalone(entry)) {
          intentionally_standalone_entries.push(planEntry);
        }
        break;
      default:
        break;
    }
  }

  high_priority_consolidation_targets.sort(
    (a, b) => priorityIndex(a.system_id) - priorityIndex(b.system_id),
  );

  const { next_consolidation_slice, next_safe_integration_target } = pickNextConsolidationSlice(
    high_priority_consolidation_targets,
  );

  const skipped_standalone_count = STANDALONE_CLASSIFICATIONS.reduce(
    (sum, key) => sum + classification_counts[key],
    0,
  );
  const skipped_external_count = classification_counts.EXTERNAL_LIVE_TRUTH_REQUIRED;
  const skipped_duplicate_count = classification_counts.DEDUPE_EXISTING_CC_TRUTH;
  const unknown_classification_count = classification_counts.UNKNOWN_CLASSIFICATION_REQUIRES_REVIEW;

  const dashboard_only_gap_count = entries.filter(
    (e) => e.dashboard_only && e.verdict !== "CONNECTED",
  ).length;

  const stop_rule =
    gate.brain_status === "PROCEED" &&
    dashboard_only_gap_count === 0 &&
    high_priority_consolidation_targets.length === 0
      ? "STOP: brain_integrity_gate_v1 is PROCEED with no dashboard-only gaps and no high-priority consolidation targets."
      : gate.brain_status === "STOP_THE_LINE"
        ? "STOP: resolve brain_integrity_gate_v1 STOP_THE_LINE before any consolidation slice."
        : "CONTINUE: execute one read-only consolidation slice at a time; never batch-integrate manifest rows in a single mutating PR.";

  const proven_facts = [
    "brain_consolidation_plan_v1 consumes command_center_brain_coverage_manifest_v1 and brain_integrity_gate_v1 only.",
    `brain_integrity_gate_v1.brain_status=${gate.brain_status}; lane_work_allowed=${gate.lane_work_allowed}.`,
    `high_priority_targets=${high_priority_consolidation_targets.length}; intentionally_standalone=${intentionally_standalone_entries.length}; do_not_integrate=${do_not_integrate_entries.length}.`,
    `classification_counts.INTEGRATE_AS_CC_OPERATING_SUMMARY=${classification_counts.INTEGRATE_AS_CC_OPERATING_SUMMARY}.`,
  ];

  if (next_consolidation_slice === null) {
    proven_facts.push(
      "NO_SAFE_OPERATING_SUMMARY_TARGET: no manifest row classified as INTEGRATE_AS_CC_OPERATING_SUMMARY.",
    );
  } else if (next_safe_integration_target) {
    proven_facts.push(
      `next_safe_integration_target=${next_safe_integration_target.system_id}; classification=${next_safe_integration_target.consolidation_classification}.`,
    );
  }

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
    classification_counts,
    next_safe_integration_target,
    skipped_standalone_count,
    skipped_external_count,
    skipped_duplicate_count,
    unknown_classification_count,
    high_priority_consolidation_targets,
    intentionally_standalone_entries,
    do_not_integrate_entries,
    next_consolidation_slice,
    stop_rule,
    proven_facts,
    unknown_facts: [
      ...manifest.unknown_facts.slice(0, 2),
      "Plan does not estimate engineering time per slice; ordering is manifest-derived priority only.",
      unknown_classification_count > 0
        ? `${unknown_classification_count} manifest row(s) require explicit classification before CC integration.`
        : "All non-CONNECTED manifest rows have explicit consolidation classifications.",
    ],
  };
}
