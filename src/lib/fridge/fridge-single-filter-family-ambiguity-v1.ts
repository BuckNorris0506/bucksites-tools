/**
 * Read-only detection of learned-failure single_filter_family WARN ambiguity.
 * Does not mutate catalog data.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

export const SINGLE_FILTER_FAMILY_AMBIGUITY_DETAIL_V1 =
  "Multiple mapped filter slugs without proven single-family proof" as const;

const LEARNED_FAILURE_GUARDS_JSON_REL_V1 =
  "data/fridge/batch-production/audits/learned-failure-guards-v1.json" as const;

type SingleFilterFamilyGuardV1 = {
  verdict: "PASS" | "WARN" | "BLOCK";
  detail: string;
  proven_marketing_families?: string[];
};

type PerSlugLearnedFailureGuardRowV1 = {
  fridge_slug: string;
  aggregate_verdict: "PASS" | "WARN" | "BLOCK";
  single_filter_family?: SingleFilterFamilyGuardV1;
};

let guardIndexCache: Map<string, PerSlugLearnedFailureGuardRowV1> | null = null;

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function loadGuardIndexV1(rootDir: string = process.cwd()): Map<string, PerSlugLearnedFailureGuardRowV1> {
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

export function resetSingleFilterFamilyAmbiguityGuardIndexCacheForTestsV1(): void {
  guardIndexCache = null;
}

export function isSingleFilterFamilyAmbiguityGuardV1(
  singleFilterFamily: SingleFilterFamilyGuardV1 | undefined,
): boolean {
  if (!singleFilterFamily) return false;
  return (
    singleFilterFamily.verdict === "WARN" &&
    singleFilterFamily.detail.includes(SINGLE_FILTER_FAMILY_AMBIGUITY_DETAIL_V1)
  );
}

export function isFridgeModelSingleFilterFamilyAmbiguousV1(args: {
  fridgeModelSlug: string;
  rootDir?: string;
}): boolean {
  const row = loadGuardIndexV1(args.rootDir).get(normalizeSlug(args.fridgeModelSlug));
  if (!row) return false;
  return isSingleFilterFamilyAmbiguityGuardV1(row.single_filter_family);
}
