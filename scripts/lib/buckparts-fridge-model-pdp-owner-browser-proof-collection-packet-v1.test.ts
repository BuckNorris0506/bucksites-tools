import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_FILTER_COUNT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_SLUG_COUNT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_FILTERS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_MD_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_SLUGS_V1,
  buildBuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1,
  writeBuckpartsFridgeModelPdpOwnerBrowserProofCollectionArtifactsV1,
} from "./buckparts-fridge-model-pdp-owner-browser-proof-collection-packet-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-fridge-model-pdp-owner-browser-proof-collection-packet-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-14T16:00:00.000Z");

test("contract is read-only and forbids approval/promotion/mutation", () => {
  const packet = buildBuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.equal(packet.contract, BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_CONTRACT_V1);
  assert.equal(packet.read_only, true);
  assert.equal(packet.data_mutation, false);
  assert.equal(packet.mutation_authorized, false);
  assert.equal(packet.supabase_mutation_authorized, false);
  assert.equal(packet.csv_mutation_authorized, false);
  assert.equal(packet.buy_cta_authorized, false);
  assert.equal(packet.retailer_links_mutation_authorized, false);
  assert.equal(packet.invent_link_authorized, false);
  assert.equal(packet.auto_promote_authorized, false);
  assert.equal(packet.owner_approval_authorized, false);
  assert.equal(packet.link_promotion_authorized, false);
  assert.equal(packet.pass_verdict_authorized, false);
  assert.equal(packet.owner_decision_mutation_authorized, false);
  assert.equal(packet.deploy_config_mutation_authorized, false);
  assert.equal(packet.live_production_fetch_enabled, false);
});

test("exact 6 slug and 3 filter scope; remain-no-buy excluded", () => {
  const packet = buildBuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.equal(
    packet.scope.slug_count,
    BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_SLUG_COUNT_V1,
  );
  assert.equal(
    packet.scope.filter_count,
    BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_FILTER_COUNT_V1,
  );
  assert.deepEqual(
    [...packet.scope.slugs].sort(),
    [...BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_SLUGS_V1].sort(),
  );
  assert.deepEqual(
    [...packet.scope.filters].sort(),
    [...BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_FILTERS_V1].sort(),
  );
  assert.equal(packet.slug_rows.length, 6);
  assert.equal(packet.filter_rows.length, 3);
  assert.equal(
    packet.scope.excluded_remain_no_buy_slug,
    BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
  );
  assert.ok(
    !packet.slug_rows.some(
      (r) =>
        r.slug ===
        BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
    ),
  );
});

test("candidates are repo-discovered needing owner verification; never invented as proven", () => {
  const packet = buildBuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.equal(packet.summary.filters_with_repo_proven_official_pdp, 0);
  assert.equal(packet.summary.filters_with_candidate_needing_owner_verification, 3);
  assert.equal(packet.summary.filters_still_search_placeholder_only, 3);

  const byFilter = Object.fromEntries(packet.filter_rows.map((f) => [f.filter_slug, f]));
  for (const filter of BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_FILTERS_V1) {
    const row = byFilter[filter]!;
    assert.equal(row.invent_link_authorized, false);
    assert.equal(row.auto_promote_authorized, false);
    assert.equal(row.owner_approval_authorized, false);
    assert.equal(row.link_promotion_authorized, false);
    assert.equal(row.candidate_urls_repo_proven, false);
    assert.equal(row.approved_safe_direct_buy_evidence_present, false);
    assert.equal(row.search_placeholder_only, true);
    assert.ok(row.current_search_placeholder_url?.includes("search.jsp"));
    assert.ok(row.proposed_official_manufacturer_pdp_candidates.length >= 1);
    for (const c of row.proposed_official_manufacturer_pdp_candidates) {
      assert.equal(c.status, "NEEDS_OWNER_VERIFICATION");
      assert.match(c.url, /\/store\/parts\/spec\//i);
      assert.ok(
        c.provenance === "repo_discovered_ge_rescue_adapter" ||
          c.provenance === "repo_discovered_manufacturer_factory",
      );
    }
    assert.ok(row.owner_browser_checklist.pass_rules.length > 0);
    assert.ok(row.owner_browser_checklist.fail_rules.length > 0);
    assert.ok(row.owner_browser_checklist.unknown_rules.length > 0);
    assert.ok(row.owner_browser_checklist.screenshot_evidence_fields_needed.length > 0);
    assert.equal(row.owner_browser_checklist.confirm_page_is_direct_buyable, true);
    assert.equal(row.owner_browser_checklist.confirm_page_is_official_manufacturer_source, true);
  }

  assert.deepEqual(byFilter.xwfe!.model_slugs_helped_if_proof_passes, [
    "ge-gfe24jgkww",
    "ge-gfe27jmkes",
    "ge-gne25jmkww",
    "ge-gne27jstss",
    "ge-gse25hskss",
    "ge-pvd28bymfs",
  ]);
  assert.deepEqual(byFilter.xwf!.model_slugs_helped_if_proof_passes, [
    "ge-gne27jstss",
    "ge-gse25hskss",
  ]);
  assert.deepEqual(byFilter["smartwater-mwfp"]!.model_slugs_helped_if_proof_passes, [
    "ge-gfe24jgkww",
  ]);
});

test("fail-closed PASS/FAIL/UNKNOWN rules are present and source forbids mutation surfaces", () => {
  const packet = buildBuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.ok(packet.verdict_rules.PASS.some((r) => /direct.?buyable/i.test(r)));
  assert.ok(packet.verdict_rules.FAIL.some((r) => /search\.jsp|searchKeyword/i.test(r)));
  assert.ok(packet.verdict_rules.UNKNOWN.some((r) => /Captcha|ambiguous/i.test(r)));

  assert.ok(!LIB_SOURCE.includes("createClient"));
  assert.ok(!LIB_SOURCE.includes("from('compatibility"));
  assert.ok(!LIB_SOURCE.includes("retailer_links.csv"));
  assert.ok(!/writeFileSync\([^\n]*retailer_links/.test(LIB_SOURCE));
  assert.ok(!LIB_SOURCE.includes("--apply"));
  assert.deepEqual(
    [...BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_ALLOWED_WRITE_REL_PATHS_V1],
    [
      BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_JSON_REL_V1,
      BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_MD_REL_V1,
    ],
  );
});

test("write-artifacts only emits allowed draft JSON/MD", () => {
  const packet = buildBuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  const tmp = mkdtempSync(path.join(tmpdir(), "owner-browser-proof-collection-"));
  try {
    const written = writeBuckpartsFridgeModelPdpOwnerBrowserProofCollectionArtifactsV1({
      rootDir: tmp,
      report: packet,
    });
    assert.equal(
      written.json_rel_path,
      BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_JSON_REL_V1,
    );
    assert.equal(
      written.md_rel_path,
      BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_MD_REL_V1,
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
    const json = JSON.parse(
      readFileSync(path.join(tmp, written.json_rel_path), "utf8"),
    ) as { invent_link_authorized?: boolean; owner_approval_authorized?: boolean };
    assert.equal(json.invent_link_authorized, false);
    assert.equal(json.owner_approval_authorized, false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
