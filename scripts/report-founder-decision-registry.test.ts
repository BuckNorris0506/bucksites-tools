import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { FOUNDER_DECISION_REGISTRY_CONTRACT_V1 } from "../src/lib/owner-dashboard/founder-decision-registry-v1";
import { runReportFounderDecisionRegistryV1 } from "./report-founder-decision-registry";

test("report-founder-decision-registry run (empty owner-decisions dir)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fdr-report-empty-"));
  const m = runReportFounderDecisionRegistryV1(dir);
  assert.equal(m.contract, "founder_decision_registry_read_model_v1");
  assert.equal(m.read_only, true);
  assert.equal(m.data_mutation, false);
  assert.equal(m.total_documents, 0);
});

test("report-founder-decision-registry run reads data/owner-decisions/*.json", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fdr-report-with-"));
  const od = path.join(dir, "data", "owner-decisions");
  mkdirSync(od, { recursive: true });
  writeFileSync(
    path.join(od, "sample.json"),
    JSON.stringify({
      contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      rows: [
        {
          decision_id: "d-x",
          source_queue_row_id: "q-x",
          source_decision_packet_id: "decision_packet_v1:q-x",
          decided_at: "2026-05-01T00:00:00.000Z",
          decision_status: "deferred",
          owner_note: "Later",
          allowed_next_scope: "none",
          evidence_required_before_mutation: false,
          prohibited_actions_still_apply: ["x"],
        },
      ],
    }),
    "utf8",
  );
  const m = runReportFounderDecisionRegistryV1(dir);
  assert.equal(m.total_documents, 1);
  assert.equal(m.valid_rows, 1);
});
