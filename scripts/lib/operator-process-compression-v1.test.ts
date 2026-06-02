import assert from "node:assert/strict";
import test from "node:test";

import { buildOperatorProcessCompressionLaneV1 } from "./operator-process-compression-v1";
import { buildExternalQualitySignalUsefulnessLaneV1 } from "./external-quality-signal-usefulness-v1";

test("operator_process_compression_v1 lane is read-only and references ship guard", () => {
  const lane = buildOperatorProcessCompressionLaneV1();
  assert.equal(lane.contract, "operator_process_compression_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.ship_guard_command, "npm run buckparts:ship-guard");
  assert.equal(lane.push_authorized, false);
  assert.equal(lane.buckparts_verified_link_authorized, false);
  assert.match(lane.current_problem, /copy-paste/i);
});

test("external_quality_signal_usefulness_v1 does not overstate decision integration", () => {
  const lane = buildExternalQualitySignalUsefulnessLaneV1({ rootDir: process.cwd() });
  assert.equal(lane.contract, "external_quality_signal_usefulness_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.netlify_api_authorized, false);
  assert.equal(lane.buckparts_verified_link_authorized, false);
  assert.equal(lane.github_workflows_present, "PROVEN");
  assert.ok(lane.github_workflow_basenames.length >= 3);
  assert.equal(lane.sentry_config_present, "PROVEN");
  assert.equal(lane.sentry_errors_feed_command_center, "NOT_PROVEN");
  assert.equal(lane.external_quality_signals_affect_decisions, "NOT_PROVEN");
  assert.match(lane.usefulness_standard, /blocks bad changes/i);
});
