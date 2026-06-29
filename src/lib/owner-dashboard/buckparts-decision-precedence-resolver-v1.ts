/**
 * BuckParts Decision Precedence Resolver v1 — central DENY > UNKNOWN > ALLOW.
 * DENY always beats ALLOW. UNKNOWN fails closed for buyer-path mutation and public trust.
 */

export const BUCKPARTS_DECISION_PRECEDENCE_CONTRACT_V1 =
  "buckparts_decision_precedence_resolver_v1" as const;

export type DecisionDispositionV1 = "DENY" | "ALLOW" | "UNKNOWN";

export type DecisionSignalV1 = {
  dimension: string;
  disposition: DecisionDispositionV1;
  source_contract: string;
  reason: string;
  homeowner_exposed?: boolean;
};

export type DecisionPrecedenceResultV1 = {
  contract: typeof BUCKPARTS_DECISION_PRECEDENCE_CONTRACT_V1;
  effective_public_trust: DecisionDispositionV1;
  effective_buyer_path_mutation: DecisionDispositionV1;
  deny_signals: DecisionSignalV1[];
  unknown_signals: DecisionSignalV1[];
  allow_signals: DecisionSignalV1[];
  mutation_permitted: boolean;
  public_trust_current: boolean;
};

const MUTATION_CRITICAL_DIMENSIONS = new Set([
  "evidence_freshness",
  "wrong_family",
  "hard_do_not_use",
  "browser_proof_fresh",
  "founder_approval_binding",
  "quarantine",
  "confusion_family",
  "execution_plan_hash",
  "apply_plan_hash",
  "evidence_binding",
  "buy_link_gate",
  "stop_the_line_stale_evidence",
  "learned_failure_block",
]);

export function isMutationCriticalDimensionV1(dimension: string): boolean {
  return MUTATION_CRITICAL_DIMENSIONS.has(dimension);
}

export function resolveDecisionPrecedenceV1(
  signals: readonly DecisionSignalV1[],
): DecisionPrecedenceResultV1 {
  const deny_signals = signals.filter((s) => s.disposition === "DENY");
  const unknown_signals = signals.filter((s) => s.disposition === "UNKNOWN");
  const allow_signals = signals.filter((s) => s.disposition === "ALLOW");

  const homeownerDeny = deny_signals.some((s) => s.homeowner_exposed === true);
  const anyDeny = deny_signals.length > 0;
  const mutationUnknown = unknown_signals.some((s) =>
    isMutationCriticalDimensionV1(s.dimension),
  );

  let effective_public_trust: DecisionDispositionV1 = "ALLOW";
  if (homeownerDeny || anyDeny) {
    effective_public_trust = "DENY";
  } else if (unknown_signals.some((s) => s.homeowner_exposed === true)) {
    effective_public_trust = "UNKNOWN";
  }

  let effective_buyer_path_mutation: DecisionDispositionV1 = "ALLOW";
  if (anyDeny) {
    effective_buyer_path_mutation = "DENY";
  } else if (mutationUnknown) {
    effective_buyer_path_mutation = "UNKNOWN";
  }

  return {
    contract: BUCKPARTS_DECISION_PRECEDENCE_CONTRACT_V1,
    effective_public_trust,
    effective_buyer_path_mutation,
    deny_signals,
    unknown_signals,
    allow_signals,
    mutation_permitted: effective_buyer_path_mutation === "ALLOW",
    public_trust_current: effective_public_trust === "ALLOW",
  };
}

export function decisionSignalFromDispositionV1(args: {
  dimension: string;
  disposition: DecisionDispositionV1;
  source_contract: string;
  reason: string;
  homeowner_exposed?: boolean;
}): DecisionSignalV1 {
  return {
    dimension: args.dimension,
    disposition: args.disposition,
    source_contract: args.source_contract,
    reason: args.reason,
    homeowner_exposed: args.homeowner_exposed,
  };
}
