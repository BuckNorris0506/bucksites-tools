import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import type { AllProductCensusProductRowV1 } from "./all-product-safe-buyer-path-census-v1";
import {
  buildReferenceabilityPageContextV1,
  detectReferenceabilityGapsV1,
  filterGapsForEligibilityV1,
  isLiveTemplateRecommendationBlockedV1,
  validateReferenceabilityRecommendationFiveFieldSchemaV1,
} from "./referenceability-factory-gap-detectors-v1";
import { buildReferenceabilityPagePacketV1 } from "./referenceability-factory-page-packet-v1";
import {
  REFERENCEABILITY_FACTORY_CONTRACT_V1,
  REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1,
  buildMarketingRiskIndexFromOpportunitiesV1,
  buildReferenceabilityFactoryRunV1,
} from "./referenceability-factory-run-v1";

const REPO_ROOT = process.cwd();

function censusRow(
  overrides: Partial<AllProductCensusProductRowV1> & Pick<AllProductCensusProductRowV1, "slug" | "wedge">,
): AllProductCensusProductRowV1 {
  return {
    slug: overrides.slug,
    wedge: overrides.wedge,
    vertical_launch_state: overrides.vertical_launch_state ?? "LIVE",
    page_classification: overrides.page_classification ?? "SAFE_BUYER_PATH_PROVEN",
    indexable_in_repo_policy: overrides.indexable_in_repo_policy ?? true,
    public_route:
      overrides.public_route ??
      (overrides.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier
        ? `/air-purifier/filter/${overrides.slug}`
        : `/filter/${overrides.slug}`),
    current_page_state: overrides.current_page_state ?? "show_buy",
    retailer_row_state: overrides.retailer_row_state ?? "direct_buyable",
    evidence_files: overrides.evidence_files ?? ["amazon-slug-live-outcome.json"],
    supabase_safe_path_missing_from_csv: overrides.supabase_safe_path_missing_from_csv ?? false,
    csv_safe_path_missing_from_supabase: overrides.csv_safe_path_missing_from_supabase ?? false,
    recommended_next_safe_action: overrides.recommended_next_safe_action ?? "none",
    owner_approval_required: overrides.owner_approval_required ?? false,
    mutation_authorized: false,
    rescue_priority_score: overrides.rescue_priority_score ?? 0,
  };
}

function baseContext(
  wedge: AllProductCensusProductRowV1["wedge"],
): ReturnType<typeof buildReferenceabilityPageContextV1> {
  return buildReferenceabilityPageContextV1({
    wedge,
    slug: "test-slug",
    compat_model_count: 3,
    filter_row_present: true,
    oem_part_number: "OEM-123",
    browser_truth_checked_at: "2026-06-01T00:00:00.000Z",
    browser_truth_classification: "direct_buyable",
    page_template_source: "export default function Page() { return null; }",
    marketing_risk: null,
    ap_runtime_gate_state: wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier ? "EXPLICITLY_DIVERGED" : null,
  });
}

test("only SAFE_BUYER_PATH_PROVEN rows receive recommendations", async () => {
  const safeRow = censusRow({
    slug: "safe-slug",
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    page_classification: "SAFE_BUYER_PATH_PROVEN",
  });
  const unsafeRow = censusRow({
    slug: "unsafe-slug",
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    page_classification: "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
  });

  const census = {
    contract: "all_product_safe_buyer_path_census_v1" as const,
    read_only: true as const,
    data_mutation: false as const,
    mutation_authorized: false as const,
    recommended_jq_path: ".cc-census",
    source_command: "npm run buckparts:all-product-safe-buyer-path-census",
    generated_at: "2026-06-10T00:00:00.000Z",
    exact_repo_paths_read: [],
    wedge_coverage: [],
    classification_counts: {
      SAFE_BUYER_PATH_PROVEN: 1,
      SAFE_BUYER_PATH_SUPPRESSED_TRUST: 1,
      NO_PRODUCT_PAGE_PROVEN: 0,
      NOINDEX_UNPROVEN: 0,
      UNKNOWN: 0,
    },
    products: [safeRow, unsafeRow],
    top_20_rescue_queue: [],
    easiest_rescue_slugs: [],
    requires_owner_browser_review_slugs: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    recommended_next_action: "test",
  };

  const report = await buildReferenceabilityFactoryRunV1({
    rootDir: REPO_ROOT,
    census,
    loadMarketing: false,
    apRuntimeGate: {
      contract: "repo_runtime_convergence_gate_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      supabase_writes: false,
      generated_at: "2026-06-10T00:00:00.000Z",
      wedge: "air_purifier",
      enforce: false,
      state: "EXPLICITLY_DIVERGED",
      deploy_allowed: true,
      exit_code: 0,
      measurement: {
        wedge: "air_purifier",
        csv_safe_direct_buyable_count: 34,
        supabase_safe_direct_buyable_count: 28,
        gap_size: 6,
        supabase_truth_status: "CHECKED",
        measured_at: "2026-06-10T00:00:00.000Z",
        measurement_source: "air_purifier_supabase_vs_csv_diff_v1",
        measurement_error: null,
      },
      acceptance_artifact_path: "data/air-purifier/batch-production/audits/ap-repo-runtime-convergence-acceptance-v1.json",
      acceptance_load: { status: "loaded", artifact: {} as never },
      acceptance_validation_errors: [],
      block_reasons: [],
      proven_facts: [],
      unknown_facts: [],
    },
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  const safePacket = report.packets.find((p) => p.slug === "safe-slug");
  const unsafePacket = report.packets.find((p) => p.slug === "unsafe-slug");
  assert.ok(safePacket);
  assert.ok(unsafePacket);
  assert.ok(safePacket.recommendations.length > 0);
  assert.equal(unsafePacket.recommendations.length, 0);
  assert.equal(unsafePacket.eligibility, "SKIPPED_NOT_SAFE_PROVEN");
});

test("skipped unsafe rows produce zero recommendations in skipped_rows", async () => {
  const report = await buildReferenceabilityFactoryRunV1({
    rootDir: REPO_ROOT,
    loadMarketing: false,
    apRuntimeGate: {
      contract: "repo_runtime_convergence_gate_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      supabase_writes: false,
      generated_at: "2026-06-10T00:00:00.000Z",
      wedge: "air_purifier",
      enforce: false,
      state: "EXPLICITLY_DIVERGED",
      deploy_allowed: true,
      exit_code: 0,
      measurement: {
        wedge: "air_purifier",
        csv_safe_direct_buyable_count: 34,
        supabase_safe_direct_buyable_count: 28,
        gap_size: 6,
        supabase_truth_status: "CHECKED",
        measured_at: "2026-06-10T00:00:00.000Z",
        measurement_source: "air_purifier_supabase_vs_csv_diff_v1",
        measurement_error: null,
      },
      acceptance_artifact_path: "data/air-purifier/batch-production/audits/ap-repo-runtime-convergence-acceptance-v1.json",
      acceptance_load: { status: "loaded", artifact: {} as never },
      acceptance_validation_errors: [],
      block_reasons: [],
      proven_facts: [],
      unknown_facts: [],
    },
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  for (const skipped of report.skipped_rows) {
    assert.equal(skipped.recommendation_count, 0);
    const packet = report.packets.find((p) => p.slug === skipped.slug);
    assert.ok(packet);
    assert.equal(packet.recommendations.length, 0);
  }
});

test("every recommendation satisfies five-field schema and no content invention", async () => {
  const report = await buildReferenceabilityFactoryRunV1({
    rootDir: REPO_ROOT,
    loadMarketing: false,
    apRuntimeGate: {
      contract: "repo_runtime_convergence_gate_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      supabase_writes: false,
      generated_at: "2026-06-10T00:00:00.000Z",
      wedge: "air_purifier",
      enforce: false,
      state: "EXPLICITLY_DIVERGED",
      deploy_allowed: true,
      exit_code: 0,
      measurement: {
        wedge: "air_purifier",
        csv_safe_direct_buyable_count: 34,
        supabase_safe_direct_buyable_count: 28,
        gap_size: 6,
        supabase_truth_status: "CHECKED",
        measured_at: "2026-06-10T00:00:00.000Z",
        measurement_source: "air_purifier_supabase_vs_csv_diff_v1",
        measurement_error: null,
      },
      acceptance_artifact_path: "data/air-purifier/batch-production/audits/ap-repo-runtime-convergence-acceptance-v1.json",
      acceptance_load: { status: "loaded", artifact: {} as never },
      acceptance_validation_errors: [],
      block_reasons: [],
      proven_facts: [],
      unknown_facts: [],
    },
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  for (const rec of report.packets.flatMap((p) => p.recommendations)) {
    assert.equal(rec.content_invention_required, false);
    assert.ok(validateReferenceabilityRecommendationFiveFieldSchemaV1(rec));
  }
  for (const work of report.work_items) {
    assert.equal(work.content_invention_required, false);
    assert.equal(work.data_mutation, false);
    assert.equal(work.mutation_authorized, false);
    assert.equal(work.artifact_write_authorized, false);
  }
});

test("output is deterministic for fixed census fixture", async () => {
  const row = censusRow({
    slug: "lt1000p",
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  });
  const census = {
    contract: "all_product_safe_buyer_path_census_v1" as const,
    read_only: true as const,
    data_mutation: false as const,
    mutation_authorized: false as const,
    recommended_jq_path: ".cc-census",
    source_command: "npm run buckparts:all-product-safe-buyer-path-census",
    generated_at: "2026-06-10T00:00:00.000Z",
    exact_repo_paths_read: [],
    wedge_coverage: [],
    classification_counts: {
      SAFE_BUYER_PATH_PROVEN: 1,
      SAFE_BUYER_PATH_SUPPRESSED_TRUST: 0,
      NO_PRODUCT_PAGE_PROVEN: 0,
      NOINDEX_UNPROVEN: 0,
      UNKNOWN: 0,
    },
    products: [row],
    top_20_rescue_queue: [],
    easiest_rescue_slugs: [],
    requires_owner_browser_review_slugs: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    recommended_next_action: "test",
  };

  const fixedNow = () => new Date("2026-06-10T12:00:00.000Z");
  const gate = {
    contract: "repo_runtime_convergence_gate_v1" as const,
    read_only: true as const,
    data_mutation: false as const,
    mutation_authorized: false as const,
    supabase_writes: false as const,
    generated_at: "2026-06-10T00:00:00.000Z",
    wedge: "air_purifier" as const,
    enforce: false,
    state: "EXPLICITLY_DIVERGED" as const,
    deploy_allowed: true,
    exit_code: 0,
    measurement: {
      wedge: "air_purifier" as const,
      csv_safe_direct_buyable_count: 34,
      supabase_safe_direct_buyable_count: 28,
      gap_size: 6,
      supabase_truth_status: "CHECKED" as const,
      measured_at: "2026-06-10T00:00:00.000Z",
      measurement_source: "air_purifier_supabase_vs_csv_diff_v1" as const,
      measurement_error: null,
    },
    acceptance_artifact_path:
      "data/air-purifier/batch-production/audits/ap-repo-runtime-convergence-acceptance-v1.json" as const,
    acceptance_load: { status: "loaded" as const, artifact: {} as never },
    acceptance_validation_errors: [],
    block_reasons: [],
    proven_facts: [],
    unknown_facts: [],
  };

  const a = await buildReferenceabilityFactoryRunV1({
    rootDir: REPO_ROOT,
    census,
    loadMarketing: false,
    apRuntimeGate: gate,
    now: fixedNow,
  });
  const b = await buildReferenceabilityFactoryRunV1({
    rootDir: REPO_ROOT,
    census,
    loadMarketing: false,
    apRuntimeGate: gate,
    now: fixedNow,
  });

  assert.deepEqual(
    a.work_items.map((w) => w.work_item_id),
    b.work_items.map((w) => w.work_item_id),
  );
  assert.equal(JSON.stringify(a.packets), JSON.stringify(b.packets));
});

test("read_only and mutation flags are false on run envelope", async () => {
  const report = await buildReferenceabilityFactoryRunV1({
    rootDir: REPO_ROOT,
    loadMarketing: false,
    apRuntimeGate: {
      contract: "repo_runtime_convergence_gate_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      supabase_writes: false,
      generated_at: "2026-06-10T00:00:00.000Z",
      wedge: "air_purifier",
      enforce: false,
      state: "EXPLICITLY_DIVERGED",
      deploy_allowed: true,
      exit_code: 0,
      measurement: {
        wedge: "air_purifier",
        csv_safe_direct_buyable_count: 34,
        supabase_safe_direct_buyable_count: 28,
        gap_size: 6,
        supabase_truth_status: "CHECKED",
        measured_at: "2026-06-10T00:00:00.000Z",
        measurement_source: "air_purifier_supabase_vs_csv_diff_v1",
        measurement_error: null,
      },
      acceptance_artifact_path: "data/air-purifier/batch-production/audits/ap-repo-runtime-convergence-acceptance-v1.json",
      acceptance_load: { status: "loaded", artifact: {} as never },
      acceptance_validation_errors: [],
      block_reasons: [],
      proven_facts: [],
      unknown_facts: [],
    },
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  assert.equal(report.contract, REFERENCEABILITY_FACTORY_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.artifact_write_authorized, false);
});

test("AP runtime convergence BLOCKED blocks PAGE_TEMPLATE_WIRE recommendations", () => {
  const row = censusRow({
    slug: "ap-test",
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
  });
  const context = buildReferenceabilityPageContextV1({
    wedge: row.wedge,
    slug: row.slug,
    compat_model_count: 2,
    filter_row_present: true,
    oem_part_number: "AP-OEM",
    browser_truth_checked_at: "2026-06-01T00:00:00.000Z",
    browser_truth_classification: "direct_buyable",
    page_template_source: "clean template",
    marketing_risk: null,
    ap_runtime_gate_state: "BLOCKED",
  });

  const gaps = detectReferenceabilityGapsV1({ row, context, now: new Date("2026-06-10T12:00:00.000Z") });
  const filtered = filterGapsForEligibilityV1({ findings: gaps, row, context });
  const templateWire = filtered.filter((g) => g.permitted_action_class === "PAGE_TEMPLATE_WIRE");
  assert.equal(templateWire.length, 0);
  assert.ok(
    isLiveTemplateRecommendationBlockedV1({
      wedge: row.wedge,
      permitted_action_class: "PAGE_TEMPLATE_WIRE",
      ap_runtime_gate_state: "BLOCKED",
    }),
  );
});

test("fridge and AP scope respected — no vacuum or whole-house-water packets", async () => {
  const report = await buildReferenceabilityFactoryRunV1({
    rootDir: REPO_ROOT,
    loadMarketing: false,
    apRuntimeGate: {
      contract: "repo_runtime_convergence_gate_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      supabase_writes: false,
      generated_at: "2026-06-10T00:00:00.000Z",
      wedge: "air_purifier",
      enforce: false,
      state: "EXPLICITLY_DIVERGED",
      deploy_allowed: true,
      exit_code: 0,
      measurement: {
        wedge: "air_purifier",
        csv_safe_direct_buyable_count: 34,
        supabase_safe_direct_buyable_count: 28,
        gap_size: 6,
        supabase_truth_status: "CHECKED",
        measured_at: "2026-06-10T00:00:00.000Z",
        measurement_source: "air_purifier_supabase_vs_csv_diff_v1",
        measurement_error: null,
      },
      acceptance_artifact_path: "data/air-purifier/batch-production/audits/ap-repo-runtime-convergence-acceptance-v1.json",
      acceptance_load: { status: "loaded", artifact: {} as never },
      acceptance_validation_errors: [],
      block_reasons: [],
      proven_facts: [],
      unknown_facts: [],
    },
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  assert.deepEqual(report.scoped_wedges, REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1);
  for (const packet of report.packets) {
    assert.ok(
      packet.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier ||
        packet.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    );
  }
});

test("marketing HIGH wrong_part_risk blocks recommendations", () => {
  const row = censusRow({
    slug: "risky",
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
  });
  const context = baseContext(row.wedge);
  context.marketing_risk = { wrong_part_risk: "HIGH", publishability_status: "NEEDS_PRODUCT_PROOF" };

  const packet = buildReferenceabilityPagePacketV1({
    row,
    context,
    inScope: true,
    now: new Date("2026-06-10T12:00:00.000Z"),
  });

  assert.equal(packet.recommendations.length, 0);
  assert.equal(packet.eligibility, "SKIPPED_MARKETING_HIGH_RISK");
});

test("marketing DO_NOT_PUBLISH blocks recommendations", () => {
  const row = censusRow({
    slug: "blocked",
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
  });
  const context = baseContext(row.wedge);
  context.marketing_risk = { wrong_part_risk: "LOW", publishability_status: "DO_NOT_PUBLISH" };

  const packet = buildReferenceabilityPagePacketV1({
    row,
    context,
    inScope: true,
    now: new Date("2026-06-10T12:00:00.000Z"),
  });

  assert.equal(packet.recommendations.length, 0);
  assert.equal(packet.eligibility, "SKIPPED_DO_NOT_PUBLISH");
});

test("buildMarketingRiskIndexFromOpportunitiesV1 indexes slug evidence keys", () => {
  const index = buildMarketingRiskIndexFromOpportunitiesV1([
    {
      opportunity_id: "x",
      opportunity_class: "wrong_family_reject",
      wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
      source_truth_paths: [],
      source_status: "PROVEN",
      customer_pain: "",
      wrong_part_risk: "HIGH",
      business_reason: "",
      asset_recommendations: [],
      sarcastic_hooks: [],
      plain_english_explanation: "",
      trust_copy_angle: "",
      publishability_status: "DO_NOT_PUBLISH",
      blocked_reasons: [],
      suggested_internal_links: [],
      rank_score: 0,
      evidence_keys: ["slug:bad-slug", "state:wrong_family_reject"],
    },
  ]);
  assert.equal(index.get("bad-slug")?.wrong_part_risk, "HIGH");
  assert.equal(index.get("bad-slug")?.publishability_status, "DO_NOT_PUBLISH");
});

test("factory command runs without mutating retailer_links.csv", async () => {
  const csvBefore = readFileSync(path.join(REPO_ROOT, "data/retailer_links.csv"), "utf8");
  await buildReferenceabilityFactoryRunV1({
    rootDir: REPO_ROOT,
    loadMarketing: false,
    apRuntimeGate: {
      contract: "repo_runtime_convergence_gate_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      supabase_writes: false,
      generated_at: "2026-06-10T00:00:00.000Z",
      wedge: "air_purifier",
      enforce: false,
      state: "EXPLICITLY_DIVERGED",
      deploy_allowed: true,
      exit_code: 0,
      measurement: {
        wedge: "air_purifier",
        csv_safe_direct_buyable_count: 34,
        supabase_safe_direct_buyable_count: 28,
        gap_size: 6,
        supabase_truth_status: "CHECKED",
        measured_at: "2026-06-10T00:00:00.000Z",
        measurement_source: "air_purifier_supabase_vs_csv_diff_v1",
        measurement_error: null,
      },
      acceptance_artifact_path: "data/air-purifier/batch-production/audits/ap-repo-runtime-convergence-acceptance-v1.json",
      acceptance_load: { status: "loaded", artifact: {} as never },
      acceptance_validation_errors: [],
      block_reasons: [],
      proven_facts: [],
      unknown_facts: [],
    },
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  assert.equal(readFileSync(path.join(REPO_ROOT, "data/retailer_links.csv"), "utf8"), csvBefore);
});

test("package script exists for referenceability factory", () => {
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  assert.ok(pkg.scripts["buckparts:referenceability:factory"]);
});
