/**
 * Read-only FAMILY_PRE_RESEARCH_RISK_SCREEN_V1.
 * Screens an evidence-leverage filter family before HyperAgent evidence batch dispatch.
 * Does not mutate compat, evidence, Supabase, sitemap, robots, pages, retailer links, or HQ handoff.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  ANCHOR_INTEGRITY_AUDIT_CONTRACT_V1,
  ANCHOR_INTEGRITY_AUDIT_JSON_REL_V1,
  type AnchorHealthSummaryV1,
  type AnchorIntegrityAuditV1,
} from "./anchor-integrity-audit-v1";
import {
  buildEvidenceLeveragePrioritizationV1,
  EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1,
  EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
  type EvidenceLeverageFamilyRowV1,
  type EvidenceLeveragePrioritizationV1,
  type EvidenceLeverageTargetV1,
} from "./evidence-leverage-prioritization-v1";
import {
  buildFrigidaireModelLineSiblingIndexV1,
  frigidaireModelLineKeyV1,
  LEARNED_FAILURE_GUARDS_CONTRACT_V1,
  LEARNED_FAILURE_GUARDS_JSON_REL_V1,
  type LearnedFailureGuardsReportV1,
  type PerSlugLearnedFailureGuardsV1,
} from "./learned-failure-guards-v1";
import {
  MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
  MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  type ModelFilterCorrectnessAuditV1,
  type ModelFilterCorrectnessRowV1,
} from "./model-filter-correctness-audit-v1";

export const FAMILY_PRE_RESEARCH_RISK_SCREEN_CONTRACT_V1 =
  "family_pre_research_risk_screen_v1" as const;

export const FRIGIDAIRE_WATER_FILTER_FAMILIES_V1 = [
  "ultrawf",
  "eptwfu01",
  "fppwfu01",
  "wf3cb",
  "frig-242086201",
  "wf2cb",
  "wfcb",
] as const;

export const HIGH_MODEL_LINE_CLUSTER_THRESHOLD_V1 = 8;

export const CONTAMINATION_RISK_LEVELS_V1 = ["LOW", "MEDIUM", "HIGH"] as const;
export type ContaminationRiskV1 = (typeof CONTAMINATION_RISK_LEVELS_V1)[number];

export const PRE_RESEARCH_RECOMMENDATIONS_V1 = [
  "SAFE_FOR_HYPERAGENT_EVIDENCE_BATCH",
  "NEEDS_REPO_RECONCILIATION_FIRST",
  "FREEZE_FAMILY",
] as const;
export type PreResearchRecommendationV1 = (typeof PRE_RESEARCH_RECOMMENDATIONS_V1)[number];

export type BrandPrefixClusterV1 = {
  model_line_prefix: string;
  slug_count: number;
  sibling_conflict_filter_families: string[];
};

export type SiblingConflictExampleV1 = {
  fridge_slug: string;
  model_line_prefix: string;
  conflicting_sibling_slug: string;
  conflicting_filter_families: string[];
  sibling_classification: string;
};

export type FamilyPreResearchRiskScreenV1 = {
  contract: typeof FAMILY_PRE_RESEARCH_RISK_SCREEN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  selected_by: "command_center_highest_safe_non_frozen" | "cli_family_key";
  family_key: string;
  target_filter_slug: string;
  current_unlock_score: number;
  currently_proven_count: number;
  currently_unproven_count: number;
  unlock_slugs: string[];
  brand_prefix_clusters: BrandPrefixClusterV1[];
  model_line_cluster_count: number;
  sibling_conflict_count: number;
  sibling_conflict_examples: SiblingConflictExampleV1[];
  learned_failure_block_count: number;
  learned_failure_warn_count: number;
  anchor_health_summary: AnchorHealthSummaryV1 | null;
  contamination_risk: ContaminationRiskV1;
  recommendation: PreResearchRecommendationV1;
  recommended_hyperagent_batch_size: number;
  exact_slug_batch_for_research: string[];
  exact_repo_paths_read: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function readJsonFile<T>(rootDir: string, relPath: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as T;
}

function readCsv(rootDir: string, relPath: string): void {
  readFileSync(path.join(rootDir, relPath), "utf8");
  parse(readFileSync(path.join(rootDir, relPath), "utf8"), {
    columns: true,
    skip_empty_lines: true,
  });
}

function parseTargetFilterSlug(familyKey: string): string {
  const parts = familyKey.split("::");
  if (parts.length !== 3 || parts[0] !== "filter") {
    throw new Error(`Family key must be filter::<brand>::<filter_slug>, got ${familyKey}`);
  }
  return normalizeSlug(parts[2]!);
}

function findFamilyRow(
  leverage: EvidenceLeveragePrioritizationV1,
  familyKey: string,
): EvidenceLeverageFamilyRowV1 {
  const row =
    leverage.filter_families.find((family) => family.family_key === familyKey) ??
    leverage.model_families.find((family) => family.family_key === familyKey);
  if (!row) {
    throw new Error(`Family not found in evidence leverage prioritization: ${familyKey}`);
  }
  return row;
}

function otherFrigidaireWaterFilterFamiliesOnSibling(
  mappedFilterSlugs: string[],
  targetFilterSlug: string,
): string[] {
  const slugs = mappedFilterSlugs.map(normalizeSlug);
  const target = normalizeSlug(targetFilterSlug);
  return slugs.filter(
    (slug) =>
      slug !== target &&
      FRIGIDAIRE_WATER_FILTER_FAMILIES_V1.includes(
        slug as (typeof FRIGIDAIRE_WATER_FILTER_FAMILIES_V1)[number],
      ),
  );
}

function slugHasSiblingLineConflict(args: {
  auditRow: ModelFilterCorrectnessRowV1;
  targetFilterSlug: string;
  siblingIndex: Map<string, ModelFilterCorrectnessRowV1[]>;
}): SiblingConflictExampleV1 | null {
  const brand = normalizeSlug(args.auditRow.brand_slug);
  const slug = normalizeSlug(args.auditRow.fridge_slug);
  if (brand !== "frigidaire") return null;

  const lineKey = frigidaireModelLineKeyV1(args.auditRow.model_number);
  if (!lineKey) return null;

  const siblings = args.siblingIndex.get(`frigidaire::${lineKey}`) ?? [];
  for (const sibling of siblings) {
    if (normalizeSlug(sibling.fridge_slug) === slug) continue;
    const conflicts = otherFrigidaireWaterFilterFamiliesOnSibling(
      sibling.mapped_filter_slugs,
      args.targetFilterSlug,
    );
    if (conflicts.length === 0) continue;
    return {
      fridge_slug: slug,
      model_line_prefix: lineKey,
      conflicting_sibling_slug: normalizeSlug(sibling.fridge_slug),
      conflicting_filter_families: [...conflicts].sort((a, b) => a.localeCompare(b)),
      sibling_classification: sibling.classification,
    };
  }

  return null;
}

function buildBrandPrefixClusters(args: {
  unlockSlugs: string[];
  auditBySlug: Map<string, ModelFilterCorrectnessRowV1>;
  targetFilterSlug: string;
  siblingIndex: Map<string, ModelFilterCorrectnessRowV1[]>;
}): BrandPrefixClusterV1[] {
  const clusters = new Map<string, { slug_count: number; families: Set<string> }>();

  for (const slug of args.unlockSlugs) {
    const row = args.auditBySlug.get(slug);
    if (!row) continue;
    const lineKey = frigidaireModelLineKeyV1(row.model_number) ?? "UNKNOWN";
    const bucket = clusters.get(lineKey) ?? { slug_count: 0, families: new Set<string>() };
    bucket.slug_count += 1;

    const conflict = slugHasSiblingLineConflict({
      auditRow: row,
      targetFilterSlug: args.targetFilterSlug,
      siblingIndex: args.siblingIndex,
    });
    for (const family of conflict?.conflicting_filter_families ?? []) {
      bucket.families.add(family);
    }
    clusters.set(lineKey, bucket);
  }

  return [...clusters.entries()]
    .map(([model_line_prefix, bucket]) => ({
      model_line_prefix,
      slug_count: bucket.slug_count,
      sibling_conflict_filter_families: [...bucket.families].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.model_line_prefix.localeCompare(b.model_line_prefix));
}

function countLearnedFailureSignals(args: {
  unlockSlugs: string[];
  guardBySlug: Map<string, PerSlugLearnedFailureGuardsV1>;
}): { block_count: number; warn_count: number } {
  let block_count = 0;
  let warn_count = 0;

  for (const slug of args.unlockSlugs) {
    const row = args.guardBySlug.get(slug);
    if (!row) continue;
    if (row.aggregate_verdict === "BLOCK") {
      block_count += 1;
      continue;
    }
    if (
      row.aggregate_verdict === "WARN" ||
      row.confusion_family_guards.some((guard) => guard.verdict === "WARN") ||
      row.single_filter_family.verdict === "WARN"
    ) {
      warn_count += 1;
    }
  }

  return { block_count, warn_count };
}

function buildAnchorHealthSummary(args: {
  family: EvidenceLeverageFamilyRowV1;
  anchorAudit: AnchorIntegrityAuditV1;
}): AnchorHealthSummaryV1 | null {
  if (args.family.proven_anchor_slugs.length === 0) return null;

  const anchorRows = args.anchorAudit.anchor_rows.filter((row) =>
    args.family.proven_anchor_slugs.includes(normalizeSlug(row.anchor_slug)),
  );
  if (anchorRows.length === 0) return null;

  let healthy_count = 0;
  let watchlist_count = 0;
  let disputed_count = 0;
  let sibling_conflict_disputed_count = 0;

  for (const row of anchorRows) {
    if (row.anchor_health === "HEALTHY") healthy_count += 1;
    if (row.anchor_health === "WATCHLIST") watchlist_count += 1;
    if (row.anchor_health === "DISPUTED") disputed_count += 1;
    if (row.checks.sibling_family_conflict_detected && row.anchor_health === "DISPUTED") {
      sibling_conflict_disputed_count += 1;
    }
  }

  return {
    healthy_count,
    watchlist_count,
    disputed_count,
    sibling_conflict_disputed_count,
    total_anchor_count: anchorRows.length,
  };
}

function deriveContaminationRisk(args: {
  family: EvidenceLeverageFamilyRowV1;
  sibling_conflict_count: number;
  learned_failure_block_count: number;
  model_line_cluster_count: number;
  frozen: boolean;
  anchorSiblingConflict: boolean;
}): ContaminationRiskV1 {
  if (
    args.frozen ||
    args.anchorSiblingConflict ||
    args.learned_failure_block_count > 0 ||
    (args.family.currently_proven_count === 0 && args.sibling_conflict_count > 0)
  ) {
    return "HIGH";
  }

  if (
    args.family.currently_proven_count === 0 &&
    args.model_line_cluster_count >= HIGH_MODEL_LINE_CLUSTER_THRESHOLD_V1
  ) {
    return "MEDIUM";
  }

  if (args.sibling_conflict_count === 0 && args.learned_failure_block_count === 0) {
    return "LOW";
  }

  return "MEDIUM";
}

function deriveRecommendation(args: {
  contamination_risk: ContaminationRiskV1;
  frozen: boolean;
  learned_failure_block_count: number;
  sibling_conflict_count: number;
}): PreResearchRecommendationV1 {
  if (args.frozen) return "FREEZE_FAMILY";
  if (args.contamination_risk === "HIGH") return "NEEDS_REPO_RECONCILIATION_FIRST";
  if (args.contamination_risk === "MEDIUM") return "NEEDS_REPO_RECONCILIATION_FIRST";
  if (args.learned_failure_block_count > 0 || args.sibling_conflict_count > 0) {
    return "NEEDS_REPO_RECONCILIATION_FIRST";
  }
  return "SAFE_FOR_HYPERAGENT_EVIDENCE_BATCH";
}

function buildResearchBatch(args: {
  recommendation: PreResearchRecommendationV1;
  unlockSlugs: string[];
  conflictFreeSlugs: string[];
  currently_unproven_count: number;
}): { batch_size: number; batch_slugs: string[] } {
  if (args.recommendation === "FREEZE_FAMILY") {
    return { batch_size: 0, batch_slugs: [] };
  }

  const pool =
    args.recommendation === "SAFE_FOR_HYPERAGENT_EVIDENCE_BATCH"
      ? args.unlockSlugs
      : args.conflictFreeSlugs;

  const maxBatch =
    args.recommendation === "SAFE_FOR_HYPERAGENT_EVIDENCE_BATCH"
      ? Math.min(10, args.currently_unproven_count)
      : Math.min(5, args.conflictFreeSlugs.length);

  const batch_slugs = [...pool].sort((a, b) => a.localeCompare(b)).slice(0, maxBatch);
  return { batch_size: batch_slugs.length, batch_slugs };
}

function isLeverageTargetSafeBeforePreResearchScreen(
  target: EvidenceLeverageTargetV1,
): boolean {
  if (target.wrong_part_risk_count > 0 || target.blocked_count > 0) return false;
  if (target.currently_proven_count === 0 && (target.prefix_contamination_count ?? 0) > 0) {
    return false;
  }
  return true;
}

export function isFamilyFrozenByControlGraphV1(args: {
  familyKey: string;
  anchorAudit: AnchorIntegrityAuditV1;
  leverage: EvidenceLeveragePrioritizationV1;
}): boolean {
  if (
    args.anchorAudit.families_with_disputed_or_watchlist_primary_anchor.includes(args.familyKey)
  ) {
    return true;
  }

  const family =
    args.leverage.filter_families.find((row) => row.family_key === args.familyKey) ??
    args.leverage.model_families.find((row) => row.family_key === args.familyKey);
  if (!family) return false;

  return (
    family.family_kind === "filter" &&
    family.currently_proven_count === 0 &&
    (family.prefix_contamination_count ?? 0) > 0
  );
}

export function resolveDefaultFamilyKey(args: { rootDir: string; now?: () => Date }): string {
  const leverage = buildEvidenceLeveragePrioritizationV1(args);
  const anchorAudit = readJsonFile<AnchorIntegrityAuditV1>(
    args.rootDir,
    ANCHOR_INTEGRITY_AUDIT_JSON_REL_V1,
  );
  if (anchorAudit.contract !== ANCHOR_INTEGRITY_AUDIT_CONTRACT_V1) {
    throw new Error("Anchor integrity audit contract mismatch");
  }

  for (const target of leverage.top_50_highest_leverage_evidence_targets) {
    if (
      isFamilyFrozenByControlGraphV1({
        familyKey: target.family_key,
        anchorAudit,
        leverage,
      })
    ) {
      continue;
    }
    if (!isLeverageTargetSafeBeforePreResearchScreen(target)) continue;
    return target.family_key;
  }

  throw new Error("No highest safe non-frozen family key found in evidence leverage prioritization");
}

export function buildFamilyPreResearchRiskScreenV1(args: {
  rootDir: string;
  familyKey?: string;
  now?: () => Date;
}): FamilyPreResearchRiskScreenV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  const leverage = readJsonFile<EvidenceLeveragePrioritizationV1>(
    args.rootDir,
    EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
  );
  const modelAudit = readJsonFile<ModelFilterCorrectnessAuditV1>(
    args.rootDir,
    MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  );
  const learnedGuards = readJsonFile<LearnedFailureGuardsReportV1>(
    args.rootDir,
    LEARNED_FAILURE_GUARDS_JSON_REL_V1,
  );
  const anchorAudit = readJsonFile<AnchorIntegrityAuditV1>(
    args.rootDir,
    ANCHOR_INTEGRITY_AUDIT_JSON_REL_V1,
  );

  if (leverage.contract !== EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1) {
    throw new Error("Evidence leverage prioritization contract mismatch");
  }
  if (modelAudit.contract !== MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1) {
    throw new Error("Model filter correctness audit contract mismatch");
  }
  if (learnedGuards.contract !== LEARNED_FAILURE_GUARDS_CONTRACT_V1) {
    throw new Error("Learned failure guards contract mismatch");
  }
  if (anchorAudit.contract !== ANCHOR_INTEGRITY_AUDIT_CONTRACT_V1) {
    throw new Error("Anchor integrity audit contract mismatch");
  }

  readCsv(args.rootDir, "data/compatibility_mappings.csv");
  readCsv(args.rootDir, "data/filters.csv");

  const selected_by = args.familyKey ? "cli_family_key" : "command_center_highest_safe_non_frozen";
  const family_key = args.familyKey ?? resolveDefaultFamilyKey(args);
  const family = findFamilyRow(leverage, family_key);
  const target_filter_slug = parseTargetFilterSlug(family_key);
  const unlock_slugs = [...family.unlock_slugs].sort((a, b) => a.localeCompare(b));

  const auditBySlug = new Map(
    modelAudit.model_rows.map((row) => [normalizeSlug(row.fridge_slug), row] as const),
  );
  const guardBySlug = new Map(
    learnedGuards.per_slug_guards.map((row) => [normalizeSlug(row.fridge_slug), row] as const),
  );
  const siblingIndex = buildFrigidaireModelLineSiblingIndexV1(modelAudit.model_rows);

  const sibling_conflict_examples: SiblingConflictExampleV1[] = [];
  const conflictedSlugs = new Set<string>();
  for (const slug of unlock_slugs) {
    const row = auditBySlug.get(slug);
    if (!row) continue;
    const conflict = slugHasSiblingLineConflict({
      auditRow: row,
      targetFilterSlug: target_filter_slug,
      siblingIndex,
    });
    if (!conflict) continue;
    conflictedSlugs.add(slug);
    if (sibling_conflict_examples.length < 10) {
      sibling_conflict_examples.push(conflict);
    }
  }

  const brand_prefix_clusters = buildBrandPrefixClusters({
    unlockSlugs: unlock_slugs,
    auditBySlug,
    targetFilterSlug: target_filter_slug,
    siblingIndex,
  });
  const model_line_cluster_count = brand_prefix_clusters.filter(
    (cluster) => cluster.model_line_prefix !== "UNKNOWN",
  ).length;

  const { block_count: learned_failure_block_count, warn_count: learned_failure_warn_count } =
    countLearnedFailureSignals({ unlockSlugs: unlock_slugs, guardBySlug });

  const anchor_health_summary = buildAnchorHealthSummary({
    family,
    anchorAudit,
  });

  const frozen = isFamilyFrozenByControlGraphV1({
    familyKey: family_key,
    anchorAudit,
    leverage,
  });
  const anchorSiblingConflict = anchorAudit.anchor_rows.some(
    (row) =>
      row.anchor_family === family_key && row.checks.sibling_family_conflict_detected,
  );

  const contamination_risk = deriveContaminationRisk({
    family,
    sibling_conflict_count: conflictedSlugs.size,
    learned_failure_block_count,
    model_line_cluster_count,
    frozen,
    anchorSiblingConflict,
  });

  const recommendation = deriveRecommendation({
    contamination_risk,
    frozen,
    learned_failure_block_count,
    sibling_conflict_count: conflictedSlugs.size,
  });

  const conflictFreeSlugs = unlock_slugs.filter((slug) => !conflictedSlugs.has(slug));
  const { batch_size: recommended_hyperagent_batch_size, batch_slugs: exact_slug_batch_for_research } =
    buildResearchBatch({
      recommendation,
      unlockSlugs: unlock_slugs,
      conflictFreeSlugs,
      currently_unproven_count: family.currently_unproven_count,
    });

  const proven_facts = [
    `PROVEN: family_key=${family_key} unlock_slugs=${String(unlock_slugs.length)} currently_proven_count=${String(family.currently_proven_count)} currently_unproven_count=${String(family.currently_unproven_count)}.`,
    `PROVEN: current_unlock_score=${String(family.estimated_factory_unlock_score)} from ${EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1}.`,
    `PROVEN: sibling_conflict_count=${String(conflictedSlugs.size)} learned_failure_block_count=${String(learned_failure_block_count)} learned_failure_warn_count=${String(learned_failure_warn_count)}.`,
    `PROVEN: model_line_cluster_count=${String(model_line_cluster_count)} brand_prefix_clusters=${String(brand_prefix_clusters.length)}.`,
    `PROVEN: contamination_risk=${contamination_risk} recommendation=${recommendation}.`,
    "PROVEN: Read-only pre-research risk screen — no compat, evidence, Supabase, sitemap, robots, page, retailer, or HQ handoff mutations.",
  ];

  const inferred_facts = [
    frozen
      ? `INFERRED: ${family_key} is frozen by anchor integrity or prefix-contamination control graph — HyperAgent evidence scaling should not proceed.`
      : `INFERRED: ${family_key} is not frozen by anchor integrity or prefix-contamination control graph.`,
    conflictedSlugs.size > 0
      ? `INFERRED: ${String(conflictedSlugs.size)} unlock slugs share Frigidaire model-line siblings mapped to other water-filter families (${FRIGIDAIRE_WATER_FILTER_FAMILIES_V1.join(", ")}).`
      : "INFERRED: No Frigidaire model-line sibling cross-family conflicts detected in unlock cohort.",
    recommendation === "SAFE_FOR_HYPERAGENT_EVIDENCE_BATCH"
      ? `INFERRED: ${String(recommended_hyperagent_batch_size)}-slug HyperAgent batch is the highest-confidence starting slice.`
      : "INFERRED: Full-family HyperAgent dispatch would inherit prefix/sibling heterogeneity — reconcile repo signals first.",
  ];

  const unknown_facts = [
    "UNKNOWN: Live manufacturer support pages and unpublished owner browser proof may differ from committed audit JSON.",
    "UNKNOWN: HyperAgent may surface additional cross-family conflicts not yet encoded in repo learned-failure guards.",
  ];

  return {
    contract: FAMILY_PRE_RESEARCH_RISK_SCREEN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: generatedAt,
    selected_by,
    family_key,
    target_filter_slug,
    current_unlock_score: family.estimated_factory_unlock_score,
    currently_proven_count: family.currently_proven_count,
    currently_unproven_count: family.currently_unproven_count,
    unlock_slugs,
    brand_prefix_clusters,
    model_line_cluster_count,
    sibling_conflict_count: conflictedSlugs.size,
    sibling_conflict_examples,
    learned_failure_block_count,
    learned_failure_warn_count,
    anchor_health_summary,
    contamination_risk,
    recommendation,
    recommended_hyperagent_batch_size,
    exact_slug_batch_for_research,
    exact_repo_paths_read: [
      EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
      MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
      LEARNED_FAILURE_GUARDS_JSON_REL_V1,
      ANCHOR_INTEGRITY_AUDIT_JSON_REL_V1,
      "data/compatibility_mappings.csv",
      "data/filters.csv",
    ].sort(),
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}

export function familyPreResearchRiskScreenExitCodeV1(
  report: FamilyPreResearchRiskScreenV1,
): number {
  if (report.recommendation === "FREEZE_FAMILY") return 1;
  if (report.recommendation === "NEEDS_REPO_RECONCILIATION_FIRST") return 1;
  return 0;
}
