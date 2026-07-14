import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_EXPECTED_SLUG_COUNT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_FAIL_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_MD_REL_V1,
  buildBuckpartsFridgeModelPdpBuyerPathGapPlanV1,
  classifyFridgeModelPdpBuyerPathGapSlugV1,
  loadFailRowsFromCtaGoProofPackV1,
  writeBuckpartsFridgeModelPdpBuyerPathGapPlanArtifactsV1,
  type RetailerLinksCsvRowV1,
} from "./buckparts-fridge-model-pdp-buyer-path-gap-plan-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1,
  type BuckpartsFridgeCtaGoLinkProofSlugRowV1,
  type BuckpartsFridgeModelPdpCtaGoLinkProofPackV1,
} from "./buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-fridge-model-pdp-buyer-path-gap-plan-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-14T07:00:00.000Z");

function failRow(
  slug: string,
  overrides?: Partial<BuckpartsFridgeCtaGoLinkProofSlugRowV1>,
): BuckpartsFridgeCtaGoLinkProofSlugRowV1 {
  return {
    slug,
    cohort: "qa_20",
    rendered_truth_classification: "MATCH",
    rendered_filter_slugs: ["xwfe"],
    mapped_filter_count: 1,
    safe_cta_count: 0,
    go_resolvable_count: 0,
    cta_eligible: false,
    buyer_path_state: "suppress_buy",
    quarantine: false,
    product_json_ld_status: "PROVEN_SUPPRESSED",
    verdict: "SAFE_BUYER_PATH_FAIL",
    missing_reasons: [
      "no_go_resolvable_safe_retailer_link",
      "no_safe_direct_buyable_cta_after_gate",
      "trust_buyer_path_suppress_buy_for_all_mapped_filters",
    ],
    safe_go_link_ids: [],
    notes: [],
    ...overrides,
  };
}

function makeFailPack(rows: BuckpartsFridgeCtaGoLinkProofSlugRowV1[]): BuckpartsFridgeModelPdpCtaGoLinkProofPackV1 {
  return {
    contract: "buckparts_fridge_model_pdp_cta_go_link_proof_pack_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    live_production_fetch_enabled: false,
    generated_at: "2026-07-14T04:49:32.361Z",
    source_command: "npm run buckparts:fridge-model-pdp-cta-go-link-proof-pack",
    rendered_truth_pack_rel_path:
      "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-rendered-truth-proof-pack-v1.json",
    scope: {
      slug_count: 28,
      slugs: [],
      excluded_quarantined_slugs: [],
      excluded_partial_slugs: [],
    },
    summary: {
      SAFE_BUYER_PATH_PASS: 19,
      SAFE_BUYER_PATH_FAIL: rows.length,
      SAFE_BUYER_PATH_UNKNOWN: 0,
      product_json_ld_proven_suppressed_count: 28,
    },
    rows: [
      ...rows,
      {
        ...failRow("frigidaire-ffhb2740ps", {
          verdict: "SAFE_BUYER_PATH_PASS",
          missing_reasons: [],
          safe_cta_count: 1,
          go_resolvable_count: 1,
          cta_eligible: true,
          buyer_path_state: "show_confident_buy",
        }),
      },
    ],
    proven_facts: [],
    unknown_facts: [],
    risk_notes: [],
  };
}

function csvRow(partial: Partial<RetailerLinksCsvRowV1> & { filter_slug: string }): RetailerLinksCsvRowV1 {
  return {
    retailer_name: "Test",
    affiliate_url: "https://www.example.com/p",
    is_primary: true,
    retailer_key: "oem-parts-catalog",
    browser_truth_classification: "",
    browser_truth_notes: "",
    browser_truth_checked_at: "",
    ...partial,
  };
}

test("loadFailRows scopes exact 9 FAIL slugs from CTA/go pack", () => {
  const packPath = path.join(ROOT, BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1);
  if (!existsSync(packPath)) return;
  const pack = JSON.parse(readFileSync(packPath, "utf8")) as BuckpartsFridgeModelPdpCtaGoLinkProofPackV1;
  const failRows = loadFailRowsFromCtaGoProofPackV1(pack);
  assert.equal(failRows.length, BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_EXPECTED_SLUG_COUNT_V1);
  assert.deepEqual(
    failRows.map((r) => r.slug).sort(),
    [...BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_FAIL_SLUGS_V1].sort(),
  );
});

test("classify: remain-no-buy for no-filter; closable only with gate-passable CSV evidence; research otherwise", () => {
  const remain = classifyFridgeModelPdpBuyerPathGapSlugV1({
    fail_row: failRow("ge-gte18gsnrss", {
      rendered_filter_slugs: [],
      mapped_filter_count: 0,
      missing_reasons: [
        "no_mapped_filters_on_pdp_loader",
        "no_safe_direct_buyable_cta_after_gate",
        "no_go_resolvable_safe_retailer_link",
        "trust_buyer_path_unavailable",
      ],
    }),
    csvRows: [],
    evidenceExists: () => true,
  });
  assert.equal(remain.recommended_action, "REMAIN_NO_BUY");
  assert.equal(remain.remain_no_buy, true);
  assert.equal(remain.existing_approved_retailer_links_could_safely_close, false);
  assert.equal(remain.auto_promote_authorized, false);

  const closable = classifyFridgeModelPdpBuyerPathGapSlugV1({
    fail_row: failRow("whirlpool-wrf540cwhz", { rendered_filter_slugs: ["edr4rxd1"] }),
    csvRows: [
      csvRow({
        filter_slug: "edr4rxd1",
        affiliate_url:
          "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html",
        browser_truth_classification: "direct_buyable",
        browser_truth_buyable_subtype: "single_unit_direct_buyable",
        browser_truth_checked_at: "2026-06-26T12:00:00.000Z",
        browser_truth_notes: "owner browser proof",
      }),
    ],
    evidenceExists: () => true,
  });
  assert.equal(closable.recommended_action, "CLOSABLE_WITH_EXISTING_EVIDENCE");
  assert.equal(closable.existing_approved_retailer_links_could_safely_close, true);
  assert.equal(closable.external_research_required, false);
  assert.equal(closable.invent_link_authorized, false);
  assert.equal(closable.auto_promote_authorized, false);

  const research = classifyFridgeModelPdpBuyerPathGapSlugV1({
    fail_row: failRow("ge-gfe27jmkes", { rendered_filter_slugs: ["xwfe"] }),
    csvRows: [
      csvRow({
        filter_slug: "xwfe",
        affiliate_url: "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWFE",
        browser_truth_classification: "",
      }),
    ],
    evidenceExists: () => false,
  });
  assert.equal(research.recommended_action, "NEEDS_EXTERNAL_RESEARCH");
  assert.equal(research.existing_approved_retailer_links_could_safely_close, false);
  assert.equal(research.external_research_required, true);
  assert.equal(research.invent_link_authorized, false);
});

test("build plan: exact 9 scope, read-only, no invent/auto-promote, allowlisted writes only", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "buyer-path-gap-"));
  try {
    const failRows = BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_FAIL_SLUGS_V1.map((slug) => {
      if (slug === "ge-gte18gsnrss") {
        return failRow(slug, {
          rendered_filter_slugs: [],
          mapped_filter_count: 0,
          missing_reasons: [
            "no_mapped_filters_on_pdp_loader",
            "no_safe_direct_buyable_cta_after_gate",
            "no_go_resolvable_safe_retailer_link",
            "trust_buyer_path_unavailable",
          ],
        });
      }
      if (slug.startsWith("whirlpool-")) {
        return failRow(slug, { rendered_filter_slugs: ["edr4rxd1"] });
      }
      if (slug === "ge-gfe24jgkww") {
        return failRow(slug, { rendered_filter_slugs: ["smartwater-mwfp", "xwfe"] });
      }
      if (slug === "ge-gne27jstss" || slug === "ge-gse25hskss") {
        return failRow(slug, { rendered_filter_slugs: ["xwf", "xwfe"] });
      }
      return failRow(slug, { rendered_filter_slugs: ["xwfe"] });
    });

    const report = buildBuckpartsFridgeModelPdpBuyerPathGapPlanV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadCtaGoProofPack: () => makeFailPack(failRows),
      loadRetailerLinksCsv: () => [
        csvRow({
          filter_slug: "edr4rxd1",
          affiliate_url:
            "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html",
          browser_truth_classification: "direct_buyable",
          browser_truth_buyable_subtype: "single_unit_direct_buyable",
          browser_truth_checked_at: "2026-06-26T12:00:00.000Z",
        }),
        csvRow({
          filter_slug: "xwfe",
          affiliate_url: "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWFE",
        }),
        csvRow({
          filter_slug: "xwf",
          affiliate_url: "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWF",
        }),
        csvRow({
          filter_slug: "smartwater-mwfp",
          affiliate_url: "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=MWFP",
        }),
      ],
      evidenceExists: (rel) => rel.includes("edr4rxd1") || rel.includes("gte18"),
    });

    assert.equal(report.contract, BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_CONTRACT_V1);
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.auto_promote_authorized, false);
    assert.equal(report.invent_link_authorized, false);
    assert.equal(report.buy_cta_authorized, false);
    assert.equal(report.retailer_links_mutation_authorized, false);
    assert.equal(report.scope.slug_count, 9);
    assert.equal(report.summary.CLOSABLE_WITH_EXISTING_EVIDENCE, 2);
    assert.equal(report.summary.REMAIN_NO_BUY, 1);
    assert.equal(report.summary.NEEDS_EXTERNAL_RESEARCH, 6);
    assert.ok(report.rows.every((r) => r.auto_promote_authorized === false));
    assert.ok(report.rows.every((r) => r.invent_link_authorized === false));
    assert.ok(
      report.rows
        .filter((r) => r.recommended_action === "CLOSABLE_WITH_EXISTING_EVIDENCE")
        .every((r) => r.existing_approved_retailer_links_could_safely_close === true),
    );
    assert.ok(
      report.rows
        .filter((r) => r.recommended_action === "NEEDS_EXTERNAL_RESEARCH")
        .every((r) => r.existing_approved_retailer_links_could_safely_close === false),
    );

    const written = writeBuckpartsFridgeModelPdpBuyerPathGapPlanArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(written.json_rel_path, BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1);
    assert.equal(written.md_rel_path, BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_MD_REL_V1);
    assert.deepEqual(
      [...BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_ALLOWED_WRITE_REL_PATHS_V1].sort(),
      [
        BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1,
        BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_MD_REL_V1,
      ].sort(),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("lib remains read-only and does not authorize invent/auto-promote or --apply", () => {
  assert.match(LIB_SOURCE, /auto_promote_authorized: false/);
  assert.match(LIB_SOURCE, /invent_link_authorized: false/);
  assert.match(LIB_SOURCE, /retailer_links_mutation_authorized: false/);
  assert.doesNotMatch(LIB_SOURCE, /writeFileSync\([^)]*retailer_links\.csv/);
  assert.doesNotMatch(LIB_SOURCE, /--apply/);
  assert.doesNotMatch(LIB_SOURCE, /fetch\(["'` ]https?:\/\//);
});
