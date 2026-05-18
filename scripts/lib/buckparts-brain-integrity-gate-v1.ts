/**
 * Read-only governance gate derived solely from command_center_brain_coverage_manifest_v1.
 */

import type {
  BrainCoverageManifestEntryV1,
  CommandCenterBrainCoverageManifestV1,
} from "./buckparts-command-center-v2-types";
import type { BrainIntegrityGateV1 } from "./buckparts-command-center-v2-types";

export type BuildBrainIntegrityGateArgs = {
  manifest: CommandCenterBrainCoverageManifestV1;
  now: () => Date;
};

/** Default reason assigned to enumerated buckparts:* scripts without explicit override. */
export const MANIFEST_DEFAULT_BYPASS_REASON =
  "buckparts:* CLI emits a separate report contract; not embedded in Command Center JSON stdout.";

/** Dashboard-only surfaces that bypass CC but affect operator decisions. */
export const DASHBOARD_DECISION_BRAIN_GAP_SYSTEM_IDS = ["owner_vertical_launch_policy"] as const;

/** MISSING inventory rows that do not block read-only Amazon evidence lane work by policy. */
export const NON_BLOCKING_MISSING_SYSTEM_IDS = [
  "github_actions_live_status",
  "sentry_error_monitoring",
] as const;

function isIntentionallyExcludedMutationSurface(entry: BrainCoverageManifestEntryV1): boolean {
  if (!entry.blocks_lane_work) return false;
  return (
    entry.system_id.includes("mutate") ||
    entry.npm_script_or_path.includes(":mutate") ||
    /mutating executor/i.test(entry.reason)
  );
}

function isDashboardDecisionBrainGap(entry: BrainCoverageManifestEntryV1): boolean {
  return (DASHBOARD_DECISION_BRAIN_GAP_SYSTEM_IDS as readonly string[]).includes(entry.system_id);
}

function isNonBlockingMissing(entry: BrainCoverageManifestEntryV1): boolean {
  return entry.verdict === "MISSING" && (NON_BLOCKING_MISSING_SYSTEM_IDS as readonly string[]).includes(entry.system_id);
}

function isAllowedOperationalBypass(entry: BrainCoverageManifestEntryV1): boolean {
  return entry.verdict === "BYPASSING" && entry.reason === MANIFEST_DEFAULT_BYPASS_REASON;
}

function isPartialWithExplicitCcLimits(entry: BrainCoverageManifestEntryV1): boolean {
  return entry.verdict === "PARTIAL" && entry.cc_json_path != null && entry.cc_json_path.length > 0;
}

function isDuplicateWithCcSourceOfTruth(entry: BrainCoverageManifestEntryV1): boolean {
  return entry.verdict === "DUPLICATE";
}

function isDecisionUsefulBrainGap(entry: BrainCoverageManifestEntryV1): boolean {
  if (isIntentionallyExcludedMutationSurface(entry)) return false;
  if (entry.verdict === "DEPRECATED") return false;
  if (isNonBlockingMissing(entry)) return false;
  if (isDashboardDecisionBrainGap(entry)) return true;
  if (entry.verdict === "CONNECTED") return false;
  if (isPartialWithExplicitCcLimits(entry)) return false;
  if (isDuplicateWithCcSourceOfTruth(entry)) return false;
  if (isAllowedOperationalBypass(entry)) return false;
  if (entry.verdict === "MISSING") return true;
  if (entry.verdict === "BYPASSING") return true;
  if (entry.verdict === "PARTIAL" && !entry.cc_json_path) return true;
  return false;
}

export function buildBrainIntegrityGateV1(args: BuildBrainIntegrityGateArgs): BrainIntegrityGateV1 {
  const { manifest } = args;
  const entries = manifest.entries ?? [];
  const verdict_counts = manifest.verdict_counts ?? manifest.summary?.verdict_counts;
  if (!verdict_counts) {
    throw new Error(
      "buildBrainIntegrityGateV1 requires command_center_brain_coverage_manifest_v1.verdict_counts",
    );
  }

  const stop_the_line_entries = entries.filter(
    (e) => e.blocks_lane_work && !isIntentionallyExcludedMutationSurface(e),
  );
  const missing_entries = entries.filter((e) => e.verdict === "MISSING");
  const duplicate_entries = entries.filter((e) => e.verdict === "DUPLICATE");
  const partial_entries = entries.filter(
    (e) => e.verdict === "PARTIAL" || isDashboardDecisionBrainGap(e),
  );
  const allowed_bypass_entries = entries.filter(isAllowedOperationalBypass);
  const decisionUsefulGaps = entries.filter(isDecisionUsefulBrainGap);

  let brain_status: BrainIntegrityGateV1["brain_status"];
  if (stop_the_line_entries.length > 0) {
    brain_status = "STOP_THE_LINE";
  } else if (decisionUsefulGaps.length > 0) {
    brain_status = "PROCEED_WITH_KNOWN_LIMITS";
  } else {
    brain_status = "PROCEED";
  }

  const lane_work_allowed = brain_status !== "STOP_THE_LINE";
  const gapCount = decisionUsefulGaps.length;

  let next_brain_action: string;
  let lane_work_allowed_reason: string;
  if (brain_status === "STOP_THE_LINE") {
    const ids = stop_the_line_entries.map((e) => e.system_id).join(", ");
    next_brain_action = `STOP THE LINE: resolve brain_integrity_gate_v1 blockers before lane work (${ids}).`;
    lane_work_allowed_reason = `Lane work blocked: ${stop_the_line_entries.length} manifest row(s) set blocks_lane_work without mutation-surface exclusion.`;
  } else if (brain_status === "PROCEED_WITH_KNOWN_LIMITS") {
    next_brain_action =
      "Continue read-only lane work from next_best_action; ingest or document bypassing decision surfaces in Command Center JSON before treating CC as full brain.";
    lane_work_allowed_reason = `Read-only lane work allowed with ${gapCount} decision-useful brain gap(s); GitHub/Sentry MISSING rows do not block Amazon read-only evidence by policy.`;
  } else {
    next_brain_action = "Brain coverage satisfies proceed criteria; follow Command Center lane next_best_action.";
    lane_work_allowed_reason = "All decision-useful systems are CONNECTED, PARTIAL-with-CC-path, or DUPLICATE-with-CC source of truth.";
  }

  const proven_facts = [
    "brain_integrity_gate_v1 consumes command_center_brain_coverage_manifest_v1 only; it does not rescan repo systems.",
    `Manifest total_entries=${entries.length}; decision_useful_brain_gaps=${gapCount}; stop_the_line=${stop_the_line_entries.length}.`,
    "Mutating executor scripts with blocks_lane_work are intentionally excluded mutation surfaces, not CC bypass defects.",
    "github_actions_live_status and sentry_error_monitoring MISSING rows are inventoried but do not block read-only Amazon evidence lane work.",
  ];

  if (brain_status === "PROCEED_WITH_KNOWN_LIMITS") {
    proven_facts.push(
      `BRAIN_CAVEAT: Preserve lane next_best_action; ${gapCount} decision surface(s) bypass or partially bypass Command Center JSON (see partial_entries and decision-useful BYPASSING rows in manifest).`,
    );
  }

  const unknown_facts = [
    ...manifest.unknown_facts,
    "Gate does not prove CI last-run green or Sentry incident volume; only manifest verdicts.",
  ];

  return {
    contract: "brain_integrity_gate_v1",
    read_only: true,
    data_mutation: false,
    runtime_status: entries.length > 0 ? "OK" : "UNKNOWN",
    brain_status,
    total_entries: manifest.total_entries ?? entries.length,
    verdict_counts,
    brain_manifest_counts: verdict_counts,
    stop_the_line_entries,
    allowed_bypass_entries,
    missing_entries,
    duplicate_entries,
    partial_entries,
    next_brain_action,
    lane_work_allowed,
    lane_work_allowed_reason,
    proven_facts,
    unknown_facts,
  };
}
