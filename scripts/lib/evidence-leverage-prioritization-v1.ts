/**
 * Read-only evidence leverage prioritization v1.
 * Ranks missing evidence work by how many safe fridge pages it would unlock.
 * Does not mutate compat, pages, Supabase, sitemap, robots, or registry data.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  validateRefrigeratorManualEvidencePublicReady,
  type RefrigeratorManualEvidenceRecord,
} from "@/lib/manuals/refrigerator-manual-evidence";

import {
  MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
  MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  type ModelFilterCorrectnessAuditV1,
  type ModelFilterCorrectnessRowV1,
} from "./model-filter-correctness-audit-v1";
import {
  buildFrigidaireModelLineSiblingIndexV1,
  evaluateFrigidaireFppwfu01PrefixFamilyContaminationGuardV1,
  frigidaireModelLineKeyV1,
} from "./learned-failure-guards-v1";
import {
  PROVEN_COHORT_PAGE_FACTORY_MANIFEST_CONTRACT_V1,
  PROVEN_COHORT_PAGE_FACTORY_MANIFEST_JSON_REL_V1,
  type ProvenCohortPageFactoryManifestV1,
} from "./proven-cohort-page-factory-manifest-v1";

export const EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1 =
  "evidence_leverage_prioritization_v1" as const;

export const EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1 =
  "data/fridge/batch-production/audits/evidence-leverage-prioritization-v1.json" as const;

export const EVIDENCE_LEVERAGE_PRIORITIZATION_MD_REL_V1 =
  "data/fridge/batch-production/drafts/evidence-leverage-prioritization-v1.md" as const;

export const EVIDENCE_LEVERAGE_PRIORITIZATION_ALLOWED_WRITE_REL_PATHS_V1 = [
  EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
  EVIDENCE_LEVERAGE_PRIORITIZATION_MD_REL_V1,
] as const;

export const EVIDENCE_GAP_TYPES_V1 = [
  "OFFICIAL_FILTER_TOKEN_PROOF_MISSING",
  "MANUAL_EVIDENCE_PUBLIC_READY_TIER1",
  "EVIDENCE_CLONE_FROM_FAMILY_ANCHOR",
  "WRONG_PART_RISK_RECONCILE",
  "BLOCKED_QUARANTINE",
  "ALREADY_FACTORY_ELIGIBLE",
] as const;

export type EvidenceGapTypeV1 = (typeof EVIDENCE_GAP_TYPES_V1)[number];

export type FamilyKindV1 = "filter" | "model";

export type EvidenceLeverageFamilyRowV1 = {
  family_kind: FamilyKindV1;
  family_key: string;
  models_unlocked_if_completed: number;
  currently_proven_count: number;
  currently_unproven_count: number;
  wrong_part_risk_count: number;
  blocked_count: number;
  evidence_gap_type: EvidenceGapTypeV1;
  estimated_factory_unlock_score: number;
  proven_anchor_slugs: string[];
  representative_slugs: string[];
  unlock_slugs: string[];
  prefix_contamination_count: number;
  prefix_contamination_slug_examples: string[];
  zero_proven_anchor_penalty_applied: boolean;
};

export type EvidenceLeverageTargetV1 = EvidenceLeverageFamilyRowV1 & {
  rank: number;
  target_key: string;
  recommended_action: string;
};

export type CumulativeUnlockPointV1 = {
  top_n: number;
  cumulative_unique_models_unlocked: number;
};

export type EvidenceLeveragePrioritizationV1 = {
  contract: typeof EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  source_audit_contract: typeof MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1;
  source_audit_path: string;
  source_proven_cohort_contract: typeof PROVEN_COHORT_PAGE_FACTORY_MANIFEST_CONTRACT_V1;
  source_proven_cohort_path: string;
  total_catalog_models: number;
  total_unlockable_model_count: number;
  filter_families: EvidenceLeverageFamilyRowV1[];
  model_families: EvidenceLeverageFamilyRowV1[];
  top_50_highest_leverage_evidence_targets: EvidenceLeverageTargetV1[];
  top_20_filters_by_page_unlock_potential: EvidenceLeverageFamilyRowV1[];
  top_20_model_families_by_page_unlock_potential: EvidenceLeverageFamilyRowV1[];
  cumulative_unlock_curve: CumulativeUnlockPointV1[];
  inspect_summary: {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary";
      top_50_highest_leverage_evidence_targets: ".top_50_highest_leverage_evidence_targets";
      cumulative_unlock_curve: ".cumulative_unlock_curve";
    };
    recommended_next_action: string;
  };
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

type FridgeModelRow = { brand_slug: string; slug: string; model_number?: string };
type MappingRow = { fridge_slug: string; filter_slug: string };

type MutableFamilyAccumulator = {
  family_kind: FamilyKindV1;
  family_key: string;
  unlock_slugs: Set<string>;
  proven_slugs: Set<string>;
  unproven_slugs: Set<string>;
  wrong_part_slugs: Set<string>;
  blocked_slugs: Set<string>;
  tier1_blocked_slugs: Set<string>;
  eligible_proven_slugs: Set<string>;
};

const MANUAL_EVIDENCE_DIR_REL_V1 = "data/manual-evidence/refrigerator";

const WRONG_PART_PENALTY_V1 = 30;
const UNLOCK_WEIGHT_V1 = 100;
const PROVEN_ANCHOR_BONUS_V1 = 5;
const ZERO_PROVEN_PREFIX_CONTAMINATION_BASE_PENALTY_V1 = 500;
const ZERO_PROVEN_PREFIX_CONTAMINATION_PER_SLUG_PENALTY_V1 = 80;

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function readCsv<T extends Record<string, string>>(rootDir: string, relPath: string): T[] {
  return parse(readFileSync(path.join(rootDir, relPath), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

function modelFamilyPrefix(modelNumber: string): string {
  const upper = modelNumber.trim().toUpperCase();
  const alphaNumeric = upper.match(/^([A-Z]{2,4}\d{2,3})/);
  if (alphaNumeric?.[1]) return alphaNumeric[1];
  const alphaOnly = upper.match(/^([A-Z]{3,5})/);
  return alphaOnly?.[1] ?? upper.slice(0, 5);
}

function filterFamilyKey(brandSlug: string, primaryFilterSlug: string): string {
  return `filter::${brandSlug}::${primaryFilterSlug}`;
}

function modelFamilyKey(brandSlug: string, modelNumber: string): string {
  return `model::${brandSlug}::${modelFamilyPrefix(modelNumber)}`;
}

function primaryMappedFilterSlug(mappedFilterSlugs: string[]): string {
  const sorted = [...mappedFilterSlugs].sort();
  return sorted[0] ?? "none";
}

function loadAuditReport(rootDir: string): ModelFilterCorrectnessAuditV1 {
  const abs = path.join(rootDir, MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1);
  const parsed = JSON.parse(readFileSync(abs, "utf8")) as ModelFilterCorrectnessAuditV1;
  if (parsed.contract !== MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1) {
    throw new Error(
      `Audit contract mismatch: expected ${MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1}, got ${String(parsed.contract)}`,
    );
  }
  return parsed;
}

function loadProvenCohortManifest(rootDir: string): ProvenCohortPageFactoryManifestV1 {
  const abs = path.join(rootDir, PROVEN_COHORT_PAGE_FACTORY_MANIFEST_JSON_REL_V1);
  const parsed = JSON.parse(readFileSync(abs, "utf8")) as ProvenCohortPageFactoryManifestV1;
  if (parsed.contract !== PROVEN_COHORT_PAGE_FACTORY_MANIFEST_CONTRACT_V1) {
    throw new Error(
      `Proven cohort contract mismatch: expected ${PROVEN_COHORT_PAGE_FACTORY_MANIFEST_CONTRACT_V1}, got ${String(parsed.contract)}`,
    );
  }
  return parsed;
}

function loadManualEvidenceSlugs(rootDir: string): Set<string> {
  const dir = path.join(rootDir, MANUAL_EVIDENCE_DIR_REL_V1);
  const out = new Set<string>();
  if (!existsSync(dir)) return out;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    out.add(normalizeSlug(file.replace(/\.json$/, "")));
  }
  return out;
}

function isTier1PublicReadyBlocker(blockers: string[]): boolean {
  return blockers.some((blocker) => blocker.startsWith("manual_evidence:"));
}

function isUnlockableProvenCohortRow(row: {
  fridge_slug: string;
  eligible_for_owner_review: boolean;
  blockers: string[];
}): boolean {
  return !row.eligible_for_owner_review && isTier1PublicReadyBlocker(row.blockers);
}

function createFamilyAccumulator(
  familyKind: FamilyKindV1,
  familyKey: string,
): MutableFamilyAccumulator {
  return {
    family_kind: familyKind,
    family_key: familyKey,
    unlock_slugs: new Set<string>(),
    proven_slugs: new Set<string>(),
    unproven_slugs: new Set<string>(),
    wrong_part_slugs: new Set<string>(),
    blocked_slugs: new Set<string>(),
    tier1_blocked_slugs: new Set<string>(),
    eligible_proven_slugs: new Set<string>(),
  };
}

function addModelToFamily(
  family: MutableFamilyAccumulator,
  row: ModelFilterCorrectnessRowV1,
  provenCohortBySlug: Map<string, ProvenCohortPageFactoryManifestV1["cohort_rows"][number]>,
): void {
  const slug = normalizeSlug(row.fridge_slug);

  if (row.classification === "PROVEN_CORRECT") {
    family.proven_slugs.add(slug);
    const cohortRow = provenCohortBySlug.get(slug);
    if (cohortRow?.eligible_for_owner_review) {
      family.eligible_proven_slugs.add(slug);
      return;
    }
    if (cohortRow && isUnlockableProvenCohortRow(cohortRow)) {
      family.tier1_blocked_slugs.add(slug);
      family.unlock_slugs.add(slug);
      return;
    }
    if (!cohortRow) {
      family.unlock_slugs.add(slug);
    }
    return;
  }

  if (row.classification === "LIKELY_CORRECT_NEEDS_EVIDENCE") {
    family.unproven_slugs.add(slug);
    family.unlock_slugs.add(slug);
    return;
  }

  if (row.classification === "WRONG_PART_RISK") {
    family.wrong_part_slugs.add(slug);
    return;
  }

  if (row.classification === "BLOCKED") {
    family.blocked_slugs.add(slug);
  }
}

function deriveEvidenceGapType(family: MutableFamilyAccumulator): EvidenceGapTypeV1 {
  if (family.blocked_slugs.size > 0 && family.unlock_slugs.size === 0) {
    return "BLOCKED_QUARANTINE";
  }

  if (
    family.wrong_part_slugs.size > 0 &&
    family.wrong_part_slugs.size >= family.unlock_slugs.size
  ) {
    return "WRONG_PART_RISK_RECONCILE";
  }

  if (family.tier1_blocked_slugs.size > 0 && family.unproven_slugs.size === 0) {
    return "MANUAL_EVIDENCE_PUBLIC_READY_TIER1";
  }

  if (family.proven_slugs.size > 0 && family.unproven_slugs.size > 0) {
    return "EVIDENCE_CLONE_FROM_FAMILY_ANCHOR";
  }

  if (family.tier1_blocked_slugs.size > 0) {
    return "MANUAL_EVIDENCE_PUBLIC_READY_TIER1";
  }

  if (family.unlock_slugs.size === 0 && family.eligible_proven_slugs.size > 0) {
    return "ALREADY_FACTORY_ELIGIBLE";
  }

  return "OFFICIAL_FILTER_TOKEN_PROOF_MISSING";
}

function estimateFactoryUnlockScore(args: {
  family: MutableFamilyAccumulator;
  prefix_contamination_count: number;
}): { score: number; zero_proven_anchor_penalty_applied: boolean } {
  let score =
    args.family.unlock_slugs.size * UNLOCK_WEIGHT_V1 +
    args.family.proven_slugs.size * PROVEN_ANCHOR_BONUS_V1 -
    args.family.wrong_part_slugs.size * WRONG_PART_PENALTY_V1 -
    args.family.blocked_slugs.size * WRONG_PART_PENALTY_V1 * 2;

  let zero_proven_anchor_penalty_applied = false;
  if (args.family.proven_slugs.size === 0 && args.prefix_contamination_count > 0) {
    score -=
      ZERO_PROVEN_PREFIX_CONTAMINATION_BASE_PENALTY_V1 +
      args.prefix_contamination_count * ZERO_PROVEN_PREFIX_CONTAMINATION_PER_SLUG_PENALTY_V1;
    zero_proven_anchor_penalty_applied = true;
  }

  return { score: Math.max(0, score), zero_proven_anchor_penalty_applied };
}

function prefixContaminationForFamily(args: {
  family: MutableFamilyAccumulator;
  auditBySlug: Map<string, ModelFilterCorrectnessRowV1>;
  siblingIndex: Map<string, ModelFilterCorrectnessRowV1[]>;
}): { prefix_contamination_count: number; prefix_contamination_slug_examples: string[] } {
  const contaminated: string[] = [];

  for (const slug of args.family.unlock_slugs) {
    const row = args.auditBySlug.get(slug);
    if (!row) continue;
    const lineKey = frigidaireModelLineKeyV1(row.model_number);
    const siblingBucket =
      lineKey && normalizeSlug(row.brand_slug) === "frigidaire"
        ? args.siblingIndex.get(`frigidaire::${lineKey}`)
        : undefined;
    const guard = evaluateFrigidaireFppwfu01PrefixFamilyContaminationGuardV1({
      auditRow: row,
      frigidaireSiblingRows: siblingBucket,
    });
    if (guard.verdict === "WARN" || guard.verdict === "BLOCK") {
      contaminated.push(slug);
    }
  }

  const prefix_contamination_slug_examples = [...contaminated].sort((a, b) =>
    a.localeCompare(b),
  ).slice(0, 5);

  return {
    prefix_contamination_count: contaminated.length,
    prefix_contamination_slug_examples,
  };
}

function finalizeFamilyRow(
  family: MutableFamilyAccumulator,
  args: {
    auditBySlug: Map<string, ModelFilterCorrectnessRowV1>;
    siblingIndex: Map<string, ModelFilterCorrectnessRowV1[]>;
  },
): EvidenceLeverageFamilyRowV1 {
  const unlock_slugs = [...family.unlock_slugs].sort((a, b) => a.localeCompare(b));
  const proven_anchor_slugs = [...family.proven_slugs].sort((a, b) => a.localeCompare(b));
  const representative_slugs = unlock_slugs.slice(0, 5);
  const { prefix_contamination_count, prefix_contamination_slug_examples } =
    prefixContaminationForFamily({ family, ...args });
  const { score, zero_proven_anchor_penalty_applied } = estimateFactoryUnlockScore({
    family,
    prefix_contamination_count,
  });

  return {
    family_kind: family.family_kind,
    family_key: family.family_key,
    models_unlocked_if_completed: unlock_slugs.length,
    currently_proven_count: family.proven_slugs.size,
    currently_unproven_count: family.unproven_slugs.size,
    wrong_part_risk_count: family.wrong_part_slugs.size,
    blocked_count: family.blocked_slugs.size,
    evidence_gap_type: deriveEvidenceGapType(family),
    estimated_factory_unlock_score: score,
    proven_anchor_slugs,
    representative_slugs,
    unlock_slugs,
    prefix_contamination_count,
    prefix_contamination_slug_examples,
    zero_proven_anchor_penalty_applied,
  };
}

function recommendedActionForFamily(row: EvidenceLeverageFamilyRowV1): string {
  switch (row.evidence_gap_type) {
    case "MANUAL_EVIDENCE_PUBLIC_READY_TIER1":
      return `Add Tier-1 replacement/video sources to manual evidence for ${row.family_key}; ${String(row.models_unlocked_if_completed)} proven-fit models await public-ready validation.`;
    case "EVIDENCE_CLONE_FROM_FAMILY_ANCHOR":
      return `Clone proven manual evidence from ${row.proven_anchor_slugs[0] ?? "family anchor"} across ${String(row.currently_unproven_count)} unproven ${row.family_key} siblings.`;
    case "WRONG_PART_RISK_RECONCILE":
      return `Reconcile compat mapping for ${row.family_key} before evidence investment — ${String(row.wrong_part_risk_count)} models carry wrong-part risk.`;
    case "BLOCKED_QUARANTINE":
      return `Resolve quarantine/blockers for ${row.family_key} before factory scaling.`;
    case "ALREADY_FACTORY_ELIGIBLE":
      return `${row.family_key} has no remaining safe unlock work — cohort already factory-eligible.`;
    default:
      return `Capture official manufacturer filter proof for ${row.family_key} to unlock ${String(row.models_unlocked_if_completed)} LIKELY_CORRECT models.`;
  }
}

function buildFamilyMaps(args: {
  auditRows: ModelFilterCorrectnessRowV1[];
  provenCohortBySlug: Map<string, ProvenCohortPageFactoryManifestV1["cohort_rows"][number]>;
}): {
  filterFamilies: Map<string, MutableFamilyAccumulator>;
  modelFamilies: Map<string, MutableFamilyAccumulator>;
} {
  const filterFamilies = new Map<string, MutableFamilyAccumulator>();
  const modelFamilies = new Map<string, MutableFamilyAccumulator>();

  for (const row of args.auditRows) {
    const brandSlug = normalizeSlug(row.brand_slug);
    const filterKey = filterFamilyKey(brandSlug, primaryMappedFilterSlug(row.mapped_filter_slugs));
    const modelKey = modelFamilyKey(brandSlug, row.model_number);

    const filterFamily =
      filterFamilies.get(filterKey) ?? createFamilyAccumulator("filter", filterKey);
    const modelFamily =
      modelFamilies.get(modelKey) ?? createFamilyAccumulator("model", modelKey);

    addModelToFamily(filterFamily, row, args.provenCohortBySlug);
    addModelToFamily(modelFamily, row, args.provenCohortBySlug);

    filterFamilies.set(filterKey, filterFamily);
    modelFamilies.set(modelKey, modelFamily);
  }

  return { filterFamilies, modelFamilies };
}

function sortFamilies(rows: EvidenceLeverageFamilyRowV1[]): EvidenceLeverageFamilyRowV1[] {
  return [...rows].sort((a, b) => {
    if (b.models_unlocked_if_completed !== a.models_unlocked_if_completed) {
      return b.models_unlocked_if_completed - a.models_unlocked_if_completed;
    }
    if (b.estimated_factory_unlock_score !== a.estimated_factory_unlock_score) {
      return b.estimated_factory_unlock_score - a.estimated_factory_unlock_score;
    }
    return a.family_key.localeCompare(b.family_key);
  });
}

function buildEvidenceTargets(
  families: EvidenceLeverageFamilyRowV1[],
): EvidenceLeverageTargetV1[] {
  const candidates = families.filter((row) => row.models_unlocked_if_completed > 0);
  const sorted = [...candidates].sort((a, b) => {
    if (b.estimated_factory_unlock_score !== a.estimated_factory_unlock_score) {
      return b.estimated_factory_unlock_score - a.estimated_factory_unlock_score;
    }
    if (b.models_unlocked_if_completed !== a.models_unlocked_if_completed) {
      return b.models_unlocked_if_completed - a.models_unlocked_if_completed;
    }
    return a.family_key.localeCompare(b.family_key);
  });

  return sorted.slice(0, 50).map((row, index) => ({
    ...row,
    rank: index + 1,
    target_key: `${row.family_kind}::${row.family_key}::${row.evidence_gap_type}`,
    recommended_action: recommendedActionForFamily(row),
  }));
}

function buildCumulativeUnlockCurve(
  targets: EvidenceLeverageTargetV1[],
): CumulativeUnlockPointV1[] {
  const topNs = [1, 5, 10, 25] as const;
  const seen = new Set<string>();

  return topNs.map((topN) => {
    for (let index = 0; index < Math.min(topN, targets.length); index += 1) {
      for (const slug of targets[index]!.unlock_slugs) {
        seen.add(slug);
      }
    }
    return {
      top_n: topN,
      cumulative_unique_models_unlocked: seen.size,
    };
  });
}

export function buildEvidenceLeveragePrioritizationV1(args: {
  rootDir: string;
  now?: () => Date;
}): EvidenceLeveragePrioritizationV1 {
  const now = args.now ?? (() => new Date());
  const audit = loadAuditReport(args.rootDir);
  const provenCohort = loadProvenCohortManifest(args.rootDir);

  readCsv<FridgeModelRow>(args.rootDir, "data/fridge_models.csv");
  readCsv<MappingRow>(args.rootDir, "data/compatibility_mappings.csv");
  loadManualEvidenceSlugs(args.rootDir);

  const manualEvidenceDir = path.join(args.rootDir, MANUAL_EVIDENCE_DIR_REL_V1);
  if (existsSync(manualEvidenceDir)) {
    for (const file of readdirSync(manualEvidenceDir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const record = JSON.parse(
          readFileSync(path.join(manualEvidenceDir, file), "utf8"),
        ) as Partial<RefrigeratorManualEvidenceRecord>;
        validateRefrigeratorManualEvidencePublicReady(record);
      } catch {
        // read-only validation pass; invalid fixtures are surfaced via proven cohort
      }
    }
  }

  const provenCohortBySlug = new Map(
    provenCohort.cohort_rows.map((row) => [normalizeSlug(row.fridge_slug), row] as const),
  );

  const { filterFamilies, modelFamilies } = buildFamilyMaps({
    auditRows: audit.model_rows,
    provenCohortBySlug,
  });

  const auditBySlug = new Map(
    audit.model_rows.map((row) => [normalizeSlug(row.fridge_slug), row] as const),
  );
  const siblingIndex = buildFrigidaireModelLineSiblingIndexV1(audit.model_rows);
  const finalizeArgs = { auditBySlug, siblingIndex };

  const filter_families = sortFamilies(
    [...filterFamilies.values()].map((family) => finalizeFamilyRow(family, finalizeArgs)),
  );
  const model_families = sortFamilies(
    [...modelFamilies.values()].map((family) => finalizeFamilyRow(family, finalizeArgs)),
  );

  const allFamilies = [...filter_families, ...model_families];
  const top_50_highest_leverage_evidence_targets = buildEvidenceTargets(allFamilies);
  const top_20_filters_by_page_unlock_potential = filter_families.slice(0, 20);
  const top_20_model_families_by_page_unlock_potential = model_families.slice(0, 20);
  const cumulative_unlock_curve = buildCumulativeUnlockCurve(
    top_50_highest_leverage_evidence_targets,
  );

  const total_unlockable_model_count = new Set(
    allFamilies.flatMap((family) => family.unlock_slugs),
  ).size;

  const topTarget = top_50_highest_leverage_evidence_targets[0];

  return {
    contract: EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    source_audit_contract: MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
    source_audit_path: MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
    source_proven_cohort_contract: PROVEN_COHORT_PAGE_FACTORY_MANIFEST_CONTRACT_V1,
    source_proven_cohort_path: PROVEN_COHORT_PAGE_FACTORY_MANIFEST_JSON_REL_V1,
    total_catalog_models: audit.total_models,
    total_unlockable_model_count,
    filter_families,
    model_families,
    top_50_highest_leverage_evidence_targets,
    top_20_filters_by_page_unlock_potential,
    top_20_model_families_by_page_unlock_potential,
    cumulative_unlock_curve,
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        top_50_highest_leverage_evidence_targets: ".top_50_highest_leverage_evidence_targets",
        cumulative_unlock_curve: ".cumulative_unlock_curve",
      },
      recommended_next_action: topTarget
        ? `Prioritize ${topTarget.family_key} (${topTarget.evidence_gap_type}) — estimated ${String(topTarget.models_unlocked_if_completed)} safe page unlocks.`
        : "No unlockable evidence targets remain in committed audit inputs.",
    },
    exact_repo_paths_read: [
      "data/compatibility_mappings.csv",
      "data/fridge_models.csv",
      MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
      MANUAL_EVIDENCE_DIR_REL_V1,
      PROVEN_COHORT_PAGE_FACTORY_MANIFEST_JSON_REL_V1,
    ].sort(),
    proven_facts: [
      `PROVEN: total_catalog_models=${String(audit.total_models)} from ${MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1}.`,
      `PROVEN: total_unlockable_model_count=${String(total_unlockable_model_count)} safe models awaiting evidence completion.`,
      `PROVEN: filter_families=${String(filter_families.length)} model_families=${String(model_families.length)}.`,
      "PROVEN: Read-only prioritization — no compat, page, Supabase, sitemap, robots, or registry mutations.",
    ],
    unknown_facts: [
      "UNKNOWN: Live Supabase or unpublished draft state may differ from committed repo-file audit inputs.",
    ],
  };
}

function renderMarkdown(report: EvidenceLeveragePrioritizationV1): string {
  const lines = [
    "# Evidence leverage prioritization v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- total_catalog_models: **${String(report.total_catalog_models)}**`,
    `- total_unlockable_model_count: **${String(report.total_unlockable_model_count)}**`,
    `- source_audit: **${report.source_audit_path}**`,
    `- source_proven_cohort: **${report.source_proven_cohort_path}**`,
    "",
    "## Top 50 highest leverage evidence targets",
    "",
  ];

  for (const target of report.top_50_highest_leverage_evidence_targets) {
    lines.push(
      `### #${String(target.rank)} ${target.family_key}`,
      "",
      `- family_kind: \`${target.family_kind}\``,
      `- evidence_gap_type: \`${target.evidence_gap_type}\``,
      `- models_unlocked_if_completed: **${String(target.models_unlocked_if_completed)}**`,
      `- estimated_factory_unlock_score: **${String(target.estimated_factory_unlock_score)}**`,
      `- currently_proven_count: **${String(target.currently_proven_count)}**`,
      `- currently_unproven_count: **${String(target.currently_unproven_count)}**`,
      `- wrong_part_risk_count: **${String(target.wrong_part_risk_count)}**`,
      `- recommended_action: ${target.recommended_action}`,
      "",
    );
  }

  lines.push("## Cumulative unlock curve", "");
  for (const point of report.cumulative_unlock_curve) {
    lines.push(
      `- top **${String(point.top_n)}** targets → **${String(point.cumulative_unique_models_unlocked)}** unique models`,
    );
  }

  lines.push("", "## Recommended next action", "", report.inspect_summary.recommended_next_action);
  return `${lines.join("\n")}\n`;
}

export function writeEvidenceLeveragePrioritizationArtifactsV1(args: {
  rootDir: string;
  report: EvidenceLeveragePrioritizationV1;
}): {
  jsonRelPath: string;
  mdRelPath: string;
} {
  const jsonAbs = path.join(args.rootDir, EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, EVIDENCE_LEVERAGE_PRIORITIZATION_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, renderMarkdown(args.report), "utf8");
  return {
    jsonRelPath: EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
    mdRelPath: EVIDENCE_LEVERAGE_PRIORITIZATION_MD_REL_V1,
  };
}
