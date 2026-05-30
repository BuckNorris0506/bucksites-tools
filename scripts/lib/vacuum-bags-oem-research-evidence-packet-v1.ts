/**
 * Read-only Vacuum Bags OEM Research Evidence Packet v1.
 * Bounded evidence-structure audit for first seed families — not inventory, CSV, or CTA authority.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";

import {
  VACUUM_BAGS_RESEARCH_SEED_PACKET_CONTRACT_V1,
  type VacuumBagsResearchSeedPacketV1,
  buildVacuumBagsResearchSeedPacketV1,
} from "./vacuum-bags-research-seed-packet-v1";

export const VACUUM_BAGS_OEM_RESEARCH_EVIDENCE_PACKET_CONTRACT_V1 =
  "vacuum_bags_oem_research_evidence_packet_v1" as const;

export type VacuumBagsOemEvidenceRecommendationV1 =
  | "NEEDS_MORE_OEM_EVIDENCE"
  | "PARTIAL_TRUTH_SPINE_SEED_READY"
  | "TRUTH_SPINE_SEED_READY"
  | "BLOCKED";

export type FamilyEvidenceStatusV1 = "UNKNOWN";

export type FamilyBagCodeProofStatusV1 = "UNKNOWN" | "PROVEN_FROM_REPO";

export type FamilyModelFitProofStatusV1 = "UNKNOWN" | "PROVEN_FROM_REPO";

export type FamilyCompatibilityClaimStatusV1 = "no_claim";

export type BoundedOemFamilyTargetV1 = {
  brand_slug: string;
  brand: string;
  family_code: string;
  family_label: string;
  seed_packet_family_label: string;
};

export type OemFamilyEvidenceRowV1 = {
  brand: string;
  brand_slug: string;
  family_code: string;
  family_label: string;
  consumable_kind: "vacuum_bag";
  planning_status: "candidate_only";
  evidence_status: FamilyEvidenceStatusV1;
  bag_code_proof_status: FamilyBagCodeProofStatusV1;
  model_fit_proof_status: FamilyModelFitProofStatusV1;
  compatibility_claim_status: FamilyCompatibilityClaimStatusV1;
  safe_cta_claimed: false;
  ready_for_truth_spine_seed: boolean;
  required_evidence_before_csv: string[];
  next_research_action: string;
  repo_scan: {
    sample_csv_brand_row_hits: number;
    sample_csv_bag_token_hits: number;
    committed_production_csv_exists: boolean;
  };
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type VacuumBagsOemResearchEvidencePacketInspectSummaryV1 = {
  recommended_jq_paths: {
    standalone_report: ".inspect_summary";
    command_center: ".command_center_v2.vacuum_bags_oem_research_evidence_packet_v1.inspect_summary";
  };
  recommendation: VacuumBagsOemEvidenceRecommendationV1;
  vacuum_launch_state: ReturnType<typeof getVerticalLaunchState>;
  families_checked_count: number;
  families_ready_for_truth_spine_seed_count: number;
  families_needing_more_evidence_count: number;
  public_launch_authorized: false;
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  sitemap_change_authorized: false;
  buy_gate_change_authorized: false;
  all_vacuum_bags_verified_claim: false;
};

export type VacuumBagsOemResearchEvidencePacketV1 = {
  contract: typeof VACUUM_BAGS_OEM_RESEARCH_EVIDENCE_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_seed_packet_contract: typeof VACUUM_BAGS_RESEARCH_SEED_PACKET_CONTRACT_V1;
  source_seed_packet_recommendation: VacuumBagsResearchSeedPacketV1["recommendation"];
  recommendation: VacuumBagsOemEvidenceRecommendationV1;
  recommendation_rationale: string;
  vacuum_launch_state: ReturnType<typeof getVerticalLaunchState>;
  bounded_families: BoundedOemFamilyTargetV1[];
  family_evidence_rows: OemFamilyEvidenceRowV1[];
  evidence_rules: {
    bag_code_proof_separate_from_model_fit: true;
    marketplace_listings_disallowed_as_model_fit_proof: true;
    compatible_packs_not_official_without_label: true;
    furnace_filters_out_of_scope: true;
  };
  furnace_filters_out_of_scope_reason: string;
  public_launch_authorized: false;
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  sitemap_change_authorized: false;
  buy_gate_change_authorized: false;
  all_vacuum_bags_verified_claim: false;
  inspect_summary: VacuumBagsOemResearchEvidencePacketInspectSummaryV1;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export const VACUUM_OEM_BOUNDED_FAMILY_TARGETS_V1: readonly BoundedOemFamilyTargetV1[] = [
  {
    brand_slug: "miele",
    brand: "Miele",
    family_code: "GN",
    family_label: "Miele GN bag family",
    seed_packet_family_label: "Miele GN bag family",
  },
  {
    brand_slug: "miele",
    brand: "Miele",
    family_code: "FJM",
    family_label: "Miele FJM bag family",
    seed_packet_family_label: "Miele FJM bag family",
  },
  {
    brand_slug: "hoover",
    brand: "Hoover",
    family_code: "Type Y",
    family_label: "Hoover Type Y bag family",
    seed_packet_family_label: "Hoover Type Y bag family",
  },
  {
    brand_slug: "kenmore",
    brand: "Kenmore",
    family_code: "Q",
    family_label: "Kenmore Q bag family",
    seed_packet_family_label: "Kenmore Q bag family",
  },
] as const;

const VACUUM_SAMPLE_CSV_PATHS_V1 = [
  "data/vacuum/brands.sample.csv",
  "data/vacuum/models.sample.csv",
  "data/vacuum/filters.sample.csv",
  "data/vacuum/compatibility_mappings.sample.csv",
  "data/vacuum/filter_aliases.sample.csv",
  "data/vacuum/model_aliases.sample.csv",
  "data/vacuum/retailer_links.sample.csv",
] as const;

const VACUUM_COMMITTED_CSV_CANDIDATES_V1 = [
  "data/vacuum/brands.csv",
  "data/vacuum/models.csv",
  "data/vacuum/filters.csv",
  "data/vacuum/compatibility_mappings.csv",
  "data/vacuum/filter_aliases.csv",
  "data/vacuum/model_aliases.csv",
  "data/vacuum/retailer_links.csv",
] as const;

const REQUIRED_EVIDENCE_BEFORE_CSV_V1 = [
  "Official OEM bag type code or oem_part_number on manual/support (bag_code_proof — separate from model fit)",
  "Brand bag-type chart or manual model list mapping model series to bag code (model_fit_proof — separate from bag code)",
  "form_factor alignment (canister|upright) on models.csv candidate row",
  "compatibility_mappings row with fit_confidence only after both proofs captured — not from marketplace title",
  "retailer_links browser_truth direct_buyable row only after SKU identity proven — PDP is buy path not fit proof",
  "compatible_vs_official label when listing is not OEM",
];

function readCsvText(rootDir: string, rel: string): string | null {
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return null;
  try {
    return readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}

function countCsvHits(text: string | null, needles: string[]): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let hits = 0;
  for (const needle of needles) {
    if (lower.includes(needle.toLowerCase())) hits += 1;
  }
  return hits;
}

function anyCommittedProductionCsvExists(rootDir: string): boolean {
  return VACUUM_COMMITTED_CSV_CANDIDATES_V1.some((rel) => existsSync(path.join(rootDir, rel)));
}

function resolveFamilyReadyForTruthSpineSeed(args: {
  bag_code_proof_status: FamilyBagCodeProofStatusV1;
  model_fit_proof_status: FamilyModelFitProofStatusV1;
}): boolean {
  return (
    args.bag_code_proof_status === "PROVEN_FROM_REPO" &&
    args.model_fit_proof_status === "PROVEN_FROM_REPO"
  );
}

function resolveBagCodeProofStatus(args: {
  brandSlug: string;
  familyCode: string;
  sampleCsvCombined: string;
}): FamilyBagCodeProofStatusV1 {
  const brandHit = args.sampleCsvCombined.toLowerCase().includes(args.brandSlug);
  const codeHit = args.sampleCsvCombined.toLowerCase().includes(args.familyCode.toLowerCase());
  if (brandHit && codeHit) return "PROVEN_FROM_REPO";
  return "UNKNOWN";
}

function resolveModelFitProofStatus(args: {
  brandSlug: string;
  sampleCompatText: string | null;
  sampleModelsText: string | null;
}): FamilyModelFitProofStatusV1 {
  if (!args.sampleCompatText || !args.sampleModelsText) return "UNKNOWN";
  const brandInModels = args.sampleModelsText.toLowerCase().includes(args.brandSlug);
  const hasCompatRows =
    args.sampleCompatText.split("\n").filter((line) => line.trim() && !line.startsWith("model_slug")).length >
    0;
  if (brandInModels && hasCompatRows) return "PROVEN_FROM_REPO";
  return "UNKNOWN";
}

function nextResearchActionForFamily(target: BoundedOemFamilyTargetV1): string {
  switch (target.family_code) {
    case "GN":
      return "Capture Miele official GN bag OEM PN + model-series chart rows (canister S4/S5/S6 class) as research notes — not CSV.";
    case "FJM":
      return "Capture Miele FJM/F/J/M alias disambiguation + official manual bag-code proof — not CSV.";
    case "Type Y":
      return "Capture Hoover WindTunnel/Tempo Type Y official bag chart + OEM PN — not CSV.";
    case "Q":
      return "Capture Kenmore Q bag official chart separate from cross-brand compat listings — not CSV.";
    default:
      return "Capture OEM manual + bag-type chart evidence as research notes — not CSV.";
  }
}

function resolveRecommendation(args: {
  seedBlocked: boolean;
  readyCount: number;
  checkedCount: number;
}): { recommendation: VacuumBagsOemEvidenceRecommendationV1; rationale: string } {
  if (args.seedBlocked) {
    return {
      recommendation: "BLOCKED",
      rationale: "Source vacuum_bags_research_seed_packet_v1 is BLOCKED — OEM evidence packet cannot proceed.",
    };
  }
  if (args.readyCount >= args.checkedCount && args.checkedCount > 0) {
    return {
      recommendation: "TRUTH_SPINE_SEED_READY",
      rationale:
        "All bounded families have repo-proven bag-code and model-fit evidence — eligible to draft vacuum_bags_truth_spine_v1 (still no CSV apply).",
    };
  }
  if (args.readyCount > 0) {
    return {
      recommendation: "PARTIAL_TRUTH_SPINE_SEED_READY",
      rationale: `${String(args.readyCount)}/${String(args.checkedCount)} families have repo-proven dual evidence — remaining families need OEM research.`,
    };
  }
  return {
    recommendation: "NEEDS_MORE_OEM_EVIDENCE",
    rationale:
      "No bounded family has repo-proven bag-code + model-fit evidence yet — OEM manual/chart research required before truth-spine seed.",
  };
}

export function buildVacuumBagsOemResearchEvidencePacketInspectSummaryV1(args: {
  report: Pick<
    VacuumBagsOemResearchEvidencePacketV1,
    | "recommendation"
    | "vacuum_launch_state"
    | "family_evidence_rows"
    | "public_launch_authorized"
    | "csv_apply_authorized"
    | "supabase_update_authorized"
    | "sitemap_change_authorized"
    | "buy_gate_change_authorized"
    | "all_vacuum_bags_verified_claim"
  >;
}): VacuumBagsOemResearchEvidencePacketInspectSummaryV1 {
  const readyCount = args.report.family_evidence_rows.filter((r) => r.ready_for_truth_spine_seed).length;
  const checkedCount = args.report.family_evidence_rows.length;
  return {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary",
      command_center:
        ".command_center_v2.vacuum_bags_oem_research_evidence_packet_v1.inspect_summary",
    },
    recommendation: args.report.recommendation,
    vacuum_launch_state: args.report.vacuum_launch_state,
    families_checked_count: checkedCount,
    families_ready_for_truth_spine_seed_count: readyCount,
    families_needing_more_evidence_count: checkedCount - readyCount,
    public_launch_authorized: false,
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    sitemap_change_authorized: false,
    buy_gate_change_authorized: false,
    all_vacuum_bags_verified_claim: false,
  };
}

export function buildVacuumBagsOemResearchEvidencePacketUnknownV1(args: {
  generated_at: string;
  reason: string;
}): VacuumBagsOemResearchEvidencePacketV1 {
  const vacuumLaunchState = getVerticalLaunchState("vacuum");
  const body = {
    contract: VACUUM_BAGS_OEM_RESEARCH_EVIDENCE_PACKET_CONTRACT_V1,
    read_only: true as const,
    data_mutation: false as const,
    generated_at: args.generated_at,
    source_seed_packet_contract: VACUUM_BAGS_RESEARCH_SEED_PACKET_CONTRACT_V1,
    source_seed_packet_recommendation: "BLOCKED" as const,
    recommendation: "BLOCKED" as const,
    recommendation_rationale: `OEM evidence packet build failed: ${args.reason}`,
    vacuum_launch_state: vacuumLaunchState,
    bounded_families: [],
    family_evidence_rows: [],
    evidence_rules: {
      bag_code_proof_separate_from_model_fit: true as const,
      marketplace_listings_disallowed_as_model_fit_proof: true as const,
      compatible_packs_not_official_without_label: true as const,
      furnace_filters_out_of_scope: true as const,
    },
    furnace_filters_out_of_scope_reason:
      "Furnace filters require separate HVAC/MERV/airflow modeling — out of scope.",
    public_launch_authorized: false as const,
    csv_apply_authorized: false as const,
    supabase_update_authorized: false as const,
    sitemap_change_authorized: false as const,
    buy_gate_change_authorized: false as const,
    all_vacuum_bags_verified_claim: false as const,
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [`UNKNOWN: vacuum_bags_oem_research_evidence_packet_v1 failed: ${args.reason}`],
  };
  const inspect_summary = buildVacuumBagsOemResearchEvidencePacketInspectSummaryV1({ report: body });
  return { ...body, inspect_summary };
}

export function buildVacuumBagsOemResearchEvidencePacketV1(args: {
  rootDir: string;
  now?: () => Date;
  seedPacket?: VacuumBagsResearchSeedPacketV1;
}): VacuumBagsOemResearchEvidencePacketV1 {
  const now = args.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const rootDir = args.rootDir;
  const vacuumLaunchState = getVerticalLaunchState("vacuum");

  const seedPacket =
    args.seedPacket ??
    buildVacuumBagsResearchSeedPacketV1({ rootDir, now: args.now });

  const sampleTexts = VACUUM_SAMPLE_CSV_PATHS_V1.map((rel) => readCsvText(rootDir, rel)).filter(
    (t): t is string => t !== null,
  );
  const sampleCsvCombined = sampleTexts.join("\n");
  const sampleModelsText = readCsvText(rootDir, "data/vacuum/models.sample.csv");
  const sampleCompatText = readCsvText(rootDir, "data/vacuum/compatibility_mappings.sample.csv");
  const committedProductionCsvExists = anyCommittedProductionCsvExists(rootDir);

  const familyEvidenceRows: OemFamilyEvidenceRowV1[] = VACUUM_OEM_BOUNDED_FAMILY_TARGETS_V1.map(
    (target) => {
      const seedFamily = seedPacket.first_seed_families.find(
        (f) => f.family_label === target.seed_packet_family_label,
      );

      const brandNeedles = [target.brand_slug, target.brand];
      const codeNeedles = [target.family_code, ... (seedFamily?.bag_code_tokens ?? [])];
      const sampleBrandHits = countCsvHits(sampleCsvCombined, brandNeedles);
      const sampleTokenHits = countCsvHits(sampleCsvCombined, codeNeedles);

      const bagCodeProofStatus = resolveBagCodeProofStatus({
        brandSlug: target.brand_slug,
        familyCode: target.family_code,
        sampleCsvCombined,
      });
      const modelFitProofStatus = resolveModelFitProofStatus({
        brandSlug: target.brand_slug,
        sampleCompatText,
        sampleModelsText,
      });

      const readyForTruthSpineSeed = resolveFamilyReadyForTruthSpineSeed({
        bag_code_proof_status: bagCodeProofStatus,
        model_fit_proof_status: modelFitProofStatus,
      });

      const proven_facts: string[] = [];
      const inferred_facts: string[] = [];
      const unknown_facts: string[] = [];

      if (seedFamily) {
        proven_facts.push(
          `PROVEN: ${target.family_label} exists in source seed packet as planning_status=${seedFamily.planning_status}.`,
        );
      } else {
        unknown_facts.push(`UNKNOWN: ${target.family_label} not found in source seed packet first_seed_families.`);
      }

      proven_facts.push(
        `PROVEN: data/vacuum sample CSV scan brand_hits=${String(sampleBrandHits)} token_hits=${String(sampleTokenHits)} for ${target.family_code}.`,
      );
      proven_facts.push(`PROVEN: committed_production_csv_exists=${String(committedProductionCsvExists)}.`);

      if (bagCodeProofStatus === "UNKNOWN") {
        unknown_facts.push(
          `UNKNOWN: bag_code_proof for ${target.family_label} — no repo sample/committed CSV row proves OEM bag code.`,
        );
      }
      if (modelFitProofStatus === "UNKNOWN") {
        unknown_facts.push(
          `UNKNOWN: model_fit_proof for ${target.family_label} — no repo model+compatibility mapping proves fit.`,
        );
      }

      inferred_facts.push(
        `INFERRED: ${target.family_label} evidence_status=UNKNOWN until OEM manual/chart research is captured in a future evidence artifact (not this packet).`,
      );

      return {
        brand: target.brand,
        brand_slug: target.brand_slug,
        family_code: target.family_code,
        family_label: target.family_label,
        consumable_kind: "vacuum_bag" as const,
        planning_status: "candidate_only" as const,
        evidence_status: "UNKNOWN" as const,
        bag_code_proof_status: bagCodeProofStatus,
        model_fit_proof_status: modelFitProofStatus,
        compatibility_claim_status: "no_claim" as const,
        safe_cta_claimed: false as const,
        ready_for_truth_spine_seed: readyForTruthSpineSeed,
        required_evidence_before_csv: [...REQUIRED_EVIDENCE_BEFORE_CSV_V1],
        next_research_action: nextResearchActionForFamily(target),
        repo_scan: {
          sample_csv_brand_row_hits: sampleBrandHits,
          sample_csv_bag_token_hits: sampleTokenHits,
          committed_production_csv_exists: committedProductionCsvExists,
        },
        proven_facts,
        inferred_facts,
        unknown_facts,
      };
    },
  );

  const readyCount = familyEvidenceRows.filter((r) => r.ready_for_truth_spine_seed).length;
  const seedBlocked = seedPacket.recommendation === "BLOCKED";

  const { recommendation, rationale } = resolveRecommendation({
    seedBlocked,
    readyCount,
    checkedCount: familyEvidenceRows.length,
  });

  const proven_facts = [
    `PROVEN: source_seed_packet_contract=${VACUUM_BAGS_RESEARCH_SEED_PACKET_CONTRACT_V1}.`,
    `PROVEN: source seed packet recommendation=${seedPacket.recommendation}.`,
    `PROVEN: vacuum_launch_state=${vacuumLaunchState}.`,
    `PROVEN: bounded family count=${String(VACUUM_OEM_BOUNDED_FAMILY_TARGETS_V1.length)} (Miele GN, Miele FJM, Hoover Type Y, Kenmore Q).`,
    "PROVEN: data/vacuum/*.sample.csv exists — vacdemo demo rows only; no Miele/Hoover/Kenmore bag inventory in repo CSVs.",
    `PROVEN: committed_production_csv_exists=${String(committedProductionCsvExists)}.`,
    "PROVEN: csv_apply_authorized=false; supabase_update_authorized=false; public_launch_authorized=false.",
    "PROVEN: sitemap_change_authorized=false; buy_gate_change_authorized=false.",
    "PROVEN: all_vacuum_bags_verified_claim=false.",
    "PROVEN: marketplace_listings_disallowed_as_model_fit_proof=true.",
    "PROVEN: Furnace filters out of scope — no HVAC/MERV module in repo.",
  ];

  const inferred_facts = [
    `INFERRED: families_ready_for_truth_spine_seed_count=${String(readyCount)} requires both bag_code_proof and model_fit_proof PROVEN_FROM_REPO.`,
    "INFERRED: This packet documents evidence gaps — it does not perform external OEM web research.",
    "INFERRED: vacuum_bags_truth_spine_v1 should not be seeded until at least one family clears dual repo evidence gates.",
  ];

  const unknown_facts = [
    "UNKNOWN: External OEM manual/chart evidence for bounded families — not captured in repo yet.",
    "UNKNOWN: Retailer browser_truth buy paths for bounded bag codes — no retailer_links rows in repo.",
    "UNKNOWN: Market demand ranking for GN vs FJM vs Type Y vs Q — not joined in this packet.",
  ];

  const body = {
    contract: VACUUM_BAGS_OEM_RESEARCH_EVIDENCE_PACKET_CONTRACT_V1,
    read_only: true as const,
    data_mutation: false as const,
    generated_at,
    source_seed_packet_contract: VACUUM_BAGS_RESEARCH_SEED_PACKET_CONTRACT_V1,
    source_seed_packet_recommendation: seedPacket.recommendation,
    recommendation,
    recommendation_rationale: rationale,
    vacuum_launch_state: vacuumLaunchState,
    bounded_families: [...VACUUM_OEM_BOUNDED_FAMILY_TARGETS_V1],
    family_evidence_rows: familyEvidenceRows,
    evidence_rules: {
      bag_code_proof_separate_from_model_fit: true as const,
      marketplace_listings_disallowed_as_model_fit_proof: true as const,
      compatible_packs_not_official_without_label: true as const,
      furnace_filters_out_of_scope: true as const,
    },
    furnace_filters_out_of_scope_reason: seedPacket.furnace_filters_out_of_scope.reason,
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

  const inspect_summary = buildVacuumBagsOemResearchEvidencePacketInspectSummaryV1({ report: body });

  return { ...body, inspect_summary };
}
