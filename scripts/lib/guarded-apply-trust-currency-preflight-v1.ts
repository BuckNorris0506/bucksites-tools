/**
 * Guarded apply trust-currency preflight — fail-closed before mutation executors.
 */

import {
  buildOwnerDecisionQueueProjectionV1,
  type OwnerDecisionQueueProjectionV1,
} from "@/lib/owner-dashboard/owner-decision-queue-v1";
import {
  isTruthIntegrityFindingUnfixedV1,
  isTruthIntegrityHighSeverityV1,
  loadTruthIntegrityRegistryV1,
} from "./truth-integrity-registry-v1";
import {
  resolveRevalidationCadenceTrustCurrencyV1,
  resolveTrustCurrencyV1,
  trustCurrencyFailsClosedForGuardedApplyV1,
  type TrustCurrencyResolutionV1,
} from "./buckparts-trust-currency-resolver-v1";

export const GUARDED_APPLY_TRUST_CURRENCY_PREFLIGHT_CONTRACT_V1 =
  "guarded_apply_trust_currency_preflight_v1" as const;

export type GuardedApplyTrustCurrencyPreflightV1 = {
  contract: typeof GUARDED_APPLY_TRUST_CURRENCY_PREFLIGHT_CONTRACT_V1;
  read_only: true;
  mutation_authorized: false;
  blockers: string[];
  trust_currency: TrustCurrencyResolutionV1;
  owner_queue_stale_critical_count: number;
  revalidation_cadence_expired_count: number;
};

export function buildGuardedApplyTrustCurrencyPreflightV1(args: {
  rootDir: string;
  now?: () => Date;
  ownerQueue?: OwnerDecisionQueueProjectionV1;
}): GuardedApplyTrustCurrencyPreflightV1 {
  const now = args.now ?? (() => new Date());
  const nowDate = now();
  const blockers: string[] = [];

  const registry = loadTruthIntegrityRegistryV1({ rootDir: args.rootDir });
  const findings = registry.document?.findings ?? [];
  const revalidationSignals = findings
    .filter((f) => isTruthIntegrityFindingUnfixedV1(f.status))
    .map((f) =>
      resolveRevalidationCadenceTrustCurrencyV1({
        next_re_audit_after: f.re_audit.next_re_audit_after,
        now: nowDate,
      }),
    );
  const revalidation_cadence_expired_count = revalidationSignals.filter(
    (s) => s.status === "EXPIRED",
  ).length;
  for (const signal of revalidationSignals) {
    if (signal.status === "EXPIRED" || signal.status === "UNKNOWN") {
      blockers.push(`trust_currency_revalidation:${signal.reason}`);
    }
  }

  const ownerQueue =
    args.ownerQueue ??
    buildOwnerDecisionQueueProjectionV1({ rootDir: args.rootDir, now });
  const owner_queue_stale_critical_count = ownerQueue.stale_decisions.length;
  if (ownerQueue.stale_count > 0) {
    blockers.push(`owner_decision_queue_stale_count:${ownerQueue.stale_count}`);
  }
  if (owner_queue_stale_critical_count > 0) {
    blockers.push(
      `owner_decision_queue_stale_critical_count:${owner_queue_stale_critical_count}`,
    );
  }

  const unfixedHigh = findings.filter(
    (f) =>
      isTruthIntegrityFindingUnfixedV1(f.status) &&
      isTruthIntegrityHighSeverityV1(f.severity),
  );
  if (unfixedHigh.length > 0 && revalidation_cadence_expired_count > 0) {
    blockers.push(`truth_integrity_high_severity_revalidation_expired`);
  }

  const trust_currency = resolveTrustCurrencyV1({
    signals: revalidationSignals,
  });
  if (trustCurrencyFailsClosedForGuardedApplyV1(trust_currency.aggregate_status)) {
    blockers.push(`trust_currency_aggregate:${trust_currency.aggregate_status}`);
  }

  return {
    contract: GUARDED_APPLY_TRUST_CURRENCY_PREFLIGHT_CONTRACT_V1,
    read_only: true,
    mutation_authorized: false,
    blockers: Array.from(new Set(blockers)),
    trust_currency,
    owner_queue_stale_critical_count,
    revalidation_cadence_expired_count,
  };
}

export function guardedApplyTrustCurrencyBlocksMutationV1(
  preflight: GuardedApplyTrustCurrencyPreflightV1,
): boolean {
  return preflight.blockers.length > 0;
}
