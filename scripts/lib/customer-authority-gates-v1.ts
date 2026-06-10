/**
 * Shared customer authority gate semantics — used by Command Center lanes and owner dashboard.
 */

import type { CustomerClosureReportV1 } from "./customer-closure-report-v1";
import type { CustomerSteeringComparisonV1 } from "./customer-steering-comparison-v1";
import type { CustomerRealityScoreboardV1 } from "./customer-reality-scoreboard-v1";

export type CustomerRealityAuthorityModeV1 =
  | "VISIBILITY_ONLY"
  | "ADVISORY_COMPARE"
  | "AUTHORITY_GATED_ACTIVE";

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

  if (
    comp?.conflicts_with_next_best_action &&
    comp.recommended_primary_for_founder_review === "compare_both"
  ) {
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
