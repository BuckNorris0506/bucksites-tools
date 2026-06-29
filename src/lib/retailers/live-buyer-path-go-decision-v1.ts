/**
 * Live `/go` + CTA buyer-path decision via trust currency + decision precedence.
 */

import { resolveFridgeFilterPdpCustomerSafetyV1 } from "@/lib/fridge/fridge-filter-pdp-customer-safety-v1";
import {
  buyLinkGateFailureKind,
  type BuyLinkGateFailureKind,
  type BuyLinkGateLinkV1,
} from "@/lib/retailers/launch-buy-links";
import {
  decisionSignalFromDispositionV1,
  resolveDecisionPrecedenceV1,
  type DecisionPrecedenceResultV1,
  type DecisionSignalV1,
} from "@/lib/owner-dashboard/buckparts-decision-precedence-resolver-v1";
import {
  isBuyerPathLinkTrustCurrencyPermittedV1,
  resolveBuyerPathLinkTrustCurrencyV1,
  type TrustCurrencyResolutionV1,
  type TrustCurrencyStatusV1,
} from "@/lib/owner-dashboard/buckparts-trust-currency-resolver-v1";

export const LIVE_BUYER_PATH_GO_DECISION_CONTRACT_V1 =
  "live_buyer_path_go_decision_v1" as const;

export type LiveGoPathContextV1 = {
  fridge_filter_slug?: string | null;
  fridge_models_for_filter?: Array<{ slug: string }>;
  gated_retailer_link_count?: number;
};

export type LiveBuyerPathGoDecisionV1 = {
  contract: typeof LIVE_BUYER_PATH_GO_DECISION_CONTRACT_V1;
  permitted: boolean;
  gate_failure: BuyLinkGateFailureKind | "fridge_filter_quarantine" | null;
  trust_currency: TrustCurrencyResolutionV1;
  precedence: DecisionPrecedenceResultV1;
};

function trustStatusToDisposition(
  status: TrustCurrencyStatusV1,
): "DENY" | "ALLOW" | "UNKNOWN" {
  if (status === "OK" || status === "DUE_SOON") return "ALLOW";
  if (status === "EXPIRED" || status === "DEGRADED") return "DENY";
  return "UNKNOWN";
}

function trustCurrencyToDecisionSignals(
  trust: TrustCurrencyResolutionV1,
): DecisionSignalV1[] {
  return trust.signals.map((signal) =>
    decisionSignalFromDispositionV1({
      dimension:
        signal.dimension === "buy_link_gate"
          ? "buy_link_gate"
          : signal.dimension === "browser_proof_fresh"
            ? "browser_proof_fresh"
            : signal.dimension,
      disposition: trustStatusToDisposition(signal.status),
      source_contract: signal.source_contract,
      reason: `${signal.status}:${signal.reason}`,
      homeowner_exposed: signal.homeowner_exposed,
    }),
  );
}

export function decisionSignalsFromLiveBuyerPathLinkV1(args: {
  link: BuyLinkGateLinkV1;
  context?: LiveGoPathContextV1;
  now?: Date;
}): DecisionSignalV1[] {
  const trust = resolveBuyerPathLinkTrustCurrencyV1({
    link: args.link,
    now: args.now,
  });
  if (trust.fail_closed_homeowner_buy_path) {
    return trustCurrencyToDecisionSignals(trust);
  }

  const ctx = args.context;
  if (ctx?.fridge_filter_slug && ctx.fridge_models_for_filter) {
    const safety = resolveFridgeFilterPdpCustomerSafetyV1({
      filterSlug: ctx.fridge_filter_slug,
      fridgeModels: ctx.fridge_models_for_filter,
      gatedRetailerLinkCount: ctx.gated_retailer_link_count ?? 1,
    });
    if (safety.force_suppress_buy) {
      return [
        decisionSignalFromDispositionV1({
          dimension: "learned_failure_block",
          disposition: "DENY",
          source_contract: "fridge_filter_pdp_customer_safety_v1",
          reason: "fridge_filter_force_suppress_buy",
          homeowner_exposed: true,
        }),
      ];
    }
  }

  return trustCurrencyToDecisionSignals(trust);
}

export function resolveLiveBuyerPathGoDecisionV1(args: {
  link: BuyLinkGateLinkV1;
  context?: LiveGoPathContextV1;
  now?: Date;
}): LiveBuyerPathGoDecisionV1 {
  const trust = resolveBuyerPathLinkTrustCurrencyV1({
    link: args.link,
    now: args.now,
  });
  const signals = decisionSignalsFromLiveBuyerPathLinkV1(args);
  const precedence = resolveDecisionPrecedenceV1(signals);
  const gate = buyLinkGateFailureKind(args.link, { now: args.now });
  let gate_failure: LiveBuyerPathGoDecisionV1["gate_failure"] = gate;
  if (!gate && precedence.deny_signals.some((s) => s.dimension === "learned_failure_block")) {
    gate_failure = "fridge_filter_quarantine";
  }
  return {
    contract: LIVE_BUYER_PATH_GO_DECISION_CONTRACT_V1,
    permitted:
      precedence.public_trust_current && !trust.fail_closed_homeowner_buy_path,
    gate_failure,
    trust_currency: trust,
    precedence,
  };
}

export function isLiveBuyerPathLinkPermittedV1(args: {
  link: BuyLinkGateLinkV1;
  context?: LiveGoPathContextV1;
  now?: Date;
}): boolean {
  return resolveLiveBuyerPathGoDecisionV1(args).permitted;
}

/** CTA eligibility: same trust currency as `/go` without wedge-specific quarantine context. */
export function isLiveBuyerPathCtaEligibleV1(
  link: BuyLinkGateLinkV1,
  options?: { now?: Date },
): boolean {
  return isBuyerPathLinkTrustCurrencyPermittedV1({ link, now: options?.now });
}
