/**
 * Phase 4 Outcome-Capture v1 — final read-only Phase 4 sibling scoreboard.
 * Measures handoffs FROM a confident decision. Never rewards raw clicks.
 * Wrong-part clicks never positive. UNKNOWN never coerced to zero. Goodhart guard required.
 */

import type { Phase4DecisionCaptureV1 } from "./buckparts-phase4-decision-capture-v1";

export const PHASE4_OUTCOME_CAPTURE_CONTRACT_V1 = "phase4_outcome_capture_v1" as const;

export const PHASE4_OUTCOME_CAPTURE_CC_JQ_PATH_V1 =
  ".command_center_v2.phase4_outcome_capture_v1" as const;

export const PHASE4_OUTCOME_CAPTURE_SOURCE_COMMAND_V1 =
  "npm run buckparts:command-center" as const;

export type Phase4OutcomeVisibilityStatusV1 = "PROVEN" | "STALE" | "UNKNOWN";

export type Phase4OutcomeCaptureRuntimeStatusV1 = "OK" | "ATTENTION" | "NOT_PROVEN" | "UNKNOWN";

export type Phase4CountOrUnknownV1 = number | "UNKNOWN";

export type Phase4OutcomeCaptureSearchClickInputV1 = {
  runtime_status: "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED" | string;
  click_events?: {
    last_7d?: number | "UNKNOWN";
    last_30d?: number | "UNKNOWN";
  };
};

export type Phase4OutcomeCaptureClickVisibilityInputV1 = {
  runtime_status?: string;
  commission_or_revenue?: "NOT_CONNECTED" | string;
};

export type Phase4OutcomeGoodhartGuardV1 = {
  raw_clicks_never_positive_outcomes: true;
  wrong_part_clicks_never_positive: true;
  page_count_not_outcome_denominator: true;
  go_unavailable_is_own_class: true;
  notes: string[];
};

export type Phase4OutcomeCaptureDimensionV1 = {
  dimension_id:
    | "confident_decision_origin_status"
    | "handoff_from_confident_buy_count"
    | "handoff_from_confident_do_not_buy_count"
    | "go_unavailable_count"
    | "wrong_part_click_count"
    | "remain_no_buy_decision_preserved_count"
    | "raw_click_events_visibility_status"
    | "revenue_status"
    | "retailer_conversion_status"
    | "returns_status"
    | "ltv_status"
    | "serp_rank_status"
    | "goodhart_guard";
  status: Phase4OutcomeVisibilityStatusV1;
  value: Phase4OutcomeVisibilityStatusV1 | Phase4CountOrUnknownV1 | string | boolean;
  notes: string[];
};

export type Phase4OutcomeCaptureV1 = {
  contract: typeof PHASE4_OUTCOME_CAPTURE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  steering_authority: false;
  dispatch_authority: false;
  owner_approval_authority: false;
  nba_authority: false;
  recommended_jq_path: typeof PHASE4_OUTCOME_CAPTURE_CC_JQ_PATH_V1;
  source_command: typeof PHASE4_OUTCOME_CAPTURE_SOURCE_COMMAND_V1;
  generated_at: string;
  runtime_status: Phase4OutcomeCaptureRuntimeStatusV1;
  final_phase4_instrumentation_lane: true;
  confident_decision_origin_status: Phase4OutcomeVisibilityStatusV1;
  confident_buy_origin_count: Phase4CountOrUnknownV1;
  confident_do_not_buy_origin_count: Phase4CountOrUnknownV1;
  handoff_from_confident_buy_count: Phase4CountOrUnknownV1;
  handoff_from_confident_do_not_buy_count: Phase4CountOrUnknownV1;
  go_unavailable_count: Phase4CountOrUnknownV1;
  wrong_part_click_count: Phase4CountOrUnknownV1;
  wrong_part_clicks_never_positive: true;
  remain_no_buy_decision_preserved_count: Phase4CountOrUnknownV1;
  raw_click_events_visibility_status: Phase4OutcomeVisibilityStatusV1;
  revenue_status: "UNKNOWN";
  retailer_conversion_status: "UNKNOWN";
  returns_status: "UNKNOWN";
  ltv_status: "UNKNOWN";
  serp_rank_status: "UNKNOWN";
  goodhart_guard: Phase4OutcomeGoodhartGuardV1;
  dimensions: Phase4OutcomeCaptureDimensionV1[];
  source_paths: string[];
  blockers: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
  steering_note: string;
};

export type BuildPhase4OutcomeCaptureArgsV1 = {
  now?: () => Date;
  decisionCapture?: Phase4DecisionCaptureV1 | null;
  searchAndClick?: Phase4OutcomeCaptureSearchClickInputV1 | null;
  clickVisibility?: Phase4OutcomeCaptureClickVisibilityInputV1 | null;
};

function sortedUnique(values: string[]): string[] {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))].sort();
}

function resolveClickVisibilityStatus(
  summary: Phase4OutcomeCaptureSearchClickInputV1 | null | undefined,
): { status: Phase4OutcomeVisibilityStatusV1; notes: string[]; blockers: string[] } {
  if (!summary) {
    return {
      status: "UNKNOWN",
      notes: [
        "UNKNOWN: click_events summary unavailable — visibility only; never used as a positive outcome.",
      ],
      blockers: ["phase4_outcome_capture_raw_click_visibility_unknown"],
    };
  }
  if (summary.runtime_status !== "OK") {
    return {
      status: "UNKNOWN",
      notes: [
        `UNKNOWN: click_events runtime_status=${String(summary.runtime_status)} — not coerced to zero; not an outcome score.`,
      ],
      blockers: ["phase4_outcome_capture_raw_click_visibility_unknown"],
    };
  }
  const last7 = summary.click_events?.last_7d;
  const last30 = summary.click_events?.last_30d;
  if (typeof last7 !== "number" && typeof last30 !== "number") {
    return {
      status: "UNKNOWN",
      notes: [
        "UNKNOWN: click_events lacks numeric window evidence — visibility only; not an outcome score.",
      ],
      blockers: ["phase4_outcome_capture_raw_click_visibility_unknown"],
    };
  }
  return {
    status: "PROVEN",
    notes: [
      `PROVEN: raw click_events visibility only (last_7d=${String(last7)}; last_30d=${String(last30)}).`,
      "Goodhart guard: raw clicks never raise Outcome-Capture scores.",
    ],
    blockers: [],
  };
}

function emptyCapture(args: {
  generated_at: string;
  blockers: string[];
  unknown_facts: string[];
}): Phase4OutcomeCaptureV1 {
  const goodhart_guard: Phase4OutcomeGoodhartGuardV1 = {
    raw_clicks_never_positive_outcomes: true,
    wrong_part_clicks_never_positive: true,
    page_count_not_outcome_denominator: true,
    go_unavailable_is_own_class: true,
    notes: [
      "PROVEN: Goodhart guard active — raw clicks, page counts, and wrong-part clicks cannot be positive outcomes.",
    ],
  };
  const dimensions: Phase4OutcomeCaptureDimensionV1[] = [
    {
      dimension_id: "confident_decision_origin_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: Decision-Capture origin unavailable."],
    },
    {
      dimension_id: "handoff_from_confident_buy_count",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: post-decision BUY handoff join not proven — not coerced to zero."],
    },
    {
      dimension_id: "handoff_from_confident_do_not_buy_count",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: post-decision DO-NOT-BUY handoff join not proven — not coerced to zero."],
    },
    {
      dimension_id: "go_unavailable_count",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: /go-unavailable volume telemetry not proven — own class; not coerced to zero."],
    },
    {
      dimension_id: "wrong_part_click_count",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: wrong-part click outcomes not proven — never positive."],
    },
    {
      dimension_id: "remain_no_buy_decision_preserved_count",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: remain-no-buy decision preservation not available from Decision-Capture."],
    },
    {
      dimension_id: "raw_click_events_visibility_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: raw click visibility unavailable."],
    },
    {
      dimension_id: "revenue_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: revenue placeholder — not proven."],
    },
    {
      dimension_id: "retailer_conversion_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: retailer conversion placeholder — not proven."],
    },
    {
      dimension_id: "returns_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: returns placeholder — not proven."],
    },
    {
      dimension_id: "ltv_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: LTV placeholder — not proven."],
    },
    {
      dimension_id: "serp_rank_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: SERP rank placeholder — not proven."],
    },
    {
      dimension_id: "goodhart_guard",
      status: "PROVEN",
      value: true,
      notes: goodhart_guard.notes,
    },
  ];
  dimensions.sort((a, b) => a.dimension_id.localeCompare(b.dimension_id));

  return {
    contract: PHASE4_OUTCOME_CAPTURE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    steering_authority: false,
    dispatch_authority: false,
    owner_approval_authority: false,
    nba_authority: false,
    recommended_jq_path: PHASE4_OUTCOME_CAPTURE_CC_JQ_PATH_V1,
    source_command: PHASE4_OUTCOME_CAPTURE_SOURCE_COMMAND_V1,
    generated_at: args.generated_at,
    runtime_status: "NOT_PROVEN",
    final_phase4_instrumentation_lane: true,
    confident_decision_origin_status: "UNKNOWN",
    confident_buy_origin_count: "UNKNOWN",
    confident_do_not_buy_origin_count: "UNKNOWN",
    handoff_from_confident_buy_count: "UNKNOWN",
    handoff_from_confident_do_not_buy_count: "UNKNOWN",
    go_unavailable_count: "UNKNOWN",
    wrong_part_click_count: "UNKNOWN",
    wrong_part_clicks_never_positive: true,
    remain_no_buy_decision_preserved_count: "UNKNOWN",
    raw_click_events_visibility_status: "UNKNOWN",
    revenue_status: "UNKNOWN",
    retailer_conversion_status: "UNKNOWN",
    returns_status: "UNKNOWN",
    ltv_status: "UNKNOWN",
    serp_rank_status: "UNKNOWN",
    goodhart_guard,
    dimensions,
    source_paths: [],
    blockers: sortedUnique(args.blockers),
    proven_facts: [
      "PROVEN: goodhart_guard active; wrong_part_clicks_never_positive=true.",
      "PROVEN: mutation_authorized=false; steering_authority=false; nba_authority=false.",
    ],
    inferred_facts: [],
    unknown_facts: sortedUnique(args.unknown_facts),
    recommended_next_action:
      "NOT_PROVEN: restore Decision-Capture origin before interpreting Outcome-Capture. No raw-click rewards, prioritization, or mutation authorized.",
    steering_note:
      "Final Phase 4 sibling only: Coverage/Decision/Demand remain unchanged; issue_registry remains steering; canonical_final remains NBA; Outcome-Capture cannot authorize mutation, dispatch, owner approval, or set NBA.",
  };
}

export function buildPhase4OutcomeCaptureV1(
  args: BuildPhase4OutcomeCaptureArgsV1,
): Phase4OutcomeCaptureV1 {
  const generated_at = (args.now ?? (() => new Date()))().toISOString();
  const decision = args.decisionCapture;
  const decisionOk =
    !!decision &&
    decision.contract === "phase4_decision_capture_v1" &&
    decision.decision_universe_count > 0;

  const confident_decision_origin_status: Phase4OutcomeVisibilityStatusV1 = decisionOk
    ? "PROVEN"
    : "UNKNOWN";
  const confident_buy_origin_count: Phase4CountOrUnknownV1 = decisionOk
    ? decision.confident_buy_count
    : "UNKNOWN";
  const confident_do_not_buy_origin_count: Phase4CountOrUnknownV1 = decisionOk
    ? decision.confident_do_not_buy_count
    : "UNKNOWN";
  const remain_no_buy_decision_preserved_count: Phase4CountOrUnknownV1 = decisionOk
    ? decision.evidence_backed_wrong_part_prevention_count
    : "UNKNOWN";

  // Post-handoff joins are not proven in v1 — fail closed to UNKNOWN (never invent 0).
  const handoff_from_confident_buy_count: Phase4CountOrUnknownV1 = "UNKNOWN";
  const handoff_from_confident_do_not_buy_count: Phase4CountOrUnknownV1 = "UNKNOWN";
  const go_unavailable_count: Phase4CountOrUnknownV1 = "UNKNOWN";
  const wrong_part_click_count: Phase4CountOrUnknownV1 = "UNKNOWN";

  const clickVis = resolveClickVisibilityStatus(args.searchAndClick);
  const commission =
    args.clickVisibility?.commission_or_revenue ??
    (args.clickVisibility ? "UNKNOWN" : "NOT_CONNECTED");

  const goodhart_guard: Phase4OutcomeGoodhartGuardV1 = {
    raw_clicks_never_positive_outcomes: true,
    wrong_part_clicks_never_positive: true,
    page_count_not_outcome_denominator: true,
    go_unavailable_is_own_class: true,
    notes: sortedUnique([
      "PROVEN: raw click_events totals never raise Outcome-Capture scores.",
      "PROVEN: wrong-part clicks are never positive outcomes.",
      "PROVEN: page-count / inventory is not an outcome denominator.",
      "PROVEN: /go-unavailable is its own outcome class (not folded into success/fail buy).",
      `PROVEN: commission_or_revenue posture observed as ${String(commission)} — revenue outcome remains UNKNOWN unless separately proven.`,
    ]),
  };

  const blockers = sortedUnique([
    ...(decisionOk ? [] : ["phase4_outcome_capture_decision_origin_unknown"]),
    ...clickVis.blockers,
    "phase4_outcome_capture_handoff_from_confident_buy_unknown",
    "phase4_outcome_capture_handoff_from_confident_do_not_buy_unknown",
    "phase4_outcome_capture_go_unavailable_unknown",
    "phase4_outcome_capture_wrong_part_click_unknown",
    "phase4_outcome_capture_revenue_unknown",
    "phase4_outcome_capture_retailer_conversion_unknown",
    "phase4_outcome_capture_returns_unknown",
    "phase4_outcome_capture_ltv_unknown",
    "phase4_outcome_capture_serp_rank_unknown",
  ]);

  const dimensions: Phase4OutcomeCaptureDimensionV1[] = [
    {
      dimension_id: "confident_decision_origin_status",
      status: confident_decision_origin_status,
      value: confident_decision_origin_status,
      notes: decisionOk
        ? [
            `PROVEN: Decision-Capture origin universe=${decision.decision_universe_count}; buy=${decision.confident_buy_count}; do_not_buy=${decision.confident_do_not_buy_count}.`,
          ]
        : ["UNKNOWN: Decision-Capture origin unavailable — handoffs cannot be attributed."],
    },
    {
      dimension_id: "handoff_from_confident_buy_count",
      status: "UNKNOWN",
      value: handoff_from_confident_buy_count,
      notes: [
        "UNKNOWN: no proven join of confident_buy universe ↔ successful /go handoffs — not coerced to zero.",
      ],
    },
    {
      dimension_id: "handoff_from_confident_do_not_buy_count",
      status: "UNKNOWN",
      value: handoff_from_confident_do_not_buy_count,
      notes: [
        "UNKNOWN: no proven post-decision handoff telemetry from DO-NOT-BUY — not coerced to zero.",
      ],
    },
    {
      dimension_id: "go_unavailable_count",
      status: "UNKNOWN",
      value: go_unavailable_count,
      notes: [
        "UNKNOWN: /go-unavailable is its own outcome class; volume telemetry not proven — not coerced to zero.",
      ],
    },
    {
      dimension_id: "wrong_part_click_count",
      status: "UNKNOWN",
      value: wrong_part_click_count,
      notes: [
        "UNKNOWN: wrong-part click outcomes not proven — never counted as positive outcomes.",
      ],
    },
    {
      dimension_id: "remain_no_buy_decision_preserved_count",
      status: remain_no_buy_decision_preserved_count === "UNKNOWN" ? "UNKNOWN" : "PROVEN",
      value: remain_no_buy_decision_preserved_count,
      notes:
        remain_no_buy_decision_preserved_count === "UNKNOWN"
          ? ["UNKNOWN: remain-no-buy decision preservation unavailable."]
          : [
              `PROVEN: decision-side remain-no-buy preserved count=${String(remain_no_buy_decision_preserved_count)} (not a click reward).`,
            ],
    },
    {
      dimension_id: "raw_click_events_visibility_status",
      status: clickVis.status,
      value: clickVis.status,
      notes: clickVis.notes,
    },
    {
      dimension_id: "revenue_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: revenue placeholder — commission/order APIs not connected as outcome proof."],
    },
    {
      dimension_id: "retailer_conversion_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: retailer conversion placeholder — not proven."],
    },
    {
      dimension_id: "returns_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: returns placeholder — not proven."],
    },
    {
      dimension_id: "ltv_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: LTV placeholder — not proven."],
    },
    {
      dimension_id: "serp_rank_status",
      status: "UNKNOWN",
      value: "UNKNOWN",
      notes: ["UNKNOWN: SERP rank placeholder — not proven."],
    },
    {
      dimension_id: "goodhart_guard",
      status: "PROVEN",
      value: true,
      notes: goodhart_guard.notes,
    },
  ];
  dimensions.sort((a, b) => a.dimension_id.localeCompare(b.dimension_id));

  // ATTENTION while post-handoff joins remain UNKNOWN (fail-closed; not incomplete wiring).
  const runtime_status: Phase4OutcomeCaptureRuntimeStatusV1 = "ATTENTION";

  return {
    contract: PHASE4_OUTCOME_CAPTURE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    steering_authority: false,
    dispatch_authority: false,
    owner_approval_authority: false,
    nba_authority: false,
    recommended_jq_path: PHASE4_OUTCOME_CAPTURE_CC_JQ_PATH_V1,
    source_command: PHASE4_OUTCOME_CAPTURE_SOURCE_COMMAND_V1,
    generated_at,
    runtime_status,
    final_phase4_instrumentation_lane: true,
    confident_decision_origin_status,
    confident_buy_origin_count,
    confident_do_not_buy_origin_count,
    handoff_from_confident_buy_count,
    handoff_from_confident_do_not_buy_count,
    go_unavailable_count,
    wrong_part_click_count,
    wrong_part_clicks_never_positive: true,
    remain_no_buy_decision_preserved_count,
    raw_click_events_visibility_status: clickVis.status,
    revenue_status: "UNKNOWN",
    retailer_conversion_status: "UNKNOWN",
    returns_status: "UNKNOWN",
    ltv_status: "UNKNOWN",
    serp_rank_status: "UNKNOWN",
    goodhart_guard,
    dimensions,
    source_paths: sortedUnique([
      "phase4_decision_capture_v1",
      "search_and_click_intelligence_summary",
      "revenue_snapshot.click_visibility",
    ]),
    blockers,
    proven_facts: sortedUnique([
      "PROVEN: Outcome-Capture is the final Phase 4 instrumentation sibling (read-only).",
      "PROVEN: outcome measures handoff from a confident decision — never raw clicks.",
      "PROVEN: wrong_part_clicks_never_positive=true; goodhart_guard active.",
      "PROVEN: mutation_authorized=false; steering_authority=false; dispatch_authority=false; nba_authority=false.",
      `PROVEN: confident_decision_origin_status=${confident_decision_origin_status}; remain_no_buy_decision_preserved_count=${String(remain_no_buy_decision_preserved_count)}.`,
      `PROVEN: raw_click_events_visibility_status=${clickVis.status} (visibility only).`,
    ]),
    inferred_facts: sortedUnique([
      "INFERRED: post-decision handoff joins and /go-unavailable volume require dedicated evidence before leaving UNKNOWN.",
    ]),
    unknown_facts: sortedUnique([
      "UNKNOWN: handoff_from_confident_buy_count — Decision-Capture ↔ /go join not proven (not coerced to zero).",
      "UNKNOWN: handoff_from_confident_do_not_buy_count — not coerced to zero.",
      "UNKNOWN: go_unavailable_count — own class; volume telemetry not proven (not coerced to zero).",
      "UNKNOWN: wrong_part_click_count — never positive; not coerced to zero.",
      "UNKNOWN: revenue_status / retailer_conversion_status / returns_status / ltv_status / serp_rank_status placeholders.",
      ...clickVis.notes.filter((n) => n.startsWith("UNKNOWN:")),
    ]),
    recommended_next_action:
      "Read-only: Outcome-Capture summarizes handoff outcomes from confident decisions only. Raw clicks are never rewarded. No prioritization, page recommendations, dispatch, owner approval, or mutation authorized.",
    steering_note:
      "Final Phase 4 sibling only: Coverage/Decision/Demand remain unchanged; issue_registry remains steering; canonical_final remains NBA; Outcome-Capture cannot authorize mutation, dispatch, owner approval, or set NBA.",
  };
}

export function buildPhase4OutcomeCaptureUnknownV1(args: {
  reason: string;
  now?: () => Date;
}): Phase4OutcomeCaptureV1 {
  return emptyCapture({
    generated_at: (args.now ?? (() => new Date()))().toISOString(),
    blockers: [
      "phase4_outcome_capture_build_failed",
      `phase4_outcome_capture_build_failed:${args.reason}`,
    ],
    unknown_facts: [`UNKNOWN: Outcome-Capture build failed: ${args.reason}`],
  });
}
