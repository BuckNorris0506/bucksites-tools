import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  extractFounderDecisionApplyContextCorrelationV1,
  findFounderOwnerApprovalForSlugV1,
  founderDecisionRowMatchesSlugIdentityV1,
  type FounderDecisionRowWithSlugCorrelationV1,
} from "./founder-decision-slug-correlation-v1";
import { manufacturerSafeLinkRescueApplyPlanRelV1 } from "./manufacturer-safe-link-rescue-apply-plan-factory-v1";

const APPLY_PLAN_EDR3RXD1 = manufacturerSafeLinkRescueApplyPlanRelV1("edr3rxd1");
const APPLY_PLAN_4396508 =
  "data/fridge/batch-production/drafts/fridge-safe-link-4396508-apply-plan-proposal-v1.json";

function approvedRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-test",
    source_queue_row_id: "queue-test",
    source_decision_packet_id: "packet-test",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approved.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not batch apply other slugs."],
    expires_at: "2027-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function loaded(args: {
  row: FounderDecisionRegistryRowV1;
  target_slugs?: string[];
  apply_plan_rel_paths?: string[];
}): FounderDecisionRowWithSlugCorrelationV1 {
  return {
    row: args.row,
    apply_context_target_slugs: args.target_slugs ?? [],
    apply_context_apply_plan_rel_paths: args.apply_plan_rel_paths ?? [],
  };
}

describe("founder-decision-slug-correlation-v1", () => {
  test("4396508 prohibited-actions mention of edr3rxd1 does not authorize edr3rxd1", () => {
    const row439 = loaded({
      row: approvedRow({
        decision_id: "decision-2026-06-10-4396508-approve_csv_supabase_parity_apply",
        source_queue_row_id: "queue-fridge-safe-link-4396508-csv-parity",
        source_decision_packet_id: "fridge_safe_link_4396508_owner_classification_approval_packet_v1",
        owner_note: "Approve 4396508 only.",
        prohibited_actions_still_apply: [
          "Do not batch apply edr3rxd1, gswf, or other First4 slugs without separate approval rows.",
        ],
      }),
      target_slugs: ["4396508"],
      apply_plan_rel_paths: [APPLY_PLAN_4396508],
    });

    assert.equal(
      founderDecisionRowMatchesSlugIdentityV1({
        slug: "edr3rxd1",
        applyPlanRel: APPLY_PLAN_EDR3RXD1,
        loaded: row439,
      }),
      false,
    );

    const approval = findFounderOwnerApprovalForSlugV1({
      slug: "edr3rxd1",
      applyPlanRel: APPLY_PLAN_EDR3RXD1,
      founderRows: [row439],
    });
    assert.equal(approval.approved, false);
  });

  test("edr3rxd1 founder approval matches edr3rxd1 only", () => {
    const rowEdr3 = loaded({
      row: approvedRow({
        decision_id: "decision-2026-06-28-edr3rxd1-approve_csv_manufacturer_rescue_apply",
        source_queue_row_id: "queue-fridge-safe-link-edr3rxd1-manufacturer-rescue",
        source_decision_packet_id: "fridge_safe_link_edr3rxd1_owner_classification_approval_packet_v1",
        decided_at: "2026-06-28T18:00:00.000Z",
        owner_note: "Approve edr3rxd1 only.",
      }),
      target_slugs: ["edr3rxd1"],
      apply_plan_rel_paths: [APPLY_PLAN_EDR3RXD1],
    });
    assert.deepEqual(rowEdr3.apply_context_target_slugs, ["edr3rxd1"]);

    const approval = findFounderOwnerApprovalForSlugV1({
      slug: "edr3rxd1",
      applyPlanRel: APPLY_PLAN_EDR3RXD1,
      founderRows: [rowEdr3],
    });
    assert.equal(approval.approved, true);
    assert.equal(approval.source_path, rowEdr3.row.decision_id);
  });

  test("edr3rxd1 approval does not authorize ultrawf", () => {
    const rowEdr3 = loaded({
      row: approvedRow({
        decision_id: "decision-2026-06-28-edr3rxd1-approve_csv_manufacturer_rescue_apply",
        source_queue_row_id: "queue-fridge-safe-link-edr3rxd1-manufacturer-rescue",
        source_decision_packet_id: "fridge_safe_link_edr3rxd1_owner_classification_approval_packet_v1",
        decided_at: "2026-06-28T18:00:00.000Z",
        owner_note: "Approve edr3rxd1 only.",
      }),
      target_slugs: ["edr3rxd1"],
      apply_plan_rel_paths: [APPLY_PLAN_EDR3RXD1],
    });

    assert.equal(
      founderDecisionRowMatchesSlugIdentityV1({
        slug: "ultrawf",
        applyPlanRel: manufacturerSafeLinkRescueApplyPlanRelV1("ultrawf"),
        loaded: rowEdr3,
      }),
      false,
    );

    const approval = findFounderOwnerApprovalForSlugV1({
      slug: "ultrawf",
      applyPlanRel: manufacturerSafeLinkRescueApplyPlanRelV1("ultrawf"),
      founderRows: [rowEdr3],
    });
    assert.equal(approval.approved, false);
  });

  test("substring owner_note alone cannot authorize a slug", () => {
    const row439ProhibitedOnly = loaded({
      row: approvedRow({
        decision_id: "decision-4396508-prohibited-only",
        source_queue_row_id: "queue-fridge-safe-link-4396508-csv-parity",
        source_decision_packet_id: "fridge_safe_link_4396508_owner_classification_approval_packet_v1",
        owner_note: "Approve 4396508 only.",
        prohibited_actions_still_apply: [
          "Do not batch apply edr3rxd1, gswf, or other First4 slugs without separate approval rows.",
        ],
      }),
      target_slugs: ["4396508"],
      apply_plan_rel_paths: [APPLY_PLAN_4396508],
    });

    assert.equal(
      findFounderOwnerApprovalForSlugV1({
        slug: "edr3rxd1",
        applyPlanRel: APPLY_PLAN_EDR3RXD1,
        founderRows: [row439ProhibitedOnly],
      }).approved,
      false,
    );
    assert.equal(
      findFounderOwnerApprovalForSlugV1({
        slug: "4396508",
        applyPlanRel: APPLY_PLAN_4396508,
        founderRows: [row439ProhibitedOnly],
      }).approved,
      true,
    );
  });

  test("extractFounderDecisionApplyContextCorrelationV1 reads slug-scoped context blobs", () => {
    const correlation = extractFounderDecisionApplyContextCorrelationV1({
      decision_id: "x",
      edr3rxd1_apply_context_v1: {
        target_slug: "edr3rxd1",
        apply_plan_rel_path: APPLY_PLAN_EDR3RXD1,
      },
    });
    assert.deepEqual(correlation.apply_context_target_slugs, ["edr3rxd1"]);
    assert.deepEqual(correlation.apply_context_apply_plan_rel_paths, [
      APPLY_PLAN_EDR3RXD1.toLowerCase(),
    ]);
  });
});
