/**
 * Read-only point-in-time customer authority score — aggregates Slices 1–3 lanes only.
 * Does not replace next_best_action, persist snapshots, or mutate product data.
 */

import type { CommandCenterControlGraphRollupV1 } from "./command-center-control-graph-rollup-v1";
import type { CustomerClosureReportV1 } from "./customer-closure-report-v1";
import type { CustomerSteeringComparisonV1 } from "./customer-steering-comparison-v1";
import type { CustomerRealityScoreboardV1 } from "./customer-reality-scoreboard-v1";
import {
  deriveCustomerRealityAuthorityModeV1,
  type CustomerRealityAuthorityModeV1,
} from "./customer-authority-gates-v1";
import { factoryActionPrefixV1 } from "./customer-steering-comparison-v1";

export const CUSTOMER_AUTHORITY_SCORE_CONTRACT_V1 = "customer_authority_score_v1" as const;

export const CUSTOMER_AUTHORITY_SCORE_CC_JQ_PATH_V1 =
  ".command_center_v2.customer_authority_score_v1" as const;

export const CUSTOMER_AUTHORITY_SCORE_SOURCE_COMMAND_V1 =
  "npm run buckparts:command-center" as const;

export type CustomerAuthorityEvidenceBasisV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type CustomerAuthoritySteeringPrimaryV1 =
  | "customer"
  | "factory"
  | "compare_both"
  | "UNKNOWN";

export type CustomerAuthorityClosureConfidenceV1 =
  | "PROVEN"
  | "INFERRED"
  | "UNKNOWN"
  | "LOW";

export type CustomerAuthorityNetRescueDirectionV1 =
  | "IMPROVING"
  | "FLAT"
  | "DEGRADING"
  | "UNKNOWN";

export type CustomerAuthorityScoreComponentsV1 = {
  customer_steering: {
    tier: number | "UNKNOWN";
    blocks_discovery: boolean | "UNKNOWN";
    action_prefix: string | null;
    conflicts_with_factory: boolean | "UNKNOWN";
    recommended_primary: CustomerAuthoritySteeringPrimaryV1;
    source_lane: "customer_steering_comparison_v1";
  };
  factory_steering: {
    next_best_action_prefix: string;
    steering_override_source: string;
    control_graph_nba_differs: boolean | "UNKNOWN";
    source_lanes: [
      "next_best_action",
      "customer_steering_comparison_v1",
      "command_center_control_graph_rollup_v1",
    ];
  };
  closure_proof: {
    customer_visible_closures_count: number | "UNKNOWN";
    closure_confidence: CustomerAuthorityClosureConfidenceV1;
    pages_upgraded_7d_status: "PROVEN" | "INFERRED" | "UNKNOWN";
    source_lane: "customer_closure_report_v1";
  };
  wrong_part_exposure: {
    high_risk_opportunity_count: number | "UNKNOWN";
    suppressed_trust_page_count: number | "UNKNOWN";
    reduction_measurable: false;
    source_lane: "customer_reality_scoreboard_v1.wrong_part_exposure_status";
  };
  buyer_path_coverage: {
    all_wedge_coverage_percent: number | "UNKNOWN";
    safe_cta_links_delta_7d: number | "UNKNOWN";
    net_rescue_direction: CustomerAuthorityNetRescueDirectionV1;
    improvement_measurable: boolean;
    source_lanes: [
      "customer_reality_scoreboard_v1.verified_buyer_path_coverage",
      "customer_reality_scoreboard_v1.repair_closure_status",
    ];
  };
};

export type CustomerAuthorityRetrospectiveV1 = {
  point_in_time_measurable: true;
  trend_measurable: false;
  steering_history_logged: false;
  closure_registry_present: false;
  missing_for_full_retrospective: string[];
};

export type CustomerAuthorityScoreV1 = {
  contract: typeof CUSTOMER_AUTHORITY_SCORE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof CUSTOMER_AUTHORITY_SCORE_CC_JQ_PATH_V1;
  source_command: typeof CUSTOMER_AUTHORITY_SCORE_SOURCE_COMMAND_V1;
  generated_at: string;
  authority_score_100: number | "UNKNOWN";
  evidence_basis: CustomerAuthorityEvidenceBasisV1;
  authority_mode: CustomerRealityAuthorityModeV1;
  authority_claim_permitted: boolean;
  authority_gate_reasons: string[];
  components: CustomerAuthorityScoreComponentsV1;
  retrospective: CustomerAuthorityRetrospectiveV1;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  replaces_next_best_action: false;
};

export type BuildCustomerAuthorityScoreV1Input = {
  generated_at: string;
  scoreboard: CustomerRealityScoreboardV1 | null | undefined;
  steering: CustomerSteeringComparisonV1 | null | undefined;
  closure: CustomerClosureReportV1 | null | undefined;
  controlGraphRollup: CommandCenterControlGraphRollupV1 | null | undefined;
  root_next_best_action: string;
};

const MISSING_FOR_FULL_RETROSPECTIVE_V1 = [
  "archived_command_center_json_time_series",
  "data/command-center/customer-closures/ append-only registry",
  "buckparts:command-surface:snapshot prior snapshot for rescue_delta trends",
  "steering_decision_history_log",
] as const;

function lanesPresent(input: BuildCustomerAuthorityScoreV1Input): boolean {
  return (
    input.scoreboard?.contract === "customer_reality_scoreboard_v1" &&
    input.steering?.contract === "customer_steering_comparison_v1" &&
    input.closure?.contract === "customer_closure_report_v1"
  );
}

export function calculateCustomerAuthorityScore100V1(args: {
  authority_claim_permitted: boolean;
  scoreboard: CustomerRealityScoreboardV1;
  steering: CustomerSteeringComparisonV1;
  closure: CustomerClosureReportV1;
}): number {
  let score = 0;

  if (args.authority_claim_permitted) {
    score += 40;
  }

  if (
    args.closure.closure_confidence === "PROVEN" &&
    args.closure.customer_visible_closures_count > 0
  ) {
    score += 20;
  }

  const coverage = args.scoreboard.verified_buyer_path_coverage.all_wedge_coverage_percent;
  if (typeof coverage === "number") {
    score += Math.round(20 * (coverage / 100));
  }

  const highRisk = args.scoreboard.wrong_part_exposure_status.marketing_high_risk_opportunity_count;
  if (typeof highRisk === "number" && highRisk === 0) {
    score += 10;
  }

  const conflicts = args.steering.comparison.conflicts_with_next_best_action;
  const tier = args.steering.comparison.customer_tier;
  if (conflicts === false && tier <= 2) {
    score += 10;
  }

  return Math.min(100, score);
}

function deriveEvidenceBasis(args: {
  score: number | "UNKNOWN";
  authority_claim_permitted: boolean;
  dryRunEvidenceBasis: CustomerRealityScoreboardV1["recommended_next_customer_action_dry_run"]["evidence_basis"];
}): CustomerAuthorityEvidenceBasisV1 {
  if (args.score === "UNKNOWN") return "UNKNOWN";
  if (args.authority_claim_permitted && args.dryRunEvidenceBasis === "PROVEN") {
    return "PROVEN";
  }
  return "INFERRED";
}

function controlGraphNbaDiffers(
  rootNba: string,
  rollup: CommandCenterControlGraphRollupV1 | null | undefined,
): boolean | "UNKNOWN" {
  if (!rollup || rollup.contract !== "command_center_control_graph_rollup_v1") {
    return "UNKNOWN";
  }
  return rootNba.trim() !== rollup.next_best_action.trim();
}

export function buildCustomerAuthorityScoreV1(
  input: BuildCustomerAuthorityScoreV1Input,
): CustomerAuthorityScoreV1 {
  const proven_facts: string[] = [
    "PROVEN: customer_authority_score_v1 is read-only; point-in-time only; replaces_next_best_action=false.",
  ];
  const inferred_facts: string[] = [
    "INFERRED: authority_score_100 is a simple v1 composite — not a validated Customer Maturity Score.",
  ];
  const unknown_facts: string[] = [];

  const authority = deriveCustomerRealityAuthorityModeV1({
    scoreboard: input.scoreboard,
    steering: input.steering,
    closure: input.closure,
  });

  proven_facts.push(
    `PROVEN: authority_mode=${authority.authority_mode}; authority_claim_permitted=${String(authority.authority_claim_permitted)}.`,
  );

  const hasLanes = lanesPresent(input);
  if (!hasLanes) {
    unknown_facts.push(
      "UNKNOWN: customer_reality_scoreboard_v1, customer_steering_comparison_v1, or customer_closure_report_v1 missing — authority_score_100=UNKNOWN.",
    );
  }

  const authority_score_100 =
    hasLanes && input.scoreboard && input.steering && input.closure
      ? calculateCustomerAuthorityScore100V1({
          authority_claim_permitted: authority.authority_claim_permitted,
          scoreboard: input.scoreboard,
          steering: input.steering,
          closure: input.closure,
        })
      : "UNKNOWN";

  const evidence_basis = deriveEvidenceBasis({
    score: authority_score_100,
    authority_claim_permitted: authority.authority_claim_permitted,
    dryRunEvidenceBasis:
      input.scoreboard?.recommended_next_customer_action_dry_run.evidence_basis ?? "UNKNOWN",
  });

  if (typeof authority_score_100 === "number") {
    proven_facts.push(`PROVEN: authority_score_100=${String(authority_score_100)} (point-in-time v1 formula).`);
  }

  const comp = input.steering?.comparison;
  const factorySteering = input.steering?.factory_steering;
  const coverage = input.scoreboard?.verified_buyer_path_coverage;
  const wrongPart = input.scoreboard?.wrong_part_exposure_status;
  const repair = input.scoreboard?.repair_closure_status;

  const safeDelta = repair?.safe_cta_links_delta_7d ?? "UNKNOWN";
  const netRescue = repair?.net_rescue_direction ?? "UNKNOWN";
  const improvement_measurable =
    typeof safeDelta === "number" ||
    (netRescue !== "UNKNOWN" && repair?.runtime_status === "OK");

  const components: CustomerAuthorityScoreComponentsV1 = {
    customer_steering: {
      tier: hasLanes && comp ? comp.customer_tier : "UNKNOWN",
      blocks_discovery: hasLanes && comp ? comp.blocks_discovery : "UNKNOWN",
      action_prefix:
        hasLanes && input.steering
          ? factoryActionPrefixV1(input.steering.next_customer_action_dry_run.action)
          : null,
      conflicts_with_factory:
        hasLanes && comp ? comp.conflicts_with_next_best_action : "UNKNOWN",
      recommended_primary:
        hasLanes && comp ? comp.recommended_primary_for_founder_review : "UNKNOWN",
      source_lane: "customer_steering_comparison_v1",
    },
    factory_steering: {
      next_best_action_prefix: factoryActionPrefixV1(
        factorySteering?.next_best_action ?? input.root_next_best_action,
      ),
      steering_override_source: factorySteering?.steering_override_source ?? "unknown",
      control_graph_nba_differs: controlGraphNbaDiffers(
        input.root_next_best_action,
        input.controlGraphRollup,
      ),
      source_lanes: [
        "next_best_action",
        "customer_steering_comparison_v1",
        "command_center_control_graph_rollup_v1",
      ],
    },
    closure_proof: {
      customer_visible_closures_count:
        hasLanes && input.closure ? input.closure.customer_visible_closures_count : "UNKNOWN",
      closure_confidence:
        hasLanes && input.closure ? input.closure.closure_confidence : "UNKNOWN",
      pages_upgraded_7d_status:
        hasLanes && input.closure
          ? input.closure.pages_upgraded_this_week_status.status
          : "UNKNOWN",
      source_lane: "customer_closure_report_v1",
    },
    wrong_part_exposure: {
      high_risk_opportunity_count: hasLanes && wrongPart
        ? wrongPart.marketing_high_risk_opportunity_count
        : "UNKNOWN",
      suppressed_trust_page_count: hasLanes && wrongPart
        ? wrongPart.suppressed_trust_page_count
        : "UNKNOWN",
      reduction_measurable: false,
      source_lane: "customer_reality_scoreboard_v1.wrong_part_exposure_status",
    },
    buyer_path_coverage: {
      all_wedge_coverage_percent: hasLanes && coverage
        ? coverage.all_wedge_coverage_percent
        : "UNKNOWN",
      safe_cta_links_delta_7d: hasLanes ? safeDelta : "UNKNOWN",
      net_rescue_direction: hasLanes ? netRescue : "UNKNOWN",
      improvement_measurable: hasLanes ? improvement_measurable : false,
      source_lanes: [
        "customer_reality_scoreboard_v1.verified_buyer_path_coverage",
        "customer_reality_scoreboard_v1.repair_closure_status",
      ],
    },
  };

  inferred_facts.push(
    "INFERRED: retrospective.trend_measurable=false — no snapshot or steering history logged in v1.",
  );
  unknown_facts.push(
    "UNKNOWN: wrong_part_exposure reduction trend not measurable without weekly snapshots.",
  );

  return {
    contract: CUSTOMER_AUTHORITY_SCORE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: CUSTOMER_AUTHORITY_SCORE_CC_JQ_PATH_V1,
    source_command: CUSTOMER_AUTHORITY_SCORE_SOURCE_COMMAND_V1,
    generated_at: input.generated_at,
    authority_score_100,
    evidence_basis,
    authority_mode: authority.authority_mode,
    authority_claim_permitted: authority.authority_claim_permitted,
    authority_gate_reasons: authority.authority_gate_reasons,
    components,
    retrospective: {
      point_in_time_measurable: true,
      trend_measurable: false,
      steering_history_logged: false,
      closure_registry_present: false,
      missing_for_full_retrospective: [...MISSING_FOR_FULL_RETROSPECTIVE_V1],
    },
    proven_facts,
    inferred_facts,
    unknown_facts,
    replaces_next_best_action: false,
  };
}
