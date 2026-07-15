import assert from "node:assert/strict";
import test from "node:test";

import {
  assessApDemandSelectedEvidenceCompletenessV1,
  buildApDemandSelectedBatchCloseoutReadinessProofV1,
} from "./ap-demand-selected-batch-closeout-readiness-proof-v1";

const REPO_ROOT = process.cwd();

test("live demand-selected evidence is COMPLETE for current registry run", () => {
  const completeness = assessApDemandSelectedEvidenceCompletenessV1({
    rootDir: REPO_ROOT,
    run_id: "ap-demand-selected-batch-run-v1-2026-06-23",
    registry_stage: "read_only_evidence_collection_complete",
  });
  assert.equal(completeness.status, "COMPLETE");
  assert.equal(completeness.missing_slugs.length, 0);
  assert.equal(completeness.evidence_artifact_present, true);
  assert.equal(completeness.discovery_status, "DISCOVERY_COMPLETE");
  assert.equal(completeness.expected_slugs.length, 10);
});

test("missing evidence artifact yields exact missing list", () => {
  const completeness = assessApDemandSelectedEvidenceCompletenessV1({
    rootDir: REPO_ROOT,
    run_id: "ap-demand-selected-batch-run-v1-2026-06-23",
    registry_stage: "read_only_evidence_collection_complete",
    proposed_slugs: ["holmes-hapf30", "missing-slug-a"],
    fileExists: (abs) => !abs.includes("hyperagent-chat-discovery"),
  });
  assert.equal(completeness.status, "INCOMPLETE");
  assert.deepEqual(completeness.missing_slugs, ["holmes-hapf30", "missing-slug-a"]);
  assert.ok(
    completeness.missing_artifact_paths.some((p) =>
      p.includes("ap-demand-selected-batch-run-v1-2026-06-23.hyperagent-chat-discovery-v1.json"),
    ),
  );
});

test("closeout/readiness proof is read-only hard-stop with NOT_PROVEN closeout/apply", () => {
  const proof = buildApDemandSelectedBatchCloseoutReadinessProofV1({ rootDir: REPO_ROOT });
  assert.equal(proof.contract, "ap_demand_selected_batch_closeout_readiness_proof_v1");
  assert.equal(proof.read_only, true);
  assert.equal(proof.data_mutation, false);
  assert.equal(proof.mutation_authorized, false);
  assert.equal(proof.csv_apply_authorized, false);
  assert.equal(proof.supabase_mutation_authorized, false);
  assert.equal(proof.batch_closeout, "NOT_PROVEN");
  assert.equal(proof.apply_readiness, "NOT_PROVEN");
  assert.equal(proof.hard_stop, true);
  assert.equal(proof.conversion_or_revenue, "UNKNOWN");
  assert.equal(proof.pages_claimed_closed, false);
  assert.equal(proof.evidence_completeness.status, "COMPLETE");
  assert.match(proof.next_safe_action, /Hard-stop/i);
  assert.doesNotMatch(proof.next_safe_action, /re-run HyperAgent/i);
});
