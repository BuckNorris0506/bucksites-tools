/**
 * Read-only REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_V1.
 * Converts committed Cursor validation packets into owner-review repair packets.
 * Does not mutate compat, evidence, Supabase, pages, retailer links, sitemap, robots, or HQ handoff.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { CURSOR_VALIDATION_PACKET_CONTRACT_V1 } from "./buckparts-ops-agent-workflow-v1";
import {
  MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
  MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  type ModelFilterCorrectnessAuditV1,
} from "./model-filter-correctness-audit-v1";
import {
  buildRefrigeratorTruthScoreboardV1,
  CURSOR_VALIDATED_CORRECT_VERDICT_V1,
  PHANTOM_FILTER_SLUGS_V1,
  REFRIGERATOR_TRUTH_SCOREBOARD_CONTRACT_V1,
} from "./refrigerator-truth-scoreboard-v1";

export const REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_CONTRACT_V1 =
  "refrigerator_truth_repair_owner_review_v1" as const;

export const SAMSUNG_BAD_MAPPING_CURSOR_VALIDATION_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/samsung-bad-mapping-batch-001-cursor-validation-v1.json" as const;

export const WF2CB_CURSOR_VALIDATION_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/wf2cb-bounded-evidence-slice-001-cursor-validation-v1.json" as const;

export const FRIG_242017801_CURSOR_VALIDATION_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/frig-242017801-bounded-evidence-slice-046fb82e-cursor-validation-v1.json" as const;

export const REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/refrigerator-truth-repair-owner-review-v1.json" as const;

export const REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_MD_REL_V1 =
  "data/fridge/batch-production/drafts/refrigerator-truth-repair-owner-review-v1.md" as const;

export const REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_SOURCE_COMMAND_V1 =
  "npm run buckparts:refrigerator-truth-repair-owner-review" as const;

export const REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_ALLOWED_WRITE_REL_PATHS_V1 = [
  REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_JSON_REL_V1,
  REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_MD_REL_V1,
] as const;

export const REPAIR_GROUPS_V1 = [
  "samsung_pass_ready",
  "samsung_partial_needs_browser_proof",
  "wf2cb_data_quality_defects",
  "wf2cb_partial_needs_browser_proof",
  "phantom_or_non_refrigerator_models",
  "frig_242017801_partial_needs_browser_proof",
  "frig_242017801_phantom_typo_models",
] as const;

export type RepairGroupV1 = (typeof REPAIR_GROUPS_V1)[number];

export const PROPOSED_MUTATION_TYPES_V1 = [
  "replace_mapping",
  "remove_mapping",
  "split_mapping",
  "catalog_suppress_slug",
  "catalog_reconcile_typo",
  "capture_manual_evidence",
  "owner_browser_proof",
  "no_action",
] as const;

export type ProposedMutationTypeV1 = (typeof PROPOSED_MUTATION_TYPES_V1)[number];

export type TruthRepairOwnerReviewSlugRowV1 = {
  fridge_slug: string;
  source_batch_id: string;
  repair_group: RepairGroupV1;
  repo_classification: string;
  current_mapped_filter_slugs: string[];
  validated_target_filter_slug: string | null;
  discovered_token: string | null;
  validation_verdict: string;
  evidence_tier: string;
  recommended_owner_action: string;
  proposed_mutation_type: ProposedMutationTypeV1;
  mutation_authorized: false;
  reason: string;
};

export type TruthRepairOwnerReviewGroupV1 = {
  repair_group: RepairGroupV1;
  batch_id: string;
  slug_count: number;
  slug_rows: TruthRepairOwnerReviewSlugRowV1[];
};

export type TruthRepairOwnerReviewSummaryV1 = {
  apply_candidate_count: number;
  browser_proof_required_count: number;
  phantom_or_suppression_review_count: number;
  no_action_count: number;
  total_slug_rows: number;
};

export type TokenIdentityOwnerReviewConcernV1 = {
  concern_id: string;
  source_batch_id: string;
  claim: string;
  repo_ultrawf_slug: string;
  repo_frig_242017801_slug: string;
  cross_alias_in_repo: boolean;
  consolidation_performed: false;
  consolidation_authorized: false;
  recommended_owner_action: string;
  separate_lane_title: string | null;
  rationale: string[];
};

export type ScoreboardImpactEstimateV1 = {
  scoreboard_source_contract: typeof REFRIGERATOR_TRUTH_SCOREBOARD_CONTRACT_V1;
  baseline_wrong_part_risk_count: number;
  estimated_wrong_part_risk_reduction_if_owner_approved: number;
  estimated_wrong_part_risk_count_after_apply: number;
  baseline_multi_mapped_count: number;
  estimated_multi_mapped_reduction_if_owner_approved: number;
  estimated_multi_mapped_count_after_apply: number;
  baseline_phantom_model_count: number;
  phantom_or_suppression_review_slug_count: number;
  estimated_phantom_model_reduction_if_owner_approved: number;
  estimated_phantom_model_count_after_catalog_review: number;
  notes: string[];
};

export type RefrigeratorTruthRepairOwnerReviewV1 = {
  contract: typeof REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  owner_review_required: true;
  repo_truth_closure_authorized: false;
  truth_closure_authorized: false;
  generated_at: string;
  source_command: typeof REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_SOURCE_COMMAND_V1;
  source_validation_packets: Array<{
    batch_id: string;
    rel_path: string;
    validation_status: string;
    mission_type: string;
    slug_count: number;
    repo_truth_closure_authorized: false;
  }>;
  repair_groups: TruthRepairOwnerReviewGroupV1[];
  summary: TruthRepairOwnerReviewSummaryV1;
  token_identity_owner_review_concerns: TokenIdentityOwnerReviewConcernV1[];
  scoreboard_impact_estimate: ScoreboardImpactEstimateV1;
  owner_checklist: string[];
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

type CursorValidationRowV1 = {
  fridge_slug?: string;
  packet_current_mapped_filter_slugs?: string[];
  repo_classification?: string;
  discovered_token?: string;
  resolved_repo_filter_slug?: string;
  discovered_part_number?: string;
  data_quality_alert?: string;
  evidence_category?: string;
  hyperagent_confidence?: string;
  cursor_verdict?: string;
  reason?: string;
  immediate_surgical_candidate?: boolean;
};

type TokenIdentityCrossCheckV1 = {
  claim?: string;
  repo_ultrawf_slug?: string;
  repo_frig_242017801_slug?: string;
  cross_alias_between_ultrawf_and_frig_242017801_in_repo?: boolean;
  consolidation_performed?: boolean;
  cursor_assessment?: string;
};

type AliasConsolidationLaneRecommendationV1 = {
  recommend_separate_owner_review_lane?: boolean;
  lane_title?: string;
  rationale?: string[];
  recommended_next_step?: string;
};

type CursorValidationPacketV1 = {
  contract?: string;
  validation_status?: string;
  truth_closure_authorized?: boolean;
  repo_truth_closure_authorized?: boolean;
  validation_details?: {
    batch_id?: string;
    mission_type?: string;
    slug_count?: number;
    row_verdicts?: CursorValidationRowV1[];
    token_identity_cross_check?: TokenIdentityCrossCheckV1;
    alias_consolidation_lane_recommendation?: AliasConsolidationLaneRecommendationV1;
  };
};

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function readJsonFile<T>(rootDir: string, relPath: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as T;
}

function readCompatMappings(rootDir: string): Map<string, string[]> {
  const rows = parse(
    readFileSync(path.join(rootDir, COMPATIBILITY_MAPPINGS_CSV_REL_V1), "utf8"),
    {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    },
  ) as Array<{ fridge_slug?: string; filter_slug?: string }>;

  const bySlug = new Map<string, string[]>();
  for (const row of rows) {
    const slug = row.fridge_slug?.trim();
    const filter = row.filter_slug?.trim();
    if (!slug || !filter) continue;
    const existing = bySlug.get(normalizeSlug(slug)) ?? [];
    existing.push(normalizeSlug(filter));
    bySlug.set(normalizeSlug(slug), existing);
  }
  for (const [slug, filters] of Array.from(bySlug.entries())) {
    bySlug.set(slug, Array.from(new Set(filters)).sort());
  }
  return bySlug;
}

function evidenceTierForRow(row: CursorValidationRowV1): string {
  if (row.evidence_category) return row.evidence_category;
  if (row.hyperagent_confidence) return `hyperagent_${row.hyperagent_confidence.toLowerCase()}`;
  return "unknown";
}

function isPhantomOrNonRefrigeratorRow(row: CursorValidationRowV1): boolean {
  const alert = (row.data_quality_alert ?? "").toUpperCase();
  return alert === "NOT_A_REFRIGERATOR" || alert.includes("NOT_A_REFRIGERATOR");
}

function isWf2cbDataQualityDefectRow(row: CursorValidationRowV1): boolean {
  if (isPhantomOrNonRefrigeratorRow(row)) return false;
  if (row.evidence_category === "data_quality_defect_row") return true;
  const alert = (row.data_quality_alert ?? "").toUpperCase();
  return alert.includes("MODEL_NUMBER_TYPO") || alert.includes("TYPO");
}

function classifySamsungRepairGroup(row: CursorValidationRowV1): RepairGroupV1 {
  if (row.cursor_verdict === CURSOR_VALIDATED_CORRECT_VERDICT_V1) {
    return "samsung_pass_ready";
  }
  return "samsung_partial_needs_browser_proof";
}

function classifyWf2cbRepairGroup(row: CursorValidationRowV1): RepairGroupV1 {
  if (isPhantomOrNonRefrigeratorRow(row)) {
    return "phantom_or_non_refrigerator_models";
  }
  if (isWf2cbDataQualityDefectRow(row)) {
    return "wf2cb_data_quality_defects";
  }
  return "wf2cb_partial_needs_browser_proof";
}

function isFrig242017801PhantomTypoRow(row: CursorValidationRowV1): boolean {
  if (row.cursor_verdict === "VALIDATION_FAIL") return true;
  const alert = (row.data_quality_alert ?? "").toUpperCase();
  return (
    alert.includes("PHANTOM_MODEL_NUMBER") ||
    row.evidence_category === "phantom_typo_model_row"
  );
}

function classifyFrig242017801RepairGroup(row: CursorValidationRowV1): RepairGroupV1 {
  if (row.cursor_verdict === CURSOR_VALIDATED_CORRECT_VERDICT_V1) {
    return "samsung_pass_ready";
  }
  if (isFrig242017801PhantomTypoRow(row)) {
    return "frig_242017801_phantom_typo_models";
  }
  return "frig_242017801_partial_needs_browser_proof";
}

function proposedMutationForRow(args: {
  repairGroup: RepairGroupV1;
  row: CursorValidationRowV1;
  currentMappedFilterSlugs: string[];
}): ProposedMutationTypeV1 {
  const { repairGroup, row, currentMappedFilterSlugs } = args;

  if (repairGroup === "phantom_or_non_refrigerator_models") {
    return "catalog_suppress_slug";
  }
  if (repairGroup === "wf2cb_data_quality_defects") {
    return "catalog_reconcile_typo";
  }
  if (
    repairGroup === "wf2cb_partial_needs_browser_proof" ||
    repairGroup === "frig_242017801_partial_needs_browser_proof"
  ) {
    return "owner_browser_proof";
  }
  if (repairGroup === "samsung_partial_needs_browser_proof") {
    return "capture_manual_evidence";
  }
  if (repairGroup === "frig_242017801_phantom_typo_models") {
    const alert = (row.data_quality_alert ?? "").toUpperCase();
    if (alert.includes("TYPO")) {
      return "catalog_reconcile_typo";
    }
    return "catalog_suppress_slug";
  }

  if (currentMappedFilterSlugs.length > 1 || row.immediate_surgical_candidate) {
    return "split_mapping";
  }
  return "replace_mapping";
}

function recommendedOwnerAction(args: {
  repairGroup: RepairGroupV1;
  row: CursorValidationRowV1;
  proposedMutation: ProposedMutationTypeV1;
  validatedTarget: string | null;
}): string {
  const { repairGroup, row, proposedMutation, validatedTarget } = args;

  if (repairGroup === "samsung_pass_ready") {
    return `Owner-review apply candidate only — propose ${proposedMutation} to ${validatedTarget ?? "validated target"} after explicit approval. Not auto-applied; no apply plan in this packet.`;
  }
  if (repairGroup === "samsung_partial_needs_browser_proof") {
    return "Hold compat edits — capture Tier-1 Samsung exact-model filter_specification before any mapping change. PARTIAL verdict is not apply-ready.";
  }
  if (repairGroup === "phantom_or_non_refrigerator_models") {
    return "Catalog integrity review — suppress or retarget non-refrigerator slug before any filter compat work.";
  }
  if (repairGroup === "wf2cb_data_quality_defects") {
    return "Resolve catalog typo/duplicate slug before compat or evidence work — not apply-ready.";
  }
  if (repairGroup === "frig_242017801_partial_needs_browser_proof") {
    return "Hold compat edits — capture Tier-1 Frigidaire exact-model filter_specification before any mapping change. PARTIAL verdict is not apply-ready.";
  }
  if (repairGroup === "frig_242017801_phantom_typo_models") {
    return "Catalog integrity review — suppress phantom slug or reconcile typo before any filter compat work — not apply-ready.";
  }
  return "Owner-browser Tier-1 filter_specification or physical inspection required — WF2CB map held until validation PASS exists.";
}

function buildSlugRow(args: {
  row: CursorValidationRowV1;
  batchId: string;
  repairGroup: RepairGroupV1;
  repoClassification: string;
  compatBySlug: Map<string, string[]>;
}): TruthRepairOwnerReviewSlugRowV1 {
  const slug = normalizeSlug(args.row.fridge_slug ?? "");
  const packetMaps = (args.row.packet_current_mapped_filter_slugs ?? []).map(normalizeSlug);
  const repoMaps = args.compatBySlug.get(slug) ?? packetMaps;
  const currentMappedFilterSlugs = repoMaps.length > 0 ? repoMaps : packetMaps;
  const validatedTarget = args.row.resolved_repo_filter_slug
    ? normalizeSlug(args.row.resolved_repo_filter_slug)
    : null;
  const proposedMutation = proposedMutationForRow({
    repairGroup: args.repairGroup,
    row: args.row,
    currentMappedFilterSlugs,
  });

  return {
    fridge_slug: slug,
    source_batch_id: args.batchId,
    repair_group: args.repairGroup,
    repo_classification: args.repoClassification,
    current_mapped_filter_slugs: currentMappedFilterSlugs,
    validated_target_filter_slug: validatedTarget,
    discovered_token: args.row.discovered_token ?? null,
    validation_verdict: args.row.cursor_verdict ?? "UNKNOWN",
    evidence_tier: evidenceTierForRow(args.row),
    recommended_owner_action: recommendedOwnerAction({
      repairGroup: args.repairGroup,
      row: args.row,
      proposedMutation,
      validatedTarget,
    }),
    proposed_mutation_type: proposedMutation,
    mutation_authorized: false,
    reason: args.row.reason ?? "",
  };
}

function loadValidationPacket(rootDir: string, relPath: string): CursorValidationPacketV1 {
  const packet = readJsonFile<CursorValidationPacketV1>(rootDir, relPath);
  if (packet.contract !== CURSOR_VALIDATION_PACKET_CONTRACT_V1) {
    throw new Error(`Cursor validation packet contract mismatch: ${relPath}`);
  }
  return packet;
}

function buildTokenIdentityConcerns(
  frig242017801Packet: CursorValidationPacketV1,
): TokenIdentityOwnerReviewConcernV1[] {
  const details = frig242017801Packet.validation_details;
  const tokenCheck = details?.token_identity_cross_check;
  const aliasLane = details?.alias_consolidation_lane_recommendation;
  if (!tokenCheck?.claim) {
    return [];
  }

  const batchId = details?.batch_id ?? "frig-242017801-bounded-evidence-slice-046fb82e";
  return [
    {
      concern_id: "242017801_ultrawf_duplicate_token",
      source_batch_id: batchId,
      claim: tokenCheck.claim,
      repo_ultrawf_slug: tokenCheck.repo_ultrawf_slug ?? "ultrawf",
      repo_frig_242017801_slug: tokenCheck.repo_frig_242017801_slug ?? "frig-242017801",
      cross_alias_in_repo: tokenCheck.cross_alias_between_ultrawf_and_frig_242017801_in_repo ?? false,
      consolidation_performed: false,
      consolidation_authorized: false,
      recommended_owner_action:
        "Separate owner-review lane for 242017801/ULTRAWF token consolidation — do not merge filters.csv rows or aliases without explicit owner approval.",
      separate_lane_title: aliasLane?.recommend_separate_owner_review_lane
        ? (aliasLane.lane_title ?? null)
        : null,
      rationale: aliasLane?.rationale ?? [
        tokenCheck.cursor_assessment ?? "External discovery only — repo duplicate catalog slugs remain.",
      ],
    },
  ];
}

function buildRepairGroups(args: {
  samsungPacket: CursorValidationPacketV1;
  wf2cbPacket: CursorValidationPacketV1;
  frig242017801Packet: CursorValidationPacketV1;
  auditBySlug: Map<string, string>;
  compatBySlug: Map<string, string[]>;
}): TruthRepairOwnerReviewSlugRowV1[] {
  const allRows: TruthRepairOwnerReviewSlugRowV1[] = [];

  const samsungBatchId =
    args.samsungPacket.validation_details?.batch_id ?? "samsung-bad-mapping-batch-001";
  for (const row of args.samsungPacket.validation_details?.row_verdicts ?? []) {
    if (!row.fridge_slug) continue;
    const slug = normalizeSlug(row.fridge_slug);
    const repairGroup = classifySamsungRepairGroup(row);
    allRows.push(
      buildSlugRow({
        row,
        batchId: samsungBatchId,
        repairGroup,
        repoClassification: args.auditBySlug.get(slug) ?? "WRONG_PART_RISK",
        compatBySlug: args.compatBySlug,
      }),
    );
  }

  const wf2cbBatchId =
    args.wf2cbPacket.validation_details?.batch_id ?? "wf2cb-bounded-evidence-slice-001";
  for (const row of args.wf2cbPacket.validation_details?.row_verdicts ?? []) {
    if (!row.fridge_slug) continue;
    const slug = normalizeSlug(row.fridge_slug);
    const repairGroup = classifyWf2cbRepairGroup(row);
    allRows.push(
      buildSlugRow({
        row,
        batchId: wf2cbBatchId,
        repairGroup,
        repoClassification:
          row.repo_classification ?? args.auditBySlug.get(slug) ?? "LIKELY_CORRECT_NEEDS_EVIDENCE",
        compatBySlug: args.compatBySlug,
      }),
    );
  }

  const frig242017801BatchId =
    args.frig242017801Packet.validation_details?.batch_id ??
    "frig-242017801-bounded-evidence-slice-046fb82e";
  for (const row of args.frig242017801Packet.validation_details?.row_verdicts ?? []) {
    if (!row.fridge_slug) continue;
    const slug = normalizeSlug(row.fridge_slug);
    const repairGroup = classifyFrig242017801RepairGroup(row);
    allRows.push(
      buildSlugRow({
        row,
        batchId: frig242017801BatchId,
        repairGroup,
        repoClassification:
          row.repo_classification ?? args.auditBySlug.get(slug) ?? "LIKELY_CORRECT_NEEDS_EVIDENCE",
        compatBySlug: args.compatBySlug,
      }),
    );
  }

  return allRows.sort((a, b) => a.fridge_slug.localeCompare(b.fridge_slug));
}

function groupRowsByRepairGroup(
  rows: TruthRepairOwnerReviewSlugRowV1[],
): TruthRepairOwnerReviewGroupV1[] {
  const grouped = new Map<RepairGroupV1, TruthRepairOwnerReviewSlugRowV1[]>();
  for (const group of REPAIR_GROUPS_V1) {
    grouped.set(group, []);
  }
  for (const row of rows) {
    grouped.get(row.repair_group)!.push(row);
  }

  return REPAIR_GROUPS_V1.map((repair_group) => {
    const slug_rows = grouped.get(repair_group) ?? [];
    const defaultBatchId = (() => {
      if (repair_group.startsWith("samsung")) return "samsung-bad-mapping-batch-001";
      if (repair_group.startsWith("frig_242017801")) {
        return "frig-242017801-bounded-evidence-slice-046fb82e";
      }
      return "wf2cb-bounded-evidence-slice-001";
    })();
    const batch_id = slug_rows[0]?.source_batch_id ?? defaultBatchId;
    return {
      repair_group,
      batch_id,
      slug_count: slug_rows.length,
      slug_rows,
    };
  });
}

function buildSummary(rows: TruthRepairOwnerReviewSlugRowV1[]): TruthRepairOwnerReviewSummaryV1 {
  const apply_candidate_count = rows.filter(
    (row) => row.repair_group === "samsung_pass_ready",
  ).length;
  const browser_proof_required_count = rows.filter(
    (row) =>
      row.repair_group === "samsung_partial_needs_browser_proof" ||
      row.repair_group === "wf2cb_partial_needs_browser_proof" ||
      row.repair_group === "frig_242017801_partial_needs_browser_proof",
  ).length;
  const phantom_or_suppression_review_count = rows.filter(
    (row) =>
      row.repair_group === "phantom_or_non_refrigerator_models" ||
      row.repair_group === "wf2cb_data_quality_defects" ||
      row.repair_group === "frig_242017801_phantom_typo_models",
  ).length;
  const no_action_count = rows.filter(
    (row) => row.proposed_mutation_type === "no_action",
  ).length;

  return {
    apply_candidate_count,
    browser_proof_required_count,
    phantom_or_suppression_review_count,
    no_action_count,
    total_slug_rows: rows.length,
  };
}

function buildScoreboardImpactEstimate(args: {
  rootDir: string;
  rows: TruthRepairOwnerReviewSlugRowV1[];
  now?: () => Date;
}): ScoreboardImpactEstimateV1 {
  const scoreboard = buildRefrigeratorTruthScoreboardV1({
    rootDir: args.rootDir,
    now: args.now,
  });
  const phantomSlugs = new Set<string>(PHANTOM_FILTER_SLUGS_V1);

  const applyCandidates = args.rows.filter((row) => row.repair_group === "samsung_pass_ready");
  const wrongPartApplyCandidates = applyCandidates.filter(
    (row) => row.repo_classification === "WRONG_PART_RISK",
  );

  let multiMappedReduction = 0;
  for (const row of applyCandidates) {
    if (row.current_mapped_filter_slugs.length > 1) {
      multiMappedReduction += 1;
    }
  }

  const phantomReductionFromApply = applyCandidates.filter((row) =>
    row.current_mapped_filter_slugs.some((slug) => phantomSlugs.has(slug)),
  ).length;

  const catalogReviewSlugs = args.rows.filter(
    (row) =>
      row.repair_group === "phantom_or_non_refrigerator_models" ||
      row.repair_group === "wf2cb_data_quality_defects" ||
      row.repair_group === "frig_242017801_phantom_typo_models",
  );

  const baselineWrong = scoreboard.counts.wrong_part_risk_count;
  const baselineMulti = scoreboard.counts.multi_mapped_count;
  const baselinePhantom = scoreboard.counts.phantom_model_count;

  const wrongReduction = wrongPartApplyCandidates.length;
  const phantomCatalogReview = catalogReviewSlugs.filter((row) =>
    row.current_mapped_filter_slugs.some((slug) => phantomSlugs.has(slug)),
  ).length;

  return {
    scoreboard_source_contract: REFRIGERATOR_TRUTH_SCOREBOARD_CONTRACT_V1,
    baseline_wrong_part_risk_count: baselineWrong,
    estimated_wrong_part_risk_reduction_if_owner_approved: wrongReduction,
    estimated_wrong_part_risk_count_after_apply: baselineWrong - wrongReduction,
    baseline_multi_mapped_count: baselineMulti,
    estimated_multi_mapped_reduction_if_owner_approved: multiMappedReduction,
    estimated_multi_mapped_count_after_apply: baselineMulti - multiMappedReduction,
    baseline_phantom_model_count: baselinePhantom,
    phantom_or_suppression_review_slug_count: catalogReviewSlugs.length,
    estimated_phantom_model_reduction_if_owner_approved: phantomReductionFromApply,
    estimated_phantom_model_count_after_catalog_review:
      baselinePhantom - phantomReductionFromApply - phantomCatalogReview,
    notes: [
      "Impact estimate assumes owner-approved samsung_pass_ready compat corrections only — no automatic apply.",
      "PARTIAL rows excluded from wrong_part_risk reduction until VALIDATION_PASS_READY_FOR_OWNER_REVIEW.",
      "Catalog suppression for phantom_or_non_refrigerator_models may change total_refrigerator_model_count separately.",
      `Apply candidates mapping ${PHANTOM_FILTER_SLUGS_V1.join("|")}: ${String(phantomReductionFromApply)} slug(s).`,
    ],
  };
}

function buildOwnerChecklist(summary: TruthRepairOwnerReviewSummaryV1): string[] {
  return [
    "repo_truth_closure_authorized=false — this packet does not close repo truth.",
    "No apply plan in this lane — owner must approve a separate compat apply packet before CSV edits.",
    `Review ${String(summary.apply_candidate_count)} samsung_pass_ready apply candidate(s) — owner approval required; mutation_authorized=false everywhere.`,
    `Queue owner-browser proof for ${String(summary.browser_proof_required_count)} slug(s) — PARTIAL verdicts are not apply-ready.`,
    `Resolve ${String(summary.phantom_or_suppression_review_count)} catalog integrity slug(s) before compat or evidence scaling.`,
    "Do not mutate compatibility_mappings.csv, filters.csv, fridge_models.csv, manual-evidence JSON, Supabase, pages, sitemap/robots, retailer links, or HQ handoff from this packet.",
    "WF2CB bounded slice rows remain owner-review until validation PASS exists — hold wf2cb removals.",
    "Frigidaire 242017801 bounded slice rows remain owner-review — 0 PASS rows; hold 6-filter co-map removals.",
    "242017801=ULTRAWF token identity is a separate owner-review concern — do not consolidate filters.csv or aliases without approval.",
    "Samsung PASS-ready rows may be grouped as owner-review apply candidates only — not applied automatically.",
  ];
}

export function buildRefrigeratorTruthRepairOwnerReviewV1(args: {
  rootDir: string;
  now?: () => Date;
}): RefrigeratorTruthRepairOwnerReviewV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  const samsungPacket = loadValidationPacket(
    args.rootDir,
    SAMSUNG_BAD_MAPPING_CURSOR_VALIDATION_JSON_REL_V1,
  );
  const wf2cbPacket = loadValidationPacket(args.rootDir, WF2CB_CURSOR_VALIDATION_JSON_REL_V1);
  const frig242017801Packet = loadValidationPacket(
    args.rootDir,
    FRIG_242017801_CURSOR_VALIDATION_JSON_REL_V1,
  );

  const modelAudit = readJsonFile<ModelFilterCorrectnessAuditV1>(
    args.rootDir,
    MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  );
  if (modelAudit.contract !== MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1) {
    throw new Error("Model filter correctness audit contract mismatch");
  }

  const auditBySlug = new Map(
    modelAudit.model_rows.map(
      (row) => [normalizeSlug(row.fridge_slug), row.classification] as const,
    ),
  );
  const compatBySlug = readCompatMappings(args.rootDir);

  const slugRows = buildRepairGroups({
    samsungPacket,
    wf2cbPacket,
    frig242017801Packet,
    auditBySlug,
    compatBySlug,
  });
  const repair_groups = groupRowsByRepairGroup(slugRows);
  const summary = buildSummary(slugRows);
  const token_identity_owner_review_concerns = buildTokenIdentityConcerns(frig242017801Packet);
  const scoreboard_impact_estimate = buildScoreboardImpactEstimate({
    rootDir: args.rootDir,
    rows: slugRows,
    now: args.now,
  });

  const exact_repo_paths_read = [
    SAMSUNG_BAD_MAPPING_CURSOR_VALIDATION_JSON_REL_V1,
    WF2CB_CURSOR_VALIDATION_JSON_REL_V1,
    FRIG_242017801_CURSOR_VALIDATION_JSON_REL_V1,
    MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
    COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    "scripts/lib/refrigerator-truth-scoreboard-v1.ts",
  ].sort();

  return {
    contract: REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    owner_review_required: true,
    repo_truth_closure_authorized: false,
    truth_closure_authorized: false,
    generated_at: generatedAt,
    source_command: REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_SOURCE_COMMAND_V1,
    source_validation_packets: [
      {
        batch_id: samsungPacket.validation_details?.batch_id ?? "samsung-bad-mapping-batch-001",
        rel_path: SAMSUNG_BAD_MAPPING_CURSOR_VALIDATION_JSON_REL_V1,
        validation_status: samsungPacket.validation_status ?? "UNKNOWN",
        mission_type: samsungPacket.validation_details?.mission_type ?? "BAD_MAPPING_RESEARCH",
        slug_count: samsungPacket.validation_details?.slug_count ?? 15,
        repo_truth_closure_authorized: false,
      },
      {
        batch_id: wf2cbPacket.validation_details?.batch_id ?? "wf2cb-bounded-evidence-slice-001",
        rel_path: WF2CB_CURSOR_VALIDATION_JSON_REL_V1,
        validation_status: wf2cbPacket.validation_status ?? "UNKNOWN",
        mission_type: wf2cbPacket.validation_details?.mission_type ?? "BOUNDED_EVIDENCE_SLICE",
        slug_count: wf2cbPacket.validation_details?.slug_count ?? 5,
        repo_truth_closure_authorized: false,
      },
      {
        batch_id:
          frig242017801Packet.validation_details?.batch_id ??
          "frig-242017801-bounded-evidence-slice-046fb82e",
        rel_path: FRIG_242017801_CURSOR_VALIDATION_JSON_REL_V1,
        validation_status: frig242017801Packet.validation_status ?? "UNKNOWN",
        mission_type:
          frig242017801Packet.validation_details?.mission_type ?? "BOUNDED_EVIDENCE_SLICE",
        slug_count: frig242017801Packet.validation_details?.slug_count ?? 4,
        repo_truth_closure_authorized: false,
      },
    ],
    repair_groups,
    summary,
    token_identity_owner_review_concerns,
    scoreboard_impact_estimate,
    owner_checklist: buildOwnerChecklist(summary),
    exact_repo_paths_read,
    proven_facts: [
      `PROVEN: Loaded ${String(slugRows.length)} slug rows from Samsung bad-mapping, WF2CB, and Frigidaire 242017801 bounded-slice cursor validation packets.`,
      `PROVEN: apply_candidate_count=${String(summary.apply_candidate_count)} (samsung_pass_ready only — no new PASS rows from 242017801).`,
      `PROVEN: browser_proof_required_count=${String(summary.browser_proof_required_count)} (PARTIAL verdict rows across all batches).`,
      `PROVEN: phantom_or_suppression_review_count=${String(summary.phantom_or_suppression_review_count)} catalog integrity rows.`,
      `PROVEN: token_identity_owner_review_concerns=${String(token_identity_owner_review_concerns.length)} (242017801=ULTRAWF duplicate token — consolidation not applied).`,
      `PROVEN: repo_truth_closure_authorized=false preserved on packet and source validation artifacts.`,
      `PROVEN: estimated_wrong_part_risk_reduction_if_owner_approved=${String(scoreboard_impact_estimate.estimated_wrong_part_risk_reduction_if_owner_approved)} from samsung_pass_ready cohort.`,
      "PROVEN: Read-only owner-review packet — no compat, evidence, Supabase, page, retailer-link, sitemap, robots, or HQ handoff mutations.",
    ],
    unknown_facts: [
      "UNKNOWN: Live Supabase compat rows vs committed CSV when owner executes approved repairs.",
      "UNKNOWN: Whether PARTIAL Samsung rows upgrade to PASS after owner Tier-1 capture.",
      "UNKNOWN: Catalog suppression outcome for frigidaire-cfse2333tb — suppress vs retarget CRSE233TB refrigerator.",
      "UNKNOWN: Whether frigidaire-frfs2623as merges into frigidaire-frss2623as or remains a distinct slug.",
      "UNKNOWN: Whether GRFS2633AF is real or GRFS2833AF is typo for GRFS2853AF until owner rating-plate proof.",
      "UNKNOWN: Whether 242017801/ULTRAWF alias consolidation will be owner-approved in a separate lane.",
    ],
  };
}

export function buildRefrigeratorTruthRepairOwnerReviewMarkdownV1(
  packet: RefrigeratorTruthRepairOwnerReviewV1,
): string {
  const lines: string[] = [
    "# Refrigerator truth repair owner review v1",
    "",
    `Generated: ${packet.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${packet.contract}\``,
    `- read_only: **true**`,
    `- data_mutation: **false**`,
    `- mutation_authorized: **false**`,
    `- owner_review_required: **true**`,
    `- repo_truth_closure_authorized: **false**`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| apply_candidate_count | ${String(packet.summary.apply_candidate_count)} |`,
    `| browser_proof_required_count | ${String(packet.summary.browser_proof_required_count)} |`,
    `| phantom_or_suppression_review_count | ${String(packet.summary.phantom_or_suppression_review_count)} |`,
    `| no_action_count | ${String(packet.summary.no_action_count)} |`,
    `| total_slug_rows | ${String(packet.summary.total_slug_rows)} |`,
    "",
    "## Scoreboard impact estimate (if owner-approved)",
    "",
    `| Metric | Baseline | After apply | Reduction |`,
    `| --- | ---: | ---: | ---: |`,
    `| wrong_part_risk_count | ${String(packet.scoreboard_impact_estimate.baseline_wrong_part_risk_count)} | ${String(packet.scoreboard_impact_estimate.estimated_wrong_part_risk_count_after_apply)} | ${String(packet.scoreboard_impact_estimate.estimated_wrong_part_risk_reduction_if_owner_approved)} |`,
    `| multi_mapped_count | ${String(packet.scoreboard_impact_estimate.baseline_multi_mapped_count)} | ${String(packet.scoreboard_impact_estimate.estimated_multi_mapped_count_after_apply)} | ${String(packet.scoreboard_impact_estimate.estimated_multi_mapped_reduction_if_owner_approved)} |`,
    `| phantom_model_count | ${String(packet.scoreboard_impact_estimate.baseline_phantom_model_count)} | ${String(packet.scoreboard_impact_estimate.estimated_phantom_model_count_after_catalog_review)} | ${String(packet.scoreboard_impact_estimate.estimated_phantom_model_reduction_if_owner_approved)} |`,
    "",
    "## Owner checklist",
    "",
    ...packet.owner_checklist.map((item) => `- ${item}`),
    "",
    "## Token identity owner-review concerns",
    "",
  ];

  if (packet.token_identity_owner_review_concerns.length === 0) {
    lines.push("_None._", "");
  } else {
    for (const concern of packet.token_identity_owner_review_concerns) {
      lines.push(`### ${concern.concern_id}`, "");
      lines.push(`- claim: **${concern.claim}**`);
      lines.push(`- repo slugs: \`${concern.repo_ultrawf_slug}\` + \`${concern.repo_frig_242017801_slug}\``);
      lines.push(`- cross_alias_in_repo: **${String(concern.cross_alias_in_repo)}**`);
      lines.push(`- consolidation_authorized: **false**`);
      if (concern.separate_lane_title) {
        lines.push(`- separate_lane: \`${concern.separate_lane_title}\``);
      }
      lines.push(`- action: ${concern.recommended_owner_action}`, "");
    }
  }

  for (const group of packet.repair_groups) {
    if (group.slug_count === 0) {
      lines.push(`## ${group.repair_group}`, "", "_None._", "");
      continue;
    }
    lines.push(`## ${group.repair_group} (${String(group.slug_count)})`, "");
    for (const row of group.slug_rows) {
      lines.push(
        `- \`${row.fridge_slug}\` — ${row.validation_verdict}; maps \`${row.current_mapped_filter_slugs.join("|")}\` → target \`${row.validated_target_filter_slug ?? "none"}\`; ${row.proposed_mutation_type}; mutation_authorized=false`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function writeRefrigeratorTruthRepairOwnerReviewArtifactsV1(args: {
  rootDir: string;
  packet: RefrigeratorTruthRepairOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.packet, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    buildRefrigeratorTruthRepairOwnerReviewMarkdownV1(args.packet),
    "utf8",
  );
  return {
    json_rel_path: REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_JSON_REL_V1,
    md_rel_path: REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_MD_REL_V1,
  };
}
