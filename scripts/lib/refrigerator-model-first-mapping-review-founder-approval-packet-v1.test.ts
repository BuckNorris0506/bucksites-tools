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
  formatRefrigeratorModelFirstQaApprovalRecommendedNextActionV1,
  readProductCsvSnapshotForFounderApprovalPacketTestV1,
  validateRefrigeratorFounderApprovalDraftOutputPathV1,
  writeRefrigeratorModelFirstMappingReviewFounderApprovalPacketDraftV1,
} from "./refrigerator-model-first-mapping-review-founder-approval-packet-v1";

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

test("packet is read_only with QA framing and all mutation gates false", () => {
  const packet = buildRefrigeratorModelFirstMappingReviewFounderApprovalPacketV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(
    packet.contract,
    REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_FOUNDER_APPROVAL_PACKET_CONTRACT_V1,
  );
  assert.equal(packet.classification, "non-runtime");
  assert.equal(packet.packet_framing, "quality_assurance_wrong_purchase_prevention");
  assert.equal(packet.qa_framing.packet_purpose, "quality_assurance_wrong_purchase_prevention");
  assert.equal(packet.read_only, true);
  assert.equal(packet.data_mutation, false);
  assert.equal(packet.apply_authorized, false);
  assert.equal(packet.founder_approval_required, true);
  assert.equal(packet.founder_approval_status, "pending");
  assert.equal(packet.inspect_summary.apply_authorized, false);
  assert.equal(packet.inspect_summary.csv_apply_authorized, false);
  assert.equal(packet.inspect_summary.supabase_update_authorized, false);
  assert.equal(packet.inspect_summary.buy_link_mutation_authorized, false);
  assert.equal(packet.inspect_summary.public_page_change_authorized, false);
});

test("packet covers all 20 models with summary counts matching apply plan", () => {
  const packet = buildRefrigeratorModelFirstMappingReviewFounderApprovalPacketV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(packet.inspect_summary.mapping_review_model_count, 20);
  assert.equal(packet.inspect_summary.total_planned_removals, 53);
  assert.equal(packet.inspect_summary.total_planned_additions, 10);
  assert.equal(packet.inspect_summary.total_planned_keeps, 16);

  const modelCount = packet.brand_sections.reduce((sum, s) => sum + s.model_count, 0);
  assert.equal(modelCount, 20);
});

test("brand sections follow LG / Samsung / GE / Whirlpool / Frigidaire order", () => {
  const packet = buildRefrigeratorModelFirstMappingReviewFounderApprovalPacketV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.deepEqual(
    packet.brand_sections.map((s) => s.brand_label),
    ["LG", "Samsung", "GE", "Whirlpool", "Frigidaire"],
  );
  assert.deepEqual(packet.brand_sections[0]!.official_filter_families, ["LT1000P"]);
  assert.deepEqual(packet.brand_sections[1]!.official_filter_families, ["HAF-QIN", "HAF-CIN"]);
  assert.deepEqual(packet.brand_sections[2]!.official_filter_families, ["RPWFE"]);
  assert.deepEqual(packet.brand_sections[3]!.official_filter_families, [
    "EDR1RXD1",
    "EDR2RXD1",
    "EDR4RXD1",
  ]);
  assert.deepEqual(packet.brand_sections[4]!.official_filter_families, ["EPTWFU01", "ULTRAWF"]);
});

test("each model section includes remove/keep/add and mapping-review rationale", () => {
  const packet = buildRefrigeratorModelFirstMappingReviewFounderApprovalPacketV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  for (const section of packet.brand_sections) {
    for (const model of section.models) {
      assert.equal(model.confidence, "MAPPING_REVIEW_REQUIRED");
      assert.ok(model.official_filter_token_or_name);
      assert.ok(model.why_mapping_review_not_pass.length > 0);
      assert.ok(Array.isArray(model.rows_to_remove));
      assert.ok(Array.isArray(model.rows_to_keep));
      assert.ok(Array.isArray(model.rows_to_add));
    }
  }

  const lgLrfxs = packet.brand_sections[0]!.models.find((m) => m.fridge_slug === "lg-lrfxs3106s");
  assert.ok(lgLrfxs);
  assert.deepEqual(lgLrfxs!.rows_to_remove.sort(), [
    "lg-lrfxs3106s,lt600p",
    "lg-lrfxs3106s,lt800p",
  ]);
  assert.deepEqual(lgLrfxs!.rows_to_add, ["lg-lrfxs3106s,lt1000p"]);
});

test("markdown frames packet as QA wrong-purchase prevention with authorization boundaries", () => {
  const packet = buildRefrigeratorModelFirstMappingReviewFounderApprovalPacketV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.match(packet.markdown, /BuckParts Quality Assurance/i);
  assert.match(packet.markdown, /wrong-purchase prevention/i);
  assert.match(packet.markdown, /What this packet is/i);
  assert.match(packet.markdown, /Wrong-purchase risk/i);
  assert.match(packet.markdown, /MAPPING_REVIEW_REQUIRED/i);
  assert.match(packet.markdown, /PASS \/ PROVEN \(this batch\)/i);
  assert.match(packet.markdown, /Models at PASS \/ PROVEN \| 0/i);
  assert.match(packet.markdown, /QA gate role/i);
  assert.match(packet.markdown, /proposes corrections to existing compatibility_mappings\.csv rows/i);
  assert.match(packet.markdown, /not a request to add new filter products/i);
  assert.match(packet.markdown, /Authorization boundaries/i);
  assert.match(packet.markdown, /No buy-link changes are authorized/i);
  assert.match(packet.markdown, /No Supabase changes are authorized/i);
  assert.match(packet.markdown, /No public page changes are authorized/i);
  assert.match(packet.markdown, /No compatibility_mappings\.csv apply is authorized/i);
  assert.match(packet.markdown, /not PASS \/ not PROVEN until CSV is reconciled/i);
  assert.equal(packet.explicit_warnings.length, 6);
});

test("command center lane surfaces QA inspect summary without authorizing apply", () => {
  const lane = buildRefrigeratorModelFirstQaApprovalPacketCommandCenterLaneV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(
    lane.contract,
    REFRIGERATOR_MODEL_FIRST_QA_APPROVAL_PACKET_COMMAND_CENTER_CONTRACT_V1,
  );
  assert.equal(lane.packet_framing, "quality_assurance_wrong_purchase_prevention");
  assert.equal(lane.apply_authorized, false);
  assert.equal(
    lane.inspect_summary.recommended_next_action,
    formatRefrigeratorModelFirstQaApprovalRecommendedNextActionV1(20),
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
  const ok = validateRefrigeratorFounderApprovalDraftOutputPathV1({
    rootDir: REPO_ROOT,
    outArg: TEST_DRAFT_OUT,
  });
  assert.ok(ok.repoRelativePosix.startsWith(REFRIGERATOR_MODEL_FIRST_FOUNDER_APPROVAL_DRAFT_ALLOWED_PREFIX_V1));
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
