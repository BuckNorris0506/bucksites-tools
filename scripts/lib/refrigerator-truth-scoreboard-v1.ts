/**
 * Read-only REFRIGERATOR_TRUTH_SCOREBOARD_V1.
 * Rolls up refrigerator mapping truth from committed audit artifacts only.
 * Does not mutate compat, evidence, Supabase, pages, retailer links, sitemap, robots, or HQ handoff.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { listFridgeModelReviewOverrides } from "@/lib/fridge/fridge-model-review-overrides";

import {
  BAD_MAPPING_CORRECTION_BATCH_RUNNER_CONTRACT_V1,
  BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
  type BadMappingCorrectionBatchRunnerV1,
} from "./bad-mapping-correction-batch-runner-v1";
import { CURSOR_VALIDATION_PACKET_CONTRACT_V1 } from "./buckparts-ops-agent-workflow-v1";
import {
  EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1,
  EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
  type EvidenceLeverageFamilyRowV1,
  type EvidenceLeveragePrioritizationV1,
} from "./evidence-leverage-prioritization-v1";
import {
  FAMILY_RECONCILIATION_CONTRACT_V1,
  FAMILY_RECONCILIATION_JSON_REL_V1,
  type FamilyReconciliationBacklogItemV1,
  type FamilyReconciliationV1,
  type ReconciliationSeverityV1,
} from "./family-reconciliation-v1";
import {
  buildHyperAgentDispatchRegistryV1,
  HYPERAGENT_DISPATCH_REGISTRY_CONTRACT_V1,
  type HyperAgentDispatchRegistryV1,
} from "./hyperagent-dispatch-registry-v1";
import {
  MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
  MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  type ModelFilterCorrectnessAuditV1,
  type ModelFilterCorrectnessRowV1,
} from "./model-filter-correctness-audit-v1";

export const REFRIGERATOR_TRUTH_SCOREBOARD_CONTRACT_V1 =
  "refrigerator_truth_scoreboard_v1" as const;

/** Repo-proven phantom catalog filter slugs (no manufacturer corroboration anywhere in repo). */
export const PHANTOM_FILTER_SLUGS_V1 = ["da29-10105j"] as const;

export const CURSOR_VALIDATED_CORRECT_VERDICT_V1 =
  "VALIDATION_PASS_READY_FOR_OWNER_REVIEW" as const;

export type TruthScoreboardCountsV1 = {
  total_refrigerator_model_count: number;
  proven_correct_count: number;
  validated_correct_count: number;
  needs_evidence_count: number;
  wrong_part_risk_count: number;
  multi_mapped_count: number;
  phantom_model_count: number;
  owner_review_required_count: number;
};

export type TruthScoreboardRiskFamilyRowV1 = {
  rank: number;
  family_key: string;
  target_filter_slug: string;
  severity: ReconciliationSeverityV1;
  reconciliation_score: number;
  model_line_conflict_count: number;
  estimated_factory_unlock_score: number;
  owner_review_packet_id: string;
};

export type TruthScoreboardLeverageFamilyRowV1 = {
  rank: number;
  family_key: string;
  family_kind: EvidenceLeverageFamilyRowV1["family_kind"];
  estimated_factory_unlock_score: number;
  models_unlocked_if_completed: number;
  currently_proven_count: number;
  currently_unproven_count: number;
  wrong_part_risk_count: number;
  blocked_count: number;
  evidence_gap_type: string;
  representative_slugs: string[];
};

export type RefrigeratorTruthScoreboardV1 = {
  contract: typeof REFRIGERATOR_TRUTH_SCOREBOARD_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  source_contracts: {
    model_filter_correctness_audit: typeof MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1;
    family_reconciliation: typeof FAMILY_RECONCILIATION_CONTRACT_V1;
    bad_mapping_correction_batch_runner: typeof BAD_MAPPING_CORRECTION_BATCH_RUNNER_CONTRACT_V1;
    evidence_leverage_prioritization: typeof EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1;
    hyperagent_dispatch_registry: typeof HYPERAGENT_DISPATCH_REGISTRY_CONTRACT_V1;
    hyperagent_cursor_validation: typeof CURSOR_VALIDATION_PACKET_CONTRACT_V1;
  };
  counts: TruthScoreboardCountsV1;
  top_25_highest_risk_families: TruthScoreboardRiskFamilyRowV1[];
  top_25_highest_leverage_families: TruthScoreboardLeverageFamilyRowV1[];
  hyperagent_validation_summary: {
    cursor_validation_packets_loaded: number;
    validated_correct_slugs: string[];
    owner_review_slug_count_from_cursor_validation: number;
  };
  dispatch_registry_summary: {
    frozen_family_count: number;
    owner_review_ready_family_count: number;
    redispatch_blocked_dedup_key_count: number;
  };
  inspect_summary: {
    recommended_jq_paths: {
      standalone_report: ".counts";
      top_25_highest_risk_families: ".top_25_highest_risk_families";
      top_25_highest_leverage_families: ".top_25_highest_leverage_families";
    };
    recommended_next_action: string;
  };
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

type CursorValidationRowV1 = {
  fridge_slug?: string;
  cursor_verdict?: string;
  cursor_row_state?: string;
};

type CursorValidationPacketV1 = {
  contract?: string;
  owner_review_required?: boolean;
  validation_details?: {
    row_verdicts?: CursorValidationRowV1[];
  };
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function readJsonFile<T>(rootDir: string, relPath: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as T;
}

function loadCursorValidationPackets(rootDir: string): {
  packets: CursorValidationPacketV1[];
  paths: string[];
} {
  const paths: string[] = [];
  const packets: CursorValidationPacketV1[] = [];
  const draftsDir = path.join(rootDir, "data/fridge/batch-production/drafts");
  if (!existsSync(draftsDir)) {
    return { packets, paths };
  }

  for (const file of readdirSync(draftsDir)) {
    if (!file.endsWith(".json") || !file.includes("cursor-validation")) continue;
    const rel = `data/fridge/batch-production/drafts/${file}`;
    paths.push(rel);
    try {
      const parsed = readJsonFile<CursorValidationPacketV1>(rootDir, rel);
      if (parsed.contract !== CURSOR_VALIDATION_PACKET_CONTRACT_V1) continue;
      packets.push(parsed);
    } catch {
      // skip malformed packets
    }
  }

  return { packets, paths };
}

function collectValidatedCorrectSlugs(packets: CursorValidationPacketV1[]): Set<string> {
  const slugs = new Set<string>();
  for (const packet of packets) {
    for (const row of packet.validation_details?.row_verdicts ?? []) {
      if (!row.fridge_slug) continue;
      if (row.cursor_verdict === CURSOR_VALIDATED_CORRECT_VERDICT_V1) {
        slugs.add(normalizeSlug(row.fridge_slug));
      }
    }
  }
  return slugs;
}

function collectOwnerReviewSlugsFromCursorValidation(
  packets: CursorValidationPacketV1[],
): Set<string> {
  const slugs = new Set<string>();
  for (const packet of packets) {
    for (const row of packet.validation_details?.row_verdicts ?? []) {
      if (!row.fridge_slug || !row.cursor_verdict) continue;
      if (row.cursor_verdict !== CURSOR_VALIDATED_CORRECT_VERDICT_V1) {
        slugs.add(normalizeSlug(row.fridge_slug));
      }
    }
  }
  return slugs;
}

function countPhantomModels(rows: ModelFilterCorrectnessRowV1[]): number {
  const phantomSlugs = new Set<string>(PHANTOM_FILTER_SLUGS_V1);
  return rows.filter((row) =>
    row.mapped_filter_slugs.some((slug) => phantomSlugs.has(normalizeSlug(slug))),
  ).length;
}

function countMultiMapped(rows: ModelFilterCorrectnessRowV1[]): number {
  return rows.filter((row) => row.mapped_filter_slugs.length > 1).length;
}

function buildRiskFamilies(
  reconciliation: FamilyReconciliationV1,
): TruthScoreboardRiskFamilyRowV1[] {
  return reconciliation.ranked_reconciliation_backlog
    .slice(0, 25)
    .map((row: FamilyReconciliationBacklogItemV1, index) => ({
      rank: index + 1,
      family_key: row.family_key,
      target_filter_slug: row.target_filter_slug,
      severity: row.severity,
      reconciliation_score: row.reconciliation_score,
      model_line_conflict_count: row.model_line_conflict_count,
      estimated_factory_unlock_score: row.estimated_factory_unlock_score,
      owner_review_packet_id: row.owner_review_packet_id,
    }));
}

function buildLeverageFamilies(
  leverage: EvidenceLeveragePrioritizationV1,
): TruthScoreboardLeverageFamilyRowV1[] {
  const combined = [...leverage.filter_families, ...leverage.model_families]
    .sort(
      (a, b) =>
        b.estimated_factory_unlock_score - a.estimated_factory_unlock_score ||
        a.family_key.localeCompare(b.family_key),
    )
    .slice(0, 25);

  return combined.map((row, index) => ({
    rank: index + 1,
    family_key: row.family_key,
    family_kind: row.family_kind,
    estimated_factory_unlock_score: row.estimated_factory_unlock_score,
    models_unlocked_if_completed: row.models_unlocked_if_completed,
    currently_proven_count: row.currently_proven_count,
    currently_unproven_count: row.currently_unproven_count,
    wrong_part_risk_count: row.wrong_part_risk_count,
    blocked_count: row.blocked_count,
    evidence_gap_type: row.evidence_gap_type,
    representative_slugs: row.representative_slugs.slice(0, 6),
  }));
}

function collectOwnerReviewRequiredSlugs(args: {
  auditRows: ModelFilterCorrectnessRowV1[];
  badMapping: BadMappingCorrectionBatchRunnerV1;
  reconciliation: FamilyReconciliationV1;
  cursorOwnerReviewSlugs: Set<string>;
  dispatchRegistry: HyperAgentDispatchRegistryV1;
}): Set<string> {
  const slugs = new Set<string>();

  for (const row of args.auditRows) {
    if (row.classification === "BLOCKED") {
      slugs.add(normalizeSlug(row.fridge_slug));
    }
  }

  for (const override of listFridgeModelReviewOverrides()) {
    slugs.add(normalizeSlug(override.fridge_model_slug));
  }

  for (const packet of args.badMapping.correction_packets) {
    if (packet.owner_approval_required) {
      slugs.add(normalizeSlug(packet.fridge_slug));
    }
  }

  for (const packet of args.reconciliation.owner_review_packets) {
    for (const slugRow of packet.slug_rows) {
      slugs.add(normalizeSlug(slugRow.fridge_slug));
    }
  }

  for (const slug of Array.from(args.cursorOwnerReviewSlugs)) {
    slugs.add(slug);
  }

  for (const familyKey of args.dispatchRegistry.owner_review_ready_family_keys) {
    const familyPacket = args.reconciliation.owner_review_packets.find(
      (packet) => packet.family_key === familyKey,
    );
    if (!familyPacket) continue;
    for (const slugRow of familyPacket.slug_rows) {
      slugs.add(normalizeSlug(slugRow.fridge_slug));
    }
  }

  return slugs;
}

function recommendedNextAction(counts: TruthScoreboardCountsV1): string {
  if (counts.wrong_part_risk_count > 0) {
    return "Prioritize bad-mapping correction batches and family reconciliation for WRONG_PART_RISK slugs before evidence scaling.";
  }
  if (counts.needs_evidence_count > counts.proven_correct_count) {
    return "Run bounded HyperAgent evidence slices on highest-leverage non-frozen families while holding compat mutations behind owner review.";
  }
  return "Continue page-factory scaling on proven_correct cohort subject to quality gate and buy-path gates.";
}

export function buildRefrigeratorTruthScoreboardV1(args: {
  rootDir: string;
  now?: () => Date;
}): RefrigeratorTruthScoreboardV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  const audit = readJsonFile<ModelFilterCorrectnessAuditV1>(
    args.rootDir,
    MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  );
  const reconciliation = readJsonFile<FamilyReconciliationV1>(
    args.rootDir,
    FAMILY_RECONCILIATION_JSON_REL_V1,
  );
  const badMapping = readJsonFile<BadMappingCorrectionBatchRunnerV1>(
    args.rootDir,
    BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
  );
  const leverage = readJsonFile<EvidenceLeveragePrioritizationV1>(
    args.rootDir,
    EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
  );
  const dispatchRegistry = buildHyperAgentDispatchRegistryV1({
    rootDir: args.rootDir,
    now: args.now,
  });

  const { packets: cursorPackets, paths: cursorPaths } = loadCursorValidationPackets(args.rootDir);
  const validatedCorrectSlugs = collectValidatedCorrectSlugs(cursorPackets);
  const cursorOwnerReviewSlugs = collectOwnerReviewSlugsFromCursorValidation(cursorPackets);

  const auditRows = audit.model_rows;
  const ownerReviewSlugs = collectOwnerReviewRequiredSlugs({
    auditRows,
    badMapping,
    reconciliation,
    cursorOwnerReviewSlugs,
    dispatchRegistry,
  });

  const counts: TruthScoreboardCountsV1 = {
    total_refrigerator_model_count: audit.total_models,
    proven_correct_count: audit.classification_counts.PROVEN_CORRECT,
    validated_correct_count: validatedCorrectSlugs.size,
    needs_evidence_count:
      audit.classification_counts.LIKELY_CORRECT_NEEDS_EVIDENCE +
      audit.classification_counts.UNKNOWN,
    wrong_part_risk_count: audit.classification_counts.WRONG_PART_RISK,
    multi_mapped_count: countMultiMapped(auditRows),
    phantom_model_count: countPhantomModels(auditRows),
    owner_review_required_count: ownerReviewSlugs.size,
  };

  const exact_repo_paths_read = [
    MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
    FAMILY_RECONCILIATION_JSON_REL_V1,
    BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
    EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
    ...cursorPaths,
    ...dispatchRegistry.exact_repo_paths_read,
    "src/lib/fridge/fridge-model-review-overrides.ts",
  ].sort();

  const topRisk = buildRiskFamilies(reconciliation);
  const topLeverage = buildLeverageFamilies(leverage);

  return {
    contract: REFRIGERATOR_TRUTH_SCOREBOARD_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: generatedAt,
    source_contracts: {
      model_filter_correctness_audit: MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
      family_reconciliation: FAMILY_RECONCILIATION_CONTRACT_V1,
      bad_mapping_correction_batch_runner: BAD_MAPPING_CORRECTION_BATCH_RUNNER_CONTRACT_V1,
      evidence_leverage_prioritization: EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1,
      hyperagent_dispatch_registry: HYPERAGENT_DISPATCH_REGISTRY_CONTRACT_V1,
      hyperagent_cursor_validation: CURSOR_VALIDATION_PACKET_CONTRACT_V1,
    },
    counts,
    top_25_highest_risk_families: topRisk,
    top_25_highest_leverage_families: topLeverage,
    hyperagent_validation_summary: {
      cursor_validation_packets_loaded: cursorPackets.length,
      validated_correct_slugs: Array.from(validatedCorrectSlugs).sort((a, b) => a.localeCompare(b)),
      owner_review_slug_count_from_cursor_validation: cursorOwnerReviewSlugs.size,
    },
    dispatch_registry_summary: {
      frozen_family_count: dispatchRegistry.frozen_family_keys.length,
      owner_review_ready_family_count: dispatchRegistry.owner_review_ready_family_keys.length,
      redispatch_blocked_dedup_key_count: dispatchRegistry.redispatch_blocked_dedup_keys.length,
    },
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".counts",
        top_25_highest_risk_families: ".top_25_highest_risk_families",
        top_25_highest_leverage_families: ".top_25_highest_leverage_families",
      },
      recommended_next_action: recommendedNextAction(counts),
    },
    exact_repo_paths_read,
    proven_facts: [
      `PROVEN: total_refrigerator_model_count=${String(counts.total_refrigerator_model_count)} from ${MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1}.`,
      `PROVEN: proven_correct_count=${String(counts.proven_correct_count)} (classification PROVEN_CORRECT).`,
      `PROVEN: wrong_part_risk_count=${String(counts.wrong_part_risk_count)} (classification WRONG_PART_RISK).`,
      `PROVEN: phantom_model_count=${String(counts.phantom_model_count)} (maps include ${PHANTOM_FILTER_SLUGS_V1.join("|")}).`,
      `PROVEN: validated_correct_count=${String(counts.validated_correct_count)} slugs with cursor_verdict=${CURSOR_VALIDATED_CORRECT_VERDICT_V1}.`,
      `PROVEN: top risk family=${topRisk[0]?.family_key ?? "none"} severity=${topRisk[0]?.severity ?? "none"}.`,
      `PROVEN: top leverage family=${topLeverage[0]?.family_key ?? "none"} unlock_score=${String(topLeverage[0]?.estimated_factory_unlock_score ?? 0)}.`,
      "PROVEN: Read-only scoreboard — no compat, evidence, Supabase, page, retailer link, sitemap, robots, or HQ handoff mutations.",
    ],
    unknown_facts: [
      "UNKNOWN: Live Supabase fridge_models / compatibility_mappings vs committed CSV — scoreboard uses committed audit artifacts only.",
      "UNKNOWN: Whether validated_correct slugs will remain correct after owner-approved compat edits.",
      "UNKNOWN: Full phantom-token catalog beyond repo-proven da29-10105j — additional phantom slugs may exist outside current HyperAgent batches.",
    ],
  };
}
