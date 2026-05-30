import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  REFRIGERATOR_MODEL_FIRST_FOUNDER_APPROVAL_DRAFT_ALLOWED_PREFIX_V1,
  REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_FOUNDER_APPROVAL_PACKET_CONTRACT_V1,
  REFRIGERATOR_MODEL_FIRST_QA_APPROVAL_PACKET_COMMAND_CENTER_CONTRACT_V1,
  RefrigeratorFounderApprovalDraftPathErrorV1,
  buildRefrigeratorModelFirstMappingReviewFounderApprovalPacketV1,
  buildRefrigeratorModelFirstQaApprovalPacketCommandCenterLaneV1,
  readProductCsvSnapshotForFounderApprovalPacketTestV1,
  validateRefrigeratorFounderApprovalDraftOutputPathV1,
  writeRefrigeratorModelFirstMappingReviewFounderApprovalPacketDraftV1,
} from "./refrigerator-model-first-mapping-review-founder-approval-packet-v1";
import {
  formatRefrigeratorModelFirstQaBatchPostApplyRecommendedNextActionV1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1,
  detectRefrigeratorModelFirstQaBatchPostApplyV1,
} from "./refrigerator-model-first-qa-batch-post-apply-v1";
import { buildRefrigeratorModelFirstBatchResolverV1 } from "./refrigerator-model-first-batch-resolver-v1";

const REPO_ROOT = process.cwd();

const MANIFEST_REL =
  "data/fridge/batch-production/model-first-input-v1/fridge-models-batch-v1.json";

const TEST_DRAFT_OUT =
  `${REFRIGERATOR_MODEL_FIRST_FOUNDER_APPROVAL_DRAFT_ALLOWED_PREFIX_V1}test-founder-approval-packet-v1.md`;

const FORBIDDEN_MUTATION_PATHS = [
  "data/filters.csv",
  "data/retailer_links.csv",
  "data/fridge_models.csv",
  "data/compatibility_mappings.csv",
];

test("packet reflects post-apply batch complete with all 20 models PROVEN", () => {
  const packet = buildRefrigeratorModelFirstMappingReviewFounderApprovalPacketV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(
    packet.contract,
    REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_FOUNDER_APPROVAL_PACKET_CONTRACT_V1,
  );
  assert.equal(packet.inspect_summary.batch_qa_cleanup_applied, true);
  assert.equal(packet.inspect_summary.removals_applied, REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1.removals_applied);
  assert.equal(packet.inspect_summary.proven_model_count, 20);
  assert.equal(packet.inspect_summary.remaining_mapping_review_count, 0);
  assert.equal(packet.inspect_summary.mapping_review_model_count, 0);
  assert.equal(packet.inspect_summary.samsung_marketing_token_cross_reference_resolved, true);
  assert.equal(packet.brand_sections.length, 0);
});

test("markdown frames post-apply QA state with all models PROVEN", () => {
  const packet = buildRefrigeratorModelFirstMappingReviewFounderApprovalPacketV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.match(packet.markdown, /post-apply QA state/i);
  assert.match(packet.markdown, /Models at PASS \/ PROVEN \| 20/i);
  assert.match(packet.markdown, /Remaining MAPPING_REVIEW_REQUIRED \| 0/i);
  assert.match(packet.markdown, /Samsung HAF-QIN\/HAF-CIN/i);
});

test("command center lane surfaces post-apply batch-complete inspect summary", () => {
  const lane = buildRefrigeratorModelFirstQaApprovalPacketCommandCenterLaneV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const resolver = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const postApplyState = detectRefrigeratorModelFirstQaBatchPostApplyV1({ resolver });
  assert.ok(postApplyState);

  assert.equal(
    lane.contract,
    REFRIGERATOR_MODEL_FIRST_QA_APPROVAL_PACKET_COMMAND_CENTER_CONTRACT_V1,
  );
  assert.equal(lane.inspect_summary.proven_model_count, 20);
  assert.equal(
    lane.inspect_summary.recommended_next_action,
    formatRefrigeratorModelFirstQaBatchPostApplyRecommendedNextActionV1(postApplyState!),
  );
});

test("draft output path must be under fridge batch-production drafts", () => {
  assert.throws(
    () =>
      validateRefrigeratorFounderApprovalDraftOutputPathV1({
        rootDir: REPO_ROOT,
        outArg: "data/compatibility_mappings.csv",
      }),
    RefrigeratorFounderApprovalDraftPathErrorV1,
  );
});

test("writing draft does not mutate product CSVs", () => {
  const before = readProductCsvSnapshotForFounderApprovalPacketTestV1(
    REPO_ROOT,
    FORBIDDEN_MUTATION_PATHS,
  );

  const packet = buildRefrigeratorModelFirstMappingReviewFounderApprovalPacketV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });

  try {
    writeRefrigeratorModelFirstMappingReviewFounderApprovalPacketDraftV1({
      rootDir: REPO_ROOT,
      outArg: TEST_DRAFT_OUT,
      packet,
      force: true,
    });
  } finally {
    if (existsSync(path.join(REPO_ROOT, TEST_DRAFT_OUT))) {
      rmSync(path.join(REPO_ROOT, TEST_DRAFT_OUT));
    }
  }

  for (const [rel, content] of before.entries()) {
    assert.equal(readFileSync(path.join(REPO_ROOT, rel), "utf8"), content);
  }
});
