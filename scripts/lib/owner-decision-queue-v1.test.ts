import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildOwnerDecisionQueueCommandCenterLaneV1,
} from "./owner-decision-queue-command-center-v1";
import {
  commandDisplayV1,
  runBuckpartsRunnerV1,
  type RunnerSpawnFnV1,
} from "./buckparts-runner-v1";
import {
  buildOwnerDecisionQueueProjectionV1,
  deriveOwnerDecisionRequestIdV1,
  missingOwnerDecisionQueueFallbackV1,
  ownerDecisionRequestArtifactRelPathV1,
  OWNER_DECISION_QUEUE_CONTRACT_V1,
  OWNER_DECISION_QUEUE_MANIFEST_REL_V1,
  OWNER_DECISION_REQUEST_CONTRACT_V1,
  resolveOwnerDecisionRequestEffectiveStatusV1,
  upsertOwnerDecisionRequestFromRunnerHaltV1,
  type OwnerDecisionRequestV1,
} from "../../src/lib/owner-dashboard/owner-decision-queue-v1";
import { bindArtifactsAtHashesV1 } from "./truth-ledger-v1";

function withTempRoot(run: (root: string) => void): void {
  const root = mkdtempSync(path.join(tmpdir(), "odq-v1-"));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeRegistryRow(root: string, slug: string): void {
  mkdirSync(path.join(root, "data/owner-decisions"), { recursive: true });
  const artifactRel = `data/owner-decisions/test-approval-artifact-${slug}.json`;
  writeFileSync(path.join(root, artifactRel), '{"approval":true}\n', "utf8");
  const bound_artifacts_v1 = bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: [{ artifact_rel_path: artifactRel, entry_type: "founder_approval" }],
  });
  writeFileSync(
    path.join(root, "data/owner-decisions/test-approval.json"),
    `${JSON.stringify(
      {
        contract: "founder_decision_registry_v1",
        read_only: true,
        data_mutation: false,
        rows: [
          {
            decision_id: `approval-${slug}`,
            source_queue_row_id: "queue-test",
            source_decision_packet_id: `owner_decision_request_v1:${slug}`,
            decided_at: "2026-06-01T00:00:00.000Z",
            decision_status: "approved",
            owner_note: `Approved mutation for ${slug}`,
            allowed_next_scope: "owner_mutation_approved",
            evidence_required_before_mutation: true,
            prohibited_actions_still_apply: [
              "Do not run mutating npm scripts unless founder explicitly instructs otherwise.",
            ],
            bound_artifacts_v1,
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
}

function writePendingRequest(root: string, request: OwnerDecisionRequestV1): string {
  const rel = ownerDecisionRequestArtifactRelPathV1(request.decision_request_id);
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(request, null, 2)}\n`);
  const manifestAbs = path.join(root, OWNER_DECISION_QUEUE_MANIFEST_REL_V1);
  mkdirSync(path.dirname(manifestAbs), { recursive: true });
  writeFileSync(
    manifestAbs,
    `${JSON.stringify(
      {
        contract: OWNER_DECISION_QUEUE_CONTRACT_V1,
        read_only: true,
        data_mutation: false,
        mutation_authorized: false,
        generated_at: "2026-06-27T00:00:00.000Z",
        request_count: 1,
        pending_count: 1,
        request_artifact_paths: [rel],
        requests: [
          {
            decision_request_id: request.decision_request_id,
            request_artifact_rel_path: rel,
            status: request.status,
            decision_type: request.decision_type,
            target_slugs: request.target_slugs,
            source_system: request.source_system,
            updated_at: request.updated_at,
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  return rel;
}

test("missing queue fallback", () => {
  withTempRoot((root) => {
    const fallback = missingOwnerDecisionQueueFallbackV1({
      generated_at: "2026-06-27T00:00:00.000Z",
    });
    assert.equal(fallback.pending_count, 0);
    assert.ok(fallback.unknown_facts.length > 0);

    const projection = buildOwnerDecisionQueueProjectionV1({
      rootDir: root,
      now: () => new Date("2026-06-27T00:00:00.000Z"),
    });
    assert.equal(projection.manifest_present, false);
    assert.equal(projection.request_count, 0);
  });
});

test("pending decision projection", () => {
  withTempRoot((root) => {
    const request: OwnerDecisionRequestV1 = {
      contract: OWNER_DECISION_REQUEST_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      decision_request_id: "odr-v1-pending-test",
      created_at: "2026-06-27T00:00:00.000Z",
      updated_at: "2026-06-27T00:00:00.000Z",
      source_system: "buckparts_runner_v1:coverage_sprint_v1",
      source_artifact_path: "scripts/report-fridge-supabase-vs-csv-retailer-links-diff-v1.ts",
      target_slugs: ["ukf8001"],
      decision_type: "supabase_csv_parity_export",
      options: [],
      recommended_option: "approve_owner_mutation",
      evidence_summary: "Supabase win missing from CSV",
      blockers: ["FOUNDER_APPROVAL_REQUIRED"],
      risks: ["No auto-apply"],
      exact_downstream_action_if_approved: "Record registry row",
      exact_downstream_action_if_rejected: "Stay read-only",
      expires_or_stale_after: "2026-07-27T00:00:00.000Z",
      status: "PENDING_OWNER_DECISION",
      founder_decision_registry_bridge: {
        expected_allowed_next_scope: "owner_mutation_approved",
        matching_registry_sources: [],
        active_mutation_approval_decision_id: null,
      },
    };
    writePendingRequest(root, request);

    const projection = buildOwnerDecisionQueueProjectionV1({
      rootDir: root,
      now: () => new Date("2026-06-27T00:00:00.000Z"),
    });
    assert.equal(projection.pending_count, 1);
    assert.equal(projection.top_pending_decisions[0]?.effective_status, "PENDING_OWNER_DECISION");
    assert.equal(projection.top_pending_decisions[0]?.target_slugs[0], "ukf8001");
  });
});

test("stale decision projection", () => {
  withTempRoot((root) => {
    const request: OwnerDecisionRequestV1 = {
      contract: OWNER_DECISION_REQUEST_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      decision_request_id: "odr-v1-stale-test",
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z",
      source_system: "test",
      source_artifact_path: "data/test.json",
      target_slugs: ["da29-00020b"],
      decision_type: "owner_mutation_approval",
      options: [],
      recommended_option: "approve_owner_mutation",
      evidence_summary: "Expired request",
      blockers: [],
      risks: [],
      exact_downstream_action_if_approved: "registry",
      exact_downstream_action_if_rejected: "none",
      expires_or_stale_after: "2026-05-15T00:00:00.000Z",
      status: "PENDING_OWNER_DECISION",
      founder_decision_registry_bridge: {
        expected_allowed_next_scope: "owner_mutation_approved",
        matching_registry_sources: [],
        active_mutation_approval_decision_id: null,
      },
    };
    writePendingRequest(root, request);

    const effective = resolveOwnerDecisionRequestEffectiveStatusV1({
      request,
      registryRows: [],
      referenceTimeIso: "2026-06-27T00:00:00.000Z",
      rootDir: root,
    });
    assert.equal(effective, "STALE");

    const projection = buildOwnerDecisionQueueProjectionV1({
      rootDir: root,
      now: () => new Date("2026-06-27T00:00:00.000Z"),
    });
    assert.equal(projection.stale_count, 1);
    assert.equal(projection.stale_decisions[0]?.effective_status, "STALE");
  });
});

test("expired request cannot authorize mutation even when registry approval exists", () => {
  withTempRoot((root) => {
    writeRegistryRow(root, "odr-v1-expired-with-approval");
    const registry = JSON.parse(
      readFileSync(path.join(root, "data/owner-decisions/test-approval.json"), "utf8"),
    ) as { rows: Parameters<typeof resolveOwnerDecisionRequestEffectiveStatusV1>[0]["registryRows"] };
    const request: OwnerDecisionRequestV1 = {
      contract: OWNER_DECISION_REQUEST_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      decision_request_id: "odr-v1-expired-with-approval",
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z",
      source_system: "test",
      source_artifact_path: "data/test.json",
      target_slugs: ["odr-v1-expired-with-approval"],
      decision_type: "owner_mutation_approval",
      options: [],
      recommended_option: "approve_owner_mutation",
      evidence_summary: "Expired request with stale registry match",
      blockers: [],
      risks: [],
      exact_downstream_action_if_approved: "registry",
      exact_downstream_action_if_rejected: "none",
      expires_or_stale_after: "2026-05-15T00:00:00.000Z",
      status: "PENDING_OWNER_DECISION",
      founder_decision_registry_bridge: {
        expected_allowed_next_scope: "owner_mutation_approved",
        matching_registry_sources: [],
        active_mutation_approval_decision_id: null,
      },
    };
    writePendingRequest(root, request);

    const effective = resolveOwnerDecisionRequestEffectiveStatusV1({
      request,
      registryRows: registry.rows,
      referenceTimeIso: "2026-06-27T00:00:00.000Z",
      rootDir: root,
    });
    assert.equal(effective, "STALE");

    const freshRequest = {
      ...request,
      expires_or_stale_after: "2026-12-01T00:00:00.000Z",
    };
    assert.equal(
      resolveOwnerDecisionRequestEffectiveStatusV1({
        request: freshRequest,
        registryRows: registry.rows,
        referenceTimeIso: "2026-06-27T00:00:00.000Z",
        rootDir: root,
      }),
      "APPROVED",
    );
  });
});

test("unrelated slug in owner_note cannot satisfy mutation approval match", () => {
  withTempRoot((root) => {
    mkdirSync(path.join(root, "data/owner-decisions"), { recursive: true });
    writeFileSync(
      path.join(root, "data/owner-decisions/unrelated-note.json"),
      `${JSON.stringify(
        {
          contract: "founder_decision_registry_v1",
          read_only: true,
          data_mutation: false,
          rows: [
            {
              decision_id: "approval-unrelated",
              source_queue_row_id: "queue-test",
              source_decision_packet_id: "owner_decision_request_v1:other-slug",
              decided_at: "2026-06-01T00:00:00.000Z",
              decision_status: "approved",
              owner_note: "mentions ukf8001 in prose only",
              allowed_next_scope: "owner_mutation_approved",
              evidence_required_before_mutation: true,
              prohibited_actions_still_apply: [],
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    const request: OwnerDecisionRequestV1 = {
      contract: OWNER_DECISION_REQUEST_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      decision_request_id: "odr-v1-unrelated-slug",
      created_at: "2026-06-27T00:00:00.000Z",
      updated_at: "2026-06-27T00:00:00.000Z",
      source_system: "test",
      source_artifact_path: "data/parity-ukf8001.json",
      target_slugs: ["ukf8001"],
      decision_type: "owner_mutation_approval",
      options: [],
      recommended_option: "approve_owner_mutation",
      evidence_summary: "test",
      blockers: [],
      risks: [],
      exact_downstream_action_if_approved: "x",
      exact_downstream_action_if_rejected: "none",
      expires_or_stale_after: null,
      status: "PENDING_OWNER_DECISION",
      founder_decision_registry_bridge: {
        expected_allowed_next_scope: "owner_mutation_approved",
        matching_registry_sources: [],
        active_mutation_approval_decision_id: null,
      },
    };
    const effective = resolveOwnerDecisionRequestEffectiveStatusV1({
      request,
      registryRows: [
        {
          decision_id: "approval-unrelated",
          source_queue_row_id: "queue-test",
          source_decision_packet_id: "owner_decision_request_v1:other-slug",
          decided_at: "2026-06-01T00:00:00.000Z",
          decision_status: "approved",
          owner_note: "mentions ukf8001 in prose only",
          allowed_next_scope: "owner_mutation_approved",
          evidence_required_before_mutation: true,
          prohibited_actions_still_apply: [],
        },
      ],
      referenceTimeIso: "2026-06-27T00:00:00.000Z",
      rootDir: root,
    });
    assert.equal(effective, "PENDING_OWNER_DECISION");
  });
});

test("approved decision does not itself mutate", () => {
  withTempRoot((root) => {
    writeRegistryRow(root, "ukf8001");
    const request: OwnerDecisionRequestV1 = {
      contract: OWNER_DECISION_REQUEST_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      decision_request_id: "odr-v1-approved-bridge",
      created_at: "2026-06-27T00:00:00.000Z",
      updated_at: "2026-06-27T00:00:00.000Z",
      source_system: "test",
      source_artifact_path: "data/test.json",
      target_slugs: ["ukf8001"],
      decision_type: "owner_mutation_approval",
      options: [],
      recommended_option: "approve_owner_mutation",
      evidence_summary: "Bridge only",
      blockers: [],
      risks: [],
      exact_downstream_action_if_approved: "Run guarded apply separately",
      exact_downstream_action_if_rejected: "none",
      expires_or_stale_after: null,
      status: "PENDING_OWNER_DECISION",
      founder_decision_registry_bridge: {
        expected_allowed_next_scope: "owner_mutation_approved",
        matching_registry_sources: [],
        active_mutation_approval_decision_id: null,
      },
    };
    writePendingRequest(root, request);

    const projection = buildOwnerDecisionQueueProjectionV1({
      rootDir: root,
      now: () => new Date("2026-06-27T00:00:00.000Z"),
    });
    assert.equal(projection.approved_count, 1);
    assert.equal(projection.recently_approved_decisions[0]?.effective_status, "APPROVED");
    assert.equal(projection.mutation_authorized, false);
    assert.equal(projection.data_mutation, false);

    const retailerLinks = path.join(root, "data/retailer_links.csv");
    assert.equal(exists(retailerLinks), false);
  });
});

function exists(p: string): boolean {
  try {
    readFileSync(p);
    return true;
  } catch {
    return false;
  }
}

test("Runner halt creates decision request artifact", () => {
  withTempRoot((root) => {
    let spawnCalls = 0;
    const spawnFn: RunnerSpawnFnV1 = (command) => {
      spawnCalls += 1;
      const display = commandDisplayV1(command);
      if (display.includes("fridge-supabase-vs-csv")) {
        return {
          exit_code: 0,
          stdout: JSON.stringify({
            mutation_authorized: false,
            supabase_has_win_csv_missing_count: 2,
            target_slugs: ["ukf8001"],
            artifact_rel_path: "data/test-parity.json",
          }),
          stderr: "",
        };
      }
      return { exit_code: 0, stdout: "{}", stderr: "" };
    };

    const report = runBuckpartsRunnerV1({
      rootDir: root,
      missionId: "coverage_sprint_v1",
      spawnFn,
      writeArtifacts: false,
      now: () => new Date("2026-06-27T00:00:00.000Z"),
    });

    const diffStep = report.steps.find((s) => s.step_id === "fridge_supabase_csv_diff");
    assert.ok(diffStep);
    assert.equal(diffStep?.status, "HALTED");
    assert.ok(diffStep?.owner_decision_request_id);
    assert.ok(diffStep?.owner_decision_request_artifact_path);

    const upserted = upsertOwnerDecisionRequestFromRunnerHaltV1({
      rootDir: root,
      missionId: "coverage_sprint_v1",
      runId: report.run_id,
      stepId: "fridge_supabase_csv_diff",
      stepProvenance: "scripts/report-fridge-supabase-vs-csv-retailer-links-diff-v1.ts",
      haltReason: "FOUNDER_APPROVAL_REQUIRED",
      haltDetail: diffStep?.halt_detail ?? null,
      parsedJson: {
        mutation_authorized: false,
        supabase_has_win_csv_missing_count: 2,
        target_slugs: ["ukf8001"],
      },
      now: () => new Date("2026-06-27T00:00:00.000Z"),
    });

    const artifactAbs = path.join(root, upserted.request_artifact_rel_path);
    const onDisk = JSON.parse(readFileSync(artifactAbs, "utf8")) as OwnerDecisionRequestV1;
    assert.equal(onDisk.contract, OWNER_DECISION_REQUEST_CONTRACT_V1);
    assert.equal(onDisk.status, "PENDING_OWNER_DECISION");
    assert.equal(onDisk.mutation_authorized, false);
    assert.ok(spawnCalls > 0);
  });
});

test("Command Center lane renders top pending decisions", () => {
  withTempRoot((root) => {
    const requestId = deriveOwnerDecisionRequestIdV1({
      source_system: "buckparts_runner_v1:coverage_sprint_v1",
      step_id: "fridge_supabase_csv_diff",
      target_slugs: ["ukf8001"],
    });
    writePendingRequest(root, {
      contract: OWNER_DECISION_REQUEST_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      decision_request_id: requestId,
      created_at: "2026-06-27T00:00:00.000Z",
      updated_at: "2026-06-27T00:00:00.000Z",
      source_system: "buckparts_runner_v1:coverage_sprint_v1",
      source_artifact_path: "data/test-parity.json",
      target_slugs: ["ukf8001"],
      decision_type: "supabase_csv_parity_export",
      options: [],
      recommended_option: "approve_owner_mutation",
      evidence_summary: "Pending parity export",
      blockers: ["FOUNDER_APPROVAL_REQUIRED"],
      risks: [],
      exact_downstream_action_if_approved: "registry",
      exact_downstream_action_if_rejected: "none",
      expires_or_stale_after: "2026-07-27T00:00:00.000Z",
      status: "PENDING_OWNER_DECISION",
      founder_decision_registry_bridge: {
        expected_allowed_next_scope: "owner_mutation_approved",
        matching_registry_sources: [],
        active_mutation_approval_decision_id: null,
      },
    });

    const lane = buildOwnerDecisionQueueCommandCenterLaneV1({
      rootDir: root,
      now: () => new Date("2026-06-27T00:00:00.000Z"),
    });
    assert.equal(lane.contract, "owner_decision_queue_v1");
    assert.equal(lane.pending_count, 1);
    assert.equal(lane.top_pending_decisions.length, 1);
    assert.match(lane.recommended_next_action, /pending owner decision/i);
    assert.equal(lane.recommended_jq_path, ".command_center_v2.owner_decision_queue_v1");
  });
});
