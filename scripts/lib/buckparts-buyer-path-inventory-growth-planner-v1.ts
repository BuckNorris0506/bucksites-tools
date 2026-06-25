/**
 * Read-only Buyer-Path Inventory Growth Planner v1 — deterministic execution plan
 * for maximizing SAFE_BUYER_PATH_PROVEN inventory while preserving truth.
 * Design contract: docs/buckparts-buyer-path-inventory-growth-engine-v1.md
 * Does not replace Command Center or mutate production.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { HOMEKEEP_WEDGE_CATALOG, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";

import type { AllProductSafeBuyerPathCensusV1 } from "./all-product-safe-buyer-path-census-v1";
import { buildAllProductSafeBuyerPathCensusV1 } from "./all-product-safe-buyer-path-census-v1";
import type { DemandToCoverageNextLaneReportV1 } from "./demand-to-coverage-next-lane-v1";
import type { PublicWedgeReadinessAndEasiestWinsV1 } from "./public-wedge-readiness-and-easiest-wins-v1";
import { buildPublicWedgeReadinessAndEasiestWinsV1 } from "./public-wedge-readiness-and-easiest-wins-v1";
import {
  buildMarketingRiskIndexFromOpportunitiesV1,
  type MarketingRiskBySlugV1,
} from "./referenceability-factory-run-v1";
import type { ReferenceabilityFactoryRunV1 } from "./referenceability-factory-run-v1";
import type { RepoRuntimeConvergenceGateReportV1 } from "./repo-runtime-convergence-gate-v1";

export const BUYER_PATH_INVENTORY_GROWTH_PLANNER_CONTRACT_V1 =
  "buyer_path_inventory_growth_planner_v1" as const;

export const BUYER_PATH_INVENTORY_GROWTH_PLANNER_SOURCE_COMMAND_V1 =
  "npm run buckparts:buyer-path-inventory-growth-planner" as const;

export const BUYER_PATH_INVENTORY_GROWTH_PLANNER_DESIGN_DOC_V1 =
  "docs/buckparts-buyer-path-inventory-growth-engine-v1.md" as const;

export type GrowthPlannerStrategyV1 = "R" | "C" | "F" | "G0";

export type GrowthPlannerWinningStrategyV1 =
  | "R"
  | "C"
  | "F"
  | "MIXED"
  | "BLOCKED"
  | "UNKNOWN";

export type GrowthPlannerInventoryEffectV1 = "+1" | "quality_only" | "unknown";

export type GrowthPlannerTruthRiskV1 = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export type GrowthPlannerCurrentInventoryV1 = {
  safe_buyer_path_proven_count: number;
  safe_buyer_path_suppressed_trust_count: number;
  wedges_with_proven_paths: number;
  runtime_convergence_posture: string;
  ap_convergence_gap_size: number | null;
};

export type GrowthPlannerStrategyClassificationV1 = {
  current_winning_strategy: GrowthPlannerWinningStrategyV1;
  why: string;
  condition_classes: string[];
  command_center_authoritative_nba: string | null;
  command_center_rescues_demoted: boolean;
};

export type GrowthPlannerWorkQueueItemV1 = {
  rank: number;
  strategy: GrowthPlannerStrategyV1;
  slug: string | null;
  family: string | null;
  wedge: HomekeepWedgeCatalog | string | null;
  expected_inventory_effect: GrowthPlannerInventoryEffectV1;
  truth_risk: GrowthPlannerTruthRiskV1;
  blocking_facts: string[];
  validation_command: string;
  source_artifact: string;
  notes: string[];
};

export type GrowthPlannerBlockedWorkItemV1 = {
  strategy: GrowthPlannerStrategyV1 | "R";
  slug: string | null;
  wedge: HomekeepWedgeCatalog | string | null;
  block_reason: string;
  source_artifact: string;
  validation_command: string;
};

export type GrowthPlannerQualityFollowOnV1 = {
  work_item_id: string;
  slug: string;
  wedge: HomekeepWedgeCatalog | string;
  improvement_class: string;
  expected_inventory_effect: "quality_only";
  source_artifact: string;
  validation_command: string;
};

export type BuyerPathInventoryGrowthPlannerReportV1 = {
  contract: typeof BUYER_PATH_INVENTORY_GROWTH_PLANNER_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  artifact_write_authorized: false;
  supabase_writes: false;
  source_command: typeof BUYER_PATH_INVENTORY_GROWTH_PLANNER_SOURCE_COMMAND_V1;
  design_doc: typeof BUYER_PATH_INVENTORY_GROWTH_PLANNER_DESIGN_DOC_V1;
  generated_at: string;
  replaces_command_center: false;
  current_inventory: GrowthPlannerCurrentInventoryV1;
  strategy_classification: GrowthPlannerStrategyClassificationV1;
  ranked_work_queue: GrowthPlannerWorkQueueItemV1[];
  blocked_work: GrowthPlannerBlockedWorkItemV1[];
  quality_follow_on: GrowthPlannerQualityFollowOnV1[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type CommandCenterNbaSliceV1 = {
  present: boolean;
  next_best_action: string | null;
  source_path: string | null;
  rescues_demoted: boolean;
};

export type GrowthPlannerSignalsV1 = {
  proven_count: number;
  suppressed_count: number;
  wedges_with_proven_paths: number;
  convergence_state: string;
  convergence_gap_size: number | null;
  cc_nba: CommandCenterNbaSliceV1;
  demand_lane_source_status: string | null;
  demand_recommended_action: string | null;
  demand_next_batch_candidate: string | null;
  top_rescue_high_risk: boolean;
  family_expand_target_count: number;
  referenceability_work_item_count: number;
};

const CC_AUTHORITY_HISTORY_DIR_V1 = "data/command-center/customer-authority-history";
const PUBLIC_WEDGE_REPORT_CMD_V1 = "tsx scripts/report-public-wedge-readiness-and-easiest-wins-v1.ts";
const DEMAND_LANE_REPORT_CMD_V1 = "tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts";

function defaultFileExists(abs: string): boolean {
  return existsSync(abs);
}

function defaultReadText(abs: string): string {
  return readFileSync(abs, "utf8");
}

export function loadCommandCenterNbaSliceV1(
  rootDir: string,
  fileExists: (abs: string) => boolean = defaultFileExists,
  readText: (abs: string) => string = defaultReadText,
): CommandCenterNbaSliceV1 {
  const dir = path.join(rootDir, CC_AUTHORITY_HISTORY_DIR_V1);
  if (!fileExists(dir)) {
    return {
      present: false,
      next_best_action: null,
      source_path: null,
      rescues_demoted: false,
    };
  }

  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .reverse();

  for (const name of files) {
    const abs = path.join(dir, name);
    try {
      const raw = JSON.parse(readText(abs)) as Record<string, unknown>;
      const captures = raw.captures as Record<string, unknown> | undefined;
      const nba =
        typeof captures?.factory_next_best_action === "string"
          ? captures.factory_next_best_action
          : typeof raw.next_best_action === "string"
            ? raw.next_best_action
            : null;

      if (nba) {
        const lower = nba.toLowerCase();
        const rescues_demoted =
          lower.includes("demand-to-coverage") ||
          lower.includes("demand_to_coverage") ||
          lower.includes("start_new_demand_selected_batch") ||
          lower.includes("rescue queue remain backlog");

        return {
          present: true,
          next_best_action: nba,
          source_path: path.join(CC_AUTHORITY_HISTORY_DIR_V1, name),
          rescues_demoted,
        };
      }
    } catch {
      continue;
    }
  }

  return {
    present: false,
    next_best_action: null,
    source_path: CC_AUTHORITY_HISTORY_DIR_V1,
    rescues_demoted: false,
  };
}

export function ccDemandOverrideActiveV1(cc: CommandCenterNbaSliceV1): boolean {
  if (!cc.next_best_action) return false;
  const lower = cc.next_best_action.toLowerCase();
  return (
    lower.includes("demand-to-coverage") ||
    lower.includes("demand_to_coverage") ||
    lower.includes("start_new_demand_selected_batch")
  );
}

export function wrongPartRiskForSlugV1(
  slug: string,
  marketingRisk: MarketingRiskBySlugV1 | null,
): GrowthPlannerTruthRiskV1 {
  const risk = marketingRisk?.get(slug)?.wrong_part_risk;
  if (risk === "HIGH") return "HIGH";
  if (risk === "MEDIUM") return "MEDIUM";
  if (risk === "LOW") return "LOW";
  return "UNKNOWN";
}

export function classifyGrowthPlannerWinningStrategyV1(
  signals: GrowthPlannerSignalsV1,
): { strategy: GrowthPlannerWinningStrategyV1; why: string; condition_classes: string[] } {
  const classes: string[] = [];

  const apBlocked =
    signals.convergence_state === "EXPLICITLY_DIVERGED" ||
    signals.convergence_state === "BLOCKED";

  if (apBlocked) {
    classes.push("G0_BLOCKED");
  }

  if (signals.suppressed_count > signals.proven_count) {
    classes.push("G1_RESCUE_HEAVY");
  }

  if (signals.wedges_with_proven_paths > 0 && signals.family_expand_target_count > 0) {
    classes.push("G2_FAMILY_EXPAND");
  }

  if (signals.demand_lane_source_status === "PROVEN") {
    classes.push("G3_CREATE_GREENFIELD");
  }

  if (signals.top_rescue_high_risk) {
    classes.push("G4_RESCUE_EXPENSIVE");
  }

  if (ccDemandOverrideActiveV1(signals.cc_nba) || signals.cc_nba.rescues_demoted) {
    classes.push("G5_CC_DEMAND_OVERRIDE");
  }

  if (signals.referenceability_work_item_count > 0 && signals.proven_count > 0) {
    classes.push("G6_QUALITY_ONLY");
  }

  if (apBlocked && signals.wedges_with_proven_paths === 0 && signals.proven_count === 0) {
    return {
      strategy: "BLOCKED",
      why: "Runtime convergence blocked with no proven wedge nucleus — parity and evidence required before growth.",
      condition_classes: classes,
    };
  }

  if (
    apBlocked &&
    (classes.includes("G2_FAMILY_EXPAND") || classes.includes("G5_CC_DEMAND_OVERRIDE"))
  ) {
    return {
      strategy: "MIXED",
      why: "G0 parity gate blocks AP live promotions; family expand and/or demand-to-coverage proceed on other wedges while parity closes first.",
      condition_classes: classes,
    };
  }

  if (classes.includes("G5_CC_DEMAND_OVERRIDE") && classes.includes("G2_FAMILY_EXPAND")) {
    return {
      strategy: "MIXED",
      why: "Command Center steers demand-to-coverage while proven families support expansion — not rescue-first.",
      condition_classes: classes,
    };
  }

  if (classes.includes("G5_CC_DEMAND_OVERRIDE")) {
    return {
      strategy: "C",
      why: "Command Center authoritative NBA names demand-to-coverage over naive rescue ordering.",
      condition_classes: classes,
    };
  }

  if (classes.includes("G4_RESCUE_EXPENSIVE") && classes.includes("G2_FAMILY_EXPAND")) {
    return {
      strategy: "F",
      why: "Top rescue rows carry HIGH wrong-part risk — family expansion from proven nuclei is safer leverage.",
      condition_classes: classes,
    };
  }

  if (classes.includes("G2_FAMILY_EXPAND") && classes.includes("G1_RESCUE_HEAVY")) {
    return {
      strategy: "MIXED",
      why: "Proven family adjacency and suppressed rescue stock both exist — sequence F before R.",
      condition_classes: classes,
    };
  }

  if (classes.includes("G1_RESCUE_HEAVY")) {
    return {
      strategy: "R",
      why: "Suppressed trust inventory exceeds proven count with rescuable MED/LOW risk slugs.",
      condition_classes: classes,
    };
  }

  if (classes.includes("G3_CREATE_GREENFIELD")) {
    return {
      strategy: "C",
      why: "Demand lane PROVEN with greenfield batch candidate.",
      condition_classes: classes,
    };
  }

  if (classes.includes("G2_FAMILY_EXPAND")) {
    return {
      strategy: "F",
      why: "Proven wedge nuclei with ranked family expansion targets.",
      condition_classes: classes,
    };
  }

  return {
    strategy: "UNKNOWN",
    why: "Insufficient repo signals to classify a dominant growth strategy.",
    condition_classes: classes,
  };
}

export function buildGrowthPlannerRankedWorkQueueV1(args: {
  census: AllProductSafeBuyerPathCensusV1;
  publicWedge: PublicWedgeReadinessAndEasiestWinsV1 | null;
  convergence: RepoRuntimeConvergenceGateReportV1 | null;
  demand: DemandToCoverageNextLaneReportV1 | null;
  cc: CommandCenterNbaSliceV1;
  marketingRisk: MarketingRiskBySlugV1 | null;
}): {
  ranked: GrowthPlannerWorkQueueItemV1[];
  blocked: GrowthPlannerBlockedWorkItemV1[];
} {
  const ranked: Omit<GrowthPlannerWorkQueueItemV1, "rank">[] = [];
  const blocked: GrowthPlannerBlockedWorkItemV1[] = [];

  const wedgesWithProven = new Set(
    args.census.wedge_coverage
      .filter((w) => w.safe_buyer_path_proven_count > 0)
      .map((w) => w.wedge),
  );

  const apBlocked =
    args.convergence?.state === "EXPLICITLY_DIVERGED" ||
    args.convergence?.state === "BLOCKED";

  if (apBlocked) {
    ranked.push({
      strategy: "G0",
      slug: null,
      family: null,
      wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
      expected_inventory_effect: "unknown",
      truth_risk: "MEDIUM",
      blocking_facts: [
        `ap_convergence_state=${args.convergence?.state ?? "UNKNOWN"}`,
        `gap_size=${args.convergence?.measurement.gap_size ?? "UNKNOWN"}`,
        "Live AP promotions are inventory-illusory until CONVERGED.",
      ],
      validation_command: "npm run buckparts:repo-runtime-convergence:check",
      source_artifact: "scripts/lib/repo-runtime-convergence-gate-v1.ts",
      notes: ["Parity-first slice per G0_BLOCKED — owner-approved Supabase close required."],
    });
  }

  if (args.publicWedge) {
    for (const target of args.publicWedge.global_plan.next_10_easiest_truthful_expansion_targets) {
      if (target.requires_model_first) continue;
      if (!wedgesWithProven.has(target.wedge)) continue;

      ranked.push({
        strategy: "F",
        slug: target.target_kind === "filter_slug" ? target.target_id : null,
        family: target.target_kind === "brand_or_family" ? target.target_id : null,
        wedge: target.wedge,
        expected_inventory_effect: "+1",
        truth_risk: "LOW",
        blocking_facts: apBlocked && target.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier
          ? ["G0_BLOCKED for air_purifier live promotion until parity."]
          : [],
        validation_command: PUBLIC_WEDGE_REPORT_CMD_V1,
        source_artifact: "scripts/lib/public-wedge-readiness-and-easiest-wins-v1.ts",
        notes: [target.reason, `easiest_truthful_win_score=${target.score}`],
      });
    }
  }

  const ccOverride = ccDemandOverrideActiveV1(args.cc);
  if (args.demand && (ccOverride || args.demand.source_status === "PROVEN")) {
    ranked.push({
      strategy: "C",
      slug: args.demand.next_batch_candidate,
      family: null,
      wedge: args.demand.next_wedge,
      expected_inventory_effect: "unknown",
      truth_risk: "HIGH",
      blocking_facts: args.demand.blockers,
      validation_command: DEMAND_LANE_REPORT_CMD_V1,
      source_artifact: "scripts/lib/demand-to-coverage-next-lane-v1.ts",
      notes: [
        args.demand.recommended_next_action,
        ccOverride ? "CC authoritative demand-to-coverage override active." : "",
      ].filter(Boolean),
    });
  }

  for (const row of args.census.top_20_rescue_queue) {
    const risk = wrongPartRiskForSlugV1(row.slug, args.marketingRisk);

    if (risk === "HIGH") {
      blocked.push({
        strategy: "R",
        slug: row.slug,
        wedge: row.wedge,
        block_reason:
          "HIGH wrong-part risk — family expansion preferred over rescue (G4_RESCUE_EXPENSIVE).",
        source_artifact: "scripts/lib/all-product-safe-buyer-path-census-v1.ts",
        validation_command: "npm run buckparts:all-product-safe-buyer-path-census",
      });
      continue;
    }

    if (
      apBlocked &&
      row.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier
    ) {
      blocked.push({
        strategy: "R",
        slug: row.slug,
        wedge: row.wedge,
        block_reason: "AP runtime convergence not CONVERGED — rescue promotion ineffective for live homeowners.",
        source_artifact: "scripts/lib/repo-runtime-convergence-gate-v1.ts",
        validation_command: "npm run buckparts:repo-runtime-convergence:check",
      });
      continue;
    }

    if (ccOverride || args.cc.rescues_demoted) {
      blocked.push({
        strategy: "R",
        slug: row.slug,
        wedge: row.wedge,
        block_reason:
          "Command Center demotes rescue queue — demand-to-coverage is authoritative (G5).",
        source_artifact: args.cc.source_path ?? CC_AUTHORITY_HISTORY_DIR_V1,
        validation_command: "npm run buckparts:command-center",
      });
      continue;
    }

    ranked.push({
      strategy: "R",
      slug: row.slug,
      family: null,
      wedge: row.wedge,
      expected_inventory_effect: "+1",
      truth_risk: risk === "UNKNOWN" ? "MEDIUM" : risk,
      blocking_facts:
        row.evidence_files.length === 0 ? ["evidence_files.length=0"] : [],
      validation_command: "npm run buckparts:all-product-safe-buyer-path-census",
      source_artifact: "scripts/lib/all-product-safe-buyer-path-census-v1.ts",
      notes: [
        `rescue_priority_score=${row.rescue_priority_score}`,
        row.recommended_next_safe_action,
      ],
    });
  }

  const withRanks = ranked.map((item, index) => ({ ...item, rank: index + 1 }));
  return { ranked: withRanks, blocked };
}

export function buildGrowthPlannerQualityFollowOnV1(
  referenceability: ReferenceabilityFactoryRunV1 | null,
): GrowthPlannerQualityFollowOnV1[] {
  if (!referenceability) return [];

  return referenceability.work_items.slice(0, 15).map((item) => ({
    work_item_id: item.work_item_id,
    slug: item.slug,
    wedge: item.wedge,
    improvement_class: item.improvement_class,
    expected_inventory_effect: "quality_only" as const,
    source_artifact: "scripts/lib/referenceability-factory-run-v1.ts",
    validation_command: "npm run buckparts:referenceability:factory",
  }));
}

export function buildGrowthPlannerSignalsV1(args: {
  census: AllProductSafeBuyerPathCensusV1;
  publicWedge: PublicWedgeReadinessAndEasiestWinsV1 | null;
  convergence: RepoRuntimeConvergenceGateReportV1 | null;
  demand: DemandToCoverageNextLaneReportV1 | null;
  cc: CommandCenterNbaSliceV1;
  marketingRisk: MarketingRiskBySlugV1 | null;
  referenceability: ReferenceabilityFactoryRunV1 | null;
}): GrowthPlannerSignalsV1 {
  const wedges_with_proven_paths = args.census.wedge_coverage.filter(
    (w) => w.safe_buyer_path_proven_count > 0,
  ).length;

  const wedgesWithProven = new Set(
    args.census.wedge_coverage
      .filter((w) => w.safe_buyer_path_proven_count > 0)
      .map((w) => w.wedge),
  );

  const family_expand_target_count =
    args.publicWedge?.global_plan.next_10_easiest_truthful_expansion_targets.filter(
      (t) => !t.requires_model_first && wedgesWithProven.has(t.wedge),
    ).length ?? 0;

  const topRescue = args.census.top_20_rescue_queue[0];
  const top_rescue_high_risk = topRescue
    ? wrongPartRiskForSlugV1(topRescue.slug, args.marketingRisk) === "HIGH"
    : false;

  return {
    proven_count: args.census.classification_counts.SAFE_BUYER_PATH_PROVEN ?? 0,
    suppressed_count: args.census.classification_counts.SAFE_BUYER_PATH_SUPPRESSED_TRUST ?? 0,
    wedges_with_proven_paths,
    convergence_state: args.convergence?.state ?? "UNKNOWN",
    convergence_gap_size: args.convergence?.measurement.gap_size ?? null,
    cc_nba: args.cc,
    demand_lane_source_status: args.demand?.source_status ?? null,
    demand_recommended_action: args.demand?.recommended_next_action ?? null,
    demand_next_batch_candidate: args.demand?.next_batch_candidate ?? null,
    top_rescue_high_risk,
    family_expand_target_count,
    referenceability_work_item_count: args.referenceability?.work_item_count ?? 0,
  };
}

export function buildBuyerPathInventoryGrowthPlannerReportFromInputsV1(args: {
  census: AllProductSafeBuyerPathCensusV1;
  publicWedge: PublicWedgeReadinessAndEasiestWinsV1 | null;
  convergence: RepoRuntimeConvergenceGateReportV1 | null;
  demand: DemandToCoverageNextLaneReportV1 | null;
  cc: CommandCenterNbaSliceV1;
  marketingRisk: MarketingRiskBySlugV1 | null;
  referenceability: ReferenceabilityFactoryRunV1 | null;
  generated_at: string;
}): BuyerPathInventoryGrowthPlannerReportV1 {
  const signals = buildGrowthPlannerSignalsV1(args);
  const classification = classifyGrowthPlannerWinningStrategyV1(signals);
  const { ranked, blocked } = buildGrowthPlannerRankedWorkQueueV1({
    census: args.census,
    publicWedge: args.publicWedge,
    convergence: args.convergence,
    demand: args.demand,
    cc: args.cc,
    marketingRisk: args.marketingRisk,
  });

  const quality_follow_on = buildGrowthPlannerQualityFollowOnV1(args.referenceability);

  const unknown_facts: string[] = [];
  if (!args.cc.present) {
    unknown_facts.push("UNKNOWN: Command Center next_best_action — no customer-authority-history snapshot.");
  }
  if (!args.publicWedge) {
    unknown_facts.push("UNKNOWN: public wedge readiness not loaded — family expand queue thin.");
  }
  if (!args.demand) {
    unknown_facts.push("UNKNOWN: demand_to_coverage_next_lane not loaded — create strategy confidence reduced.");
  }
  if (!args.convergence) {
    unknown_facts.push("UNKNOWN: repo_runtime_convergence_gate not measured.");
  }
  if (!args.marketingRisk) {
    unknown_facts.push("UNKNOWN: marketing_intelligence risk index unavailable — wrong-part risk may be understated.");
  }
  if (classification.strategy === "UNKNOWN") {
    unknown_facts.push("UNKNOWN: dominant growth strategy not classifiable from available artifacts.");
  }

  return {
    contract: BUYER_PATH_INVENTORY_GROWTH_PLANNER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    artifact_write_authorized: false,
    supabase_writes: false,
    source_command: BUYER_PATH_INVENTORY_GROWTH_PLANNER_SOURCE_COMMAND_V1,
    design_doc: BUYER_PATH_INVENTORY_GROWTH_PLANNER_DESIGN_DOC_V1,
    generated_at: args.generated_at,
    replaces_command_center: false,
    current_inventory: {
      safe_buyer_path_proven_count: signals.proven_count,
      safe_buyer_path_suppressed_trust_count: signals.suppressed_count,
      wedges_with_proven_paths: signals.wedges_with_proven_paths,
      runtime_convergence_posture: signals.convergence_state,
      ap_convergence_gap_size: signals.convergence_gap_size,
    },
    strategy_classification: {
      current_winning_strategy: classification.strategy,
      why: classification.why,
      condition_classes: classification.condition_classes,
      command_center_authoritative_nba: args.cc.next_best_action,
      command_center_rescues_demoted: args.cc.rescues_demoted,
    },
    ranked_work_queue: ranked,
    blocked_work: blocked,
    quality_follow_on,
    proven_facts: [
      `PROVEN: safe_buyer_path_proven_count=${signals.proven_count}`,
      `PROVEN: safe_buyer_path_suppressed_trust_count=${signals.suppressed_count}`,
      `PROVEN: referenceability_work_items_are_quality_only=${quality_follow_on.length > 0}`,
      `PROVEN: winning_strategy=${classification.strategy}`,
      `PROVEN: replaces_command_center=false`,
    ],
    inferred_facts: [
      `INFERRED: condition_classes=${classification.condition_classes.join(",") || "none"}`,
      `INFERRED: ranked_growth_items=${ranked.filter((r) => r.expected_inventory_effect === "+1").length}`,
      `INFERRED: blocked_rescue_items=${blocked.filter((b) => b.strategy === "R").length}`,
    ],
    unknown_facts: unknown_facts,
  };
}

export type BuildBuyerPathInventoryGrowthPlannerDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  buildCensus?: typeof buildAllProductSafeBuyerPathCensusV1;
  buildPublicWedge?: typeof buildPublicWedgeReadinessAndEasiestWinsV1;
  buildConvergenceGate?: (
    rootDir: string,
  ) => Promise<RepoRuntimeConvergenceGateReportV1>;
  buildDemandLane?: (rootDir: string) => Promise<DemandToCoverageNextLaneReportV1>;
  loadCcNba?: (rootDir: string) => CommandCenterNbaSliceV1;
  buildMarketingRisk?: (rootDir: string) => Promise<MarketingRiskBySlugV1 | null>;
  buildReferenceability?: (rootDir: string) => Promise<ReferenceabilityFactoryRunV1 | null>;
};

export async function buildBuyerPathInventoryGrowthPlannerReportV1(
  deps: BuildBuyerPathInventoryGrowthPlannerDepsV1,
): Promise<BuyerPathInventoryGrowthPlannerReportV1> {
  const now = deps.now ?? (() => new Date());
  const rootDir = deps.rootDir;

  const census = (deps.buildCensus ?? buildAllProductSafeBuyerPathCensusV1)({
    rootDir,
    now,
  });

  const publicWedge = (deps.buildPublicWedge ?? buildPublicWedgeReadinessAndEasiestWinsV1)({
    rootDir,
  });

  let convergence: RepoRuntimeConvergenceGateReportV1 | null = null;
  if (deps.buildConvergenceGate) {
    convergence = await deps.buildConvergenceGate(rootDir);
  } else {
    try {
      const { buildRepoRuntimeConvergenceGateReportV1 } = await import(
        "./repo-runtime-convergence-gate-v1"
      );
      convergence = await buildRepoRuntimeConvergenceGateReportV1({ rootDir, enforce: false });
    } catch {
      convergence = null;
    }
  }

  let demand: DemandToCoverageNextLaneReportV1 | null = null;
  if (deps.buildDemandLane) {
    demand = await deps.buildDemandLane(rootDir);
  } else {
    try {
      const { buildDemandToCoverageNextLaneV1Report } = await import(
        "./demand-to-coverage-next-lane-v1"
      );
      demand = await buildDemandToCoverageNextLaneV1Report({ rootDir });
    } catch {
      demand = null;
    }
  }

  const cc = (deps.loadCcNba ?? loadCommandCenterNbaSliceV1)(rootDir);

  let marketingRisk: MarketingRiskBySlugV1 | null = null;
  if (deps.buildMarketingRisk) {
    marketingRisk = await deps.buildMarketingRisk(rootDir);
  } else {
    try {
      const { buildBuckpartsMarketingIntelligenceEngineV1Report } = await import(
        "./buckparts-marketing-intelligence-engine-v1"
      );
      const marketing = await buildBuckpartsMarketingIntelligenceEngineV1Report({
        rootDir,
        demandToCoverageNextLane: demand ?? undefined,
      });
      marketingRisk = buildMarketingRiskIndexFromOpportunitiesV1(marketing.opportunities);
    } catch {
      marketingRisk = null;
    }
  }

  let referenceability: ReferenceabilityFactoryRunV1 | null = null;
  if (deps.buildReferenceability) {
    referenceability = await deps.buildReferenceability(rootDir);
  } else {
    try {
      const { buildReferenceabilityFactoryRunV1 } = await import("./referenceability-factory-run-v1");
      referenceability = await buildReferenceabilityFactoryRunV1({
        rootDir,
        now,
        loadMarketing: false,
        census,
      });
    } catch {
      referenceability = null;
    }
  }

  return buildBuyerPathInventoryGrowthPlannerReportFromInputsV1({
    census,
    publicWedge,
    convergence,
    demand,
    cc,
    marketingRisk,
    referenceability,
    generated_at: now().toISOString(),
  });
}
