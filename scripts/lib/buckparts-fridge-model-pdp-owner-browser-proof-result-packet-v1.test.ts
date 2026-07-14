import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_MD_REL_V1,
  buildBuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1,
  classifySlugClosureFromMwfpXwfeProofV1,
  writeBuckpartsFridgeModelPdpOwnerBrowserProofResultArtifactsV1,
} from "./buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-14T17:30:00.000Z");

test("contract forbids apply/link mutation", () => {
  const packet = buildBuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.equal(packet.contract, BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1);
  assert.equal(packet.read_only, true);
  assert.equal(packet.data_mutation, false);
  assert.equal(packet.mutation_authorized, false);
  assert.equal(packet.apply_authorized, false);
  assert.equal(packet.supabase_mutation_authorized, false);
  assert.equal(packet.csv_mutation_authorized, false);
  assert.equal(packet.buy_cta_authorized, false);
  assert.equal(packet.retailer_links_mutation_authorized, false);
  assert.equal(packet.invent_link_authorized, false);
  assert.equal(packet.auto_promote_authorized, false);
  assert.equal(packet.link_promotion_authorized, false);
  assert.equal(packet.owner_approval_authorized, false);
  assert.equal(packet.xwf_direct_buy_promotion_authorized, false);
  assert.equal(packet.owner_decision_mutation_authorized, false);
  assert.equal(packet.deploy_config_mutation_authorized, false);
});

test("MWFP and XWFE are OWNER_BROWSER_PASS; XWF is SUPERSEDED_TO_XWFE_PROVEN not clean PASS", () => {
  const packet = buildBuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  const byFilter = Object.fromEntries(packet.filter_rows.map((f) => [f.filter_slug, f]));

  assert.equal(byFilter["smartwater-mwfp"]!.classification, "OWNER_BROWSER_PASS");
  assert.equal(byFilter["smartwater-mwfp"]!.clean_direct_buy_pass, true);
  assert.equal(byFilter["smartwater-mwfp"]!.link_promotion_authorized, false);

  assert.equal(byFilter.xwfe!.classification, "OWNER_BROWSER_PASS");
  assert.equal(byFilter.xwfe!.clean_direct_buy_pass, true);
  assert.equal(byFilter.xwfe!.link_promotion_authorized, false);

  assert.equal(byFilter.xwf!.classification, "SUPERSEDED_TO_XWFE_PROVEN");
  assert.equal(byFilter.xwf!.clean_direct_buy_pass, false);
  assert.equal(byFilter.xwf!.superseded_to_xwfe_proven, true);
  assert.equal(byFilter.xwf!.supersession_safe_apply_lane_required, true);
  assert.equal(byFilter.xwf!.link_promotion_authorized, false);
  assert.match(byFilter.xwf!.supersession_message_proven ?? "", /superseded to Part XWFE/i);
  assert.notEqual(byFilter.xwf!.classification, "OWNER_BROWSER_PASS");

  assert.equal(packet.summary.OWNER_BROWSER_PASS, 2);
  assert.equal(packet.summary.SUPERSEDED_TO_XWFE_PROVEN, 1);
  assert.equal(packet.summary.clean_direct_buy_pass_filters, 2);
});

test("fail-closed slug closure: 4 closable via MWFP/XWFE; 2 blocked by XWF supersession", () => {
  const packet = buildBuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });

  assert.deepEqual(packet.potentially_closable_slugs, [
    "ge-gfe24jgkww",
    "ge-gfe27jmkes",
    "ge-gne25jmkww",
    "ge-pvd28bymfs",
  ]);
  assert.deepEqual(packet.blocked_by_xwf_supersession_slugs, [
    "ge-gne27jstss",
    "ge-gse25hskss",
  ]);
  assert.equal(packet.summary.potentially_closable_slugs, 4);
  assert.equal(packet.summary.blocked_by_xwf_supersession_slugs, 2);

  const bySlug = Object.fromEntries(packet.slug_rows.map((r) => [r.slug, r]));
  for (const slug of packet.potentially_closable_slugs) {
    assert.equal(bySlug[slug]!.closure_status, "POTENTIALLY_CLOSABLE_VIA_MWFP_XWFE_PROOF");
    assert.equal(bySlug[slug]!.blocked_by_xwf_supersession_policy, false);
    assert.equal(bySlug[slug]!.has_xwf_mapping, false);
    assert.equal(bySlug[slug]!.buy_cta_authorized, false);
  }
  for (const slug of packet.blocked_by_xwf_supersession_slugs) {
    assert.equal(bySlug[slug]!.closure_status, "BLOCKED_BY_XWF_SUPERSESSION_POLICY");
    assert.equal(bySlug[slug]!.blocked_by_xwf_supersession_policy, true);
    assert.equal(bySlug[slug]!.has_xwf_mapping, true);
    assert.equal(bySlug[slug]!.potentially_closable_via_mwfp_xwfe_proof, false);
    // Even with XWFE PASS, XWF mapping keeps fail-closed block.
    assert.ok(bySlug[slug]!.mapped_filters_with_owner_browser_pass.includes("xwfe"));
  }

  assert.ok(
    !packet.slug_rows.some(
      (r) =>
        r.slug ===
        BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
    ),
  );
});

test("classify helper is fail-closed when xwf is mapped even if xwfe is present", () => {
  const blocked = classifySlugClosureFromMwfpXwfeProofV1({
    mapped_filter_slugs: ["xwf", "xwfe"],
  });
  assert.equal(blocked.closure_status, "BLOCKED_BY_XWF_SUPERSESSION_POLICY");
  assert.equal(blocked.potentially_closable_via_mwfp_xwfe_proof, false);

  const closable = classifySlugClosureFromMwfpXwfeProofV1({
    mapped_filter_slugs: ["xwfe"],
  });
  assert.equal(closable.closure_status, "POTENTIALLY_CLOSABLE_VIA_MWFP_XWFE_PROOF");

  const closableMwfp = classifySlugClosureFromMwfpXwfeProofV1({
    mapped_filter_slugs: ["smartwater-mwfp", "xwfe"],
  });
  assert.equal(closableMwfp.closure_status, "POTENTIALLY_CLOSABLE_VIA_MWFP_XWFE_PROOF");
});

test("source forbids mutation surfaces; write-artifacts only drafts", () => {
  assert.ok(!LIB_SOURCE.includes("createClient"));
  assert.ok(!LIB_SOURCE.includes("--apply"));
  assert.ok(!/writeFileSync\([^\n]*retailer_links/.test(LIB_SOURCE));
  assert.deepEqual(
    [...BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_ALLOWED_WRITE_REL_PATHS_V1],
    [
      BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1,
      BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_MD_REL_V1,
    ],
  );

  const packet = buildBuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  const tmp = mkdtempSync(path.join(tmpdir(), "owner-browser-proof-result-"));
  try {
    const written = writeBuckpartsFridgeModelPdpOwnerBrowserProofResultArtifactsV1({
      rootDir: tmp,
      report: packet,
    });
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
