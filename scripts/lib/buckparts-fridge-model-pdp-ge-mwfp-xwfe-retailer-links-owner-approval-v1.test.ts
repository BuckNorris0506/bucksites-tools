import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1,
} from "./buckparts-fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review-v1";
import { BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1 } from "./buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_AFFECTED_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_DECISION_ID_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_EXCLUSIONS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_FILTERS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_MD_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1,
  buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksOwnerApprovalV1,
  writeBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksOwnerApprovalArtifactsV1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-owner-approval-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-owner-approval-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-14T19:15:00.000Z");

function fileSha(rel: string): string {
  return createHash("sha256")
    .update(readFileSync(path.join(ROOT, rel)))
    .digest("hex");
}

test("no apply/mutation; exact 2 filters/URLs; XWF cannot be promoted", () => {
  const doc = buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksOwnerApprovalV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.equal(
    doc.packet_contract,
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_CONTRACT_V1,
  );
  assert.equal(doc.read_only, true);
  assert.equal(doc.data_mutation, false);
  assert.equal(doc.apply_authorized, false);
  assert.equal(doc.mutation_authorized, false);
  assert.equal(doc.rows.length, 1);

  const row = doc.rows[0]!;
  assert.equal(
    row.decision_id,
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_DECISION_ID_V1,
  );
  const ctx =
    row.buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_owner_approval_context_v1;
  assert.equal(ctx.apply_authorized, false);
  assert.equal(ctx.mutation_authorized, false);
  assert.equal(ctx.apply_not_executed, true);
  assert.equal(ctx.autonomous_apply_authorized, false);
  assert.equal(ctx.xwf_promotion_authorized, false);
  assert.equal(ctx.approved_updates, 2);
  assert.equal(ctx.approved_inserts, 0);
  assert.equal(ctx.approved_deletes, 0);
  assert.equal(
    ctx.allowed_future_mutation_type,
    "retailer_links_csv_update_existing_primary_only",
  );
  assert.deepEqual(
    [...ctx.approved_filter_slugs],
    [...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_FILTERS_V1],
  );
  assert.ok(!ctx.approved_filter_slugs.includes("xwf"));
  assert.deepEqual(
    [...ctx.exclusions].sort(),
    [...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_EXCLUSIONS_V1].sort(),
  );
  assert.ok(ctx.exclusions.includes("xwf"));

  for (const d of ctx.approved_deltas) {
    assert.equal(d.change_kind, "update_existing_primary_row");
    assert.equal(
      d.proposed_affiliate_url,
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1[
        d.filter_slug as keyof typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1
      ],
    );
    assert.equal(d.proposed_retailer_name, "GE Appliance Parts");
    assert.equal(d.proposed_retailer_key, "oem-parts-catalog");
    assert.equal(d.proposed_browser_truth_classification, "direct_buyable");
  }
  assert.ok(row.prohibited_actions_still_apply.some((p) => /xwf/i.test(p)));
});

test("binds plan and proof sha256; affected slug scope exact", () => {
  const doc = buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksOwnerApprovalV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  const row = doc.rows[0]!;
  const ctx =
    row.buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_owner_approval_context_v1;
  assert.deepEqual(
    [...ctx.affected_potentially_closable_model_slugs].sort(),
    [...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_AFFECTED_SLUGS_V1].sort(),
  );

  const planSha = fileSha(BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1);
  const proofSha = fileSha(BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1);
  const byRel = Object.fromEntries(
    row.bound_artifacts_v1.map((b) => [b.artifact_rel_path, b]),
  );
  assert.equal(
    byRel[BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1]!.sha256_at_binding,
    planSha,
  );
  assert.equal(
    byRel[BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1]!
      .sha256_at_binding,
    proofSha,
  );
  assert.ok(row.owner_note.includes(planSha));
  assert.ok(row.owner_note.includes(proofSha));
});

test("source forbids mutation surfaces; write-artifacts only owner-decisions drafts", () => {
  assert.ok(!LIB_SOURCE.includes("createClient"));
  assert.ok(!/writeFileSync\([^\n]*retailer_links\.csv/.test(LIB_SOURCE));
  assert.ok(!/writeFileSync\([^\n]*compatibility_mappings/.test(LIB_SOURCE));
  assert.ok(LIB_SOURCE.includes("apply_not_executed: true"));
  assert.ok(LIB_SOURCE.includes("autonomous_apply_authorized: false"));
  assert.ok(LIB_SOURCE.includes("xwf_promotion_authorized: false"));
  assert.deepEqual(
    [...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_ALLOWED_WRITE_REL_PATHS_V1],
    [
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_JSON_REL_V1,
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_MD_REL_V1,
    ],
  );

  const doc = buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksOwnerApprovalV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  const tmp = mkdtempSync(path.join(tmpdir(), "ge-mwfp-xwfe-approval-"));
  try {
    const written = writeBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksOwnerApprovalArtifactsV1({
      rootDir: tmp,
      doc,
    });
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
