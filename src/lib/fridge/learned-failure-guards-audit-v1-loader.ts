/**
 * Build-time bundled learned-failure guards audit — avoids runtime readFileSync on Netlify.
 * Fail closed when audit data is unavailable (never throw into route handlers).
 */

import learnedFailureGuardsAuditV1 from "../../../data/fridge/batch-production/audits/learned-failure-guards-v1.json";

export const LEARNED_FAILURE_GUARDS_JSON_REL_V1 =
  "data/fridge/batch-production/audits/learned-failure-guards-v1.json" as const;

export type LearnedFailureGuardVerdictV1 = "PASS" | "WARN" | "BLOCK";

export type LearnedFailureConfusionFamilyGuardV1 = {
  guard_id: string;
  verdict: LearnedFailureGuardVerdictV1;
  detail: string;
};

export type LearnedFailureSingleFilterFamilyGuardV1 = {
  verdict: LearnedFailureGuardVerdictV1;
  detail: string;
  proven_marketing_families?: string[];
};

export type LearnedFailurePerSlugGuardRowV1 = {
  fridge_slug: string;
  classification: string;
  aggregate_verdict: LearnedFailureGuardVerdictV1;
  confusion_family_guards: LearnedFailureConfusionFamilyGuardV1[];
  single_filter_family?: LearnedFailureSingleFilterFamilyGuardV1;
};

type LearnedFailureGuardsAuditDocumentV1 = {
  per_slug_guards?: LearnedFailurePerSlugGuardRowV1[];
};

let guardIndexCache: Map<string, LearnedFailurePerSlugGuardRowV1> | null = null;
let guardDataUnavailableForTestsV1 = false;

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function buildGuardIndexFromAudit(
  audit: LearnedFailureGuardsAuditDocumentV1,
): Map<string, LearnedFailurePerSlugGuardRowV1> {
  return new Map(
    (audit.per_slug_guards ?? []).map((row) => [normalizeSlug(row.fridge_slug), row]),
  );
}

export function setLearnedFailureGuardsAuditUnavailableForTestsV1(unavailable: boolean): void {
  guardDataUnavailableForTestsV1 = unavailable;
  guardIndexCache = null;
}

export function resetLearnedFailureGuardsAuditLoaderCacheForTestsV1(): void {
  guardIndexCache = null;
  guardDataUnavailableForTestsV1 = false;
}

export function isLearnedFailureGuardsAuditDataAvailableV1(): boolean {
  if (guardDataUnavailableForTestsV1) return false;
  return loadLearnedFailureGuardIndexV1() != null;
}

/** Returns null when audit data is unavailable — callers must fail closed. */
export function loadLearnedFailureGuardIndexV1(): Map<string, LearnedFailurePerSlugGuardRowV1> | null {
  if (guardDataUnavailableForTestsV1) return null;
  if (guardIndexCache) return guardIndexCache;
  try {
    guardIndexCache = buildGuardIndexFromAudit(
      learnedFailureGuardsAuditV1 as LearnedFailureGuardsAuditDocumentV1,
    );
    return guardIndexCache;
  } catch {
    guardIndexCache = null;
    return null;
  }
}

export function getLearnedFailurePerSlugGuardRowV1(fridgeModelSlug: string): LearnedFailurePerSlugGuardRowV1 | null {
  const index = loadLearnedFailureGuardIndexV1();
  if (!index) return null;
  return index.get(normalizeSlug(fridgeModelSlug)) ?? null;
}
