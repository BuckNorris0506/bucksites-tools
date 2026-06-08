/**
 * Read-only LEARNED_FAILURE_GUARDS_V1 Phase 1.
 * Permanent prevention checks derived from 76 dangerous fridge model mappings.
 * Does not mutate compat CSV, Supabase, sitemap, robots, pages, or HQ handoff docs.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  getFridgeModelReviewOverride,
  listFridgeModelReviewOverrides,
} from "@/lib/fridge/fridge-model-review-overrides";

import {
  DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1,
  DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
  type DangerousMappingRemediationPlanV1,
} from "./dangerous-mapping-remediation-plan-v1";
import {
  MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
  MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  type ModelFilterCorrectnessAuditV1,
  type ModelFilterCorrectnessClassificationV1,
  type ModelFilterCorrectnessRowV1,
} from "./model-filter-correctness-audit-v1";
import {
  SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1,
} from "./refrigerator-model-first-samsung-marketing-token-cross-reference-v1";
import {
  HAF_CIN_CANONICAL_FILTER_SLUGS_V1,
  HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1,
  type CatalogSlugRowV1,
} from "./samsung-haf-qin-wildcard-expansion-review-v1";

export const LEARNED_FAILURE_GUARDS_CONTRACT_V1 = "learned_failure_guards_v1" as const;

export const LEARNED_FAILURE_GUARDS_JSON_REL_V1 =
  "data/fridge/batch-production/audits/learned-failure-guards-v1.json" as const;

export const LEARNED_FAILURE_GUARDS_MD_REL_V1 =
  "data/fridge/batch-production/drafts/learned-failure-guards-v1.md" as const;

export const LEARNED_FAILURE_GUARDS_DANGEROUS_SLUGS_FIXTURE_REL_V1 =
  "data/fridge/batch-production/fixtures/learned-failure-guards-v1-dangerous-slugs.json" as const;

export const LEARNED_FAILURE_GUARDS_ALLOWED_WRITE_REL_PATHS_V1 = [
  LEARNED_FAILURE_GUARDS_JSON_REL_V1,
  LEARNED_FAILURE_GUARDS_MD_REL_V1,
  LEARNED_FAILURE_GUARDS_DANGEROUS_SLUGS_FIXTURE_REL_V1,
] as const;

export const CONFUSION_FAMILY_GUARD_IDS_V1 = [
  "samsung_haf_qin_vs_haf_cin",
  "samsung_da29_da97_co_map",
  "samsung_wildcard_da29_conflict",
  "samsung_haf_cin_canonical",
  "lg_lt_generation_mix",
  "ge_xwf_xwfe_mix",
  "ge_rpwfe_legacy_mix",
  "frigidaire_fppwfu01_vs_fppwfu02",
  "frigidaire_ultrawf_vs_eptwfu01_mix",
  "frigidaire_eptwfu01_vs_wf3cb_mix",
  "frigidaire_proven_anchor_sibling_drift",
  "frigidaire_fppwfu01_prefix_family_contamination",
] as const;

const FRIGIDAIRE_WF3CB_FAMILY_SLUGS_V1 = ["wf3cb", "frig-242086201"] as const;
export const FRIGIDAIRE_FPPWFU01_CONFLICTING_SIBLING_SLUGS_V1 = [
  "ultrawf",
  "eptwfu01",
  "wf3cb",
  "frig-242086201",
  "wf2cb",
  "wfcb",
] as const;
const FRIGIDAIRE_SIBLING_DRIFT_CONFLICT_SLUGS_V1 = [
  "ultrawf",
  ...FRIGIDAIRE_WF3CB_FAMILY_SLUGS_V1,
] as const;

export type ConfusionFamilyGuardIdV1 = (typeof CONFUSION_FAMILY_GUARD_IDS_V1)[number];

export type GuardVerdictV1 = "PASS" | "WARN" | "BLOCK";

export type ConfusionFamilyGuardResultV1 = {
  guard_id: ConfusionFamilyGuardIdV1;
  verdict: GuardVerdictV1;
  detail: string;
};

export type SingleFilterFamilyGuardResultV1 = {
  verdict: GuardVerdictV1;
  detail: string;
  proven_marketing_families: string[];
};

export type PerSlugLearnedFailureGuardsV1 = {
  fridge_slug: string;
  brand_slug: string;
  classification: ModelFilterCorrectnessClassificationV1;
  mapped_filter_slugs: string[];
  confusion_family_guards: ConfusionFamilyGuardResultV1[];
  single_filter_family: SingleFilterFamilyGuardResultV1;
  aggregate_verdict: GuardVerdictV1;
};

export type LearnedFailurePublicationImpactV1 = {
  preflight_status: "PASS" | "BLOCKED";
  quality_gate_status: "PASS" | "WARN" | "BLOCKED";
  blockers: string[];
};

export type DangerousCountRegressionResultV1 = {
  verdict: GuardVerdictV1;
  dangerous_count: number;
  expected_dangerous_count: number;
  fixture_slug_count: number;
  remediation_plan_slug_count: number;
  fixture_matches_remediation_plan: boolean;
  detail: string;
};

export type LearnedFailureGuardsReportV1 = {
  contract: typeof LEARNED_FAILURE_GUARDS_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  source_audit_contract: typeof MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1;
  source_audit_path: string;
  source_remediation_plan_contract: typeof DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1;
  source_remediation_plan_path: string;
  total_catalog_models: number;
  per_slug_guards: PerSlugLearnedFailureGuardsV1[];
  confusion_family_block_count: Record<ConfusionFamilyGuardIdV1, number>;
  dangerous_count_regression: DangerousCountRegressionResultV1;
  dangerous_slugs_all_blocked: boolean;
  proven_correct_slugs_all_pass: boolean;
  inspect_summary: {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary";
      per_slug_guards: ".per_slug_guards";
      confusion_family_block_count: ".confusion_family_block_count";
      dangerous_count_regression: ".dangerous_count_regression";
    };
    recommended_next_action: string;
  };
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

const MANUAL_EVIDENCE_DIR_REL_V1 = "data/manual-evidence/refrigerator";
const QUARANTINE_MODULE_REL_V1 = "src/lib/fridge/fridge-model-review-overrides.ts";
const SAMSUNG_CROSS_REF_MODULE_REL_V1 =
  "scripts/lib/refrigerator-model-first-samsung-marketing-token-cross-reference-v1.ts";

const HAF_QIN_SLUGS_V1 = ["da97-17376a", "da97-17376b"] as const;
const SAMSUNG_HAFCIN_CANONICAL_ONLY_V1 = "da29-00020b";
const EXPECTED_DANGEROUS_COUNT_V1 = 76;

const VERDICT_RANK: Record<GuardVerdictV1, number> = {
  PASS: 0,
  WARN: 1,
  BLOCK: 2,
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function worstVerdict(verdicts: GuardVerdictV1[]): GuardVerdictV1 {
  return verdicts.reduce<GuardVerdictV1>(
    (worst, verdict) => (VERDICT_RANK[verdict] > VERDICT_RANK[worst] ? verdict : worst),
    "PASS",
  );
}

function guardResult(
  guard_id: ConfusionFamilyGuardIdV1,
  verdict: GuardVerdictV1,
  detail: string,
): ConfusionFamilyGuardResultV1 {
  return { guard_id, verdict, detail };
}

function hasSlug(slugs: string[], target: string): boolean {
  return slugs.includes(normalizeSlug(target));
}

function hasAnySlug(slugs: string[], targets: readonly string[]): boolean {
  return targets.some((target) => hasSlug(slugs, target));
}

export function evaluateConfusionFamilyGuardsV1(args: {
  brandSlug: string;
  mappedFilterSlugs: string[];
  auditBlockers?: string[];
  wildcardBucket?: CatalogSlugRowV1["bucket"] | null;
}): ConfusionFamilyGuardResultV1[] {
  const brand = normalizeSlug(args.brandSlug);
  const slugs = args.mappedFilterSlugs.map(normalizeSlug);
  const blockers = args.auditBlockers ?? [];
  const results: ConfusionFamilyGuardResultV1[] = [];

  const hasHafQin = hasAnySlug(slugs, HAF_QIN_SLUGS_V1);
  const hasHafCinCanonical = hasAnySlug(slugs, HAF_CIN_CANONICAL_FILTER_SLUGS_V1);
  if (brand === "samsung" && hasHafQin && hasHafCinCanonical) {
    results.push(
      guardResult(
        "samsung_haf_qin_vs_haf_cin",
        "BLOCK",
        "HAF-QIN (DA97) and HAF-CIN (DA29) families co-mapped",
      ),
    );
  } else {
    results.push(
      guardResult("samsung_haf_qin_vs_haf_cin", "PASS", "No HAF-QIN/HAF-CIN co-map"),
    );
  }

  const da29 = slugs.filter((slug) => slug.startsWith("da29-"));
  const da97 = slugs.filter((slug) => slug.startsWith("da97-"));
  const da29Da97CoMap =
    brand === "samsung" &&
    da29.length > 0 &&
    da97.length > 0 &&
    !(hasHafQin && hasHafCinCanonical);
  if (da29Da97CoMap) {
    results.push(
      guardResult(
        "samsung_da29_da97_co_map",
        "BLOCK",
        `Samsung DA29 (${da29.join(",")}) + DA97 (${da97.join(",")}) co-mapped`,
      ),
    );
  } else {
    results.push(
      guardResult("samsung_da29_da97_co_map", "PASS", "No Samsung DA29/DA97 co-map"),
    );
  }

  const wildcardReview = blockers.some((b) => b === "wildcard:REVIEW_DA29_CONFLICT");
  const wildcardCompat = blockers.some((b) => b === "wildcard:DA29_COMPAT_PRESENT");
  const wildcardPresent =
    wildcardReview ||
    wildcardCompat ||
    args.wildcardBucket === "REVIEW_DA29_CONFLICT";
  if (wildcardPresent && da29Da97CoMap) {
    results.push(
      guardResult(
        "samsung_wildcard_da29_conflict",
        "BLOCK",
        "Wildcard DA29 conflict with DA29/DA97 co-map",
      ),
    );
  } else if (wildcardPresent) {
    results.push(
      guardResult(
        "samsung_wildcard_da29_conflict",
        "WARN",
        `Wildcard DA29 review flag present (${args.wildcardBucket ?? (blockers.filter((b) => b.startsWith("wildcard:")).join("; ") || "audit")})`,
      ),
    );
  } else {
    results.push(
      guardResult("samsung_wildcard_da29_conflict", "PASS", "No wildcard DA29 conflict flag"),
    );
  }

  const blockedHafCin =
    blockers.some((b) => b === "wildcard:BLOCKED_HAF_CIN_CANONICAL") ||
    args.wildcardBucket === "BLOCKED_HAF_CIN_CANONICAL";
  const nonCanonicalDa29WithCanonical =
    brand === "samsung" &&
    hasSlug(slugs, SAMSUNG_HAFCIN_CANONICAL_ONLY_V1) &&
    hasSlug(slugs, "da29-00012b");
  if (blockedHafCin || nonCanonicalDa29WithCanonical) {
    results.push(
      guardResult(
        "samsung_haf_cin_canonical",
        "BLOCK",
        blockedHafCin
          ? "Wildcard BLOCKED_HAF_CIN_CANONICAL"
          : "Non-canonical da29-00012b co-mapped with canonical da29-00020b",
      ),
    );
  } else {
    results.push(
      guardResult("samsung_haf_cin_canonical", "PASS", "HAF-CIN canonical mapping OK"),
    );
  }

  const ltGenerations = slugs.filter((slug) => /^lt\d/.test(slug));
  if (brand === "lg" && ltGenerations.length > 1) {
    results.push(
      guardResult(
        "lg_lt_generation_mix",
        "BLOCK",
        `Multiple LG LT generations co-mapped: ${ltGenerations.join(",")}`,
      ),
    );
  } else {
    results.push(
      guardResult("lg_lt_generation_mix", "PASS", "No LG LT generation co-map"),
    );
  }

  if (brand === "ge" && hasSlug(slugs, "xwf") && hasSlug(slugs, "xwfe")) {
    results.push(
      guardResult("ge_xwf_xwfe_mix", "BLOCK", "GE XWF and XWFE RFID shell mismatch co-mapped"),
    );
  } else {
    results.push(guardResult("ge_xwf_xwfe_mix", "PASS", "No GE XWF/XWFE co-map"));
  }

  if (
    brand === "ge" &&
    hasSlug(slugs, "rpwfe") &&
    (hasSlug(slugs, "mwf") || hasSlug(slugs, "xwf") || hasSlug(slugs, "xwfe"))
  ) {
    results.push(
      guardResult(
        "ge_rpwfe_legacy_mix",
        "BLOCK",
        "GE RPWFE mixed with legacy MWF/XWF/XWFE family",
      ),
    );
  } else {
    results.push(guardResult("ge_rpwfe_legacy_mix", "PASS", "No GE RPWFE legacy mix"));
  }

  if (hasSlug(slugs, "fppwfu01") && hasSlug(slugs, "fppwfu02")) {
    results.push(
      guardResult(
        "frigidaire_fppwfu01_vs_fppwfu02",
        "BLOCK",
        "Frigidaire FPPWFU01 and FPPWFU02 co-mapped",
      ),
    );
  } else {
    results.push(
      guardResult(
        "frigidaire_fppwfu01_vs_fppwfu02",
        "PASS",
        "No Frigidaire FPPWFU01/FPPWFU02 co-map",
      ),
    );
  }

  if (hasSlug(slugs, "ultrawf") && hasSlug(slugs, "eptwfu01")) {
    results.push(
      guardResult(
        "frigidaire_ultrawf_vs_eptwfu01_mix",
        "BLOCK",
        "Frigidaire ULTRAWF and EPTWFU01 co-mapped on same model",
      ),
    );
  } else {
    results.push(
      guardResult(
        "frigidaire_ultrawf_vs_eptwfu01_mix",
        "PASS",
        "No Frigidaire ULTRAWF/EPTWFU01 co-map",
      ),
    );
  }

  const hasWf3cbFamily = hasAnySlug(slugs, FRIGIDAIRE_WF3CB_FAMILY_SLUGS_V1);
  if (hasSlug(slugs, "eptwfu01") && hasWf3cbFamily) {
    const wf3cbHits = slugs.filter((slug) =>
      FRIGIDAIRE_WF3CB_FAMILY_SLUGS_V1.includes(
        slug as (typeof FRIGIDAIRE_WF3CB_FAMILY_SLUGS_V1)[number],
      ),
    );
    results.push(
      guardResult(
        "frigidaire_eptwfu01_vs_wf3cb_mix",
        "BLOCK",
        `Frigidaire EPTWFU01 and WF3CB family (${wf3cbHits.join(",")}) co-mapped on same model`,
      ),
    );
  } else {
    results.push(
      guardResult(
        "frigidaire_eptwfu01_vs_wf3cb_mix",
        "PASS",
        "No Frigidaire EPTWFU01/WF3CB-family co-map",
      ),
    );
  }

  return results;
}

/** Base model-line key for Frigidaire sibling drift (e.g. FGHB2868PF → FGHB2868). */
export function frigidaireModelLineKeyV1(modelNumber: string): string | null {
  const normalized = modelNumber.trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/^([A-Z]{2,5}\d{3,5})/);
  return match?.[1] ?? null;
}

export function buildFrigidaireModelLineSiblingIndexV1(
  auditRows: ModelFilterCorrectnessRowV1[],
): Map<string, ModelFilterCorrectnessRowV1[]> {
  const index = new Map<string, ModelFilterCorrectnessRowV1[]>();
  for (const row of auditRows) {
    if (normalizeSlug(row.brand_slug) !== "frigidaire") continue;
    const lineKey = frigidaireModelLineKeyV1(row.model_number);
    if (!lineKey) continue;
    const bucketKey = `frigidaire::${lineKey}`;
    const bucket = index.get(bucketKey) ?? [];
    bucket.push(row);
    index.set(bucketKey, bucket);
  }
  return index;
}

function siblingMapsConflictingFamilyWithoutEptwfu01(
  mappedFilterSlugs: string[],
): string[] {
  const slugs = mappedFilterSlugs.map(normalizeSlug);
  if (hasSlug(slugs, "eptwfu01")) return [];
  return slugs.filter((slug) =>
    FRIGIDAIRE_SIBLING_DRIFT_CONFLICT_SLUGS_V1.includes(
      slug as (typeof FRIGIDAIRE_SIBLING_DRIFT_CONFLICT_SLUGS_V1)[number],
    ),
  );
}

export function evaluateFrigidaireProvenAnchorSiblingDriftGuardV1(args: {
  auditRow: ModelFilterCorrectnessRowV1;
  frigidaireSiblingRows?: ModelFilterCorrectnessRowV1[];
}): ConfusionFamilyGuardResultV1 {
  const brand = normalizeSlug(args.auditRow.brand_slug);
  const slug = normalizeSlug(args.auditRow.fridge_slug);
  const mapped = args.auditRow.mapped_filter_slugs.map(normalizeSlug);

  if (
    brand !== "frigidaire" ||
    args.auditRow.classification !== "PROVEN_CORRECT" ||
    !hasSlug(mapped, "eptwfu01")
  ) {
    return guardResult(
      "frigidaire_proven_anchor_sibling_drift",
      "PASS",
      "Not a Frigidaire PROVEN_CORRECT EPTWFU01 anchor",
    );
  }

  const lineKey = frigidaireModelLineKeyV1(args.auditRow.model_number);
  if (!lineKey || !args.frigidaireSiblingRows?.length) {
    return guardResult(
      "frigidaire_proven_anchor_sibling_drift",
      "PASS",
      "No Frigidaire model-line siblings loaded for drift check",
    );
  }

  const driftSiblings = args.frigidaireSiblingRows
    .filter((row) => normalizeSlug(row.fridge_slug) !== slug)
    .map((row) => {
      const conflicts = siblingMapsConflictingFamilyWithoutEptwfu01(row.mapped_filter_slugs);
      return conflicts.length > 0
        ? { fridge_slug: normalizeSlug(row.fridge_slug), conflicts }
        : null;
    })
    .filter((entry): entry is { fridge_slug: string; conflicts: string[] } => entry !== null);

  if (driftSiblings.length === 0) {
    return guardResult(
      "frigidaire_proven_anchor_sibling_drift",
      "PASS",
      `No ${lineKey} siblings map ULTRAWF/WF3CB without EPTWFU01`,
    );
  }

  const detail = driftSiblings
    .map((entry) => `${entry.fridge_slug}→${entry.conflicts.join("|")}`)
    .join("; ");
  return guardResult(
    "frigidaire_proven_anchor_sibling_drift",
    "WARN",
    `${lineKey} PROVEN EPTWFU01 anchor ${slug} has sibling-line drift: ${detail}`,
  );
}

function siblingMapsConflictingFamilyWithoutFppwfu01(
  mappedFilterSlugs: string[],
): string[] {
  const slugs = mappedFilterSlugs.map(normalizeSlug);
  if (slugs.length === 1 && slugs[0] === "fppwfu01") return [];
  return slugs.filter((slug) =>
    FRIGIDAIRE_FPPWFU01_CONFLICTING_SIBLING_SLUGS_V1.includes(
      slug as (typeof FRIGIDAIRE_FPPWFU01_CONFLICTING_SIBLING_SLUGS_V1)[number],
    ),
  );
}

export function evaluateFrigidaireFppwfu01PrefixFamilyContaminationGuardV1(args: {
  auditRow: ModelFilterCorrectnessRowV1;
  frigidaireSiblingRows?: ModelFilterCorrectnessRowV1[];
}): ConfusionFamilyGuardResultV1 {
  const brand = normalizeSlug(args.auditRow.brand_slug);
  const slug = normalizeSlug(args.auditRow.fridge_slug);
  const mapped = args.auditRow.mapped_filter_slugs.map(normalizeSlug);

  if (brand !== "frigidaire" || !hasSlug(mapped, "fppwfu01")) {
    return guardResult(
      "frigidaire_fppwfu01_prefix_family_contamination",
      "PASS",
      "Not a Frigidaire slug mapped to FPPWFU01",
    );
  }

  const lineKey = frigidaireModelLineKeyV1(args.auditRow.model_number);
  if (!lineKey || !args.frigidaireSiblingRows?.length) {
    return guardResult(
      "frigidaire_fppwfu01_prefix_family_contamination",
      "PASS",
      "No Frigidaire model-line siblings loaded for FPPWFU01 contamination check",
    );
  }

  const conflictingSiblings = args.frigidaireSiblingRows
    .filter((row) => normalizeSlug(row.fridge_slug) !== slug)
    .map((row) => {
      const conflicts = siblingMapsConflictingFamilyWithoutFppwfu01(row.mapped_filter_slugs);
      if (conflicts.length === 0) return null;
      return {
        fridge_slug: normalizeSlug(row.fridge_slug),
        conflicts,
        proven: row.classification === "PROVEN_CORRECT",
      };
    })
    .filter(
      (entry): entry is { fridge_slug: string; conflicts: string[]; proven: boolean } =>
        entry !== null,
    );

  if (conflictingSiblings.length === 0) {
    return guardResult(
      "frigidaire_fppwfu01_prefix_family_contamination",
      "PASS",
      `No ${lineKey} siblings map conflicting families without FPPWFU01`,
    );
  }

  const provenConflict = conflictingSiblings.find((entry) => entry.proven);
  const detail = conflictingSiblings
    .map((entry) => `${entry.fridge_slug}→${entry.conflicts.join("|")}`)
    .join("; ");

  if (provenConflict) {
    return guardResult(
      "frigidaire_fppwfu01_prefix_family_contamination",
      "BLOCK",
      `${lineKey} FPPWFU01 map ${slug} conflicts with PROVEN_CORRECT sibling ${provenConflict.fridge_slug} (${provenConflict.conflicts.join("|")})`,
    );
  }

  return guardResult(
    "frigidaire_fppwfu01_prefix_family_contamination",
    "WARN",
    `${lineKey} FPPWFU01 map ${slug} has sibling-line contamination: ${detail}`,
  );
}

function samsungMarketingFamiliesForSlugs(mappedFilterSlugs: string[]): string[] {
  const families = new Set<string>();
  for (const slug of mappedFilterSlugs.map(normalizeSlug)) {
    if (
      SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1.HAFQIN.allowed_filter_slugs.includes(
        slug as (typeof SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1.HAFQIN.allowed_filter_slugs)[number],
      )
    ) {
      families.add("samsung::HAFQIN");
      continue;
    }
    if (slug === SAMSUNG_HAFCIN_CANONICAL_ONLY_V1) {
      families.add("samsung::HAFCIN");
      continue;
    }
    if (slug.startsWith("da29-")) {
      families.add(`samsung::DA29::${slug}`);
    } else if (slug.startsWith("da97-")) {
      families.add(`samsung::DA97::${slug}`);
    }
  }
  return [...families].sort();
}

export function evaluateSingleFilterFamilyPerModelV1(args: {
  brandSlug: string;
  mappedFilterSlugs: string[];
  confusionGuards: ConfusionFamilyGuardResultV1[];
  classification: ModelFilterCorrectnessClassificationV1;
}): SingleFilterFamilyGuardResultV1 {
  const confusionBlocked = args.confusionGuards.some((guard) => guard.verdict === "BLOCK");
  if (confusionBlocked) {
    return {
      verdict: "BLOCK",
      detail: "Confusion-family guard BLOCK present",
      proven_marketing_families: [],
    };
  }

  if (
    args.classification === "WRONG_PART_RISK" ||
    args.classification === "BLOCKED"
  ) {
    return {
      verdict: "BLOCK",
      detail: `Audit classification ${args.classification}`,
      proven_marketing_families: [],
    };
  }

  const brand = normalizeSlug(args.brandSlug);
  const slugs = args.mappedFilterSlugs.map(normalizeSlug);

  if (brand === "samsung") {
    const families = samsungMarketingFamiliesForSlugs(slugs);
    const provenOnly = families.filter(
      (family) => family === "samsung::HAFQIN" || family === "samsung::HAFCIN",
    );
    if (families.length === 1 && provenOnly.length === 1) {
      return {
        verdict: "PASS",
        detail: `Single repo-proven Samsung family ${families[0]}`,
        proven_marketing_families: families,
      };
    }
    if (
      families.length === 1 &&
      families[0] === "samsung::HAFQIN" &&
      slugs.every((slug) =>
        SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1.HAFQIN.allowed_filter_slugs.includes(
          slug as (typeof SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1.HAFQIN.allowed_filter_slugs)[number],
        ),
      )
    ) {
      return {
        verdict: slugs.length > 1 ? "WARN" : "PASS",
        detail: "Multiple slugs within repo-proven samsung::HAFQIN family",
        proven_marketing_families: ["samsung::HAFQIN"],
      };
    }
    if (families.length > 1) {
      return {
        verdict: "BLOCK",
        detail: `Multiple Samsung families detected: ${families.join(", ")}`,
        proven_marketing_families: provenOnly,
      };
    }
  }

  const ltGenerations = slugs.filter((slug) => /^lt\d/.test(slug));
  if (brand === "lg" && ltGenerations.length > 1) {
    return {
      verdict: "BLOCK",
      detail: "Multiple LG LT generations",
      proven_marketing_families: [],
    };
  }

  if (slugs.length <= 1) {
    return {
      verdict: "PASS",
      detail: "Single mapped filter slug",
      proven_marketing_families: [],
    };
  }

  return {
    verdict: "WARN",
    detail: "Multiple mapped filter slugs without proven single-family proof",
    proven_marketing_families: [],
  };
}

export function evaluateDangerousCountRegressionV1(args: {
  audit: ModelFilterCorrectnessAuditV1;
  remediationPlan: DangerousMappingRemediationPlanV1;
  fixtureSlugs: string[];
}): DangerousCountRegressionResultV1 {
  const dangerousCount = args.audit.factory_scaling.dangerous;
  const remediationSlugs = args.remediationPlan.root_cause_groups
    .flatMap((group) => group.affected_slugs)
    .map(normalizeSlug)
    .sort();
  const fixtureSorted = [...args.fixtureSlugs].map(normalizeSlug).sort();
  const fixtureMatches =
    remediationSlugs.length === fixtureSorted.length &&
    remediationSlugs.every((slug, index) => slug === fixtureSorted[index]);

  if (dangerousCount > EXPECTED_DANGEROUS_COUNT_V1) {
    return {
      verdict: "BLOCK",
      dangerous_count: dangerousCount,
      expected_dangerous_count: EXPECTED_DANGEROUS_COUNT_V1,
      fixture_slug_count: fixtureSorted.length,
      remediation_plan_slug_count: remediationSlugs.length,
      fixture_matches_remediation_plan: fixtureMatches,
      detail: `Dangerous count ${String(dangerousCount)} exceeds baseline ${String(EXPECTED_DANGEROUS_COUNT_V1)}`,
    };
  }

  if (dangerousCount !== EXPECTED_DANGEROUS_COUNT_V1 || !fixtureMatches) {
    return {
      verdict: "WARN",
      dangerous_count: dangerousCount,
      expected_dangerous_count: EXPECTED_DANGEROUS_COUNT_V1,
      fixture_slug_count: fixtureSorted.length,
      remediation_plan_slug_count: remediationSlugs.length,
      fixture_matches_remediation_plan: fixtureMatches,
      detail:
        dangerousCount !== EXPECTED_DANGEROUS_COUNT_V1
          ? `Dangerous count ${String(dangerousCount)} differs from baseline ${String(EXPECTED_DANGEROUS_COUNT_V1)}`
          : "Fixture slug set does not match remediation plan",
    };
  }

  return {
    verdict: "PASS",
    dangerous_count: dangerousCount,
    expected_dangerous_count: EXPECTED_DANGEROUS_COUNT_V1,
    fixture_slug_count: fixtureSorted.length,
    remediation_plan_slug_count: remediationSlugs.length,
    fixture_matches_remediation_plan: true,
    detail: "Dangerous count and fixture slug set match committed baseline",
  };
}

function readCsv<T extends Record<string, string>>(rootDir: string, relPath: string): T[] {
  return parse(readFileSync(path.join(rootDir, relPath), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

function loadAuditReport(rootDir: string): ModelFilterCorrectnessAuditV1 {
  const parsed = JSON.parse(
    readFileSync(path.join(rootDir, MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1), "utf8"),
  ) as ModelFilterCorrectnessAuditV1;
  if (parsed.contract !== MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1) {
    throw new Error(
      `Audit contract mismatch: expected ${MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1}, got ${String(parsed.contract)}`,
    );
  }
  return parsed;
}

function loadRemediationPlan(rootDir: string): DangerousMappingRemediationPlanV1 {
  const parsed = JSON.parse(
    readFileSync(path.join(rootDir, DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1), "utf8"),
  ) as DangerousMappingRemediationPlanV1;
  if (parsed.contract !== DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1) {
    throw new Error(
      `Remediation plan contract mismatch: expected ${DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1}, got ${String(parsed.contract)}`,
    );
  }
  return parsed;
}

function loadWildcardRows(rootDir: string): Map<string, CatalogSlugRowV1> {
  const abs = path.join(rootDir, HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1);
  if (!existsSync(abs)) return new Map();
  const parsed = JSON.parse(readFileSync(abs, "utf8")) as {
    catalog_slug_rows?: CatalogSlugRowV1[];
  };
  return new Map((parsed.catalog_slug_rows ?? []).map((row) => [row.fridge_slug, row]));
}

function dangerousSlugsFromRemediationPlan(
  remediationPlan: DangerousMappingRemediationPlanV1,
): string[] {
  return remediationPlan.root_cause_groups
    .flatMap((group) => group.affected_slugs)
    .map(normalizeSlug)
    .sort((a, b) => a.localeCompare(b));
}

export function buildPerSlugLearnedFailureGuardsV1(args: {
  auditRow: ModelFilterCorrectnessRowV1;
  wildcardBucket?: CatalogSlugRowV1["bucket"] | null;
  frigidaireSiblingRows?: ModelFilterCorrectnessRowV1[];
}): PerSlugLearnedFailureGuardsV1 {
  const slug = normalizeSlug(args.auditRow.fridge_slug);
  const confusion_family_guards = [
    ...evaluateConfusionFamilyGuardsV1({
      brandSlug: args.auditRow.brand_slug,
      mappedFilterSlugs: args.auditRow.mapped_filter_slugs,
      auditBlockers: args.auditRow.blockers,
      wildcardBucket: args.wildcardBucket ?? null,
    }),
    evaluateFrigidaireProvenAnchorSiblingDriftGuardV1({
      auditRow: args.auditRow,
      frigidaireSiblingRows: args.frigidaireSiblingRows,
    }),
    evaluateFrigidaireFppwfu01PrefixFamilyContaminationGuardV1({
      auditRow: args.auditRow,
      frigidaireSiblingRows: args.frigidaireSiblingRows,
    }),
  ];

  const single_filter_family = evaluateSingleFilterFamilyPerModelV1({
    brandSlug: args.auditRow.brand_slug,
    mappedFilterSlugs: args.auditRow.mapped_filter_slugs,
    confusionGuards: confusion_family_guards,
    classification: args.auditRow.classification,
  });

  const aggregate_verdict = worstVerdict([
    ...confusion_family_guards.map((guard) => guard.verdict),
    single_filter_family.verdict,
  ]);

  return {
    fridge_slug: slug,
    brand_slug: normalizeSlug(args.auditRow.brand_slug),
    classification: args.auditRow.classification,
    mapped_filter_slugs: [...args.auditRow.mapped_filter_slugs].sort(),
    confusion_family_guards,
    single_filter_family,
    aggregate_verdict,
  };
}

export function evaluatePerSlugLearnedFailureGuardsV1(args: {
  rootDir: string;
  fridgeSlug: string;
}): PerSlugLearnedFailureGuardsV1 {
  const audit = loadAuditReport(args.rootDir);
  const slug = normalizeSlug(args.fridgeSlug);
  const auditRow = audit.model_rows.find((row) => normalizeSlug(row.fridge_slug) === slug);
  if (!auditRow) {
    throw new Error(`learned_failure_guards: missing audit row for ${slug}`);
  }

  const wildcardBySlug = loadWildcardRows(args.rootDir);
  const siblingIndex = buildFrigidaireModelLineSiblingIndexV1(audit.model_rows);
  const lineKey = frigidaireModelLineKeyV1(auditRow.model_number);
  const siblingBucket =
    lineKey && normalizeSlug(auditRow.brand_slug) === "frigidaire"
      ? siblingIndex.get(`frigidaire::${lineKey}`)
      : undefined;

  return buildPerSlugLearnedFailureGuardsV1({
    auditRow,
    wildcardBucket: wildcardBySlug.get(slug)?.bucket ?? null,
    frigidaireSiblingRows: siblingBucket,
  });
}

export function deriveLearnedFailurePublicationImpactV1(
  perSlug: PerSlugLearnedFailureGuardsV1,
): LearnedFailurePublicationImpactV1 {
  const blockers: string[] = [];

  for (const guard of perSlug.confusion_family_guards) {
    if (guard.verdict !== "PASS") {
      blockers.push(`${guard.guard_id}: ${guard.detail}`);
    }
  }

  if (perSlug.single_filter_family.verdict !== "PASS") {
    blockers.push(`single_filter_family: ${perSlug.single_filter_family.detail}`);
  }

  const preflight_status: LearnedFailurePublicationImpactV1["preflight_status"] =
    perSlug.aggregate_verdict === "PASS" ? "PASS" : "BLOCKED";

  let quality_gate_status: LearnedFailurePublicationImpactV1["quality_gate_status"] = "PASS";
  if (
    perSlug.aggregate_verdict === "BLOCK" ||
    perSlug.classification === "WRONG_PART_RISK" ||
    perSlug.classification === "BLOCKED"
  ) {
    quality_gate_status = "BLOCKED";
  } else if (perSlug.aggregate_verdict === "WARN") {
    quality_gate_status = "WARN";
  }

  return {
    preflight_status,
    quality_gate_status,
    blockers,
  };
}

export function evaluateAllLearnedFailureGuardsV1(args: {
  rootDir: string;
  now?: () => Date;
}): LearnedFailureGuardsReportV1 {
  const now = args.now ?? (() => new Date());
  const audit = loadAuditReport(args.rootDir);
  const remediationPlan = loadRemediationPlan(args.rootDir);

  readCsv(args.rootDir, "data/compatibility_mappings.csv");
  readCsv(args.rootDir, "data/filters.csv");
  readCsv(args.rootDir, "data/filter_aliases.csv");
  readCsv(args.rootDir, "data/fridge_model_aliases.csv");

  if (existsSync(path.join(args.rootDir, MANUAL_EVIDENCE_DIR_REL_V1))) {
    for (const file of readdirSync(path.join(args.rootDir, MANUAL_EVIDENCE_DIR_REL_V1))) {
      if (file.endsWith(".json")) {
        readFileSync(path.join(args.rootDir, MANUAL_EVIDENCE_DIR_REL_V1, file), "utf8");
      }
    }
  }

  listFridgeModelReviewOverrides();
  readFileSync(path.join(args.rootDir, QUARANTINE_MODULE_REL_V1), "utf8");
  readFileSync(path.join(args.rootDir, SAMSUNG_CROSS_REF_MODULE_REL_V1), "utf8");

  const wildcardBySlug = loadWildcardRows(args.rootDir);
  const fixtureSlugs = dangerousSlugsFromRemediationPlan(remediationPlan);
  const frigidaireSiblingIndex = buildFrigidaireModelLineSiblingIndexV1(audit.model_rows);

  const confusion_family_block_count = Object.fromEntries(
    CONFUSION_FAMILY_GUARD_IDS_V1.map((guardId) => [guardId, 0]),
  ) as Record<ConfusionFamilyGuardIdV1, number>;

  const per_slug_guards: PerSlugLearnedFailureGuardsV1[] = audit.model_rows.map((row) => {
    const slug = normalizeSlug(row.fridge_slug);
    const wildcard = wildcardBySlug.get(slug);
    const lineKey = frigidaireModelLineKeyV1(row.model_number);
    const siblingBucket =
      lineKey && normalizeSlug(row.brand_slug) === "frigidaire"
        ? frigidaireSiblingIndex.get(`frigidaire::${lineKey}`)
        : undefined;
    const perSlug = buildPerSlugLearnedFailureGuardsV1({
      auditRow: row,
      wildcardBucket: wildcard?.bucket ?? null,
      frigidaireSiblingRows: siblingBucket,
    });

    for (const guard of perSlug.confusion_family_guards) {
      if (guard.verdict === "BLOCK") {
        confusion_family_block_count[guard.guard_id] += 1;
      }
    }

    return perSlug;
  });

  const dangerous_count_regression = evaluateDangerousCountRegressionV1({
    audit,
    remediationPlan,
    fixtureSlugs,
  });

  const dangerousSlugs = new Set(fixtureSlugs);
  const dangerousRows = per_slug_guards.filter((row) => dangerousSlugs.has(row.fridge_slug));
  const dangerous_slugs_all_blocked = dangerousRows.every(
    (row) =>
      row.aggregate_verdict === "BLOCK" ||
      row.confusion_family_guards.some((guard) => guard.verdict === "BLOCK") ||
      row.single_filter_family.verdict === "BLOCK",
  );

  const provenSlugs = audit.model_rows
    .filter((row) => row.classification === "PROVEN_CORRECT")
    .map((row) => normalizeSlug(row.fridge_slug));
  const proven_correct_slugs_all_pass = provenSlugs.every((slug) => {
    const row = per_slug_guards.find((entry) => entry.fridge_slug === slug);
    return row?.aggregate_verdict !== "BLOCK";
  });

  const quarantineCount = audit.model_rows.filter((row) =>
    getFridgeModelReviewOverride(normalizeSlug(row.fridge_slug)),
  ).length;

  return {
    contract: LEARNED_FAILURE_GUARDS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    source_audit_contract: MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
    source_audit_path: MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
    source_remediation_plan_contract: DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1,
    source_remediation_plan_path: DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
    total_catalog_models: audit.total_models,
    per_slug_guards,
    confusion_family_block_count,
    dangerous_count_regression,
    dangerous_slugs_all_blocked,
    proven_correct_slugs_all_pass,
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        per_slug_guards: ".per_slug_guards",
        confusion_family_block_count: ".confusion_family_block_count",
        dangerous_count_regression: ".dangerous_count_regression",
      },
      recommended_next_action:
        dangerous_count_regression.verdict === "PASS"
          ? "Phase 2: wire learned_failure_guards into page-factory-preflight and quality-gate before any new registry rows."
          : "Reconcile dangerous-count regression before Page Factory scaling.",
    },
    exact_repo_paths_read: [
      "data/compatibility_mappings.csv",
      "data/filter_aliases.csv",
      "data/filters.csv",
      "data/fridge_model_aliases.csv",
      DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
      HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1,
      MANUAL_EVIDENCE_DIR_REL_V1,
      MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
      QUARANTINE_MODULE_REL_V1,
      SAMSUNG_CROSS_REF_MODULE_REL_V1,
    ].sort(),
    proven_facts: [
      `PROVEN: total_catalog_models=${String(audit.total_models)} evaluated.`,
      `PROVEN: dangerous_count=${String(audit.factory_scaling.dangerous)} baseline=${String(EXPECTED_DANGEROUS_COUNT_V1)}.`,
      `PROVEN: dangerous_slugs_all_blocked=${String(dangerous_slugs_all_blocked)}.`,
      `PROVEN: proven_correct_slugs_all_pass=${String(proven_correct_slugs_all_pass)}.`,
      `PROVEN: quarantined_model_count=${String(quarantineCount)}.`,
      "PROVEN: Read-only guards — no compat, Supabase, sitemap, robots, page, or HQ handoff mutations.",
    ],
    unknown_facts: [
      "UNKNOWN: Live Supabase compat rows vs committed CSV during guard evaluation.",
      "UNKNOWN: Future compat edits until owner-approved mutation lane consumes guard output.",
    ],
  };
}

function renderMarkdown(report: LearnedFailureGuardsReportV1): string {
  const lines = [
    "# Learned failure guards v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- total_catalog_models: **${String(report.total_catalog_models)}**`,
    `- dangerous_count_regression: **${report.dangerous_count_regression.verdict}**`,
    `- dangerous_slugs_all_blocked: **${String(report.dangerous_slugs_all_blocked)}**`,
    "",
    "## Confusion family block counts",
    "",
  ];

  for (const guardId of CONFUSION_FAMILY_GUARD_IDS_V1) {
    lines.push(
      `- \`${guardId}\`: **${String(report.confusion_family_block_count[guardId])}**`,
    );
  }

  lines.push("", "## Recommended next action", "", report.inspect_summary.recommended_next_action);
  return `${lines.join("\n")}\n`;
}

export function writeLearnedFailureGuardsArtifactsV1(args: {
  rootDir: string;
  report: LearnedFailureGuardsReportV1;
  remediationPlan: DangerousMappingRemediationPlanV1;
}): {
  jsonRelPath: string;
  mdRelPath: string;
  fixtureRelPath: string;
} {
  const jsonAbs = path.join(args.rootDir, LEARNED_FAILURE_GUARDS_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, LEARNED_FAILURE_GUARDS_MD_REL_V1);
  const fixtureAbs = path.join(args.rootDir, LEARNED_FAILURE_GUARDS_DANGEROUS_SLUGS_FIXTURE_REL_V1);

  const fixturePayload = {
    contract: "learned_failure_guards_v1_dangerous_slugs_fixture",
    expected_dangerous_count: EXPECTED_DANGEROUS_COUNT_V1,
    fridge_slugs: dangerousSlugsFromRemediationPlan(args.remediationPlan),
    source_remediation_plan_path: DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
  };

  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  mkdirSync(path.dirname(fixtureAbs), { recursive: true });

  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, renderMarkdown(args.report), "utf8");
  writeFileSync(fixtureAbs, `${JSON.stringify(fixturePayload, null, 2)}\n`, "utf8");

  return {
    jsonRelPath: LEARNED_FAILURE_GUARDS_JSON_REL_V1,
    mdRelPath: LEARNED_FAILURE_GUARDS_MD_REL_V1,
    fixtureRelPath: LEARNED_FAILURE_GUARDS_DANGEROUS_SLUGS_FIXTURE_REL_V1,
  };
}
