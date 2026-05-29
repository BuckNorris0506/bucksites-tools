/**
 * Read-only WHW Batch Production Director v1 — plans the next multi-filter WHW batch
 * across safe-CTA expansion lanes with grind-avoidance and truth gates.
 * Consumes expansion queue + committed artifacts only; no CSV/Supabase/UI mutation.
 */

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import {
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
} from "@/lib/retailers/launch-buy-links";

import { WHW_AP811_FILTER_SLUG_V1 } from "./whole-house-water-batch-buyer-path-proof-v1";
import { WHW_AP810_FILTER_SLUG_V1 } from "./whole-house-water-safe-retailer-link-apply-plan-v1";
import {
  buildWholeHouseWaterSafeCtaExpansionQueueV1,
  emptyWhwSafeCtaExpansionLaneSummaryCountsV1,
  type WhwSafeCtaExpansionLaneV1,
  type WhwSafeCtaExpansionTargetV1,
  type WholeHouseWaterSafeCtaExpansionQueueV1,
} from "./whole-house-water-safe-cta-expansion-queue-v1";

export const WHW_BATCH_PRODUCTION_DIRECTOR_CONTRACT_V1 =
  "whole_house_water_batch_production_director_v1" as const;

export type WhwBatchProductionDirectorPacketKindV1 =
  | "founder_apply_review"
  | "browser_truth_capture"
  | "buyer_path_proof"
  | "model_first_evidence"
  | "mapping_review"
  | "skip_for_now";

export type WhwBatchProductionDirectorItemV1 = {
  batch_rank: number;
  filter_slug: string;
  lane: WhwSafeCtaExpansionLaneV1 | "PARKED";
  packet_kind: WhwBatchProductionDirectorPacketKindV1;
  anchor_model_slug: string | null;
  rationale: string;
  workload: "active" | "parked";
  /** Director never claims a filter is safe until proof gates pass. */
  safe_cta_claimed: false;
  prior_attempt_parked: boolean;
  park_reason: string | null;
};

export type WhwBatchProductionDirectorItemGroupsV1 = Record<
  WhwBatchProductionDirectorPacketKindV1,
  WhwBatchProductionDirectorItemV1[]
>;

export type WhwBatchProductionFactoryRulesV1 = {
  run_batches: true;
  promote_only_pass_evidence: true;
  park_unknown: true;
  fail_compatible_only_or_search_placeholders: true;
  never_open_whw_from_single_safe_cta: true;
  never_treat_row_count_as_truth: true;
  rules: readonly string[];
};

export type WhwBatchProductionDirectorGrindAvoidanceV1 = {
  do_not_grind_single_filter: true;
  max_attempts_per_filter_in_batch: number;
  park_unknowns_and_advance: true;
  hard_case_fast_skip_reason: string;
};

export type WhwBatchProductionDirectorCurrentHeadV1 = {
  filter_slug: string;
  packet_kind: Exclude<WhwBatchProductionDirectorPacketKindV1, "mapping_review" | "skip_for_now">;
  lane: WhwSafeCtaExpansionLaneV1 | "PARKED";
  anchor_model_slug: string | null;
  rationale: string;
};

/** Flat jq-safe projection — use instead of deep nested jq on next_batch_items. */
export type WhwBatchProductionDirectorInspectSummaryV1 = {
  recommended_jq_paths: {
    standalone_report: ".inspect_summary";
    command_center: ".command_center_v2.whole_house_water_batch_production_director_v1.inspect_summary";
  };
  current_batch_head_filter_slug: string | null;
  current_batch_head_packet_kind: string | null;
  ap811_is_browser_truth_head: boolean;
  ap811_is_founder_apply_head: boolean;
  ap811_browser_truth_capture_complete: boolean;
  ap810_parked: boolean;
  ap810_in_active_batch: false;
  active_batch_item_count: number;
  next_batch_size_requested: 10 | 20;
  next_batch_item_counts: Record<WhwBatchProductionDirectorPacketKindV1, number>;
  active_filter_slugs: string[];
  whw_public_opening_authorized: false;
  csv_apply_authorized: false;
  grind_avoidance: {
    do_not_grind_single_filter: true;
    park_unknowns_and_advance: true;
    max_attempts_per_filter_in_batch: number;
  };
  factory_rules: {
    promote_only_pass_evidence: true;
    never_open_whw_from_single_safe_cta: true;
    never_treat_row_count_as_truth: true;
  };
};

export type WholeHouseWaterBatchProductionDirectorV1 = {
  contract: typeof WHW_BATCH_PRODUCTION_DIRECTOR_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  whw_public_opening_authorized: false;
  csv_apply_authorized: false;
  founder_approval_required_for_csv_apply: true;
  next_batch_size_requested: 10 | 20;
  active_batch_item_count: number;
  current_batch_head: WhwBatchProductionDirectorCurrentHeadV1 | null;
  next_batch_items: WhwBatchProductionDirectorItemGroupsV1;
  /** jq-safe counts and head flags for operator proof commands. */
  inspect_summary: WhwBatchProductionDirectorInspectSummaryV1;
  grind_avoidance: WhwBatchProductionDirectorGrindAvoidanceV1;
  factory_rules: WhwBatchProductionFactoryRulesV1;
  batch_strategy_summary: string;
  source_queue_contract: string;
  lane_summary_counts: WholeHouseWaterSafeCtaExpansionQueueV1["lane_summary_counts"];
  generated_at: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

const FACTORY_RULES: WhwBatchProductionFactoryRulesV1 = {
  run_batches: true,
  promote_only_pass_evidence: true,
  park_unknown: true,
  fail_compatible_only_or_search_placeholders: true,
  never_open_whw_from_single_safe_cta: true,
  never_treat_row_count_as_truth: true,
  rules: [
    "Run batches of 10–20 filters across lanes — not one product at a time.",
    "Promote only PASS evidence into apply plans; never auto-apply from director output.",
    "Park UNKNOWN PDPs after bounded buyer-path discovery; advance to browser_truth_capture.",
    "FAIL compatible-only listings and search-placeholder primaries — they cannot become safe CTAs.",
    "Never open WHW publicly from a single safe CTA row; launch state stays NOINDEX_UNPROVEN until policy gates pass.",
    "Never treat retailer_links row count or mapping row count as proof of safe buyer paths.",
  ],
};

const HARD_CASE_FAST_SKIP_REASON_V1 =
  "Park filters with safe CTA already in committed CSV, compat-only mapping without recommended fit, kinetico-reference-system, or bounded buyer-path UNKNOWN/FAIL with no PASS — do not re-grind in the same batch cycle.";

function emptyItemGroups(): WhwBatchProductionDirectorItemGroupsV1 {
  return {
    founder_apply_review: [],
    browser_truth_capture: [],
    buyer_path_proof: [],
    model_first_evidence: [],
    mapping_review: [],
    skip_for_now: [],
  };
}

/** Filters with safe CTA in CSV must not re-enter model-first or buyer-path grinding. */
export function shouldExcludeWhwFilterFromActiveDiscoveryV1(
  target: Pick<WhwSafeCtaExpansionTargetV1, "filter_slug" | "safe_cta_in_committed_csv" | "lane">,
): boolean {
  if (target.safe_cta_in_committed_csv) return true;
  if (target.lane === "SKIP_FOR_NOW") return true;
  return false;
}

/** After buyer-path proof leaves UNKNOWNs, park buyer-path retry and advance to browser_truth. */
export function shouldParkWhwBuyerPathRetryV1(
  target: Pick<
    WhwSafeCtaExpansionTargetV1,
    "buyer_path_unknown_count" | "artifact_refs" | "lane"
  >,
): boolean {
  if (target.lane !== "BUYER_PATH_DISCOVERY_READY" && target.lane !== "BROWSER_TRUTH_READY") {
    return false;
  }
  const hasBuyerPathArtifact = target.artifact_refs.some((ref) =>
    ref.includes("agent-results-buyer-path"),
  );
  return hasBuyerPathArtifact && target.buyer_path_unknown_count > 0;
}

function toDirectorItem(args: {
  batchRank: number;
  target: WhwSafeCtaExpansionTargetV1;
  packetKind: WhwBatchProductionDirectorPacketKindV1;
  workload: "active" | "parked";
  rationale: string;
  priorAttemptParked: boolean;
  parkReason: string | null;
}): WhwBatchProductionDirectorItemV1 {
  return {
    batch_rank: args.batchRank,
    filter_slug: args.target.filter_slug,
    lane: args.workload === "parked" ? "PARKED" : args.target.lane,
    packet_kind: args.packetKind,
    anchor_model_slug: args.target.model_or_system_slugs[0] ?? null,
    rationale: args.rationale,
    workload: args.workload,
    safe_cta_claimed: false,
    prior_attempt_parked: args.priorAttemptParked,
    park_reason: args.parkReason,
  };
}

function buildActiveBatchItems(args: {
  queue: WholeHouseWaterSafeCtaExpansionQueueV1;
  batchSize: 10 | 20;
}): WhwBatchProductionDirectorItemV1[] {
  const { queue, batchSize } = args;
  const active: WhwBatchProductionDirectorItemV1[] = [];
  const seenSlugs = new Set<string>();

  const tryAdd = (
    target: WhwSafeCtaExpansionTargetV1,
    packetKind: WhwBatchProductionDirectorPacketKindV1,
    rationale: string,
    priorAttemptParked = false,
    parkReason: string | null = null,
  ): boolean => {
    if (active.length >= batchSize) return false;
    if (seenSlugs.has(target.filter_slug)) return false;
    if (shouldExcludeWhwFilterFromActiveDiscoveryV1(target)) return false;
    if (
      packetKind === "buyer_path_proof" &&
      shouldParkWhwBuyerPathRetryV1(target)
    ) {
      return false;
    }
    active.push(
      toDirectorItem({
        batchRank: active.length + 1,
        target,
        packetKind,
        workload: "active",
        rationale,
        priorAttemptParked,
        parkReason,
      }),
    );
    seenSlugs.add(target.filter_slug);
    return true;
  };

  for (const row of queue.apply_ready_rows) {
    tryAdd(
      row,
      "founder_apply_review",
      row.next_action_hint ||
        "Full proof chain complete; founder approval required before CSV apply.",
    );
  }

  for (const row of queue.top_10_browser_truth_ready) {
    tryAdd(row, "browser_truth_capture", row.next_action_hint);
  }

  for (const row of queue.top_10_buyer_path_discovery_ready) {
    if (shouldParkWhwBuyerPathRetryV1(row)) continue;
    tryAdd(row, "buyer_path_proof", row.next_action_hint);
  }

  for (const row of queue.top_10_model_first_ready) {
    tryAdd(row, "model_first_evidence", row.next_action_hint);
  }

  if (active.length < batchSize) {
    for (const row of queue.top_20_safe_cta_expansion_targets) {
      if (active.length >= batchSize) break;
      if (row.lane === "MODEL_FIRST_READY") {
        tryAdd(row, "model_first_evidence", row.next_action_hint);
      }
    }
  }

  return active;
}

function buildParkedItems(queue: WholeHouseWaterSafeCtaExpansionQueueV1): {
  mapping_review: WhwBatchProductionDirectorItemV1[];
  skip_for_now: WhwBatchProductionDirectorItemV1[];
} {
  const mapping_review: WhwBatchProductionDirectorItemV1[] = [];
  const skip_for_now: WhwBatchProductionDirectorItemV1[] = [];
  let mappingRank = 0;
  let skipRank = 0;

  for (const row of queue.blocked_or_skip_rows) {
    if (row.lane === "MAPPING_REVIEW_REQUIRED" && mapping_review.length < 10) {
      mappingRank += 1;
      mapping_review.push(
        toDirectorItem({
          batchRank: mappingRank,
          target: row,
          packetKind: "mapping_review",
          workload: "parked",
          rationale: row.next_action_hint,
          priorAttemptParked: true,
          parkReason: "Mapping ambiguity — resolve housing/cartridge chain before proof batch.",
        }),
      );
    }
    if (row.lane === "SKIP_FOR_NOW" && skip_for_now.length < 10) {
      skipRank += 1;
      const parkReason = row.safe_cta_in_committed_csv
        ? "Safe CTA already in committed retailer_links.csv — no re-grind."
        : row.next_action_hint;
      skip_for_now.push(
        toDirectorItem({
          batchRank: skipRank,
          target: row,
          packetKind: "skip_for_now",
          workload: "parked",
          rationale: row.next_action_hint,
          priorAttemptParked: row.safe_cta_in_committed_csv,
          parkReason,
        }),
      );
    }
  }

  return { mapping_review, skip_for_now };
}

function groupActiveItems(
  active: WhwBatchProductionDirectorItemV1[],
): WhwBatchProductionDirectorItemGroupsV1 {
  const groups = emptyItemGroups();
  for (const item of active) {
    groups[item.packet_kind].push(item);
  }
  return groups;
}

function resolveCurrentBatchHead(
  groups: WhwBatchProductionDirectorItemGroupsV1,
): WhwBatchProductionDirectorCurrentHeadV1 | null {
  if (groups.founder_apply_review.length > 0) {
    const head = groups.founder_apply_review[0]!;
    return {
      filter_slug: head.filter_slug,
      packet_kind: "founder_apply_review",
      lane: head.lane === "PARKED" ? "PARKED" : head.lane,
      anchor_model_slug: head.anchor_model_slug,
      rationale: head.rationale,
    };
  }

  const browserHead = groups.browser_truth_capture[0] ?? null;
  if (!browserHead) return null;
  return {
    filter_slug: browserHead.filter_slug,
    packet_kind: "browser_truth_capture",
    lane: browserHead.lane === "PARKED" ? "PARKED" : browserHead.lane,
    anchor_model_slug: browserHead.anchor_model_slug,
    rationale: browserHead.rationale,
  };
}

function countItemGroups(
  groups: WhwBatchProductionDirectorItemGroupsV1,
): Record<WhwBatchProductionDirectorPacketKindV1, number> {
  return {
    founder_apply_review: groups.founder_apply_review.length,
    browser_truth_capture: groups.browser_truth_capture.length,
    buyer_path_proof: groups.buyer_path_proof.length,
    model_first_evidence: groups.model_first_evidence.length,
    mapping_review: groups.mapping_review.length,
    skip_for_now: groups.skip_for_now.length,
  };
}

function activeFilterSlugsFromGroups(
  groups: WhwBatchProductionDirectorItemGroupsV1,
): string[] {
  const slugs = new Set<string>();
  for (const kind of [
    "founder_apply_review",
    "browser_truth_capture",
    "buyer_path_proof",
    "model_first_evidence",
  ] as const) {
    for (const item of groups[kind]) {
      slugs.add(item.filter_slug);
    }
  }
  return [...slugs].sort();
}

export function buildWhwBatchProductionDirectorInspectSummaryV1(args: {
  director: Pick<
    WholeHouseWaterBatchProductionDirectorV1,
    | "current_batch_head"
    | "next_batch_items"
    | "active_batch_item_count"
    | "next_batch_size_requested"
    | "whw_public_opening_authorized"
    | "csv_apply_authorized"
    | "grind_avoidance"
    | "factory_rules"
  >;
}): WhwBatchProductionDirectorInspectSummaryV1 {
  const { director } = args;
  const ap811FounderApply = director.next_batch_items.founder_apply_review.some(
    (i) => i.filter_slug === WHW_AP811_FILTER_SLUG_V1,
  );
  const ap810Parked = director.next_batch_items.skip_for_now.some(
    (i) => i.filter_slug === WHW_AP810_FILTER_SLUG_V1,
  );
  const activeSlugs = activeFilterSlugsFromGroups(director.next_batch_items);
  return {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary",
      command_center:
        ".command_center_v2.whole_house_water_batch_production_director_v1.inspect_summary",
    },
    current_batch_head_filter_slug: director.current_batch_head?.filter_slug ?? null,
    current_batch_head_packet_kind: director.current_batch_head?.packet_kind ?? null,
    ap811_is_browser_truth_head:
      director.current_batch_head?.filter_slug === WHW_AP811_FILTER_SLUG_V1 &&
      director.current_batch_head?.packet_kind === "browser_truth_capture",
    ap811_is_founder_apply_head:
      director.current_batch_head?.filter_slug === WHW_AP811_FILTER_SLUG_V1 &&
      director.current_batch_head?.packet_kind === "founder_apply_review",
    ap811_browser_truth_capture_complete: ap811FounderApply,
    ap810_parked: ap810Parked,
    ap810_in_active_batch: false,
    active_batch_item_count: director.active_batch_item_count,
    next_batch_size_requested: director.next_batch_size_requested,
    next_batch_item_counts: countItemGroups(director.next_batch_items),
    active_filter_slugs: activeSlugs,
    whw_public_opening_authorized: false,
    csv_apply_authorized: false,
    grind_avoidance: {
      do_not_grind_single_filter: true,
      park_unknowns_and_advance: true,
      max_attempts_per_filter_in_batch: director.grind_avoidance.max_attempts_per_filter_in_batch,
    },
    factory_rules: {
      promote_only_pass_evidence: director.factory_rules.promote_only_pass_evidence,
      never_open_whw_from_single_safe_cta: director.factory_rules.never_open_whw_from_single_safe_cta,
      never_treat_row_count_as_truth: director.factory_rules.never_treat_row_count_as_truth,
    },
  };
}

export function buildWholeHouseWaterBatchProductionDirectorUnknownV1(args: {
  generated_at: string;
  reason: string;
}): WholeHouseWaterBatchProductionDirectorV1 {
  const emptyGroups = emptyItemGroups();
  const director: WholeHouseWaterBatchProductionDirectorV1 = {
    contract: WHW_BATCH_PRODUCTION_DIRECTOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    whw_public_opening_authorized: false,
    csv_apply_authorized: false,
    founder_approval_required_for_csv_apply: true,
    next_batch_size_requested: 10,
    active_batch_item_count: 0,
    current_batch_head: null,
    next_batch_items: emptyGroups,
    inspect_summary: buildWhwBatchProductionDirectorInspectSummaryV1({
      director: {
        current_batch_head: null,
        next_batch_items: emptyGroups,
        active_batch_item_count: 0,
        next_batch_size_requested: 10,
        whw_public_opening_authorized: false,
        csv_apply_authorized: false,
        grind_avoidance: {
          do_not_grind_single_filter: true,
          max_attempts_per_filter_in_batch: 1,
          park_unknowns_and_advance: true,
          hard_case_fast_skip_reason: HARD_CASE_FAST_SKIP_REASON_V1,
        },
        factory_rules: FACTORY_RULES,
      },
    }),
    grind_avoidance: {
      do_not_grind_single_filter: true,
      max_attempts_per_filter_in_batch: 1,
      park_unknowns_and_advance: true,
      hard_case_fast_skip_reason: HARD_CASE_FAST_SKIP_REASON_V1,
    },
    factory_rules: FACTORY_RULES,
    batch_strategy_summary: "UNKNOWN",
    source_queue_contract: "UNKNOWN",
    lane_summary_counts: emptyWhwSafeCtaExpansionLaneSummaryCountsV1(),
    generated_at: args.generated_at,
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [`UNKNOWN: whole_house_water_batch_production_director_v1 failed: ${args.reason}`],
  };
  return director;
}

export function buildWholeHouseWaterBatchProductionDirectorV1(args: {
  rootDir: string;
  nextBatchSizeRequested?: 10 | 20;
  now?: () => Date;
}): WholeHouseWaterBatchProductionDirectorV1 {
  const now = args.now ?? (() => new Date());
  const batchSize = args.nextBatchSizeRequested ?? 10;
  const queue = buildWholeHouseWaterSafeCtaExpansionQueueV1({
    rootDir: args.rootDir,
    now: args.now,
  });

  const activeItems = buildActiveBatchItems({ queue, batchSize });
  const parked = buildParkedItems(queue);
  const groups = groupActiveItems(activeItems);
  groups.mapping_review = parked.mapping_review;
  groups.skip_for_now = parked.skip_for_now;

  const currentHead = resolveCurrentBatchHead(groups);
  const launchState = getVerticalLaunchState("whole-house-water");
  const activeDiscoveryKinds = new Set(
    activeItems.map((i) => i.packet_kind).filter((k) => k !== "mapping_review" && k !== "skip_for_now"),
  );

  const batchStrategyParts: string[] = [
    `Plan ${String(batchSize)}-filter batch across lanes (not one-at-a-time grinding).`,
  ];
  if (currentHead) {
    batchStrategyParts.push(
      `Current head: ${currentHead.filter_slug} → ${currentHead.packet_kind}.`,
    );
  }
  if (groups.model_first_evidence.length > 0) {
    batchStrategyParts.push(
      `After head work, run model_first_evidence on ${String(groups.model_first_evidence.length)} MODEL_FIRST_READY candidate(s) — safe CTA not claimed until proof exists.`,
    );
  }
  batchStrategyParts.push(
    `Park ${String(groups.mapping_review.length)} mapping-review and ${String(groups.skip_for_now.length)} skip-for-now filters without retry.`,
  );

  const directorBody = {
    contract: WHW_BATCH_PRODUCTION_DIRECTOR_CONTRACT_V1,
    read_only: true as const,
    data_mutation: false as const,
    whw_public_opening_authorized: false as const,
    csv_apply_authorized: false as const,
    founder_approval_required_for_csv_apply: true as const,
    next_batch_size_requested: batchSize,
    active_batch_item_count: activeItems.length,
    current_batch_head: currentHead,
    next_batch_items: groups,
    grind_avoidance: {
      do_not_grind_single_filter: true as const,
      max_attempts_per_filter_in_batch: 1,
      park_unknowns_and_advance: true as const,
      hard_case_fast_skip_reason: HARD_CASE_FAST_SKIP_REASON_V1,
    },
    factory_rules: FACTORY_RULES,
    batch_strategy_summary: batchStrategyParts.join(" "),
    source_queue_contract: queue.contract,
    lane_summary_counts: { ...queue.lane_summary_counts },
    generated_at: now().toISOString(),
  };

  const inspect_summary = buildWhwBatchProductionDirectorInspectSummaryV1({
    director: directorBody,
  });

  return {
    ...directorBody,
    inspect_summary,
    proven_facts: [
      `PROVEN: Source expansion queue contract=${queue.contract}; lane_summary_counts BROWSER_TRUTH_READY=${String(queue.lane_summary_counts.BROWSER_TRUTH_READY)} MODEL_FIRST_READY=${String(queue.lane_summary_counts.MODEL_FIRST_READY)}.`,
      `PROVEN: whole-house-water launch state is ${launchState}.`,
      `PROVEN: whw_public_opening_authorized=false; csv_apply_authorized=false; data_mutation=false.`,
      `PROVEN: Committed CSV safe CTA row count=${String(queue.summary.safe_cta_row_count_in_committed_csv)} (AP810 aquapure-dealer when present).`,
      currentHead
        ? `PROVEN: current_batch_head=${currentHead.filter_slug} packet_kind=${currentHead.packet_kind}.`
        : "PROVEN: No browser_truth_capture head surfaced in active batch.",
      `PROVEN: active_batch_item_count=${String(activeItems.length)} for next_batch_size_requested=${String(batchSize)}.`,
      `PROVEN: Search URLs and compatible-only listings cannot pass launch-buy-links safe CTA gate (factory rule enforced in queue gates).`,
    ],
    inferred_facts: [
      activeItems.length >= 2
        ? `INFERRED: Batch spans ${String(activeDiscoveryKinds.size)} active packet kind(s) — avoids single-filter grinding.`
        : "INFERRED: Expand artifact coverage to grow multi-filter batch plans.",
      groups.model_first_evidence.length > 0
        ? `INFERRED: Next MODEL_FIRST_READY after AP811 head: ${groups.model_first_evidence
            .slice(0, 3)
            .map((i) => i.filter_slug)
            .join(", ")} — not safe until proof artifacts exist.`
        : "INFERRED: No MODEL_FIRST_READY slots in active batch after head work.",
      parked.skip_for_now.some((s) => s.filter_slug === WHW_AP810_FILTER_SLUG_V1)
        ? `INFERRED: ${WHW_AP810_FILTER_SLUG_V1} parked in skip_for_now — safe CTA applied; no model-first or buyer-path re-grind.`
        : `INFERRED: ${WHW_AP810_FILTER_SLUG_V1} excluded from active discovery when safe_cta_in_committed_csv.`,
    ],
    unknown_facts: [
      "UNKNOWN: How many filters in this batch will produce PASS browser_truth or buyer-path evidence.",
      "UNKNOWN: Founder timeline for grant strategy vs WHW batch execution.",
      "UNKNOWN: Whether additional WHW filters beyond MODEL_FIRST_READY top-10 will enter the next batch cycle.",
    ],
  };
}

/** Guardrail helper for tests — search placeholders cannot become safe CTAs. */
export function whwSearchPlaceholderCannotBeSafeCtaV1(url: string): boolean {
  if (!isManufacturerSiteSearchUrl(url)) return false;
  return !isDirectBuyableSafeCtaRow({
    retailer_key: "oem-catalog",
    affiliate_url: url,
    browser_truth_classification: null,
    browser_truth_buyable_subtype: null,
  });
}
