import assert from "node:assert/strict";
import test from "node:test";

import { AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1 } from "./ap-model-first-evidence-queue-v1";
import {
  AP_MODEL_FIRST_EVIDENCE_QUEUE_ALLOWLIST_COMMAND_V1,
  lookupDispatchAllowlistEntryV1,
} from "./buckparts-command-center-dispatch-allowlist-v1";
import { bindWorkExactCommandV1, loadPackageScriptsV1 } from "./buckparts-executive-command-eligibility-v1";

const REPO_ROOT = process.cwd();

test("AP model-first evidence queue allowlist row matches the proven worker command", () => {
  assert.equal(
    AP_MODEL_FIRST_EVIDENCE_QUEUE_ALLOWLIST_COMMAND_V1,
    AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1,
  );
  const entry = lookupDispatchAllowlistEntryV1(AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1);
  assert.ok(entry);
  assert.equal(entry?.command_kind, "read_only_report");
  assert.equal(entry?.owner_review_required, false);
  assert.equal(entry?.mutation_posture.mutation_allowed, false);
  assert.equal(entry?.mutation_posture.data_mutation, false);
  assert.equal(entry?.mutation_posture.read_only, true);
  assert.equal(entry?.no_artifact_allowed, true);
  assert.equal(entry?.exact_command.includes("--apply"), false);
});

test("AP model-first evidence queue command is Executive-dispatch eligible", () => {
  const judged = bindWorkExactCommandV1({
    rootDir: REPO_ROOT,
    exact_command: AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1,
    package_scripts: loadPackageScriptsV1(REPO_ROOT),
  });
  assert.equal(judged.eligibility, true);
  assert.equal(judged.ineligible_reason, null);
  assert.equal(judged.eligibility_epistemic, "PROVEN");
  assert.equal(judged.founder_gate, "not_required_for_read_only_dispatch");
});
