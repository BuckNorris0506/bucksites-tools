import assert from "node:assert/strict";
import test from "node:test";

import { AMAZON_RESCUE_HUMAN_VERIFICATION_DEFAULT_TOKENS } from "../../../scripts/lib/amazon-rescue-human-verification-packet-v1";
import {
  BATCH_MISSING_EVIDENCE_AMAZON_SELF_PREFIX_V1,
  BATCH_MISSING_EVIDENCE_UNKNOWN_BUYER_PATH_V1,
  buildBatchProductionReviewReportV1,
  parseBatchProductionReviewCliInputV1,
} from "./batch-production-lane-v1";
import {
  BATCH_AMAZON_RESCUE_DEFAULT_COHORT_TOKENS_V1,
  BATCH_AMAZON_RESCUE_DEFAULT_SOURCE_MAX_ROWS_V1,
  BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1,
  buildBatchProductionRowsFromAmazonRescueDefaultV1,
} from "./batch-production-amazon-rescue-source-v1";

const FIXTURE_FILTERS = `brand_slug,slug,oem_part_number,name,replacement_interval_months,notes
lg,adq75795101,ADQ75795101,LG ADQ75795101,6,"note"
samsung,da97-08006b,DA97-08006B,Samsung DA97-08006B,6,"note"
`;

const FIXTURE_LINKS = `filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key
adq75795101,OEM parts catalog,https://example.com/adq,true,0,oem-parts-catalog
da97-08006b,OEM parts catalog,https://example.com/da97,true,0,oem-parts-catalog
`;

const FIXTURE_CONTROLS = JSON.stringify({
  entries: [
    {
      token: "ADQ75795101",
      status: "FROZEN_OPERATOR_HOLD",
      reason: "hold",
    },
  ],
});

function fixtureDeps(overrides?: {
  evidenceFiles?: string[];
  tokens?: string[];
  maxRows?: number;
}) {
  const files: Record<string, string> = {
    "/repo/data/filters.csv": FIXTURE_FILTERS,
    "/repo/data/retailer_links.csv": FIXTURE_LINKS,
    "/repo/data/ops/amazon-rescue-token-controls.json": FIXTURE_CONTROLS,
  };
  return {
    readTextFile: (p: string) => files[p] ?? "",
    listEvidenceFilenames: () => overrides?.evidenceFiles ?? [],
    tokens: overrides?.tokens,
    maxRows: overrides?.maxRows ?? BATCH_AMAZON_RESCUE_DEFAULT_SOURCE_MAX_ROWS_V1,
  };
}

test("cohort tokens align with amazon-rescue-human-verification default list", () => {
  assert.deepEqual(
    [...BATCH_AMAZON_RESCUE_DEFAULT_COHORT_TOKENS_V1],
    [...AMAZON_RESCUE_HUMAN_VERIFICATION_DEFAULT_TOKENS],
  );
});

test("amazon-rescue-default source produces capped rows with rescue_target and unknown buyer path", () => {
  const built = buildBatchProductionRowsFromAmazonRescueDefaultV1(
    "/repo",
    fixtureDeps({ tokens: ["ADQ75795101", "DA97-08006B"] }),
  );
  assert.equal(built.source, BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1);
  assert.equal(built.read_only, true);
  assert.equal(built.data_mutation, false);
  assert.equal(built.rows.length, 2);
  for (const row of built.rows) {
    assert.equal(row.candidate_kind, "rescue_target");
    assert.equal(row.buyer_path_safety, "unknown");
    assert.equal(row.wrong_purchase_risk, "unknown");
    assert.equal(row.source_queue_row_id, "queue-amazon-agent");
    assert.ok(row.read_only_rationale?.includes("PROVEN:"));
  }
});

test("source rows through report keep may_mutate false and missing evidence for unknown path", () => {
  const built = buildBatchProductionRowsFromAmazonRescueDefaultV1(
    "/repo",
    fixtureDeps({ tokens: ["ADQ75795101", "DA97-08006B"] }),
  );
  const report = buildBatchProductionReviewReportV1({
    rows: built.rows,
    generated_at: "t",
  });
  assert.equal(report.batch_size, 2);
  for (const c of report.candidates) {
    assert.equal(c.may_mutate, false);
    assert.equal(c.requires_owner_approval_before_mutation, true);
    for (const item of BATCH_MISSING_EVIDENCE_UNKNOWN_BUYER_PATH_V1) {
      assert.ok(c.missing_evidence.includes(item));
    }
    assert.ok(c.missing_evidence.includes(BATCH_MISSING_EVIDENCE_AMAZON_SELF_PREFIX_V1));
  }
});

test("stdin parse still works independently of source mode", () => {
  const input = parseBatchProductionReviewCliInputV1(
    JSON.stringify([{ row_id: "x", part_token: "T", source_reason: "test" }]),
  );
  assert.equal(input.rows?.length, 1);
});

test("maxRows cap limits source builder output", () => {
  const built = buildBatchProductionRowsFromAmazonRescueDefaultV1(
    "/repo",
    fixtureDeps({ tokens: ["ADQ75795101", "DA97-08006B", "EXTRA"], maxRows: 1 }),
  );
  assert.equal(built.rows.length, 1);
});
