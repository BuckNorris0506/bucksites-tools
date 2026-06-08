/**
 * Read-only COMMAND_CENTER_CONTROL_GRAPH_ROLLUP_V1.
 * Connects mapping correctness, learned failure guards, anchor integrity, evidence leverage,
 * page quality, and batch QA into a single control-plane rollup for BuckParts Command Center.
 * Does not mutate compat, evidence, Supabase, sitemap, robots, pages, or HQ handoff.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { ANCHOR_INTEGRITY_AUDIT_CONTRACT_V1 } from "./anchor-integrity-audit-v1";
import {
  BAD_MAPPING_CORRECTION_BATCH_RUNNER_CONTRACT_V1,
  BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
  type BadMappingCorrectionBatchRunnerV1,
} from "./bad-mapping-correction-batch-runner-v1";
import {
  BUCKPARTS_PAGE_QUALITY_GATE_CONTRACT_V1,
  PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1,
  type PageQualityGateReportV1,
} from "./buckparts-page-quality-gate-v1";
import {
  DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1,
  DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
  type DangerousMappingRemediationPlanV1,
} from "./dangerous-mapping-remediation-plan-v1";
import {
  EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1,
  EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
  type EvidenceLeveragePrioritizationV1,
  type EvidenceLeverageTargetV1,
} from "./evidence-leverage-prioritization-v1";
import {
  LEARNED_FAILURE_GUARDS_CONTRACT_V1,
  LEARNED_FAILURE_GUARDS_JSON_REL_V1,
  type LearnedFailureGuardsReportV1,
} from "./learned-failure-guards-v1";
import {
  MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
  MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  type ModelFilterCorrectnessAuditV1,
} from "./model-filter-correctness-audit-v1";
import {
  PAGE_FACTORY_BATCH_QA_DIRECTOR_ARTIFACT_DIR_REL_V1,
  PAGE_FACTORY_BATCH_QA_DIRECTOR_CONTRACT_V1,
  type PageFactoryBatchQaDirectorReportV1,
} from "./buckparts-page-factory-batch-qa-director-v1";

export const COMMAND_CENTER_CONTROL_GRAPH_ROLLUP_CONTRACT_V1 =
  "command_center_control_graph_rollup_v1" as const;

export const COMMAND_CENTER_CONTROL_GRAPH_ROLLUP_CC_JQ_PATH_V1 =
  ".command_center_v2.command_center_control_graph_rollup_v1" as const;

export const EDUCATION_OPPORTUNITY_ARTIFACT_JSON_REL_V1 =
  "data/fridge/batch-production/audits/education-opportunity-v1.json" as const;

export type DangerousMappingSummaryV1 = {
  dangerous_model_count: number;
  wrong_part_risk_count: number;
  blocked_count: number;
  quarantined_model_count: number;
  factory_scaling_safe: number;
  factory_scaling_needs_evidence: number;
  factory_scaling_dangerous: number;
  remediation_root_cause_group_count: number;
  top_root_cause_group: string | null;
  top_root_cause_affected_slug_count: number;
  bad_mapping_correction_packet_count: number;
  hyperagent_research_batch_group_count: number;
  immediate_surgical_candidate_slugs: string[];
  recommended_first_batch_slug_count: number;
};

export type LearnedFailureGuardSummaryV1 = {
  dangerous_count_regression_verdict: "PASS" | "WARN" | "BLOCK";
  dangerous_count: number;
  dangerous_slugs_all_blocked: boolean;
  proven_correct_slugs_all_pass: boolean;
  aggregate_verdict_counts: { PASS: number; WARN: number; BLOCK: number };
  confusion_family_block_total: number;
  top_confusion_family_blocks: Array<{ guard_id: string; block_count: number }>;
};

export type AnchorIntegritySummaryV1 = {
  healthy_count: number;
  watchlist_count: number;
  disputed_count: number;
  sibling_conflict_disputed_count: number;
  total_anchor_count: number;
  highest_risk_anchor_slugs: string[];
  sibling_conflict_anchor_slugs: string[];
};

export type FrozenFamilySummaryV1 = {
  frozen_family_count: number;
  frozen_families: Array<{
    family_key: string;
    freeze_reason: string;
    primary_anchor_slugs: string[];
  }>;
};

export type EvidenceLeverageSummaryV1 = {
  total_unlockable_model_count: number;
  top_leverage_family_key: string | null;
  top_leverage_unlock_score: number;
  highest_safe_non_frozen_family_key: string | null;
  highest_safe_non_frozen_unlock_score: number;
  top_5_safe_non_frozen_families: Array<{
    family_key: string;
    estimated_factory_unlock_score: number;
    evidence_gap_type: string;
    currently_unproven_count: number;
  }>;
};

export type PageFactoryQualitySummaryV1 = {
  quality_gate_artifact_count: number;
  quality_classification_counts: Record<string, number>;
  publication_authorized_count: number;
  batch_qa_director_artifact_count: number;
  batch_qa_classification_counts: Record<string, number>;
  batch_qa_verified_slug_count: number;
  batch_qa_wrong_part_risk_slug_count: number;
};

export type EducationOpportunitySummaryV1 = {
  artifact_present: boolean;
  artifact_path: string | null;
  opportunity_count: number;
  top_opportunity_titles: string[];
};

export type ControlGraphNextBestActionRankedItemV1 = {
  rank: number;
  action: string;
  safety_tier: "FREEZE" | "SAFE_EVIDENCE" | "DANGEROUS_REMEDIATION" | "PAGE_FACTORY";
  leverage_score: number;
  family_key: string | null;
  blocked_by_frozen_families: string[];
  why: string;
};

export type CommandCenterControlGraphRollupV1 = {
  contract: typeof COMMAND_CENTER_CONTROL_GRAPH_ROLLUP_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  recommended_jq_path: typeof COMMAND_CENTER_CONTROL_GRAPH_ROLLUP_CC_JQ_PATH_V1;
  dangerous_mapping_summary: DangerousMappingSummaryV1;
  learned_failure_guard_summary: LearnedFailureGuardSummaryV1;
  anchor_integrity_summary: AnchorIntegritySummaryV1;
  frozen_family_summary: FrozenFamilySummaryV1;
  evidence_leverage_summary: EvidenceLeverageSummaryV1;
  page_factory_quality_summary: PageFactoryQualitySummaryV1;
  education_opportunity_summary: EducationOpportunitySummaryV1 | null;
  next_best_action: string;
  next_best_action_ranked: ControlGraphNextBestActionRankedItemV1[];
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

type AnchorIntegrityAuditInputV1 = {
  contract: typeof ANCHOR_INTEGRITY_AUDIT_CONTRACT_V1;
  anchor_health_summary: {
    healthy_count: number;
    watchlist_count: number;
    disputed_count: number;
    sibling_conflict_disputed_count: number;
    total_anchor_count: number;
  };
  highest_risk_anchors: Array<{
    anchor_slug: string;
    anchor_family: string | null;
    anchor_health: string;
    checks: { sibling_family_conflict_detected: boolean };
  }>;
  anchor_rows: Array<{
    anchor_slug: string;
    anchor_family: string | null;
    checks: { sibling_family_conflict_detected: boolean };
  }>;
  families_with_disputed_or_watchlist_primary_anchor: string[];
};

function readJsonFile<T>(rootDir: string, relPath: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as T;
}

function loadJsonDir<T extends { contract: string }>(
  rootDir: string,
  relDir: string,
  expectedContract: string,
): T[] {
  const absDir = path.join(rootDir, relDir);
  if (!existsSync(absDir)) return [];
  const out: T[] = [];
  for (const file of readdirSync(absDir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const parsed = JSON.parse(readFileSync(path.join(absDir, file), "utf8")) as T;
      if (parsed.contract === expectedContract) {
        out.push(parsed);
      }
    } catch {
      // skip malformed artifacts
    }
  }
  return out;
}

function isSafeLeverageTarget(target: EvidenceLeverageTargetV1): boolean {
  return target.wrong_part_risk_count === 0 && target.blocked_count === 0;
}

function pickHighestSafeNonFrozenFamily(args: {
  leverage: EvidenceLeveragePrioritizationV1;
  frozenFamilies: Set<string>;
}): EvidenceLeverageTargetV1 | null {
  for (const target of args.leverage.top_50_highest_leverage_evidence_targets) {
    if (args.frozenFamilies.has(target.family_key)) continue;
    if (!isSafeLeverageTarget(target)) continue;
    return target;
  }
  return null;
}

function buildFrozenFamilySummary(
  anchor: AnchorIntegrityAuditInputV1,
  leverage: EvidenceLeveragePrioritizationV1,
): FrozenFamilySummaryV1 {
  const frozenKeys = anchor.families_with_disputed_or_watchlist_primary_anchor;
  const allFamilies = [...leverage.filter_families, ...leverage.model_families];
  const frozen_families = frozenKeys.map((familyKey) => {
    const family = allFamilies.find((row) => row.family_key === familyKey);
    const anchorSlugs = anchor.anchor_rows
      .filter(
        (row) =>
          row.anchor_family === familyKey && row.checks.sibling_family_conflict_detected,
      )
      .map((row) => row.anchor_slug);
    return {
      family_key: familyKey,
      freeze_reason: "sibling_family_conflict_detected_on_primary_anchor",
      primary_anchor_slugs: family?.proven_anchor_slugs ?? anchorSlugs,
    };
  });

  return {
    frozen_family_count: frozen_families.length,
    frozen_families,
  };
}

function buildNextBestActionRanked(args: {
  frozenFamilies: FrozenFamilySummaryV1;
  anchor: AnchorIntegrityAuditInputV1;
  safeTarget: EvidenceLeverageTargetV1 | null;
  badMapping: BadMappingCorrectionBatchRunnerV1;
}): ControlGraphNextBestActionRankedItemV1[] {
  const ranked: ControlGraphNextBestActionRankedItemV1[] = [];
  const frozenKeys = args.frozenFamilies.frozen_families.map((row) => row.family_key);

  for (const frozen of args.frozenFamilies.frozen_families) {
    const disputedAnchors = args.anchor.anchor_rows
      .filter(
        (row) =>
          row.anchor_family === frozen.family_key &&
          row.checks.sibling_family_conflict_detected,
      )
      .map((row) => row.anchor_slug);
    ranked.push({
      rank: ranked.length + 1,
      action: `Freeze \`${frozen.family_key}\` clone expansion until anchor integrity is resolved (${disputedAnchors.join(", ") || "sibling-conflict primary anchor"}).`,
      safety_tier: "FREEZE",
      leverage_score: 0,
      family_key: frozen.family_key,
      blocked_by_frozen_families: [],
      why: "Anchor integrity audit flags sibling-family conflict on primary anchor — evidence clone scaling is unsafe until owner browser proof closes the gap.",
    });
  }

  if (args.safeTarget) {
    ranked.push({
      rank: ranked.length + 1,
      action: args.safeTarget.recommended_action,
      safety_tier: "SAFE_EVIDENCE",
      leverage_score: args.safeTarget.estimated_factory_unlock_score,
      family_key: args.safeTarget.family_key,
      blocked_by_frozen_families: frozenKeys.filter((key) => key !== args.safeTarget!.family_key),
      why: `Highest safe evidence-leverage family not frozen (score=${String(args.safeTarget.estimated_factory_unlock_score)}, gap=${args.safeTarget.evidence_gap_type}).`,
    });
  }

  if (args.badMapping.recommended_first_batch_slugs.length > 0) {
    ranked.push({
      rank: ranked.length + 1,
      action: args.badMapping.inspect_summary.recommended_next_action,
      safety_tier: "DANGEROUS_REMEDIATION",
      leverage_score: 0,
      family_key: null,
      blocked_by_frozen_families: frozenKeys,
      why: "Dangerous-mapping correction runner queues HyperAgent research for WRONG_PART_RISK slugs — lower safety tier than proven-cohort evidence leverage.",
    });
  }

  return ranked.map((item, index) => ({ ...item, rank: index + 1 }));
}

function buildPrimaryNextBestAction(
  ranked: ControlGraphNextBestActionRankedItemV1[],
  safeTarget: EvidenceLeverageTargetV1 | null,
): string {
  const freezeAction = ranked.find((item) => item.safety_tier === "FREEZE");
  if (freezeAction && safeTarget) {
    return `${freezeAction.action} Then prioritize \`${safeTarget.family_key}\` — highest safe evidence-leverage family not frozen.`;
  }
  if (freezeAction) {
    return freezeAction.action;
  }
  if (safeTarget) {
    return safeTarget.recommended_action;
  }
  return "All control-graph freeze gates clear — proceed with highest safe evidence-leverage target subject to page quality gates.";
}

export function buildCommandCenterControlGraphRollupV1(args: {
  rootDir: string;
  now?: () => Date;
}): CommandCenterControlGraphRollupV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  const modelAudit = readJsonFile<ModelFilterCorrectnessAuditV1>(
    args.rootDir,
    MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  );
  const learnedGuards = readJsonFile<LearnedFailureGuardsReportV1>(
    args.rootDir,
    LEARNED_FAILURE_GUARDS_JSON_REL_V1,
  );
  const anchorIntegrity = readJsonFile<AnchorIntegrityAuditInputV1>(
    args.rootDir,
    "data/fridge/batch-production/audits/anchor-integrity-audit-v1.json",
  );
  const leverage = readJsonFile<EvidenceLeveragePrioritizationV1>(
    args.rootDir,
    EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
  );
  const badMapping = readJsonFile<BadMappingCorrectionBatchRunnerV1>(
    args.rootDir,
    BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
  );
  const remediationPlan = readJsonFile<DangerousMappingRemediationPlanV1>(
    args.rootDir,
    DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
  );

  if (modelAudit.contract !== MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1) {
    throw new Error("Model filter correctness audit contract mismatch");
  }
  if (learnedGuards.contract !== LEARNED_FAILURE_GUARDS_CONTRACT_V1) {
    throw new Error("Learned failure guards contract mismatch");
  }
  if (anchorIntegrity.contract !== ANCHOR_INTEGRITY_AUDIT_CONTRACT_V1) {
    throw new Error("Anchor integrity audit contract mismatch");
  }
  if (leverage.contract !== EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1) {
    throw new Error("Evidence leverage prioritization contract mismatch");
  }
  if (badMapping.contract !== BAD_MAPPING_CORRECTION_BATCH_RUNNER_CONTRACT_V1) {
    throw new Error("Bad mapping correction batch runner contract mismatch");
  }
  if (remediationPlan.contract !== DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1) {
    throw new Error("Dangerous mapping remediation plan contract mismatch");
  }

  readFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv"), "utf8");

  const qualityGates = loadJsonDir<PageQualityGateReportV1>(
    args.rootDir,
    PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1,
    BUCKPARTS_PAGE_QUALITY_GATE_CONTRACT_V1,
  );
  const batchQaReports = loadJsonDir<PageFactoryBatchQaDirectorReportV1>(
    args.rootDir,
    PAGE_FACTORY_BATCH_QA_DIRECTOR_ARTIFACT_DIR_REL_V1,
    PAGE_FACTORY_BATCH_QA_DIRECTOR_CONTRACT_V1,
  );

  const topRemediationGroup = [...remediationPlan.root_cause_groups].sort(
    (a, b) => b.affected_slug_count - a.affected_slug_count,
  )[0];

  const dangerous_mapping_summary: DangerousMappingSummaryV1 = {
    dangerous_model_count: remediationPlan.dangerous_model_count,
    wrong_part_risk_count: modelAudit.classification_counts.WRONG_PART_RISK,
    blocked_count: modelAudit.classification_counts.BLOCKED,
    quarantined_model_count: modelAudit.quarantined_model_count,
    factory_scaling_safe: modelAudit.factory_scaling.safe,
    factory_scaling_needs_evidence: modelAudit.factory_scaling.needs_evidence,
    factory_scaling_dangerous: modelAudit.factory_scaling.dangerous,
    remediation_root_cause_group_count: remediationPlan.root_cause_groups.length,
    top_root_cause_group: topRemediationGroup?.root_cause_group ?? null,
    top_root_cause_affected_slug_count: topRemediationGroup?.affected_slug_count ?? 0,
    bad_mapping_correction_packet_count: badMapping.correction_packets.length,
    hyperagent_research_batch_group_count: badMapping.hyperagent_research_batch_groups.length,
    immediate_surgical_candidate_slugs: badMapping.correction_packets
      .filter((packet) => packet.immediate_surgical_candidate)
      .map((packet) => packet.fridge_slug),
    recommended_first_batch_slug_count: badMapping.recommended_first_batch_slugs.length,
  };

  const aggregate_verdict_counts = { PASS: 0, WARN: 0, BLOCK: 0 };
  for (const row of learnedGuards.per_slug_guards) {
    aggregate_verdict_counts[row.aggregate_verdict] += 1;
  }
  const top_confusion_family_blocks = Object.entries(learnedGuards.confusion_family_block_count)
    .map(([guard_id, block_count]) => ({ guard_id, block_count }))
    .filter((row) => row.block_count > 0)
    .sort((a, b) => b.block_count - a.block_count);

  const learned_failure_guard_summary: LearnedFailureGuardSummaryV1 = {
    dangerous_count_regression_verdict: learnedGuards.dangerous_count_regression.verdict,
    dangerous_count: learnedGuards.dangerous_count_regression.dangerous_count,
    dangerous_slugs_all_blocked: learnedGuards.dangerous_slugs_all_blocked,
    proven_correct_slugs_all_pass: learnedGuards.proven_correct_slugs_all_pass,
    aggregate_verdict_counts,
    confusion_family_block_total: top_confusion_family_blocks.reduce(
      (sum, row) => sum + row.block_count,
      0,
    ),
    top_confusion_family_blocks,
  };

  const anchor_integrity_summary: AnchorIntegritySummaryV1 = {
    healthy_count: anchorIntegrity.anchor_health_summary.healthy_count,
    watchlist_count: anchorIntegrity.anchor_health_summary.watchlist_count,
    disputed_count: anchorIntegrity.anchor_health_summary.disputed_count,
    sibling_conflict_disputed_count:
      anchorIntegrity.anchor_health_summary.sibling_conflict_disputed_count,
    total_anchor_count: anchorIntegrity.anchor_health_summary.total_anchor_count,
    highest_risk_anchor_slugs: anchorIntegrity.highest_risk_anchors
      .slice(0, 5)
      .map((row) => row.anchor_slug),
    sibling_conflict_anchor_slugs: anchorIntegrity.anchor_rows
      .filter((row) => row.checks.sibling_family_conflict_detected)
      .map((row) => row.anchor_slug),
  };

  const frozen_family_summary = buildFrozenFamilySummary(anchorIntegrity, leverage);
  const frozenFamilySet = new Set(
    frozen_family_summary.frozen_families.map((row) => row.family_key),
  );

  const safeNonFrozen = pickHighestSafeNonFrozenFamily({
    leverage,
    frozenFamilies: frozenFamilySet,
  });
  const topLeverage = leverage.top_50_highest_leverage_evidence_targets[0] ?? null;
  const topSafeNonFrozenFamilies = leverage.top_50_highest_leverage_evidence_targets
    .filter((target) => !frozenFamilySet.has(target.family_key) && isSafeLeverageTarget(target))
    .slice(0, 5)
    .map((target) => ({
      family_key: target.family_key,
      estimated_factory_unlock_score: target.estimated_factory_unlock_score,
      evidence_gap_type: target.evidence_gap_type,
      currently_unproven_count: target.currently_unproven_count,
    }));

  const evidence_leverage_summary: EvidenceLeverageSummaryV1 = {
    total_unlockable_model_count: leverage.total_unlockable_model_count,
    top_leverage_family_key: topLeverage?.family_key ?? null,
    top_leverage_unlock_score: topLeverage?.estimated_factory_unlock_score ?? 0,
    highest_safe_non_frozen_family_key: safeNonFrozen?.family_key ?? null,
    highest_safe_non_frozen_unlock_score: safeNonFrozen?.estimated_factory_unlock_score ?? 0,
    top_5_safe_non_frozen_families: topSafeNonFrozenFamilies,
  };

  const quality_classification_counts: Record<string, number> = {};
  let publication_authorized_count = 0;
  for (const gate of qualityGates) {
    quality_classification_counts[gate.quality_classification] =
      (quality_classification_counts[gate.quality_classification] ?? 0) + 1;
    if (gate.publication_authorized) publication_authorized_count += 1;
  }

  const batch_qa_classification_counts: Record<string, number> = {};
  let batch_qa_verified_slug_count = 0;
  let batch_qa_wrong_part_risk_slug_count = 0;
  for (const report of batchQaReports) {
    for (const bucket of report.buckets) {
      batch_qa_classification_counts[bucket.classification] =
        (batch_qa_classification_counts[bucket.classification] ?? 0) + bucket.count;
      if (bucket.classification === "VERIFIED") {
        batch_qa_verified_slug_count += bucket.count;
      }
      if (bucket.classification === "WRONG_PART_RISK") {
        batch_qa_wrong_part_risk_slug_count += bucket.count;
      }
    }
  }

  const page_factory_quality_summary: PageFactoryQualitySummaryV1 = {
    quality_gate_artifact_count: qualityGates.length,
    quality_classification_counts,
    publication_authorized_count,
    batch_qa_director_artifact_count: batchQaReports.length,
    batch_qa_classification_counts,
    batch_qa_verified_slug_count,
    batch_qa_wrong_part_risk_slug_count,
  };

  let education_opportunity_summary: EducationOpportunitySummaryV1 | null = null;
  const educationPath = path.join(args.rootDir, EDUCATION_OPPORTUNITY_ARTIFACT_JSON_REL_V1);
  if (existsSync(educationPath)) {
    const education = JSON.parse(readFileSync(educationPath, "utf8")) as {
      opportunities?: Array<{ title?: string }>;
      opportunity_count?: number;
    };
    education_opportunity_summary = {
      artifact_present: true,
      artifact_path: EDUCATION_OPPORTUNITY_ARTIFACT_JSON_REL_V1,
      opportunity_count:
        education.opportunity_count ?? (education.opportunities?.length ?? 0),
      top_opportunity_titles: (education.opportunities ?? [])
        .map((row) => row.title)
        .filter((title): title is string => typeof title === "string")
        .slice(0, 5),
    };
  }

  const next_best_action_ranked = buildNextBestActionRanked({
    frozenFamilies: frozen_family_summary,
    anchor: anchorIntegrity,
    safeTarget: safeNonFrozen,
    badMapping,
  });
  const next_best_action = buildPrimaryNextBestAction(next_best_action_ranked, safeNonFrozen);

  return {
    contract: COMMAND_CENTER_CONTROL_GRAPH_ROLLUP_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: generatedAt,
    recommended_jq_path: COMMAND_CENTER_CONTROL_GRAPH_ROLLUP_CC_JQ_PATH_V1,
    dangerous_mapping_summary,
    learned_failure_guard_summary,
    anchor_integrity_summary,
    frozen_family_summary,
    evidence_leverage_summary,
    page_factory_quality_summary,
    education_opportunity_summary,
    next_best_action,
    next_best_action_ranked,
    exact_repo_paths_read: [
      MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
      LEARNED_FAILURE_GUARDS_JSON_REL_V1,
      "data/fridge/batch-production/audits/anchor-integrity-audit-v1.json",
      EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
      BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
      DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
      `${PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1}/*.json`,
      `${PAGE_FACTORY_BATCH_QA_DIRECTOR_ARTIFACT_DIR_REL_V1}/*.json`,
      "data/compatibility_mappings.csv",
    ].sort(),
    proven_facts: [
      `PROVEN: dangerous_model_count=${String(dangerous_mapping_summary.dangerous_model_count)} from committed remediation plan.`,
      `PROVEN: anchor_integrity healthy=${String(anchor_integrity_summary.healthy_count)} watchlist=${String(anchor_integrity_summary.watchlist_count)} disputed=${String(anchor_integrity_summary.disputed_count)} sibling_conflict_disputed=${String(anchor_integrity_summary.sibling_conflict_disputed_count)}.`,
      `PROVEN: frozen_family_count=${String(frozen_family_summary.frozen_family_count)}.`,
      `PROVEN: highest_safe_non_frozen_family=${evidence_leverage_summary.highest_safe_non_frozen_family_key ?? "none"}.`,
      `PROVEN: quality_gate_artifact_count=${String(page_factory_quality_summary.quality_gate_artifact_count)} batch_qa_director_artifact_count=${String(page_factory_quality_summary.batch_qa_director_artifact_count)}.`,
      "PROVEN: Read-only control-graph rollup — no compat, evidence, Supabase, sitemap, robots, page, or HQ handoff mutations.",
    ],
    unknown_facts: [
      education_opportunity_summary
        ? "UNKNOWN: Education opportunity artifact present but not validated against live publishability gates."
        : "UNKNOWN: No committed education-opportunity-v1.json artifact in repo.",
      "UNKNOWN: Live Supabase or unpublished draft state may differ from committed audit inputs.",
    ],
  };
}
