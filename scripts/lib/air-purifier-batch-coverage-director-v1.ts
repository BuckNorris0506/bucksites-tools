/**
 * Read-only Air Purifier Batch Coverage Director v1 — multi-filter batch plan for
 * mapped filters with zero safe buy path. Sources air_purifier_truth_spine_v1 + committed CSVs.
 * No CSV apply, Supabase update, or launch-state mutation.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { getVerticalLaunchState, isVerticalLive } from "@/lib/catalog/vertical-launch-state";
import {
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
  isOfficialReferencePdpUrl,
} from "@/lib/retailers/launch-buy-links";

import {
  AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1,
  buildAirPurifierTruthSpineV1,
  type AirPurifierTruthSpineV1,
} from "./air-purifier-truth-spine-v1";
import {
  classifyApFilterCandidateV1,
  type ApBatchProductionLaneStateV1,
} from "./air-purifier-batch-production-lane-v1";

export const AP_BATCH_COVERAGE_DIRECTOR_CONTRACT_V1 =
  "air_purifier_batch_coverage_director_v1" as const;

export const AP_APPLY_PLAN_BATCH_V2_REL_V1 =
  "data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json" as const;

export type ApBatchCoverageDirectorLaneV1 =
  | "buyer_path_discovery_ready"
  | "browser_truth_ready"
  | "founder_apply_review"
  | "model_first_or_mapping_review"
  | "skip_for_now";

export type ApBatchCoverageDirectorPacketKindV1 = ApBatchCoverageDirectorLaneV1;

export type ApBatchCoverageDirectorItemV1 = {
  batch_rank: number;
  filter_slug: string;
  brand_slug: string;
  oem_part_number: string;
  lane: ApBatchCoverageDirectorLaneV1;
  packet_kind: ApBatchCoverageDirectorPacketKindV1;
  anchor_model_slug: string | null;
  batch_production_state: ApBatchProductionLaneStateV1;
  pattern: string;
  priority_score: number;
  rationale: string;
  workload: "active" | "parked";
  safe_cta_claimed: false;
  prior_attempt_parked: boolean;
  park_reason: string | null;
};

export type ApBatchCoverageDirectorItemGroupsV1 = Record<
  ApBatchCoverageDirectorPacketKindV1,
  ApBatchCoverageDirectorItemV1[]
>;

export type ApBatchCoverageDirectorFactoryRulesV1 = {
  run_multi_filter_batches: true;
  promote_only_pass_evidence: true;
  park_unknown_and_blocked: true;
  fail_search_placeholders_as_safe_cta: true;
  fail_compatible_only_as_safe_cta: true;
  never_claim_all_filters_verified: true;
  never_treat_row_count_as_truth: true;
  rules: readonly string[];
};

export type ApBatchCoverageDirectorGrindAvoidanceV1 = {
  do_not_grind_single_filter: true;
  max_attempts_per_filter_in_batch: 1;
  park_unknowns_and_advance: true;
  hard_case_fast_skip_reason: string;
};

export type ApBatchCoverageDirectorCurrentHeadV1 = {
  filter_slug: string;
  packet_kind: Exclude<ApBatchCoverageDirectorPacketKindV1, "skip_for_now">;
  lane: ApBatchCoverageDirectorLaneV1;
  anchor_model_slug: string | null;
  rationale: string;
};

export type ApBatchCoverageDirectorInspectSummaryV1 = {
  recommended_jq_paths: {
    standalone_report: ".inspect_summary";
    command_center: ".command_center_v2.air_purifier_batch_coverage_director_v1.inspect_summary";
  };
  current_batch_head_filter_slug: string | null;
  current_batch_head_packet_kind: string | null;
  safe_cta_count: number;
  zero_safe_buy_path_count: number;
  active_batch_item_count: number;
  next_batch_size_requested: number;
  batch_item_counts: Record<ApBatchCoverageDirectorPacketKindV1, number>;
  active_filter_slugs: string[];
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  public_launch_change_authorized: false;
  public_launch_state: ReturnType<typeof getVerticalLaunchState>;
  all_filters_verified_claim: false;
  grind_avoidance: {
    do_not_grind_single_filter: true;
    park_unknowns_and_advance: true;
    max_attempts_per_filter_in_batch: 1;
  };
  factory_rules: {
    promote_only_pass_evidence: true;
    never_claim_all_filters_verified: true;
    never_treat_row_count_as_truth: true;
  };
};

export type AirPurifierBatchCoverageDirectorV1 = {
  contract: typeof AP_BATCH_COVERAGE_DIRECTOR_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  source_truth_spine_contract: typeof AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1;
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  public_launch_change_authorized: false;
  all_filters_verified_claim: false;
  next_batch_size_requested: number;
  active_batch_item_count: number;
  current_batch_head: ApBatchCoverageDirectorCurrentHeadV1 | null;
  next_batch_items: ApBatchCoverageDirectorItemGroupsV1;
  inspect_summary: ApBatchCoverageDirectorInspectSummaryV1;
  grind_avoidance: ApBatchCoverageDirectorGrindAvoidanceV1;
  factory_rules: ApBatchCoverageDirectorFactoryRulesV1;
  batch_strategy_summary: string;
  generated_at: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

const FACTORY_RULES: ApBatchCoverageDirectorFactoryRulesV1 = {
  run_multi_filter_batches: true,
  promote_only_pass_evidence: true,
  park_unknown_and_blocked: true,
  fail_search_placeholders_as_safe_cta: true,
  fail_compatible_only_as_safe_cta: true,
  never_claim_all_filters_verified: true,
  never_treat_row_count_as_truth: true,
  rules: [
    "Plan 10–20 filter batches across AP coverage lanes — not one filter at a time.",
    "Source pool: mapped filters with zero committed safe direct_buyable row (truth spine).",
    "Promote only PASS browser/model evidence into founder apply — never auto-apply from director.",
    "Park UNKNOWN/BLOCKED/wrong-family/owner-policy rows after one bounded attempt.",
    "Search-placeholder primaries and compatible-only rows cannot become safe CTAs.",
    "AP stays LIVE; director never authorizes launch-state or public opening changes.",
    "Never treat retailer_links row count or mapping count as proof of safe buyer paths.",
  ],
};

const HARD_CASE_FAST_SKIP_REASON_V1 =
  "Park filters with founder apply already pending owner approval, catalog-identity/mapping ambiguity, wrong-family pilot rejects, owner-policy Amazon-vs-OEM decisions, or no rescue pattern — do not re-grind in the same batch cycle.";

type FilterRow = {
  brand_slug: string;
  slug: string;
  oem_part_number: string;
  name: string;
};

type RetailerLinkRow = {
  filter_slug: string;
  affiliate_url: string;
  is_primary?: string;
  retailer_key?: string;
  browser_truth_classification?: string;
  browser_truth_notes?: string;
  browser_truth_checked_at?: string;
  browser_truth_buyable_subtype?: string;
};

type CompatRow = {
  model_slug?: string;
  air_purifier_model_slug?: string;
  filter_slug: string;
};

function emptyGroups(): ApBatchCoverageDirectorItemGroupsV1 {
  return {
    buyer_path_discovery_ready: [],
    browser_truth_ready: [],
    founder_apply_review: [],
    model_first_or_mapping_review: [],
    skip_for_now: [],
  };
}

function isTruthyPrimary(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function readCsv(rootDir: string, rel: string): Record<string, string>[] {
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return [];
  try {
    return parse(readFileSync(abs, "utf8"), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Record<string, string>[];
  } catch {
    return [];
  }
}

function primaryLinkForSlug(links: RetailerLinkRow[], slug: string): RetailerLinkRow | null {
  const rows = links.filter((l) => l.filter_slug === slug);
  if (rows.length === 0) return null;
  return rows.find((l) => isTruthyPrimary(l.is_primary)) ?? rows[0] ?? null;
}

function allLinksForSlug(links: RetailerLinkRow[], slug: string): RetailerLinkRow[] {
  return links.filter((l) => l.filter_slug === slug);
}

function inferPattern(args: {
  brandSlug: string;
  retailerKey: string | null;
  url: string | null;
  state: ApBatchProductionLaneStateV1;
}): string {
  const { brandSlug, retailerKey, url, state } = args;
  if (state === "existing_direct_buyable" && brandSlug === "honeywell") {
    return "honeywell_store_direct_buy";
  }
  if (retailerKey === "shark-official") return "shark_official_reference";
  if (brandSlug === "blueair") return "blueair_catalog_identity";
  if (brandSlug === "levoit") return "levoit_oem_discovery";
  if (retailerKey === "amazon") return "amazon_secondary_verification";
  if (url && isManufacturerSiteSearchUrl(url)) return "oem_search_placeholder_discovery";
  return "oem_search_placeholder_discovery";
}

function scoreCandidate(args: {
  state: ApBatchProductionLaneStateV1;
  compatModelCount: number;
  gate: string | null;
  pdpLike: boolean;
  pattern: string;
}): number {
  let score = Math.min(args.compatModelCount, 30) * 2;
  if (args.gate) score += 4;
  if (args.pdpLike) score += 8;

  const patternBonus: Record<string, number> = {
    shark_official_reference: 40,
    honeywell_store_direct_buy: 35,
    blueair_catalog_identity: 30,
    levoit_oem_discovery: 20,
    amazon_secondary_verification: 15,
    oem_search_placeholder_discovery: 5,
  };
  score += patternBonus[args.pattern] ?? 0;

  const stateBonus: Record<ApBatchProductionLaneStateV1, number> = {
    existing_direct_buyable: -100,
    existing_official_reference: -100,
    direct_buy_candidate: 25,
    reference_candidate: 22,
    search_placeholder_rescue_needed: 12,
    catalog_identity_gap: 28,
    alias_or_redirect_gap: 26,
    wrong_family_reject: -20,
    owner_review: 8,
    no_safe_path_yet: 0,
  };
  score += stateBonus[args.state] ?? 0;
  return Math.round(score * 10) / 10;
}

function loadFounderApplyPendingSlugs(rootDir: string, safeSlugs: Set<string>): Set<string> {
  const abs = path.join(rootDir, AP_APPLY_PLAN_BATCH_V2_REL_V1);
  if (!existsSync(abs)) return new Set();
  try {
    const parsed: unknown = JSON.parse(readFileSync(abs, "utf8"));
    if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as { planned_changes?: unknown }).planned_changes)) {
      return new Set();
    }
    const plan = parsed as { planned_changes: Array<{ filter_slug?: string }> };
    const slugs = new Set<string>();
    for (const change of plan.planned_changes) {
      const slug = (change.filter_slug ?? "").trim().toLowerCase();
      if (slug && !safeSlugs.has(slug)) slugs.add(slug);
    }
    return slugs;
  } catch {
    return new Set();
  }
}

function mapStateToLane(args: {
  state: ApBatchProductionLaneStateV1;
  founderApplyPending: boolean;
}): ApBatchCoverageDirectorLaneV1 {
  if (args.founderApplyPending) return "founder_apply_review";
  switch (args.state) {
    case "search_placeholder_rescue_needed":
      return "buyer_path_discovery_ready";
    case "direct_buy_candidate":
    case "reference_candidate":
      return "browser_truth_ready";
    case "catalog_identity_gap":
    case "alias_or_redirect_gap":
      return "model_first_or_mapping_review";
    case "wrong_family_reject":
    case "owner_review":
    case "no_safe_path_yet":
    case "existing_official_reference":
      return "skip_for_now";
    default:
      return "skip_for_now";
  }
}

function parkReasonForLane(
  lane: ApBatchCoverageDirectorLaneV1,
  state: ApBatchProductionLaneStateV1,
): string | null {
  if (lane === "skip_for_now") {
    if (state === "wrong_family_reject") {
      return "Wrong-family pilot reject — exact OEM token required before retry.";
    }
    if (state === "owner_review") {
      return "Owner policy review (Amazon vs OEM primary) — not batch-grindable.";
    }
    if (state === "catalog_identity_gap" || state === "alias_or_redirect_gap") {
      return "Catalog/mapping identity gap — resolve before buyer-path spend.";
    }
    return "No bounded rescue pattern or blocked case — park after one attempt.";
  }
  if (lane === "model_first_or_mapping_review") {
    return "Mapping/catalog ambiguity — model-first or compat review before buyer-path proof.";
  }
  return null;
}

function anchorModelForFilter(compat: CompatRow[], filterSlug: string): string | null {
  for (const row of compat) {
    if (row.filter_slug !== filterSlug) continue;
    const model = (row.model_slug ?? row.air_purifier_model_slug ?? "").trim();
    if (model) return model;
  }
  return null;
}

function resolveCurrentHead(
  groups: ApBatchCoverageDirectorItemGroupsV1,
): ApBatchCoverageDirectorCurrentHeadV1 | null {
  const order: Exclude<ApBatchCoverageDirectorPacketKindV1, "skip_for_now" | "model_first_or_mapping_review">[] = [
    "founder_apply_review",
    "browser_truth_ready",
    "buyer_path_discovery_ready",
  ];
  for (const kind of order) {
    const head = groups[kind][0];
    if (head) {
      return {
        filter_slug: head.filter_slug,
        packet_kind: kind,
        lane: head.lane,
        anchor_model_slug: head.anchor_model_slug,
        rationale: head.rationale,
      };
    }
  }
  return null;
}

function activeFilterSlugsFromGroups(groups: ApBatchCoverageDirectorItemGroupsV1): string[] {
  const slugs = new Set<string>();
  for (const kind of [
    "founder_apply_review",
    "browser_truth_ready",
    "buyer_path_discovery_ready",
    "model_first_or_mapping_review",
  ] as const) {
    for (const item of groups[kind]) {
      if (item.workload === "active") slugs.add(item.filter_slug);
    }
  }
  return Array.from(slugs).sort();
}

export function buildApBatchCoverageDirectorInspectSummaryV1(args: {
  director: Pick<
    AirPurifierBatchCoverageDirectorV1,
    | "current_batch_head"
    | "next_batch_items"
    | "active_batch_item_count"
    | "next_batch_size_requested"
  >;
  spine: Pick<
    AirPurifierTruthSpineV1,
    "safe_cta_count" | "filters_with_zero_safe_buy_path_count" | "public_launch_state"
  >;
}): ApBatchCoverageDirectorInspectSummaryV1 {
  const { director, spine } = args;
  const counts = {} as Record<ApBatchCoverageDirectorPacketKindV1, number>;
  for (const kind of Object.keys(director.next_batch_items) as ApBatchCoverageDirectorPacketKindV1[]) {
    counts[kind] = director.next_batch_items[kind].length;
  }
  return {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary",
      command_center:
        ".command_center_v2.air_purifier_batch_coverage_director_v1.inspect_summary",
    },
    current_batch_head_filter_slug: director.current_batch_head?.filter_slug ?? null,
    current_batch_head_packet_kind: director.current_batch_head?.packet_kind ?? null,
    safe_cta_count: spine.safe_cta_count,
    zero_safe_buy_path_count: spine.filters_with_zero_safe_buy_path_count,
    active_batch_item_count: director.active_batch_item_count,
    next_batch_size_requested: director.next_batch_size_requested,
    batch_item_counts: counts,
    active_filter_slugs: activeFilterSlugsFromGroups(director.next_batch_items),
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    public_launch_change_authorized: false,
    public_launch_state: spine.public_launch_state,
    all_filters_verified_claim: false,
    grind_avoidance: {
      do_not_grind_single_filter: true,
      park_unknowns_and_advance: true,
      max_attempts_per_filter_in_batch: 1,
    },
    factory_rules: {
      promote_only_pass_evidence: true,
      never_claim_all_filters_verified: true,
      never_treat_row_count_as_truth: true,
    },
  };
}

export function apSearchPlaceholderCannotBeSafeCtaV1(url: string | null): boolean {
  if (!url) return false;
  return isManufacturerSiteSearchUrl(url);
}

export function buildAirPurifierBatchCoverageDirectorUnknownV1(args: {
  generated_at: string;
  reason: string;
}): AirPurifierBatchCoverageDirectorV1 {
  const empty = emptyGroups();
  const body = {
    contract: AP_BATCH_COVERAGE_DIRECTOR_CONTRACT_V1,
    read_only: true as const,
    data_mutation: false as const,
    source_truth_spine_contract: AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1,
    csv_apply_authorized: false as const,
    supabase_update_authorized: false as const,
    public_launch_change_authorized: false as const,
    all_filters_verified_claim: false as const,
    next_batch_size_requested: 10,
    active_batch_item_count: 0,
    current_batch_head: null,
    next_batch_items: empty,
    grind_avoidance: {
      do_not_grind_single_filter: true as const,
      max_attempts_per_filter_in_batch: 1 as const,
      park_unknowns_and_advance: true as const,
      hard_case_fast_skip_reason: HARD_CASE_FAST_SKIP_REASON_V1,
    },
    factory_rules: FACTORY_RULES,
    batch_strategy_summary: "UNKNOWN",
    generated_at: args.generated_at,
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [`UNKNOWN: air_purifier_batch_coverage_director_v1 failed: ${args.reason}`],
  };
  const spine = buildAirPurifierTruthSpineUnknownStub(args.generated_at);
  const inspect_summary = buildApBatchCoverageDirectorInspectSummaryV1({
    director: body,
    spine,
  });
  return { ...body, inspect_summary };
}

function buildAirPurifierTruthSpineUnknownStub(generated_at: string): Pick<
  AirPurifierTruthSpineV1,
  "safe_cta_count" | "filters_with_zero_safe_buy_path_count" | "public_launch_state"
> {
  return {
    safe_cta_count: 0,
    filters_with_zero_safe_buy_path_count: 0,
    public_launch_state: getVerticalLaunchState("air-purifier"),
  };
}

export function buildAirPurifierBatchCoverageDirectorV1(args: {
  rootDir: string;
  now?: () => Date;
  spine?: AirPurifierTruthSpineV1;
  nextBatchSizeRequested?: 10 | 20;
}): AirPurifierBatchCoverageDirectorV1 {
  const now = args.now ?? (() => new Date());
  const batchSize = args.nextBatchSizeRequested ?? 10;
  const spine = args.spine ?? buildAirPurifierTruthSpineV1({ rootDir: args.rootDir, now: args.now });

  const filters = readCsv(args.rootDir, "data/air-purifier/filters.csv") as FilterRow[];
  const links = readCsv(args.rootDir, "data/air-purifier/retailer_links.csv") as RetailerLinkRow[];
  const compat = readCsv(args.rootDir, "data/air-purifier/compatibility_mappings.csv") as CompatRow[];

  const filterBySlug = new Map(filters.map((f) => [f.slug.toLowerCase(), f]));
  const compatCountByFilter = new Map<string, number>();
  for (const row of compat) {
    const fs = row.filter_slug;
    if (!fs) continue;
    compatCountByFilter.set(fs, (compatCountByFilter.get(fs) ?? 0) + 1);
  }

  const safeSlugs = new Set(spine.safe_filter_slugs.map((s) => s.toLowerCase()));
  const founderApplyPending = loadFounderApplyPendingSlugs(args.rootDir, safeSlugs);

  const zeroSafeSlugs =
    Array.isArray(spine.unsafe_or_unknown_filter_slugs)
      ? spine.unsafe_or_unknown_filter_slugs
      : [];

  type Scored = {
    filter: FilterRow;
    state: ApBatchProductionLaneStateV1;
    lane: ApBatchCoverageDirectorLaneV1;
    pattern: string;
    priority_score: number;
    rationale: string;
    anchor_model_slug: string | null;
  };

  const scored: Scored[] = [];

  for (const slug of zeroSafeSlugs) {
    const filter = filterBySlug.get(slug.toLowerCase());
    if (!filter) continue;

    const primary = primaryLinkForSlug(links, filter.slug);
    const all = allLinksForSlug(links, filter.slug);
    const classified = classifyApFilterCandidateV1({
      filter,
      primaryLink: primary,
      allLinks: all,
      compatModelCount: compatCountByFilter.get(filter.slug) ?? 0,
      gscPageImpressions: 0,
      gscQueryImpressions: 0,
      liveFilterSlugs: new Set(filters.map((f) => f.slug)),
      aliasOrRedirectGscSlugs: [],
    });

    if (classified.state === "existing_direct_buyable") continue;

    const url = primary?.affiliate_url?.trim() ?? null;
    const retailerKey = primary?.retailer_key?.trim().toLowerCase() ?? null;
    const pattern = inferPattern({
      brandSlug: filter.brand_slug,
      retailerKey,
      url,
      state: classified.state,
    });
    const gate = primary
      ? buyLinkGateFailureKind({
          retailer_key: primary.retailer_key ?? null,
          affiliate_url: primary.affiliate_url ?? "",
          browser_truth_classification: primary.browser_truth_classification ?? null,
          browser_truth_buyable_subtype: primary.browser_truth_buyable_subtype ?? null,
        })
      : null;
    const pdpLike =
      Boolean(url && (isOfficialReferencePdpUrl(url) || url.includes("honeywellstore.com")));

    const founderPending = founderApplyPending.has(filter.slug.toLowerCase());
    const lane = mapStateToLane({ state: classified.state, founderApplyPending: founderPending });
    const priority_score = scoreCandidate({
      state: classified.state,
      compatModelCount: compatCountByFilter.get(filter.slug) ?? 0,
      gate,
      pdpLike,
      pattern,
    });

    scored.push({
      filter,
      state: classified.state,
      lane,
      pattern,
      priority_score,
      rationale: founderPending
        ? "Batch-v2 apply plan pending owner approval — founder apply review before new discovery spend."
        : classified.rationale,
      anchor_model_slug: anchorModelForFilter(compat, filter.slug),
    });
  }

  scored.sort((a, b) => b.priority_score - a.priority_score);

  const groups = emptyGroups();
  const activeCandidates = scored.filter(
    (s) =>
      s.lane === "founder_apply_review" ||
      s.lane === "browser_truth_ready" ||
      s.lane === "buyer_path_discovery_ready",
  );
  const parkedCandidates = scored.filter((s) => s.lane === "skip_for_now");
  const mappingReviewCandidates = scored.filter((s) => s.lane === "model_first_or_mapping_review");

  let activeRank = 0;
  for (const row of activeCandidates) {
    if (activeRank >= batchSize) break;
    activeRank += 1;
    const item: ApBatchCoverageDirectorItemV1 = {
      batch_rank: activeRank,
      filter_slug: row.filter.slug,
      brand_slug: row.filter.brand_slug,
      oem_part_number: row.filter.oem_part_number,
      lane: row.lane,
      packet_kind: row.lane,
      anchor_model_slug: row.anchor_model_slug,
      batch_production_state: row.state,
      pattern: row.pattern,
      priority_score: row.priority_score,
      rationale: row.rationale,
      workload: "active",
      safe_cta_claimed: false,
      prior_attempt_parked: false,
      park_reason: parkReasonForLane(row.lane, row.state),
    };
    groups[row.lane].push(item);
  }

  let parkRank = 0;
  for (const row of parkedCandidates.slice(0, batchSize)) {
    parkRank += 1;
    groups.skip_for_now.push({
      batch_rank: parkRank,
      filter_slug: row.filter.slug,
      brand_slug: row.filter.brand_slug,
      oem_part_number: row.filter.oem_part_number,
      lane: "skip_for_now",
      packet_kind: "skip_for_now",
      anchor_model_slug: row.anchor_model_slug,
      batch_production_state: row.state,
      pattern: row.pattern,
      priority_score: row.priority_score,
      rationale: row.rationale,
      workload: "parked",
      safe_cta_claimed: false,
      prior_attempt_parked: true,
      park_reason: parkReasonForLane("skip_for_now", row.state),
    });
  }

  let mappingRank = 0;
  for (const row of mappingReviewCandidates.slice(0, 10)) {
    mappingRank += 1;
    groups.model_first_or_mapping_review.push({
      batch_rank: mappingRank,
      filter_slug: row.filter.slug,
      brand_slug: row.filter.brand_slug,
      oem_part_number: row.filter.oem_part_number,
      lane: "model_first_or_mapping_review",
      packet_kind: "model_first_or_mapping_review",
      anchor_model_slug: row.anchor_model_slug,
      batch_production_state: row.state,
      pattern: row.pattern,
      priority_score: row.priority_score,
      rationale: row.rationale,
      workload: "parked",
      safe_cta_claimed: false,
      prior_attempt_parked: true,
      park_reason: parkReasonForLane("model_first_or_mapping_review", row.state),
    });
  }

  const activeItems = [
    ...groups.founder_apply_review,
    ...groups.browser_truth_ready,
    ...groups.buyer_path_discovery_ready,
  ];
  const currentHead = resolveCurrentHead(groups);

  const batchStrategyParts = [
    `Plan ${String(batchSize)}-filter AP coverage batch from ${String(zeroSafeSlugs.length)} mapped zero-safe-buy-path slug(s) (truth spine).`,
    `Committed safe_cta_count=${String(spine.safe_cta_count)}; do not claim all ${String(spine.catalog_counts.mapped_filter_slug_count)} mapped filters verified.`,
  ];
  if (currentHead) {
    batchStrategyParts.push(`Current head: ${currentHead.filter_slug} → ${currentHead.packet_kind}.`);
  }
  batchStrategyParts.push(
    `Active lanes: founder_apply=${String(groups.founder_apply_review.length)} browser_truth=${String(groups.browser_truth_ready.length)} buyer_path_discovery=${String(groups.buyer_path_discovery_ready.length)}; park skip_for_now=${String(groups.skip_for_now.length)} mapping_review=${String(groups.model_first_or_mapping_review.length)}.`,
  );

  const directorBody = {
    contract: AP_BATCH_COVERAGE_DIRECTOR_CONTRACT_V1,
    read_only: true as const,
    data_mutation: false as const,
    source_truth_spine_contract: AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1,
    csv_apply_authorized: false as const,
    supabase_update_authorized: false as const,
    public_launch_change_authorized: false as const,
    all_filters_verified_claim: false as const,
    next_batch_size_requested: batchSize,
    active_batch_item_count: activeItems.length,
    current_batch_head: currentHead,
    next_batch_items: groups,
    grind_avoidance: {
      do_not_grind_single_filter: true as const,
      max_attempts_per_filter_in_batch: 1 as const,
      park_unknowns_and_advance: true as const,
      hard_case_fast_skip_reason: HARD_CASE_FAST_SKIP_REASON_V1,
    },
    factory_rules: FACTORY_RULES,
    batch_strategy_summary: batchStrategyParts.join(" "),
    generated_at: now().toISOString(),
  };

  const inspect_summary = buildApBatchCoverageDirectorInspectSummaryV1({
    director: directorBody,
    spine,
  });

  return {
    ...directorBody,
    inspect_summary,
    proven_facts: [
      `PROVEN: Source ${AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1}; safe_cta_count=${String(spine.safe_cta_count)}; filters_with_zero_safe_buy_path_count=${String(spine.filters_with_zero_safe_buy_path_count)}.`,
      `PROVEN: public_launch_state=${spine.public_launch_state}; public_launch_change_authorized=false.`,
      `PROVEN: csv_apply_authorized=false; supabase_update_authorized=false; all_filters_verified_claim=false.`,
      `PROVEN: Active batch ${String(activeItems.length)} filter(s) across coverage lanes — not a single-filter grind plan.`,
      "PROVEN: Search-placeholder primaries cannot count as safe CTAs (launch-buy-links gate).",
    ],
    inferred_facts: [
      `INFERRED: Top scored zero-safe filters favor known brand families with compat mappings and non-search rescue patterns (shark/honeywell/levoit/blueair).`,
      founderApplyPending.size > 0
        ? `INFERRED: ${String(founderApplyPending.size)} filter(s) in batch-v2 apply plan await founder apply review.`
        : "INFERRED: No pending batch-v2 apply-plan slugs outside safe set.",
    ],
    unknown_facts: [
      zeroSafeSlugs.length === 0
        ? "UNKNOWN: truth spine reports zero zero-safe pool — batch may be empty."
        : `UNKNOWN: Live Supabase buyer paths may differ from committed CSV for ${String(zeroSafeSlugs.length)} zero-safe slug(s).`,
    ].filter(Boolean),
  };
}
