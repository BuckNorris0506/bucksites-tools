import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFridgeTruthSpineV1,
  FRIDGE_EVIDENCE_ONLY_MISMATCH_SLUGS_V1,
  FRIDGE_TRUTH_SPINE_RECOMMENDED_NEXT_ACTION_V1,
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

test("fridge_truth_spine_v1 surfaces CSV 0/57 and 16/18 Supabase-win CSV-missing", async () => {
  const spine = await buildFridgeTruthSpineV1({
    rootDir: REPO_ROOT,
    skipLivePublicProbe: true,
  });
  assert.equal(spine.csv_truth.linked_filters_with_safe_direct_buyable_primary, 0);
  assert.equal(spine.csv_truth.safe_buyer_path_verdict, "PROVEN_TRUE");
  assert.ok(spine.csv_truth.primary_weak_reason_counts.SEARCH_PLACEHOLDER_PRIMARY >= 57);
  assert.equal(spine.evidence_truth.linked_slugs_with_evidence_win_count, 18);
  if (spine.supabase_csv_diff.supabase_truth_status === "CHECKED") {
    assert.equal(spine.supabase_csv_diff.supabase_has_win_csv_missing_count, 16);
    assert.equal(spine.supabase_csv_diff.evidence_only_not_in_supabase_count, 2);
  }
});

test("fridge_truth_spine_v1 surfaces evidence-only slugs and public truth NO redo", async () => {
  const spine = await buildFridgeTruthSpineV1({
    rootDir: REPO_ROOT,
    skipLivePublicProbe: true,
  });
  assert.deepEqual(spine.supabase_csv_diff.evidence_only_slugs, [
    ...FRIDGE_EVIDENCE_ONLY_MISMATCH_SLUGS_V1,
  ]);
  assert.equal(spine.public_truth.should_redo_fridge_products_now, "NO");
  assert.equal(spine.public_truth.public_truth_status, "PUBLIC_TRUTHFUL");
});

test("fridge_truth_spine_v1 does not authorize CSV apply", async () => {
  const spine = await buildFridgeTruthSpineV1({
    rootDir: REPO_ROOT,
    skipLivePublicProbe: true,
  });
  const action = spine.recommended_next_action.toLowerCase();
  assert.ok(action.includes("founder-approved"));
  assert.ok(action.includes("do not apply"));
  assert.equal(action.includes("authorized apply"), false);
  assert.ok(spine.proven_facts.some((f) => f.includes("does not authorize")));
});
