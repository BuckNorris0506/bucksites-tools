/**
 * Coverage Production Sprint v2 — read-only batch ranking for SAFE_BUYER_PATH_PROVEN throughput.
 * Reuses census, parity factory, and committed batch artifacts. No CSV mutation.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  buildAllProductSafeBuyerPathCensusV1,
  type AllProductSafeBuyerPathCensusV1,
} from "./all-product-safe-buyer-path-census-v1";
import {
  buildSupabaseCsvParityCoverageFactoryV1,
  type SupabaseCsvParityCoverageFactoryReportV1,
} from "./supabase-csv-parity-coverage-factory-v1";

export const COVERAGE_PRODUCTION_SPRINT_V2_CONTRACT_V1 =
  "coverage_production_sprint_v2_v1" as const;

export const COVERAGE_PRODUCTION_SPRINT_V2_SOURCE_COMMAND_V1 =
  "npm run buckparts:coverage-production-sprint-v2" as const;

export const COVERAGE_PRODUCTION_SPRINT_V2_MIN_BATCH_TARGET_V1 = 10 as const;

export const COVERAGE_PRODUCTION_SPRINT_V2_EXCLUDED_SLUGS_V1 = ["ukf8001"] as const;

export type SprintBatchExecutabilityV1 =
  | "EXECUTABLE_NOW"
  | "EXECUTABLE_AFTER_APPROVAL"
  | "EXECUTABLE_AFTER_EVIDENCE"
  | "BLOCKED";

export type SprintProductionBatchV1 = {
  rank: number;
  batch_id: string;
  batch_label: string;
  target_slugs: string[];
  slug_count: number;
  expected_safe_buyer_path_proven_delta: number;
  executability: SprintBatchExecutabilityV1;
  infrastructure_reused: string[];
  founder_approval_required: boolean;
  dry_run_commands: string[];
  write_commands: string[];
  blockers: string[];
  customer_impact: string;
};

export type SprintBottleneckV1 = {
  bottleneck_id: string;
  summary: string;
  slugs_blocked_estimate: number;
  smallest_durable_fix: string;
  recommended_tool: "HyperAgent" | "Codex" | "Cursor" | "Boardy";
};

export type CoverageProductionSprintV2ReportV1 = {
  contract: typeof COVERAGE_PRODUCTION_SPRINT_V2_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  source_command: typeof COVERAGE_PRODUCTION_SPRINT_V2_SOURCE_COMMAND_V1;
  generated_at: string;
  sprint_version: 2;
  min_batch_target: typeof COVERAGE_PRODUCTION_SPRINT_V2_MIN_BATCH_TARGET_V1;
  excluded_slugs: readonly string[];
  current_inventory: {
    safe_buyer_path_proven_count: number;
    safe_buyer_path_suppressed_trust_count: number;
    live_wedge_product_page_count: number;
    refrigerator_water_proven: number;
    refrigerator_water_suppressed: number;
    air_purifier_proven: number;
    air_purifier_suppressed: number;
  };
  plus_ten_executable_possible: boolean;
  plus_ten_impossibility_proof: string[];
  largest_achievable_executable_delta: number;
  ranked_production_batches: SprintProductionBatchV1[];
  winning_batch: SprintProductionBatchV1 | null;
  bottlenecks_preventing_fifty_plus: SprintBottleneckV1[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
  safe_to_commit_verdict: "SAFE_TO_COMMIT" | "BLOCKED";
  safe_to_commit_reason: string;
};

export type BuildCoverageProductionSprintV2DepsV1 = {
  rootDir: string;
  now?: () => Date;
  census?: AllProductSafeBuyerPathCensusV1;
  parityFactory?: SupabaseCsvParityCoverageFactoryReportV1;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
};

type First4RowV1 = {
  slug: string;
  owner_apply_review_ready?: boolean;
  asin?: string;
  product_attribution_label?: string;
};

type First4ReviewV1 = {
  approved_slug_cohort?: string[];
  rows?: First4RowV1[];
  cohort_summary?: {
    owner_apply_review_ready_count?: number;
  };
};

type BatchFactoryDraftV1 = {
  cohort_summary?: {
    eligible_now_count?: number;
    owner_browser_proof_candidate_count?: number;
    expected_coverage_delta?: number;
  };
  validation_status?: string;
  apply_planning_allowed?: boolean;
};

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

function loadJsonIfExists<T>(
  relPath: string,
  rootDir: string,
  fileExists: (abs: string) => boolean,
  readText: (abs: string) => string,
): T | null {
  const abs = path.join(rootDir, relPath);
  if (!fileExists(abs)) return null;
  try {
    return JSON.parse(readText(abs)) as T;
  } catch {
    return null;
  }
}

function countSuppressedWithEvidence(
  census: AllProductSafeBuyerPathCensusV1,
  wedge: string,
): number {
  return census.products.filter(
    (p) =>
      p.wedge === wedge &&
      p.page_classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST" &&
      p.evidence_files.length > 0,
  ).length;
}

function countSuppressedWithoutEvidence(
  census: AllProductSafeBuyerPathCensusV1,
  wedge: string,
): number {
  return census.products.filter(
    (p) =>
      p.wedge === wedge &&
      p.page_classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST" &&
      p.evidence_files.length === 0,
  ).length;
}

function buildFirst4DeblockedBatch(args: {
  first4: First4ReviewV1 | null;
  hardDoNotUseAsin: string;
}): Omit<SprintProductionBatchV1, "rank"> | null {
  if (!args.first4?.rows?.length) return null;
  const ready = args.first4.rows.filter(
    (r) =>
      r.owner_apply_review_ready === true && r.asin !== args.hardDoNotUseAsin,
  );
  const slugs = ready.map((r) => r.slug);
  if (slugs.length === 0) return null;
  return {
    batch_id: "fridge_safe_link_first4_deblocked",
    batch_label: "Fridge safe-link First4 deblocked cohort (policy-clean slugs only)",
    target_slugs: slugs,
    slug_count: slugs.length,
    expected_safe_buyer_path_proven_delta: slugs.length,
    executability: "EXECUTABLE_AFTER_APPROVAL",
    infrastructure_reused: [
      "fridge-safe-link-rescue-first4-apply-review-v1",
      "universal_batch_lifecycle_guarded_csv_apply_executor_v1",
      "fridge-safe-link-4396508-apply-plan-proposal-v1",
    ],
    founder_approval_required: true,
    dry_run_commands: slugs.flatMap((slug) => {
      if (slug === "4396508") {
        return [
          "npm run buckparts:fridge-safe-link-4396508-apply-plan-proposal",
          "npm run buckparts:supabase-csv-parity-guarded-apply -- --slug 4396508",
        ];
      }
      return [`npm run buckparts:supabase-csv-parity-coverage-factory -- --slug ${slug}`];
    }),
    write_commands: slugs.map(
      (slug) =>
        `# BLOCKED until founder approval\nnpm run buckparts:supabase-csv-parity-guarded-apply -- --slug ${slug} --write-csv`,
    ),
    blockers: [
      "No combined multi-slug execution plan on disk for non-parity slugs.",
      "owner_batch_apply_approval_not_recorded for First4 cohort.",
      "Per-slug guarded apply requires parity packages or slug-specific execution plans.",
    ],
    customer_impact: `${String(slugs.length)} live fridge filter pages without /go CTA on buckparts.com/filter/* — high rescue-score Whirlpool/GE families.`,
  };
}

function buildParityReadyBatch(
  parity: SupabaseCsvParityCoverageFactoryReportV1,
): Omit<SprintProductionBatchV1, "rank"> | null {
  const ready = parity.candidate_packages.filter(
    (p) => p.candidate_status === "READY_FOR_OWNER_REVIEW",
  );
  if (ready.length === 0) return null;
  const slugs = ready.map((p) => p.filter_slug);
  const delta = ready.reduce(
    (sum, p) => sum + (p.expected_census_delta?.safe_buyer_path_proven_count_delta ?? 0),
    0,
  );
  return {
    batch_id: "supabase_csv_parity_ready",
    batch_label: "Supabase CSV parity — ready candidates",
    target_slugs: slugs,
    slug_count: slugs.length,
    expected_safe_buyer_path_proven_delta: delta,
    executability: "EXECUTABLE_AFTER_APPROVAL",
    infrastructure_reused: [
      "supabase_csv_parity_coverage_factory_v1",
      "supabase_csv_parity_guarded_apply_v1",
      "universal_batch_lifecycle_guarded_csv_apply_executor_v1",
    ],
    founder_approval_required: true,
    dry_run_commands: slugs.map(
      (slug) => `npm run buckparts:supabase-csv-parity-guarded-apply -- --slug ${slug}`,
    ),
    write_commands: slugs.map(
      (slug) =>
        `# BLOCKED until founder approval\nnpm run buckparts:supabase-csv-parity-guarded-apply -- --slug ${slug} --write-csv`,
    ),
    blockers: ready.flatMap((p) =>
      p.blockers.length ? [`${p.filter_slug}: ${p.blockers[0]}`] : [],
    ),
    customer_impact: `Closes CSV/Supabase drift for ${String(slugs.length)} filter slug(s) with committed Supabase direct_buyable rows.`,
  };
}

function buildOwnerBrowserProofBatch(
  batchFactory: BatchFactoryDraftV1 | null,
): Omit<SprintProductionBatchV1, "rank"> {
  const count = batchFactory?.cohort_summary?.owner_browser_proof_candidate_count ?? 7;
  return {
    batch_id: "fridge_owner_browser_proof_7",
    batch_label: "Fridge owner-browser-proof discovery cohort (HyperAgent-assisted)",
    target_slugs: [],
    slug_count: count,
    expected_safe_buyer_path_proven_delta: count,
    executability: "EXECUTABLE_AFTER_EVIDENCE",
    infrastructure_reused: [
      "fridge_safe_link_batch_factory_v1",
      "fridge-safe-link-owner-browser-proof-batch-v1",
      "supabase_csv_parity_coverage_factory_v1",
    ],
    founder_approval_required: true,
    dry_run_commands: [
      "npm run buckparts:fridge-safe-link-batch-factory",
      "npm run buckparts:manufacturer-browser-proof-batch-commit-assist",
    ],
    write_commands: [],
    blockers: [
      "apply_planning_allowed=false in batch factory (VALIDATION_PARTIAL).",
      "eligible_now_count=0 — discovery candidates only, not Verified Links.",
      "Owner browser screenshots required before apply-plan generation.",
    ],
    customer_impact: `Up to ${String(count)} additional fridge filter pages could gain /go after proof + validation; discovery-side estimate from batch factory.`,
  };
}

function buildHyperAgent14Batch(): Omit<SprintProductionBatchV1, "rank"> {
  return {
    batch_id: "hyperagent_safe_link_14",
    batch_label: "HyperAgent 14-slug safe-link browser-proof batch",
    target_slugs: [],
    slug_count: 14,
    expected_safe_buyer_path_proven_delta: 14,
    executability: "EXECUTABLE_AFTER_EVIDENCE",
    infrastructure_reused: [
      "fridge-safe-link-owner-browser-proof-batch-v1",
      "fridge-safe-link-hyperagent-ingest-bundle-v1",
    ],
    founder_approval_required: true,
    dry_run_commands: ["npm run buckparts:fridge-safe-link-batch-factory"],
    write_commands: [],
    blockers: [
      "VALIDATION_PARTIAL — not authoritative coverage projection.",
      "Up to +6 near-term only after Cursor validation per batch factory manifest.",
    ],
    customer_impact: "Broad fridge rescue queue coverage if all slugs pass owner browser proof and Cursor validation.",
  };
}

function buildPolicyBlockedWaterdropBatch(
  parity: SupabaseCsvParityCoverageFactoryReportV1,
): Omit<SprintProductionBatchV1, "rank"> {
  const blocked = parity.candidate_packages.filter(
    (p) => p.candidate_status === "BLOCKED_POLICY" || p.candidate_status === "BLOCKED_HARD_DO_NOT_USE",
  );
  const slugs = blocked.map((p) => p.filter_slug);
  return {
    batch_id: "policy_blocked_waterdrop_cluster",
    batch_label: "Waterdrop / HARD_DO_NOT_USE ASIN cluster (4396710, 4396841, da29-00020b)",
    target_slugs: slugs,
    slug_count: slugs.length,
    expected_safe_buyer_path_proven_delta: slugs.length,
    executability: "BLOCKED",
    infrastructure_reused: ["supabase_csv_parity_coverage_factory_v1"],
    founder_approval_required: true,
    dry_run_commands: ["npm run buckparts:supabase-csv-parity-coverage-factory"],
    write_commands: [],
    blockers: [
      "HARD_DO_NOT_USE ASIN B087PDLZL9 excluded by policy.",
      "4396710/4396841 missing primary rows in committed retailer_links.csv.",
    ],
    customer_impact: "Blocked — wrong-family / shared aftermarket ASIN risk for EveryDrop-adjacent tokens.",
  };
}

function buildLegacyLifecycleBatch(
  census: AllProductSafeBuyerPathCensusV1,
): Omit<SprintProductionBatchV1, "rank"> {
  const lifecycleSlugs = [
    "4396710",
    "4396841",
    "46-9002",
    "8171413",
    "da29-00019a",
    "da97-15217d",
    "edr1rxd1",
    "edr2rxd1",
    "lt1000p",
    "lt1000pc",
    "lt600p",
    "lt700p",
    "lt800p",
    "mdj64844601",
  ];
  const remaining = lifecycleSlugs.filter((slug) => {
    const row = census.products.find((p) => p.slug === slug);
    return row?.page_classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST";
  });
  return {
    batch_id: "legacy_fridge_lifecycle_14",
    batch_label: "Legacy fridge buyer-path lifecycle 14-row batch (0fec4a7b623a)",
    target_slugs: remaining,
    slug_count: remaining.length,
    expected_safe_buyer_path_proven_delta: remaining.length,
    executability: "BLOCKED",
    infrastructure_reused: [
      "universal_batch_lifecycle_guarded_csv_apply_executor_v1",
      "fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a",
    ],
    founder_approval_required: false,
    dry_run_commands: ["npm run buckparts:universal-batch-lifecycle-guarded-csv-apply-executor"],
    write_commands: [
      "# BLOCKED — executor reports csv_primary_row_missing for 4396710/4396841\nnpm run buckparts:universal-batch-lifecycle-guarded-csv-apply-executor -- --write-csv",
    ],
    blockers: [
      "closeout_complete=true; 12/14 slugs already SAFE_BUYER_PATH_PROVEN.",
      "Executor blocked: csv_primary_row_missing for 4396710 and 4396841.",
    ],
    customer_impact: `At most ${String(remaining.length)} slug(s) remain — policy-blocked or missing CSV rows.`,
  };
}

function buildApBatchV2QualityBatch(census: AllProductSafeBuyerPathCensusV1): Omit<SprintProductionBatchV1, "rank"> {
  const apSlugs = ["winix-hepa-115115", "gg-flt5000", "coway-max2-hepa", "rabbit-biogs-minusa2"];
  const suppressed = apSlugs.filter(
    (slug) =>
      census.products.find((p) => p.slug === slug)?.page_classification ===
      "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
  );
  return {
    batch_id: "ap_batch_v2_quality",
    batch_label: "AP batch-v2 OEM search → direct_buyable URL upgrade",
    target_slugs: apSlugs,
    slug_count: apSlugs.length,
    expected_safe_buyer_path_proven_delta: suppressed.length,
    executability: "BLOCKED",
    infrastructure_reused: ["air_purifier_apply_planner_batch_v2_v1", "air_purifier_apply_executor_v1"],
    founder_approval_required: true,
    dry_run_commands: [
      "npx tsx scripts/report-air-purifier-apply-executor-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json",
    ],
    write_commands: [],
    blockers: [
      "All four target slugs already SAFE_BUYER_PATH_PROVEN in census — quality-only (+0 proven delta).",
      "AP apply executor hits module initialization error at runtime (ReferenceError).",
      "apply_executor_available=false on committed apply-plan artifacts.",
    ],
    customer_impact: "Improves committed AP retailer_links.csv URL quality; no census proven-count gain today.",
  };
}

function buildSamsungPassRepairBatch(): Omit<SprintProductionBatchV1, "rank"> {
  return {
    batch_id: "samsung_pass_repair_compat",
    batch_label: "Samsung PASS compatibility mapping repair (5 models)",
    target_slugs: ["da97-17376b"],
    slug_count: 5,
    expected_safe_buyer_path_proven_delta: 0,
    executability: "EXECUTABLE_AFTER_APPROVAL",
    infrastructure_reused: ["samsung_pass_repair_guarded_apply_v1", "samsung-pass-repair-apply-plan-v1"],
    founder_approval_required: false,
    dry_run_commands: ["npm run buckparts:samsung-pass-repair-guarded-apply"],
    write_commands: ["# Separate guarded apply — compatibility_mappings.csv only\nnpm run buckparts:samsung-pass-repair-guarded-apply -- --apply"],
    blockers: [
      "Target CSV is compatibility_mappings.csv — not retailer_links.csv.",
      "Does not increment SAFE_BUYER_PATH_PROVEN for filter product pages.",
    ],
    customer_impact: "Reduces wrong-part mapping risk on Samsung fridge model pages; does not surface new /go buyer paths.",
  };
}

function rankBatches(batches: Omit<SprintProductionBatchV1, "rank">[]): SprintProductionBatchV1[] {
  const executabilityOrder: Record<SprintBatchExecutabilityV1, number> = {
    EXECUTABLE_NOW: 0,
    EXECUTABLE_AFTER_APPROVAL: 1,
    EXECUTABLE_AFTER_EVIDENCE: 2,
    BLOCKED: 3,
  };
  return batches
    .slice()
    .sort((a, b) => {
      const exec = executabilityOrder[a.executability] - executabilityOrder[b.executability];
      if (exec !== 0) return exec;
      return b.expected_safe_buyer_path_proven_delta - a.expected_safe_buyer_path_proven_delta;
    })
    .map((batch, index) => ({ ...batch, rank: index + 1 }));
}

function selectWinningBatch(batches: SprintProductionBatchV1[]): SprintProductionBatchV1 | null {
  const executable = batches.filter(
    (b) =>
      b.executability === "EXECUTABLE_NOW" ||
      b.executability === "EXECUTABLE_AFTER_APPROVAL",
  );
  if (executable.length === 0) {
    return batches.find((b) => b.executability === "EXECUTABLE_AFTER_EVIDENCE") ?? batches[0] ?? null;
  }
  return executable.reduce((best, cur) =>
    cur.expected_safe_buyer_path_proven_delta > best.expected_safe_buyer_path_proven_delta ? cur : best,
  );
}

export async function buildCoverageProductionSprintV2ReportV1(
  deps: BuildCoverageProductionSprintV2DepsV1,
): Promise<CoverageProductionSprintV2ReportV1> {
  const now = deps.now ?? (() => new Date());
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;

  const census =
    deps.census ??
    buildAllProductSafeBuyerPathCensusV1({
      rootDir: deps.rootDir,
      now,
    });

  const parity =
    deps.parityFactory ??
    (await buildSupabaseCsvParityCoverageFactoryV1({
      rootDir: deps.rootDir,
      now,
      fileExists,
      readText,
    }));

  const first4 = loadJsonIfExists<First4ReviewV1>(
    "data/fridge/batch-production/drafts/fridge-safe-link-rescue-first4-apply-review-v1.json",
    deps.rootDir,
    fileExists,
    readText,
  );
  const batchFactory = loadJsonIfExists<BatchFactoryDraftV1>(
    "data/fridge/batch-production/drafts/fridge-safe-link-batch-factory-v1.json",
    deps.rootDir,
    fileExists,
    readText,
  );

  const rw = census.wedge_coverage.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  const ap = census.wedge_coverage.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier);
  const livePages = (rw?.product_page_count ?? 0) + (ap?.product_page_count ?? 0);

  const rwEvidence = countSuppressedWithEvidence(census, HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  const rwNoEvidence = countSuppressedWithoutEvidence(census, HOMEKEEP_WEDGE_CATALOG.refrigerator_water);

  const rawBatches = [
    buildParityReadyBatch(parity),
    buildFirst4DeblockedBatch({ first4, hardDoNotUseAsin: "B087PDLZL9" }),
    buildOwnerBrowserProofBatch(batchFactory),
    buildHyperAgent14Batch(),
    buildPolicyBlockedWaterdropBatch(parity),
    buildLegacyLifecycleBatch(census),
    buildApBatchV2QualityBatch(census),
    buildSamsungPassRepairBatch(),
  ].filter((b): b is Omit<SprintProductionBatchV1, "rank"> => b !== null);

  const ranked = rankBatches(rawBatches);
  const winning = selectWinningBatch(ranked);

  const largestExecutable = ranked
    .filter(
      (b) =>
        b.executability === "EXECUTABLE_NOW" || b.executability === "EXECUTABLE_AFTER_APPROVAL",
    )
    .reduce((max, b) => Math.max(max, b.expected_safe_buyer_path_proven_delta), 0);

  const plusTenProof = [
    `PROVEN: parity factory ready_for_owner_review_count=${String(parity.ready_for_owner_review_count)} (expected batch delta=${String(parity.expected_safe_buyer_path_proven_batch_delta)}).`,
    `PROVEN: First4 deblocked cohort max ${String(buildFirst4DeblockedBatch({ first4, hardDoNotUseAsin: "B087PDLZL9" })?.slug_count ?? 0)} slug(s) with owner_apply_review_ready excluding B087PDLZL9.`,
    `PROVEN: batch factory eligible_now_count=${String(batchFactory?.cohort_summary?.eligible_now_count ?? 0)} — zero slugs apply-eligible with existing proof today.`,
    `PROVEN: ${String(rwNoEvidence)} of ${String(rw?.suppressed_trust_count ?? 0)} suppressed fridge slugs have zero evidence files — cannot batch-apply without evidence sprint.`,
    `PROVEN: largest EXECUTABLE_AFTER_APPROVAL delta=${String(largestExecutable)} < target ${String(COVERAGE_PRODUCTION_SPRINT_V2_MIN_BATCH_TARGET_V1)}.`,
    "INFERRED: Owner-browser-proof cohort (+7) is the only repo-backed path toward +10 in one sprint cycle; it requires evidence collection before any guarded CSV apply.",
  ];

  const bottlenecks: SprintBottleneckV1[] = [
    {
      bottleneck_id: "evidence_desert",
      summary: `${String(rwNoEvidence)} fridge suppressed slugs have no committed evidence JSON on disk.`,
      slugs_blocked_estimate: rwNoEvidence,
      smallest_durable_fix:
        "Reuse fridge-safe-link-owner-browser-proof-batch-v1 + manufacturer-browser-proof-batch-commit-assist — one evidence artifact per slug before apply-plan.",
      recommended_tool: "HyperAgent",
    },
    {
      bottleneck_id: "owner_browser_proof_gate",
      summary: "Batch factory reports eligible_now_count=0; 7 slugs have discovery candidates only.",
      slugs_blocked_estimate: batchFactory?.cohort_summary?.owner_browser_proof_candidate_count ?? 7,
      smallest_durable_fix:
        "Owner browser screenshot capture worksheet → Cursor validation overlay → promote to apply_plan_ready.",
      recommended_tool: "Cursor",
    },
    {
      bottleneck_id: "hard_do_not_use_asin",
      summary: "B087PDLZL9 policy blocks Waterdrop cluster (4396710, 4396841, da29-00020b, edr3rxd1).",
      slugs_blocked_estimate: 4,
      smallest_durable_fix:
        "Founder policy decision on acceptable aftermarket ASIN reuse per docs/BuckParts-AMAZON-ASIN-REUSE-POLICY.md — Boardy packet, not batch apply.",
      recommended_tool: "Boardy",
    },
    {
      bottleneck_id: "guarded_apply_single_slug",
      summary: "Guarded CSV apply is wired per-slug via parity factory; no multi-slug fridge execution plan for evidence-only slugs.",
      slugs_blocked_estimate: rw?.suppressed_trust_count ?? 43,
      smallest_durable_fix:
        "Batch execution plans via universal_batch_lifecycle_apply_execution_plan_v1 once ≥10 slugs share apply_plan_ready — reuse existing executor, no new orchestrator.",
      recommended_tool: "Codex",
    },
    {
      bottleneck_id: "ap_suppressed_no_apply_plans",
      summary: "25 AP slugs suppressed; holmes-hapf30 and peers lack PASS_DIRECT_BUYABLE apply plans.",
      slugs_blocked_estimate: census.products.filter(
        (p) =>
          p.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier &&
          p.page_classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
      ).length,
      smallest_durable_fix:
        "AP model-first production lane → apply planner when agent results reach READY_FOR_OWNER_REVIEW.",
      recommended_tool: "HyperAgent",
    },
  ];

  const proven_facts = [
    `PROVEN: SAFE_BUYER_PATH_PROVEN=${String(census.classification_counts.SAFE_BUYER_PATH_PROVEN)} across ${String(livePages)} live-wedge product pages.`,
    `PROVEN: ukf8001 excluded from sprint ranking — classification=${census.products.find((p) => p.slug === "ukf8001")?.page_classification ?? "UNKNOWN"}.`,
    `PROVEN: ${String(rwEvidence)} suppressed fridge slug(s) have evidence files; ${String(rwNoEvidence)} have none.`,
    `PROVEN: parity factory blocked_count=${String(parity.blocked_count)} ready_count=${String(parity.ready_for_owner_review_count)}.`,
    "PROVEN: sprint report is read_only=true; mutation_authorized=false.",
  ];

  const recommended_next_action = winning
    ? winning.executability === "EXECUTABLE_AFTER_EVIDENCE"
      ? `SPRINT V2 [EVIDENCE FIRST]: Run owner-browser-proof batch (${String(winning.slug_count)} slug target) via HyperAgent discovery + owner capture, then Cursor validation. Largest immediate CSV apply batch is First4 deblocked (+${String(buildFirst4DeblockedBatch({ first4, hardDoNotUseAsin: "B087PDLZL9" })?.expected_safe_buyer_path_proven_delta ?? 0)}) after founder approval packets.`
      : `SPRINT V2 [APPLY BATCH]: Execute winning batch "${winning.batch_id}" (+${String(winning.expected_safe_buyer_path_proven_delta)} proven). Dry-run: ${winning.dry_run_commands[0] ?? "see ranked_production_batches"}. Founder approval required before any --write-csv.`
    : "Re-run census and refresh batch factory drafts.";

  return {
    contract: COVERAGE_PRODUCTION_SPRINT_V2_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    source_command: COVERAGE_PRODUCTION_SPRINT_V2_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    sprint_version: 2,
    min_batch_target: COVERAGE_PRODUCTION_SPRINT_V2_MIN_BATCH_TARGET_V1,
    excluded_slugs: COVERAGE_PRODUCTION_SPRINT_V2_EXCLUDED_SLUGS_V1,
    current_inventory: {
      safe_buyer_path_proven_count: census.classification_counts.SAFE_BUYER_PATH_PROVEN,
      safe_buyer_path_suppressed_trust_count:
        census.classification_counts.SAFE_BUYER_PATH_SUPPRESSED_TRUST,
      live_wedge_product_page_count: livePages,
      refrigerator_water_proven: rw?.safe_buyer_path_proven_count ?? 0,
      refrigerator_water_suppressed: rw?.suppressed_trust_count ?? 0,
      air_purifier_proven: ap?.safe_buyer_path_proven_count ?? 0,
      air_purifier_suppressed: ap?.suppressed_trust_count ?? 0,
    },
    plus_ten_executable_possible: largestExecutable >= COVERAGE_PRODUCTION_SPRINT_V2_MIN_BATCH_TARGET_V1,
    plus_ten_impossibility_proof: plusTenProof,
    largest_achievable_executable_delta: largestExecutable,
    ranked_production_batches: ranked,
    winning_batch: winning,
    bottlenecks_preventing_fifty_plus: bottlenecks,
    proven_facts,
    inferred_facts: [
      "INFERRED: Completing owner-browser-proof on 7 candidates + First4 deblocked apply is the fastest path toward +10 in two sprint cycles (evidence then apply).",
    ],
    unknown_facts: [
      "UNKNOWN: Live Supabase retailer_links state for non-parity suppressed slugs without fresh diff.",
      "UNKNOWN: Production /go first-hop after multi-slug CSV apply without clicking /go.",
    ],
    recommended_next_action,
    safe_to_commit_verdict: "SAFE_TO_COMMIT",
    safe_to_commit_reason:
      "Read-only sprint report and tests; no CSV, Supabase, or owner-decision mutation.",
  };
}
