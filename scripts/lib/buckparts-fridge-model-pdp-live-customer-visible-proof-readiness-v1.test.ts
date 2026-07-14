import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1 } from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1,
  type BuckpartsFridgeCtaGoLinkProofSlugRowV1,
  type BuckpartsFridgeModelPdpCtaGoLinkProofPackV1,
} from "./buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1,
  type BuckpartsFridgePdpRenderedTruthProofPackV1,
} from "./buckparts-fridge-model-pdp-rendered-truth-proof-pack-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_EXPECTED_SLUG_COUNT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_MD_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_PROPOSED_VISIBLE_TRUST_METADATA_CONTRACT_V1,
  buildBuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1,
  classifyModelPdpVisibleProofMetadataFromCodeSurfaceV1,
  loadSafeBuyerPathPassRowsFromCtaGoProofV1,
  writeBuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessArtifactsV1,
} from "./buckparts-fridge-model-pdp-live-customer-visible-proof-readiness-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-fridge-model-pdp-live-customer-visible-proof-readiness-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-14T12:00:00.000Z");

const EXPECTED_PASS_21 = [
  "frigidaire-ffhb2740ps",
  "frigidaire-fghb2868pf",
  "frigidaire-fgsc2335tf",
  "ge-cwe23sshww",
  "ge-gfe28gmkbb",
  "ge-gfe28gmkes",
  "ge-gfe28gskes",
  "ge-gfe28gskss",
  "ge-gfe28gynfs",
  "ge-gfe28hskss",
  "ge-gye22gskww",
  "ge-pfe28kmkww",
  "ge-pfe28kynbb",
  "samsung-rf263beaesr",
  "samsung-rf28nhedbsr",
  "samsung-rf28r7201sr",
  "samsung-rf28r7351sg",
  "whirlpool-wrf540cwhz",
  "whirlpool-wrs325sdhz",
  "whirlpool-wrx735sdhz",
  "whirlpool-wrx986sihz",
] as const;

const EXPECTED_FAIL_7 = [
  "ge-gfe24jgkww",
  "ge-gfe27jmkes",
  "ge-gne25jmkww",
  "ge-gne27jstss",
  "ge-gse25hskss",
  "ge-gte18gsnrss",
  "ge-pvd28bymfs",
] as const;

function passRow(slug: string): BuckpartsFridgeCtaGoLinkProofSlugRowV1 {
  return {
    slug,
    cohort: "qa_20",
    rendered_truth_classification: "MATCH",
    rendered_filter_slugs: ["rpwfe"],
    mapped_filter_count: 1,
    safe_cta_count: 1,
    go_resolvable_count: 1,
    cta_eligible: true,
    buyer_path_state: "show_confident_buy",
    quarantine: false,
    product_json_ld_status: "PROVEN_SUPPRESSED",
    verdict: "SAFE_BUYER_PATH_PASS",
    missing_reasons: [],
    safe_go_link_ids: [`go-${slug}`],
    notes: ["PASS: all CTA + go-link + JSON-LD suppression gates proven (local data-path; not live HTML)"],
  };
}

function failRow(slug: string): BuckpartsFridgeCtaGoLinkProofSlugRowV1 {
  return {
    ...passRow(slug),
    safe_cta_count: 0,
    go_resolvable_count: 0,
    cta_eligible: false,
    buyer_path_state: "suppress_buy",
    verdict: "SAFE_BUYER_PATH_FAIL",
    missing_reasons: ["no_safe_direct_buyable_cta_after_gate"],
    safe_go_link_ids: [],
    notes: ["FAIL"],
  };
}

function makeCtaPack(): BuckpartsFridgeModelPdpCtaGoLinkProofPackV1 {
  const rows = [
    ...EXPECTED_PASS_21.map((s) => passRow(s)),
    ...EXPECTED_FAIL_7.map((s) => failRow(s)),
  ];
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
    generated_at: "2026-07-14T05:30:58.651Z",
    source_command: "npm run buckparts:fridge-model-pdp-cta-go-link-proof-pack",
    rendered_truth_pack_rel_path: BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1,
    scope: {
      slug_count: 28,
      slugs: rows.map((r) => r.slug),
      excluded_quarantined_slugs: [
        "lg-lfxc22596s",
        "lg-lfxs26973s",
        "lg-lfxs28968s",
        "lg-lmxs28626s",
        "lg-lrfvs3006s",
        "lg-lrfxs3106s",
        "samsung-rf27t5201sr",
        "samsung-rf27t5501sr",
        "samsung-rf28r6301sr",
        "samsung-rf28t5101sr",
        "samsung-rs22t5201sg",
      ],
      excluded_partial_slugs: GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
    },
    summary: {
      SAFE_BUYER_PATH_PASS: 21,
      SAFE_BUYER_PATH_FAIL: 7,
      SAFE_BUYER_PATH_UNKNOWN: 0,
      product_json_ld_proven_suppressed_count: 28,
    },
    rows,
    proven_facts: [],
    unknown_facts: [],
    risk_notes: [],
  };
}

function makeRenderedPack(): BuckpartsFridgePdpRenderedTruthProofPackV1 {
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
    generated_at: "2026-07-14T04:36:44.937Z",
    source_command: "npm run buckparts:fridge-model-pdp-rendered-truth-proof-pack",
    scope: {
      cohorts: ["gte18", "samsung_pass_5", "gswf_13", "qa_20"],
      slug_count: 0,
      slugs: [],
      excluded_partial_slugs: GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
    },
    summary: {
      MATCH: 28,
      MISMATCH: 0,
      UNKNOWN_RENDER: 0,
      QUARANTINED_SUPPRESSED: 11,
      frontend_safe_promoted_count: 28,
      backend_closed_slug_count: 28,
    },
    rows: [],
    proven_facts: [],
    unknown_facts: [],
    risk_notes: [],
  };
}

test("loadSafeBuyerPathPassRows scopes exact 21 from repo CTA pack and excludes FAIL/PARTIAL/quarantine", () => {
  const packPath = path.join(ROOT, BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1);
  if (!existsSync(packPath)) return;
  const pack = JSON.parse(
    readFileSync(packPath, "utf8"),
  ) as BuckpartsFridgeModelPdpCtaGoLinkProofPackV1;
  const rows = loadSafeBuyerPathPassRowsFromCtaGoProofV1(pack);
  assert.equal(
    rows.length,
    BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_EXPECTED_SLUG_COUNT_V1,
  );
  assert.deepEqual(
    rows.map((r) => r.slug).sort(),
    [...EXPECTED_PASS_21].sort(),
  );
  for (const fail of EXPECTED_FAIL_7) {
    assert.ok(!rows.some((r) => r.slug === fail), `FAIL leaked: ${fail}`);
  }
  for (const partial of GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1) {
    assert.ok(!rows.some((r) => r.slug === partial), `PARTIAL leaked: ${partial}`);
  }
  for (const q of pack.scope.excluded_quarantined_slugs) {
    assert.ok(!rows.some((r) => r.slug === q), `quarantine leaked: ${q}`);
  }
});

test("code surface: model PDP proof metadata is partial footnote only, not full EXPOSED", () => {
  assert.equal(
    classifyModelPdpVisibleProofMetadataFromCodeSurfaceV1(),
    "PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY",
  );
});

test("build readiness: exact 21, exclusions, read-only, no deploy, live HTML UNKNOWN without proof", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "live-vis-proof-ready-"));
  try {
    const report = buildBuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadCtaGoProofPack: () => makeCtaPack(),
      loadRenderedTruthPack: () => makeRenderedPack(),
    });

    assert.equal(
      report.contract,
      BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_CONTRACT_V1,
    );
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.deploy_authorized, false);
    assert.equal(report.live_production_fetch_enabled, false);
    assert.equal(report.live_html_claimed, false);
    assert.equal(report.supabase_mutation_authorized, false);
    assert.equal(report.csv_mutation_authorized, false);
    assert.equal(report.buy_cta_authorized, false);
    assert.equal(report.product_json_ld_mutation_authorized, false);
    assert.equal(report.scope.slug_count, 21);
    assert.deepEqual(report.scope.slugs, [...EXPECTED_PASS_21].sort());
    assert.deepEqual(report.scope.excluded_fail_slugs, [...EXPECTED_FAIL_7].sort());
    assert.deepEqual(
      report.scope.excluded_partial_slugs,
      [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1],
    );
    assert.equal(report.summary.live_html_unknown_count, 21);
    assert.equal(report.summary.live_html_proven_count, 0);
    assert.equal(report.summary.page_exposes_proof_metadata_visibly_count, 0);
    assert.equal(report.summary.ready_for_future_live_proof_pass_count, 21);
    for (const row of report.rows) {
      assert.equal(row.live_html_proof_status, "UNKNOWN");
      assert.equal(row.page_exposes_proof_metadata_visibly_to_homeowner, false);
      assert.ok(row.visible_metadata_gaps.length > 0);
      assert.equal(row.ready_for_future_production_live_proof_pass, true);
      assert.equal(
        row.buyer_path_proof_source_artifact,
        BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1,
      );
      assert.equal(
        row.rendered_mapping_proof_source_artifact,
        BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1,
      );
    }

    const written = writeBuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
    assert.deepEqual(
      [...BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_ALLOWED_WRITE_REL_PATHS_V1],
      [
        BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_JSON_REL_V1,
        BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_MD_REL_V1,
      ],
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("live HTML only PROVEN when explicit proof map supplied; never invent", () => {
  const report = buildBuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    loadCtaGoProofPack: () => makeCtaPack(),
    loadRenderedTruthPack: () => makeRenderedPack(),
    liveHtmlProofBySlug: {
      "frigidaire-ffhb2740ps": "PROVEN_LIVE_HTML",
    },
  });
  const proven = report.rows.find((r) => r.slug === "frigidaire-ffhb2740ps");
  const other = report.rows.find((r) => r.slug === "ge-cwe23sshww");
  assert.equal(proven?.live_html_proof_status, "PROVEN_LIVE_HTML");
  assert.equal(other?.live_html_proof_status, "UNKNOWN");
  assert.equal(report.summary.live_html_proven_count, 1);
  assert.equal(report.live_html_claimed, false);
});

test("proposed trust metadata forbids OEM overclaim language, offer invent, unsafe CTA", () => {
  const c = BUCKPARTS_FRIDGE_MODEL_PDP_PROPOSED_VISIBLE_TRUST_METADATA_CONTRACT_V1;
  assert.equal(c.applied_to_production, false);
  assert.equal(c.product_json_ld.invent_offers_authorized, false);
  assert.equal(c.product_json_ld.invent_review_authorized, false);
  assert.equal(c.product_json_ld.invent_aggregate_rating_authorized, false);
  assert.equal(c.buy_cta.unsafe_cta_promotion_authorized, false);
  assert.equal(c.buy_cta.search_placeholder_promotion_authorized, false);
  assert.ok(c.exact_safe_language.avoid_unless_proven.includes("OEM"));
  assert.ok(
    c.exact_safe_language.preferred_identity_labels.every((l) => !/\bOEM\b/.test(l)),
  );
  const blob = JSON.stringify(c);
  assert.ok(!/\bgenuine OEM\b/i.test(blob) || c.exact_safe_language.avoid_unless_proven.length > 0);
});

test("source: no deploy / no live fetch / no unsafe OEM customer claim without gate", () => {
  assert.ok(LIB_SOURCE.includes("deploy_authorized: false"));
  assert.ok(LIB_SOURCE.includes("live_production_fetch_enabled: false"));
  assert.ok(LIB_SOURCE.includes("live_html_claimed: false"));
  assert.ok(LIB_SOURCE.includes('avoid_unless_proven: ["OEM"'));
  assert.ok(LIB_SOURCE.includes("invent_offers_authorized: false"));
  assert.ok(!/fetch\(['\"]https?:\/\//.test(LIB_SOURCE));
  assert.ok(!/vercel\s+deploy/i.test(LIB_SOURCE));
  assert.ok(LIB_SOURCE.includes("deploy_authorized: false"));
  assert.ok(!/live_html_claimed:\s*true/.test(LIB_SOURCE));
});
