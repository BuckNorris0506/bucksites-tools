/**
 * Read-only Vacuum Bags Research Seed Packet v1.
 * Bounded planning output after vacuum_bags_wedge_feasibility_v1 — not inventory or launch authority.
 */

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";

import {
  VACUUM_BAGS_WEDGE_FEASIBILITY_CONTRACT_V1,
  VACUUM_FIRST_SEED_BRANDS_INVESTIGATE_V1,
  VACUUM_REQUIRED_TRUTH_SPINE_FIELDS_V1,
  type VacuumBagConfidenceStateV1,
  type VacuumBagsWedgeFeasibilityV1,
  buildVacuumBagsWedgeFeasibilityV1,
} from "./vacuum-bags-wedge-feasibility-v1";

export const VACUUM_BAGS_RESEARCH_SEED_PACKET_CONTRACT_V1 =
  "vacuum_bags_research_seed_packet_v1" as const;

export type VacuumBagsResearchSeedRecommendationV1 = "RESEARCH_SEED_PACKET_READY" | "BLOCKED";

export type SeedFamilyPlanningStatusV1 = "candidate_only";

export type SeedFamilyCandidateV1 = {
  brand_slug: string;
  family_label: string;
  bag_code_tokens: string[];
  planning_status: SeedFamilyPlanningStatusV1;
  verified: false;
  model_to_bag_fit_claim: false;
  safe_cta_claim: false;
  optional_lane?: "central_vac" | "mainline" | "conditional_demand";
  notes: string;
};

export type EvidenceSourcePlanItemV1 = {
  source_kind:
    | "oem_manual_or_support_page"
    | "brand_bag_type_chart"
    | "retailer_pdp_for_buy_path_only"
    | "marketplace_listing_fit_disallowed";
  purpose: string;
  counts_as_bag_code_proof: boolean;
  counts_as_model_fit_proof: boolean;
  notes: string;
};

export type TruthSpineBuildStepV1 = {
  step: number;
  action: string;
  output: string;
  blocked_until: string;
};

export type VacuumBagsResearchSeedPacketInspectSummaryV1 = {
  recommended_jq_paths: {
    standalone_report: ".inspect_summary";
    command_center: ".command_center_v2.vacuum_bags_research_seed_packet_v1.inspect_summary";
  };
  recommendation: VacuumBagsResearchSeedRecommendationV1;
  vacuum_launch_state: ReturnType<typeof getVerticalLaunchState>;
  target_seed_brand_count: number;
  target_seed_family_count: number;
  first_seed_family_count: number;
  required_truth_spine_fields_count: number;
  public_launch_authorized: false;
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  sitemap_change_authorized: false;
  buy_gate_change_authorized: false;
  all_vacuum_bags_verified_claim: false;
  next_action: string;
};

export type VacuumBagsResearchSeedPacketV1 = {
  contract: typeof VACUUM_BAGS_RESEARCH_SEED_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_feasibility_contract: typeof VACUUM_BAGS_WEDGE_FEASIBILITY_CONTRACT_V1;
  source_feasibility_recommendation: VacuumBagsWedgeFeasibilityV1["recommendation"];
  recommendation: VacuumBagsResearchSeedRecommendationV1;
  recommendation_rationale: string;
  vacuum_launch_state: ReturnType<typeof getVerticalLaunchState>;
  target_seed_brand_count: number;
  target_seed_family_count: number;
  target_seed_brands: string[];
  evidence_source_plan: EvidenceSourcePlanItemV1[];
  required_truth_spine_fields: string[];
  first_seed_families: SeedFamilyCandidateV1[];
  known_wrong_purchase_traps: string[];
  confidence_state_model: VacuumBagConfidenceStateV1[];
  separate_evidence_requirements: {
    bag_code_proof: string[];
    model_fit_proof: string[];
    rule: string;
  };
  first_truth_spine_build_plan: TruthSpineBuildStepV1[];
  blocked_or_unknown_items: string[];
  furnace_filters_out_of_scope: {
    deferred: true;
    reason: string;
  };
  no_overclaim_rules: string[];
  public_launch_authorized: false;
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  sitemap_change_authorized: false;
  buy_gate_change_authorized: false;
  all_vacuum_bags_verified_claim: false;
  inspect_summary: VacuumBagsResearchSeedPacketInspectSummaryV1;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export const VACUUM_TARGET_SEED_FAMILY_COUNT_V1 = 35;

const EVIDENCE_SOURCE_PLAN_V1: EvidenceSourcePlanItemV1[] = [
  {
    source_kind: "oem_manual_or_support_page",
    purpose: "Prove official bag type code and OEM part number for a consumable SKU candidate",
    counts_as_bag_code_proof: true,
    counts_as_model_fit_proof: false,
    notes: "Manual/support must name the bag code or OEM PN — not inferred from marketplace title alone.",
  },
  {
    source_kind: "brand_bag_type_chart",
    purpose: "Map vacuum model series or model numbers to bag letter/type codes",
    counts_as_bag_code_proof: false,
    counts_as_model_fit_proof: true,
    notes: "Chart row is model-fit evidence only; still requires separate bag-code/OEM proof for the SKU row.",
  },
  {
    source_kind: "retailer_pdp_for_buy_path_only",
    purpose: "Establish direct-buyable browser_truth for a known bag-code SKU after fit is proven",
    counts_as_bag_code_proof: false,
    counts_as_model_fit_proof: false,
    notes: "PDP proves buy path — not model compatibility. Never treat retailer listing as fit proof.",
  },
  {
    source_kind: "marketplace_listing_fit_disallowed",
    purpose: "Discovery hint only — compatible pack titles, cross-brand 'Style Q' listings",
    counts_as_bag_code_proof: false,
    counts_as_model_fit_proof: false,
    notes: "Marketplace compatible listings default to compatible_replacement_only or do_not_buy until OEM proof exists.",
  },
];

const FIRST_SEED_FAMILIES_V1: SeedFamilyCandidateV1[] = [
  {
    brand_slug: "miele",
    family_label: "Miele GN bag family",
    bag_code_tokens: ["GN"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Letter-type bag system — high alias/cross-brand compat listing risk.",
  },
  {
    brand_slug: "miele",
    family_label: "Miele FJM bag family",
    bag_code_tokens: ["FJM", "F/J/M"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Often aliased as F/J/M — require exact token match.",
  },
  {
    brand_slug: "miele",
    family_label: "Miele U bag family",
    bag_code_tokens: ["U"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Distinct from Kenmore U — brand context required.",
  },
  {
    brand_slug: "miele",
    family_label: "Miele KK bag family",
    bag_code_tokens: ["KK"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Canister-oriented — check form_factor before mapping.",
  },
  {
    brand_slug: "hoover",
    family_label: "Hoover Type Y bag family",
    bag_code_tokens: ["Type Y", "Y"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "WindTunnel-era upright families — model series chart required.",
  },
  {
    brand_slug: "hoover",
    family_label: "Hoover Type A bag family",
    bag_code_tokens: ["Type A", "A"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Short code — high collision with unrelated 'Type A' compat listings.",
  },
  {
    brand_slug: "hoover",
    family_label: "Hoover Type Q bag family",
    bag_code_tokens: ["Type Q", "Q"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Cross-brand Kenmore Q compat listings common — separate brand proof required.",
  },
  {
    brand_slug: "kenmore",
    family_label: "Kenmore Q bag family",
    bag_code_tokens: ["Q", "Style Q"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Heavy third-party compat market — default compatible_replacement_only.",
  },
  {
    brand_slug: "kenmore",
    family_label: "Kenmore C bag family",
    bag_code_tokens: ["C", "Style C"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Verify Kenmore vs Hoover cross-listings before any mapping row.",
  },
  {
    brand_slug: "kenmore",
    family_label: "Kenmore O bag family",
    bag_code_tokens: ["O", "Style O"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Letter O vs zero confusion in marketplace titles.",
  },
  {
    brand_slug: "kenmore",
    family_label: "Kenmore U bag family",
    bag_code_tokens: ["U", "Style U"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Not interchangeable with Miele U without explicit proof.",
  },
  {
    brand_slug: "oreck",
    family_label: "Oreck Type CC bag family",
    bag_code_tokens: ["Type CC", "CC"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Commercial/light upright lineage — multipack count traps common.",
  },
  {
    brand_slug: "oreck",
    family_label: "Oreck Type PKBB12DW bag family",
    bag_code_tokens: ["PKBB12DW"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Alphanumeric OEM-style code — good candidate for exact_bag_code_match lane if manual proof exists.",
  },
  {
    brand_slug: "bissell",
    family_label: "Bissell Style 7 bag family",
    bag_code_tokens: ["Style 7", "7"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "CleanView/PowerForce adjacent families — model chart before mapping.",
  },
  {
    brand_slug: "bissell",
    family_label: "Bissell Style 9 bag family",
    bag_code_tokens: ["Style 9", "9"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Numeric style codes collide with unrelated brands in compat listings.",
  },
  {
    brand_slug: "bissell",
    family_label: "Bissell Style 10 bag family",
    bag_code_tokens: ["Style 10", "10"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Verify bag vs belt/filter accessory packs in retailer titles.",
  },
  {
    brand_slug: "bissell",
    family_label: "Bissell Febreze-style scented bag candidates",
    bag_code_tokens: ["Febreze"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Scented variant SKUs — same fit proof as unscented base; do not assume identical OEM PN.",
  },
  {
    brand_slug: "eureka",
    family_label: "Eureka MM bag family",
    bag_code_tokens: ["MM"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Sanitaire commercial overlap — brand_slug discipline required.",
  },
  {
    brand_slug: "eureka",
    family_label: "Eureka RR bag family",
    bag_code_tokens: ["RR"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Short code — alias collision risk.",
  },
  {
    brand_slug: "eureka",
    family_label: "Eureka Style F bag family",
    bag_code_tokens: ["Style F", "F"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Generic 'Style F' compat packs widespread — compatible_replacement_only default.",
  },
  {
    brand_slug: "eureka",
    family_label: "Eureka Style G bag family",
    bag_code_tokens: ["Style G", "G"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    notes: "Pair with model series evidence before any compatibility_mappings row.",
  },
  {
    brand_slug: "shark",
    family_label: "Shark bagged upright Navigator-era candidates",
    bag_code_tokens: ["Navigator"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    optional_lane: "conditional_demand",
    notes: "Include only if bounded demand research shows meaningful bagged Shark volume — many Shark lines are bagless.",
  },
  {
    brand_slug: "shark",
    family_label: "Shark older canister bag candidates",
    bag_code_tokens: ["canister"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    optional_lane: "conditional_demand",
    notes: "Conditional seed — confirm bagged canister models still in active replacement demand.",
  },
  {
    brand_slug: "dyson",
    family_label: "Dyson bag-adjacent scope (TBD)",
    bag_code_tokens: [],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    optional_lane: "conditional_demand",
    notes: "Most Dyson lines are bin/filter-first — keep as low-priority research stub until evidence suggests bag SKU demand.",
  },
  {
    brand_slug: "central_vac",
    family_label: "Central vacuum disposable bag candidates",
    bag_code_tokens: ["central"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    optional_lane: "central_vac",
    notes: "Separate optional lane — inlet/hose sizing and install fit ambiguity; do not mix with upright/canister mainline seed.",
  },
  {
    brand_slug: "central_vac",
    family_label: "Central vacuum filter/bag hybrid packs",
    bag_code_tokens: ["filter-bag"],
    planning_status: "candidate_only",
    verified: false,
    model_to_bag_fit_claim: false,
    safe_cta_claim: false,
    optional_lane: "central_vac",
    notes: "Bag vs filter confusion trap — consumable_kind must be explicit before any CSV row.",
  },
];

function resolveRecommendation(args: {
  feasibility: VacuumBagsWedgeFeasibilityV1;
}): { recommendation: VacuumBagsResearchSeedRecommendationV1; rationale: string; next_action: string } {
  if (args.feasibility.recommendation === "DO_NOT_ADD_YET") {
    return {
      recommendation: "BLOCKED",
      rationale:
        "Source feasibility vacuum_bags_wedge_feasibility_v1 returned DO_NOT_ADD_YET — insufficient repo scaffolding for seed research.",
      next_action: "Resolve feasibility blockers before bounded vacuum bag research.",
    };
  }
  return {
    recommendation: "RESEARCH_SEED_PACKET_READY",
    rationale:
      "Source feasibility returned NEEDS_RESEARCH_FIRST or READY — bounded brand/family research seed plan is ready; no inventory or truth spine implied.",
    next_action:
      "Run bounded OEM manual + bag-type-chart research on first_seed_families (start Miele GN/FJM + Hoover Type Y + Kenmore Q) — output evidence notes only, not CSV rows.",
  };
}

export function buildVacuumBagsResearchSeedPacketInspectSummaryV1(args: {
  report: Pick<
    VacuumBagsResearchSeedPacketV1,
    | "recommendation"
    | "vacuum_launch_state"
    | "target_seed_brand_count"
    | "target_seed_family_count"
    | "first_seed_families"
    | "required_truth_spine_fields"
    | "public_launch_authorized"
    | "csv_apply_authorized"
    | "supabase_update_authorized"
    | "sitemap_change_authorized"
    | "buy_gate_change_authorized"
    | "all_vacuum_bags_verified_claim"
  >;
  next_action: string;
}): VacuumBagsResearchSeedPacketInspectSummaryV1 {
  return {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary",
      command_center: ".command_center_v2.vacuum_bags_research_seed_packet_v1.inspect_summary",
    },
    recommendation: args.report.recommendation,
    vacuum_launch_state: args.report.vacuum_launch_state,
    target_seed_brand_count: args.report.target_seed_brand_count,
    target_seed_family_count: args.report.target_seed_family_count,
    first_seed_family_count: args.report.first_seed_families.length,
    required_truth_spine_fields_count: args.report.required_truth_spine_fields.length,
    public_launch_authorized: false,
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    sitemap_change_authorized: false,
    buy_gate_change_authorized: false,
    all_vacuum_bags_verified_claim: false,
    next_action: args.next_action,
  };
}

export function buildVacuumBagsResearchSeedPacketUnknownV1(args: {
  generated_at: string;
  reason: string;
}): VacuumBagsResearchSeedPacketV1 {
  const vacuumLaunchState = getVerticalLaunchState("vacuum");
  const requiredTruthSpineFields = [...VACUUM_REQUIRED_TRUTH_SPINE_FIELDS_V1];
  const body = {
    contract: VACUUM_BAGS_RESEARCH_SEED_PACKET_CONTRACT_V1,
    read_only: true as const,
    data_mutation: false as const,
    generated_at: args.generated_at,
    source_feasibility_contract: VACUUM_BAGS_WEDGE_FEASIBILITY_CONTRACT_V1,
    source_feasibility_recommendation: "DO_NOT_ADD_YET" as const,
    recommendation: "BLOCKED" as const,
    recommendation_rationale: `Seed packet build failed: ${args.reason}`,
    vacuum_launch_state: vacuumLaunchState,
    target_seed_brand_count: 0,
    target_seed_family_count: 0,
    target_seed_brands: [],
    evidence_source_plan: [],
    required_truth_spine_fields: requiredTruthSpineFields,
    first_seed_families: [],
    known_wrong_purchase_traps: [],
    confidence_state_model: [] as VacuumBagConfidenceStateV1[],
    separate_evidence_requirements: {
      bag_code_proof: [],
      model_fit_proof: [],
      rule: "Bag-code proof and model-fit proof are independent — both required before exact_model_to_bag.",
    },
    first_truth_spine_build_plan: [],
    blocked_or_unknown_items: [`BLOCKED: vacuum_bags_research_seed_packet_v1 failed: ${args.reason}`],
    furnace_filters_out_of_scope: {
      deferred: true as const,
      reason:
        "Furnace filters require separate HVAC/MERV/airflow system safety modeling — out of scope for vacuum bag seed packet.",
    },
    no_overclaim_rules: [],
    public_launch_authorized: false as const,
    csv_apply_authorized: false as const,
    supabase_update_authorized: false as const,
    sitemap_change_authorized: false as const,
    buy_gate_change_authorized: false as const,
    all_vacuum_bags_verified_claim: false as const,
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [`UNKNOWN: vacuum_bags_research_seed_packet_v1 failed: ${args.reason}`],
  };
  const inspect_summary = buildVacuumBagsResearchSeedPacketInspectSummaryV1({
    report: body,
    next_action: "Fix seed packet build error before research.",
  });
  return { ...body, inspect_summary };
}

export function buildVacuumBagsResearchSeedPacketV1(args: {
  rootDir: string;
  now?: () => Date;
  feasibility?: VacuumBagsWedgeFeasibilityV1;
}): VacuumBagsResearchSeedPacketV1 {
  const now = args.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const vacuumLaunchState = getVerticalLaunchState("vacuum");
  const feasibility = args.feasibility ?? buildVacuumBagsWedgeFeasibilityV1({ rootDir: args.rootDir, now: args.now });

  const { recommendation, rationale, next_action } = resolveRecommendation({ feasibility });

  const confidenceStateModel: VacuumBagConfidenceStateV1[] = [
    "exact_model_to_bag",
    "exact_bag_code_match",
    "compatible_replacement_only",
    "uncertain_alias",
    "do_not_buy",
  ];

  const separateEvidenceRequirements = {
    bag_code_proof: [
      "Official OEM part number or bag type code on manual/support page",
      "Exact token match on filter_aliases — no marketplace-title inference",
      "consumable_kind=bag explicit on filters.csv candidate row",
    ],
    model_fit_proof: [
      "Brand bag-type chart or manual model list naming the bag code for a model series",
      "compatibility_mappings row with fit_confidence only after both brand context and bag code are proven",
      "form_factor (canister|upright|central_vac) matches model record",
    ],
    rule: "Bag-code proof and model-fit proof are separate evidence requirements — neither substitutes for the other; both are required before exact_model_to_bag or safe CTA.",
  };

  const firstTruthSpineBuildPlan: TruthSpineBuildStepV1[] = [
    {
      step: 1,
      action: "Complete bounded research on first_seed_families — capture PROVEN/INFERRED/UNKNOWN notes only",
      output: "research evidence notes artifact (not product CSV)",
      blocked_until: "At least 5 families have bag-code proof + model-fit proof candidates documented",
    },
    {
      step: 2,
      action: "Implement vacuum_bags_truth_spine_v1 read-only lane mirroring fridge/AP spine contracts",
      output: "command_center_v2.vacuum_bags_truth_spine_v1 with formal_spine_status=partial",
      blocked_until: "Research notes exist for seed families; no CSV apply authorized",
    },
    {
      step: 3,
      action: "Draft committed data/vacuum/*.csv from proven seed rows only — founder review gate",
      output: "CSV apply plan (csv_apply_authorized remains false until explicit founder approval lane)",
      blocked_until: "vacuum_bags_truth_spine_v1 reports safe_cta_count=0 until browser_truth rows exist",
    },
    {
      step: 4,
      action: "Add vacuum_bags_batch_coverage_director_v1 for zero-safe-buy-path expansion",
      output: "Read-only batch director sourcing truth spine",
      blocked_until: "Committed CSV + truth spine landed",
    },
    {
      step: 5,
      action: "Update wedge_truth_spine_coverage_matrix_v1 vacuum row when formal spine exists",
      output: "Matrix shows formal_spine_contract=vacuum_bags_truth_spine_v1",
      blocked_until: "Prior steps complete; launch state stays NOINDEX_UNPROVEN until safe_cta gates pass",
    },
  ];

  const knownWrongPurchaseTraps = [
    ...feasibility.wrong_purchase_traps,
    "Research-phase trap: treating seed family labels as verified fit",
    "Research-phase trap: copying marketplace compat titles into filter_aliases without OEM proof",
  ];

  const blockedOrUnknownItems = [
    "UNKNOWN: No committed data/vacuum/*.csv — sample CSV only in repo.",
    "UNKNOWN: vacuum_bags_truth_spine_v1 lane does not exist yet.",
    "UNKNOWN: Dyson bag SKU demand priority — stub family only.",
    "UNKNOWN: Shark bagged-model demand volume — conditional_demand families only.",
    "UNKNOWN: Central vac inlet sizing standardization — optional_lane=central_vac kept separate.",
    "BLOCKED: csv_apply_authorized=false — this packet does not create product CSV rows.",
    "BLOCKED: public_launch_authorized=false — vacuum remains NOINDEX_UNPROVEN.",
    "OUT_OF_SCOPE: Furnace filters deferred — HVAC/MERV/airflow system safety is a separate model.",
  ];

  if (recommendation === "BLOCKED") {
    blockedOrUnknownItems.unshift(
      `BLOCKED: source feasibility recommendation=${feasibility.recommendation} prevents seed research packet.`,
    );
  }

  const noOverclaimRules = [
    "Do not claim any seed family in first_seed_families is verified — planning_status=candidate_only always.",
    "Do not claim any model-to-bag fit from this packet.",
    "Do not invent safe CTAs or safe_cta_count increments.",
    "Do not treat marketplace listings as fit proof — discovery hints only.",
    "Do not treat compatible bag packs as official OEM bags without compatible_vs_official label.",
    "Do not create product CSV rows from this packet.",
    "Do not publish, index, or change launch state until vacuum_bags_truth_spine_v1 + buyer-path gates exist.",
  ];

  const proven_facts = [
    `PROVEN: source_feasibility_contract=${VACUUM_BAGS_WEDGE_FEASIBILITY_CONTRACT_V1}.`,
    `PROVEN: source feasibility recommendation=${feasibility.recommendation}.`,
    `PROVEN: vacuum_launch_state=${vacuumLaunchState}.`,
    "PROVEN: data/vacuum/*.sample.csv exists — not production inventory.",
    "PROVEN: csv_apply_authorized=false; supabase_update_authorized=false; public_launch_authorized=false.",
    "PROVEN: sitemap_change_authorized=false; buy_gate_change_authorized=false.",
    "PROVEN: all_vacuum_bags_verified_claim=false.",
    "PROVEN: Every first_seed_families entry has verified=false and planning_status=candidate_only.",
    "PROVEN: Furnace filters have no repo module — out of scope for this packet.",
  ];

  const inferred_facts = [
    `INFERRED: target_seed_brand_count=${String(VACUUM_FIRST_SEED_BRANDS_INVESTIGATE_V1.length)} from feasibility first_seed_strategy.`,
    `INFERRED: target_seed_family_count=${String(VACUUM_TARGET_SEED_FAMILY_COUNT_V1)} (planning midpoint of 25–50 feasibility range).`,
    `INFERRED: first_seed_families count=${String(FIRST_SEED_FAMILIES_V1.length)} concrete planning candidates in this packet.`,
    "INFERRED: Vacuum bags can move toward truth-spine construction after bounded research on seed families — not from this packet alone.",
    "INFERRED: Central vac and conditional Shark/Dyson families are deprioritized vs Miele/Hoover/Kenmore/Oreck/Bissell/Eureka letter-type families.",
  ];

  const unknown_facts = [
    "UNKNOWN: Per-family OEM manual coverage depth — requires bounded research pass.",
    "UNKNOWN: Retailer PDP buy-path availability for seed bag codes — no browser_truth rows yet.",
    "UNKNOWN: GSC demand ranking for vacuum bag families — not joined in this packet.",
  ];

  const body = {
    contract: VACUUM_BAGS_RESEARCH_SEED_PACKET_CONTRACT_V1,
    read_only: true as const,
    data_mutation: false as const,
    generated_at,
    source_feasibility_contract: VACUUM_BAGS_WEDGE_FEASIBILITY_CONTRACT_V1,
    source_feasibility_recommendation: feasibility.recommendation,
    recommendation,
    recommendation_rationale: rationale,
    vacuum_launch_state: vacuumLaunchState,
    target_seed_brand_count: VACUUM_FIRST_SEED_BRANDS_INVESTIGATE_V1.length,
    target_seed_family_count: VACUUM_TARGET_SEED_FAMILY_COUNT_V1,
    target_seed_brands: [...VACUUM_FIRST_SEED_BRANDS_INVESTIGATE_V1],
    evidence_source_plan: EVIDENCE_SOURCE_PLAN_V1,
    required_truth_spine_fields: [...VACUUM_REQUIRED_TRUTH_SPINE_FIELDS_V1],
    first_seed_families: FIRST_SEED_FAMILIES_V1,
    known_wrong_purchase_traps: knownWrongPurchaseTraps,
    confidence_state_model: confidenceStateModel,
    separate_evidence_requirements: separateEvidenceRequirements,
    first_truth_spine_build_plan: firstTruthSpineBuildPlan,
    blocked_or_unknown_items: blockedOrUnknownItems,
    furnace_filters_out_of_scope: {
      deferred: true as const,
      reason: feasibility.furnace_filter_comparison.furnace_deferred_reason,
    },
    no_overclaim_rules: noOverclaimRules,
    public_launch_authorized: false as const,
    csv_apply_authorized: false as const,
    supabase_update_authorized: false as const,
    sitemap_change_authorized: false as const,
    buy_gate_change_authorized: false as const,
    all_vacuum_bags_verified_claim: false as const,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };

  const inspect_summary = buildVacuumBagsResearchSeedPacketInspectSummaryV1({
    report: body,
    next_action,
  });

  return { ...body, inspect_summary };
}
