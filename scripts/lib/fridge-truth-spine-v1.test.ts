import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFridgeTruthSpineV1,
  FRIDGE_EVIDENCE_ONLY_MISMATCH_SLUGS_V1,
  FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1,
  FRIDGE_TRUTH_SPINE_RECOMMENDED_NEXT_ACTION_V1,
  projectGeMwfpXwfeRetailerLinksSupabaseSyncForSpineV1,
} from "./fridge-truth-spine-v1";

const REPO_ROOT = process.cwd();

test("fridge_truth_spine_v1 is read_only with data_mutation false", async () => {
  const spine = await buildFridgeTruthSpineV1({
    rootDir: REPO_ROOT,
    skipLivePublicProbe: true,
  });
  assert.equal(spine.contract, "fridge_truth_spine_v1");
  assert.equal(spine.read_only, true);
  assert.equal(spine.data_mutation, false);
});

test("fridge_truth_spine_v1 surfaces CSV safe-path counts and evidence wins", async () => {
  const spine = await buildFridgeTruthSpineV1({
    rootDir: REPO_ROOT,
    skipLivePublicProbe: true,
  });
  assert.equal(typeof spine.csv_truth.safe_buyer_path_verdict, "string");
  assert.equal(typeof spine.csv_truth.linked_filters_with_safe_direct_buyable_primary, "number");
  assert.ok(spine.evidence_truth.linked_slugs_with_evidence_win_count >= 1);
  if (spine.supabase_csv_diff.supabase_truth_status === "CHECKED") {
    assert.ok(spine.supabase_csv_diff.checked_slug_count >= 1);
  }
});

test("fridge_truth_spine_v1 surfaces evidence-only slugs and public truth status", async () => {
  const spine = await buildFridgeTruthSpineV1({
    rootDir: REPO_ROOT,
    skipLivePublicProbe: true,
  });
  assert.deepEqual(spine.supabase_csv_diff.evidence_only_slugs, [
    ...FRIDGE_EVIDENCE_ONLY_MISMATCH_SLUGS_V1,
  ]);
  assert.ok(
    spine.public_truth.should_redo_fridge_products_now === "NO" ||
      spine.public_truth.should_redo_fridge_products_now === "UNKNOWN",
  );
  assert.ok(
    spine.public_truth.public_truth_status === "PUBLIC_TRUTHFUL" ||
      spine.public_truth.public_truth_status === "PUBLIC_PARTIAL" ||
      spine.public_truth.public_truth_status === "UNKNOWN",
  );
});

test("fridge_truth_spine_v1 does not authorize CSV apply", async () => {
  const spine = await buildFridgeTruthSpineV1({
    rootDir: REPO_ROOT,
    skipLivePublicProbe: true,
  });
  const action = spine.recommended_next_action.toLowerCase();
  assert.ok(
    action.includes("owner browser proof") ||
      action.includes("founder") ||
      action.includes("supabase-sync-owner-review"),
  );
  assert.ok(
    action.includes("do not claim conversion") ||
      action.includes("do not apply") ||
      action.includes("do not claim 4"),
  );
  assert.equal(action.includes("authorized apply"), false);
  assert.ok(spine.proven_facts.some((f) => f.includes("does not authorize")));
});

test("fridge_truth_spine_v1 surfaces GE DRIFTED READY exact_command for sync owner-review", async () => {
  const projected = projectGeMwfpXwfeRetailerLinksSupabaseSyncForSpineV1({
    contract: "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_parity_v1",
    overall_sync_status: "DRIFTED",
  });
  assert.equal(projected.dispatch_status, "READY");
  assert.equal(
    projected.exact_command,
    FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1,
  );
  assert.equal(projected.mutation_allowed, false);
  assert.equal(projected.supabase_write_authorized, false);
  assert.equal(projected.pages_claimed_closed, false);
  assert.equal(projected.conversion_or_revenue, "UNKNOWN");
  assert.deepEqual([...projected.filter_slugs], ["smartwater-mwfp", "xwfe"]);
  assert.deepEqual([...projected.excluded_filter_slugs], ["xwf"]);

  const spine = await buildFridgeTruthSpineV1({
    rootDir: REPO_ROOT,
    skipLivePublicProbe: true,
  });
  const ge = spine.ge_mwfp_xwfe_retailer_links_supabase_sync;
  if (ge.overall_sync_status === "DRIFTED") {
    assert.equal(ge.dispatch_status, "READY");
    assert.equal(
      ge.exact_command,
      FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1,
    );
    assert.ok(spine.recommended_next_action.includes(ge.exact_command));
  }
});

test("fridge_truth_spine_v1 surfaces live HTML proof milestone PASS 21 without conversion claim", async () => {
  const spine = await buildFridgeTruthSpineV1({
    rootDir: REPO_ROOT,
    skipLivePublicProbe: true,
  });
  const live = spine.model_pdp_live_html_proof;
  assert.equal(live.status, "PROVEN");
  assert.equal(live.contract, "buckparts_fridge_model_pdp_live_html_proof_pack_v1");
  assert.equal(live.LIVE_PROOF_PASS, 21);
  assert.equal(live.LIVE_PROOF_FAIL, 0);
  assert.equal(live.LIVE_PROOF_UNKNOWN, 0);
  assert.equal(live.slug_count, 21);
  assert.equal(live.proof_block_visible_count, 21);
  assert.equal(live.last_checked_visible_count, 21);
  assert.equal(live.mapped_filters_visible_count, 21);
  assert.equal(live.verified_link_and_go_present_count, 21);
  assert.equal(live.product_json_ld_commerce_absent_count, 21);
  assert.equal(live.search_placeholder_cta_absent_count, 21);
  assert.equal(live.conversion_claimed, false);
  assert.equal(live.conversion_or_revenue, "UNKNOWN");
  assert.equal(live.open_buyer_path_fail_count, 7);
  assert.equal(live.remain_no_buy_slug, "ge-gte18gsnrss");
  assert.equal(live.needs_owner_browser_proof_count, 6);
  assert.equal(
    live.recommended_jq_path,
    ".command_center_v2.fridge_truth_spine_v1.model_pdp_live_html_proof",
  );
  assert.ok(spine.source_contracts.includes("buckparts_fridge_model_pdp_live_html_proof_pack_v1"));
  assert.ok(spine.unknown_facts.some((f) => /conversion|revenue/i.test(f)));
});
