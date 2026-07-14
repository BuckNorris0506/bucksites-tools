import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_EXCLUDED_XWF_SUPERSESSION_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_FORBIDDEN_FILTER_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_MD_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_TARGET_SLUGS_V1,
  buildBuckpartsFridgeModelPdpGeClosableApplyPlanOwnerReviewV1,
  writeBuckpartsFridgeModelPdpGeClosableApplyPlanArtifactsV1,
} from "./buckparts-fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-14T18:45:00.000Z");

test("contract is read-only; founder approval required; no mutation authorized", () => {
  const plan = buildBuckpartsFridgeModelPdpGeClosableApplyPlanOwnerReviewV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.equal(plan.contract, BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_CONTRACT_V1);
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.mutation_authorized, false);
  assert.equal(plan.owner_approval_required, true);
  assert.equal(plan.apply_authorized, false);
  assert.equal(plan.apply_plan_authorized, false);
  assert.equal(plan.csv_apply_authorized, false);
  assert.equal(plan.supabase_mutation_authorized, false);
  assert.equal(plan.retailer_links_mutation_authorized, false);
  assert.equal(plan.buy_cta_authorized, false);
  assert.equal(plan.link_promotion_authorized, false);
  assert.equal(plan.xwf_promotion_authorized, false);
  assert.equal(plan.pages_claimed_closed, false);
  assert.equal(plan.buyer_path_claimed_closed, false);
  assert.equal(plan.conversion_claimed, false);
  assert.equal(plan.conversion_or_revenue, "UNKNOWN");
  assert.ok(plan.founder_approval_fields_required.includes("explicit_apply_authorization_for_session"));
});

test("exact 4-slug scope and explicit 3 exclusions; no XWF promotion", () => {
  const plan = buildBuckpartsFridgeModelPdpGeClosableApplyPlanOwnerReviewV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.deepEqual(
    [...plan.scope.target_slugs].sort(),
    [...BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_TARGET_SLUGS_V1].sort(),
  );
  assert.equal(plan.scope.target_slug_count, 4);
  assert.equal(plan.scope.forbidden_filter, BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_FORBIDDEN_FILTER_V1);
  assert.deepEqual(
    plan.exclusions.map((e) => e.slug).sort(),
    [
      ...BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_EXCLUDED_XWF_SUPERSESSION_SLUGS_V1,
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
    ].sort(),
  );
  assert.equal(plan.exclusions.length, 3);
  assert.ok(plan.exclusions.every((e) => e.included_in_plan === false));

  for (const row of plan.planned_changes) {
    assert.ok(
      (BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_TARGET_SLUGS_V1 as readonly string[]).includes(
        row.model_slug,
      ),
    );
    assert.notEqual(row.filter_slug, "xwf");
    assert.equal(row.apply_authorized, false);
    assert.equal(row.pages_claimed_closed, false);
  }
  assert.ok(!plan.unique_retailer_links_deltas.some((d) => d.filter_slug === "xwf"));
});

test("depends on OWNER_BROWSER_PASS for MWFP/XWFE; proposed URLs and update kinds", () => {
  const plan = buildBuckpartsFridgeModelPdpGeClosableApplyPlanOwnerReviewV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.equal(plan.plan_status, "PROPOSED_OWNER_REVIEW_READY");
  assert.equal(plan.summary.planned_model_filter_rows, 5);
  assert.equal(plan.summary.unique_retailer_links_deltas, 2);
  assert.equal(plan.summary.update_existing_primary_rows, 2);
  assert.equal(plan.summary.insert_primary_rows, 0);

  const byKey = Object.fromEntries(
    plan.planned_changes.map((r) => [`${r.model_slug}::${r.filter_slug}`, r]),
  );
  assert.ok(byKey["ge-gfe24jgkww::smartwater-mwfp"]);
  assert.ok(byKey["ge-gfe24jgkww::xwfe"]);
  assert.ok(byKey["ge-gfe27jmkes::xwfe"]);
  assert.ok(byKey["ge-gne25jmkww::xwfe"]);
  assert.ok(byKey["ge-pvd28bymfs::xwfe"]);

  for (const row of plan.planned_changes) {
    assert.equal(row.owner_browser_proof_source.classification, "OWNER_BROWSER_PASS");
    assert.equal(row.proposed_retailer_name, "GE Appliance Parts");
    assert.equal(row.proposed_browser_truth_classification, "direct_buyable");
    assert.equal(row.retailer_links_delta.change_kind, "update_existing_primary_row");
    assert.ok(row.current_csv_search_placeholder_state.search_placeholder_only);
    assert.match(row.proposed_official_manufacturer_direct_buy_url, /\/store\/parts\/spec\//);
    assert.ok(!row.proposed_official_manufacturer_direct_buy_url.includes("search.jsp"));
  }

  const unique = Object.fromEntries(
    plan.unique_retailer_links_deltas.map((d) => [d.filter_slug, d]),
  );
  assert.equal(
    unique["smartwater-mwfp"]!.proposed_url,
    "https://www.geapplianceparts.com/store/parts/spec/MWFP",
  );
  assert.equal(
    unique.xwfe!.proposed_url,
    "https://www.geapplianceparts.com/store/parts/spec/XWFE",
  );
  assert.deepEqual(unique["smartwater-mwfp"]!.affected_model_slugs, ["ge-gfe24jgkww"]);
  assert.deepEqual(unique.xwfe!.affected_model_slugs, [
    "ge-gfe24jgkww",
    "ge-gfe27jmkes",
    "ge-gne25jmkww",
    "ge-pvd28bymfs",
  ]);
});

test("source forbids mutation surfaces; write-artifacts only drafts", () => {
  assert.ok(!LIB_SOURCE.includes("createClient"));
  assert.ok(!LIB_SOURCE.includes("--apply"));
  assert.ok(!/writeFileSync\([^\n]*retailer_links/.test(LIB_SOURCE));
  assert.deepEqual(
    [...BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_ALLOWED_WRITE_REL_PATHS_V1],
    [
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1,
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_MD_REL_V1,
    ],
  );

  const plan = buildBuckpartsFridgeModelPdpGeClosableApplyPlanOwnerReviewV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  const tmp = mkdtempSync(path.join(tmpdir(), "ge-closable-apply-plan-"));
  try {
    const written = writeBuckpartsFridgeModelPdpGeClosableApplyPlanArtifactsV1({
      rootDir: tmp,
      report: plan,
    });
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
