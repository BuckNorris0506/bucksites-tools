import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1 } from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_EXPECTED_SLUG_COUNT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_MD_REL_V1,
  buildBuckpartsFridgeModelPdpCtaGoLinkProofPackV1,
  classifyFridgeModelPdpCtaGoLinkSlugV1,
  loadMatchSlugsFromRenderedTruthPackV1,
  writeBuckpartsFridgeModelPdpCtaGoLinkProofArtifactsV1,
  type BuckpartsFridgeCtaGoLinkProofSlugRowV1,
} from "./buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1,
  type BuckpartsFridgePdpRenderedTruthProofPackV1,
  type BuckpartsFridgePdpRenderedTruthSlugRowV1,
} from "./buckparts-fridge-model-pdp-rendered-truth-proof-pack-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-14T06:00:00.000Z");

function fixtureMatchRow(
  slug: string,
  overrides?: Partial<BuckpartsFridgePdpRenderedTruthSlugRowV1>,
): BuckpartsFridgePdpRenderedTruthSlugRowV1 {
  return {
    cohort: "qa_20",
    slug,
    backend_closed_cohort: true,
    partial_excluded: true,
    csv_mappings: ["ultrawf"],
    supabase_mappings: ["ultrawf"],
    pdp_loader_mappings: ["ultrawf"],
    rendered_filter_slugs: ["ultrawf"],
    quarantine: false,
    quarantine_reason: null,
    classification: "MATCH",
    frontend_safe_promoted: true,
    only_in_supabase_vs_csv: [],
    only_in_csv_vs_supabase: [],
    only_in_supabase_vs_pdp: [],
    only_in_pdp_vs_supabase: [],
    notes: [],
    ...overrides,
  };
}

function makeMatchPack(slugs: string[]): BuckpartsFridgePdpRenderedTruthProofPackV1 {
  const rows = [
    ...slugs.map((slug) => fixtureMatchRow(slug)),
    ...[
      "samsung-rf27t5201sr",
      "samsung-rf27t5501sr",
      "samsung-rf28r6301sr",
      "samsung-rf28t5101sr",
      "samsung-rs22t5201sg",
      "lg-lfxc22596s",
      "lg-lfxs26973s",
      "lg-lfxs28968s",
      "lg-lmxs28626s",
      "lg-lrfvs3006s",
      "lg-lrfxs3106s",
    ].map((slug) =>
      fixtureMatchRow(slug, {
        classification: "QUARANTINED_SUPPRESSED",
        frontend_safe_promoted: false,
        cohort: slug.startsWith("samsung-") ? "samsung_pass_5" : "qa_20",
      }),
    ),
  ];
  return {
    contract: "buckparts_fridge_model_pdp_rendered_truth_proof_pack_v1",
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
    generated_at: "2026-07-14T05:00:00.000Z",
    source_command: "npm run buckparts:fridge-model-pdp-rendered-truth-proof-pack",
    scope: {
      cohorts: ["gte18", "samsung_pass_5", "gswf_13", "qa_20"],
      slug_count: rows.length,
      slugs: rows.map((r) => r.slug),
      excluded_partial_slugs: GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
    },
    summary: {
      MATCH: slugs.length,
      MISMATCH: 0,
      UNKNOWN_RENDER: 0,
      QUARANTINED_SUPPRESSED: 11,
      frontend_safe_promoted_count: slugs.length,
      backend_closed_slug_count: rows.length,
    },
    rows,
    proven_facts: [],
    unknown_facts: [],
    risk_notes: [],
  };
}

function freshLink(id: string) {
  return {
    id,
    filter_id: "f1",
    retailer_name: "Test",
    affiliate_url: "https://www.amazon.com/dp/B000TEST01",
    is_primary: true,
    retailer_key: "amazon",
    browser_truth_classification: "direct_buyable",
    browser_truth_buyable_subtype: "single_unit_direct_buyable",
    browser_truth_notes: null,
    browser_truth_checked_at: "2026-07-01T00:00:00.000Z",
  };
}

function passFridge(slug: string) {
  return {
    status: "CHECKED" as const,
    fridge: {
      id: "m1",
      slug,
      model_number: "X",
      brand_id: "b1",
      brand: { id: "b1", slug: "ge", name: "GE" },
      filters: [
        {
          id: "f1",
          slug: "ultrawf",
          oem_part_number: "ULTRAWF",
          name: "UltraWF",
          retailer_links_raw_count: 1,
          retailer_links: [freshLink("11111111-1111-1111-1111-111111111111")],
          also_known_as: [],
          buy_path_gate_suppression: {
            hadSearchPlaceholderRows: false,
            hadIndirectDiscoveryRows: false,
            hadBrokenDestinationRows: false,
            hadMissingBrowserTruthRows: false,
            hadUnsafeBrowserTruthRows: false,
          },
          compatible_fridge_model_count: 3,
        },
      ],
      reset_instructions: [],
    },
  };
}

test("loadMatchSlugs pulls only MATCH+promoted; excludes quarantine/PARTIAL", () => {
  const packPath = path.join(ROOT, BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1);
  if (!existsSync(packPath)) return;
  const pack = JSON.parse(readFileSync(packPath, "utf8"));
  const { match_rows, quarantined_slugs } = loadMatchSlugsFromRenderedTruthPackV1(pack);
  assert.equal(match_rows.length, BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_EXPECTED_SLUG_COUNT_V1);
  assert.equal(quarantined_slugs.length, 11);
  for (const partial of GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1) {
    assert.ok(!match_rows.some((r) => r.slug === partial));
  }
  for (const q of quarantined_slugs) {
    assert.ok(!match_rows.some((r) => r.slug === q));
  }
});

test("PASS only when all buyer-path gates proven; otherwise FAIL and never invent PASS", () => {
  const match = fixtureMatchRow("frigidaire-ffhb2740ps");
  const jsonLd = {
    status: "PROVEN_SUPPRESSED" as const,
    notes: ["suppressed"],
  };

  const pass = classifyFridgeModelPdpCtaGoLinkSlugV1({
    match_row: match,
    fridgeLoad: passFridge("frigidaire-ffhb2740ps") as never,
    quarantine: { quarantine: false, reason: null },
    jsonLd,
  });
  assert.equal(pass.verdict, "SAFE_BUYER_PATH_PASS");
  assert.ok(pass.safe_cta_count >= 1);
  assert.ok(pass.go_resolvable_count >= 1);

  const noLinks = classifyFridgeModelPdpCtaGoLinkSlugV1({
    match_row: match,
    fridgeLoad: {
      status: "CHECKED",
      fridge: {
        ...passFridge("frigidaire-ffhb2740ps").fridge,
        filters: [
          {
            ...passFridge("frigidaire-ffhb2740ps").fridge.filters[0],
            retailer_links: [],
            compatible_fridge_model_count: 3,
          },
        ],
      },
    } as never,
    quarantine: { quarantine: false, reason: null },
    jsonLd,
  });
  assert.equal(noLinks.verdict, "SAFE_BUYER_PATH_FAIL");
  assert.ok(noLinks.missing_reasons.includes("no_safe_direct_buyable_cta_after_gate"));

  const unknown = classifyFridgeModelPdpCtaGoLinkSlugV1({
    match_row: match,
    fridgeLoad: { status: "UNKNOWN", reason: "db down" },
    quarantine: { quarantine: false, reason: null },
    jsonLd,
  });
  assert.equal(unknown.verdict, "SAFE_BUYER_PATH_UNKNOWN");
  assert.equal(unknown.cta_eligible, false);
});

test("build pack: exact 28 scope, read-only flags, allowlisted writes only", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "cta-go-proof-"));
  try {
    const matchSlugs = Array.from({ length: 28 }, (_, i) => `fixture-fridge-${String(i).padStart(2, "0")}`);
    const pack = makeMatchPack(matchSlugs);
    const report = await buildBuckpartsFridgeModelPdpCtaGoLinkProofPackV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadRenderedTruthPack: () => pack,
      loadFridge: async (slug) => passFridge(slug) as never,
      resolveQuarantine: () => ({ quarantine: false, reason: null }),
    });

    assert.equal(report.contract, BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_CONTRACT_V1);
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.buy_cta_authorized, false);
    assert.equal(report.retailer_links_mutation_authorized, false);
    assert.equal(report.product_json_ld_mutation_authorized, false);
    assert.equal(report.live_production_fetch_enabled, false);
    assert.equal(report.scope.slug_count, 28);
    assert.equal(report.rows.length, 28);
    assert.equal(report.summary.SAFE_BUYER_PATH_PASS, 28);
    assert.equal(report.summary.product_json_ld_proven_suppressed_count, 28);
    assert.deepEqual(report.scope.excluded_quarantined_slugs.length, 11);
    assert.deepEqual(
      [...report.scope.excluded_partial_slugs].sort(),
      [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1].sort(),
    );
    for (const partial of GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1) {
      assert.ok(!report.scope.slugs.includes(partial));
    }
    for (const q of report.scope.excluded_quarantined_slugs) {
      assert.ok(!report.scope.slugs.includes(q));
    }
    assert.ok(
      report.rows.every(
        (r: BuckpartsFridgeCtaGoLinkProofSlugRowV1) =>
          r.verdict === "SAFE_BUYER_PATH_PASS" && r.product_json_ld_status === "PROVEN_SUPPRESSED",
      ),
    );

    const written = writeBuckpartsFridgeModelPdpCtaGoLinkProofArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(written.json_rel_path, BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1);
    assert.equal(written.md_rel_path, BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_MD_REL_V1);
    assert.deepEqual(
      [...BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_ALLOWED_WRITE_REL_PATHS_V1].sort(),
      [
        BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1,
        BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_MD_REL_V1,
      ].sort(),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("lib remains read-only and does not authorize CTA mutation / production fetch", () => {
  assert.match(LIB_SOURCE, /buy_cta_authorized: false/);
  assert.match(LIB_SOURCE, /retailer_links_mutation_authorized: false/);
  assert.match(LIB_SOURCE, /live_production_fetch_enabled: false/);
  assert.doesNotMatch(LIB_SOURCE, /writeFileSync\([^)]*retailer_links\.csv/);
  assert.doesNotMatch(LIB_SOURCE, /--apply/);
  assert.doesNotMatch(LIB_SOURCE, /fetch\(["'` ]https?:\/\//);
});
