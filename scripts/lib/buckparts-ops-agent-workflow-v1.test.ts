import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import {
  assertCommandCenterClosureRequiresValidation,
  assertHyperAgentIngestNotTruthClosure,
  assertOneProductWorkAllowedOrRedirected,
  COMMAND_CENTER_STATUS_UPDATE_PACKET_CONTRACT_V1,
  COMMAND_CENTER_TASK_PACKET_CONTRACT_V1,
  CURSOR_VALIDATION_PACKET_CONTRACT_V1,
  HYPERAGENT_FORBIDDEN_TRUTH_CLOSURE_STATUSES_V1,
  HYPERAGENT_INGEST_PACKET_CONTRACT_V1,
  isForbiddenHyperAgentTruthClosureStatusV1,
  isHyperAgentDiscoveryStatusV1,
  OPS_AGENT_WORKFLOW_DOC_REL_V1,
  shouldRedirectOneProductSafeLinkWork,
} from "./buckparts-ops-agent-workflow-v1";

const ROOT = process.cwd();
const HANDOFF = path.join(ROOT, "docs", "BuckParts-HQ-HANDOFF.md");
const WORKFLOW_DOC = path.join(ROOT, OPS_AGENT_WORKFLOW_DOC_REL_V1);

describe("buckparts_ops_agent_workflow_v1 contracts", () => {
  test("workflow doc defines all four packet contracts", () => {
    const doc = readFileSync(WORKFLOW_DOC, "utf8");
    assert.match(doc, /buckparts_command_center_task_packet_v1/);
    assert.match(doc, /buckparts_hyperagent_ingest_packet_v1/);
    assert.match(doc, /buckparts_cursor_validation_packet_v1/);
    assert.match(doc, /buckparts_command_center_status_update_packet_v1/);
    assert.match(doc, /Command Center\n  ↓\nMission Control/);
  });

  test("HyperAgent discovery statuses are not truth-closure statuses", () => {
    for (const s of ["DISCOVERY_OPEN", "DISCOVERY_COMPLETE", "DISCOVERY_BLOCKED"]) {
      assert.ok(isHyperAgentDiscoveryStatusV1(s));
      assert.ok(!isForbiddenHyperAgentTruthClosureStatusV1(s));
    }
    for (const forbidden of HYPERAGENT_FORBIDDEN_TRUTH_CLOSURE_STATUSES_V1) {
      assert.ok(!isHyperAgentDiscoveryStatusV1(forbidden));
      assert.ok(isForbiddenHyperAgentTruthClosureStatusV1(forbidden));
    }
  });

  test("HyperAgent ingest rejects truth_closure_claimed and forbidden discovery_status", () => {
    assert.doesNotThrow(() =>
      assertHyperAgentIngestNotTruthClosure({
        discovery_status: "DISCOVERY_COMPLETE",
        truth_closure_claimed: false,
      }),
    );
    for (const bad of ["APPLY_ELIGIBLE_WITH_EXISTING_PROOF", "PROVEN", "VALIDATION_PASS"] as const) {
      assert.throws(() =>
        assertHyperAgentIngestNotTruthClosure({
          discovery_status: bad,
          truth_closure_claimed: false,
        }),
      );
    }
    assert.throws(() =>
      assertHyperAgentIngestNotTruthClosure({
        discovery_status: "DISCOVERY_OPEN",
        truth_closure_claimed: true as false,
      }),
    );
  });

  test("Command Center status update requires validation PASS with truth_closure_authorized", () => {
    assert.throws(() =>
      assertCommandCenterClosureRequiresValidation({
        validation: null,
        statusUpdate: {
          validation_id: "v1",
          requires_validation_id: true,
        },
      }),
    );
    assert.throws(() =>
      assertCommandCenterClosureRequiresValidation({
        validation: {
          validation_status: "VALIDATION_FAIL",
          truth_closure_authorized: false,
        },
        statusUpdate: {
          validation_id: "v1",
          requires_validation_id: true,
        },
      }),
    );
    assert.doesNotThrow(() =>
      assertCommandCenterClosureRequiresValidation({
        validation: {
          validation_status: "VALIDATION_PASS",
          truth_closure_authorized: true,
        },
        statusUpdate: {
          validation_id: "v1",
          requires_validation_id: true,
        },
      }),
    );
  });

  test("one-product safe-link work redirects to batch unless exception", () => {
    const redirect = shouldRedirectOneProductSafeLinkWork({
      mission_type: "SAFE_LINK_BATCH",
      one_product_exception: null,
      cohort_key: "refrigerator_water_single_slug_gswf",
    });
    assert.equal(redirect.redirect, true);
    assert.throws(() =>
      assertOneProductWorkAllowedOrRedirected({
        mission_type: "SAFE_LINK_BATCH",
        one_product_exception: null,
        cohort_key: "refrigerator_water_single_slug_gswf",
      }),
    );
    assert.doesNotThrow(() =>
      assertOneProductWorkAllowedOrRedirected({
        mission_type: "SAFE_LINK_BATCH",
        one_product_exception: "PROOF",
        cohort_key: "refrigerator_water_single_slug_gswf",
      }),
    );
    assert.doesNotThrow(() =>
      assertOneProductWorkAllowedOrRedirected({
        mission_type: "SAFE_LINK_BATCH",
        one_product_exception: null,
        cohort_key: "refrigerator_water_missing_safe_link",
      }),
    );
  });

  test("packet contract string constants are stable", () => {
    assert.equal(COMMAND_CENTER_TASK_PACKET_CONTRACT_V1, "buckparts_command_center_task_packet_v1");
    assert.equal(HYPERAGENT_INGEST_PACKET_CONTRACT_V1, "buckparts_hyperagent_ingest_packet_v1");
    assert.equal(CURSOR_VALIDATION_PACKET_CONTRACT_V1, "buckparts_cursor_validation_packet_v1");
    assert.equal(
      COMMAND_CENTER_STATUS_UPDATE_PACKET_CONTRACT_V1,
      "buckparts_command_center_status_update_packet_v1",
    );
  });
});

describe("HQ handoff ops-agent workflow doctrine", () => {
  test("handoff includes ops-agent workflow pipeline and batch-first default", () => {
    const handoff = readFileSync(HANDOFF, "utf8");
    assert.match(handoff, /## Ops-agent workflow v1/);
    assert.match(handoff, /Mission Control Orchestrator/);
    assert.match(handoff, /Structured ingest packet/);
    assert.match(handoff, /Validation result/);
    assert.match(handoff, /BuckParts-OPS-AGENT-WORKFLOW-V1\.md/);
    assert.match(handoff, /discovery\/workflow statuses/);
    assert.match(handoff, /batch-first by default/);
    assert.match(handoff, /TEST.*PROOF.*DEBUG.*BLOCKER_RECONCILIATION/s);
    assert.match(handoff, /Permanent repo tool/i);
  });
});
