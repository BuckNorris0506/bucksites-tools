import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import {
  assertCommandCenterClosureRequiresValidation,
  assertCursorValidationMayProceedFromBundle,
  assertHyperAgentIngestNotTruthClosure,
  assertOneProductWorkAllowedOrRedirected,
  COMMAND_CENTER_STATUS_UPDATE_PACKET_CONTRACT_V1,
  COMMAND_CENTER_TASK_PACKET_CONTRACT_V1,
  CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED,
  CURSOR_VALIDATION_PACKET_CONTRACT_V1,
  HYPERAGENT_BATCH_BUNDLE_CONTRACT_V1,
  HYPERAGENT_BATCH_MANIFEST_CONTRACT_V1,
  HYPERAGENT_FORBIDDEN_TRUTH_CLOSURE_STATUSES_V1,
  HYPERAGENT_INGEST_PACKET_CONTRACT_V1,
  type HyperAgentBatchBundleV1,
  type HyperAgentBatchPacketV1,
  isForbiddenHyperAgentTruthClosureStatusV1,
  isHyperAgentDiscoveryStatusV1,
  isSyntheticHyperAgentPacketBodyV1,
  OPS_AGENT_WORKFLOW_DOC_REL_V1,
  shouldRedirectOneProductSafeLinkWork,
  validateHyperAgentBatchBundleForCursorValidationV1,
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

  test("workflow doc requires full HyperAgent packet bodies for Cursor validation", () => {
    const doc = readFileSync(WORKFLOW_DOC, "utf8");
    assert.match(doc, /buckparts_hyperagent_batch_bundle_v1/);
    assert.match(doc, /FULL_HYPERAGENT_PACKET_BODIES_REQUIRED/);
    assert.match(doc, /DEV_ONLY-materialize-fridge-hyperagent-ingest-bundle-v1/);
    assert.match(doc, /INVALID_FOR_TRUTH_VALIDATION/);
  });

  test("full Mission Control packet bundle passes authenticity gate", () => {
    const slugs = Array.from({ length: 26 }, (_, i) => `cohort-slug-${i}`);
    const packets: HyperAgentBatchPacketV1[] = slugs.map((slug) => ({
      contract: HYPERAGENT_INGEST_PACKET_CONTRACT_V1,
      ingest_id: randomUUID(),
      task_id: "0d6c0f26-25cc-4a4e-95ab-d5e78d148664",
      slug,
      created_at: "2026-06-04T05:32:11.447633+00:00",
      discovery_status: "DISCOVERY_COMPLETE",
      truth_closure_claimed: false,
      batch_factory_state_at_discovery: "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF",
      proposed_state: "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF",
      state_changed_from_batch_factory: false,
      read_only: true,
      data_mutation: false,
      identity_status: "CONFIRMED_ACTIVE",
      specialist_outputs: [
        { specialist: "Discovery", summary: "Searched OEM buyer-path candidates" },
        { specialist: "TruthRisk", summary: "Verified identity and wrong-part risk" },
      ],
      proven_facts: ["PROVEN (Mission Control): example fact"],
      inferred_facts: [],
      unknown_facts: [],
      packet_body_source: "hyperagent_mission_control",
    }));

    const bundle: HyperAgentBatchBundleV1 = {
      contract: HYPERAGENT_BATCH_BUNDLE_CONTRACT_V1,
      manifest: {
        contract: HYPERAGENT_BATCH_MANIFEST_CONTRACT_V1,
        manifest_id: randomUUID(),
        task_id: "0d6c0f26-25cc-4a4e-95ab-d5e78d148664",
        total_slugs: 26,
        discovery_status: "DISCOVERY_COMPLETE",
        truth_closure_claimed: false,
        slug_index: slugs.map((slug) => ({
          slug,
          proposed_state: "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF",
        })),
      },
      packets,
      packet_count: 26,
    };

    const result = validateHyperAgentBatchBundleForCursorValidationV1(bundle);
    assert.equal(result.authentic, true);
    assert.equal(result.failure_code, null);
    assert.equal(result.errors.length, 0);
    assert.doesNotThrow(() => assertCursorValidationMayProceedFromBundle(result));
  });

  test("stub/materialized packet bundle fails FULL_HYPERAGENT_PACKET_BODIES_REQUIRED", () => {
    const stubPacket: HyperAgentBatchPacketV1 = {
      contract: HYPERAGENT_INGEST_PACKET_CONTRACT_V1,
      ingest_id: "materialized-gswf-0",
      task_id: "0d6c0f26-25cc-4a4e-95ab-d5e78d148664",
      slug: "gswf",
      discovery_status: "DISCOVERY_COMPLETE",
      truth_closure_claimed: false,
      batch_factory_state_at_discovery: "APPLY_ELIGIBLE_WITH_EXISTING_PROOF",
      proposed_state: "CONFLICT_REQUIRES_RECONCILIATION",
      state_changed_from_batch_factory: true,
      read_only: true,
      specialist_outputs: [
        { specialist: "Discovery", summary: "Discovery for gswf" },
        { specialist: "TruthRisk", summary: "TruthRisk for gswf" },
      ],
      materialized_from_manifest: true,
      packet_body_source: "materialized",
    };

    const syn = isSyntheticHyperAgentPacketBodyV1(stubPacket);
    assert.equal(syn.synthetic, true);
    assert.ok(syn.reasons.some((r) => r.includes("materialized_from_manifest")));

    const packets = Array.from({ length: 26 }, (_, i) =>
      i === 0
        ? stubPacket
        : {
            ...stubPacket,
            slug: `slug-${i}`,
            ingest_id: `materialized-slug-${i}`,
          },
    );

    const bundle: HyperAgentBatchBundleV1 = {
      contract: HYPERAGENT_BATCH_BUNDLE_CONTRACT_V1,
      manifest: {
        contract: HYPERAGENT_BATCH_MANIFEST_CONTRACT_V1,
        manifest_id: randomUUID(),
        task_id: "0d6c0f26-25cc-4a4e-95ab-d5e78d148664",
        total_slugs: 26,
        discovery_status: "DISCOVERY_COMPLETE",
        truth_closure_claimed: false,
      },
      packets,
      packet_count: 26,
    };

    const result = validateHyperAgentBatchBundleForCursorValidationV1(bundle);
    assert.equal(result.authentic, false);
    assert.equal(result.failure_code, CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED);
    assert.ok(result.synthetic_packet_slugs.includes("gswf"));
    assert.throws(() => assertCursorValidationMayProceedFromBundle(result));
  });

  test("synthetic bundle cannot imply state-change confirmation via authenticity gate", () => {
    const result = validateHyperAgentBatchBundleForCursorValidationV1({
      contract: HYPERAGENT_BATCH_BUNDLE_CONTRACT_V1,
      manifest: {
        contract: HYPERAGENT_BATCH_MANIFEST_CONTRACT_V1,
        manifest_id: randomUUID(),
        task_id: "t",
        total_slugs: 1,
        discovery_status: "DISCOVERY_COMPLETE",
        truth_closure_claimed: false,
      },
      packets: [
        {
          contract: HYPERAGENT_INGEST_PACKET_CONTRACT_V1,
          ingest_id: "materialized-x-0",
          task_id: "t",
          slug: "x",
          discovery_status: "DISCOVERY_COMPLETE",
          truth_closure_claimed: false,
          batch_factory_state_at_discovery: "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF",
          proposed_state: "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED",
          state_changed_from_batch_factory: true,
          specialist_outputs: [
            { specialist: "Discovery", summary: "Discovery for x" },
            { specialist: "TruthRisk", summary: "TruthRisk for x" },
          ],
          materialized_from_manifest: true,
        },
      ],
      packet_count: 1,
    }, 1);

    assert.equal(result.authentic, false);
    assert.equal(result.failure_code, CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED);
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
