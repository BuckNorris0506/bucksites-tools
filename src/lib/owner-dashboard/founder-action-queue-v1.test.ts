import assert from "node:assert/strict";
import test from "node:test";

import type { CommandCenterV2Report } from "../../../scripts/lib/buckparts-command-center-v2-types";
import { RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1 } from "../../../scripts/lib/buckparts-runner-safety-contract-v1";
import {
  FOUNDER_ACTION_QUEUE_CONTRACT_V1,
  buildFounderActionQueueForOwnerDashboard,
  buildFounderActionQueueV1,
  founderActionQueueInputFromCommandCenterJson,
  sortFounderActionQueueRows,
  type FounderActionQueueCommandCenterInput,
  type FounderActionQueueRowV1,
} from "./founder-action-queue-v1";

function minimalQueueInput(overrides?: Partial<FounderActionQueueCommandCenterInput>): FounderActionQueueCommandCenterInput {
  const base: FounderActionQueueCommandCenterInput = {
    next_best_action: "Next best from Command Center root.",
    execution_guidance: {
      next_move_mode: "READ_ONLY",
      mutating_blocked: false,
      mutating_block_reasons: [],
    },
    command_center_v2: {
      next_owner_action: "Jared: decide affiliate program posture.",
      amazon_rescue: {
        next_agent_action: "Run read-only audit of queue tokens.",
        next_owner_action: "",
        human_browser_required_tokens: [],
        status: "OK",
      },
      affiliate_readiness: { status: "OK", next_owner_action: "", next_agent_action: "" },
      deploy_live_site_status: { status: "OK", live_site_monitor: null },
      unknown_or_human_review: { status: "OK", next_owner_action: "", blocker: null },
    },
  };
  return { ...base, ...overrides, command_center_v2: { ...base.command_center_v2, ...overrides?.command_center_v2 } };
}

function assertNoAgentSafeUnlessReadOnly(rows: FounderActionQueueRowV1[]): void {
  for (const r of rows) {
    if (r.status === "agent_safe") {
      assert.equal(
        r.mutation_authority,
        "read_only",
        `agent_safe row ${r.id} must be read_only-only (got ${r.mutation_authority})`,
      );
    }
  }
}

test("buildFounderActionQueueV1 returns contract and 3–7 rows from fixture-like Command Center input", () => {
  const q = buildFounderActionQueueV1(minimalQueueInput());
  assert.equal(q.contract, FOUNDER_ACTION_QUEUE_CONTRACT_V1);
  assert.ok(q.rows.length >= 3 && q.rows.length <= 7);
  assertNoAgentSafeUnlessReadOnly(q.rows);
});

test("needs_owner rows sort before agent_safe (owner-specific first)", () => {
  const ownerHeavy: FounderActionQueueRowV1 = {
    id: "queue-owner-v2",
    title: "Owner",
    status: "needs_owner",
    owner_burden: "low",
    recommended_actor: "founder",
    mutation_authority: "owner_approval_required",
    evidence_basis: "test",
    next_action: "short",
  };
  const agent: FounderActionQueueRowV1 = {
    id: "queue-amazon-agent",
    title: "Agent",
    status: "agent_safe",
    owner_burden: "low",
    recommended_actor: "agent",
    mutation_authority: "read_only",
    evidence_basis: "test",
    next_action: "read-only audit",
  };
  const sorted = sortFounderActionQueueRows([agent, ownerHeavy]);
  assert.equal(sorted[0]!.status, "needs_owner");
  assert.ok(sorted.findIndex((r) => r.status === "needs_owner") < sorted.findIndex((r) => r.status === "agent_safe"));
});

test("mutating_blocked prevents amazon lane from being agent_safe even with read-only language", () => {
  const q = buildFounderActionQueueV1(
    minimalQueueInput({
      execution_guidance: {
        next_move_mode: "READ_ONLY",
        mutating_blocked: true,
        mutating_block_reasons: ["gate"],
      },
      command_center_v2: {
        ...minimalQueueInput().command_center_v2,
        amazon_rescue: {
          next_agent_action: "Dry-run read-only audit of frozen tokens.",
          next_owner_action: "",
          human_browser_required_tokens: [],
          status: "OK",
        },
      },
    }),
  );
  const amazon = q.rows.find((r) => r.id === "queue-amazon-agent");
  assert.ok(amazon);
  assert.notEqual(amazon!.status, "agent_safe");
  assertNoAgentSafeUnlessReadOnly(q.rows);
});

test("founderActionQueueInputFromCommandCenterJson maps nested v2 (digest-shaped fixture)", () => {
  const raw = {
    next_best_action: "NBA",
    execution_guidance: { next_move_mode: "READ_ONLY", mutating_blocked: false, mutating_block_reasons: [] },
    command_center_v2: {
      next_owner_action: "Owner act",
      deploy_live_site_status: {
        status: "OK",
        live_site_monitor: { runtime_status: "OK", routes: [{ ok: true }, { ok: false }] },
      },
      amazon_rescue: { next_agent_action: "Agent act", next_owner_action: "", human_browser_required_tokens: [], status: "OK" },
      affiliate_readiness: { status: "ATTENTION", next_owner_action: "Fix programs", next_agent_action: "" },
      unknown_or_human_review: { status: "OK", next_owner_action: "", blocker: null },
    },
  };
  const input = founderActionQueueInputFromCommandCenterJson(raw);
  assert.equal(input.command_center_v2.affiliate_readiness.status, "ATTENTION");
  const q = buildFounderActionQueueV1(input);
  assert.equal(q.contract, FOUNDER_ACTION_QUEUE_CONTRACT_V1);
  assert.ok(q.rows.some((r) => r.id === "queue-affiliate"));
});

test("buildFounderActionQueueForOwnerDashboard wires Command Center v2 envelope to queue contract", () => {
  const v2Stub = {
    next_owner_action: "Owner from v2 root.",
    amazon_rescue: {
      status: "OK" as const,
      next_agent_action: "read-only verify queue",
      next_owner_action: "",
      human_browser_required_tokens: [] as string[],
      registry_path: "",
      registry_load_error: null,
      registry_entry_count: 0,
      fresh_search_top_tokens: [] as string[],
      asin_collision_policy_review_tokens: [] as string[],
      frozen_operator_hold_tokens: [] as string[],
      live_outcome_recorded_tokens: [] as string[],
      operator_decision_required_tokens: [] as string[],
      next_allowed_agent_token: null,
      blocker: null,
    },
    affiliate_readiness: {
      status: "OK" as const,
      next_agent_action: "",
      next_owner_action: "",
      blocker: null,
    },
    unknown_or_human_review: {
      status: "OK" as const,
      next_agent_action: "",
      next_owner_action: "",
      blocker: null,
    },
    deploy_live_site_status: {
      status: "OK" as const,
      next_agent_action: "",
      next_owner_action: "",
      blocker: null,
      live_site_monitor: null,
    },
  } as unknown as CommandCenterV2Report;

  const q = buildFounderActionQueueForOwnerDashboard({
    next_best_action: "Root next best.",
    execution_guidance: {
      next_move_mode: "READ_ONLY",
      mutating_blocked: false,
      mutating_block_reasons: [],
    },
    command_center_v2: v2Stub,
  });
  assert.equal(q.contract, FOUNDER_ACTION_QUEUE_CONTRACT_V1);
  assert.ok(q.rows.length >= 3);
  assert.ok(q.rows.some((r) => r.id === "queue-owner-v2"));
  assertNoAgentSafeUnlessReadOnly(q.rows);
});

test("Runner safety: execution npm allowlist is fixed triple (Runner Step v1 only)", () => {
  assert.deepStrictEqual([...RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1], ["lint", "build", "buckparts:operator-proof"]);
});
