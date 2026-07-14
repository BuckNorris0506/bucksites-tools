import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1,
  FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_FAIL_SLUGS_V1,
  FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_PARTIAL_SLUGS_V1,
  FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_QUARANTINED_SLUGS_V1,
} from "@/lib/fridge/fridge-model-pdp-safe-buyer-path-visible-proof-v1";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_EXPECTED_SLUG_COUNT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_HEADING_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_MD_REL_V1,
  analyzeFridgeModelPdpLiveHtmlV1,
  buildBuckpartsFridgeModelPdpLiveHtmlProofPackV1,
  classifyFridgeModelPdpLiveHtmlProofResultV1,
  liveHtmlHasExposedSearchPlaceholderCtaV1,
  liveHtmlHasUnsafeProductJsonLdCommerceV1,
  writeBuckpartsFridgeModelPdpLiveHtmlProofArtifactsV1,
} from "./buckparts-fridge-model-pdp-live-html-proof-pack-v1";
import type { BuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1 } from "./buckparts-fridge-model-pdp-live-customer-visible-proof-readiness-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-fridge-model-pdp-live-html-proof-pack-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-14T12:30:00.000Z");

function passingHtml(slug: string, filterSlug: string): string {
  return `
<html><body>
  <div data-fridge-model-pdp-visible-proof-v1="true" data-fridge-model-pdp-visible-proof-slug="${slug}">
    <h2>What we checked for this model</h2>
    <p>We checked a direct store product page. Last checked 2026-06-02.</p>
    <p>Filter number(s) to compare: RPWFE</p>
  </div>
  <a href="/filter/${filterSlug}">open filter</a>
  <p>BuckParts Verified Links</p>
  <a href="/go/abc-123">BuckParts Verified Link at Example</a>
</body></html>`;
}

function makeReadiness(): BuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1 {
  const slugs = [...FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1].sort();
  return {
    contract: "buckparts_fridge_model_pdp_live_customer_visible_proof_readiness_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    owner_decisions_mutation_authorized: false,
    deploy_authorized: false,
    live_production_fetch_enabled: false,
    live_html_claimed: false,
    generated_at: "2026-07-14T05:59:47.072Z",
    source_command: "npm run buckparts:fridge-model-pdp-live-customer-visible-proof-readiness",
    cta_go_proof_pack_rel_path:
      "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1.json",
    rendered_truth_pack_rel_path:
      "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-rendered-truth-proof-pack-v1.json",
    scope: {
      slug_count: slugs.length,
      slugs,
      excluded_fail_slugs: [...FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_FAIL_SLUGS_V1],
      excluded_quarantined_slugs: [...FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_QUARANTINED_SLUGS_V1],
      excluded_partial_slugs: [...FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_PARTIAL_SLUGS_V1],
    },
    summary: {
      SAFE_BUYER_PATH_PASS_scoped: 21,
      page_exposes_proof_metadata_visibly_count: 0,
      live_html_proven_count: 0,
      live_html_unknown_count: 21,
      ready_for_future_live_proof_pass_count: 21,
      visible_metadata_gap_count: 21,
    },
    rows: slugs.map((slug) => ({
      slug,
      mapped_filters: ["rpwfe"],
      safe_go_link_ids: ["go-1"],
      buyer_path_proof_source_artifact:
        "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1.json",
      rendered_mapping_proof_source_artifact:
        "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-rendered-truth-proof-pack-v1.json",
      buyer_path_proof_generated_at: "2026-07-14T05:30:58.651Z",
      rendered_mapping_proof_generated_at: "2026-07-14T04:36:44.937Z",
      freshness_check_timestamp_available_from_proof: "2026-07-14T05:30:58.651Z",
      page_exposes_proof_metadata_visibly_to_homeowner: false,
      visible_proof_metadata_status: "PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY",
      visible_metadata_gaps: [],
      live_html_proof_status: "UNKNOWN",
      ready_for_future_production_live_proof_pass: true,
      notes: [],
    })),
    proposed_visible_trust_metadata_contract: {} as never,
    proven_facts: [],
    unknown_facts: [],
    risk_notes: [],
    recommended_next_move: "prototype",
  };
}

test("scope constants: exact 21 and exclusions disjoint", () => {
  assert.equal(
    FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1.length,
    BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_EXPECTED_SLUG_COUNT_V1,
  );
  for (const fail of FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_FAIL_SLUGS_V1) {
    assert.ok(
      !(FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1 as readonly string[]).includes(
        fail,
      ),
    );
  }
  for (const q of FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_QUARANTINED_SLUGS_V1) {
    assert.ok(
      !(FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1 as readonly string[]).includes(q),
    );
  }
  for (const p of FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_PARTIAL_SLUGS_V1) {
    assert.ok(
      !(FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1 as readonly string[]).includes(p),
    );
  }
});

test("analyze + classify: full markers → LIVE_PROOF_PASS; missing heading → FAIL", () => {
  const ok = analyzeFridgeModelPdpLiveHtmlV1({
    slug: "ge-cwe23sshww",
    html: passingHtml("ge-cwe23sshww", "rpwfe"),
    expected_mapped_filters: ["rpwfe"],
  });
  assert.equal(
    classifyFridgeModelPdpLiveHtmlProofResultV1({ fetch_status: "OK", analysis: ok }).result,
    "LIVE_PROOF_PASS",
  );

  const missing = analyzeFridgeModelPdpLiveHtmlV1({
    slug: "ge-cwe23sshww",
    html: `<html><body><a href="/go/x">BuckParts Verified Link</a><a href="/filter/rpwfe">x</a></body></html>`,
    expected_mapped_filters: ["rpwfe"],
  });
  const fail = classifyFridgeModelPdpLiveHtmlProofResultV1({
    fetch_status: "OK",
    analysis: missing,
  });
  assert.equal(fail.result, "LIVE_PROOF_FAIL");
  assert.ok(fail.missing_reasons.includes("proof_heading_missing"));
});

test("classify: network / missing base → LIVE_PROOF_UNKNOWN (fail-closed)", () => {
  assert.equal(
    classifyFridgeModelPdpLiveHtmlProofResultV1({
      fetch_status: "NETWORK_UNKNOWN",
      analysis: null,
    }).result,
    "LIVE_PROOF_UNKNOWN",
  );
  assert.equal(
    classifyFridgeModelPdpLiveHtmlProofResultV1({
      fetch_status: "NO_BASE_URL",
      analysis: null,
    }).result,
    "LIVE_PROOF_UNKNOWN",
  );
});

test("unsafe Product JSON-LD / search placeholder detectors", () => {
  assert.equal(
    liveHtmlHasUnsafeProductJsonLdCommerceV1(
      `<script type="application/ld+json">{"@type":"Product","offers":{"@type":"Offer","price":"1"}}</script>`,
    ),
    true,
  );
  assert.equal(
    liveHtmlHasUnsafeProductJsonLdCommerceV1(
      `<script type="application/ld+json">{"@type":"WebPage","name":"x"}</script>`,
    ),
    false,
  );
  assert.equal(
    liveHtmlHasExposedSearchPlaceholderCtaV1(
      `<a href="https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWFE">bad</a>`,
    ),
    true,
  );
  assert.equal(
    liveHtmlHasExposedSearchPlaceholderCtaV1(`<a href="/go/safe-id">ok</a>`),
    false,
  );
});

test("build pack: exact 21, exclusions, read-only, no conversion/deploy, PASS with fixture fetch", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "live-html-proof-"));
  try {
    const report = await buildBuckpartsFridgeModelPdpLiveHtmlProofPackV1({
      rootDir: tmp,
      now: FIXED_NOW,
      baseUrlOverride: "https://buckparts.com",
      loadReadinessPack: () => makeReadiness(),
      fetchHtml: async (url) => {
        const slug = url.split("/fridge/")[1] ?? "";
        return {
          status: "OK",
          http_status: 200,
          html: passingHtml(slug, "rpwfe"),
        };
      },
    });

    assert.equal(report.contract, BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_CONTRACT_V1);
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.deploy_authorized, false);
    assert.equal(report.conversion_claimed, false);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.buy_cta_authorized, false);
    assert.equal(report.scope.slug_count, 21);
    assert.deepEqual(
      report.scope.slugs,
      [...FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1].sort(),
    );
    for (const fail of FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_FAIL_SLUGS_V1) {
      assert.ok(!report.scope.slugs.includes(fail));
    }
    for (const q of FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_QUARANTINED_SLUGS_V1) {
      assert.ok(!report.scope.slugs.includes(q));
    }
    for (const p of FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_PARTIAL_SLUGS_V1) {
      assert.ok(!report.scope.slugs.includes(p));
    }
    assert.equal(report.summary.LIVE_PROOF_PASS, 21);
    assert.equal(report.summary.LIVE_PROOF_FAIL, 0);
    assert.equal(report.summary.LIVE_PROOF_UNKNOWN, 0);
    assert.ok(
      report.rows.every((r) => r.production_url?.startsWith("https://buckparts.com/fridge/")),
    );

    const written = writeBuckpartsFridgeModelPdpLiveHtmlProofArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
    assert.deepEqual(
      [...BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_ALLOWED_WRITE_REL_PATHS_V1],
      [
        BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_JSON_REL_V1,
        BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_MD_REL_V1,
      ],
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("build pack: missing proof heading → LIVE_PROOF_FAIL fail-closed; still no conversion claim", async () => {
  const report = await buildBuckpartsFridgeModelPdpLiveHtmlProofPackV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    baseUrlOverride: "https://buckparts.com",
    loadReadinessPack: () => makeReadiness(),
    fetchHtml: async () => ({
      status: "OK",
      http_status: 200,
      html: `<html><body><a href="/go/x">BuckParts Verified Links</a><a href="/filter/rpwfe">f</a>Last checked 2026-01-01</body></html>`,
    }),
  });
  assert.equal(report.summary.LIVE_PROOF_FAIL, 21);
  assert.equal(report.conversion_claimed, false);
  assert.ok(report.rows[0]?.missing_reasons.includes("proof_heading_missing"));
});

test("source: no deploy mutation / no conversion claim / writes drafts only", () => {
  assert.ok(LIB_SOURCE.includes("deploy_authorized: false"));
  assert.ok(LIB_SOURCE.includes("conversion_claimed: false"));
  assert.ok(LIB_SOURCE.includes("data_mutation: false"));
  assert.ok(LIB_SOURCE.includes(BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_HEADING_V1));
  assert.ok(!/vercel\s+deploy/i.test(LIB_SOURCE));
  assert.ok(!LIB_SOURCE.includes("retailer_links.csv"));
  assert.ok(LIB_SOURCE.includes("data/fridge/batch-production/drafts/"));
});
