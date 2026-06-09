/**
 * Read-only COMMAND_CENTER_CONTROL_GRAPH_ROLLUP_V1.
 * Connects mapping correctness, learned failure guards, anchor integrity, evidence leverage,
 * page quality, and batch QA into a single control-plane rollup for BuckParts Command Center.
 * Does not mutate compat, evidence, Supabase, sitemap, robots, pages, or HQ handoff.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { ANCHOR_INTEGRITY_AUDIT_CONTRACT_V1 } from "./anchor-integrity-audit-v1";
import { CURSOR_VALIDATION_PACKET_CONTRACT_V1 } from "./buckparts-ops-agent-workflow-v1";
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
  buildEvidenceLeveragePrioritizationV1,
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
  buildFamilyPreResearchRiskScreenV1,
  type ContaminationRiskV1,
  type FamilyPreResearchRiskScreenV1,
  type PreResearchRecommendationV1,
} from "./family-pre-research-risk-screen-v1";
import {
  buildFamilyReconciliationV1,
  FAMILY_RECONCILIATION_CONTRACT_V1,
  FAMILY_RECONCILIATION_JSON_REL_V1,
  type FamilyReconciliationV1,
  type ReconciliationSeverityV1,
} from "./family-reconciliation-v1";
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
    prefix_contamination_count?: number;
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

export type PreResearchRiskScreenSummaryV1 = {
  screened_family_count: number;
  blocked_family_count: number;
  top_blocked_families: Array<{
    family_key: string;
    contamination_risk: ContaminationRiskV1;
    recommendation: PreResearchRecommendationV1;
    current_unlock_score: number;
    sibling_conflict_count: number;
  }>;
  highest_safe_screened_family_key: string | null;
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

export type RecommendedActionScopeV1 =
  | "FULL_FAMILY_SCALING"
  | "BOUNDED_RESEARCH_ONLY"
  | "FREEZE_NO_DISPATCH"
  | "DANGEROUS_REMEDIATION_ONLY";

export type ControlGraphNextBestActionRankedItemV1 = {
  rank: number;
  action: string;
  safety_tier:
    | "FREEZE"
    | "PRE_RESEARCH_RECONCILIATION"
    | "BOUNDED_EVIDENCE_RESEARCH"
    | "SAFE_EVIDENCE"
    | "DANGEROUS_REMEDIATION"
    | "PAGE_FACTORY";
  recommended_action_scope: RecommendedActionScopeV1;
  requires_owner_review_before_mutation: boolean;
  safe_for_scaling: boolean;
  safe_for_bounded_research: boolean;
  family_reconciliation_severity: ReconciliationSeverityV1 | null;
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
  pre_research_risk_screen_summary: PreResearchRiskScreenSummaryV1;
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
  if (target.wrong_part_risk_count > 0 || target.blocked_count > 0) return false;
  if (target.currently_proven_count === 0 && (target.prefix_contamination_count ?? 0) > 0) {
    return false;
  }
  return true;
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

type PreResearchScreeningResultV1 = {
  summary: PreResearchRiskScreenSummaryV1;
  safeScreenedTarget: EvidenceLeverageTargetV1 | null;
  safeScreenedTargetScreen: FamilyPreResearchRiskScreenV1 | null;
  blockedLeverageTargets: Array<{
    target: EvidenceLeverageTargetV1;
    screen: FamilyPreResearchRiskScreenV1;
  }>;
};

function loadFamilyReconciliationReport(args: {
  rootDir: string;
  now?: () => Date;
}): FamilyReconciliationV1 {
  const abs = path.join(args.rootDir, FAMILY_RECONCILIATION_JSON_REL_V1);
  if (existsSync(abs)) {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as FamilyReconciliationV1;
    if (parsed.contract === FAMILY_RECONCILIATION_CONTRACT_V1) {
      return parsed;
    }
  }
  return buildFamilyReconciliationV1(args);
}

function loadHyperAgentValidationByFamily(rootDir: string): Map<
  string,
  { validation_status: string; validation_partial: boolean }
> {
  const byFamily = new Map<string, { validation_status: string; validation_partial: boolean }>();
  const draftsDir = path.join(rootDir, "data/fridge/batch-production/drafts");
  if (!existsSync(draftsDir)) return byFamily;

  for (const file of readdirSync(draftsDir)) {
    if (!file.endsWith(".json") || !file.includes("cursor-validation")) continue;
    try {
      const parsed = JSON.parse(
        readFileSync(path.join(draftsDir, file), "utf8"),
      ) as {
        contract?: string;
        validation_status?: string;
        validation_details?: { family_key?: string };
      };
      if (parsed.contract !== CURSOR_VALIDATION_PACKET_CONTRACT_V1) continue;
      const familyKey = parsed.validation_details?.family_key;
      if (!familyKey) continue;
      byFamily.set(familyKey, {
        validation_status: parsed.validation_status ?? "UNKNOWN",
        validation_partial: parsed.validation_status === "VALIDATION_PARTIAL",
      });
    } catch {
      // skip malformed packets
    }
  }

  return byFamily;
}

function reconciliationSeverityForFamily(
  reconciliation: FamilyReconciliationV1,
  familyKey: string,
): ReconciliationSeverityV1 {
  return (
    reconciliation.family_rows.find((row) => row.family_key === familyKey)?.severity ??
    "NONE"
  );
}

function isReconciliationSafeForScaling(severity: ReconciliationSeverityV1): boolean {
  return severity === "NONE" || severity === "LOW";
}

function deriveEvidenceActionPolicy(args: {
  screen: FamilyPreResearchRiskScreenV1;
  reconciliationSeverity: ReconciliationSeverityV1;
  hyperagentValidationPartial: boolean;
}): {
  safe_for_scaling: boolean;
  safe_for_bounded_research: boolean;
  recommended_action_scope: RecommendedActionScopeV1;
  requires_owner_review_before_mutation: boolean;
} {
  const preResearchLow = args.screen.contamination_risk === "LOW";
  const noBlocks = args.screen.learned_failure_block_count === 0;
  const preResearchAllowsBatch =
    args.screen.recommendation === "SAFE_FOR_HYPERAGENT_EVIDENCE_BATCH";

  const safe_for_bounded_research = preResearchLow && noBlocks && preResearchAllowsBatch;

  const safe_for_scaling =
    safe_for_bounded_research &&
    isReconciliationSafeForScaling(args.reconciliationSeverity) &&
    !args.hyperagentValidationPartial;

  return {
    safe_for_scaling,
    safe_for_bounded_research,
    recommended_action_scope: safe_for_scaling
      ? "FULL_FAMILY_SCALING"
      : "BOUNDED_RESEARCH_ONLY",
    requires_owner_review_before_mutation: !safe_for_scaling,
  };
}

function buildBoundedEvidenceAction(args: {
  familyKey: string;
  reconciliationSeverity: ReconciliationSeverityV1;
  hyperagentValidationPartial: boolean;
}): string {
  const validationNote = args.hyperagentValidationPartial
    ? "; HyperAgent validation partial"
    : "";
  return `Run bounded evidence research only for \`${args.familyKey}\` — not full-family scaling, no compat mutation, no evidence promotion without owner-reviewed manual evidence; family reconciliation remains ${args.reconciliationSeverity}${validationNote}.`;
}

function buildEvidenceActionWhy(args: {
  screen: FamilyPreResearchRiskScreenV1;
  reconciliationSeverity: ReconciliationSeverityV1;
  hyperagentValidationPartial: boolean;
  policy: ReturnType<typeof deriveEvidenceActionPolicy>;
}): string {
  if (args.policy.safe_for_scaling) {
    return `Highest evidence-leverage filter family passing pre-research risk screen and family reconciliation ${args.reconciliationSeverity} (score=${String(args.screen.current_unlock_score)}, gap=evidence-leverage).`;
  }

  const caveats: string[] = [];
  if (!isReconciliationSafeForScaling(args.reconciliationSeverity)) {
    caveats.push(`family reconciliation ${args.reconciliationSeverity}`);
  }
  if (args.hyperagentValidationPartial) {
    caveats.push("HyperAgent validation partial");
  }
  if (caveats.length > 0) {
    return `pre-research ${args.screen.contamination_risk}, but ${caveats.join(" and ")}.`;
  }

  if (args.screen.learned_failure_warn_count > 0) {
    return `pre-research ${args.screen.contamination_risk} with learned-failure WARN=${String(args.screen.learned_failure_warn_count)} — bounded evidence research only; not safe for full-family scaling.`;
  }

  return `pre-research ${args.screen.contamination_risk} — bounded evidence research only; not safe for full-family scaling.`;
}

function isPreResearchScreenableTarget(target: EvidenceLeverageTargetV1): boolean {
  return target.family_key.startsWith("filter::");
}

function buildPreResearchRiskScreenSummary(args: {
  rootDir: string;
  now?: () => Date;
  leverage: EvidenceLeveragePrioritizationV1;
  frozenFamilies: Set<string>;
}): PreResearchScreeningResultV1 {
  const blockedLeverageTargets: PreResearchScreeningResultV1["blockedLeverageTargets"] = [];
  let safeScreenedTarget: EvidenceLeverageTargetV1 | null = null;
  let safeScreenedTargetScreen: FamilyPreResearchRiskScreenV1 | null = null;
  let screened_family_count = 0;

  for (const target of args.leverage.top_50_highest_leverage_evidence_targets) {
    if (args.frozenFamilies.has(target.family_key)) continue;
    if (!isSafeLeverageTarget(target)) continue;
    if (!isPreResearchScreenableTarget(target)) continue;

    screened_family_count += 1;
    const screen = buildFamilyPreResearchRiskScreenV1({
      rootDir: args.rootDir,
      familyKey: target.family_key,
      now: args.now,
    });

    if (screen.recommendation !== "SAFE_FOR_HYPERAGENT_EVIDENCE_BATCH") {
      blockedLeverageTargets.push({ target, screen });
      continue;
    }

    if (!safeScreenedTarget) {
      safeScreenedTarget = target;
      safeScreenedTargetScreen = screen;
    }
  }

  const top_blocked_families = [...blockedLeverageTargets]
    .sort(
      (a, b) =>
        b.target.estimated_factory_unlock_score - a.target.estimated_factory_unlock_score,
    )
    .slice(0, 5)
    .map(({ target, screen }) => ({
      family_key: target.family_key,
      contamination_risk: screen.contamination_risk,
      recommendation: screen.recommendation,
      current_unlock_score: target.estimated_factory_unlock_score,
      sibling_conflict_count: screen.sibling_conflict_count,
    }));

  return {
    summary: {
      screened_family_count,
      blocked_family_count: blockedLeverageTargets.length,
      top_blocked_families,
      highest_safe_screened_family_key: safeScreenedTarget?.family_key ?? null,
    },
    safeScreenedTarget,
    safeScreenedTargetScreen,
    blockedLeverageTargets,
  };
}

function buildFrozenFamilySummary(
  anchor: AnchorIntegrityAuditInputV1,
  leverage: EvidenceLeveragePrioritizationV1,
): FrozenFamilySummaryV1 {
  const allFamilies = [...leverage.filter_families, ...leverage.model_families];
  const frozenByKey = new Map<
    string,
    {
      family_key: string;
      freeze_reason: string;
      primary_anchor_slugs: string[];
      prefix_contamination_count?: number;
    }
  >();

  for (const familyKey of anchor.families_with_disputed_or_watchlist_primary_anchor) {
    const family = allFamilies.find((row) => row.family_key === familyKey);
    const anchorSlugs = anchor.anchor_rows
      .filter(
        (row) =>
          row.anchor_family === familyKey && row.checks.sibling_family_conflict_detected,
      )
      .map((row) => row.anchor_slug);
    frozenByKey.set(familyKey, {
      family_key: familyKey,
      freeze_reason: "sibling_family_conflict_detected_on_primary_anchor",
      primary_anchor_slugs: family?.proven_anchor_slugs ?? anchorSlugs,
    });
  }

  for (const family of allFamilies) {
    if (
      family.family_kind === "filter" &&
      family.currently_proven_count === 0 &&
      (family.prefix_contamination_count ?? 0) > 0
    ) {
      frozenByKey.set(family.family_key, {
        family_key: family.family_key,
        freeze_reason: "prefix_contamination_zero_proven_anchor",
        primary_anchor_slugs: family.proven_anchor_slugs,
        prefix_contamination_count: family.prefix_contamination_count,
      });
    }
  }

  const frozen_families = Array.from(frozenByKey.values()).sort((a, b) =>
    a.family_key.localeCompare(b.family_key),
  );

  return {
    frozen_family_count: frozen_families.length,
    frozen_families,
  };
}

function buildNextBestActionRanked(args: {
  frozenFamilies: FrozenFamilySummaryV1;
  anchor: AnchorIntegrityAuditInputV1;
  safeScreenedTarget: EvidenceLeverageTargetV1 | null;
  safeScreenedTargetScreen: FamilyPreResearchRiskScreenV1 | null;
  blockedLeverageTargets: Array<{
    target: EvidenceLeverageTargetV1;
    screen: FamilyPreResearchRiskScreenV1;
  }>;
  badMapping: BadMappingCorrectionBatchRunnerV1;
  reconciliation: FamilyReconciliationV1;
  hyperagentValidationByFamily: Map<
    string,
    { validation_status: string; validation_partial: boolean }
  >;
}): ControlGraphNextBestActionRankedItemV1[] {
  const ranked: ControlGraphNextBestActionRankedItemV1[] = [];
  const frozenKeys = args.frozenFamilies.frozen_families.map((row) => row.family_key);
  const freezeFields = {
    recommended_action_scope: "FREEZE_NO_DISPATCH" as const,
    requires_owner_review_before_mutation: true,
    safe_for_scaling: false,
    safe_for_bounded_research: false,
    family_reconciliation_severity: null,
  };
  const reconciliationBlockFields = {
    recommended_action_scope: "BOUNDED_RESEARCH_ONLY" as const,
    requires_owner_review_before_mutation: true,
    safe_for_scaling: false,
    safe_for_bounded_research: false,
  };
  const dangerousFields = {
    recommended_action_scope: "DANGEROUS_REMEDIATION_ONLY" as const,
    requires_owner_review_before_mutation: true,
    safe_for_scaling: false,
    safe_for_bounded_research: false,
    family_reconciliation_severity: null,
  };

  for (const frozen of args.frozenFamilies.frozen_families) {
    const disputedAnchors = args.anchor.anchor_rows
      .filter(
        (row) =>
          row.anchor_family === frozen.family_key &&
          row.checks.sibling_family_conflict_detected,
      )
      .map((row) => row.anchor_slug);

    const action =
      frozen.freeze_reason === "prefix_contamination_zero_proven_anchor"
        ? `Freeze \`${frozen.family_key}\` evidence scaling until prefix/sibling contamination is resolved (${String(frozen.prefix_contamination_count ?? 0)} contaminated slugs).`
        : `Freeze \`${frozen.family_key}\` clone expansion until anchor integrity is resolved (${disputedAnchors.join(", ") || "sibling-conflict primary anchor"}).`;

    const why =
      frozen.freeze_reason === "prefix_contamination_zero_proven_anchor"
        ? "Zero-proven filter family has prefix/sibling contamination — factory unlock score discounted and family excluded from safe evidence scaling."
        : "Anchor integrity audit flags sibling-family conflict on primary anchor — evidence clone scaling is unsafe until owner browser proof closes the gap.";

    ranked.push({
      rank: ranked.length + 1,
      action,
      safety_tier: "FREEZE",
      leverage_score: 0,
      family_key: frozen.family_key,
      blocked_by_frozen_families: [],
      why,
      ...freezeFields,
    });
  }

  const blockedAboveSafe = args.blockedLeverageTargets.filter(
    (entry) =>
      !args.safeScreenedTarget ||
      entry.target.estimated_factory_unlock_score >
        args.safeScreenedTarget.estimated_factory_unlock_score,
  );

  for (const blocked of blockedAboveSafe.slice(0, 3)) {
    const sliceLabel =
      blocked.screen.exact_slug_batch_for_research.length > 0
        ? `${String(blocked.screen.recommended_hyperagent_batch_size)}-slug conflict-free research slice (${blocked.screen.exact_slug_batch_for_research.join(", ")}) — not full-family scaling`
        : "no conflict-free slug slice available — reconcile repo signals before HyperAgent dispatch";

    ranked.push({
      rank: ranked.length + 1,
      action: `Block full-family HyperAgent dispatch for \`${blocked.screen.family_key}\` — pre-research risk screen ${blocked.screen.contamination_risk}/${blocked.screen.recommendation}. Optional ${sliceLabel}.`,
      safety_tier: "PRE_RESEARCH_RECONCILIATION",
      leverage_score: blocked.target.estimated_factory_unlock_score,
      family_key: blocked.screen.family_key,
      blocked_by_frozen_families: frozenKeys,
      why: `Evidence leverage ranks ${blocked.screen.family_key} highly, but pre-research risk screen blocks full-family scaling (${String(blocked.screen.sibling_conflict_count)} sibling conflicts, ${blocked.screen.learned_failure_block_count} learned-failure blocks).`,
      ...reconciliationBlockFields,
      family_reconciliation_severity: reconciliationSeverityForFamily(
        args.reconciliation,
        blocked.screen.family_key,
      ),
    });
  }

  if (args.safeScreenedTarget && args.safeScreenedTargetScreen) {
    const reconciliationSeverity = reconciliationSeverityForFamily(
      args.reconciliation,
      args.safeScreenedTarget.family_key,
    );
    const validation = args.hyperagentValidationByFamily.get(
      args.safeScreenedTarget.family_key,
    );
    const hyperagentValidationPartial = validation?.validation_partial ?? false;
    const policy = deriveEvidenceActionPolicy({
      screen: args.safeScreenedTargetScreen,
      reconciliationSeverity,
      hyperagentValidationPartial,
    });
    const safety_tier = policy.safe_for_scaling
      ? "SAFE_EVIDENCE"
      : "BOUNDED_EVIDENCE_RESEARCH";
    const action = policy.safe_for_scaling
      ? args.safeScreenedTarget.recommended_action
      : buildBoundedEvidenceAction({
          familyKey: args.safeScreenedTarget.family_key,
          reconciliationSeverity,
          hyperagentValidationPartial,
        });

    ranked.push({
      rank: ranked.length + 1,
      action,
      safety_tier,
      recommended_action_scope: policy.recommended_action_scope,
      requires_owner_review_before_mutation: policy.requires_owner_review_before_mutation,
      safe_for_scaling: policy.safe_for_scaling,
      safe_for_bounded_research: policy.safe_for_bounded_research,
      family_reconciliation_severity: reconciliationSeverity,
      leverage_score: args.safeScreenedTarget.estimated_factory_unlock_score,
      family_key: args.safeScreenedTarget.family_key,
      blocked_by_frozen_families: frozenKeys.filter(
        (key) => key !== args.safeScreenedTarget!.family_key,
      ),
      why: buildEvidenceActionWhy({
        screen: args.safeScreenedTargetScreen,
        reconciliationSeverity,
        hyperagentValidationPartial,
        policy,
      }),
    });
  } else if (blockedAboveSafe[0]) {
    const topBlocked = blockedAboveSafe[0]!;
    ranked.push({
      rank: ranked.length + 1,
      action: `No filter family passes pre-research risk screen for full-family HyperAgent scaling. Reconcile ${topBlocked.screen.family_key} prefix/sibling conflicts or run dangerous-mapping remediation before evidence batches.`,
      safety_tier: "PRE_RESEARCH_RECONCILIATION",
      leverage_score: topBlocked.target.estimated_factory_unlock_score,
      family_key: topBlocked.screen.family_key,
      blocked_by_frozen_families: frozenKeys,
      why: "All non-frozen leverage candidates fail pre-research risk screen — full-family evidence scaling is blocked.",
      ...reconciliationBlockFields,
      family_reconciliation_severity: reconciliationSeverityForFamily(
        args.reconciliation,
        topBlocked.screen.family_key,
      ),
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
      ...dangerousFields,
    });
  }

  return ranked.map((item, index) => ({ ...item, rank: index + 1 }));
}

function buildPrimaryNextBestAction(
  ranked: ControlGraphNextBestActionRankedItemV1[],
): string {
  const freezeAction = ranked.find((item) => item.safety_tier === "FREEZE");
  const reconciliationActions = ranked.filter(
    (item) => item.safety_tier === "PRE_RESEARCH_RECONCILIATION",
  );
  const topReconciliation = reconciliationActions[0];
  const evidenceAction = ranked.find(
    (item) =>
      item.safety_tier === "BOUNDED_EVIDENCE_RESEARCH" ||
      item.safety_tier === "SAFE_EVIDENCE",
  );

  if (freezeAction && evidenceAction) {
    const reconciliationNote = topReconciliation
      ? ` ${topReconciliation.action}`
      : "";
    const followOn =
      evidenceAction.safety_tier === "BOUNDED_EVIDENCE_RESEARCH"
        ? evidenceAction.action
        : `Then prioritize \`${evidenceAction.family_key}\` — highest safe pre-research-screened evidence-leverage family.`;
    return `${freezeAction.action}${reconciliationNote} ${followOn}`;
  }

  if (freezeAction && topReconciliation) {
    return `${freezeAction.action} ${topReconciliation.action}`;
  }

  if (freezeAction) {
    return freezeAction.action;
  }

  if (evidenceAction) {
    return evidenceAction.action;
  }

  if (topReconciliation) {
    return topReconciliation.action;
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
  const leverage = buildEvidenceLeveragePrioritizationV1({
    rootDir: args.rootDir,
    now: args.now,
  });
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
  const preResearchScreening = buildPreResearchRiskScreenSummary({
    rootDir: args.rootDir,
    now: args.now,
    leverage,
    frozenFamilies: frozenFamilySet,
  });
  const pre_research_risk_screen_summary = preResearchScreening.summary;
  const safeScreenedTarget = preResearchScreening.safeScreenedTarget;
  const familyReconciliation = loadFamilyReconciliationReport({
    rootDir: args.rootDir,
    now: args.now,
  });
  const hyperagentValidationByFamily = loadHyperAgentValidationByFamily(args.rootDir);
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
    safeScreenedTarget,
    safeScreenedTargetScreen: preResearchScreening.safeScreenedTargetScreen,
    blockedLeverageTargets: preResearchScreening.blockedLeverageTargets,
    badMapping,
    reconciliation: familyReconciliation,
    hyperagentValidationByFamily,
  });
  const next_best_action = buildPrimaryNextBestAction(next_best_action_ranked);

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
    pre_research_risk_screen_summary,
    page_factory_quality_summary,
    education_opportunity_summary,
    next_best_action,
    next_best_action_ranked,
    exact_repo_paths_read: [
      MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
      LEARNED_FAILURE_GUARDS_JSON_REL_V1,
      "data/fridge/batch-production/audits/anchor-integrity-audit-v1.json",
      BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
      DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
      FAMILY_RECONCILIATION_JSON_REL_V1,
      `${PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1}/*.json`,
      `${PAGE_FACTORY_BATCH_QA_DIRECTOR_ARTIFACT_DIR_REL_V1}/*.json`,
      "data/compatibility_mappings.csv",
      ...leverage.exact_repo_paths_read,
    ]
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort(),
    proven_facts: [
      `PROVEN: dangerous_model_count=${String(dangerous_mapping_summary.dangerous_model_count)} from committed remediation plan.`,
      `PROVEN: anchor_integrity healthy=${String(anchor_integrity_summary.healthy_count)} watchlist=${String(anchor_integrity_summary.watchlist_count)} disputed=${String(anchor_integrity_summary.disputed_count)} sibling_conflict_disputed=${String(anchor_integrity_summary.sibling_conflict_disputed_count)}.`,
      `PROVEN: frozen_family_count=${String(frozen_family_summary.frozen_family_count)}.`,
      `PROVEN: highest_safe_non_frozen_family=${evidence_leverage_summary.highest_safe_non_frozen_family_key ?? "none"}.`,
      `PROVEN: highest_safe_screened_family=${pre_research_risk_screen_summary.highest_safe_screened_family_key ?? "none"} pre_research_blocked=${String(pre_research_risk_screen_summary.blocked_family_count)}.`,
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
