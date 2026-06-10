/**
 * Authority-gated Customer Reality visibility model for the owner dashboard.
 * Visibility-only by default; claims steering authority only when lane gates are PROVEN.
 */

import type { CustomerClosureReportV1 } from "../../../scripts/lib/customer-closure-report-v1";
import type { CustomerSteeringComparisonV1 } from "../../../scripts/lib/customer-steering-comparison-v1";
import type { CustomerRealityScoreboardV1 } from "../../../scripts/lib/customer-reality-scoreboard-v1";

export const CUSTOMER_REALITY_AUTHORITY_GATED_CONTRACT_V1 =
  "customer_reality_authority_gated_v1" as const;

export type CustomerRealityAuthorityModeV1 =
  | "VISIBILITY_ONLY"
  | "ADVISORY_COMPARE"
  | "AUTHORITY_GATED_ACTIVE";

export type BuyerTrustSurfaceTemplateV1 = {
  /** Reusable PDP trust template fields — read-only summary from scoreboard + closure lanes. */
  certainty_status: string;
  verified_path_status: string;
  wrong_part_risk: string;
  why_not_buy: string | null;
  why_safe: string | null;
  evidence_basis: string;
  closure_proof: string | null;
};

export type CustomerRealityAuthorityGatedModelV1 = {
  contract: typeof CUSTOMER_REALITY_AUTHORITY_GATED_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  replaces_next_best_action: false;
  dry_run_only: true;
  authority_mode: CustomerRealityAuthorityModeV1;
  authority_claim_permitted: boolean;
  authority_gate_reasons: string[];
  factory_next_best_action: string;
  customer_dry_run_action: string | null;
  conflicts_with_factory: boolean | null;
  customer_tier: number | null;
  blocks_discovery: boolean | null;
  recommended_primary_for_founder_review: string | null;
  why_customer_may_outrank_factory: string | null;
  why_factory_remains_primary: string | null;
  steering_override_source: string | null;
  trust_surface_template: BuyerTrustSurfaceTemplateV1;
  scoreboard_present: boolean;
  steering_present: boolean;
  closure_present: boolean;
  proven_facts: string[];
  unknown_facts: string[];
};

export function closureEvidenceSupportsAuthorityV1(
  closure: CustomerClosureReportV1 | null | undefined,
): boolean {
  if (!closure || closure.contract !== "customer_closure_report_v1") return false;
  if (closure.customer_visible_closures_count > 0) return true;
  if (closure.pages_upgraded_this_week_status.status === "PROVEN") return true;
  return false;
}

export function deriveCustomerRealityAuthorityModeV1(args: {
  scoreboard: CustomerRealityScoreboardV1 | null | undefined;
  steering: CustomerSteeringComparisonV1 | null | undefined;
  closure: CustomerClosureReportV1 | null | undefined;
}): {
  authority_mode: CustomerRealityAuthorityModeV1;
  authority_claim_permitted: boolean;
  authority_gate_reasons: string[];
} {
  const dry = args.scoreboard?.recommended_next_customer_action_dry_run;
  const comp = args.steering?.comparison;
  const reasons: string[] = [];

  if (!dry || args.scoreboard?.contract !== "customer_reality_scoreboard_v1") {
    return {
      authority_mode: "VISIBILITY_ONLY",
      authority_claim_permitted: false,
      authority_gate_reasons: ["customer_reality_scoreboard_v1 missing — visibility only."],
    };
  }

  const tier = dry.tier;
  const blocksDiscovery = dry.blocks_discovery === true || comp?.blocks_discovery === true;
  const trustStopTheLine = tier === 0 || dry.tier_label === "trust_stop_the_line";
  const tierGate = tier <= 1;
  const closureSupports = closureEvidenceSupportsAuthorityV1(args.closure);

  if (trustStopTheLine) reasons.push("PROVEN: tier 0 trust stop-the-line.");
  if (tierGate) reasons.push(`PROVEN: customer tier ${String(tier)} (≤1).`);
  if (blocksDiscovery) reasons.push("PROVEN: blocks_discovery=true.");
  if (closureSupports) {
    reasons.push("PROVEN: closure lane reports customer-visible closure evidence.");
  }

  if (trustStopTheLine && blocksDiscovery) {
    return {
      authority_mode: "AUTHORITY_GATED_ACTIVE",
      authority_claim_permitted: true,
      authority_gate_reasons: reasons,
    };
  }

  if (tier === 1 && blocksDiscovery && closureSupports) {
    return {
      authority_mode: "AUTHORITY_GATED_ACTIVE",
      authority_claim_permitted: true,
      authority_gate_reasons: reasons,
    };
  }

  if (comp?.conflicts_with_next_best_action && comp.recommended_primary_for_founder_review === "compare_both") {
    return {
      authority_mode: "ADVISORY_COMPARE",
      authority_claim_permitted: false,
      authority_gate_reasons: [
        ...reasons,
        "INFERRED: conflict without full authority gates — compare both; factory NBA unchanged.",
      ],
    };
  }

  return {
    authority_mode: "VISIBILITY_ONLY",
    authority_claim_permitted: false,
    authority_gate_reasons: [
      ...reasons,
      "UNKNOWN or incomplete authority gates — Customer Reality is visibility-only; factory next_best_action remains primary.",
    ],
  };
}

function buildTrustSurfaceTemplate(args: {
  scoreboard: CustomerRealityScoreboardV1 | null | undefined;
  closure: CustomerClosureReportV1 | null | undefined;
}): BuyerTrustSurfaceTemplateV1 {
  const scoreboard = args.scoreboard;
  const certainty = scoreboard?.certainty_visibility_status;
  const coverage = scoreboard?.verified_buyer_path_coverage;
  const wrongPart = scoreboard?.wrong_part_exposure_status;
  const highDemand = scoreboard?.high_demand_no_buy_status;
  const dry = scoreboard?.recommended_next_customer_action_dry_run;
  const closure = args.closure;

  const closureProof =
    closure && closure.customer_visible_closures_count > 0
      ? `PROVEN: ${String(closure.customer_visible_closures_count)} customer-visible closure(s); confidence=${closure.closure_confidence}.`
      : closure?.pages_upgraded_this_week_status.status === "PROVEN"
        ? closure.pages_upgraded_this_week_status.summary
        : null;

  return {
    certainty_status: certainty?.summary ?? "UNKNOWN",
    verified_path_status: coverage?.summary ?? "UNKNOWN",
    wrong_part_risk: wrongPart?.summary ?? "UNKNOWN",
    why_not_buy:
      highDemand?.certainty_checklist_high_demand_no_buy_status !== "UNKNOWN"
        ? `High-demand no-buy lane: ${String(highDemand?.certainty_checklist_high_demand_no_buy_status)}.`
        : dry?.why_not_discovery ?? null,
    why_safe:
      coverage?.evidence_basis === "PROVEN" || coverage?.evidence_basis === "INFERRED"
        ? coverage.summary
        : null,
    evidence_basis: dry?.evidence_basis ?? scoreboard?.verified_buyer_path_coverage.evidence_basis ?? "UNKNOWN",
    closure_proof: closureProof,
  };
}

export function buildCustomerRealityAuthorityGatedModelV1(args: {
  factory_next_best_action: string;
  scoreboard: CustomerRealityScoreboardV1 | null | undefined;
  steering: CustomerSteeringComparisonV1 | null | undefined;
  closure: CustomerClosureReportV1 | null | undefined;
}): CustomerRealityAuthorityGatedModelV1 {
  const authority = deriveCustomerRealityAuthorityModeV1({
    scoreboard: args.scoreboard,
    steering: args.steering,
    closure: args.closure,
  });

  const dry = args.scoreboard?.recommended_next_customer_action_dry_run ?? null;
  const comp = args.steering?.comparison ?? null;
  const factorySteering = args.steering?.factory_steering ?? null;

  const why_customer_may_outrank_factory =
    authority.authority_claim_permitted
      ? comp?.why_factory_differs ?? dry?.why_not_discovery ?? null
      : null;

  const why_factory_remains_primary = authority.authority_claim_permitted
    ? null
    : authority.authority_mode === "ADVISORY_COMPARE"
      ? "Factory next_best_action remains primary while customer and factory steering conflict — founder should compare both. Customer dry-run does not replace NBA."
      : "Factory next_best_action remains the operational steering field until authority gates (tier ≤1, blocks_discovery, trust stop-the-line or tier-1 + closure proof) are PROVEN. Customer dry-run does not replace NBA.";

  const proven_facts = [
    "PROVEN: customer_reality_authority_gated_v1 is visibility-only; dry_run_only; replaces_next_best_action=false.",
    `PROVEN: authority_mode=${authority.authority_mode}; authority_claim_permitted=${String(authority.authority_claim_permitted)}.`,
  ];
  if (args.steering?.replaces_next_best_action === false) {
    proven_facts.push("PROVEN: customer_steering_comparison_v1.replaces_next_best_action=false.");
  }

  const unknown_facts: string[] = [];
  if (!args.scoreboard) unknown_facts.push("customer_reality_scoreboard_v1 not present on this snapshot.");
  if (!args.steering) unknown_facts.push("customer_steering_comparison_v1 not present on this snapshot.");
  if (!args.closure) unknown_facts.push("customer_closure_report_v1 not present on this snapshot.");

  return {
    contract: CUSTOMER_REALITY_AUTHORITY_GATED_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    replaces_next_best_action: false,
    dry_run_only: true,
    authority_mode: authority.authority_mode,
    authority_claim_permitted: authority.authority_claim_permitted,
    authority_gate_reasons: authority.authority_gate_reasons,
    factory_next_best_action: args.factory_next_best_action,
    customer_dry_run_action: dry?.action ?? null,
    conflicts_with_factory: comp?.conflicts_with_next_best_action ?? null,
    customer_tier: comp?.customer_tier ?? dry?.tier ?? null,
    blocks_discovery: comp?.blocks_discovery ?? dry?.blocks_discovery ?? null,
    recommended_primary_for_founder_review: comp?.recommended_primary_for_founder_review ?? null,
    why_customer_may_outrank_factory,
    why_factory_remains_primary,
    steering_override_source: factorySteering?.steering_override_source ?? null,
    trust_surface_template: buildTrustSurfaceTemplate({
      scoreboard: args.scoreboard,
      closure: args.closure,
    }),
    scoreboard_present: args.scoreboard?.contract === "customer_reality_scoreboard_v1",
    steering_present: args.steering?.contract === "customer_steering_comparison_v1",
    closure_present: args.closure?.contract === "customer_closure_report_v1",
    proven_facts,
    unknown_facts,
  };
}
