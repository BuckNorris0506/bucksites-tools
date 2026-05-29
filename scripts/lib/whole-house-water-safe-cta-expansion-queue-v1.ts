/**
 * Read-only WHW Safe CTA Expansion Queue v1 — batch discovery across proof lanes.
 * Combines model-first queue, evidence artifacts, apply plans, and committed retailer_links.csv.
 * No CSV, Supabase, public UI, launch-state, or buy-gate mutation.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import {
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
  isOemCatalogSlotKey,
} from "@/lib/retailers/launch-buy-links";

import {
  isWhwModelFirstFitPassV1,
  loadCommittedWhwModelFirstEvidenceResultsV1,
  latestCommittedWhwModelFirstResultsByFilterSlugV1,
} from "./whole-house-water-model-first-evidence-result-v1";
import {
  isWhwBuyerPathCheckedNoSafePassV1,
  loadCommittedWhwBuyerPathProofResultsV1,
  latestCommittedWhwBuyerPathResultsByFilterSlugV1,
  type WhwBuyerPathProofResultV1,
} from "./whole-house-water-buyer-path-proof-result-v1";
import {
  WHW_AP811_BUYER_PATH_RESULT_REL_V1,
  WHW_AP811_FILTER_SLUG_V1,
  loadWhwBatchBuyerPathProofResultV1,
  whwBatchBuyerPathAsExpansionBuyerPathV1,
} from "./whole-house-water-batch-buyer-path-proof-v1";
import {
  WHW_BROWSER_TRUTH_RESULTS_DIR_REL_V1,
  isAllowedWhwBrowserTruthCaptureResultRelPathV1,
  loadWhwBrowserTruthCaptureResultV1,
  type WhwBrowserTruthCaptureResultV1,
} from "./whole-house-water-browser-truth-capture-result-v1";
import {
  WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1,
  type WhwBatchCandidateCheckedV1,
  type WhwModelFirstBatchEvidenceResultV1,
} from "./whole-house-water-model-first-batch-evidence-result-v1";
import {
  buildWholeHouseWaterModelFirstEasiestProofQueueV1,
  type WhwEasiestProofCandidateV1,
  type WhwRecommendedActionV1,
  type WholeHouseWaterModelFirstEasiestProofQueueV1,
} from "./whole-house-water-model-first-easiest-proof-queue-v1";
import {
  WHW_APPLY_PLANS_DIR_REL_V1,
  isAllowedWhwApplyPlanRelPathV1,
  findMatchingCommittedRowsV1,
  loadWhwSafeRetailerLinkApplyPlanV1,
  loadWhwRetailerLinksCsvV1,
  type WhwSafeRetailerLinkApplyPlanV1,
} from "./whole-house-water-safe-retailer-link-apply-plan-v1";

export const WHW_SAFE_CTA_EXPANSION_QUEUE_CONTRACT_V1 =
  "whole_house_water_safe_cta_expansion_queue_v1" as const;

export type WhwSafeCtaExpansionLaneV1 =
  | "APPLY_READY_FOUNDER_APPROVAL_REQUIRED"
  | "BROWSER_TRUTH_READY"
  | "BUYER_PATH_DISCOVERY_READY"
  | "MODEL_FIRST_READY"
  | "MAPPING_REVIEW_REQUIRED"
  | "SKIP_FOR_NOW";

export type WhwSafeCtaExpansionTargetV1 = {
  rank: number;
  filter_slug: string;
  brand_slug: string;
  lane: WhwSafeCtaExpansionLaneV1;
  expansion_score: number;
  model_or_system_slugs: string[];
  oem_part_number: string | null;
  primary_buyer_path_status: string;
  safe_cta_in_committed_csv: boolean;
  model_first_fit_pass: boolean;
  buyer_path_unknown_count: number;
  browser_truth_pass_count: number;
  apply_plan_ready: boolean;
  apply_row_in_committed_csv: boolean;
  founder_approval_required: boolean;
  next_action_hint: string;
  artifact_refs: string[];
};

export type WhwRecommendedNextBatchItemV1 = {
  filter_slug: string;
  lane: WhwSafeCtaExpansionLaneV1;
  packet_kind:
    | "founder_apply_review"
    | "browser_truth_capture"
    | "buyer_path_proof"
    | "model_first_evidence";
  anchor_model_slug: string | null;
  rationale: string;
};

export type WhwSafeCtaExpansionLaneSummaryCountsV1 = Record<WhwSafeCtaExpansionLaneV1, number>;

export function emptyWhwSafeCtaExpansionLaneSummaryCountsV1(): WhwSafeCtaExpansionLaneSummaryCountsV1 {
  return {
    APPLY_READY_FOUNDER_APPROVAL_REQUIRED: 0,
    BROWSER_TRUTH_READY: 0,
    BUYER_PATH_DISCOVERY_READY: 0,
    MODEL_FIRST_READY: 0,
    MAPPING_REVIEW_REQUIRED: 0,
    SKIP_FOR_NOW: 0,
  };
}

export type WholeHouseWaterSafeCtaExpansionQueueV1 = {
  contract: typeof WHW_SAFE_CTA_EXPANSION_QUEUE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  whw_public_opening_authorized: false;
  founder_approval_required_for_csv_apply: true;
  generated_at: string;
  source_paths: string[];
  /** Root-level lane totals for Command Center / report consumers. */
  lane_summary_counts: WhwSafeCtaExpansionLaneSummaryCountsV1;
  summary: {
    filter_count: number;
    mapped_filter_count: number;
    safe_cta_row_count_in_committed_csv: number;
    lane_counts: WhwSafeCtaExpansionLaneSummaryCountsV1;
    whole_house_water_public_launch_state: string;
  };
  top_20_safe_cta_expansion_targets: WhwSafeCtaExpansionTargetV1[];
  top_10_browser_truth_ready: WhwSafeCtaExpansionTargetV1[];
  top_10_buyer_path_discovery_ready: WhwSafeCtaExpansionTargetV1[];
  top_10_model_first_ready: WhwSafeCtaExpansionTargetV1[];
  apply_ready_rows: WhwSafeCtaExpansionTargetV1[];
  blocked_or_skip_rows: WhwSafeCtaExpansionTargetV1[];
  recommended_next_batch: WhwRecommendedNextBatchItemV1[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

const SOURCE_PATHS = [
  "data/whole-house-water/models.csv",
  "data/whole-house-water/filters.csv",
  "data/whole-house-water/compatibility_mappings.csv",
  "data/whole-house-water/retailer_links.csv",
  WHW_BROWSER_TRUTH_RESULTS_DIR_REL_V1,
  WHW_APPLY_PLANS_DIR_REL_V1,
  "data/whole-house-water/batch-production/agent-results-model-first-v1",
  "data/whole-house-water/batch-production/agent-results-buyer-path-v1",
  "data/whole-house-water/batch-production/agent-results-model-first-batch-v1",
  "scripts/lib/whole-house-water-model-first-easiest-proof-queue-v1.ts",
] as const;

const OEM_SYSTEM_BRANDS = new Set(["ge", "3m", "whirlpool", "culligan", "watts", "pentair"]);

const DISCOVERY_LANES: ReadonlySet<WhwSafeCtaExpansionLaneV1> = new Set([
  "BROWSER_TRUTH_READY",
  "BUYER_PATH_DISCOVERY_READY",
  "MODEL_FIRST_READY",
]);

type FilterMeta = {
  brand_slug: string;
  oem_part_number: string | null;
};

type ClassificationContextV1 = {
  filterSlug: string;
  filter: FilterMeta;
  queueDraft: WhwEasiestProofCandidateV1 | null;
  batchCandidate: WhwBatchCandidateCheckedV1 | null;
  modelFirstFitPass: boolean;
  buyerPath: WhwBuyerPathProofResultV1 | null;
  browserTruth: WhwBrowserTruthCaptureResultV1 | null;
  applyPlan: WhwSafeRetailerLinkApplyPlanV1 | null;
  safeCtaInCsv: boolean;
  applyRowInCsv: boolean;
  primaryBuyerPathStatus: string;
  hasRecommendedMapping: boolean;
  compatOnlyMapping: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTruthyPrimary(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function loadCommittedWhwBrowserTruthResultsByFilterSlugV1(args: {
  rootDir: string;
  readdir?: (absDir: string) => string[];
}): Map<string, { relPath: string; result: WhwBrowserTruthCaptureResultV1 }> {
  const readdir = args.readdir ?? ((absDir: string) => readdirSync(absDir));
  const dirAbs = path.join(args.rootDir, WHW_BROWSER_TRUTH_RESULTS_DIR_REL_V1);
  const bySlug = new Map<string, { relPath: string; result: WhwBrowserTruthCaptureResultV1 }>();
  if (!existsSync(dirAbs)) return bySlug;

  for (const name of readdir(dirAbs)) {
    if (!name.endsWith(".results.json")) continue;
    const relPath = `${WHW_BROWSER_TRUTH_RESULTS_DIR_REL_V1}/${name}`;
    if (!isAllowedWhwBrowserTruthCaptureResultRelPathV1(relPath)) continue;
    const loaded = loadWhwBrowserTruthCaptureResultV1({ rootDir: args.rootDir, relPath });
    if (!loaded) continue;
    bySlug.set(loaded.anchor_filter_slug.trim().toLowerCase(), { relPath, result: loaded });
  }
  return bySlug;
}

export function loadCommittedWhwApplyPlansByFilterSlugV1(args: {
  rootDir: string;
  readdir?: (absDir: string) => string[];
}): Map<string, { relPath: string; plan: WhwSafeRetailerLinkApplyPlanV1 }> {
  const readdir = args.readdir ?? ((absDir: string) => readdirSync(absDir));
  const dirAbs = path.join(args.rootDir, WHW_APPLY_PLANS_DIR_REL_V1);
  const bySlug = new Map<string, { relPath: string; plan: WhwSafeRetailerLinkApplyPlanV1 }>();
  if (!existsSync(dirAbs)) return bySlug;

  for (const name of readdir(dirAbs)) {
    if (!name.endsWith(".json")) continue;
    const relPath = `${WHW_APPLY_PLANS_DIR_REL_V1}/${name}`;
    if (!isAllowedWhwApplyPlanRelPathV1(relPath)) continue;
    const loaded = loadWhwSafeRetailerLinkApplyPlanV1({ rootDir: args.rootDir, relPath });
    if (!loaded) continue;
    bySlug.set(loaded.anchor_filter_slug.trim().toLowerCase(), { relPath, plan: loaded });
  }
  return bySlug;
}

function loadWhwModelFirstBatchV1(rootDir: string): WhwModelFirstBatchEvidenceResultV1 | null {
  const abs = path.join(rootDir, WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1);
  if (!existsSync(abs)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(abs, "utf8"));
    if (!isRecord(parsed)) return null;
    if (parsed.contract !== "whole_house_water_model_first_batch_evidence_result_v1") return null;
    return parsed as WhwModelFirstBatchEvidenceResultV1;
  } catch {
    return null;
  }
}

export function buyerPathHasUnknownPdpCandidatesV1(result: WhwBuyerPathProofResultV1): boolean {
  return result.evidence_status_counts.UNKNOWN > 0;
}

export function classifyWhwSafeCtaExpansionLaneV1(ctx: ClassificationContextV1): WhwSafeCtaExpansionLaneV1 {
  if (ctx.applyPlan?.ready_for_founder_approval && !ctx.applyRowInCsv) {
    return "APPLY_READY_FOUNDER_APPROVAL_REQUIRED";
  }

  if (ctx.applyRowInCsv && ctx.safeCtaInCsv) {
    return "SKIP_FOR_NOW";
  }

  const recommendedAction: WhwRecommendedActionV1 | null =
    ctx.queueDraft?.recommended_action ?? null;

  if (recommendedAction === "DO_NOT_USE") return "SKIP_FOR_NOW";
  if (recommendedAction === "SKIP_FAST_NO_SAFE_PATH") return "SKIP_FOR_NOW";

  if (
    recommendedAction === "MAPPING_REVIEW_REQUIRED" ||
    ctx.batchCandidate?.model_proof_status === "BLOCKED" ||
    ctx.batchCandidate?.candidate_outcome === "BLOCKED"
  ) {
    return "MAPPING_REVIEW_REQUIRED";
  }

  const modelPass =
    ctx.modelFirstFitPass || ctx.batchCandidate?.model_proof_status === "PASS";
  const buyerUnknown = ctx.buyerPath ? buyerPathHasUnknownPdpCandidatesV1(ctx.buyerPath) : false;
  const browserPass = ctx.browserTruth?.pass_count ?? 0;

  if (modelPass) {
    if (buyerUnknown && browserPass === 0) {
      return "BROWSER_TRUTH_READY";
    }
    if (browserPass > 0 && !ctx.applyPlan?.ready_for_founder_approval) {
      return "BROWSER_TRUTH_READY";
    }
    if (
      !ctx.buyerPath ||
      (isWhwBuyerPathCheckedNoSafePassV1(ctx.buyerPath) &&
        !buyerUnknown &&
        ctx.batchCandidate?.buyer_path_status === "UNKNOWN")
    ) {
      return "BUYER_PATH_DISCOVERY_READY";
    }
    if (!ctx.buyerPath && ctx.batchCandidate?.model_proof_status === "PASS") {
      return "BUYER_PATH_DISCOVERY_READY";
    }
    if (
      ctx.buyerPath &&
      isWhwBuyerPathCheckedNoSafePassV1(ctx.buyerPath) &&
      !buyerUnknown &&
      browserPass === 0
    ) {
      return "BUYER_PATH_DISCOVERY_READY";
    }
  }

  if (recommendedAction === "RUN_MODEL_FIRST_EVIDENCE") {
    return "MODEL_FIRST_READY";
  }

  if (ctx.compatOnlyMapping && !ctx.hasRecommendedMapping) {
    return "MAPPING_REVIEW_REQUIRED";
  }

  if (ctx.hasRecommendedMapping && ctx.primaryBuyerPathStatus === "SEARCH_PLACEHOLDER_PRIMARY") {
    return "MODEL_FIRST_READY";
  }

  if (ctx.filterSlug === "kinetico-reference-system") {
    return "SKIP_FOR_NOW";
  }

  if (ctx.safeCtaInCsv) {
    return "SKIP_FOR_NOW";
  }

  return "SKIP_FOR_NOW";
}

export function scoreWhwSafeCtaExpansionTargetV1(args: {
  lane: WhwSafeCtaExpansionLaneV1;
  filter: FilterMeta;
  queueDraft: WhwEasiestProofCandidateV1 | null;
  modelCoverageCount: number;
  modelFirstFitPass: boolean;
  buyerPathUnknownCount: number;
  browserTruthPassCount: number;
  batchModelProofPass: boolean;
}): number {
  if (args.lane === "APPLY_READY_FOUNDER_APPROVAL_REQUIRED") return 0;
  if (args.lane === "SKIP_FOR_NOW" || args.lane === "MAPPING_REVIEW_REQUIRED") return -100;

  let score = 0;

  if (args.lane === "BROWSER_TRUTH_READY") score += 48;
  if (args.lane === "BUYER_PATH_DISCOVERY_READY") score += 44;
  if (args.lane === "MODEL_FIRST_READY") score += 36;

  if (args.modelFirstFitPass || args.batchModelProofPass) score += 24;
  if (args.buyerPathUnknownCount > 0) score += 18;
  if (args.browserTruthPassCount > 0) score += 8;

  if (OEM_SYSTEM_BRANDS.has(args.filter.brand_slug)) score += 14;
  const oem = (args.filter.oem_part_number ?? "").trim();
  if (oem.length >= 3) score += 10;

  const coverageCap = Math.min(args.modelCoverageCount * 3, 12);
  score += coverageCap;

  if (args.queueDraft) {
    score += Math.min(args.queueDraft.easiest_proof_score / 4, 20);
    if (args.queueDraft.current_mapping_truth_status === "RECOMMENDED_MAPPING") score += 12;
    if (args.queueDraft.current_mapping_truth_status === "COMPAT_ONLY") score -= 22;
    if (args.queueDraft.current_buyer_path_status === "SEARCH_PLACEHOLDER_PRIMARY") score -= 14;
    if (args.queueDraft.skip_fast_reason) score -= 20;
  }

  return score;
}

function nextActionHint(lane: WhwSafeCtaExpansionLaneV1, filterSlug: string): string {
  switch (lane) {
    case "APPLY_READY_FOUNDER_APPROVAL_REQUIRED":
      return `Founder review apply plan for ${filterSlug}; do not auto-apply retailer_links.csv.`;
    case "BROWSER_TRUTH_READY":
      return `Run browser_truth capture on strongest UNKNOWN PDPs for ${filterSlug}.`;
    case "BUYER_PATH_DISCOVERY_READY":
      return `Run live-browser buyer-path proof for ${filterSlug} (model proof already PASS).`;
    case "MODEL_FIRST_READY":
      return `Run official model/manual evidence packet for ${filterSlug} before buyer-path work.`;
    case "MAPPING_REVIEW_REQUIRED":
      return `Resolve housing/cartridge or replacement-chain mapping ambiguity for ${filterSlug}.`;
    default:
      return `Skip ${filterSlug} until leverage or mapping improves.`;
  }
}

function buildRecommendedNextBatch(
  applyReady: WhwSafeCtaExpansionTargetV1[],
  browserTruth: WhwSafeCtaExpansionTargetV1[],
  buyerPath: WhwSafeCtaExpansionTargetV1[],
  modelFirst: WhwSafeCtaExpansionTargetV1[],
): WhwRecommendedNextBatchItemV1[] {
  const batch: WhwRecommendedNextBatchItemV1[] = [];

  for (const row of applyReady.slice(0, 2)) {
    batch.push({
      filter_slug: row.filter_slug,
      lane: row.lane,
      packet_kind: "founder_apply_review",
      anchor_model_slug: row.model_or_system_slugs[0] ?? null,
      rationale:
        "Full proof chain complete (model + buyer-path + browser_truth + apply plan); founder approval required before CSV apply.",
    });
  }

  for (const row of buyerPath.slice(0, 4)) {
    batch.push({
      filter_slug: row.filter_slug,
      lane: row.lane,
      packet_kind: "buyer_path_proof",
      anchor_model_slug: row.model_or_system_slugs[0] ?? null,
      rationale: row.next_action_hint,
    });
  }

  for (const row of browserTruth.slice(0, 3)) {
    batch.push({
      filter_slug: row.filter_slug,
      lane: row.lane,
      packet_kind: "browser_truth_capture",
      anchor_model_slug: row.model_or_system_slugs[0] ?? null,
      rationale: row.next_action_hint,
    });
  }

  for (const row of modelFirst.slice(0, 4)) {
    batch.push({
      filter_slug: row.filter_slug,
      lane: row.lane,
      packet_kind: "model_first_evidence",
      anchor_model_slug: row.model_or_system_slugs[0] ?? null,
      rationale: row.next_action_hint,
    });
  }

  const seen = new Set<string>();
  return batch.filter((item) => {
    const key = `${item.filter_slug}:${item.packet_kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildWholeHouseWaterSafeCtaExpansionQueueV1(args: {
  rootDir: string;
  now?: () => Date;
}): WholeHouseWaterSafeCtaExpansionQueueV1 {
  const now = args.now ?? (() => new Date());
  const modelFirstQueue: WholeHouseWaterModelFirstEasiestProofQueueV1 =
    buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: args.rootDir, now: args.now });

  const csvRows = loadWhwRetailerLinksCsvV1(args.rootDir);
  const filters = parse(
    readFileSync(path.join(args.rootDir, "data/whole-house-water/filters.csv"), "utf8"),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  ) as Array<{ brand_slug: string; slug: string; oem_part_number?: string }>;
  const mappings = parse(
    readFileSync(path.join(args.rootDir, "data/whole-house-water/compatibility_mappings.csv"), "utf8"),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  ) as Array<{ filter_slug: string; is_recommended?: string }>;

  const recommendedModelsByFilter = new Map<string, number>();
  const compatOnlyByFilter = new Set<string>();
  for (const row of mappings) {
    const filterSlug = row.filter_slug.trim().toLowerCase();
    if (!filterSlug) continue;
    const rec = (row.is_recommended ?? "").trim().toLowerCase();
    const isRec = rec === "true" || rec === "1" || rec === "yes";
    if (isRec) {
      recommendedModelsByFilter.set(filterSlug, (recommendedModelsByFilter.get(filterSlug) ?? 0) + 1);
      compatOnlyByFilter.delete(filterSlug);
    } else if (!recommendedModelsByFilter.has(filterSlug)) {
      compatOnlyByFilter.add(filterSlug);
    }
  }

  const filterMetaBySlug = new Map<string, FilterMeta>();
  for (const row of filters) {
    const slug = row.slug.trim().toLowerCase();
    if (!slug) continue;
    filterMetaBySlug.set(slug, {
      brand_slug: row.brand_slug.trim().toLowerCase(),
      oem_part_number: (row.oem_part_number ?? "").trim() || null,
    });
  }

  const modelFirstBySlug = latestCommittedWhwModelFirstResultsByFilterSlugV1(
    loadCommittedWhwModelFirstEvidenceResultsV1({ rootDir: args.rootDir }),
  );
  const buyerPathBySlug = latestCommittedWhwBuyerPathResultsByFilterSlugV1(
    loadCommittedWhwBuyerPathProofResultsV1({ rootDir: args.rootDir }),
  );
  const batchAp811BuyerPath = loadWhwBatchBuyerPathProofResultV1({
    rootDir: args.rootDir,
    relPath: WHW_AP811_BUYER_PATH_RESULT_REL_V1,
  });
  const browserTruthBySlug = loadCommittedWhwBrowserTruthResultsByFilterSlugV1({
    rootDir: args.rootDir,
  });
  const applyPlansBySlug = loadCommittedWhwApplyPlansByFilterSlugV1({ rootDir: args.rootDir });
  const batch = loadWhwModelFirstBatchV1(args.rootDir);
  const batchByFilter = new Map<string, WhwBatchCandidateCheckedV1>();
  if (batch) {
    for (const row of batch.candidates_checked) {
      batchByFilter.set(row.filter_slug.trim().toLowerCase(), row);
    }
  }

  const defaultWedge = HOMEKEEP_WEDGE_CATALOG.whole_house_water;
  const defaultEvidencePath =
    modelFirstQueue.top_10_easiest_candidates[0]?.evidence_path_to_try_next ??
    "official system/model support or manual → documented OEM replacement cartridge/part number → verified safe direct_buyable buyer path (read-only browser proof; no CSV apply)";

  const queueDraftBySlug = new Map<string, WhwEasiestProofCandidateV1>();
  for (const row of modelFirstQueue.top_10_easiest_candidates) {
    queueDraftBySlug.set(row.filter_slug, row);
  }
  for (const row of modelFirstQueue.skipped_or_hard_cases) {
    if (queueDraftBySlug.has(row.filter_slug)) continue;
    const meta = filterMetaBySlug.get(row.filter_slug);
    queueDraftBySlug.set(row.filter_slug, {
      rank: 0,
      wedge: defaultWedge,
      brand_slug: meta?.brand_slug ?? row.filter_slug.split("-")[0] ?? "",
      model_or_system_slugs: row.model_or_system_slugs,
      filter_slug: row.filter_slug,
      model_coverage_count: row.model_or_system_slugs.length,
      current_buyer_path_status: "SEARCH_PLACEHOLDER_PRIMARY",
      current_mapping_truth_status: "UNKNOWN",
      easiest_proof_score: 0,
      evidence_path_to_try_next: defaultEvidencePath,
      skip_fast_reason: row.skip_fast_reason,
      recommended_action: row.recommended_action,
    });
  }
  for (const row of modelFirstQueue.completed_or_waiting_candidates) {
    if (queueDraftBySlug.has(row.filter_slug)) continue;
    queueDraftBySlug.set(row.filter_slug, {
      rank: 0,
      wedge: defaultWedge,
      brand_slug: row.brand_slug,
      model_or_system_slugs: row.model_or_system_slugs,
      filter_slug: row.filter_slug,
      model_coverage_count: row.model_or_system_slugs.length,
      current_buyer_path_status: "SEARCH_PLACEHOLDER_PRIMARY",
      current_mapping_truth_status: "RECOMMENDED_MAPPING",
      easiest_proof_score: 0,
      evidence_path_to_try_next: defaultEvidencePath,
      skip_fast_reason: null,
      recommended_action: "BUYER_PATH_REVIEW_REQUIRED",
    });
  }

  const linksByFilter = new Map<string, typeof csvRows>();
  for (const row of csvRows) {
    const slug = row.filter_slug?.trim().toLowerCase() ?? "";
    if (!slug) continue;
    if (!linksByFilter.has(slug)) linksByFilter.set(slug, []);
    linksByFilter.get(slug)!.push(row);
  }

  let safeCtaRowCount = 0;
  for (const row of csvRows) {
    if (
      isDirectBuyableSafeCtaRow({
        retailer_key: row.retailer_key ?? null,
        affiliate_url: (row.affiliate_url ?? row.destination_url ?? "").trim(),
        browser_truth_classification: row.browser_truth_classification ?? null,
        browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
      })
    ) {
      safeCtaRowCount += 1;
    }
  }

  const mappedSlugs = new Set<string>();
  for (const row of mappings) {
    const slug = row.filter_slug.trim().toLowerCase();
    if (slug) mappedSlugs.add(slug);
  }
  for (const slug of Array.from(applyPlansBySlug.keys())) mappedSlugs.add(slug);
  for (const slug of Array.from(browserTruthBySlug.keys())) mappedSlugs.add(slug);

  const drafts: Omit<WhwSafeCtaExpansionTargetV1, "rank">[] = [];

  for (const filterSlug of Array.from(mappedSlugs).sort()) {
    const filter = filterMetaBySlug.get(filterSlug) ?? {
      brand_slug: filterSlug.split("-")[0] ?? "",
      oem_part_number: null,
    };
    const queueDraft = queueDraftBySlug.get(filterSlug) ?? null;
    const batchCandidate = batchByFilter.get(filterSlug) ?? null;
    const modelEntry = modelFirstBySlug.get(filterSlug);
    const buyerEntry = buyerPathBySlug.get(filterSlug);
    let buyerPathForLane: WhwBuyerPathProofResultV1 | null = buyerEntry?.result ?? null;
    if (!buyerPathForLane && filterSlug === WHW_AP811_FILTER_SLUG_V1 && batchAp811BuyerPath) {
      buyerPathForLane = whwBatchBuyerPathAsExpansionBuyerPathV1(batchAp811BuyerPath);
    }
    const browserEntry = browserTruthBySlug.get(filterSlug);
    const applyEntry = applyPlansBySlug.get(filterSlug);

    const linkRows = linksByFilter.get(filterSlug) ?? [];
    const primary =
      linkRows.find((r) => isTruthyPrimary(r.is_primary)) ?? linkRows[0] ?? null;
    const primaryUrl = (primary?.destination_url ?? primary?.affiliate_url ?? "").trim();
    let primaryStatus = "NO_PRIMARY_LINK";
    if (primary) {
      const link = {
        retailer_key: primary.retailer_key ?? null,
        affiliate_url: primaryUrl,
        browser_truth_classification: primary.browser_truth_classification ?? null,
        browser_truth_buyable_subtype: primary.browser_truth_buyable_subtype ?? null,
      };
      if (isDirectBuyableSafeCtaRow(link)) primaryStatus = "SAFE_GATED_DIRECT_BUYABLE";
      else if (
        buyLinkGateFailureKind(link) === "search_placeholder" ||
        isManufacturerSiteSearchUrl(primaryUrl) ||
        (buyLinkGateFailureKind(link) === "missing_browser_truth" &&
          isOemCatalogSlotKey(link.retailer_key))
      ) {
        primaryStatus = "SEARCH_PLACEHOLDER_PRIMARY";
      } else primaryStatus = "NO_DIRECT_BUYABLE_CLASSIFICATION";
    }

    const safeCtaInCsv = linkRows.some((row) =>
      isDirectBuyableSafeCtaRow({
        retailer_key: row.retailer_key ?? null,
        affiliate_url: (row.affiliate_url ?? row.destination_url ?? "").trim(),
        browser_truth_classification: row.browser_truth_classification ?? null,
        browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
      }),
    );

    const applyRowInCsv = applyEntry?.plan.proposed_retailer_link_row
      ? findMatchingCommittedRowsV1({
          rows: csvRows,
          proposed: applyEntry.plan.proposed_retailer_link_row,
        }).length > 0
      : false;

    const ctx: ClassificationContextV1 = {
      filterSlug,
      filter,
      queueDraft,
      batchCandidate,
      modelFirstFitPass: modelEntry ? isWhwModelFirstFitPassV1(modelEntry.result) : false,
      buyerPath: buyerPathForLane,
      browserTruth: browserEntry?.result ?? null,
      applyPlan: applyEntry?.plan ?? null,
      safeCtaInCsv,
      applyRowInCsv,
      primaryBuyerPathStatus: primaryStatus,
      hasRecommendedMapping: (recommendedModelsByFilter.get(filterSlug) ?? 0) > 0,
      compatOnlyMapping: compatOnlyByFilter.has(filterSlug),
    };

    const lane = classifyWhwSafeCtaExpansionLaneV1(ctx);
    const modelOrSlugs =
      queueDraft?.model_or_system_slugs ??
      batchCandidate?.model_or_system_slugs ??
      [];
    const modelCoverage =
      queueDraft?.model_coverage_count ?? modelOrSlugs.length;

    const artifactRefs: string[] = [];
    if (modelEntry) artifactRefs.push(modelEntry.relPath);
    if (buyerEntry) artifactRefs.push(buyerEntry.relPath);
    else if (filterSlug === WHW_AP811_FILTER_SLUG_V1 && batchAp811BuyerPath) {
      artifactRefs.push(WHW_AP811_BUYER_PATH_RESULT_REL_V1);
    }
    if (browserEntry) artifactRefs.push(browserEntry.relPath);
    if (applyEntry) artifactRefs.push(applyEntry.relPath);

    drafts.push({
      filter_slug: filterSlug,
      brand_slug: queueDraft?.brand_slug ?? batchCandidate?.brand_slug ?? filter.brand_slug,
      lane,
      expansion_score: scoreWhwSafeCtaExpansionTargetV1({
        lane,
        filter,
        queueDraft,
        modelCoverageCount: modelCoverage,
        modelFirstFitPass: ctx.modelFirstFitPass,
        buyerPathUnknownCount: ctx.buyerPath?.evidence_status_counts.UNKNOWN ?? 0,
        browserTruthPassCount: ctx.browserTruth?.pass_count ?? 0,
        batchModelProofPass: batchCandidate?.model_proof_status === "PASS",
      }),
      model_or_system_slugs: modelOrSlugs,
      oem_part_number:
        batchCandidate?.oem_part_number ?? filter.oem_part_number ?? null,
      primary_buyer_path_status: queueDraft?.current_buyer_path_status ?? primaryStatus,
      safe_cta_in_committed_csv: safeCtaInCsv,
      model_first_fit_pass:
        ctx.modelFirstFitPass || batchCandidate?.model_proof_status === "PASS",
      buyer_path_unknown_count: ctx.buyerPath?.evidence_status_counts.UNKNOWN ?? 0,
      browser_truth_pass_count: ctx.browserTruth?.pass_count ?? 0,
      apply_plan_ready: ctx.applyPlan?.ready_for_founder_approval ?? false,
      apply_row_in_committed_csv: applyRowInCsv,
      founder_approval_required:
        lane === "APPLY_READY_FOUNDER_APPROVAL_REQUIRED" ||
        (ctx.applyPlan?.founder_approval_required ?? false),
      next_action_hint: nextActionHint(lane, filterSlug),
      artifact_refs: artifactRefs,
    });
  }

  const laneCounts = emptyWhwSafeCtaExpansionLaneSummaryCountsV1();
  for (const row of drafts) laneCounts[row.lane] += 1;

  const sortDiscovery = (rows: typeof drafts) =>
    [...rows]
      .filter((r) => DISCOVERY_LANES.has(r.lane))
      .sort((a, b) => {
        if (b.expansion_score !== a.expansion_score) return b.expansion_score - a.expansion_score;
        if (b.model_first_fit_pass !== a.model_first_fit_pass) {
          return Number(b.model_first_fit_pass) - Number(a.model_first_fit_pass);
        }
        return a.filter_slug.localeCompare(b.filter_slug);
      });

  const discoverySorted = sortDiscovery(drafts);
  const withRank = (rows: typeof drafts): WhwSafeCtaExpansionTargetV1[] =>
    rows.map((row, idx) => ({ rank: idx + 1, ...row }));

  const apply_ready_rows = withRank(
    drafts.filter((r) => r.lane === "APPLY_READY_FOUNDER_APPROVAL_REQUIRED"),
  );
  const top_20_safe_cta_expansion_targets = withRank(discoverySorted.slice(0, 20));
  const top_10_browser_truth_ready = withRank(
    discoverySorted.filter((r) => r.lane === "BROWSER_TRUTH_READY").slice(0, 10),
  );
  const top_10_buyer_path_discovery_ready = withRank(
    discoverySorted.filter((r) => r.lane === "BUYER_PATH_DISCOVERY_READY").slice(0, 10),
  );
  const top_10_model_first_ready = withRank(
    discoverySorted.filter((r) => r.lane === "MODEL_FIRST_READY").slice(0, 10),
  );
  const blocked_or_skip_rows = withRank(
    [...drafts]
      .filter((r) => r.lane === "SKIP_FOR_NOW" || r.lane === "MAPPING_REVIEW_REQUIRED")
      .sort((a, b) => a.filter_slug.localeCompare(b.filter_slug))
      .slice(0, 20),
  );

  const recommended_next_batch = buildRecommendedNextBatch(
    apply_ready_rows,
    top_10_browser_truth_ready,
    top_10_buyer_path_discovery_ready,
    top_10_model_first_ready,
  );

  const launchState = getVerticalLaunchState("whole-house-water");

  return {
    contract: WHW_SAFE_CTA_EXPANSION_QUEUE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    whw_public_opening_authorized: false,
    founder_approval_required_for_csv_apply: true,
    generated_at: now().toISOString(),
    source_paths: [...SOURCE_PATHS],
    lane_summary_counts: { ...laneCounts },
    summary: {
      filter_count: filterMetaBySlug.size,
      mapped_filter_count: mappedSlugs.size,
      safe_cta_row_count_in_committed_csv: safeCtaRowCount,
      lane_counts: { ...laneCounts },
      whole_house_water_public_launch_state: launchState,
    },
    top_20_safe_cta_expansion_targets,
    top_10_browser_truth_ready,
    top_10_buyer_path_discovery_ready,
    top_10_model_first_ready,
    apply_ready_rows,
    blocked_or_skip_rows,
    recommended_next_batch,
    proven_facts: [
      `PROVEN: Committed retailer_links.csv has ${String(safeCtaRowCount)} safe CTA row(s) (direct_buyable + launch-buy-links gate).`,
      `PROVEN: whole-house-water launch state is ${launchState}.`,
      `PROVEN: Queue classifies ${String(drafts.length)} mapped WHW filters across ${Object.keys(laneCounts).length} lanes.`,
      `PROVEN: APPLY_READY count=${String(laneCounts.APPLY_READY_FOUNDER_APPROVAL_REQUIRED)}; discovery targets in top_20=${String(top_20_safe_cta_expansion_targets.length)}.`,
      `PROVEN: csv_apply_authorized=false; supabase_update_authorized=false; whw_public_opening_authorized=false.`,
      `PROVEN: Model-first artifacts loaded for ${String(modelFirstBySlug.size)} filter(s); buyer-path for ${String(buyerPathBySlug.size)}; browser_truth for ${String(browserTruthBySlug.size)}; apply plans for ${String(applyPlansBySlug.size)}.`,
      apply_ready_rows.length > 0
        ? `PROVEN: apply_ready filter(s): ${apply_ready_rows.map((r) => r.filter_slug).join(",")}.`
        : "PROVEN: No apply-ready filters with founder plan and missing CSV row.",
    ],
    inferred_facts: [
      "INFERRED: APPLY_READY rows are excluded from top_20 discovery — they await founder approval, not new proof work.",
      recommended_next_batch.length >= 2
        ? `INFERRED: recommended_next_batch has ${String(recommended_next_batch.length)} packet(s) spanning multiple lanes.`
        : "INFERRED: Expand artifact coverage to grow batch recommendations.",
      top_10_buyer_path_discovery_ready[0]
        ? `INFERRED: Highest buyer-path discovery target is ${top_10_buyer_path_discovery_ready[0].filter_slug} (model proof PASS, PDP candidates not yet bounded).`
        : "INFERRED: No buyer-path discovery targets surfaced — run model-first batch first.",
    ],
    unknown_facts: [
      "UNKNOWN: How many additional WHW filters will pass full proof chain beyond current artifacts.",
      "UNKNOWN: Whether founder will approve AP810 aquapure-dealer row before next discovery batch.",
    ],
  };
}
