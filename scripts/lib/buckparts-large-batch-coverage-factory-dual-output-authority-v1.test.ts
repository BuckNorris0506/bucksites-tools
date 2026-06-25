import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { resetFridgeAdapterAuditCacheV1 } from "@/lib/coverage-factory/adapters/fridge-coverage-factory-adapter-v1";
import { buildUcfDecisionAuthoritySnapshotV1 } from "@/lib/coverage-factory/ucf-decision-authority-cutover-v1";

import {
  assertDualOutputPromotionInvariantsV1,
  buildTopCandidatesUcfDispositionV1,
  GOAT_C1_LBCF_UCF_DUAL_OUTPUT_AUTHORITY_CONTRACT_V1,
} from "./buckparts-large-batch-coverage-factory-dual-output-authority-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

test.before(() => {
  resetFridgeAdapterAuditCacheV1();
});

test("dual-output helper builds registered slug rows with UCF authority", () => {
  const snapshot = buildUcfDecisionAuthoritySnapshotV1({ rootDir: ROOT, now: FIXED_NOW });
  const result = buildTopCandidatesUcfDispositionV1({
    topCandidates: [{ slug: "edr4rxd1", factory_state: "existing_live_product" }],
    snapshot,
  });
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]!.ucf_registered, true);
  assert.equal(result.rows[0]!.ucf_authority_source, "universal_coverage_factory_v1");
  assert.equal(result.rows[0]!.promotion_from_factory_state_alone, false);
  assert.equal(result.attention_required, false);
});

test("missing UCF snapshot fails closed to attention without throwing", () => {
  const result = buildTopCandidatesUcfDispositionV1({
    topCandidates: [{ slug: "edr4rxd1", factory_state: "publishable_amazon_candidate" }],
    snapshot: null,
  });
  assert.equal(result.attention_required, true);
  assert.ok(result.unknown_facts.length >= 1);
  assert.equal(result.rows[0]!.ucf_registered, true);
  assert.equal(result.rows[0]!.ucf_core_disposition, null);
});

test("promotion invariants reject row count mismatch", () => {
  assert.throws(
    () =>
      assertDualOutputPromotionInvariantsV1({
        topCandidates: [{ slug: "a", factory_state: "evidence_needed" }],
        ucfDispositionRows: [],
      }),
    /row counts must match/,
  );
});

test("dual-output contract constant is stable", () => {
  assert.equal(
    GOAT_C1_LBCF_UCF_DUAL_OUTPUT_AUTHORITY_CONTRACT_V1,
    "goat_c1_lbcf_ucf_dual_output_authority_v1",
  );
});
