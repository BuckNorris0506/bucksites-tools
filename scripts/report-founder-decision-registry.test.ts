import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { FOUNDER_DECISION_REGISTRY_CONTRACT_V1 } from "../src/lib/owner-dashboard/founder-decision-registry-v1";
import { runReportFounderDecisionRegistryV1 } from "./report-founder-decision-registry";

const FRIDGE_ARTIFACT_REL = "data/owner-decisions/fridge-buyer-path-batch-approval-v1.json";
const FRIDGE_BATCH_PROPOSED_ID = "fridge-buyer-path-batch-proposal-v1-0fec4a7b623a";
const FRIDGE_BATCH_PACKET_ID = `fridge_buyer_path_batch_approval_v1:${FRIDGE_BATCH_PROPOSED_ID}`;

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

test("report-founder-decision-registry accepts fridge buyer-path batch approval artifact on disk", () => {
  const repoRoot = process.cwd();
  const artifactPath = path.join(repoRoot, FRIDGE_ARTIFACT_REL);
  if (!existsSync(artifactPath)) {
    const dir = mkdtempSync(path.join(tmpdir(), "fdr-report-fridge-"));
    const od = path.join(dir, "data", "owner-decisions");
    mkdirSync(od, { recursive: true });
    writeFileSync(
      path.join(od, "fridge-buyer-path-batch-approval-v1.json"),
      JSON.stringify({
        contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
        read_only: true,
        data_mutation: false,
        rows: [
          {
            decision_id: `decision-2026-05-31-fridge-buyer-path-batch-${FRIDGE_BATCH_PROPOSED_ID}`,
            source_queue_row_id: "queue-fridge-buyer-path-batch-proposal-v1",
            source_decision_packet_id: FRIDGE_BATCH_PACKET_ID,
            decided_at: "2026-05-31T06:33:19.430Z",
            decision_status: "approved",
            owner_note: "Planning-only approval.",
            allowed_next_scope: "read_only_agent",
            evidence_required_before_mutation: false,
            prohibited_actions_still_apply: ["No Supabase."],
            fridge_buyer_path_batch_approval_context_v1: {
              review_packet_contract: "fridge_buyer_path_batch_approval_v1",
              founder_option_id: "approve_for_next_planning_only",
              proposed_batch_id: FRIDGE_BATCH_PROPOSED_ID,
            },
          },
        ],
      }),
      "utf8",
    );
    const prev = process.env.BUCKPARTS_FRIDGE_BUYER_PATH_BATCH_APPROVAL_PROPOSED_BATCH_ID;
    process.env.BUCKPARTS_FRIDGE_BUYER_PATH_BATCH_APPROVAL_PROPOSED_BATCH_ID = FRIDGE_BATCH_PROPOSED_ID;
    try {
      const m = runReportFounderDecisionRegistryV1(dir);
      assert.equal(m.fridge_buyer_path_batch_approval_decision_rows, 1);
      assert.equal(m.active_mutation_approvals, 0);
      assert.equal(m.fridge_buyer_path_batch_approval_digest_match.kind, "MATCHED");
      if (m.fridge_buyer_path_batch_approval_digest_match.kind === "MATCHED") {
        assert.equal(
          m.fridge_buyer_path_batch_approval_digest_match.source_decision_packet_id,
          FRIDGE_BATCH_PACKET_ID,
        );
        assert.equal(m.fridge_buyer_path_batch_approval_digest_match.allowed_next_scope, "read_only_agent");
      }
    } finally {
      if (prev === undefined) delete process.env.BUCKPARTS_FRIDGE_BUYER_PATH_BATCH_APPROVAL_PROPOSED_BATCH_ID;
      else process.env.BUCKPARTS_FRIDGE_BUYER_PATH_BATCH_APPROVAL_PROPOSED_BATCH_ID = prev;
    }
    return;
  }

  const parsed = JSON.parse(readFileSync(artifactPath, "utf8")) as { rows: unknown[] };
  assert.equal(Array.isArray(parsed.rows), true);
  assert.equal(parsed.rows.length, 1);

  const prev = process.env.BUCKPARTS_FRIDGE_BUYER_PATH_BATCH_APPROVAL_PROPOSED_BATCH_ID;
  process.env.BUCKPARTS_FRIDGE_BUYER_PATH_BATCH_APPROVAL_PROPOSED_BATCH_ID = FRIDGE_BATCH_PROPOSED_ID;
  try {
    const m = runReportFounderDecisionRegistryV1(repoRoot);
    assert.ok(m.fridge_buyer_path_batch_approval_decision_rows >= 1);
    assert.equal(m.active_mutation_approvals, 0);
    assert.equal(m.fridge_buyer_path_batch_approval_digest_match.kind, "MATCHED");
    if (m.fridge_buyer_path_batch_approval_digest_match.kind === "MATCHED") {
      assert.equal(
        m.fridge_buyer_path_batch_approval_digest_match.source_decision_packet_id,
        FRIDGE_BATCH_PACKET_ID,
      );
      assert.equal(m.fridge_buyer_path_batch_approval_digest_match.allowed_next_scope, "read_only_agent");
    }
    const latest = m.latest_decisions.find((row) => row.source_decision_packet_id === FRIDGE_BATCH_PACKET_ID);
    assert.ok(latest);
    assert.equal(latest!.allowed_next_scope, "read_only_agent");
  } finally {
    if (prev === undefined) delete process.env.BUCKPARTS_FRIDGE_BUYER_PATH_BATCH_APPROVAL_PROPOSED_BATCH_ID;
    else process.env.BUCKPARTS_FRIDGE_BUYER_PATH_BATCH_APPROVAL_PROPOSED_BATCH_ID = prev;
  }
});
