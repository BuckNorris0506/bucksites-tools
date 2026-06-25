/**
 * Read-only Wedge Speed Test v1 — measure whether an under-mature wedge can enter
 * existing BuckParts adapter/factory/truth machinery without core contract changes.
 * Does not implement any wedge.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { HOMEKEEP_WEDGE_CATALOG, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";
import {
  getVerticalLaunchState,
  VERTICAL_SLUGS_WITH_APP_SEGMENT_LAYOUT,
  type VerticalSlug,
} from "@/lib/catalog/vertical-launch-state";
import { assessHumidifierContractFitV1 } from "@/lib/coverage-factory/adapters/humidifier-coverage-factory-adapter-v1";
import { assessVacuumContractFitV1 } from "@/lib/coverage-factory/adapters/vacuum-coverage-factory-adapter-v1";
import { assessApplianceAirContractFitV1 } from "@/lib/coverage-factory/adapters/appliance-air-coverage-factory-adapter-v1";

import {
  buildAllProductSafeBuyerPathCensusV1,
  type AllProductSafeBuyerPathCensusV1,
} from "./all-product-safe-buyer-path-census-v1";
import {
  buildPublicWedgeReadinessAndEasiestWinsV1,
  type PublicWedgeReadinessRowV1,
} from "./public-wedge-readiness-and-easiest-wins-v1";
import {
  buildWedgeTruthSpineCoverageMatrixV1,
  type WedgeTruthSpineCoverageRowV1,
} from "./wedge-truth-spine-coverage-matrix-v1";

export const WEDGE_SPEED_TEST_CONTRACT_V1 = "wedge_speed_test_v1" as const;

export const WEDGE_SPEED_TEST_SOURCE_COMMAND_V1 =
  "npm run buckparts:wedge-speed-test" as const;

export const WEDGE_SPEED_TEST_FALSIFICATION_CLAIM_V1 =
  "If a second wedge takes 80% of the time the first wedge took, BuckParts is domain-specific; if ~10–20%, the architecture is reusable." as const;

export const WEDGE_SPEED_TEST_CANDIDATES_V1 = [
  HOMEKEEP_WEDGE_CATALOG.humidifier,
  HOMEKEEP_WEDGE_CATALOG.vacuum,
  HOMEKEEP_WEDGE_CATALOG.appliance_air,
] as const;

export type WedgeSpeedTestCandidateWedgeV1 = (typeof WEDGE_SPEED_TEST_CANDIDATES_V1)[number];

export type WedgeCapabilityStatusV1 =
  | "ALREADY_EXISTS"
  | "NEEDS_ADAPTER"
  | "NEEDS_EVIDENCE"
  | "NEEDS_BUYER_PATH_PROOF"
  | "NEEDS_PAGE_TEMPLATE"
  | "NEEDS_CORE_CONTRACT_CHANGE"
  | "UNKNOWN";

export type WedgeSpeedRatioClassV1 =
  | "UNDER_20_PERCENT"
  | "TWENTY_TO_FIFTY_PERCENT"
  | "FIFTY_TO_EIGHTY_PERCENT"
  | "OVER_EIGHTY_PERCENT"
  | "UNKNOWN";

export type WedgeSpeedArchitectureVerdictV1 =
  | "REUSABLE_ARCHITECTURE_SIGNAL"
  | "DOMAIN_SPECIFIC_SIGNAL"
  | "INCONCLUSIVE";

export type WedgeCapabilityRowV1 = {
  capability_id: string;
  label: string;
  fridge_ap_maturity_note: string;
  candidate_status: WedgeCapabilityStatusV1;
  evidence: string[];
  source: string;
};

export type WedgeInventoryV1 = {
  data_files: string[];
  data_source: "committed_csv" | "sample_csv_only" | "missing";
  routes: string[];
  page_templates: string[];
  adapter_id: string | null;
  adapter_tests: string[];
  evidence_artifact_dirs: string[];
  safe_buyer_path_proven_count: number;
  census_product_rows: number;
  sitemap_indexability: "NOINDEX_UNPROVEN" | "PREVIEW_NOINDEX" | "UNKNOWN";
  command_center_lanes: string[];
  package_scripts: string[];
  tests: string[];
};

export type WedgeSelectionScoreV1 = {
  wedge: WedgeSpeedTestCandidateWedgeV1;
  score: number;
  reasons: string[];
  excluded: boolean;
  exclusion_reason: string | null;
};

export type WedgeSpeedTestReportV1 = {
  contract: typeof WEDGE_SPEED_TEST_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  artifact_write_authorized: false;
  supabase_writes: false;
  source_command: typeof WEDGE_SPEED_TEST_SOURCE_COMMAND_V1;
  generated_at: string;
  falsification_claim: typeof WEDGE_SPEED_TEST_FALSIFICATION_CLAIM_V1;
  candidate_scores: WedgeSelectionScoreV1[];
  selected_wedge: WedgeSpeedTestCandidateWedgeV1;
  selection_reasons: string[];
  inventory: WedgeInventoryV1;
  capability_rows: WedgeCapabilityRowV1[];
  reuse_map: {
    fridge_ap_capabilities_already_reused: string[];
    candidate_capabilities_still_required: string[];
  };
  blockers: string[];
  core_contract_change_count: number;
  wedge_speed_ratio_estimate: WedgeSpeedRatioClassV1;
  wedge_speed_ratio_rationale: string[];
  architecture_verdict: WedgeSpeedArchitectureVerdictV1;
  fastest_proving_implementation_slice: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

const VERTICAL_BY_WEDGE: Record<WedgeSpeedTestCandidateWedgeV1, VerticalSlug> = {
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: "humidifier",
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: "vacuum",
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: "appliance-air",
};

const DATA_DIR_BY_WEDGE: Record<WedgeSpeedTestCandidateWedgeV1, string> = {
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: "data/humidifier",
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: "data/vacuum",
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: "data/appliance-air",
};

const ADAPTER_BY_WEDGE: Record<
  WedgeSpeedTestCandidateWedgeV1,
  { id: string; lib: string; test: string }
> = {
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: {
    id: "humidifier_coverage_factory_reference_adapter_v1",
    lib: "src/lib/coverage-factory/adapters/humidifier-coverage-factory-adapter-v1.ts",
    test: "src/lib/coverage-factory/adapters/humidifier-coverage-factory-adapter-v1.test.ts",
  },
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: {
    id: "vacuum_coverage_factory_reference_adapter_v1",
    lib: "src/lib/coverage-factory/adapters/vacuum-coverage-factory-adapter-v1.ts",
    test: "src/lib/coverage-factory/adapters/vacuum-coverage-factory-adapter-v1.test.ts",
  },
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: {
    id: "appliance_air_coverage_factory_reference_adapter_v1",
    lib: "src/lib/coverage-factory/adapters/appliance-air-coverage-factory-adapter-v1.ts",
    test: "src/lib/coverage-factory/adapters/appliance-air-coverage-factory-adapter-v1.test.ts",
  },
};

const CAPABILITY_WEIGHTS_V1: Record<WedgeCapabilityStatusV1, number> = {
  ALREADY_EXISTS: 0,
  NEEDS_ADAPTER: 0.12,
  NEEDS_EVIDENCE: 0.22,
  NEEDS_BUYER_PATH_PROOF: 0.22,
  NEEDS_PAGE_TEMPLATE: 0.08,
  NEEDS_CORE_CONTRACT_CHANGE: 1,
  UNKNOWN: 0.45,
};

const FRIDGE_AP_BASELINE_WEIGHT_V1 = 1;

export type BuildWedgeSpeedTestDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  census?: AllProductSafeBuyerPathCensusV1;
};

function defaultFileExists(abs: string): boolean {
  return existsSync(abs);
}

function defaultReadText(abs: string): string {
  return readFileSync(abs, "utf8");
}

function listRepoFiles(rootDir: string, relDir: string, fileExists: (abs: string) => boolean): string[] {
  const abs = path.join(rootDir, relDir);
  if (!fileExists(abs)) return [];
  try {
    return readdirSync(abs)
      .sort()
      .map((f) => `${relDir}/${f}`);
  } catch {
    return [];
  }
}

function globRoutes(rootDir: string, vertical: VerticalSlug, fileExists: (abs: string) => boolean): string[] {
  const base = `src/app/${vertical}`;
  const routes: string[] = [];
  const candidates = [
    `${base}/page.tsx`,
    `${base}/layout.tsx`,
    `${base}/search/page.tsx`,
    `${base}/brand/[slug]/page.tsx`,
    `${base}/model/[slug]/page.tsx`,
    `${base}/filter/[slug]/page.tsx`,
    `${base}/go/[linkId]/route.ts`,
  ];
  for (const rel of candidates) {
    if (fileExists(path.join(rootDir, rel))) routes.push(rel);
  }
  return routes;
}

function packageScriptsForWedge(wedge: WedgeSpeedTestCandidateWedgeV1, pkg: Record<string, string>): string[] {
  const vertical = VERTICAL_BY_WEDGE[wedge];
  return Object.entries(pkg)
    .filter(([key, val]) => key.includes(vertical.replace("-", "")) || val.includes(vertical))
    .map(([key]) => key)
    .sort();
}

function commandCenterLanesForWedge(wedge: WedgeSpeedTestCandidateWedgeV1): string[] {
  if (wedge === HOMEKEEP_WEDGE_CATALOG.vacuum) {
    return [
      "vacuum_bags_wedge_feasibility_v1",
      "vacuum_bags_research_seed_packet_v1",
      "vacuum_bags_oem_research_evidence_packet_v1",
      "wedge_truth_spine_coverage_matrix_v1",
      "public_wedge_readiness_and_easiest_wins_v1",
    ];
  }
  return ["wedge_truth_spine_coverage_matrix_v1", "public_wedge_readiness_and_easiest_wins_v1"];
}

function contractFitGaps(wedge: WedgeSpeedTestCandidateWedgeV1) {
  if (wedge === HOMEKEEP_WEDGE_CATALOG.humidifier) return assessHumidifierContractFitV1();
  if (wedge === HOMEKEEP_WEDGE_CATALOG.vacuum) return assessVacuumContractFitV1();
  return assessApplianceAirContractFitV1();
}

function hasCoreContractChangeRisk(wedge: WedgeSpeedTestCandidateWedgeV1): boolean {
  return contractFitGaps(wedge).some((g) => g.kind === "CORE_CONTRACT_GAP");
}

function businessRiskScore(wedge: WedgeSpeedTestCandidateWedgeV1): number {
  if (wedge === HOMEKEEP_WEDGE_CATALOG.humidifier) return 3;
  if (wedge === HOMEKEEP_WEDGE_CATALOG.appliance_air) return 2;
  return 1;
}

function structuralSimilarityScore(wedge: WedgeSpeedTestCandidateWedgeV1): number {
  if (wedge === HOMEKEEP_WEDGE_CATALOG.humidifier) return 3;
  if (wedge === HOMEKEEP_WEDGE_CATALOG.vacuum) return 1;
  return 2;
}

function infrastructureScore(
  wedge: WedgeSpeedTestCandidateWedgeV1,
  fileExists: (abs: string) => boolean,
  rootDir: string,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const adapter = ADAPTER_BY_WEDGE[wedge];
  if (fileExists(path.join(rootDir, adapter.lib))) {
    score += 20;
    reasons.push(`UCF reference adapter present (${adapter.id})`);
  }
  if (fileExists(path.join(rootDir, adapter.test))) {
    score += 5;
    reasons.push("adapter unit tests present");
  }
  const routes = globRoutes(rootDir, VERTICAL_BY_WEDGE[wedge], fileExists);
  if (routes.length >= 6) {
    score += 15;
    reasons.push(`vertical route scaffold present (${routes.length} routes)`);
  }
  const dataFiles = listRepoFiles(rootDir, DATA_DIR_BY_WEDGE[wedge], fileExists);
  if (dataFiles.length >= 7) {
    score += 10;
    reasons.push(`sample CSV inventory shape present (${dataFiles.length} files)`);
  }
  if (wedge === HOMEKEEP_WEDGE_CATALOG.vacuum) {
    if (fileExists(path.join(rootDir, "scripts/lib/vacuum-bags-wedge-feasibility-v1.ts"))) {
      score += 12;
      reasons.push("vacuum_bags_wedge_feasibility_v1 lane present");
    }
  }
  score += structuralSimilarityScore(wedge) * 4;
  reasons.push(`structural_similarity_to_AP_filter_cartridge=${structuralSimilarityScore(wedge)}`);
  score += businessRiskScore(wedge) * 3;
  reasons.push(`business_risk_surface_score=${businessRiskScore(wedge)} (higher is lower risk)`);
  return { score, reasons };
}

export function scoreWedgeSpeedTestCandidatesV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
}): WedgeSelectionScoreV1[] {
  const fileExists = args.fileExists ?? defaultFileExists;
  return WEDGE_SPEED_TEST_CANDIDATES_V1.map((wedge) => {
    const { score, reasons } = infrastructureScore(wedge, fileExists, args.rootDir);
    const excluded = false;
    return {
      wedge,
      score,
      reasons,
      excluded,
      exclusion_reason: null,
    };
  }).sort((a, b) => b.score - a.score || a.wedge.localeCompare(b.wedge));
}

export function selectWedgeForSpeedTestV1(
  scores: WedgeSelectionScoreV1[],
): { wedge: WedgeSpeedTestCandidateWedgeV1; reasons: string[] } {
  const winner = scores.find((s) => !s.excluded) ?? scores[0];
  return {
    wedge: winner.wedge,
    reasons: [
      `highest deterministic selection score=${winner.score}`,
      ...winner.reasons,
      "humidifier preferred when tied: filter-cartridge vertical closest to air_purifier with lower wrong-part risk than vacuum bags",
    ],
  };
}

function buildInventory(args: {
  rootDir: string;
  wedge: WedgeSpeedTestCandidateWedgeV1;
  readiness: PublicWedgeReadinessRowV1 | undefined;
  spine: WedgeTruthSpineCoverageRowV1 | undefined;
  census: AllProductSafeBuyerPathCensusV1;
  fileExists: (abs: string) => boolean;
  pkg: Record<string, string>;
}): WedgeInventoryV1 {
  const vertical = VERTICAL_BY_WEDGE[args.wedge];
  const dataDir = DATA_DIR_BY_WEDGE[args.wedge];
  const adapter = ADAPTER_BY_WEDGE[args.wedge];
  const censusRows = args.census.products.filter((p) => p.wedge === args.wedge);

  const tests = [
    adapter.test,
    "src/lib/coverage-factory/universal-coverage-factory-pressure-test-v1.test.ts",
    "scripts/lib/wedge-truth-spine-coverage-matrix-v1.test.ts",
  ].filter((rel) => args.fileExists(path.join(args.rootDir, rel)));

  if (args.wedge === HOMEKEEP_WEDGE_CATALOG.vacuum) {
    tests.push(
      "scripts/lib/vacuum-bags-wedge-feasibility-v1.test.ts",
      "scripts/lib/vacuum-bags-research-seed-packet-v1.test.ts",
    );
  }

  return {
    data_files: listRepoFiles(args.rootDir, dataDir, args.fileExists),
    data_source: args.readiness?.csv_data_source ?? "missing",
    routes: globRoutes(args.rootDir, vertical, args.fileExists),
    page_templates: globRoutes(args.rootDir, vertical, args.fileExists).filter((r) =>
      r.includes("/filter/") || r.includes("/model/"),
    ),
    adapter_id: args.fileExists(path.join(args.rootDir, adapter.lib)) ? adapter.id : null,
    adapter_tests: tests.filter((t) => t.includes("adapter")),
    evidence_artifact_dirs: listRepoFiles(args.rootDir, dataDir, args.fileExists).filter((f) =>
      f.includes("evidence"),
    ),
    safe_buyer_path_proven_count: censusRows.filter(
      (r) => r.page_classification === "SAFE_BUYER_PATH_PROVEN",
    ).length,
    census_product_rows: censusRows.length,
    sitemap_indexability:
      args.spine?.public_indexing_status === "PREVIEW_NOINDEX"
        ? "PREVIEW_NOINDEX"
        : args.spine?.public_indexing_status === "NOINDEX_UNPROVEN"
          ? "NOINDEX_UNPROVEN"
          : "UNKNOWN",
    command_center_lanes: commandCenterLanesForWedge(args.wedge),
    package_scripts: packageScriptsForWedge(args.wedge, args.pkg),
    tests: [...new Set(tests)].sort(),
  };
}

function classifyCapabilities(args: {
  wedge: WedgeSpeedTestCandidateWedgeV1;
  inventory: WedgeInventoryV1;
  readiness: PublicWedgeReadinessRowV1 | undefined;
  spine: WedgeTruthSpineCoverageRowV1 | undefined;
}): WedgeCapabilityRowV1[] {
  const { inventory, readiness, spine, wedge } = args;
  const adapter = ADAPTER_BY_WEDGE[wedge];
  const contractGaps = contractFitGaps(wedge);
  const hasAdapterOnlyGaps = contractGaps.every(
    (g) => g.kind === "ADAPTER_ONLY" || g.kind === "LEGACY_DATA_ISSUE",
  );

  const rows: WedgeCapabilityRowV1[] = [
    {
      capability_id: "identity_model",
      label: "Committed catalog / identity model",
      fridge_ap_maturity_note: "fridge + AP use committed CSV inventory with brand/model/filter slugs",
      candidate_status:
        inventory.data_source === "committed_csv"
          ? "ALREADY_EXISTS"
          : inventory.data_source === "sample_csv_only"
            ? "NEEDS_EVIDENCE"
            : "UNKNOWN",
      evidence: [`csv_data_source:${inventory.data_source}`, `data_files:${inventory.data_files.length}`],
      source: DATA_DIR_BY_WEDGE[wedge],
    },
    {
      capability_id: "evidence_model",
      label: "Model-first evidence lanes",
      fridge_ap_maturity_note: "AP model-first queue + fridge manual evidence lanes",
      candidate_status: spine?.has_model_first_evidence_lane ? "ALREADY_EXISTS" : "NEEDS_EVIDENCE",
      evidence: [`has_model_first_evidence_lane:${String(spine?.has_model_first_evidence_lane ?? false)}`],
      source: "wedge_truth_spine_coverage_matrix_v1",
    },
    {
      capability_id: "buyer_path_proof",
      label: "Safe buyer-path proof",
      fridge_ap_maturity_note: "direct_buyable browser-truth rows in committed retailer_links",
      candidate_status:
        inventory.safe_buyer_path_proven_count > 0
          ? "ALREADY_EXISTS"
          : readiness?.buyer_path_truth_status === "ZERO_SAFE_ROWS"
            ? "NEEDS_BUYER_PATH_PROOF"
            : "NEEDS_BUYER_PATH_PROOF",
      evidence: [
        `safe_buyer_path_proven_count:${inventory.safe_buyer_path_proven_count}`,
        `buyer_path_truth_status:${readiness?.buyer_path_truth_status ?? "UNKNOWN"}`,
      ],
      source: "all_product_safe_buyer_path_census_v1",
    },
    {
      capability_id: "adapter_contract",
      label: "UCF coverage factory adapter",
      fridge_ap_maturity_note: "fridge + AP production adapters; sample wedges use reference adapters",
      candidate_status: inventory.adapter_id ? "ALREADY_EXISTS" : "NEEDS_ADAPTER",
      evidence: [`adapter_id:${inventory.adapter_id ?? "missing"}`],
      source: adapter.lib,
    },
    {
      capability_id: "ucf_registration",
      label: "UCF index / pressure-test registration",
      fridge_ap_maturity_note: "registered in src/lib/coverage-factory/index.ts pressure tests",
      candidate_status: inventory.adapter_tests.length > 0 ? "ALREADY_EXISTS" : "NEEDS_ADAPTER",
      evidence: inventory.adapter_tests,
      source: "src/lib/coverage-factory/index.ts",
    },
    {
      capability_id: "page_templates",
      label: "Vertical page templates",
      fridge_ap_maturity_note: "filter/model/brand/search/go routes live under vertical layout",
      candidate_status:
        inventory.routes.length >= 6 ? "ALREADY_EXISTS" : "NEEDS_PAGE_TEMPLATE",
      evidence: inventory.routes,
      source: `src/app/${VERTICAL_BY_WEDGE[wedge]}`,
    },
    {
      capability_id: "truth_spine_formal",
      label: "Formal truth spine contract",
      fridge_ap_maturity_note: "fridge_truth_spine_v1 + air_purifier_truth_spine_v1",
      candidate_status: spine?.has_formal_truth_spine ? "ALREADY_EXISTS" : "NEEDS_ADAPTER",
      evidence: [`truth_spine_contract:${spine?.truth_spine_contract_name ?? "UNKNOWN"}`],
      source: "wedge_truth_spine_coverage_matrix_v1",
    },
    {
      capability_id: "batch_production_lane",
      label: "Batch production / safe CTA director",
      fridge_ap_maturity_note: "air_purifier_batch_production_lane_v1",
      candidate_status: spine?.has_safe_cta_queue_or_batch_director
        ? "ALREADY_EXISTS"
        : "NEEDS_ADAPTER",
      evidence: [
        `has_safe_cta_queue_or_batch_director:${String(spine?.has_safe_cta_queue_or_batch_director ?? false)}`,
      ],
      source: "wedge_truth_spine_coverage_matrix_v1",
    },
    {
      capability_id: "guardrails_runbook",
      label: "Guardrails + runbook package scripts",
      fridge_ap_maturity_note: "buckparts:guardrails:* and buckparts:runbook:* per live wedge",
      candidate_status:
        inventory.package_scripts.some((s) => s.includes("guardrails")) &&
        inventory.package_scripts.some((s) => s.includes("runbook"))
          ? "ALREADY_EXISTS"
          : "NEEDS_ADAPTER",
      evidence: inventory.package_scripts,
      source: "package.json",
    },
    {
      capability_id: "page_quality_gate",
      label: "Page quality gate artifacts",
      fridge_ap_maturity_note: "buckparts_page_quality_gate_v1 (fridge-heavy today)",
      candidate_status: "NEEDS_ADAPTER",
      evidence: ["no wedge-specific page_quality_gate artifact dir in candidate wedge"],
      source: "scripts/lib/buckparts-page-quality-gate-v1.ts",
    },
    {
      capability_id: "runtime_convergence",
      label: "Repo→runtime convergence gate",
      fridge_ap_maturity_note: "repo_runtime_convergence_gate_v1 (AP Supabase vs CSV today)",
      candidate_status: "ALREADY_EXISTS",
      evidence: ["no AP-style Supabase vs CSV convergence gate required for preview/sample wedge"],
      source: "scripts/lib/repo-runtime-convergence-gate-v1.ts",
    },
    {
      capability_id: "referenceability_factory",
      label: "Referenceability factory compatibility",
      fridge_ap_maturity_note: "referenceability_factory_run_v1 scoped to fridge + AP only",
      candidate_status: "NEEDS_ADAPTER",
      evidence: ["factory scoped_wedges exclude candidate — extension is adapter/config only"],
      source: "scripts/lib/referenceability-factory-run-v1.ts",
    },
    {
      capability_id: "search_intent_experiments",
      label: "Search intent / distribution experiments",
      fridge_ap_maturity_note: "distribution + search_intent experiments use fridge/AP safe pages",
      candidate_status: "NEEDS_ADAPTER",
      evidence: ["experiments hard-scope fridge + air_purifier today"],
      source: "scripts/lib/buckparts-distribution-five-page-experiment-v1.ts",
    },
    {
      capability_id: "command_center_visibility",
      label: "Dedicated Command Center lanes",
      fridge_ap_maturity_note: "fridge/AP/WHW have dedicated CC JSON paths",
      candidate_status:
        inventory.command_center_lanes.length > 2 ? "ALREADY_EXISTS" : "NEEDS_ADAPTER",
      evidence: inventory.command_center_lanes,
      source: "scripts/lib/buckparts-command-center-v2.ts",
    },
    {
      capability_id: "ucf_core_contract_fit",
      label: "UCF core contract fit without core enum changes",
      fridge_ap_maturity_note: "fridge/AP map into UCF without CORE_CONTRACT_GAP",
      candidate_status: hasAdapterOnlyGaps ? "ALREADY_EXISTS" : "NEEDS_CORE_CONTRACT_CHANGE",
      evidence: contractGaps.map((g) => `contract_fit:${g.kind}:${g.topic}`),
      source: adapter.lib,
    },
  ];

  return rows;
}

export function estimateWedgeSpeedRatioV1(args: {
  capability_rows: WedgeCapabilityRowV1[];
}): { ratio: WedgeSpeedRatioClassV1; rationale: string[] } {
  const rationale: string[] = [];
  let remaining = 0;
  for (const row of args.capability_rows) {
    remaining += CAPABILITY_WEIGHTS_V1[row.candidate_status];
    rationale.push(`${row.capability_id}=${row.candidate_status} (weight=${CAPABILITY_WEIGHTS_V1[row.candidate_status]})`);
  }
  const ratioValue = remaining / FRIDGE_AP_BASELINE_WEIGHT_V1;
  rationale.push(`normalized_remaining_effort=${ratioValue.toFixed(2)}`);

  if (args.capability_rows.some((r) => r.candidate_status === "NEEDS_CORE_CONTRACT_CHANGE")) {
    return { ratio: "OVER_EIGHTY_PERCENT", rationale };
  }
  if (args.capability_rows.filter((r) => r.candidate_status === "UNKNOWN").length >= 4) {
    return { ratio: "UNKNOWN", rationale };
  }
  if (ratioValue < 0.2) return { ratio: "UNDER_20_PERCENT", rationale };
  if (ratioValue < 0.5) return { ratio: "TWENTY_TO_FIFTY_PERCENT", rationale };
  if (ratioValue < 0.8) return { ratio: "FIFTY_TO_EIGHTY_PERCENT", rationale };
  return { ratio: "OVER_EIGHTY_PERCENT", rationale };
}

export function resolveWedgeSpeedArchitectureVerdictV1(args: {
  ratio: WedgeSpeedRatioClassV1;
  core_contract_change_count: number;
}): WedgeSpeedArchitectureVerdictV1 {
  if (args.core_contract_change_count > 0) return "DOMAIN_SPECIFIC_SIGNAL";
  if (args.ratio === "UNKNOWN") return "INCONCLUSIVE";
  if (args.ratio === "UNDER_20_PERCENT" || args.ratio === "TWENTY_TO_FIFTY_PERCENT") {
    return "REUSABLE_ARCHITECTURE_SIGNAL";
  }
  if (args.ratio === "FIFTY_TO_EIGHTY_PERCENT") return "INCONCLUSIVE";
  return "DOMAIN_SPECIFIC_SIGNAL";
}

function fastestProvingSlice(wedge: WedgeSpeedTestCandidateWedgeV1): string {
  if (wedge === HOMEKEEP_WEDGE_CATALOG.humidifier) {
    return "Read-only: project one humidifier sample slug through buildHumidifierCoverageFactoryReferenceProjectionV1 + capture browser-truth read-only packet for a single OEM filter row — no committed CSV, no public opening, no core UCF enum changes.";
  }
  if (wedge === HOMEKEEP_WEDGE_CATALOG.vacuum) {
    return "Read-only: run vacuum_bags_oem_research_evidence_packet_v1 for one FIRST_SEED_BRANDS_V1 brand and reconcile output against vacuum_coverage_factory_reference_adapter_v1 dispositions — no inventory CSV apply.";
  }
  return "Read-only: project one appliance-air sample slug through buildApplianceAirCoverageFactoryReferenceProjectionV1 and document adapter-only contract fit gaps — no parts taxonomy core changes.";
}

export function buildWedgeSpeedTestReportV1(args: BuildWedgeSpeedTestDepsV1): WedgeSpeedTestReportV1 {
  const now = args.now ?? (() => new Date());
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;

  const pkg = JSON.parse(readText(path.join(args.rootDir, "package.json"))) as {
    scripts: Record<string, string>;
  };

  const candidate_scores = scoreWedgeSpeedTestCandidatesV1({
    rootDir: args.rootDir,
    fileExists,
  });
  const { wedge: selected_wedge, reasons: selection_reasons } =
    selectWedgeForSpeedTestV1(candidate_scores);

  const readiness = buildPublicWedgeReadinessAndEasiestWinsV1({
    rootDir: args.rootDir,
    now,
  });
  const spineMatrix = buildWedgeTruthSpineCoverageMatrixV1({ rootDir: args.rootDir, now });
  const census =
    args.census ?? buildAllProductSafeBuyerPathCensusV1({ rootDir: args.rootDir, now });

  const readinessRow = readiness.wedge_rows.find((r) => r.wedge === selected_wedge);
  const spineRow = spineMatrix.wedges.find((r) => r.wedge === selected_wedge);

  const inventory = buildInventory({
    rootDir: args.rootDir,
    wedge: selected_wedge,
    readiness: readinessRow,
    spine: spineRow,
    census,
    fileExists,
    pkg: pkg.scripts,
  });

  const capability_rows = classifyCapabilities({
    wedge: selected_wedge,
    inventory,
    readiness: readinessRow,
    spine: spineRow,
  });

  const core_contract_change_count = capability_rows.filter(
    (r) => r.candidate_status === "NEEDS_CORE_CONTRACT_CHANGE",
  ).length;

  const blockers = capability_rows
    .filter(
      (r) =>
        r.candidate_status !== "ALREADY_EXISTS" && r.candidate_status !== "UNKNOWN",
    )
    .map((r) => `${r.capability_id}: ${r.candidate_status} — ${r.label}`);

  const { ratio: wedge_speed_ratio_estimate, rationale: wedge_speed_ratio_rationale } =
    estimateWedgeSpeedRatioV1({ capability_rows });

  const architecture_verdict = resolveWedgeSpeedArchitectureVerdictV1({
    ratio: wedge_speed_ratio_estimate,
    core_contract_change_count,
  });

  const reused = capability_rows
    .filter((r) => r.candidate_status === "ALREADY_EXISTS")
    .map((r) => r.capability_id);
  const stillRequired = capability_rows
    .filter((r) => r.candidate_status !== "ALREADY_EXISTS")
    .map((r) => `${r.capability_id}:${r.candidate_status}`);

  return {
    contract: WEDGE_SPEED_TEST_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    artifact_write_authorized: false,
    supabase_writes: false,
    source_command: WEDGE_SPEED_TEST_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    falsification_claim: WEDGE_SPEED_TEST_FALSIFICATION_CLAIM_V1,
    candidate_scores,
    selected_wedge,
    selection_reasons,
    inventory,
    capability_rows,
    reuse_map: {
      fridge_ap_capabilities_already_reused: reused,
      candidate_capabilities_still_required: stillRequired,
    },
    blockers,
    core_contract_change_count,
    wedge_speed_ratio_estimate,
    wedge_speed_ratio_rationale,
    architecture_verdict,
    fastest_proving_implementation_slice: fastestProvingSlice(selected_wedge),
    proven_facts: [
      "PROVEN: read_only=true data_mutation=false mutation_authorized=false supabase_writes=false",
      `PROVEN: selected_wedge=${selected_wedge}`,
      `PROVEN: csv_data_source=${inventory.data_source}`,
      `PROVEN: vertical_launch_state=${getVerticalLaunchState(VERTICAL_BY_WEDGE[selected_wedge])}`,
      `PROVEN: core_contract_change_count=${core_contract_change_count}`,
      `PROVEN: adapter_id=${inventory.adapter_id ?? "missing"}`,
    ],
    inferred_facts: [
      `INFERRED: wedge_speed_ratio_estimate=${wedge_speed_ratio_estimate} from weighted capability gap classes (not hours).`,
      `INFERRED: architecture_verdict=${architecture_verdict}.`,
      VERTICAL_SLUGS_WITH_APP_SEGMENT_LAYOUT.includes(VERTICAL_BY_WEDGE[selected_wedge])
        ? "INFERRED: candidate uses shared vertical app-segment layout (NOINDEX_UNPROVEN policy)."
        : "INFERRED: launch policy unknown for candidate vertical.",
    ],
    unknown_facts: [
      "UNKNOWN: Actual calendar time to reach fridge/AP maturity — experiment uses relative capability classes only.",
      "UNKNOWN: Live Supabase parity requirements for candidate wedge before public opening.",
      readinessRow?.safe_cta_count === "UNKNOWN"
        ? "UNKNOWN: committed safe CTA count for candidate wedge."
        : `UNKNOWN: n/a safe_cta_count=${String(readinessRow?.safe_cta_count)}`,
    ],
  };
}
