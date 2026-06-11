/**
 * Customer-facing fridge model safety from learned-failure-guards audit (build-time bundled JSON).
 * Suppresses buy guidance when aggregate_verdict is BLOCK — does not mutate compat data.
 */

import {
  getLearnedFailurePerSlugGuardRowV1,
  isLearnedFailureGuardsAuditDataAvailableV1,
  LEARNED_FAILURE_GUARDS_JSON_REL_V1,
  loadLearnedFailureGuardIndexV1,
  resetLearnedFailureGuardsAuditLoaderCacheForTestsV1,
  setLearnedFailureGuardsAuditUnavailableForTestsV1,
  type LearnedFailurePerSlugGuardRowV1,
} from "@/lib/fridge/learned-failure-guards-audit-v1-loader";
import {
  getFridgeModelReviewOverride,
  type FridgeModelReviewOverride,
} from "@/lib/fridge/fridge-model-review-overrides";

const LEARNED_FAILURE_BLOCK_PUBLIC_MESSAGE_V1 =
  "We're reviewing water filter compatibility for this refrigerator model. Our reference data maps conflicting part families, so BuckParts will not show buying options until compatibility is verified." as const;

const GUARD_DATA_UNAVAILABLE_PUBLIC_MESSAGE_V1 =
  "BuckParts is verifying water filter compatibility for this refrigerator model. Buying options stay hidden until our safety checks finish loading." as const;

export type FridgeCustomerSafetyEvidenceBasisV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type FridgeCustomerSafetyResolutionV1 = {
  quarantine: boolean;
  public_message: string | null;
  internal_evidence_doc: string | null;
  evidence_basis: FridgeCustomerSafetyEvidenceBasisV1;
  reason: "OWNER_REVIEW_OVERRIDE" | "LEARNED_FAILURE_GUARD_BLOCK" | "GUARD_DATA_UNAVAILABLE" | null;
  learned_failure_guard_ids: string[];
};

export function resetLearnedFailureGuardIndexCacheForTestsV1(): void {
  resetLearnedFailureGuardsAuditLoaderCacheForTestsV1();
}

export { setLearnedFailureGuardsAuditUnavailableForTestsV1 };

export function getFridgeLearnedFailureGuardRowV1(args: {
  fridgeModelSlug: string;
  rootDir?: string;
}): LearnedFailurePerSlugGuardRowV1 | null {
  void args.rootDir;
  return getLearnedFailurePerSlugGuardRowV1(args.fridgeModelSlug);
}

function blockedGuardIds(row: LearnedFailurePerSlugGuardRowV1): string[] {
  return row.confusion_family_guards
    .filter((guard) => guard.verdict === "BLOCK")
    .map((guard) => guard.guard_id);
}

function guardDataUnavailableResolutionV1(): FridgeCustomerSafetyResolutionV1 {
  return {
    quarantine: true,
    public_message: GUARD_DATA_UNAVAILABLE_PUBLIC_MESSAGE_V1,
    internal_evidence_doc: LEARNED_FAILURE_GUARDS_JSON_REL_V1,
    evidence_basis: "UNKNOWN",
    reason: "GUARD_DATA_UNAVAILABLE",
    learned_failure_guard_ids: [],
  };
}

export function resolveFridgeCustomerSafetyV1(args: {
  fridgeModelSlug: string;
  rootDir?: string;
}): FridgeCustomerSafetyResolutionV1 {
  void args.rootDir;
  const slug = args.fridgeModelSlug.trim().toLowerCase();
  const ownerOverride: FridgeModelReviewOverride | null = getFridgeModelReviewOverride(slug);

  if (ownerOverride) {
    return {
      quarantine: true,
      public_message: ownerOverride.public_message,
      internal_evidence_doc: ownerOverride.internal_evidence_doc,
      evidence_basis: "PROVEN",
      reason: "OWNER_REVIEW_OVERRIDE",
      learned_failure_guard_ids: [],
    };
  }

  const guardIndex = loadLearnedFailureGuardIndexV1();
  if (!guardIndex || !isLearnedFailureGuardsAuditDataAvailableV1()) {
    return guardDataUnavailableResolutionV1();
  }

  const guardRow = guardIndex.get(slug);
  if (!guardRow) {
    return {
      quarantine: false,
      public_message: null,
      internal_evidence_doc: null,
      evidence_basis: "UNKNOWN",
      reason: null,
      learned_failure_guard_ids: [],
    };
  }

  if (guardRow.aggregate_verdict === "BLOCK") {
    return {
      quarantine: true,
      public_message: LEARNED_FAILURE_BLOCK_PUBLIC_MESSAGE_V1,
      internal_evidence_doc: LEARNED_FAILURE_GUARDS_JSON_REL_V1,
      evidence_basis: "PROVEN",
      reason: "LEARNED_FAILURE_GUARD_BLOCK",
      learned_failure_guard_ids: blockedGuardIds(guardRow),
    };
  }

  return {
    quarantine: false,
    public_message: null,
    internal_evidence_doc: null,
    evidence_basis: "PROVEN",
    reason: null,
    learned_failure_guard_ids: blockedGuardIds(guardRow),
  };
}
