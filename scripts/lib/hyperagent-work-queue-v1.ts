/**
 * Read-only HYPERAGENT_WORK_QUEUE_V1 — derived queue answering
 * "What should HyperAgent work on next?"
 * HyperAgent creates evidence, not repo truth.
 */

import { existsSync, readFileSync } from "node:fs";
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
  buildHyperAgentDispatchRegistryV1,
  hyperAgentDedupKeyV1,
  hyperAgentQueueItemIdV1,
  hyperAgentSlugBatchFingerprintV1,
  HYPERAGENT_DISPATCH_EVENTS_REL_V1,
  isHyperAgentRedispatchBlockedV1,
  type HyperAgentDispatchRegistryV1,
} from "./hyperagent-dispatch-registry-v1";
import {
  buildFamilyPreResearchRiskScreenV1,
  type FamilyPreResearchRiskScreenV1,
} from "./family-pre-research-risk-screen-v1";
import {
  buildFamilyReconciliationV1,
  FAMILY_RECONCILIATION_CONTRACT_V1,
  FAMILY_RECONCILIATION_JSON_REL_V1,
  type FamilyReconciliationV1,
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

function applyRegistryBlock(args: {
  registry: HyperAgentDispatchRegistryV1;
  item: HyperAgentWorkQueueItemV1;
}): HyperAgentWorkQueueItemV1 {
  const dedupKey = hyperAgentDedupKeyV1(args.item.mission_type, args.item.scope_key);
  const fingerprint = hyperAgentSlugBatchFingerprintV1(args.item.slug_batch);
  const block = isHyperAgentRedispatchBlockedV1({
    registry: args.registry,
    dedup_key: dedupKey,
    slug_batch_fingerprint: fingerprint,
    family_key: args.item.family_key,
    mission_type: args.item.mission_type,
  });

  if (!block.blocked) return args.item;

  return {
    ...args.item,
    hyperagent_dispatch_authorized: false,
    eligible_now: false,
    blocked_reasons: [...args.item.blocked_reasons, ...block.reasons],
  };
}

function buildEvidenceCaptureItem(args: {
  ranked: ControlGraphNextBestActionRankedItemV1;
  screen: FamilyPreResearchRiskScreenV1 | null;
  registry: HyperAgentDispatchRegistryV1;
  rollup: CommandCenterControlGraphRollupV1;
  rank: number;
}): HyperAgentWorkQueueItemV1 {
  const familyKey = args.ranked.family_key;
  const scopeKey = familyKey ?? args.ranked.action.slice(0, 64);
  const frozen = familyKey
    ? args.registry.frozen_family_keys.includes(familyKey)
    : false;
  const ownerReady = familyKey
    ? args.registry.owner_review_ready_family_keys.includes(familyKey)
    : false;
  const ownerEntry = ownerReady
    ? args.registry.entries.find(
        (entry) =>
          entry.status === "OWNER_REVIEW_READY" && entry.family_key === familyKey,
      )
    : null;

  const slugBatch = args.screen?.exact_slug_batch_for_research ?? [];
  const blocked_reasons: string[] = [];

  if (frozen) {
    blocked_reasons.push(`family_frozen:${familyKey}`);
  }
  if (ownerReady && ownerEntry) {
    blocked_reasons.push(
      `owner_review_ready:${ownerEntry.artifact_rel_paths[0] ?? familyKey}`,
    );
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
  if (args.screen && args.screen.recommendation === "FREEZE_FAMILY") {
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

  const base: HyperAgentWorkQueueItemV1 = {
    queue_item_id: hyperAgentQueueItemIdV1(mission_type, scopeKey),
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
    owner_review_packet_rel_path: ownerEntry?.artifact_rel_paths[0] ?? null,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    why: args.ranked.why,
  };

  return applyRegistryBlock({ registry: args.registry, item: base });
}

function buildBadMappingResearchItem(args: {
  badMapping: BadMappingCorrectionBatchRunnerV1;
  batchGroups: HyperAgentResearchBatchGroupV1[];
  registry: HyperAgentDispatchRegistryV1;
  rank: number;
}): HyperAgentWorkQueueItemV1 {
  const slugBatch = args.badMapping.recommended_first_batch_slugs;
  const scopeKey = `bad_mapping:${slugBatch.slice(0, 3).join(",")}`;
  const prompt = args.batchGroups
    .filter((group) => group.fridge_slugs.some((slug) => slugBatch.includes(slug)))
    .map((group) => group.hyperagent_research_prompt)
    .join("\n\n---\n\n");

  const base: HyperAgentWorkQueueItemV1 = {
    queue_item_id: hyperAgentQueueItemIdV1("BAD_MAPPING_RESEARCH", scopeKey),
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

  return applyRegistryBlock({ registry: args.registry, item: base });
}

function buildFrozenFamilyBlockedItem(args: {
  familyKey: string;
  freezeReason: string;
  registry: HyperAgentDispatchRegistryV1;
  rank: number;
}): HyperAgentWorkQueueItemV1 {
  return {
    queue_item_id: hyperAgentQueueItemIdV1("FROZEN", args.familyKey),
    rank: args.rank,
    mission_type: "EVIDENCE_CAPTURE",
    title: `Frozen family — ${args.familyKey} (HyperAgent dispatch blocked)`,
    scope_key: args.familyKey,
    family_key: args.familyKey,
    slug_batch: [],
    leverage_score: 0,
    safety_tier: "FREEZE",
    recommended_action_scope: "FREEZE_NO_DISPATCH",
    hyperagent_dispatch_authorized: false,
    eligible_now: false,
    blocked_reasons: [
      `family_frozen:${args.familyKey}`,
      `registry_frozen:${args.familyKey}`,
      `freeze_reason:${args.freezeReason}`,
    ],
    exact_hyperagent_prompt: null,
    owner_review_packet_rel_path: null,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    why: "Control graph frozen_family_summary blocks all HyperAgent evidence dispatch for this family.",
  };
}

function buildOwnerReviewReadyItem(args: {
  registry: HyperAgentDispatchRegistryV1;
  familyKey: string;
  rollup: CommandCenterControlGraphRollupV1;
  rank: number;
}): HyperAgentWorkQueueItemV1 {
  const entry = args.registry.entries.find(
    (row) => row.status === "OWNER_REVIEW_READY" && row.family_key === args.familyKey,
  );
  const ranked = rollupEvidenceRankForFamily(args.rollup, args.familyKey);
  return {
    queue_item_id: hyperAgentQueueItemIdV1("OWNER_REVIEW_READY", args.familyKey),
    rank: args.rank,
    mission_type: "EVIDENCE_CAPTURE",
    title: `Owner review ready — ${args.familyKey} (HyperAgent discovery ingested; await owner review, do not re-dispatch)`,
    scope_key: args.familyKey,
    family_key: args.familyKey,
    slug_batch: [],
    leverage_score: ranked?.leverage_score ?? 0,
    safety_tier: ranked?.safety_tier ?? "BOUNDED_EVIDENCE_RESEARCH",
    recommended_action_scope: ranked?.recommended_action_scope ?? "BOUNDED_RESEARCH_ONLY",
    hyperagent_dispatch_authorized: false,
    eligible_now: false,
    blocked_reasons: [
      "owner_review_ready",
      `registry_owner_review_ready:${args.familyKey}`,
      ...(entry ? [`owner_review_packet:${entry.artifact_rel_paths[0]}`] : []),
    ],
    exact_hyperagent_prompt: null,
    owner_review_packet_rel_path: entry?.artifact_rel_paths[0] ?? null,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    why: entry?.blocked_reason ??
      "Owner-review packet and cursor validation committed — HyperAgent research complete for this family.",
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
  dispatchRegistry?: HyperAgentDispatchRegistryV1;
  operatorEvents?: Parameters<typeof buildHyperAgentDispatchRegistryV1>[0]["operatorEvents"];
}): HyperAgentWorkQueueV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  const registry =
    args.dispatchRegistry ??
    buildHyperAgentDispatchRegistryV1({
      rootDir: args.rootDir,
      now: args.now,
      operatorEvents: args.operatorEvents,
    });

  const rollup = buildCommandCenterControlGraphRollupV1({
    rootDir: args.rootDir,
    now: args.now,
  });
  const badMapping = loadBadMappingRunner(args.rootDir);
  const reconciliation = loadFamilyReconciliation(args.rootDir);

  const pathsRead = new Set<string>([
    FAMILY_RECONCILIATION_JSON_REL_V1,
    BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
    HYPERAGENT_DISPATCH_EVENTS_REL_V1,
    ...registry.exact_repo_paths_read,
    ...rollup.exact_repo_paths_read,
    ...badMapping.exact_repo_paths_read,
    ...reconciliation.exact_repo_paths_read,
  ]);

  const items: HyperAgentWorkQueueItemV1[] = [];
  let rank = 1;

  for (const frozenKey of registry.frozen_family_keys) {
    const frozenMeta = rollup.frozen_family_summary.frozen_families.find(
      (row) => row.family_key === frozenKey,
    );
    items.push(
      buildFrozenFamilyBlockedItem({
        familyKey: frozenKey,
        freezeReason: frozenMeta?.freeze_reason ?? "frozen",
        registry,
        rank: rank++,
      }),
    );
  }

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
        registry,
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
      registry,
      rank: rank++,
    }),
  );

  const owner_review_ready_items: HyperAgentWorkQueueItemV1[] =
    registry.owner_review_ready_family_keys.map((familyKey, index) =>
      buildOwnerReviewReadyItem({
        registry,
        familyKey,
        rollup,
        rank: index + 1,
      }),
    );

  const blocked_items = items.filter((item) => !item.eligible_now);

  const dispatchCandidates = items.filter((item) => item.eligible_now);
  dispatchCandidates.sort(compareQueuePriority);
  const next_eligible_item = dispatchCandidates[0] ?? null;

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
      `PROVEN: queue_item_count=${String(items.length)} derived from command_center_control_graph_rollup_v1, bad_mapping_correction_batch_runner_v1, and hyperagent_dispatch_registry_v1.`,
      `PROVEN: owner_review_ready_count=${String(owner_review_ready_items.length)}.`,
      `PROVEN: blocked_item_count=${String(blocked_items.length)}.`,
      `PROVEN: frozen_family_keys=${registry.frozen_family_keys.join(", ") || "none"}.`,
      `PROVEN: registry_redispatch_blocked_dedup_key_count=${String(registry.redispatch_blocked_dedup_keys.length)}.`,
      `PROVEN: highest_safe_screened_family=${rollup.pre_research_risk_screen_summary.highest_safe_screened_family_key ?? "none"}.`,
      next_eligible_item
        ? `PROVEN: next_eligible_item=${next_eligible_item.queue_item_id} mission_type=${next_eligible_item.mission_type} scope=${next_eligible_item.scope_key}.`
        : "PROVEN: next_eligible_item=null — no HyperAgent dispatch candidate after gates.",
      "PROVEN: Read-only derived queue — HyperAgent creates evidence, not repo truth; no compat, evidence, Supabase, or page mutation authorized.",
    ],
    unknown_facts: [
      "UNKNOWN: External HyperAgent in-flight missions tracked only via operator dispatch events overlay.",
      "UNKNOWN: Live Supabase or unpublished draft state may differ from committed audit inputs.",
      rollup.education_opportunity_summary
        ? "UNKNOWN: Education opportunity artifact present but not enqueued in Phase 0."
        : "UNKNOWN: No committed education-opportunity-v1.json artifact in repo.",
    ],
  };
}
