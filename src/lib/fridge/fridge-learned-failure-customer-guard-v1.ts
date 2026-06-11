/**
 * Customer-facing fridge model safety from repo learned-failure-guards audit (read-only JSON).
 * Suppresses buy guidance when aggregate_verdict is BLOCK — does not mutate compat data.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  getFridgeModelReviewOverride,
  type FridgeModelReviewOverride,
} from "@/lib/fridge/fridge-model-review-overrides";

const LEARNED_FAILURE_GUARDS_JSON_REL_V1 =
  "data/fridge/batch-production/audits/learned-failure-guards-v1.json" as const;

const LEARNED_FAILURE_BLOCK_PUBLIC_MESSAGE_V1 =
  "We're reviewing water filter compatibility for this refrigerator model. Our reference data maps conflicting part families, so BuckParts will not show buying options until compatibility is verified." as const;

type GuardVerdictV1 = "PASS" | "WARN" | "BLOCK";

type PerSlugLearnedFailureGuardRowV1 = {
  fridge_slug: string;
  classification: string;
  aggregate_verdict: GuardVerdictV1;
  confusion_family_guards: { guard_id: string; verdict: GuardVerdictV1; detail: string }[];
};

export type FridgeCustomerSafetyEvidenceBasisV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type FridgeCustomerSafetyResolutionV1 = {
  quarantine: boolean;
  public_message: string | null;
  internal_evidence_doc: string | null;
  evidence_basis: FridgeCustomerSafetyEvidenceBasisV1;
  reason: "OWNER_REVIEW_OVERRIDE" | "LEARNED_FAILURE_GUARD_BLOCK" | null;
  learned_failure_guard_ids: string[];
};

let guardIndexCache: Map<string, PerSlugLearnedFailureGuardRowV1> | null = null;

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function loadLearnedFailureGuardIndexV1(
  rootDir: string = process.cwd(),
): Map<string, PerSlugLearnedFailureGuardRowV1> {
  if (guardIndexCache) return guardIndexCache;
  const abs = path.join(rootDir, LEARNED_FAILURE_GUARDS_JSON_REL_V1);
  const parsed = JSON.parse(readFileSync(abs, "utf8")) as {
    per_slug_guards?: PerSlugLearnedFailureGuardRowV1[];
  };
  guardIndexCache = new Map(
    (parsed.per_slug_guards ?? []).map((row) => [normalizeSlug(row.fridge_slug), row]),
  );
  return guardIndexCache;
}

export function resetLearnedFailureGuardIndexCacheForTestsV1(): void {
  guardIndexCache = null;
}

function blockedGuardIds(row: PerSlugLearnedFailureGuardRowV1): string[] {
  return row.confusion_family_guards
    .filter((guard) => guard.verdict === "BLOCK")
    .map((guard) => guard.guard_id);
}

export function resolveFridgeCustomerSafetyV1(args: {
  fridgeModelSlug: string;
  rootDir?: string;
}): FridgeCustomerSafetyResolutionV1 {
  const slug = normalizeSlug(args.fridgeModelSlug);
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

  const guardRow = loadLearnedFailureGuardIndexV1(args.rootDir).get(slug);
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
