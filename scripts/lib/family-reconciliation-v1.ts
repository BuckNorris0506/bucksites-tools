/**
 * Read-only FAMILY_RECONCILIATION_V1.
 * Identifies model-line conflicts inside filter families and emits owner-review reconciliation packets.
 * Does not mutate compat, evidence, Supabase, pages, retailer links, or HQ handoff.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  ANCHOR_INTEGRITY_AUDIT_CONTRACT_V1,
  ANCHOR_INTEGRITY_AUDIT_JSON_REL_V1,
  type AnchorIntegrityAuditV1,
} from "./anchor-integrity-audit-v1";
import { CURSOR_VALIDATION_PACKET_CONTRACT_V1 } from "./buckparts-ops-agent-workflow-v1";
import {
  buildFamilyPreResearchRiskScreenV1,
  FRIGIDAIRE_WATER_FILTER_FAMILIES_V1,
  isFamilyFrozenByControlGraphV1,
  type PreResearchRecommendationV1,
} from "./family-pre-research-risk-screen-v1";
import {
  EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1,
  EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
  type EvidenceLeverageFamilyRowV1,
  type EvidenceLeveragePrioritizationV1,
} from "./evidence-leverage-prioritization-v1";
import {
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

export const FAMILY_RECONCILIATION_CONTRACT_V1 = "family_reconciliation_v1" as const;

export const FAMILY_RECONCILIATION_JSON_REL_V1 =
  "data/fridge/batch-production/audits/family-reconciliation-v1.json" as const;

export const FAMILY_RECONCILIATION_MD_REL_V1 =
  "data/fridge/batch-production/drafts/family-reconciliation-v1.md" as const;

export const FAMILY_RECONCILIATION_OWNER_PACKET_DIR_REL_V1 =
  "data/fridge/batch-production/drafts/family-reconciliation-owner-packets-v1" as const;

export const FAMILY_RECONCILIATION_ALLOWED_WRITE_REL_PATHS_V1 = [
  FAMILY_RECONCILIATION_JSON_REL_V1,
  FAMILY_RECONCILIATION_MD_REL_V1,
  `${FAMILY_RECONCILIATION_OWNER_PACKET_DIR_REL_V1}/*.json`,
] as const;

export const RECONCILIATION_SEVERITY_LEVELS_V1 = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "NONE",
] as const;

export type ReconciliationSeverityV1 = (typeof RECONCILIATION_SEVERITY_LEVELS_V1)[number];

export const OWNER_REVIEW_ACTIONS_V1 = [
  "APPLY_ELIGIBLE_WITH_EXISTING_PROOF",
  "NEEDS_OWNER_BROWSER_PROOF",
  "NEEDS_COMPAT_REVIEW",
  "REJECTED",
  "NO_ACTION",
] as const;

export type OwnerReviewActionV1 = (typeof OWNER_REVIEW_ACTIONS_V1)[number];

export type ModelLineConflictRowV1 = {
  fridge_slug: string;
  model_number: string;
  model_line_prefix: string;
  repo_classification: string;
  mapped_filter_slugs: string[];
  conflicting_sibling_slug: string;
  conflicting_filter_slugs: string[];
  sibling_classification: string;
  sibling_proven: boolean;
  learned_failure_aggregate: "PASS" | "WARN" | "BLOCK";
  hyperagent_cursor_row_state: OwnerReviewActionV1 | null;
};

export type FamilyOwnerReviewPacketV1 = {
  contract: "family_reconciliation_owner_review_packet_v1";
  packet_id: string;
  family_key: string;
  target_filter_slug: string;
  severity: ReconciliationSeverityV1;
  title: string;
  summary: string;
  owner_checklist: string[];
  slug_rows: Array<{
    fridge_slug: string;
    model_number: string;
    repo_classification: string;
    mapped_filter_slugs: string[];
    conflict_type: string;
    conflicting_sibling_slug: string | null;
    conflicting_filter_slugs: string[];
    hyperagent_cursor_row_state: OwnerReviewActionV1 | null;
    recommended_owner_action: OwnerReviewActionV1;
  }>;
  signals: {
    anchor_frozen: boolean;
    prefix_contamination_count: number | null;
    pre_research_recommendation: PreResearchRecommendationV1 | null;
    hyperagent_compat_review_count: number;
    learned_failure_block_count: number;
  };
};

export type FamilyReconciliationBacklogItemV1 = {
  rank: number;
  family_key: string;
  target_filter_slug: string;
  severity: ReconciliationSeverityV1;
  reconciliation_score: number;
  model_line_conflict_count: number;
  estimated_factory_unlock_score: number;
  owner_review_packet_id: string;
};

export type FamilyReconciliationFamilyRowV1 = {
  family_key: string;
  target_filter_slug: string;
  severity: ReconciliationSeverityV1;
  model_line_conflict_count: number;
  proven_anchor_slugs: string[];
  unlock_slug_count: number;
  estimated_factory_unlock_score: number;
  owner_review_packet_id: string;
};

export type FamilyReconciliationV1 = {
  contract: typeof FAMILY_RECONCILIATION_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  families_screened: number;
  families_with_conflicts: number;
  severity_counts: Record<ReconciliationSeverityV1, number>;
  hyperagent_validation_packets_loaded: number;
  ranked_reconciliation_backlog: FamilyReconciliationBacklogItemV1[];
  owner_review_packets: FamilyOwnerReviewPacketV1[];
  family_rows: FamilyReconciliationFamilyRowV1[];
  exact_repo_paths_read: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

type HyperAgentSlugHintV1 = {
  family_key: string | null;
  cursor_row_state: OwnerReviewActionV1;
  cursor_verdict: string;
  validation_id: string;
  validation_status: string;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function readJsonFile<T>(rootDir: string, relPath: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as T;
}

function readCsv(rootDir: string, relPath: string): Record<string, string>[] {
  return parse(readFileSync(path.join(rootDir, relPath), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

function modelLinePrefixV1(brandSlug: string, modelNumber: string): string | null {
  const brand = normalizeSlug(brandSlug);
  if (brand === "frigidaire") {
    return frigidaireModelLineKeyV1(modelNumber);
  }
  const upper = modelNumber.trim().toUpperCase();
  const alphaNumeric = upper.match(/^([A-Z]{2,4}\d{2,4})/);
  if (alphaNumeric?.[1]) return alphaNumeric[1];
  const alphaOnly = upper.match(/^([A-Z]{3,5})/);
  return alphaOnly?.[1] ?? null;
}

function buildFilterAliasGroups(rootDir: string): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();
  if (!existsSync(path.join(rootDir, "data/filter_aliases.csv"))) {
    return groups;
  }
  for (const row of readCsv(rootDir, "data/filter_aliases.csv")) {
    const canonical = normalizeSlug(row.filter_slug);
    const alias = normalizeSlug(row.alias);
    if (!canonical || !alias) continue;
    const bucket = groups.get(canonical) ?? new Set<string>([canonical]);
    bucket.add(canonical);
    bucket.add(alias);
    groups.set(canonical, bucket);
  }
  for (const [canonical, members] of Array.from(groups)) {
    for (const member of Array.from(members)) {
      groups.set(member, members);
    }
    groups.set(canonical, members);
  }
  return groups;
}

function filtersEquivalent(
  slugA: string,
  slugB: string,
  aliasGroups: Map<string, Set<string>>,
): boolean {
  const a = normalizeSlug(slugA);
  const b = normalizeSlug(slugB);
  if (a === b) return true;
  const groupA = aliasGroups.get(a);
  return groupA?.has(b) ?? false;
}

function parseTargetFilterSlug(familyKey: string): string {
  const parts = familyKey.split("::");
  if (parts.length !== 3 || parts[0] !== "filter") {
    throw new Error(`Expected filter::<brand>::<slug>, got ${familyKey}`);
  }
  return normalizeSlug(parts[2]!);
}

function buildModelLineSiblingIndex(
  auditRows: ModelFilterCorrectnessRowV1[],
): Map<string, ModelFilterCorrectnessRowV1[]> {
  const index = new Map<string, ModelFilterCorrectnessRowV1[]>();
  for (const row of auditRows) {
    const lineKey = modelLinePrefixV1(row.brand_slug, row.model_number);
    if (!lineKey) continue;
    const bucketKey = `${normalizeSlug(row.brand_slug)}::${lineKey}`;
    const bucket = index.get(bucketKey) ?? [];
    bucket.push(row);
    index.set(bucketKey, bucket);
  }
  return index;
}

function conflictingFiltersForSibling(args: {
  sibling: ModelFilterCorrectnessRowV1;
  targetFilterSlug: string;
  brandSlug: string;
  aliasGroups: Map<string, Set<string>>;
}): string[] {
  const brand = normalizeSlug(args.brandSlug);
  const target = normalizeSlug(args.targetFilterSlug);
  const mapped = args.sibling.mapped_filter_slugs.map(normalizeSlug);

  if (brand === "frigidaire") {
    if (mapped.includes(target)) {
      return mapped.filter(
        (slug) =>
          slug !== target &&
          FRIGIDAIRE_WATER_FILTER_FAMILIES_V1.includes(
            slug as (typeof FRIGIDAIRE_WATER_FILTER_FAMILIES_V1)[number],
          ),
      );
    }
    return mapped.filter((slug) =>
      FRIGIDAIRE_WATER_FILTER_FAMILIES_V1.includes(
        slug as (typeof FRIGIDAIRE_WATER_FILTER_FAMILIES_V1)[number],
      ),
    );
  }

  return mapped.filter((slug) => !filtersEquivalent(slug, target, args.aliasGroups));
}

function detectModelLineConflicts(args: {
  family: EvidenceLeverageFamilyRowV1;
  auditBySlug: Map<string, ModelFilterCorrectnessRowV1>;
  guardBySlug: Map<string, PerSlugLearnedFailureGuardsV1>;
  siblingIndex: Map<string, ModelFilterCorrectnessRowV1[]>;
  aliasGroups: Map<string, Set<string>>;
  hyperagentBySlug: Map<string, HyperAgentSlugHintV1>;
}): ModelLineConflictRowV1[] {
  const targetFilterSlug = parseTargetFilterSlug(args.family.family_key);
  const brandSlug = args.family.family_key.split("::")[1] ?? "";
  const conflicts: ModelLineConflictRowV1[] = [];

  for (const slug of args.family.unlock_slugs) {
    const row = args.auditBySlug.get(normalizeSlug(slug));
    if (!row) continue;
    const lineKey = modelLinePrefixV1(row.brand_slug, row.model_number);
    if (!lineKey) continue;
    const siblings = args.siblingIndex.get(`${normalizeSlug(row.brand_slug)}::${lineKey}`) ?? [];

    for (const sibling of siblings) {
      if (normalizeSlug(sibling.fridge_slug) === normalizeSlug(slug)) continue;
      const conflicting = conflictingFiltersForSibling({
        sibling,
        targetFilterSlug,
        brandSlug,
        aliasGroups: args.aliasGroups,
      });
      if (conflicting.length === 0) continue;

      const guard = args.guardBySlug.get(normalizeSlug(slug));
      const hyperagent = args.hyperagentBySlug.get(normalizeSlug(slug));
      conflicts.push({
        fridge_slug: normalizeSlug(slug),
        model_number: row.model_number,
        model_line_prefix: lineKey,
        repo_classification: row.classification,
        mapped_filter_slugs: row.mapped_filter_slugs.map(normalizeSlug),
        conflicting_sibling_slug: normalizeSlug(sibling.fridge_slug),
        conflicting_filter_slugs: [...conflicting].sort((a, b) => a.localeCompare(b)),
        sibling_classification: sibling.classification,
        sibling_proven: sibling.classification === "PROVEN_CORRECT",
        learned_failure_aggregate: guard?.aggregate_verdict ?? "PASS",
        hyperagent_cursor_row_state: hyperagent?.cursor_row_state ?? null,
      });
      break;
    }
  }

  return conflicts.sort((a, b) => a.fridge_slug.localeCompare(b.fridge_slug));
}

function loadHyperAgentValidationHints(rootDir: string): {
  hintsBySlug: Map<string, HyperAgentSlugHintV1>;
  packetCount: number;
  paths: string[];
} {
  const hintsBySlug = new Map<string, HyperAgentSlugHintV1>();
  const paths: string[] = [];
  const draftsDir = path.join(rootDir, "data/fridge/batch-production/drafts");
  if (!existsSync(draftsDir)) {
    return { hintsBySlug, packetCount: 0, paths };
  }

  let packetCount = 0;
  for (const file of readdirSync(draftsDir)) {
    if (!file.endsWith(".json") || !file.includes("cursor-validation")) continue;
    const rel = `data/fridge/batch-production/drafts/${file}`;
    paths.push(rel);
    try {
      const parsed = JSON.parse(readFileSync(path.join(rootDir, rel), "utf8")) as {
        contract?: string;
        validation_id?: string;
        validation_status?: string;
        validation_details?: {
          family_key?: string;
          row_verdicts?: Array<{
            fridge_slug?: string;
            cursor_row_state?: string;
            cursor_verdict?: string;
          }>;
        };
      };
      if (parsed.contract !== CURSOR_VALIDATION_PACKET_CONTRACT_V1) continue;
      packetCount += 1;
      const familyKey = parsed.validation_details?.family_key ?? null;
      for (const row of parsed.validation_details?.row_verdicts ?? []) {
        if (!row.fridge_slug || !row.cursor_row_state) continue;
        if (
          !(OWNER_REVIEW_ACTIONS_V1 as readonly string[]).includes(row.cursor_row_state)
        ) {
          continue;
        }
        hintsBySlug.set(normalizeSlug(row.fridge_slug), {
          family_key: familyKey,
          cursor_row_state: row.cursor_row_state as OwnerReviewActionV1,
          cursor_verdict: row.cursor_verdict ?? row.cursor_row_state,
          validation_id: parsed.validation_id ?? file,
          validation_status: parsed.validation_status ?? "UNKNOWN",
        });
      }
    } catch {
      // skip malformed packets
    }
  }

  return { hintsBySlug, packetCount, paths };
}

function deriveSeverity(args: {
  family: EvidenceLeverageFamilyRowV1;
  conflicts: ModelLineConflictRowV1[];
  frozen: boolean;
  anchorSiblingConflict: boolean;
  preResearchRecommendation: PreResearchRecommendationV1 | null;
  hyperagentCompatReviewCount: number;
  learnedFailureBlockCount: number;
  prefixContaminationCount: number;
}): ReconciliationSeverityV1 {
  if (
    args.frozen ||
    args.anchorSiblingConflict ||
    args.learnedFailureBlockCount > 0 ||
    args.conflicts.some((row) => row.sibling_proven)
  ) {
    return "CRITICAL";
  }

  if (
    args.conflicts.length > 0 &&
    (args.prefixContaminationCount > 0 ||
      args.preResearchRecommendation === "NEEDS_REPO_RECONCILIATION_FIRST" ||
      args.preResearchRecommendation === "FREEZE_FAMILY")
  ) {
    return "HIGH";
  }

  if (args.conflicts.length > 0 || args.hyperagentCompatReviewCount > 0) {
    return "MEDIUM";
  }

  if (args.prefixContaminationCount > 0) {
    return "LOW";
  }

  return "NONE";
}

function reconciliationScore(args: {
  severity: ReconciliationSeverityV1;
  conflictCount: number;
  unlockScore: number;
}): number {
  const severityWeight: Record<ReconciliationSeverityV1, number> = {
    CRITICAL: 4000,
    HIGH: 3000,
    MEDIUM: 2000,
    LOW: 1000,
    NONE: 0,
  };
  return (
    severityWeight[args.severity] +
    args.conflictCount * 50 +
    Math.round(args.unlockScore * 0.1)
  );
}

function ownerReviewPacketId(familyKey: string): string {
  return createHash("sha256").update(familyKey).digest("hex").slice(0, 16);
}

function buildOwnerReviewPacket(args: {
  family: EvidenceLeverageFamilyRowV1;
  severity: ReconciliationSeverityV1;
  conflicts: ModelLineConflictRowV1[];
  frozen: boolean;
  prefixContaminationCount: number;
  preResearchRecommendation: PreResearchRecommendationV1 | null;
  hyperagentCompatReviewCount: number;
  learnedFailureBlockCount: number;
}): FamilyOwnerReviewPacketV1 {
  const targetFilterSlug = parseTargetFilterSlug(args.family.family_key);
  const packet_id = ownerReviewPacketId(args.family.family_key);

  const slugRows = args.conflicts.map((conflict) => ({
    fridge_slug: conflict.fridge_slug,
    model_number: conflict.model_number,
    repo_classification: conflict.repo_classification,
    mapped_filter_slugs: conflict.mapped_filter_slugs,
    conflict_type: conflict.sibling_proven ? "proven_sibling_drift" : "model_line_filter_split",
    conflicting_sibling_slug: conflict.conflicting_sibling_slug,
    conflicting_filter_slugs: conflict.conflicting_filter_slugs,
    hyperagent_cursor_row_state: conflict.hyperagent_cursor_row_state,
    recommended_owner_action:
      conflict.hyperagent_cursor_row_state ??
      (conflict.sibling_proven ? "NEEDS_COMPAT_REVIEW" : "NEEDS_COMPAT_REVIEW"),
  }));

  const checklist = [
    "Confirm model-line sibling mappings in data/compatibility_mappings.csv before evidence scaling.",
    "Resolve alias/co-map WARN rows before promoting LIKELY_CORRECT slugs to PROVEN_CORRECT.",
    "Capture owner-browser Tier-1 filter_specification proof for any slug kept in this family.",
    "Do not apply HyperAgent compat removals until owner review closes NEEDS_COMPAT_REVIEW rows.",
  ];
  if (args.frozen) {
    checklist.unshift("Family is frozen by anchor integrity or prefix contamination — unfreeze only after owner proof.");
  }

  return {
    contract: "family_reconciliation_owner_review_packet_v1",
    packet_id,
    family_key: args.family.family_key,
    target_filter_slug: targetFilterSlug,
    severity: args.severity,
    title: `Family reconciliation — ${args.family.family_key}`,
    summary: `${String(args.conflicts.length)} model-line conflicts across ${String(args.family.unlock_slugs.length)} unlock slugs for ${targetFilterSlug}.`,
    owner_checklist: checklist,
    slug_rows: slugRows,
    signals: {
      anchor_frozen: args.frozen,
      prefix_contamination_count: args.prefixContaminationCount,
      pre_research_recommendation: args.preResearchRecommendation,
      hyperagent_compat_review_count: args.hyperagentCompatReviewCount,
      learned_failure_block_count: args.learnedFailureBlockCount,
    },
  };
}

export function buildFamilyReconciliationV1(args: {
  rootDir: string;
  now?: () => Date;
}): FamilyReconciliationV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  const audit = readJsonFile<ModelFilterCorrectnessAuditV1>(
    args.rootDir,
    MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  );
  const guards = readJsonFile<LearnedFailureGuardsReportV1>(
    args.rootDir,
    LEARNED_FAILURE_GUARDS_JSON_REL_V1,
  );
  const anchor = readJsonFile<AnchorIntegrityAuditV1>(
    args.rootDir,
    ANCHOR_INTEGRITY_AUDIT_JSON_REL_V1,
  );
  const leverage = readJsonFile<EvidenceLeveragePrioritizationV1>(
    args.rootDir,
    EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
  );

  if (audit.contract !== MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1) {
    throw new Error("Model filter correctness audit contract mismatch");
  }
  if (guards.contract !== LEARNED_FAILURE_GUARDS_CONTRACT_V1) {
    throw new Error("Learned failure guards contract mismatch");
  }
  if (anchor.contract !== ANCHOR_INTEGRITY_AUDIT_CONTRACT_V1) {
    throw new Error("Anchor integrity audit contract mismatch");
  }
  if (leverage.contract !== EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1) {
    throw new Error("Evidence leverage prioritization contract mismatch");
  }

  readCsv(args.rootDir, "data/compatibility_mappings.csv");

  const aliasGroups = buildFilterAliasGroups(args.rootDir);
  const auditBySlug = new Map(
    audit.model_rows.map((row) => [normalizeSlug(row.fridge_slug), row] as const),
  );
  const guardBySlug = new Map(
    guards.per_slug_guards.map((row) => [normalizeSlug(row.fridge_slug), row] as const),
  );
  const siblingIndex = buildModelLineSiblingIndex(audit.model_rows);
  const { hintsBySlug: hyperagentBySlug, packetCount, paths: hyperagentPaths } =
    loadHyperAgentValidationHints(args.rootDir);

  const severity_counts: Record<ReconciliationSeverityV1, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    NONE: 0,
  };

  const family_rows: FamilyReconciliationFamilyRowV1[] = [];
  const owner_review_packets: FamilyOwnerReviewPacketV1[] = [];

  for (const family of leverage.filter_families) {
    const conflicts = detectModelLineConflicts({
      family,
      auditBySlug,
      guardBySlug,
      siblingIndex,
      aliasGroups,
      hyperagentBySlug,
    });

    const frozen = isFamilyFrozenByControlGraphV1({
      familyKey: family.family_key,
      anchorAudit: anchor,
      leverage,
    });
    const anchorSiblingConflict = anchor.anchor_rows.some(
      (row) =>
        row.anchor_family === family.family_key &&
        row.checks.sibling_family_conflict_detected,
    );

    let preResearchRecommendation: PreResearchRecommendationV1 | null = null;
    if (
      family.unlock_slugs.length > 0 &&
      (conflicts.length > 0 ||
        frozen ||
        (family.prefix_contamination_count ?? 0) > 0 ||
        family.currently_proven_count === 0)
    ) {
      try {
        const screen = buildFamilyPreResearchRiskScreenV1({
          rootDir: args.rootDir,
          familyKey: family.family_key,
          now: args.now,
        });
        preResearchRecommendation = screen.recommendation;
      } catch {
        preResearchRecommendation = null;
      }
    }

    const hyperagentCompatReviewCount = family.unlock_slugs.filter((slug) => {
      const hint = hyperagentBySlug.get(normalizeSlug(slug));
      return hint?.cursor_row_state === "NEEDS_COMPAT_REVIEW";
    }).length;

    const learnedFailureBlockCount = family.unlock_slugs.filter((slug) => {
      const guard = guardBySlug.get(normalizeSlug(slug));
      return guard?.aggregate_verdict === "BLOCK";
    }).length;

    const severity = deriveSeverity({
      family,
      conflicts,
      frozen,
      anchorSiblingConflict,
      preResearchRecommendation,
      hyperagentCompatReviewCount,
      learnedFailureBlockCount,
      prefixContaminationCount: family.prefix_contamination_count ?? 0,
    });

    severity_counts[severity] += 1;

    const row: FamilyReconciliationFamilyRowV1 = {
      family_key: family.family_key,
      target_filter_slug: parseTargetFilterSlug(family.family_key),
      severity,
      model_line_conflict_count: conflicts.length,
      proven_anchor_slugs: family.proven_anchor_slugs,
      unlock_slug_count: family.unlock_slugs.length,
      estimated_factory_unlock_score: family.estimated_factory_unlock_score,
      owner_review_packet_id: ownerReviewPacketId(family.family_key),
    };
    family_rows.push(row);

    if (severity !== "NONE") {
      owner_review_packets.push(
        buildOwnerReviewPacket({
          family,
          severity,
          conflicts,
          frozen,
          prefixContaminationCount: family.prefix_contamination_count ?? 0,
          preResearchRecommendation,
          hyperagentCompatReviewCount,
          learnedFailureBlockCount,
        }),
      );
    }
  }

  const ranked_reconciliation_backlog = [...family_rows]
    .filter((row) => row.severity !== "NONE")
    .sort((a, b) => {
      const scoreA = reconciliationScore({
        severity: a.severity,
        conflictCount: a.model_line_conflict_count,
        unlockScore: a.estimated_factory_unlock_score,
      });
      const scoreB = reconciliationScore({
        severity: b.severity,
        conflictCount: b.model_line_conflict_count,
        unlockScore: b.estimated_factory_unlock_score,
      });
      return scoreB - scoreA || a.family_key.localeCompare(b.family_key);
    })
    .map((row, index) => ({
      rank: index + 1,
      family_key: row.family_key,
      target_filter_slug: row.target_filter_slug,
      severity: row.severity,
      reconciliation_score: reconciliationScore({
        severity: row.severity,
        conflictCount: row.model_line_conflict_count,
        unlockScore: row.estimated_factory_unlock_score,
      }),
      model_line_conflict_count: row.model_line_conflict_count,
      estimated_factory_unlock_score: row.estimated_factory_unlock_score,
      owner_review_packet_id: row.owner_review_packet_id,
    }));

  const families_with_conflicts = family_rows.filter(
    (row) => row.model_line_conflict_count > 0,
  ).length;

  return {
    contract: FAMILY_RECONCILIATION_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: generatedAt,
    families_screened: leverage.filter_families.length,
    families_with_conflicts,
    severity_counts,
    hyperagent_validation_packets_loaded: packetCount,
    ranked_reconciliation_backlog,
    owner_review_packets,
    family_rows,
    exact_repo_paths_read: [
      MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
      ANCHOR_INTEGRITY_AUDIT_JSON_REL_V1,
      LEARNED_FAILURE_GUARDS_JSON_REL_V1,
      EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
      "data/compatibility_mappings.csv",
      "data/filter_aliases.csv",
      ...hyperagentPaths,
    ].sort(),
    proven_facts: [
      `PROVEN: families_screened=${String(leverage.filter_families.length)} filter families from ${EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1}.`,
      `PROVEN: families_with_model_line_conflicts=${String(families_with_conflicts)}.`,
      `PROVEN: hyperagent_validation_packets_loaded=${String(packetCount)} from drafts/*cursor-validation*.json.`,
      `PROVEN: ranked_reconciliation_backlog=${String(ranked_reconciliation_backlog.length)} families require owner review (severity != NONE).`,
      "PROVEN: Read-only reconciliation lane — no compat, evidence, Supabase, page, or retailer mutations.",
    ],
    inferred_facts: [
      "INFERRED: CRITICAL/HIGH families should remain blocked from Command Center SAFE_EVIDENCE until owner-review packets close.",
      "INFERRED: HyperAgent NEEDS_COMPAT_REVIEW rows accelerate MEDIUM severity but do not replace repo audit classifications.",
    ],
    unknown_facts: [
      "UNKNOWN: Live manufacturer pages and unpublished owner browser proof may differ from committed audit JSON.",
      "UNKNOWN: Non-Frigidaire model-line prefix heuristics may miss edge-case catalog numbering patterns.",
    ],
  };
}

function renderMarkdown(report: FamilyReconciliationV1): string {
  const lines = [
    "# Family reconciliation v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Severity counts",
    "",
    ...RECONCILIATION_SEVERITY_LEVELS_V1.map(
      (level) => `- ${level}: ${String(report.severity_counts[level])}`,
    ),
    "",
    "## Ranked backlog (top 10)",
    "",
    ...report.ranked_reconciliation_backlog.slice(0, 10).map(
      (row) =>
        `${String(row.rank)}. \`${row.family_key}\` — ${row.severity} (conflicts=${String(row.model_line_conflict_count)}, score=${String(row.reconciliation_score)})`,
    ),
    "",
  ];
  return lines.join("\n");
}

export function writeFamilyReconciliationArtifactsV1(args: {
  rootDir: string;
  report: FamilyReconciliationV1;
}): void {
  const jsonAbs = path.join(args.rootDir, FAMILY_RECONCILIATION_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, FAMILY_RECONCILIATION_MD_REL_V1);
  const packetDirAbs = path.join(args.rootDir, FAMILY_RECONCILIATION_OWNER_PACKET_DIR_REL_V1);

  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  mkdirSync(packetDirAbs, { recursive: true });

  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, renderMarkdown(args.report), "utf8");

  for (const packet of args.report.owner_review_packets) {
    const fileAbs = path.join(packetDirAbs, `${packet.packet_id}.json`);
    writeFileSync(fileAbs, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  }
}
