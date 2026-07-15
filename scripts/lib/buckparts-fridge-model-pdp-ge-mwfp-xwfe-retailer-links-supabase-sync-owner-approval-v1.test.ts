import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1 } from "./buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1";
import { BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1 } from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1";
import { BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_JSON_REL_V1 } from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_BROWSER_TRUTH_CHECKED_AT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_DECISION_ID_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_MD_REL_V1,
  buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalV1,
  writeBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalArtifactsV1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-approval-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-approval-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-14T22:30:00.000Z");

function fileSha(rel: string): string {
  return createHash("sha256")
    .update(readFileSync(path.join(ROOT, rel)))
    .digest("hex");
}

test("no apply/mutation; exact 2 filters; XWF excluded; CSV and inserts disallowed", () => {
  const doc = buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.equal(
    doc.packet_contract,
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_CONTRACT_V1,
  );
  assert.equal(doc.read_only, true);
  assert.equal(doc.data_mutation, false);
  assert.equal(doc.apply_authorized, false);
  assert.equal(doc.mutation_authorized, false);
  assert.equal(doc.rows.length, 1);

  const row = doc.rows[0]!;
  assert.equal(
    row.decision_id,
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_DECISION_ID_V1,
  );
  const ctx =
    row.buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_owner_approval_context_v1;
  assert.equal(ctx.apply_authorized, false);
  assert.equal(ctx.mutation_authorized, false);
  assert.equal(ctx.supabase_mutation_authorized, false);
  assert.equal(ctx.apply_not_executed, true);
  assert.equal(ctx.autonomous_apply_authorized, false);
  assert.equal(ctx.xwf_promotion_authorized, false);
  assert.equal(ctx.retailer_links_csv_mutation_authorized, false);
  assert.equal(ctx.deploy_mutation_authorized, false);
  assert.equal(ctx.pages_claimed_closed, false);
  assert.equal(ctx.conversion_claimed, false);
  assert.equal(ctx.approved_updates, 2);
  assert.equal(ctx.approved_inserts, 0);
  assert.equal(ctx.approved_deletes, 0);
  assert.equal(
    ctx.allowed_future_mutation_type,
    "supabase_retailer_links_update_existing_primary_only",
  );
  assert.deepEqual([...ctx.approved_filter_slugs], ["smartwater-mwfp", "xwfe"]);
  assert.ok(!ctx.approved_filter_slugs.includes("xwf"));
  assert.ok(ctx.exclusions.includes("xwf"));
  assert.ok(row.prohibited_actions_still_apply.some((p) => /INSERT/i.test(p)));
  assert.ok(row.prohibited_actions_still_apply.some((p) => /DELETE/i.test(p)));
  assert.ok(row.prohibited_actions_still_apply.some((p) => /csv/i.test(p)));
  assert.ok(row.prohibited_actions_still_apply.some((p) => /conversion/i.test(p)));
  assert.ok(row.prohibited_actions_still_apply.some((p) => /autonomous/i.test(p)));

  for (const d of ctx.approved_deltas) {
    assert.equal(d.change_kind, "update_existing_primary_row");
    assert.ok(d.supabase_link_id.length > 0);
    assert.equal(d.proposed_retailer_name, "GE Appliance Parts");
    assert.equal(d.proposed_retailer_key, "oem-parts-catalog");
    assert.equal(d.proposed_browser_truth_classification, "direct_buyable");
    assert.equal(
      d.proposed_browser_truth_checked_at,
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_BROWSER_TRUTH_CHECKED_AT_V1,
    );
    assert.ok(d.proposed_browser_truth_notes.includes("owner browser proof"));
    assert.ok(d.proposed_browser_truth_notes.includes("owner-review"));
    assert.ok(!/pages closed|conversion proven/i.test(d.proposed_browser_truth_notes));
  }
  const by = new Map(ctx.approved_deltas.map((d) => [d.filter_slug, d]));
  assert.equal(
    by.get("smartwater-mwfp")?.proposed_affiliate_url,
    "https://www.geapplianceparts.com/store/parts/spec/MWFP",
  );
  assert.equal(
    by.get("xwfe")?.proposed_affiliate_url,
    "https://www.geapplianceparts.com/store/parts/spec/XWFE",
  );
});

test("binds owner-review, browser proof, and parity sha256", () => {
  const doc = buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  const row = doc.rows[0]!;
  const expected = [
    [
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_JSON_REL_V1,
      "apply_plan",
    ],
    [BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1, "evidence"],
    [BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1, "parity_proof"],
  ] as const;
  assert.equal(row.bound_artifacts_v1.length, 3);
  for (let i = 0; i < expected.length; i++) {
    const [rel, entry] = expected[i]!;
    assert.equal(row.bound_artifacts_v1[i]!.artifact_rel_path, rel);
    assert.equal(row.bound_artifacts_v1[i]!.entry_type, entry);
    assert.equal(row.bound_artifacts_v1[i]!.sha256_at_binding, fileSha(rel));
  }
});

test("artifact writes are allowlisted owner-decisions only", () => {
  const doc = buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  const root = mkdtempSync(path.join(tmpdir(), "ge-supa-approval-"));
  try {
    const written =
      writeBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalArtifactsV1({
        rootDir: root,
        doc,
      });
    assert.deepEqual(
      [
        ...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_ALLOWED_WRITE_REL_PATHS_V1,
      ],
      [
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_JSON_REL_V1,
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_MD_REL_V1,
      ],
    );
    assert.equal(written.json_rel_path, BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_JSON_REL_V1);
    assert.equal(written.md_rel_path, BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_MD_REL_V1);
    const body = readFileSync(path.join(root, written.json_rel_path), "utf8");
    assert.ok(body.includes("supabase_retailer_links_update_existing_primary_only"));
    assert.ok(body.includes('"supabase_mutation_authorized": false'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("source forbids apply helpers and does not claim pages closed", () => {
  assert.ok(!LIB_SOURCE.includes("BUCKPARTS_IO_CAPABILITY=MUTATION"));
  assert.ok(!LIB_SOURCE.includes("applyScopedFridgeRetailerLinksWriteV1"));
  assert.ok(!LIB_SOURCE.includes("pages_claimed_closed: true"));
  assert.ok(!LIB_SOURCE.includes("conversion_claimed: true"));
});
