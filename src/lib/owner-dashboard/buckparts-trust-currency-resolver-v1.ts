/**
 * BuckParts Trust Currency Resolver v1 — canonical OK / DUE_SOON / EXPIRED / DEGRADED / UNKNOWN.
 *
 * EXPIRED, DEGRADED, and UNKNOWN fail closed for homeowner buy paths and guarded apply.
 * Missed revalidation cadence (past next_re_audit_after) → EXPIRED for public trust.
 */

import {
  parseBrowserTruthCheckedAtMs,
  LIVE_BROWSER_TRUTH_MAX_AGE_MS,
  type BuyLinkGateLinkV1,
  buyLinkGateFailureKind,
} from "@/lib/retailers/launch-buy-links";
import { verifyArtifactSha256V1 } from "./truth-ledger-v1";

export const BUCKPARTS_TRUST_CURRENCY_CONTRACT_V1 =
  "buckparts_trust_currency_resolver_v1" as const;

export type TrustCurrencyStatusV1 =
  | "OK"
  | "DUE_SOON"
  | "EXPIRED"
  | "DEGRADED"
  | "UNKNOWN";

export type TrustCurrencyDimensionV1 =
  | "browser_proof_fresh"
  | "revalidation_cadence"
  | "source_evidence_integrity"
  | "buy_link_gate";

export type TrustCurrencySignalV1 = {
  dimension: TrustCurrencyDimensionV1;
  status: TrustCurrencyStatusV1;
  source_contract: string;
  reason: string;
  homeowner_exposed: boolean;
};

export type TrustCurrencyResolutionV1 = {
  contract: typeof BUCKPARTS_TRUST_CURRENCY_CONTRACT_V1;
  aggregate_status: TrustCurrencyStatusV1;
  signals: TrustCurrencySignalV1[];
  fail_closed_homeowner_buy_path: boolean;
  fail_closed_public_trust: boolean;
  fail_closed_guarded_apply: boolean;
};

const STATUS_RANK: Record<TrustCurrencyStatusV1, number> = {
  OK: 0,
  DUE_SOON: 1,
  DEGRADED: 2,
  EXPIRED: 3,
  UNKNOWN: 4,
};

/** Default window before hard expiry when status becomes DUE_SOON (browser proof). */
export const TRUST_CURRENCY_DUE_SOON_WINDOW_MS_V1 = 7 * 24 * 60 * 60 * 1000;

export function trustCurrencyStatusRankV1(status: TrustCurrencyStatusV1): number {
  return STATUS_RANK[status];
}

export function mergeTrustCurrencyStatusesV1(
  statuses: readonly TrustCurrencyStatusV1[],
): TrustCurrencyStatusV1 {
  if (statuses.length === 0) return "UNKNOWN";
  return statuses.reduce((worst, s) =>
    STATUS_RANK[s] > STATUS_RANK[worst] ? s : worst,
  );
}

export function trustCurrencyFailsClosedForHomeownerBuyPathV1(
  status: TrustCurrencyStatusV1,
): boolean {
  return status === "EXPIRED" || status === "DEGRADED" || status === "UNKNOWN";
}

export function trustCurrencyFailsClosedForPublicTrustV1(
  status: TrustCurrencyStatusV1,
): boolean {
  return (
    trustCurrencyFailsClosedForHomeownerBuyPathV1(status) || status === "EXPIRED"
  );
}

export function trustCurrencyFailsClosedForGuardedApplyV1(
  status: TrustCurrencyStatusV1,
): boolean {
  return trustCurrencyFailsClosedForHomeownerBuyPathV1(status);
}

export function resolveBrowserProofTrustCurrencyV1(args: {
  checked_at?: string | null;
  now?: Date;
  maxAgeMs?: number;
  dueSoonWindowMs?: number;
}): TrustCurrencySignalV1 {
  const maxAgeMs = args.maxAgeMs ?? LIVE_BROWSER_TRUTH_MAX_AGE_MS;
  const dueSoonWindowMs = args.dueSoonWindowMs ?? TRUST_CURRENCY_DUE_SOON_WINDOW_MS_V1;
  const nowMs = (args.now ?? new Date()).getTime();
  const checkedAtMs = parseBrowserTruthCheckedAtMs(args.checked_at);

  if (checkedAtMs === null) {
    return {
      dimension: "browser_proof_fresh",
      status: "UNKNOWN",
      source_contract: BUCKPARTS_TRUST_CURRENCY_CONTRACT_V1,
      reason: "missing_browser_truth_checked_at",
      homeowner_exposed: true,
    };
  }

  const ageMs = nowMs - checkedAtMs;
  if (ageMs > maxAgeMs) {
    return {
      dimension: "browser_proof_fresh",
      status: "EXPIRED",
      source_contract: BUCKPARTS_TRUST_CURRENCY_CONTRACT_V1,
      reason: "stale_browser_truth_checked_at",
      homeowner_exposed: true,
    };
  }

  if (ageMs > maxAgeMs - dueSoonWindowMs) {
    return {
      dimension: "browser_proof_fresh",
      status: "DUE_SOON",
      source_contract: BUCKPARTS_TRUST_CURRENCY_CONTRACT_V1,
      reason: "browser_truth_checked_at_due_soon",
      homeowner_exposed: true,
    };
  }

  return {
    dimension: "browser_proof_fresh",
    status: "OK",
    source_contract: BUCKPARTS_TRUST_CURRENCY_CONTRACT_V1,
    reason: "browser_truth_checked_at_fresh",
    homeowner_exposed: true,
  };
}

export function resolveRevalidationCadenceTrustCurrencyV1(args: {
  next_re_audit_after: string | null | undefined;
  now?: Date;
  dueSoonWindowMs?: number;
}): TrustCurrencySignalV1 {
  const dueSoonWindowMs = args.dueSoonWindowMs ?? TRUST_CURRENCY_DUE_SOON_WINDOW_MS_V1;
  const next = args.next_re_audit_after?.trim();
  if (!next) {
    return {
      dimension: "revalidation_cadence",
      status: "UNKNOWN",
      source_contract: "truth_integrity_registry_v1",
      reason: "revalidation_cadence_missing",
      homeowner_exposed: true,
    };
  }
  const dueMs = Date.parse(next);
  const nowMs = (args.now ?? new Date()).getTime();
  if (Number.isNaN(dueMs)) {
    return {
      dimension: "revalidation_cadence",
      status: "UNKNOWN",
      source_contract: "truth_integrity_registry_v1",
      reason: "revalidation_cadence_unparseable",
      homeowner_exposed: true,
    };
  }
  if (nowMs >= dueMs) {
    return {
      dimension: "revalidation_cadence",
      status: "EXPIRED",
      source_contract: "truth_integrity_registry_v1",
      reason: "revalidation_cadence_missed",
      homeowner_exposed: true,
    };
  }
  if (nowMs >= dueMs - dueSoonWindowMs) {
    return {
      dimension: "revalidation_cadence",
      status: "DUE_SOON",
      source_contract: "truth_integrity_registry_v1",
      reason: "revalidation_cadence_due_soon",
      homeowner_exposed: true,
    };
  }
  return {
    dimension: "revalidation_cadence",
    status: "OK",
    source_contract: "truth_integrity_registry_v1",
    reason: "revalidation_cadence_current",
    homeowner_exposed: false,
  };
}

export function resolveSourceEvidenceIntegrityTrustCurrencyV1(args: {
  rootDir: string;
  artifact_rel_path: string;
  expected_sha256?: string | null;
  readText?: (abs: string) => string;
}): TrustCurrencySignalV1 {
  const expected = args.expected_sha256?.trim().toLowerCase();
  if (!expected) {
    return {
      dimension: "source_evidence_integrity",
      status: "UNKNOWN",
      source_contract: "truth_ledger_v1",
      reason: "source_evidence_hash_unbound",
      homeowner_exposed: false,
    };
  }
  const verify = verifyArtifactSha256V1({
    rootDir: args.rootDir,
    artifact_rel_path: args.artifact_rel_path,
    expected_sha256: expected,
    readText: args.readText,
  });
  if (!verify.ok) {
    return {
      dimension: "source_evidence_integrity",
      status: "DEGRADED",
      source_contract: "truth_ledger_v1",
      reason: verify.reason,
      homeowner_exposed: true,
    };
  }
  return {
    dimension: "source_evidence_integrity",
    status: "OK",
    source_contract: "truth_ledger_v1",
    reason: "source_evidence_hash_verified",
    homeowner_exposed: false,
  };
}

export function resolveBuyLinkGateTrustCurrencyV1(
  link: BuyLinkGateLinkV1,
  options?: { now?: Date; maxAgeMs?: number },
): TrustCurrencySignalV1 | null {
  const gate = buyLinkGateFailureKind(link, options);
  if (!gate) return null;
  let status: TrustCurrencyStatusV1 = "DEGRADED";
  if (
    gate === "missing_browser_truth_checked_at" ||
    gate === "missing_browser_truth"
  ) {
    status = "UNKNOWN";
  } else if (gate === "stale_browser_truth_checked_at") {
    status = "EXPIRED";
  }
  return {
    dimension: "buy_link_gate",
    status,
    source_contract: "launch_buy_links_v1",
    reason: `buy_link_gate_failure:${gate}`,
    homeowner_exposed: true,
  };
}

export function resolveTrustCurrencyV1(args: {
  signals: readonly TrustCurrencySignalV1[];
}): TrustCurrencyResolutionV1 {
  const aggregate_status = mergeTrustCurrencyStatusesV1(
    args.signals.map((s) => s.status),
  );
  return {
    contract: BUCKPARTS_TRUST_CURRENCY_CONTRACT_V1,
    aggregate_status,
    signals: [...args.signals],
    fail_closed_homeowner_buy_path:
      trustCurrencyFailsClosedForHomeownerBuyPathV1(aggregate_status),
    fail_closed_public_trust:
      trustCurrencyFailsClosedForPublicTrustV1(aggregate_status),
    fail_closed_guarded_apply:
      trustCurrencyFailsClosedForGuardedApplyV1(aggregate_status),
  };
}

/** Canonical buyer-path link trust: gate failures + browser proof currency. */
export function resolveBuyerPathLinkTrustCurrencyV1(args: {
  link: BuyLinkGateLinkV1;
  now?: Date;
  maxAgeMs?: number;
}): TrustCurrencyResolutionV1 {
  const gateSignal = resolveBuyLinkGateTrustCurrencyV1(args.link, {
    now: args.now,
    maxAgeMs: args.maxAgeMs,
  });
  if (gateSignal) {
    return resolveTrustCurrencyV1({ signals: [gateSignal] });
  }
  const browser = resolveBrowserProofTrustCurrencyV1({
    checked_at: args.link.browser_truth_checked_at,
    now: args.now,
    maxAgeMs: args.maxAgeMs,
  });
  return resolveTrustCurrencyV1({ signals: [browser] });
}

export function isBuyerPathLinkTrustCurrencyPermittedV1(args: {
  link: BuyLinkGateLinkV1;
  now?: Date;
}): boolean {
  return !resolveBuyerPathLinkTrustCurrencyV1(args).fail_closed_homeowner_buy_path;
}
