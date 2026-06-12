import assert from "node:assert/strict";
import test from "node:test";

import { loadApOwnerReviewEvidenceIndexV1 } from "./air-purifier-owner-review-evidence-index-v1";

const REPO_ROOT = process.cwd();

test("live repo evidence index excludes shark-carbon-foam and marks winix-carbon-116131 hold", () => {
  const index = loadApOwnerReviewEvidenceIndexV1({ rootDir: REPO_ROOT });
  assert.ok(["PROVEN", "PARTIAL"].includes(index.source_status));

  const sharkCarbon = index.entries_by_slug.get("shark-carbon-foam");
  assert.ok(sharkCarbon);
  assert.equal(sharkCarbon.exclude_from_owner_review, true);
  assert.ok(
    sharkCarbon.disposition === "exclude_no_safe_path" ||
      sharkCarbon.disposition === "exclude_mapping_review_required",
  );
  assert.ok(index.excluded_slugs.includes("shark-carbon-foam"));

  const winixCarbon = index.entries_by_slug.get("winix-carbon-116131");
  assert.ok(winixCarbon);
  assert.equal(winixCarbon.hold_needs_owner_review, true);
  assert.equal(winixCarbon.exclude_from_owner_review, false);

  const holmes = index.entries_by_slug.get("holmes-hapf30");
  assert.ok(holmes);
  assert.equal(holmes.promote_pass_reference, true);
  assert.match(holmes.rationale, /returns zero results|search-placeholder defect/i);

  const sharkHp100 = index.entries_by_slug.get("shark-hepa-hp100");
  assert.ok(sharkHp100);
  assert.equal(sharkHp100.promote_pass_reference, false);
  assert.equal(sharkHp100.hold_needs_owner_review, true);
  assert.match(sharkHp100.rationale, /batch-v3 withholds stale PASS_REFERENCE promotion/i);
  assert.equal(sharkHp100.exclude_from_owner_review, false);
});
