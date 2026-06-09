/**
 * Read-only HYPERAGENT_WORK_QUEUE_V1 — derived queue answering
 * "What should HyperAgent work on next?"
 * HyperAgent creates evidence, not repo truth.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  BAD_MAPPING_CORRECTION_BATCH_RUNNER_CONTRACT_V1,
  BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
  buildBadMappingCorrectionBatchRunnerV1,
  type BadMappingCorrectionBatchRunnerV1,
  type HyperAgentResearchBatchGroupV1,
} from "./bad-mapping-correction-batch-runner-v1";
import {
  buildCommandCenterControlGraphRollupV1,
  type CommandCenterControlGraphRollupV1,
  type ControlGraphNextBestActionRankedItemV1,
  type RecommendedActionScopeV1,
} from "./command-center-control-graph-rollup-v1";
import {
  EDR4RXD1_CURSOR_VALIDATION_JSON_REL_V1,
  EDR4RXD1_FAMILY_KEY_V1,
  EDR4RXD1_OWNER_REVIEW_PACKET_CONTRACT_V1,
  EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1,
} from "./edr4rxd1-owner-review-packet-v1";
import {
  buildFamilyPreResearchRiskScreenV1,
  type FamilyPreResearchRiskScreenV1,
} from "./family-pre-research-risk-screen-v1";
import {
  buildFamilyReconciliationV1,
  FAMILY_RECONCILIATION_CONTRACT_V1,
  FAMILY_RECONCILIATION_JSON_REL_V1,
  FAMILY_RECONCILIATION_OWNER_PACKET_DIR_REL_V1,
  type FamilyReconciliationV1,
  type ReconciliationSeverityV1,
} from "./family-reconciliation-v1";

export const HYPERAGENT_WORK_QUEUE_CONTRACT_V1 = "hyperagent_work_queue_v1" as const;

export const HYPERAGENT_WORK_QUEUE_MISSION_TYPES_V1 = [
  "EVIDENCE_CAPTURE",
  "BAD_MAPPING_RESEARCH",
  "BOUNDED_EVIDENCE_SLICE",
] as const;

export type HyperAgentWorkQueueMissionTypeV1 =
  (typeof HYPERAGENT_WORK_QUEUE_MISSION_TYPES_V1)[number];

export type HyperAgentWorkQueueItemV1 = {
  queue_item_id: string;
  rank: number;
  mission_type: HyperAgentWorkQueueMissionTypeV1;
  title: string;
  scope_key: string;
  family_key: string | null;
  slug_batch: string[];
  leverage_score: number;
  safety_tier: ControlGraphNextBestActionRankedItemV1["safety_tier"] | "BAD_MAPPING_RESEARCH";
  recommended_action_scope: RecommendedActionScopeV1 | "DANGEROUS_REMEDIATION_ONLY";
  hyperagent_dispatch_authorized: boolean;
  eligible_now: boolean;
  blocked_reasons: string[];
  exact_hyperagent_prompt: string | null;
  owner_review_packet_rel_path: string | null;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  why: string;
};

export type HyperAgentWorkQueueV1 = {
  contract: typeof HYPERAGENT_WORK_QUEUE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  next_eligible_item: HyperAgentWorkQueueItemV1 | null;
  blocked_items: HyperAgentWorkQueueItemV1[];
  owner_review_ready_items: HyperAgentWorkQueueItemV1[];
  items: HyperAgentWorkQueueItemV1[];
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

const MISSION_TYPE_DISPATCH_PRIORITY_V1: Record<HyperAgentWorkQueueMissionTypeV1, number> = {
  EVIDENCE_CAPTURE: 2,
  BAD_MAPPING_RESEARCH: 4,
  BOUNDED_EVIDENCE_SLICE: 5,
};

function dispatchPriority(item: HyperAgentWorkQueueItemV1): number {
  if (item.mission_type === "EVIDENCE_CAPTURE") {
    if (item.safety_tier === "SAFE_EVIDENCE") return 1;
    if (item.safety_tier === "BOUNDED_EVIDENCE_RESEARCH") return 2;
    return 3;
  }
  return MISSION_TYPE_DISPATCH_PRIORITY_V1[item.mission_type];
}

function stableQueueItemId(scopeKey: string, missionType: string): string {
  return createHash("sha256").update(`${missionType}:${scopeKey}`).digest("hex").slice(0, 16);
}

function loadBadMappingRunner(rootDir: string): BadMappingCorrectionBatchRunnerV1 {
  const abs = path.join(rootDir, BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1);
  if (existsSync(abs)) {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as BadMappingCorrectionBatchRunnerV1;
    if (parsed.contract === BAD_MAPPING_CORRECTION_BATCH_RUNNER_CONTRACT_V1) {
      return parsed;
    }
  }
  return buildBadMappingCorrectionBatchRunnerV1({ rootDir });
}

function loadFamilyReconciliation(rootDir: string): FamilyReconciliationV1 {
  const abs = path.join(rootDir, FAMILY_RECONCILIATION_JSON_REL_V1);
  if (existsSync(abs)) {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as FamilyReconciliationV1;
    if (parsed.contract === FAMILY_RECONCILIATION_CONTRACT_V1) {
      return parsed;
    }
  }
  return buildFamilyReconciliationV1({ rootDir });
}

type OwnerReviewReadyEntryV1 = {
  family_key: string;
  owner_review_packet_rel_path: string;
  cursor_validation_rel_path: string | null;
  validation_status: string | null;
};

function detectOwnerReviewReadyFamilies(rootDir: string): OwnerReviewReadyEntryV1[] {
  const ready: OwnerReviewReadyEntryV1[] = [];

  const edr4Abs = path.join(rootDir, EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1);
  if (existsSync(edr4Abs)) {
    try {
      const packet = JSON.parse(readFileSync(edr4Abs, "utf8")) as {
        contract?: string;
        family_key?: string;
        validation_status?: string;
      };
      if (packet.contract === EDR4RXD1_OWNER_REVIEW_PACKET_CONTRACT_V1) {
        const cursorAbs = path.join(rootDir, EDR4RXD1_CURSOR_VALIDATION_JSON_REL_V1);
        ready.push({
          family_key: packet.family_key ?? EDR4RXD1_FAMILY_KEY_V1,
          owner_review_packet_rel_path: EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1,
          cursor_validation_rel_path: existsSync(cursorAbs)
            ? EDR4RXD1_CURSOR_VALIDATION_JSON_REL_V1
            : null,
          validation_status: packet.validation_status ?? null,
        });
      }
    } catch {
      // skip malformed packet
    }
  }

  const ownerPacketDir = path.join(rootDir, FAMILY_RECONCILIATION_OWNER_PACKET_DIR_REL_V1);
  if (existsSync(ownerPacketDir)) {
    for (const file of readdirSync(ownerPacketDir)) {
      if (!file.endsWith(".json")) continue;
      const relPath = `${FAMILY_RECONCILIATION_OWNER_PACKET_DIR_REL_V1}/${file}`;
      try {
        const packet = JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as {
          contract?: string;
          family_key?: string;
          slug_rows?: Array<{ hyperagent_cursor_row_state: string | null }>;
        };
        if (packet.contract !== "family_reconciliation_owner_review_packet_v1") continue;
        if (!packet.family_key) continue;
        if (ready.some((row) => row.family_key === packet.family_key)) continue;
        const hasCursorOverlay = (packet.slug_rows ?? []).some(
          (row) => row.hyperagent_cursor_row_state != null,
        );
        if (!hasCursorOverlay) continue;
        ready.push({
          family_key: packet.family_key,
          owner_review_packet_rel_path: relPath,
          cursor_validation_rel_path: null,
          validation_status: null,
        });
      } catch {
        // skip malformed packet
      }
    }
  }

  return ready;
}

function isFrozenFamily(
  familyKey: string,
  rollup: CommandCenterControlGraphRollupV1,
): boolean {
  return rollup.frozen_family_summary.frozen_families.some(
    (row) => row.family_key === familyKey,
  );
}

function isOwnerReviewReadyFamily(
  familyKey: string,
  ownerReviewReady: OwnerReviewReadyEntryV1[],
): OwnerReviewReadyEntryV1 | null {
  return ownerReviewReady.find((row) => row.family_key === familyKey) ?? null;
}

function buildEvidenceCaptureItem(args: {
  ranked: ControlGraphNextBestActionRankedItemV1;
  screen: FamilyPreResearchRiskScreenV1 | null;
  ownerReviewReady: OwnerReviewReadyEntryV1[];
  rollup: CommandCenterControlGraphRollupV1;
  rank: number;
}): HyperAgentWorkQueueItemV1 {
  const familyKey = args.ranked.family_key;
  const scopeKey = familyKey ?? args.ranked.action.slice(0, 64);
  const ownerReady = familyKey ? isOwnerReviewReadyFamily(familyKey, args.ownerReviewReady) : null;
  const frozen = familyKey ? isFrozenFamily(familyKey, args.rollup) : false;

  const slugBatch = args.screen?.exact_slug_batch_for_research ?? [];
  const blocked_reasons: string[] = [];

  if (frozen) {
    blocked_reasons.push(`family_frozen:${familyKey}`);
  }
  if (ownerReady) {
    blocked_reasons.push(`owner_review_ready:${ownerReady.owner_review_packet_rel_path}`);
  }
  if (args.ranked.safety_tier === "FREEZE") {
    blocked_reasons.push("control_graph_freeze_tier");
  }
  if (
    args.ranked.recommended_action_scope === "FREEZE_NO_DISPATCH" ||
    args.ranked.recommended_action_scope === "DANGEROUS_REMEDIATION_ONLY"
  ) {
    blocked_reasons.push(`scope_blocked:${args.ranked.recommended_action_scope}`);
  }
  if (
    args.screen &&
    args.screen.recommendation === "NEEDS_REPO_RECONCILIATION_FIRST" &&
    slugBatch.length === 0
  ) {
    blocked_reasons.push("pre_research_needs_reconciliation_no_bounded_slice");
  }
  if (
    args.screen &&
    args.screen.recommendation === "FREEZE_FAMILY"
  ) {
    blocked_reasons.push("pre_research_freeze_family");
  }
  if (
    familyKey &&
    !args.ranked.safe_for_bounded_research &&
    args.ranked.recommended_action_scope !== "BOUNDED_RESEARCH_ONLY"
  ) {
    blocked_reasons.push("not_safe_for_bounded_research");
  }

  const fullFamilyBlocked =
    args.screen?.recommendation === "NEEDS_REPO_RECONCILIATION_FIRST" ||
    (args.ranked.family_reconciliation_severity != null &&
      args.ranked.family_reconciliation_severity !== "NONE" &&
      args.ranked.family_reconciliation_severity !== "LOW" &&
      args.ranked.safe_for_scaling === false);

  if (fullFamilyBlocked && slugBatch.length === 0) {
    blocked_reasons.push("reconciliation_blocks_full_family_dispatch");
  }

  const mission_type: HyperAgentWorkQueueMissionTypeV1 =
    slugBatch.length > 0 && fullFamilyBlocked
      ? "BOUNDED_EVIDENCE_SLICE"
      : "EVIDENCE_CAPTURE";

  const hyperagent_dispatch_authorized =
    !frozen &&
    !ownerReady &&
    (blocked_reasons.length === 0 ||
      (slugBatch.length > 0 &&
        args.ranked.recommended_action_scope === "BOUNDED_RESEARCH_ONLY" &&
        args.ranked.safe_for_bounded_research));

  const eligible_now =
    hyperagent_dispatch_authorized &&
    !ownerReady &&
    !frozen &&
    (blocked_reasons.length === 0 ||
      (slugBatch.length > 0 &&
        mission_type === "BOUNDED_EVIDENCE_SLICE" &&
        args.ranked.safe_for_bounded_research));

  return {
    queue_item_id: stableQueueItemId(scopeKey, mission_type),
    rank: args.rank,
    mission_type,
    title: args.ranked.action,
    scope_key: scopeKey,
    family_key: familyKey,
    slug_batch: slugBatch,
    leverage_score: args.ranked.leverage_score,
    safety_tier: args.ranked.safety_tier,
    recommended_action_scope: args.ranked.recommended_action_scope,
    hyperagent_dispatch_authorized,
    eligible_now,
    blocked_reasons,
    exact_hyperagent_prompt: null,
    owner_review_packet_rel_path: ownerReady?.owner_review_packet_rel_path ?? null,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    why: args.ranked.why,
  };
}

function buildBadMappingResearchItem(args: {
  badMapping: BadMappingCorrectionBatchRunnerV1;
  batchGroups: HyperAgentResearchBatchGroupV1[];
  rank: number;
}): HyperAgentWorkQueueItemV1 {
  const slugBatch = args.badMapping.recommended_first_batch_slugs;
  const scopeKey = `bad_mapping:${slugBatch.slice(0, 3).join(",")}`;
  const prompt = args.batchGroups
    .filter((group) => group.fridge_slugs.some((slug) => slugBatch.includes(slug)))
    .map((group) => group.hyperagent_research_prompt)
    .join("\n\n---\n\n");

  return {
    queue_item_id: stableQueueItemId(scopeKey, "BAD_MAPPING_RESEARCH"),
    rank: args.rank,
    mission_type: "BAD_MAPPING_RESEARCH",
    title: args.badMapping.inspect_summary.recommended_next_action,
    scope_key: scopeKey,
    family_key: null,
    slug_batch: slugBatch,
    leverage_score: 0,
    safety_tier: "BAD_MAPPING_RESEARCH",
    recommended_action_scope: "DANGEROUS_REMEDIATION_ONLY",
    hyperagent_dispatch_authorized: slugBatch.length > 0,
    eligible_now: slugBatch.length > 0,
    blocked_reasons: slugBatch.length === 0 ? ["no_recommended_first_batch_slugs"] : [],
    exact_hyperagent_prompt: prompt || null,
    owner_review_packet_rel_path: null,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    why: "Dangerous-mapping correction runner queues HyperAgent research for WRONG_PART_RISK slugs — lower safety tier than proven-cohort evidence leverage.",
  };
}

function buildOwnerReviewReadyItem(args: {
  entry: OwnerReviewReadyEntryV1;
  rollup: CommandCenterControlGraphRollupV1;
  rank: number;
}): HyperAgentWorkQueueItemV1 {
  const ranked = rollupEvidenceRankForFamily(args.rollup, args.entry.family_key);
  return {
    queue_item_id: stableQueueItemId(args.entry.family_key, "OWNER_REVIEW_READY"),
    rank: args.rank,
    mission_type: "EVIDENCE_CAPTURE",
    title: `Owner review ready — ${args.entry.family_key} (HyperAgent discovery ingested; await owner review, do not re-dispatch)`,
    scope_key: args.entry.family_key,
    family_key: args.entry.family_key,
    slug_batch: [],
    leverage_score: ranked?.leverage_score ?? 0,
    safety_tier: ranked?.safety_tier ?? "BOUNDED_EVIDENCE_RESEARCH",
    recommended_action_scope: ranked?.recommended_action_scope ?? "BOUNDED_RESEARCH_ONLY",
    hyperagent_dispatch_authorized: false,
    eligible_now: false,
    blocked_reasons: [
      "owner_review_ready",
      `owner_review_packet:${args.entry.owner_review_packet_rel_path}`,
    ],
    exact_hyperagent_prompt: null,
    owner_review_packet_rel_path: args.entry.owner_review_packet_rel_path,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    why: `Cursor validation ${args.entry.validation_status ?? "present"} and owner-review packet committed — HyperAgent research complete for this family; owner must close review before new dispatch.`,
  };
}

function rollupEvidenceRankForFamily(
  rollup: CommandCenterControlGraphRollupV1,
  familyKey: string,
): ControlGraphNextBestActionRankedItemV1 | null {
  return (
    rollup.next_best_action_ranked.find((item) => item.family_key === familyKey) ?? null
  );
}

function compareQueuePriority(a: HyperAgentWorkQueueItemV1, b: HyperAgentWorkQueueItemV1): number {
  const tierA = dispatchPriority(a);
  const tierB = dispatchPriority(b);
  if (tierA !== tierB) return tierA - tierB;
  if (b.leverage_score !== a.leverage_score) return b.leverage_score - a.leverage_score;
  return a.rank - b.rank;
}

function screenForFamily(args: {
  rootDir: string;
  familyKey: string;
  now?: () => Date;
}): FamilyPreResearchRiskScreenV1 | null {
  if (!args.familyKey.startsWith("filter::")) return null;
  try {
    return buildFamilyPreResearchRiskScreenV1({
      rootDir: args.rootDir,
      familyKey: args.familyKey,
      now: args.now,
    });
  } catch {
    return null;
  }
}

export function buildHyperAgentWorkQueueV1(args: {
  rootDir: string;
  now?: () => Date;
}): HyperAgentWorkQueueV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  const rollup = buildCommandCenterControlGraphRollupV1({
    rootDir: args.rootDir,
    now: args.now,
  });
  const badMapping = loadBadMappingRunner(args.rootDir);
  const reconciliation = loadFamilyReconciliation(args.rootDir);
  const ownerReviewReadyFamilies = detectOwnerReviewReadyFamilies(args.rootDir);

  const pathsRead = new Set<string>([
    FAMILY_RECONCILIATION_JSON_REL_V1,
    BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
    EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1,
    EDR4RXD1_CURSOR_VALIDATION_JSON_REL_V1,
    `${FAMILY_RECONCILIATION_OWNER_PACKET_DIR_REL_V1}/*.json`,
    "data/fridge/batch-production/drafts/*cursor-validation*.json",
    ...rollup.exact_repo_paths_read,
    ...badMapping.exact_repo_paths_read,
    ...reconciliation.exact_repo_paths_read,
  ]);

  const items: HyperAgentWorkQueueItemV1[] = [];
  let rank = 1;

  for (const ranked of rollup.next_best_action_ranked) {
    if (
      ranked.safety_tier !== "SAFE_EVIDENCE" &&
      ranked.safety_tier !== "BOUNDED_EVIDENCE_RESEARCH" &&
      ranked.safety_tier !== "PRE_RESEARCH_RECONCILIATION"
    ) {
      continue;
    }
    if (!ranked.family_key) continue;

    const screen = screenForFamily({
      rootDir: args.rootDir,
      familyKey: ranked.family_key,
      now: args.now,
    });

    items.push(
      buildEvidenceCaptureItem({
        ranked,
        screen,
        ownerReviewReady: ownerReviewReadyFamilies,
        rollup,
        rank: rank++,
      }),
    );
  }

  const matchingBatchGroups = badMapping.hyperagent_research_batch_groups.filter((group) =>
    group.fridge_slugs.some((slug) =>
      badMapping.recommended_first_batch_slugs.includes(slug),
    ),
  );
  items.push(
    buildBadMappingResearchItem({
      badMapping,
      batchGroups: matchingBatchGroups,
      rank: rank++,
    }),
  );

  const owner_review_ready_items: HyperAgentWorkQueueItemV1[] = ownerReviewReadyFamilies.map(
    (entry, index) =>
      buildOwnerReviewReadyItem({ entry, rollup, rank: index + 1 }),
  );

  const blocked_items = items.filter(
    (item) => !item.eligible_now && !owner_review_ready_items.some(
      (ready) => ready.family_key != null && ready.family_key === item.family_key,
    ),
  );

  const dispatchCandidates = items.filter((item) => {
    if (!item.eligible_now) return false;
    if (item.family_key && isOwnerReviewReadyFamily(item.family_key, ownerReviewReadyFamilies)) {
      return false;
    }
    return true;
  });

  dispatchCandidates.sort(compareQueuePriority);
  const next_eligible_item = dispatchCandidates[0] ?? null;

  const frozenKeys = rollup.frozen_family_summary.frozen_families.map((row) => row.family_key);

  return {
    contract: HYPERAGENT_WORK_QUEUE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: generatedAt,
    next_eligible_item,
    blocked_items,
    owner_review_ready_items,
    items,
    exact_repo_paths_read: [...pathsRead].sort(),
    proven_facts: [
      `PROVEN: queue_item_count=${String(items.length)} derived from command_center_control_graph_rollup_v1 and bad_mapping_correction_batch_runner_v1.`,
      `PROVEN: owner_review_ready_count=${String(owner_review_ready_items.length)}.`,
      `PROVEN: blocked_item_count=${String(blocked_items.length)}.`,
      `PROVEN: frozen_family_keys=${frozenKeys.join(", ") || "none"}.`,
      `PROVEN: highest_safe_screened_family=${rollup.pre_research_risk_screen_summary.highest_safe_screened_family_key ?? "none"}.`,
      next_eligible_item
        ? `PROVEN: next_eligible_item=${next_eligible_item.queue_item_id} mission_type=${next_eligible_item.mission_type} scope=${next_eligible_item.scope_key}.`
        : "PROVEN: next_eligible_item=null — no HyperAgent dispatch candidate after gates.",
      "PROVEN: Read-only derived queue — HyperAgent creates evidence, not repo truth; no compat, evidence, Supabase, or page mutation authorized.",
    ],
    unknown_facts: [
      "UNKNOWN: External HyperAgent Mission Control runtime state is not tracked in repo (Phase 0 — no state overlay).",
      "UNKNOWN: Live Supabase or unpublished draft state may differ from committed audit inputs.",
      rollup.education_opportunity_summary
        ? "UNKNOWN: Education opportunity artifact present but not enqueued in Phase 0."
        : "UNKNOWN: No committed education-opportunity-v1.json artifact in repo.",
    ],
  };
}
