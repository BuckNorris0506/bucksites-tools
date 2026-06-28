import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { AllProductSafeBuyerPathCensusV1 } from "./all-product-safe-buyer-path-census-v1";
import type { FridgeSafeLinkBatchFactoryRowV1 } from "./fridge-safe-link-batch-factory-v1";
import {
  buildHyperagentSafeLinkEvidenceProductionDirectorReportV1,
  classifyHyperagentEvidenceBlockerTypeV1,
  computeHyperagentEvidenceGapStepsV1,
  HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_COHORT_ID_V1,
  HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_CONTRACT_V1,
  isHyperagentCohortSlugCensusProvenV1,
  rankHyperagentEvidenceQueueV1,
  selectSmallestExecutableEvidenceBatchV1,
} from "./hyperagent-safe-link-evidence-production-director-v1";

const REPO_ROOT = process.cwd();

function mockCensus(provenSlugs: string[]): AllProductSafeBuyerPathCensusV1 {
  return {
    contract: "all_product_safe_buyer_path_census_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.all_product_safe_buyer_path_census_v1",
    source_command: "npm run buckparts:all-product-safe-buyer-path-census",
    generated_at: "2026-06-10T12:00:00.000Z",
    exact_repo_paths_read: [],
    wedge_coverage: [],
    classification_counts: {
      SAFE_BUYER_PATH_PROVEN: provenSlugs.length,
      SAFE_BUYER_PATH_SUPPRESSED_TRUST: 0,
      NO_PRODUCT_PAGE_PROVEN: 0,
      NOINDEX_UNPROVEN: 0,
      UNKNOWN: 0,
    },
    products: provenSlugs.map((slug) => ({
      slug,
      wedge: "refrigerator_water" as const,
      vertical_launch_state: "LIVE" as const,
      page_classification: "SAFE_BUYER_PATH_PROVEN" as const,
      indexable_in_repo_policy: true,
      public_route: `/filter/${slug}`,
      current_page_state: "LIVE",
      retailer_row_state: "test",
      evidence_files: [],
      safe_gated_retailer_link_count: 1,
      launch_buy_links_gate_passes: true,
    })),
    top_20_rescue_queue: [],
    easiest_rescue_slugs: [],
    requires_owner_browser_review_slugs: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    recommended_next_action: "test",
  };
}

function mockFactoryRow(
  slug: string,
  overrides: Partial<FridgeSafeLinkBatchFactoryRowV1> = {},
): FridgeSafeLinkBatchFactoryRowV1 {
  return {
    slug,
    oem_part_token: slug.toUpperCase(),
    brand_slug: "test",
    live_url: `https://buckparts.com/filter/${slug}`,
    live_has_go_cta: false,
    batch_factory_state: "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF",
    state_basis: "test",
    repo_evidence_files: [],
    repo_evidence_verdict: null,
    repo_draft_proof_files: [],
    hyperagent_classification: "SAFE_CANDIDATE_FOUND",
    hyperagent_candidate_url: "https://example.com",
    hyperagent_used_for_state: false,
    proposed_candidate_url: "https://example.com",
    proposed_path_type: "official_manufacturer_spec_pdp",
    csv_safe_gated_count: 0,
    csv_primary_is_search_placeholder: true,
    launch_buy_links_gate_passes: false,
    exact_blockers: [],
    wrong_part_risk: null,
    owner_browser_proof_slug_verdict: "DISCOVERY_CANDIDATES_OK",
    owner_browser_proof_validation_overlay_applied: true,
    ...overrides,
  };
}

describe("hyperagent safe-link evidence production director v1", () => {
  test("live report contract and read-only flags", async () => {
    const report = await buildHyperagentSafeLinkEvidenceProductionDirectorReportV1({
      rootDir: REPO_ROOT,
    });
    assert.equal(report.contract, HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_CONTRACT_V1);
    assert.equal(report.read_only, true);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.guarded_apply_work_generated, false);
    assert.equal(report.active_production_cohort_id, HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_COHORT_ID_V1);
    assert.equal(report.cohort_slug_count, 14);
    assert.ok(report.excluded_proven_slugs.includes("edr4rxd1"));
    assert.equal(report.ranked_evidence_queue.length, 14 - report.excluded_proven_slugs.length);
    assert.ok(
      report.ranked_evidence_queue.every((row) => row.guarded_apply_recommended === false),
    );
    assert.ok(
      report.ranked_evidence_queue.every(
        (row) => !report.excluded_proven_slugs.includes(row.slug),
      ),
    );
  });

  test("excludes census-proven slugs from queue", () => {
    const census = mockCensus(["edr4rxd1"]);
    assert.equal(isHyperagentCohortSlugCensusProvenV1(census, "edr4rxd1"), true);
    const queue = rankHyperagentEvidenceQueueV1({
      cohortSlugs: ["edr4rxd1", "edr3rxd1"],
      excludedProvenSlugs: ["edr4rxd1"],
      census,
      factoryRows: [mockFactoryRow("edr3rxd1")],
      proofBySlug: new Map(),
      cursorBySlug: new Map(),
      rootDir: REPO_ROOT,
    });
    assert.equal(queue.length, 1);
    assert.equal(queue[0]!.slug, "edr3rxd1");
  });

  test("ranks committed-evidence slugs ahead of owner-browser-proof and blocked", () => {
    const census = mockCensus([]);
    const queue = rankHyperagentEvidenceQueueV1({
      cohortSlugs: ["edr3rxd1", "fppwfu01", "purepour"],
      excludedProvenSlugs: [],
      census,
      factoryRows: [
        mockFactoryRow("edr3rxd1"),
        mockFactoryRow("fppwfu01"),
        mockFactoryRow("purepour", { batch_factory_state: "CONFLICT_REQUIRES_RECONCILIATION" }),
      ],
      proofBySlug: new Map([
        [
          "edr3rxd1",
          {
            contract: "fridge_safe_link_owner_browser_proof_result_v1",
            slug: "edr3rxd1",
            oem_part_token: "EDR3RXD1",
            verdict: "PASS_BROWSER_PROOF",
            owner_proof_urls: [{ url: "https://example.com" }],
            not_authorized: ["VALIDATION_PASS"],
          },
        ],
      ]),
      cursorBySlug: new Map([
        ["purepour", { slug: "purepour", verdict: "BLOCKED_CONFLICT", proposed_state: "CONFLICT_REQUIRES_RECONCILIATION", batch_factory_state: "CONFLICT_REQUIRES_RECONCILIATION", reason: "conflict" }],
      ]),
      rootDir: REPO_ROOT,
    });

    assert.equal(queue[0]!.slug, "edr3rxd1");
    assert.equal(queue[0]!.blocker_type, "COMMITTED_EVIDENCE");
    assert.equal(queue[queue.length - 1]!.slug, "purepour");
    assert.equal(queue[queue.length - 1]!.blocker_type, "CONFLICT");
  });

  test("smallest batch selects committed-evidence pair when available", () => {
    const queue = rankHyperagentEvidenceQueueV1({
      cohortSlugs: ["edr3rxd1", "ultrawf"],
      excludedProvenSlugs: [],
      census: mockCensus([]),
      factoryRows: [mockFactoryRow("edr3rxd1"), mockFactoryRow("ultrawf")],
      proofBySlug: new Map([
        ["edr3rxd1", { contract: "fridge_safe_link_owner_browser_proof_result_v1", slug: "edr3rxd1", oem_part_token: "EDR3RXD1", verdict: "PASS_BROWSER_PROOF", owner_proof_urls: [{ url: "https://a.com" }], not_authorized: ["VALIDATION_PASS"] }],
        ["ultrawf", { contract: "fridge_safe_link_owner_browser_proof_result_v1", slug: "ultrawf", oem_part_token: "ULTRAWF", verdict: "PASS_BROWSER_PROOF", owner_proof_urls: [{ url: "https://b.com" }], not_authorized: ["VALIDATION_PASS"] }],
      ]),
      cursorBySlug: new Map(),
      rootDir: REPO_ROOT,
    });
    const batch = selectSmallestExecutableEvidenceBatchV1(queue);
    assert.equal(batch.slug_count, 2);
    assert.deepEqual(batch.target_slugs, ["edr3rxd1", "ultrawf"]);
    assert.equal(batch.expected_safe_buyer_path_proven_delta, 2);
  });

  test("classifies supersession vs compatibility from cursor reason", () => {
    assert.equal(
      classifyHyperagentEvidenceBlockerTypeV1({
        factoryRow: mockFactoryRow("da97-17376a", {
          batch_factory_state: "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL",
        }),
        cursorVerdict: {
          slug: "da97-17376a",
          verdict: "BLOCKED_LABEL_REQUIRED",
          proposed_state: "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL",
          batch_factory_state: "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL",
          reason: "DA97-17376A → DA97-17376B supersession label required before apply",
        },
        proofResult: null,
      }),
      "SUPERSESSION_LABEL",
    );
    assert.equal(
      classifyHyperagentEvidenceBlockerTypeV1({
        factoryRow: mockFactoryRow("frig-242017801", {
          batch_factory_state: "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL",
        }),
        cursorVerdict: {
          slug: "frig-242017801",
          verdict: "BLOCKED_LABEL_REQUIRED",
          proposed_state: "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL",
          batch_factory_state: "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL",
          reason: "242017801 = ULTRAWF alias/canonical decision required before apply",
        },
        proofResult: null,
      }),
      "COMPATIBILITY_DECISION",
    );
  });

  test("evidence gap omits steps for blocked slugs", () => {
    const steps = computeHyperagentEvidenceGapStepsV1({
      blockerType: "CONFLICT",
      proofResult: null,
      factoryRow: mockFactoryRow("purepour"),
      founderApproved: false,
    });
    assert.deepEqual(steps, []);
  });
});
