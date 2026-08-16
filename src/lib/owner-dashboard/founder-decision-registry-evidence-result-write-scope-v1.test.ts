/**
 * Focused proof: owner_model_first_evidence_result_write_approved cannot light
 * existing CSV / Supabase / guarded-apply / manufacturer-rescue mutation gates.
 * Adding the enum does not authorize a write.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FOUNDER_DECISION_REGISTRY_MODEL_FIRST_EVIDENCE_RESULT_WRITE_SCOPE_V1,
  founderRegistryRowGrantsMutatingRepoAuthority,
  isFounderRegistryRowActiveMutationApproval,
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "./founder-decision-registry-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import {
  findMatchingActiveMutationApprovalForRequestV1,
  inferDecisionTypeFromRunnerStepV1,
  OWNER_DECISION_TYPE_MODEL_FIRST_EVIDENCE_RESULT_WRITE_V1,
  resolveOwnerDecisionRequestEffectiveStatusV1,
  type OwnerDecisionRequestV1,
} from "./owner-decision-queue-v1";
import {
  buildSupabaseCsvParityGuardedApplyMutationAuthorizationV1,
  findActiveFounderDecisionForSupabaseCsvParitySlug,
} from "../../../scripts/lib/supabase-csv-parity-guarded-apply-v1";
import { findActiveFounderDecisionForApSupabaseParityPlanV1 } from "../../../scripts/lib/air-purifier-supabase-apply-parity-mutation-gate-v1";
import { findActiveFounderDecisionForManufacturerRescueSlugV1 } from "../../../scripts/lib/manufacturer-rescue-guarded-apply-bridge-v1";

const NOW = "2026-08-15T21:00:00.000Z";
const APPLY_PLAN_4396508 =
  "data/fridge/batch-production/drafts/fridge-safe-link-4396508-apply-plan-proposal-v1.json";
const APPLY_PLAN_EDR4 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-edr4rxd1-v1.json";

function evidenceWriteRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-2026-08-15-ap-model-first-evidence-result-write",
    source_queue_row_id: "queue-ap-model-first-evidence-result-write-v1",
    source_decision_packet_id: "ap_model_first_evidence_result_write_grant_v1:recurring-class",
    decided_at: "2026-08-15T21:00:00.000Z",
    decision_status: "approved",
    owner_note:
      "Approve bounded AP model-first evidence result writes only. PENDING_OWNER_SIGNATURE until founder ratifies.",
    allowed_next_scope: FOUNDER_DECISION_REGISTRY_MODEL_FIRST_EVIDENCE_RESULT_WRITE_SCOPE_V1,
    evidence_required_before_mutation: true,
    expires_at: "2026-11-15T00:00:00.000Z",
    prohibited_actions_still_apply: [
      "Do not write packet-directory files.",
      "Do not mutate CSV or Supabase.",
      "Do not run --apply.",
    ],
    ...overrides,
  };
}

function mutationOarRequest(): OwnerDecisionRequestV1 {
  return {
    contract: "owner_decision_request_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    decision_request_id: "odr-v1-haystack-4396508",
    created_at: NOW,
    updated_at: NOW,
    source_system: "test",
    source_artifact_path: APPLY_PLAN_4396508,
    target_slugs: ["4396508", "edr4rxd1"],
    decision_type: "guarded_apply_bridge",
    options: [],
    recommended_option: "approve_owner_mutation",
    evidence_summary: "test",
    blockers: [],
    risks: [],
    exact_downstream_action_if_approved: "test",
    exact_downstream_action_if_rejected: "test",
    expires_or_stale_after: "2026-12-01T00:00:00.000Z",
    status: "PENDING_OWNER_DECISION",
    founder_decision_registry_bridge: {
      expected_allowed_next_scope: "owner_mutation_approved",
      matching_registry_sources: [],
      active_mutation_approval_decision_id: null,
    },
  };
}

test("new scope validates; enum presence does not grant mutation", () => {
  const v = validateFounderDecisionRegistryRowV1(evidenceWriteRow());
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.equal(
    v.row.allowed_next_scope,
    FOUNDER_DECISION_REGISTRY_MODEL_FIRST_EVIDENCE_RESULT_WRITE_SCOPE_V1,
  );
  assert.equal(isFounderRegistryRowActiveMutationApproval(v.row, NOW), false);
  assert.equal(founderRegistryRowGrantsMutatingRepoAuthority(v.row, NOW), false);
});

test("new scope requires owner_note, evidence gate, and expires_at", () => {
  assert.equal(
    validateFounderDecisionRegistryRowV1(evidenceWriteRow({ owner_note: "   " })).ok,
    false,
  );
  assert.equal(
    validateFounderDecisionRegistryRowV1(
      evidenceWriteRow({ evidence_required_before_mutation: false }),
    ).ok,
    false,
  );
  const noExpiry = { ...evidenceWriteRow() };
  delete noExpiry.expires_at;
  assert.equal(validateFounderDecisionRegistryRowV1(noExpiry).ok, false);
});

test("existing scopes still validate unchanged", () => {
  assert.equal(
    validateFounderDecisionRegistryRowV1({
      decision_id: "legacy-none",
      source_queue_row_id: "queue-legacy",
      source_decision_packet_id: "decision_packet_v1:queue-legacy",
      decided_at: "2026-05-08T12:00:00.000Z",
      decision_status: "deferred",
      owner_note: "Defer.",
      allowed_next_scope: "none",
      evidence_required_before_mutation: false,
      prohibited_actions_still_apply: ["Do not mutate production."],
    }).ok,
    true,
  );
  assert.equal(
    validateFounderDecisionRegistryRowV1({
      decision_id: "legacy-roa",
      source_queue_row_id: "queue-legacy",
      source_decision_packet_id: "decision_packet_v1:queue-legacy",
      decided_at: "2026-05-08T12:00:00.000Z",
      decision_status: "approved",
      owner_note: "Read-only.",
      allowed_next_scope: "read_only_agent",
      evidence_required_before_mutation: false,
      prohibited_actions_still_apply: ["Do not mutate production."],
    }).ok,
    true,
  );
});

test("approved evidence-write row with mutation slugs in text cannot light mutation gates", () => {
  const row = evidenceWriteRow({
    owner_note:
      "Class grant only. Mentions 4396508 edr4rxd1 holmes-hapf30 to prove haystack cannot authorize mutation.",
    source_decision_packet_id: `owner_decision_request_v1:odr-v1-haystack-4396508`,
  });
  const validated = validateFounderDecisionRegistryRowV1(row);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;

  assert.equal(isFounderRegistryRowActiveMutationApproval(validated.row, NOW), false);
  assert.equal(founderRegistryRowGrantsMutatingRepoAuthority(validated.row, NOW), false);

  const gate = founderRegistryRowPassesMutationApprovalGateV1({
    row: validated.row,
    referenceTimeIso: NOW,
    rootDir: process.cwd(),
  });
  assert.equal(gate.ok, false);
  if (!gate.ok) {
    assert.ok(gate.blockers.includes("founder_owner_mutation_approved_missing_or_inactive"));
  }

  const csvAuth = findActiveFounderDecisionForSupabaseCsvParitySlug({
    slug: "4396508",
    applyPlanRel: APPLY_PLAN_4396508,
    founderRows: [
      {
        row: validated.row,
        apply_context_target_slugs: ["4396508"],
        apply_context_apply_plan_rel_paths: [APPLY_PLAN_4396508],
      },
    ],
    nowIso: NOW,
    rootDir: process.cwd(),
  });
  assert.equal(csvAuth, null);

  const csvMutation = buildSupabaseCsvParityGuardedApplyMutationAuthorizationV1({
    founderRow: csvAuth,
    applyExecutorReady: true,
  });
  assert.equal(csvMutation.csv_apply_authorized, false);
  assert.equal(csvMutation.mutation_authorized, false);

  const apSupabase = findActiveFounderDecisionForApSupabaseParityPlanV1({
    rootDir: process.cwd(),
    planRel: "data/air-purifier/batch-production/drafts/unused-ap-supabase-plan-v1.json",
    plan: { planned_changes: [{ filter_slug: "holmes-hapf30" }] },
    nowIso: NOW,
    founderRows: [
      {
        row: validated.row,
        apply_context_target_slugs: ["holmes-hapf30"],
        apply_context_apply_plan_rel_paths: [
          "data/air-purifier/batch-production/drafts/unused-ap-supabase-plan-v1.json",
        ],
      },
    ],
  });
  assert.equal(apSupabase, null);

  const rescue = findActiveFounderDecisionForManufacturerRescueSlugV1({
    slug: "edr4rxd1",
    applyPlanRel: APPLY_PLAN_EDR4,
    founderRows: [validated.row],
    nowIso: NOW,
    rootDir: process.cwd(),
  });
  assert.equal(rescue, null);

  const oarMatch = findMatchingActiveMutationApprovalForRequestV1({
    request: mutationOarRequest(),
    registryRows: [validated.row],
    referenceTimeIso: NOW,
    rootDir: process.cwd(),
  });
  assert.equal(oarMatch, null);

  const effective = resolveOwnerDecisionRequestEffectiveStatusV1({
    request: mutationOarRequest(),
    registryRows: [validated.row],
    referenceTimeIso: NOW,
    rootDir: process.cwd(),
  });
  assert.equal(effective, "PENDING_OWNER_DECISION");
});

test("Runner halt inference never selects the new decision type", () => {
  assert.equal(inferDecisionTypeFromRunnerStepV1("guarded_apply_primary"), "guarded_apply_bridge");
  assert.equal(inferDecisionTypeFromRunnerStepV1("supabase_csv_parity"), "supabase_csv_parity_export");
  assert.equal(inferDecisionTypeFromRunnerStepV1("readiness_gate"), "manufacturer_rescue_apply");
  assert.equal(inferDecisionTypeFromRunnerStepV1("lifecycle_apply"), "csv_apply_authorization");
  assert.equal(inferDecisionTypeFromRunnerStepV1("unmapped_step"), "owner_mutation_approval");
  assert.notEqual(
    inferDecisionTypeFromRunnerStepV1("unmapped_step"),
    OWNER_DECISION_TYPE_MODEL_FIRST_EVIDENCE_RESULT_WRITE_V1,
  );
});

test("ratified founder OAR document validates and stays non-mutation", () => {
  const rel =
    "data/owner-decisions/ap-model-first-evidence-result-write-owner-approval-v1.json";
  const parsed: unknown = JSON.parse(readFileSync(rel, "utf8"));
  const doc = validateFounderDecisionRegistryDocumentV1(parsed);
  assert.equal(doc.ok, true);
  if (!doc.ok) return;
  assert.equal(doc.doc.rows.length, 1);
  const row = doc.doc.rows[0]!;
  assert.equal(
    row.allowed_next_scope,
    FOUNDER_DECISION_REGISTRY_MODEL_FIRST_EVIDENCE_RESULT_WRITE_SCOPE_V1,
  );
  assert.equal(row.decision_status, "approved");
  assert.equal(isFounderRegistryRowActiveMutationApproval(row, NOW), false);
});
