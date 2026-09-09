import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  buildDecisionPriorsFrameworkProjectionFromRepoV1,
  loadCandidateExecutiveDecisionsFromOwnerDecisionRequestsV1,
  loadOwnerApprovalRecordSubstratesFromRegistryV1,
} from "./buckparts-decision-priors-framework-v1";

function writeTempOwnerArtifacts(): string {
  const root = mkdtempSync(path.join(tmpdir(), "bp-decision-priors-"));
  mkdirSync(path.join(root, "data/owner-decisions/queue/requests"), { recursive: true });

  writeFileSync(
    path.join(root, "data/owner-decisions/queue/requests/odr-v1-fixture.json"),
    JSON.stringify(
      {
        contract: "owner_decision_request_v1",
        read_only: true,
        data_mutation: false,
        mutation_authorized: false,
        decision_request_id: "odr-v1-fixture",
        created_at: "2026-08-10T12:00:00.000Z",
        updated_at: "2026-08-10T12:00:00.000Z",
        source_system: "test",
        source_artifact_path: "test",
        target_slugs: ["demo-slug"],
        decision_type: "guarded_apply_bridge",
        options: [],
        recommended_option: "approve_owner_mutation",
        evidence_summary: "fixture",
        blockers: [],
        risks: [],
        exact_downstream_action_if_approved: "none",
        exact_downstream_action_if_rejected: "none",
        expires_or_stale_after: null,
        status: "PENDING_OWNER_DECISION",
        decision_priors: ["no_autonomous_apply", "founder_authority_required"],
        founder_decision_registry_bridge: {
          expected_allowed_next_scope: "owner_mutation_approved",
          matching_registry_sources: [],
          active_mutation_approval_decision_id: null,
        },
      },
      null,
      2,
    ),
  );

  writeFileSync(
    path.join(root, "data/owner-decisions/fixture-disagreement-oar-v1.json"),
    JSON.stringify(
      {
        contract: "founder_decision_registry_v1",
        read_only: true,
        data_mutation: false,
        rows: [
          {
            decision_id: "decision-fixture-disagreement",
            source_queue_row_id: "odr-v1-fixture",
            source_decision_packet_id: "owner_decision_request_v1:odr-v1-fixture",
            decided_at: "2026-08-10T13:00:00.000Z",
            decision_status: "rejected",
            owner_note: "Founder rejects Executive recommendation for this fixture.",
            allowed_next_scope: "none",
            evidence_required_before_mutation: false,
            prohibited_actions_still_apply: ["Do not mutate production."],
            executive_recommendation_decision_priors: [
              "no_autonomous_apply",
              "founder_authority_required",
            ],
          },
        ],
      },
      null,
      2,
    ),
  );

  return root;
}

test("repo projection reuses ODR/OAR without creating a store and retains priors on disagreement", () => {
  const root = writeTempOwnerArtifacts();
  const candidates = loadCandidateExecutiveDecisionsFromOwnerDecisionRequestsV1(root);
  assert.equal(candidates.length, 1);
  assert.deepEqual(candidates[0]?.decision_priors, [
    "no_autonomous_apply",
    "founder_authority_required",
  ]);

  const oars = loadOwnerApprovalRecordSubstratesFromRegistryV1(root);
  assert.equal(oars.length, 1);
  assert.equal(oars[0]?.decision_status, "rejected");
  assert.deepEqual(oars[0]?.executive_recommendation_decision_priors, [
    "no_autonomous_apply",
    "founder_authority_required",
  ]);

  const projection = buildDecisionPriorsFrameworkProjectionFromRepoV1({
    rootDir: root,
    now: () => new Date("2026-08-10T14:00:00.000Z"),
  });
  assert.equal(projection.new_store_created, false);
  assert.equal(projection.nba_authority, false);
  assert.equal(projection.dispatch_authority, false);
  assert.equal(projection.daily_operator_authority, false);
  assert.equal(projection.command_center_authority, false);
  assert.equal(projection.tagged_candidate_count, 1);
  assert.equal(projection.disagreement_record_count, 1);
  assert.deepEqual(projection.disagreement_records[0]?.decision_priors, [
    "no_autonomous_apply",
    "founder_authority_required",
  ]);
  assert.equal(
    projection.disagreement_records[0]?.candidate_decision_request_id,
    "odr-v1-fixture",
  );
});
