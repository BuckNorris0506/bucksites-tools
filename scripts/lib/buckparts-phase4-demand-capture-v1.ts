/**
 * Phase 4 Demand-Capture v1 — read-only sibling to coverage + decision-capture.
 * Summarizes customer demand visibility. Missing telemetry stays UNKNOWN (never 0).
 * No mutation, steering, dispatch, NBA, prioritization, or page recommendations.
 */

import type { DemandToCoverageNextLaneReportV1 } from "./demand-to-coverage-next-lane-v1";
import type { ExternalMeasurementFreshnessV1 } from "./buckparts-command-center-v2-types";

export const PHASE4_DEMAND_CAPTURE_CONTRACT_V1 = "phase4_demand_capture_v1" as const;

export const PHASE4_DEMAND_CAPTURE_CC_JQ_PATH_V1 =
  ".command_center_v2.phase4_demand_capture_v1" as const;

export const PHASE4_DEMAND_CAPTURE_SOURCE_COMMAND_V1 =
  "npm run buckparts:command-center" as const;

export type Phase4DemandVisibilityStatusV1 = "PROVEN" | "STALE" | "UNKNOWN";

export type Phase4DemandCaptureRuntimeStatusV1 = "OK" | "ATTENTION" | "NOT_PROVEN" | "UNKNOWN";

export type Phase4CountOrUnknownV1 = number | "UNKNOWN";

export type Phase4DemandCaptureSearchClickInputV1 = {
  runtime_status: "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED" | string;
  search_events?: {
    last_7d?: number | "UNKNOWN";
    last_30d?: number | "UNKNOWN";
  };
  click_events?: {
    last_7d?: number | "UNKNOWN";
    last_30d?: number | "UNKNOWN";
  };
};

export type Phase4DemandCaptureDimensionV1 = {
  dimension_id:
    | "demand_signal_status"
    | "gsc_status"
    | "ga4_status"
    | "search_events_status"
    | "click_events_status"
    | "demand_questions_observed"
    | "demand_questions_resolved"
    | "demand_questions_unknown"
    | "demand_blocked_by_no_safe_path"
    | "freshness_status"
    | "evidence_timestamp";
  status: Phase4DemandVisibilityStatusV1;
  value: Phase4DemandVisibilityStatusV1 | Phase4CountOrUnknownV1 | string;
  notes: string[];
};

export type Phase4DemandCaptureV1 = {
  contract: typeof PHASE4_DEMAND_CAPTURE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  steering_authority: false;
  dispatch_authority: false;
  owner_approval_authority: false;
  nba_authority: false;
  recommended_jq_path: typeof PHASE4_DEMAND_CAPTURE_CC_JQ_PATH_V1;
  source_command: typeof PHASE4_DEMAND_CAPTURE_SOURCE_COMMAND_V1;
  generated_at: string;
  runtime_status: Phase4DemandCaptureRuntimeStatusV1;
  demand_signal_status: Phase4DemandVisibilityStatusV1;
  gsc_status: Phase4DemandVisibilityStatusV1;
  ga4_status: Phase4DemandVisibilityStatusV1;
  search_events_status: Phase4DemandVisibilityStatusV1;
  click_events_status: Phase4DemandVisibilityStatusV1;
  demand_questions_observed: Phase4CountOrUnknownV1;
  demand_questions_resolved: Phase4CountOrUnknownV1;
  demand_questions_unknown: Phase4CountOrUnknownV1;
  demand_blocked_by_no_safe_path: Phase4CountOrUnknownV1;
  freshness_status: Phase4DemandVisibilityStatusV1;
  evidence_timestamp: string | "UNKNOWN";
  dimensions: Phase4DemandCaptureDimensionV1[];
  source_paths: string[];
  blockers: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
  steering_note: string;
};

export type BuildPhase4DemandCaptureArgsV1 = {
  now?: () => Date;
  demandNextLane?: DemandToCoverageNextLaneReportV1 | null;
  externalMeasurementFreshness?: ExternalMeasurementFreshnessV1 | null;
  searchAndClick?: Phase4DemandCaptureSearchClickInputV1 | null;
};

function sortedUnique(values: string[]): string[] {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))].sort();
}

function mapOverallFreshness(
  status: ExternalMeasurementFreshnessV1["overall_status"] | undefined,
): Phase4DemandVisibilityStatusV1 {
  if (status === "OK") return "PROVEN";
  if (status === "STALE") return "STALE";
  return "UNKNOWN";
}

function mapChannelFreshness(args: {
  present: boolean;
  usability: "OK" | "UNKNOWN" | undefined;
  freshness: "OK" | "STALE" | "UNKNOWN" | undefined;
}): Phase4DemandVisibilityStatusV1 {
  if (!args.present) return "UNKNOWN";
  if (args.usability !== "OK") return "UNKNOWN";
  if (args.freshness === "OK") return "PROVEN";
  if (args.freshness === "STALE") return "STALE";
  return "UNKNOWN";
}

function resolveDemandSignal(
  demand: DemandToCoverageNextLaneReportV1 | null | undefined,
): { status: Phase4DemandVisibilityStatusV1; notes: string[]; blockers: string[] } {
  if (!demand || demand.contract !== "demand_to_coverage_next_lane_v1") {
    return {
      status: "UNKNOWN",
      notes: [
        "UNKNOWN: demand_to_coverage_next_lane_v1 unavailable — demand is not coerced to zero.",
      ],
      blockers: ["phase4_demand_capture_demand_signal_unknown"],
    };
  }
  if (demand.runtime_status === "UNKNOWN" || demand.source_status === "UNKNOWN") {
    return {
      status: "UNKNOWN",
      notes: [
        "UNKNOWN: demand next-lane runtime/source is UNKNOWN — demand is not coerced to zero.",
        `recommendation_status=${demand.recommendation_status}`,
      ],
      blockers: ["phase4_demand_capture_demand_signal_unknown"],
    };
  }
  if (demand.runtime_status === "PARTIAL") {
    return {
      status: "STALE",
      notes: [
        "STALE/PARTIAL: demand next-lane is partial — treat demand as non-zero-capable but not fully proven.",
        `recommendation_status=${demand.recommendation_status}`,
      ],
      blockers: [],
    };
  }
  return {
    status: "PROVEN",
    notes: [
      `PROVEN: demand recommendation_status=${demand.recommendation_status}; recommended_wedge=${String(demand.recommended_wedge)}.`,
      "Demand-Capture does not prioritize wedges or recommend pages.",
    ],
    blockers: [],
  };
}

function resolveTelemetryStatus(
  channel: "search_events" | "click_events",
  summary: Phase4DemandCaptureSearchClickInputV1 | null | undefined,
): { status: Phase4DemandVisibilityStatusV1; notes: string[]; blockers: string[] } {
  if (!summary) {
    return {
      status: "UNKNOWN",
      notes: [`UNKNOWN: ${channel} summary unavailable — not coerced to zero.`],
      blockers: [`phase4_demand_capture_${channel}_unknown`],
    };
  }
  if (summary.runtime_status !== "OK") {
    return {
      status: "UNKNOWN",
      notes: [
        `UNKNOWN: ${channel} runtime_status=${String(summary.runtime_status)} — not coerced to zero.`,
      ],
      blockers: [`phase4_demand_capture_${channel}_unknown`],
    };
  }
  const bucket = channel === "search_events" ? summary.search_events : summary.click_events;
  const last7 = bucket?.last_7d;
  const last30 = bucket?.last_30d;
  if (last7 === "UNKNOWN" && last30 === "UNKNOWN") {
    return {
      status: "UNKNOWN",
      notes: [`UNKNOWN: ${channel} window counts are UNKNOWN — not coerced to zero.`],
      blockers: [`phase4_demand_capture_${channel}_unknown`],
    };
  }
  if (typeof last7 !== "number" && typeof last30 !== "number") {
    return {
      status: "UNKNOWN",
      notes: [`UNKNOWN: ${channel} lacks numeric window evidence — not coerced to zero.`],
      blockers: [`phase4_demand_capture_${channel}_unknown`],
    };
  }
  return {
    status: "PROVEN",
    notes: [
      `PROVEN: ${channel} queried (runtime_status=OK); last_7d=${String(last7)}; last_30d=${String(last30)}.`,
      "Proven numeric zero (if present) is an observed count, not a substitute for missing telemetry.",
    ],
    blockers: [],
  };
}

function pickEvidenceTimestamp(
  freshness: ExternalMeasurementFreshnessV1 | null | undefined,
): string | "UNKNOWN" {
  if (!freshness || freshness.contract !== "external_measurement_freshness_v1") return "UNKNOWN";
  const candidates = [
    freshness.gsc.fetched_at_or_export_date,
    freshness.ga4.fetched_at,
  ].filter((value): value is string => typeof value === "string" && value !== "UNKNOWN" && value.trim() !== "");
  if (candidates.length === 0) return "UNKNOWN";
  return [...candidates].sort().at(-1) ?? "UNKNOWN";
}

function emptyCapture(args: {
  generated_at: string;
  blockers: string[];
  unknown_facts: string[];
}): Phase4DemandCaptureV1 {
  const unknownDims: Phase4DemandCaptureDimensionV1[] = [
    {
      dimension_id: "demand_signal_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: Demand-Capture not proven."],
    },
    {
      dimension_id: "gsc_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: GSC not proven."],
    },
    {
      dimension_id: "ga4_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: GA4 not proven."],
    },
    {
      dimension_id: "search_events_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: search_events not proven."],
    },
    {
      dimension_id: "click_events_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: click_events not proven."],
    },
    {
      dimension_id: "demand_questions_observed",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: demand_questions lane not proven — not coerced to zero."],
    },
    {
      dimension_id: "demand_questions_resolved",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: demand_questions lane not proven — not coerced to zero."],
    },
    {
      dimension_id: "demand_questions_unknown",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: demand_questions lane not proven — not coerced to zero."],
    },
    {
      dimension_id: "demand_blocked_by_no_safe_path",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: demand_blocked_by_no_safe_path lane not proven — not coerced to zero."],
    },
    {
      dimension_id: "freshness_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: freshness not proven."],
    },
    {
      dimension_id: "evidence_timestamp",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: evidence_timestamp unavailable."],
    },
  ];
  unknownDims.sort((a, b) => a.dimension_id.localeCompare(b.dimension_id));
  return {
    contract: PHASE4_DEMAND_CAPTURE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    steering_authority: false,
    dispatch_authority: false,
    owner_approval_authority: false,
    nba_authority: false,
    recommended_jq_path: PHASE4_DEMAND_CAPTURE_CC_JQ_PATH_V1,
    source_command: PHASE4_DEMAND_CAPTURE_SOURCE_COMMAND_V1,
    generated_at: args.generated_at,
    runtime_status: "NOT_PROVEN",
    demand_signal_status: "UNKNOWN",
    gsc_status: "UNKNOWN",
    ga4_status: "UNKNOWN",
    search_events_status: "UNKNOWN",
    click_events_status: "UNKNOWN",
    demand_questions_observed: "UNKNOWN",
    demand_questions_resolved: "UNKNOWN",
    demand_questions_unknown: "UNKNOWN",
    demand_blocked_by_no_safe_path: "UNKNOWN",
    freshness_status: "UNKNOWN",
    evidence_timestamp: "UNKNOWN",
    dimensions: unknownDims,
    source_paths: [],
    blockers: sortedUnique(args.blockers),
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: sortedUnique(args.unknown_facts),
    recommended_next_action:
      "NOT_PROVEN: restore demand visibility evidence (GSC/GA4/search/click) before using Demand-Capture. No prioritization or mutation authorized.",
    steering_note:
      "Sibling to phase4_coverage_scoreboard_v1 and phase4_decision_capture_v1 only: issue_registry remains steering; canonical_final remains NBA; Demand-Capture cannot authorize mutation, dispatch, owner approval, or set NBA.",
  };
}

export function buildPhase4DemandCaptureV1(
  args: BuildPhase4DemandCaptureArgsV1,
): Phase4DemandCaptureV1 {
  const generated_at = (args.now ?? (() => new Date()))().toISOString();
  const demand = resolveDemandSignal(args.demandNextLane);
  const freshness = args.externalMeasurementFreshness;
  const freshnessPresent =
    !!freshness && freshness.contract === "external_measurement_freshness_v1";

  const gsc_status = freshnessPresent
    ? mapChannelFreshness({
        present: freshness.gsc.artifact_source !== "NONE",
        usability: freshness.gsc.measurement_usability_status,
        freshness: freshness.gsc.freshness_status,
      })
    : "UNKNOWN";
  const ga4_status = freshnessPresent
    ? mapChannelFreshness({
        present: freshness.ga4.artifact_source !== "NONE",
        usability: freshness.ga4.measurement_usability_status,
        freshness: freshness.ga4.freshness_status,
      })
    : "UNKNOWN";
  const freshness_status = freshnessPresent
    ? mapOverallFreshness(freshness.overall_status)
    : "UNKNOWN";
  const evidence_timestamp = pickEvidenceTimestamp(freshness);

  const search = resolveTelemetryStatus("search_events", args.searchAndClick);
  const clicks = resolveTelemetryStatus("click_events", args.searchAndClick);

  // Dedicated demand-questions / blocked-by-no-safe-path evidence lanes are not proven in v1.
  const demand_questions_observed: Phase4CountOrUnknownV1 = "UNKNOWN";
  const demand_questions_resolved: Phase4CountOrUnknownV1 = "UNKNOWN";
  const demand_questions_unknown: Phase4CountOrUnknownV1 = "UNKNOWN";
  const demand_blocked_by_no_safe_path: Phase4CountOrUnknownV1 = "UNKNOWN";

  const blockers = sortedUnique([
    ...demand.blockers,
    ...search.blockers,
    ...clicks.blockers,
    ...(freshnessPresent ? [] : ["phase4_demand_capture_freshness_unknown"]),
    ...(gsc_status === "UNKNOWN" ? ["phase4_demand_capture_gsc_unknown"] : []),
    ...(ga4_status === "UNKNOWN" ? ["phase4_demand_capture_ga4_unknown"] : []),
    "phase4_demand_capture_demand_questions_unknown",
    "phase4_demand_capture_blocked_by_no_safe_path_unknown",
  ]);

  const dimensions: Phase4DemandCaptureDimensionV1[] = [
    {
      dimension_id: "demand_signal_status",
      status: demand.status,
      value: demand.status,
      notes: demand.notes,
    },
    {
      dimension_id: "gsc_status",
      status: gsc_status,
      value: gsc_status,
      notes:
        gsc_status === "UNKNOWN"
          ? ["UNKNOWN: GSC artifact missing/unusable — not coerced to zero."]
          : [
              `PROVEN/STALE: GSC source=${String(freshness?.gsc.artifact_source)}; freshness=${String(freshness?.gsc.freshness_status)}.`,
            ],
    },
    {
      dimension_id: "ga4_status",
      status: ga4_status,
      value: ga4_status,
      notes:
        ga4_status === "UNKNOWN"
          ? ["UNKNOWN: GA4 artifact missing/unusable — not coerced to zero."]
          : [
              `PROVEN/STALE: GA4 source=${String(freshness?.ga4.artifact_source)}; freshness=${String(freshness?.ga4.freshness_status)}.`,
            ],
    },
    {
      dimension_id: "search_events_status",
      status: search.status,
      value: search.status,
      notes: search.notes,
    },
    {
      dimension_id: "click_events_status",
      status: clicks.status,
      value: clicks.status,
      notes: clicks.notes,
    },
    {
      dimension_id: "demand_questions_observed",
      status: "UNKNOWN",
      value: demand_questions_observed,
      notes: [
        "UNKNOWN: no dedicated demand_questions_observed evidence lane — not coerced to zero.",
      ],
    },
    {
      dimension_id: "demand_questions_resolved",
      status: "UNKNOWN",
      value: demand_questions_resolved,
      notes: [
        "UNKNOWN: no dedicated demand_questions_resolved evidence lane — not coerced to zero.",
      ],
    },
    {
      dimension_id: "demand_questions_unknown",
      status: "UNKNOWN",
      value: demand_questions_unknown,
      notes: [
        "UNKNOWN: no dedicated demand_questions_unknown evidence lane — not coerced to zero.",
      ],
    },
    {
      dimension_id: "demand_blocked_by_no_safe_path",
      status: "UNKNOWN",
      value: demand_blocked_by_no_safe_path,
      notes: [
        "UNKNOWN: no dedicated demand_blocked_by_no_safe_path evidence lane — not coerced to zero.",
      ],
    },
    {
      dimension_id: "freshness_status",
      status: freshness_status,
      value: freshness_status,
      notes: freshnessPresent
        ? [`overall_status=${freshness.overall_status}`]
        : ["UNKNOWN: external_measurement_freshness_v1 unavailable."],
    },
    {
      dimension_id: "evidence_timestamp",
      status: evidence_timestamp === "UNKNOWN" ? "UNKNOWN" : "PROVEN",
      value: evidence_timestamp,
      notes:
        evidence_timestamp === "UNKNOWN"
          ? ["UNKNOWN: no GSC/GA4 evidence timestamp available."]
          : [`PROVEN: evidence_timestamp=${evidence_timestamp}.`],
    },
  ];
  dimensions.sort((a, b) => a.dimension_id.localeCompare(b.dimension_id));

  const hasUnknownVisibility =
    demand.status === "UNKNOWN" ||
    gsc_status === "UNKNOWN" ||
    ga4_status === "UNKNOWN" ||
    search.status === "UNKNOWN" ||
    clicks.status === "UNKNOWN" ||
    freshness_status === "UNKNOWN";

  const runtime_status: Phase4DemandCaptureRuntimeStatusV1 = hasUnknownVisibility
    ? "ATTENTION"
    : "OK";

  return {
    contract: PHASE4_DEMAND_CAPTURE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    steering_authority: false,
    dispatch_authority: false,
    owner_approval_authority: false,
    nba_authority: false,
    recommended_jq_path: PHASE4_DEMAND_CAPTURE_CC_JQ_PATH_V1,
    source_command: PHASE4_DEMAND_CAPTURE_SOURCE_COMMAND_V1,
    generated_at,
    runtime_status,
    demand_signal_status: demand.status,
    gsc_status,
    ga4_status,
    search_events_status: search.status,
    click_events_status: clicks.status,
    demand_questions_observed,
    demand_questions_resolved,
    demand_questions_unknown,
    demand_blocked_by_no_safe_path,
    freshness_status,
    evidence_timestamp,
    dimensions,
    source_paths: sortedUnique([
      "demand_to_coverage_next_lane_v1",
      "external_measurement_freshness_v1",
      "search_and_click_intelligence_summary",
    ]),
    blockers,
    proven_facts: sortedUnique([
      "PROVEN: Demand-Capture measures demand visibility only (not supply, not decision outcomes).",
      "PROVEN: mutation_authorized=false; steering_authority=false; dispatch_authority=false; owner_approval_authority=false; nba_authority=false.",
      `PROVEN: demand_signal_status=${demand.status}; gsc_status=${gsc_status}; ga4_status=${ga4_status}; search_events_status=${search.status}; click_events_status=${clicks.status}.`,
      `PROVEN: freshness_status=${freshness_status}; evidence_timestamp=${evidence_timestamp}.`,
    ]),
    inferred_facts: sortedUnique([
      "INFERRED: demand_questions_* and demand_blocked_by_no_safe_path remain UNKNOWN until a dedicated evidence lane is proven.",
    ]),
    unknown_facts: sortedUnique([
      ...demand.notes.filter((n) => n.startsWith("UNKNOWN:")),
      ...search.notes.filter((n) => n.startsWith("UNKNOWN:")),
      ...clicks.notes.filter((n) => n.startsWith("UNKNOWN:")),
      "UNKNOWN: demand_questions_observed/resolved/unknown — no dedicated evidence lane (not coerced to zero).",
      "UNKNOWN: demand_blocked_by_no_safe_path — no dedicated evidence lane (not coerced to zero).",
      "UNKNOWN: conversion/revenue impact of demand visibility.",
    ]),
    recommended_next_action:
      "Read-only: Demand-Capture summarizes demand visibility only. No prioritization, page recommendations, dispatch, owner approval, or mutation authorized.",
    steering_note:
      "Sibling to phase4_coverage_scoreboard_v1 and phase4_decision_capture_v1 only: issue_registry remains steering; canonical_final remains NBA; Demand-Capture cannot authorize mutation, dispatch, owner approval, or set NBA.",
  };
}

export function buildPhase4DemandCaptureUnknownV1(args: {
  reason: string;
  now?: () => Date;
}): Phase4DemandCaptureV1 {
  return emptyCapture({
    generated_at: (args.now ?? (() => new Date()))().toISOString(),
    blockers: [
      "phase4_demand_capture_build_failed",
      `phase4_demand_capture_build_failed:${args.reason}`,
    ],
    unknown_facts: [`UNKNOWN: Demand-Capture build failed: ${args.reason}`],
  });
}
