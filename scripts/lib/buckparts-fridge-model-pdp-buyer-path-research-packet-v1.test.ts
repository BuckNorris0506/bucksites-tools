import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import type { BuckpartsFridgeBuyerPathGapSlugRowV1 } from "./buckparts-fridge-model-pdp-buyer-path-gap-plan-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1,
  type BuckpartsFridgeModelPdpBuyerPathGapPlanV1,
} from "./buckparts-fridge-model-pdp-buyer-path-gap-plan-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXPECTED_SLUG_COUNT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_MD_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_SLUGS_V1,
  buildBuckpartsFridgeModelPdpBuyerPathResearchPacketV1,
  classifyBuyerPathResearchFilterV1,
  loadResearchRowsFromGapPlanV1,
  writeBuckpartsFridgeModelPdpBuyerPathResearchPacketArtifactsV1,
} from "./buckparts-fridge-model-pdp-buyer-path-research-packet-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-fridge-model-pdp-buyer-path-research-packet-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-14T08:00:00.000Z");

function gapResearchRow(
  slug: string,
  filters: string[],
): BuckpartsFridgeBuyerPathGapSlugRowV1 {
  return {
    slug,
    cohort: "qa_20",
    mapped_filter_slugs: filters,
    mapped_filter_count: filters.length,
    cta_go_missing_reasons: [
      "no_go_resolvable_safe_retailer_link",
      "no_safe_direct_buyable_cta_after_gate",
      "trust_buyer_path_suppress_buy_for_all_mapped_filters",
    ],
    cta_safe_cta_count: 0,
    cta_go_resolvable_count: 0,
    failure_class: "missing_approved_safe_retailer_link",
    recommended_action: "NEEDS_EXTERNAL_RESEARCH",
    existing_approved_retailer_links_could_safely_close: false,
    external_research_required: true,
    owner_approval_required_to_close_live_path: true,
    remain_no_buy: false,
    auto_promote_authorized: false,
    invent_link_authorized: false,
    filter_evidence: [],
    recommended_next_step: "research",
    notes: [],
  };
}

function makeGapPlan(rows: BuckpartsFridgeBuyerPathGapSlugRowV1[]): BuckpartsFridgeModelPdpBuyerPathGapPlanV1 {
  return {
    contract: "buckparts_fridge_model_pdp_buyer_path_gap_plan_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    auto_promote_authorized: false,
    invent_link_authorized: false,
    live_production_fetch_enabled: false,
    generated_at: "2026-07-14T06:00:00.000Z",
    source_command: "npm run buckparts:fridge-model-pdp-buyer-path-gap-plan",
    cta_go_proof_pack_rel_path:
      "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1.json",
    retailer_links_csv_rel_path: "data/retailer_links.csv",
    scope: { slug_count: 7, slugs: [] },
    summary: {
      CLOSABLE_WITH_EXISTING_EVIDENCE: 0,
      NEEDS_EXTERNAL_RESEARCH: rows.length,
      REMAIN_NO_BUY: 1,
    },
    rows: [
      ...rows,
      {
        ...gapResearchRow("ge-gte18gsnrss", []),
        recommended_action: "REMAIN_NO_BUY",
        remain_no_buy: true,
        external_research_required: false,
        failure_class: "expected_no_filter_suppression",
      },
    ],
    proven_facts: [],
    unknown_facts: [],
    risk_notes: [],
  };
}

test("loadResearchRows scopes exact 6 and excludes ge-gte18gsnrss remain-no-buy", () => {
  const packPath = path.join(ROOT, BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1);
  if (!existsSync(packPath)) return;
  const plan = JSON.parse(readFileSync(packPath, "utf8")) as BuckpartsFridgeModelPdpBuyerPathGapPlanV1;
  const rows = loadResearchRowsFromGapPlanV1(plan);
  assert.equal(rows.length, BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXPECTED_SLUG_COUNT_V1);
  assert.deepEqual(
    rows.map((r) => r.slug).sort(),
    [...BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_SLUGS_V1].sort(),
  );
  assert.ok(
    !rows.some(
      (r) =>
        r.slug === BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
    ),
  );
});

test("filter classify: search placeholders → owner browser proof when packet exists; never invent safe evidence", () => {
  const row = classifyBuyerPathResearchFilterV1({
    rootDir: ROOT,
    filter_slug: "xwfe",
    csvRows: [
      {
        filter_slug: "xwfe",
        retailer_name: "OEM parts catalog (keyword lookup)",
        affiliate_url:
          "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWFE",
        is_primary: true,
        retailer_key: "oem-parts-catalog",
        browser_truth_classification: "",
        browser_truth_notes: "",
        browser_truth_checked_at: "",
      },
    ],
    evidenceExists: (rel) => rel.includes("xwfe"),
    readText: () =>
      JSON.stringify({
        normalization_status: "CAPTURE_REQUIRED_UNKNOWN",
        prepared_verdict: "NEEDS_OWNER_BROWSER_REVIEW",
      }),
  });
  assert.equal(row.search_placeholder_only, true);
  assert.equal(row.approved_safe_direct_buy_evidence_present, false);
  assert.equal(row.recommended_next_status, "NEEDS_OWNER_BROWSER_PROOF");
  assert.ok(row.evidence_gaps.some((g) => g.includes("search_placeholder") || g.includes("capture")));
  assert.ok(row.exact_evidence_needed.some((e) => e.toLowerCase().includes("official manufacturer pdp")));
});

test("build packet: exact 6 scope, read-only, no invent/auto-promote, gte18 excluded", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "buyer-path-research-"));
  try {
    const researchRows = BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_SLUGS_V1.map((slug) => {
      if (slug === "ge-gfe24jgkww") return gapResearchRow(slug, ["smartwater-mwfp", "xwfe"]);
      if (slug === "ge-gne27jstss" || slug === "ge-gse25hskss") {
        return gapResearchRow(slug, ["xwf", "xwfe"]);
      }
      return gapResearchRow(slug, ["xwfe"]);
    });

    const report = buildBuckpartsFridgeModelPdpBuyerPathResearchPacketV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadGapPlan: () => makeGapPlan(researchRows),
      loadRetailerLinksCsv: () => [
        {
          filter_slug: "xwfe",
          retailer_name: "OEM",
          affiliate_url:
            "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWFE",
          is_primary: true,
          retailer_key: "oem-parts-catalog",
          browser_truth_classification: "",
          browser_truth_notes: "",
          browser_truth_checked_at: "",
        },
        {
          filter_slug: "xwf",
          retailer_name: "OEM",
          affiliate_url:
            "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWF",
          is_primary: true,
          retailer_key: "oem-parts-catalog",
          browser_truth_classification: "",
          browser_truth_notes: "",
          browser_truth_checked_at: "",
        },
        {
          filter_slug: "smartwater-mwfp",
          retailer_name: "OEM",
          affiliate_url:
            "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=MWFP",
          is_primary: true,
          retailer_key: "oem-parts-catalog",
          browser_truth_classification: "",
          browser_truth_notes: "",
          browser_truth_checked_at: "",
        },
      ],
      evidenceExists: (rel) =>
        rel.includes("xwfe") || rel.includes("xwf") || rel.includes("smartwater-mwfp"),
      readText: () =>
        JSON.stringify({
          normalization_status: "CAPTURE_REQUIRED_UNKNOWN",
          prepared_verdict: "NEEDS_OWNER_BROWSER_REVIEW",
        }),
    });

    assert.equal(report.contract, BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_CONTRACT_V1);
    assert.equal(report.read_only, true);
    assert.equal(report.invent_link_authorized, false);
    assert.equal(report.auto_promote_authorized, false);
    assert.equal(report.buy_cta_authorized, false);
    assert.equal(report.retailer_links_mutation_authorized, false);
    assert.equal(report.scope.slug_count, 6);
    assert.equal(
      report.scope.excluded_remain_no_buy_slug,
      BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
    );
    assert.ok(!report.scope.slugs.includes("ge-gte18gsnrss"));
    assert.equal(report.summary.NEEDS_OWNER_BROWSER_PROOF, 6);
    assert.equal(report.summary.REMAIN_NO_BUY, 0);
    assert.equal(report.summary.approved_safe_direct_buy_evidence_count, 0);
    assert.ok(report.summary.search_placeholder_filter_instances >= 6);
    assert.ok(report.rows.every((r) => r.invent_link_authorized === false));
    assert.ok(report.rows.every((r) => r.auto_promote_authorized === false));
    assert.ok(
      report.unique_filter_findings.every((f) => f.approved_safe_direct_buy_evidence_present === false),
    );

    const written = writeBuckpartsFridgeModelPdpBuyerPathResearchPacketArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(written.json_rel_path, BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1);
    assert.equal(written.md_rel_path, BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_MD_REL_V1);
    assert.deepEqual(
      [...BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_ALLOWED_WRITE_REL_PATHS_V1].sort(),
      [
        BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1,
        BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_MD_REL_V1,
      ].sort(),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("lib remains read-only and does not authorize invent/auto-promote", () => {
  assert.match(LIB_SOURCE, /invent_link_authorized: false/);
  assert.match(LIB_SOURCE, /auto_promote_authorized: false/);
  assert.match(LIB_SOURCE, /ge-gte18gsnrss/);
  assert.doesNotMatch(LIB_SOURCE, /writeFileSync\([^)]*retailer_links\.csv/);
  assert.doesNotMatch(LIB_SOURCE, /--apply/);
  assert.doesNotMatch(LIB_SOURCE, /fetch\(["'` ]https?:\/\//);
});
