/**
 * Read-only Vacuum Bags Wedge Feasibility + Truth Model Report v1.
 * Repo-truth feasibility decision before inventory generation — not CSV/Supabase/launch authority.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";

import { AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1 } from "./air-purifier-truth-spine-v1";
import { FRIDGE_TRUTH_SPINE_CONTRACT_V1 } from "./fridge-truth-spine-v1";
import {
  buildPublicWedgeReadinessAndEasiestWinsV1,
  PUBLIC_WEDGE_READINESS_AND_EASIEST_WINS_CONTRACT_V1,
} from "./public-wedge-readiness-and-easiest-wins-v1";

export const VACUUM_BAGS_WEDGE_FEASIBILITY_CONTRACT_V1 =
  "vacuum_bags_wedge_feasibility_v1" as const;

export type VacuumBagsFeasibilityRecommendationV1 =
  | "READY_FOR_SEED_WEDGE_PLAN"
  | "NEEDS_RESEARCH_FIRST"
  | "DO_NOT_ADD_YET";

export type VacuumBagConfidenceStateV1 =
  | "exact_model_to_bag"
  | "exact_bag_code_match"
  | "compatible_replacement_only"
  | "uncertain_alias"
  | "do_not_buy";

export type VacuumBagEvidenceGateV1 =
  | "exact_bag_code_or_oem_part_number_proof"
  | "model_compatibility_proof"
  | "official_manual_or_retailer_pdp_proof"
  | "direct_buyable_pdp_proof"
  | "compatible_vs_official_label";

export type VacuumBagsWedgeFeasibilityInspectSummaryV1 = {
  recommended_jq_paths: {
    standalone_report: ".inspect_summary";
    command_center: ".command_center_v2.vacuum_bags_wedge_feasibility_v1.inspect_summary";
  };
  recommendation: VacuumBagsFeasibilityRecommendationV1;
  architecture_reuse_score: number;
  safety_complexity_score: number;
  first_seed_brand_count: number;
  required_truth_spine_fields_count: number;
  furnace_filter_deferred_reason: string;
  public_launch_authorized: false;
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  vacuum_launch_state: ReturnType<typeof getVerticalLaunchState>;
  all_vacuum_bags_verified_claim: false;
};

export type VacuumBagsWedgeFeasibilityV1 = {
  contract: typeof VACUUM_BAGS_WEDGE_FEASIBILITY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  recommendation: VacuumBagsFeasibilityRecommendationV1;
  recommendation_rationale: string;
  architecture_reuse_score: number;
  safety_complexity_score: number;
  furnace_filter_safety_complexity_score: number;
  structural_similarity: {
    similar_to_fridge_and_ap: boolean;
    reusable_patterns: string[];
    vacuum_specific_risks: string[];
  };
  compatibility_keys: string[];
  wrong_purchase_traps: string[];
  required_confidence_states: VacuumBagConfidenceStateV1[];
  required_evidence_gates: VacuumBagEvidenceGateV1[];
  furnace_filter_comparison: {
    vacuum_bags_reuses_replacement_intelligence: boolean;
    furnace_requires_separate_hvac_model: boolean;
    furnace_deferred_reason: string;
  };
  first_seed_strategy: {
    first_brands_to_investigate: string[];
    candidate_bag_families_target_count: string;
    candidate_bag_families_examples: string[];
    required_csv_tables: string[];
    proposed_csv_columns: Record<string, string[]>;
    required_truth_spine_fields: string[];
    proposed_command_center_lanes: string[];
  };
  no_overclaim_rules: string[];
  public_launch_authorized: false;
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  all_vacuum_bags_verified_claim: false;
  inspect_summary: VacuumBagsWedgeFeasibilityInspectSummaryV1;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export const VACUUM_REQUIRED_TRUTH_SPINE_FIELDS_V1 = [
  "public_launch_state",
  "public_indexing_status",
  "catalog_counts.model_count",
  "catalog_counts.bag_or_filter_sku_count",
  "catalog_counts.compatibility_mapping_count",
  "catalog_counts.retailer_link_row_count",
  "safe_cta_count",
  "safe_bag_slug_count",
  "bags_with_zero_safe_buy_path_count",
  "buy_gate_boundary_status",
  "buy_gate_boundary_sources",
  "formal_spine_status",
  "all_bags_verified_claim",
  "wrong_purchase_trap_summary",
  "recommended_next_action",
] as const;

export const VACUUM_FIRST_SEED_BRANDS_INVESTIGATE_V1 = [
  "shark",
  "bissell",
  "hoover",
  "miele",
  "kenmore",
  "dyson",
  "oreck",
  "eureka",
] as const;

const ARCHITECTURE_REUSE_CHECKLIST_V1 = [
  {
    id: "vertical_launch_state",
    rel: "src/lib/catalog/vertical-launch-state.ts",
    needle: 'vacuum: "NOINDEX_UNPROVEN"',
  },
  {
    id: "buy_gate_filters_ts",
    rel: "src/lib/data/vacuum/filters.ts",
    needle: "filterRealBuyRetailerLinks",
  },
  {
    id: "sample_csv_shape",
    rel: "data/vacuum/filters.sample.csv",
    needle: "oem_part_number",
  },
  {
    id: "compat_mappings_sample",
    rel: "data/vacuum/compatibility_mappings.sample.csv",
    needle: "model_slug",
  },
  {
    id: "filter_aliases_sample",
    rel: "data/vacuum/filter_aliases.sample.csv",
    needle: "alias",
  },
  {
    id: "app_routes",
    rel: "src/app/vacuum/page.tsx",
    needle: "Vacuum filters",
  },
  {
    id: "fridge_spine_template",
    rel: "scripts/lib/fridge-truth-spine-v1.ts",
    needle: FRIDGE_TRUTH_SPINE_CONTRACT_V1,
  },
  {
    id: "ap_spine_template",
    rel: "scripts/lib/air-purifier-truth-spine-v1.ts",
    needle: AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1,
  },
  {
    id: "ap_batch_director_template",
    rel: "scripts/lib/air-purifier-batch-coverage-director-v1.ts",
    needle: "air_purifier_batch_coverage_director_v1",
  },
  {
    id: "wedge_matrix_vacuum_row",
    rel: "scripts/lib/wedge-truth-spine-coverage-matrix-v1.ts",
    needle: HOMEKEEP_WEDGE_CATALOG.vacuum,
  },
] as const;

const VACUUM_BAG_SAFETY_COMPLEXITY_V1 = 3;
const FURNACE_FILTER_SAFETY_COMPLEXITY_V1 = 9;

const FURNACE_FILTER_DEFERRED_REASON_V1 =
  "Furnace filters require a separate HVAC system model (nominal size, MERV/MPR rating, airflow restriction, system compatibility, and install safety) — not just consumable part-number fit. No furnace/HVAC/MERV module exists in repo; defer until a dedicated hvac_furnace_filter_truth_spine_v1 (or equivalent) is designed.";

function fileContains(rootDir: string, rel: string, needle: string): boolean {
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return false;
  try {
    return readFileSync(abs, "utf8").includes(needle);
  } catch {
    return false;
  }
}

function computeArchitectureReuseScore(rootDir: string): number {
  let hits = 0;
  for (const item of ARCHITECTURE_REUSE_CHECKLIST_V1) {
    if (fileContains(rootDir, item.rel, item.needle)) hits += 1;
  }
  return Math.round((hits / ARCHITECTURE_REUSE_CHECKLIST_V1.length) * 10);
}

function resolveRecommendation(args: {
  architectureReuseScore: number;
  csvDataSource: string;
  hasFormalSpine: boolean;
}): { recommendation: VacuumBagsFeasibilityRecommendationV1; rationale: string } {
  if (args.architectureReuseScore < 4) {
    return {
      recommendation: "DO_NOT_ADD_YET",
      rationale:
        "Repo lacks sufficient reusable wedge scaffolding (buy gates, CSV shape, spine templates) — defer vacuum bags until core patterns are present.",
    };
  }
  if (args.csvDataSource === "sample_csv_only" || args.hasFormalSpine === false) {
    return {
      recommendation: "NEEDS_RESEARCH_FIRST",
      rationale:
        "Vacuum wedge has sample CSV only and no vacuum_bags_truth_spine_v1 — architecture reuse is high, but bag-code/model compatibility research and truth spine must precede production inventory and indexing.",
    };
  }
  return {
    recommendation: "READY_FOR_SEED_WEDGE_PLAN",
    rationale:
      "Committed CSV and truth spine prerequisites met — proceed to bounded seed wedge plan under truth gates.",
  };
}

export function buildVacuumBagsWedgeFeasibilityInspectSummaryV1(args: {
  report: Pick<
    VacuumBagsWedgeFeasibilityV1,
    | "recommendation"
    | "architecture_reuse_score"
    | "safety_complexity_score"
    | "furnace_filter_comparison"
    | "public_launch_authorized"
    | "csv_apply_authorized"
    | "supabase_update_authorized"
    | "all_vacuum_bags_verified_claim"
    | "first_seed_strategy"
  >;
  vacuumLaunchState: ReturnType<typeof getVerticalLaunchState>;
}): VacuumBagsWedgeFeasibilityInspectSummaryV1 {
  return {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary",
      command_center: ".command_center_v2.vacuum_bags_wedge_feasibility_v1.inspect_summary",
    },
    recommendation: args.report.recommendation,
    architecture_reuse_score: args.report.architecture_reuse_score,
    safety_complexity_score: args.report.safety_complexity_score,
    first_seed_brand_count: args.report.first_seed_strategy.first_brands_to_investigate.length,
    required_truth_spine_fields_count: VACUUM_REQUIRED_TRUTH_SPINE_FIELDS_V1.length,
    furnace_filter_deferred_reason: args.report.furnace_filter_comparison.furnace_deferred_reason,
    public_launch_authorized: false,
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    vacuum_launch_state: args.vacuumLaunchState,
    all_vacuum_bags_verified_claim: false,
  };
}

export function buildVacuumBagsWedgeFeasibilityUnknownV1(args: {
  generated_at: string;
  reason: string;
}): VacuumBagsWedgeFeasibilityV1 {
  const vacuumLaunchState = getVerticalLaunchState("vacuum");
  const body = {
    contract: VACUUM_BAGS_WEDGE_FEASIBILITY_CONTRACT_V1,
    read_only: true as const,
    data_mutation: false as const,
    generated_at: args.generated_at,
    recommendation: "DO_NOT_ADD_YET" as const,
    recommendation_rationale: `Feasibility build failed: ${args.reason}`,
    architecture_reuse_score: 0,
    safety_complexity_score: VACUUM_BAG_SAFETY_COMPLEXITY_V1,
    furnace_filter_safety_complexity_score: FURNACE_FILTER_SAFETY_COMPLEXITY_V1,
    structural_similarity: {
      similar_to_fridge_and_ap: false,
      reusable_patterns: [],
      vacuum_specific_risks: [],
    },
    compatibility_keys: [],
    wrong_purchase_traps: [],
    required_confidence_states: [] as VacuumBagConfidenceStateV1[],
    required_evidence_gates: [] as VacuumBagEvidenceGateV1[],
    furnace_filter_comparison: {
      vacuum_bags_reuses_replacement_intelligence: false,
      furnace_requires_separate_hvac_model: true,
      furnace_deferred_reason: FURNACE_FILTER_DEFERRED_REASON_V1,
    },
    first_seed_strategy: {
      first_brands_to_investigate: [],
      candidate_bag_families_target_count: "0",
      candidate_bag_families_examples: [],
      required_csv_tables: [],
      proposed_csv_columns: {},
      required_truth_spine_fields: [...VACUUM_REQUIRED_TRUTH_SPINE_FIELDS_V1],
      proposed_command_center_lanes: [],
    },
    no_overclaim_rules: [],
    public_launch_authorized: false as const,
    csv_apply_authorized: false as const,
    supabase_update_authorized: false as const,
    all_vacuum_bags_verified_claim: false as const,
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [`UNKNOWN: vacuum_bags_wedge_feasibility_v1 failed: ${args.reason}`],
  };
  const inspect_summary = buildVacuumBagsWedgeFeasibilityInspectSummaryV1({
    report: body,
    vacuumLaunchState,
  });
  return { ...body, inspect_summary };
}

export function buildVacuumBagsWedgeFeasibilityV1(args: {
  rootDir: string;
  now?: () => Date;
}): VacuumBagsWedgeFeasibilityV1 {
  const now = args.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const rootDir = args.rootDir;
  const vacuumLaunchState = getVerticalLaunchState("vacuum");

  const readiness = buildPublicWedgeReadinessAndEasiestWinsV1({ rootDir, now: args.now });
  const vacuumReadiness = readiness.wedge_rows.find(
    (r) => r.wedge === HOMEKEEP_WEDGE_CATALOG.vacuum,
  );

  const architectureReuseScore = computeArchitectureReuseScore(rootDir);
  const csvDataSource = vacuumReadiness?.csv_data_source ?? "UNKNOWN";
  const hasFormalSpine = false;

  const { recommendation, rationale } = resolveRecommendation({
    architectureReuseScore,
    csvDataSource,
    hasFormalSpine,
  });

  const reusablePatterns = [
    "model_slug → bag/filter_slug compatibility_mappings (same join pattern as fridge/AP)",
    "filters.csv consumable SKUs with oem_part_number + filter_aliases.csv for bag codes",
    "retailer_links.csv + filterRealBuyRetailerLinks buy gates on vacuum filter pages",
    "vertical-launch-state NOINDEX_UNPROVEN until truth spine + safe CTAs exist",
    "formal truth spine contract pattern from fridge_truth_spine_v1 / air_purifier_truth_spine_v1",
    "batch coverage director pattern from air_purifier_batch_coverage_director_v1",
  ];

  const vacuumSpecificRisks = [
    "Bag vs filter confusion on pages titled 'Vacuum filters & bags' without bag-specific fit fields",
    "Same-looking bag type codes shared across brands (cross-brand compatible listings)",
    "Canister vs upright vs central-vac form factor mismatch",
    "Multipack/count confusion (single bag vs 3-pack vs bulk)",
    "Compatible-only marketplace listings without official OEM proof",
  ];

  const compatibilityKeys = [
    "vacuum_brand_slug",
    "vacuum_model_slug",
    "vacuum_model_number",
    "bag_type_code",
    "oem_part_number",
    "compatible_replacement_alias",
    "form_factor (canister | upright | central_vac | handheld)",
    "is_recommended mapping flag (official vs compat-only)",
  ];

  const wrongPurchaseTraps = [
    "Same bag type code reused across multiple brands — alias without model proof is unsafe",
    "Similar-looking bag codes (e.g. letter/number transpositions) — require exact token match",
    "Bag vs filter confusion — HEPA/filter packs listed beside disposable bags",
    "Canister/upright/central-vac mismatch — physically similar bags on wrong form factor",
    "Compatible-only listings pretending to be official OEM — cannot count as safe CTA",
    "Multipack/count confusion — buyer orders wrong quantity or single vs multi-pack SKU",
  ];

  const requiredConfidenceStates: VacuumBagConfidenceStateV1[] = [
    "exact_model_to_bag",
    "exact_bag_code_match",
    "compatible_replacement_only",
    "uncertain_alias",
    "do_not_buy",
  ];

  const requiredEvidenceGates: VacuumBagEvidenceGateV1[] = [
    "exact_bag_code_or_oem_part_number_proof",
    "model_compatibility_proof",
    "official_manual_or_retailer_pdp_proof",
    "direct_buyable_pdp_proof",
    "compatible_vs_official_label",
  ];

  const candidateBagFamiliesExamples = [
    "Shark Navigator / Rotator upright bag families (model series → OEM bag code)",
    "Bissell CleanView / PowerForce bag + belt-adjacent consumables",
    "Hoover WindTunnel / Tempo upright bags",
    "Miele GN/F/J/H/Y bag types (letter-type system — high alias risk)",
    "Kenmore Q/C/U bag types (cross-brand compat listings common)",
    "Dyson out-of-warranty bin/bag-adjacent parts (mostly filter/bin — bag scope TBD)",
    "Oreck Type C / CC upright bags",
    "Eureka / Sanitaire commercial upright bags",
    "Central vac hose/bag inlet sizing (separate form_factor=central_vac lane)",
    "Generic 'Style F / Style Q' compatible replacements (compatible_replacement_only default)",
  ];

  const proposedCsvColumns: Record<string, string[]> = {
    "data/vacuum/models.csv": [
      "brand_slug",
      "slug",
      "model_number",
      "title",
      "form_factor",
      "series",
      "notes",
    ],
    "data/vacuum/filters.csv": [
      "brand_slug",
      "slug",
      "oem_part_number",
      "name",
      "consumable_kind (bag | filter | belt)",
      "bag_type_code",
      "form_factor",
      "replacement_interval_months",
      "notes",
    ],
    "data/vacuum/compatibility_mappings.csv": [
      "model_slug",
      "filter_slug",
      "is_recommended",
      "fit_confidence",
      "notes",
    ],
    "data/vacuum/filter_aliases.csv": ["filter_slug", "alias", "alias_kind"],
    "data/vacuum/model_aliases.csv": ["model_slug", "alias"],
    "data/vacuum/retailer_links.csv": [
      "filter_slug",
      "retailer_key",
      "affiliate_url",
      "destination_url",
      "is_primary",
      "browser_truth_classification",
      "browser_truth_buyable_subtype",
      "browser_truth_notes",
      "browser_truth_checked_at",
    ],
  };

  const proposedCommandCenterLanes = [
    "vacuum_bags_wedge_feasibility_v1",
    "vacuum_bags_truth_spine_v1 (future — required before LIVE/indexing)",
    "vacuum_bags_batch_coverage_director_v1 (future — after committed CSV + spine)",
    "wedge_truth_spine_coverage_matrix_v1 (update vacuum row when spine lands)",
  ];

  const noOverclaimRules = [
    "Do not claim all vacuum bags are verified — all_bags_verified_claim must remain false until explicitly proven otherwise with bounded audit.",
    "Do not claim compatible replacements are official OEM — label compatible_replacement_only separately from exact_model_to_bag.",
    "Do not publish or index vacuum bag pages until vacuum_bags_truth_spine_v1 + buyer-path gates exist (launch state stays NOINDEX_UNPROVEN).",
    "Do not show buy CTAs without exact bag code/model evidence and direct_buyable browser_truth on committed CSV rows.",
    "Do not treat mapping row count or alias count as proof of fit.",
    "Do not weaken filterRealBuyRetailerLinks gates for vacuum to accelerate coverage.",
  ];

  const firstSeedStrategy = {
    first_brands_to_investigate: [...VACUUM_FIRST_SEED_BRANDS_INVESTIGATE_V1],
    candidate_bag_families_target_count: "25–50",
    candidate_bag_families_examples: candidateBagFamiliesExamples,
    required_csv_tables: Object.keys(proposedCsvColumns),
    proposed_csv_columns: proposedCsvColumns,
    required_truth_spine_fields: [...VACUUM_REQUIRED_TRUTH_SPINE_FIELDS_V1],
    proposed_command_center_lanes: proposedCommandCenterLanes,
  };

  const proven_facts = [
    `PROVEN: vacuum vertical launch state is ${vacuumLaunchState} (src/lib/catalog/vertical-launch-state.ts).`,
    `PROVEN: ${PUBLIC_WEDGE_READINESS_AND_EASIEST_WINS_CONTRACT_V1} reports vacuum csv_data_source=${csvDataSource}.`,
    "PROVEN: wedge_truth_spine_coverage_matrix_v1 lists vacuum formal_spine_contract=null — no formal truth spine yet.",
    "PROVEN: src/lib/data/vacuum/filters.ts calls filterRealBuyRetailerLinks before exposing retailer_links.",
    "PROVEN: data/vacuum/*.sample.csv exists (demo inventory only) — not production committed CSV.",
    "PROVEN: csv_apply_authorized=false; supabase_update_authorized=false; public_launch_authorized=false.",
    "PROVEN: all_vacuum_bags_verified_claim=false.",
    "PROVEN: No furnace/HVAC/MERV module or CSV paths in repo — furnace filters not scaffolded.",
  ];

  if (vacuumReadiness) {
    proven_facts.push(
      `PROVEN: vacuum readiness safe_cta_count=${String(vacuumReadiness.safe_cta_count)} with csv_data_source=${vacuumReadiness.csv_data_source}.`,
    );
  }

  const inferred_facts = [
    `INFERRED: architecture_reuse_score=${String(architectureReuseScore)}/10 from ${String(ARCHITECTURE_REUSE_CHECKLIST_V1.length)}-item repo checklist (fridge/AP spine + buy gates + sample CSV + batch director templates).`,
    "INFERRED: Vacuum bags are structurally closer to fridge/AP replacement-intelligence wedges (model → consumable SKU + aliases) than to HVAC furnace filters.",
    `INFERRED: Vacuum bag safety_complexity_score=${String(VACUUM_BAG_SAFETY_COMPLEXITY_V1)}/10 (fit/part mismatch) vs furnace_filter=${String(FURNACE_FILTER_SAFETY_COMPLEXITY_V1)}/10 (airflow/MERV/system safety).`,
    "INFERRED: First seed brands and bag families listed in first_seed_strategy are research targets — not verified inventory.",
    "INFERRED: WHW should remain partial operational proof; this report does not authorize WHW grinding.",
  ];

  const unknown_facts = [
    "UNKNOWN: Live Supabase vacuum bag inventory counts vs sample CSV — not audited in this lane.",
    "UNKNOWN: Market demand ranking for vacuum bag brands/families — no GSC/demand join for vacuum in this report.",
    "UNKNOWN: Whether Dyson-forward bag scope is worth seed priority vs traditional bagged upright/canister brands.",
    "UNKNOWN: Official OEM manual coverage depth per brand without bounded research pass.",
  ];

  const body = {
    contract: VACUUM_BAGS_WEDGE_FEASIBILITY_CONTRACT_V1,
    read_only: true as const,
    data_mutation: false as const,
    generated_at,
    recommendation,
    recommendation_rationale: rationale,
    architecture_reuse_score: architectureReuseScore,
    safety_complexity_score: VACUUM_BAG_SAFETY_COMPLEXITY_V1,
    furnace_filter_safety_complexity_score: FURNACE_FILTER_SAFETY_COMPLEXITY_V1,
    structural_similarity: {
      similar_to_fridge_and_ap: architectureReuseScore >= 7,
      reusable_patterns: reusablePatterns,
      vacuum_specific_risks: vacuumSpecificRisks,
    },
    compatibility_keys: compatibilityKeys,
    wrong_purchase_traps: wrongPurchaseTraps,
    required_confidence_states: requiredConfidenceStates,
    required_evidence_gates: requiredEvidenceGates,
    furnace_filter_comparison: {
      vacuum_bags_reuses_replacement_intelligence: true,
      furnace_requires_separate_hvac_model: true,
      furnace_deferred_reason: FURNACE_FILTER_DEFERRED_REASON_V1,
    },
    first_seed_strategy: firstSeedStrategy,
    no_overclaim_rules: noOverclaimRules,
    public_launch_authorized: false as const,
    csv_apply_authorized: false as const,
    supabase_update_authorized: false as const,
    all_vacuum_bags_verified_claim: false as const,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };

  const inspect_summary = buildVacuumBagsWedgeFeasibilityInspectSummaryV1({
    report: body,
    vacuumLaunchState,
  });

  return { ...body, inspect_summary };
}
