/**
 * Read-only customer vs factory steering comparison — dry-run only; does not replace next_best_action.
 */

import type {
  CustomerRealityNbaTierV1,
  RecommendedNextCustomerActionDryRunV1,
} from "./customer-reality-scoreboard-v1";

export const CUSTOMER_STEERING_COMPARISON_CONTRACT_V1 = "customer_steering_comparison_v1" as const;

export const CUSTOMER_STEERING_COMPARISON_CC_JQ_PATH_V1 =
  ".command_center_v2.customer_steering_comparison_v1" as const;

export const CUSTOMER_STEERING_COMPARISON_SOURCE_COMMAND_V1 =
  "npm run buckparts:command-center" as const;

export type FactorySteeringOverrideSourceV1 =
  | "root_resolve"
  | "refrigerator_model_first"
  | "model_first"
  | "demand_to_coverage"
  | "universal_batch_lifecycle"
  | "fridge_apply_plan_approval"
  | "fridge_apply_plan_approved_planning"
  | "fridge_apply_plan_proposal"
  | "batch_run_registry_intake"
  | "batch_dispatch"
  | "unknown";

export type CustomerSteeringComparisonV1 = {
  contract: typeof CUSTOMER_STEERING_COMPARISON_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof CUSTOMER_STEERING_COMPARISON_CC_JQ_PATH_V1;
  source_command: typeof CUSTOMER_STEERING_COMPARISON_SOURCE_COMMAND_V1;
  generated_at: string;
  next_customer_action_dry_run: RecommendedNextCustomerActionDryRunV1;
  factory_steering: {
    next_best_action: string;
    why_this_action: string;
    steering_override_source: string;
  };
  comparison: {
    conflicts_with_next_best_action: boolean;
    customer_tier: CustomerRealityNbaTierV1;
    factory_action_prefix: string;
    why_factory_differs: string | null;
    blocks_discovery: boolean;
    recommended_primary_for_founder_review: "customer" | "factory" | "compare_both";
  };
  source_lanes: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  dry_run_only: true;
  replaces_next_best_action: false;
};

export type BuildCustomerSteeringComparisonV1Input = {
  generated_at: string;
  next_customer_action_dry_run: RecommendedNextCustomerActionDryRunV1;
  next_best_action: string;
  why_this_action: string;
  steering_override_source?: FactorySteeringOverrideSourceV1;
};

export function factoryActionPrefixV1(action: string, maxLen = 80): string {
  const trimmed = action.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}...`;
}

export function conflictsWithNextBestActionV1(
  next_best_action: string,
  customer_action: string,
): boolean {
  return next_best_action.trim() !== customer_action.trim();
}

export function recommendedPrimaryForFounderReviewV1(args: {
  customer_tier: CustomerRealityNbaTierV1;
  blocks_discovery: boolean;
  conflicts_with_next_best_action: boolean;
}): "customer" | "factory" | "compare_both" {
  if (args.customer_tier <= 1 || args.blocks_discovery) {
    return "customer";
  }
  if (!args.conflicts_with_next_best_action) {
    return "factory";
  }
  return "compare_both";
}

function resolveWhyFactoryDiffers(args: {
  conflicts_with_next_best_action: boolean;
  dry_run: RecommendedNextCustomerActionDryRunV1;
}): string | null {
  if (!args.conflicts_with_next_best_action) return null;
  if (args.dry_run.why_not_discovery) return args.dry_run.why_not_discovery;
  if (args.dry_run.tier <= 1) {
    return "Factory next_best_action follows money-queue / batch / lifecycle steering; customer dry-run prioritizes trust stop-the-line or slug rescue.";
  }
  return "Customer dry-run tier and factory next_best_action headline diverge.";
}

function uniqueSourceLanes(lanes: string[]): string[] {
  return Array.from(new Set(lanes.filter((lane) => lane.trim().length > 0)));
}

export function buildCustomerSteeringComparisonV1(
  input: BuildCustomerSteeringComparisonV1Input,
): CustomerSteeringComparisonV1 {
  const dryRun = input.next_customer_action_dry_run;
  const conflicts = conflictsWithNextBestActionV1(input.next_best_action, dryRun.action);
  const blocks_discovery = dryRun.blocks_discovery;
  const customer_tier = dryRun.tier;
  const steering_override_source = input.steering_override_source ?? "unknown";

  const recommended_primary_for_founder_review = recommendedPrimaryForFounderReviewV1({
    customer_tier,
    blocks_discovery,
    conflicts_with_next_best_action: conflicts,
  });

  const source_lanes = uniqueSourceLanes([
    "customer_reality_scoreboard_v1",
    "all_product_safe_buyer_path_census_v1",
    "buckparts_certainty_engine_checklist_v1",
    "mission_factory_registry_v1",
    "next_best_action",
    ...dryRun.source_lanes,
  ]);

  const proven_facts = [
    "PROVEN: customer_steering_comparison_v1 is read-only; compares customer dry-run to factory next_best_action only.",
    `PROVEN: conflicts_with_next_best_action=${String(conflicts)}.`,
    `PROVEN: customer_tier=${String(customer_tier)}; blocks_discovery=${String(blocks_discovery)}.`,
    `PROVEN: factory steering_override_source=${steering_override_source}.`,
  ];

  const inferred_facts = [
    "INFERRED: recommended_primary_for_founder_review is advisory — does not replace next_best_action.",
    `INFERRED: recommended_primary_for_founder_review=${recommended_primary_for_founder_review}.`,
  ];

  const unknown_facts: string[] = [];
  if (steering_override_source === "unknown") {
    unknown_facts.push(
      "UNKNOWN: exact factory steering_override_source not supplied by Command Center build.",
    );
  }

  return {
    contract: CUSTOMER_STEERING_COMPARISON_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: CUSTOMER_STEERING_COMPARISON_CC_JQ_PATH_V1,
    source_command: CUSTOMER_STEERING_COMPARISON_SOURCE_COMMAND_V1,
    generated_at: input.generated_at,
    next_customer_action_dry_run: dryRun,
    factory_steering: {
      next_best_action: input.next_best_action,
      why_this_action: input.why_this_action,
      steering_override_source,
    },
    comparison: {
      conflicts_with_next_best_action: conflicts,
      customer_tier,
      factory_action_prefix: factoryActionPrefixV1(input.next_best_action),
      why_factory_differs: resolveWhyFactoryDiffers({
        conflicts_with_next_best_action: conflicts,
        dry_run: dryRun,
      }),
      blocks_discovery,
      recommended_primary_for_founder_review,
    },
    source_lanes,
    proven_facts,
    inferred_facts,
    unknown_facts,
    dry_run_only: true,
    replaces_next_best_action: false,
  };
}
