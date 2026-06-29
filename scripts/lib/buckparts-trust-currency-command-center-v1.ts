/**
 * Command Center v2 lane: trust_currency_v1 — blocking visibility for expired/degraded trust.
 */

import {
  buildGuardedApplyTrustCurrencyPreflightV1,
  GUARDED_APPLY_TRUST_CURRENCY_PREFLIGHT_CONTRACT_V1,
} from "./guarded-apply-trust-currency-preflight-v1";
import {
  BUCKPARTS_TRUST_CURRENCY_CONTRACT_V1,
  mergeTrustCurrencyStatusesV1,
  type TrustCurrencyStatusV1,
} from "./buckparts-trust-currency-resolver-v1";
import { buildTruthIntegrityRegistryCommandCenterLaneV1 } from "./command-center-truth-integrity-registry-v1";
import { buildOwnerDecisionQueueCommandCenterLaneV1 } from "./owner-decision-queue-command-center-v1";

export const TRUST_CURRENCY_CC_LANE_CONTRACT_V1 = "trust_currency_v1" as const;

export const TRUST_CURRENCY_CC_JQ_PATH_V1 =
  ".command_center_v2.trust_currency_v1" as const;

export type TrustCurrencyCommandCenterLaneV1 = {
  contract: typeof TRUST_CURRENCY_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  deploy_authorized: false;
  recommended_jq_path: typeof TRUST_CURRENCY_CC_JQ_PATH_V1;
  resolver_contract: typeof BUCKPARTS_TRUST_CURRENCY_CONTRACT_V1;
  aggregate_public_trust_status: TrustCurrencyStatusV1;
  blocks_public_serving: boolean;
  blocks_guarded_apply: boolean;
  blocking_stale_critical: boolean;
  guarded_apply_preflight_blockers: string[];
  owner_decision_stale_count: number;
  revalidation_cadence_expired_count: number;
  proven_facts: string[];
  not_proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

export function buildTrustCurrencyCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
}): TrustCurrencyCommandCenterLaneV1 {
  const now = args.now ?? (() => new Date());
  const truthIntegrity = buildTruthIntegrityRegistryCommandCenterLaneV1({
    rootDir: args.rootDir,
    now,
  });
  const ownerQueue = buildOwnerDecisionQueueCommandCenterLaneV1({
    rootDir: args.rootDir,
    now,
  });
  const preflight = buildGuardedApplyTrustCurrencyPreflightV1({
    rootDir: args.rootDir,
    now,
  });

  const statuses: TrustCurrencyStatusV1[] = [preflight.trust_currency.aggregate_status];
  if (truthIntegrity.next_re_audit_due_count > 0) {
    statuses.push("EXPIRED");
  }
  if (ownerQueue.stale_count > 0) {
    statuses.push("EXPIRED");
  }
  const aggregate_public_trust_status = mergeTrustCurrencyStatusesV1(statuses);

  const blocks_public_serving =
    aggregate_public_trust_status === "EXPIRED" ||
    aggregate_public_trust_status === "DEGRADED" ||
    aggregate_public_trust_status === "UNKNOWN";

  const blocks_guarded_apply = preflight.blockers.length > 0;
  const blocking_stale_critical =
    ownerQueue.stale_count > 0 || truthIntegrity.next_re_audit_due_count > 0;

  return {
    contract: TRUST_CURRENCY_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    deploy_authorized: false,
    recommended_jq_path: TRUST_CURRENCY_CC_JQ_PATH_V1,
    resolver_contract: BUCKPARTS_TRUST_CURRENCY_CONTRACT_V1,
    aggregate_public_trust_status,
    blocks_public_serving,
    blocks_guarded_apply,
    blocking_stale_critical,
    guarded_apply_preflight_blockers: preflight.blockers,
    owner_decision_stale_count: ownerQueue.stale_count,
    revalidation_cadence_expired_count: preflight.revalidation_cadence_expired_count,
    proven_facts: [
      `PROVEN: trust currency resolver ${BUCKPARTS_TRUST_CURRENCY_CONTRACT_V1} wired to /go gate and guarded apply preflight.`,
      `PROVEN: next_re_audit_due_count=${String(truthIntegrity.next_re_audit_due_count)} owner_decision_stale_count=${String(ownerQueue.stale_count)}.`,
      `PROVEN: guarded_apply_preflight_blockers=${String(preflight.blockers.length)}.`,
    ],
    not_proven_facts: [
      "NOT_PROVEN: live Supabase row freshness — browser_truth_checked_at enforced at gate when present on row.",
    ],
    unknown_facts: [
      "UNKNOWN: per-row trust currency at runtime without loading each retailer_links row into CC build.",
    ],
    recommended_next_action:
      blocks_guarded_apply || blocks_public_serving
        ? "Clear trust_currency blockers: refresh browser proof, revalidate truth-integrity findings, reopen expired owner decisions."
        : "Trust currency aggregate OK — continue read-only verification; DUE_SOON signals should be scheduled before expiry.",
  };
}
