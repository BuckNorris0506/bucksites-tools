import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DECISION_PRIOR_IDS_V1,
  DECISION_PRIORS_FRAMEWORK_CONTRACT_V1,
  buildDecisionPriorsFrameworkProjectionV1,
  buildFounderDisagreementRecordV1,
  isDecisionPriorIdV1,
  isFounderDisagreementStatusV1,
  retainExecutiveRecommendationDecisionPriorsOnOarV1,
  tagCandidateExecutiveDecisionWithDecisionPriorsV1,
  validateDecisionPriorsV1,
} from "./decision-priors-framework-v1";
import { validateFounderDecisionRegistryRowV1 } from "./founder-decision-registry-v1";

test("catalog exposes closed label-only prior ids", () => {
  assert.ok(DECISION_PRIOR_IDS_V1.length >= 4);
  assert.equal(isDecisionPriorIdV1("fail_closed_on_unknown"), true);
  assert.equal(isDecisionPriorIdV1("not_a_real_prior"), false);
  assert.equal(isDecisionPriorIdV1(1), false);
});

test("validateDecisionPriorsV1 accepts empty / missing and rejects unknown labels", () => {
  assert.deepEqual(validateDecisionPriorsV1(undefined), { ok: true, decision_priors: [] });
  assert.deepEqual(validateDecisionPriorsV1([]), { ok: true, decision_priors: [] });
  const ok = validateDecisionPriorsV1([
    "no_invented_facts",
    "fail_closed_on_unknown",
    "no_invented_facts",
  ]);
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.deepEqual(ok.decision_priors, ["fail_closed_on_unknown", "no_invented_facts"]);
  }
  const bad = validateDecisionPriorsV1(["fail_closed_on_unknown", "score_me"]);
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.match(bad.errors.join(" "), /unknown decision_prior/);
  }
});

test("tagCandidateExecutiveDecisionWithDecisionPriorsV1 tags labels without scoring fields", () => {
  const tagged = tagCandidateExecutiveDecisionWithDecisionPriorsV1({
    candidate: {
      decision_request_id: "odr-v1-demo",
      recommended_option: "approve_owner_mutation",
      decision_type: "guarded_apply_bridge",
    },
    decision_priors: ["founder_authority_required", "no_autonomous_apply"],
  });
  assert.equal(tagged.ok, true);
  if (!tagged.ok) return;
  assert.deepEqual(tagged.tagged.decision_priors, [
    "no_autonomous_apply",
    "founder_authority_required",
  ]);
  assert.equal(tagged.tagged.decision_priors_are_labels_only, true);
  assert.equal(tagged.tagged.scoring, false);
  assert.equal(tagged.tagged.weighting, false);
  assert.equal(tagged.tagged.behavior_change, false);
});

test("tagCandidateExecutiveDecisionWithDecisionPriorsV1 fails closed on bad candidate or prior", () => {
  const missingId = tagCandidateExecutiveDecisionWithDecisionPriorsV1({
    candidate: { decision_request_id: "", recommended_option: "approve_owner_mutation" },
    decision_priors: ["no_invented_facts"],
  });
  assert.equal(missingId.ok, false);

  const badPrior = tagCandidateExecutiveDecisionWithDecisionPriorsV1({
    candidate: { decision_request_id: "odr-v1-x", recommended_option: "approve_owner_mutation" },
    decision_priors: ["weight_me"],
  });
  assert.equal(badPrior.ok, false);
});

test("founder disagreement statuses are reject/defer/needs_more_evidence only", () => {
  assert.equal(isFounderDisagreementStatusV1("rejected"), true);
  assert.equal(isFounderDisagreementStatusV1("deferred"), true);
  assert.equal(isFounderDisagreementStatusV1("needs_more_evidence"), true);
  assert.equal(isFounderDisagreementStatusV1("approved"), false);
});

test("buildFounderDisagreementRecordV1 retains executive recommendation priors", () => {
  const built = buildFounderDisagreementRecordV1({
    oar: {
      decision_id: "decision-disagree-1",
      decision_status: "needs_more_evidence",
      executive_recommendation_decision_priors: [
        "fail_closed_on_unknown",
        "read_only_packet_before_mutation",
      ],
    },
    executive_recommended_option: "approve_owner_mutation",
    candidate_decision_request_id: "odr-v1-demo",
  });
  assert.equal(built.ok, true);
  if (!built.ok) return;
  assert.equal(built.record.contract, "founder_disagreement_record_v1");
  assert.equal(built.record.read_only, true);
  assert.equal(built.record.nba_authority, false);
  assert.equal(built.record.dispatch_authority, false);
  assert.equal(built.record.daily_operator_authority, false);
  assert.equal(built.record.steering_authority, false);
  assert.deepEqual(built.record.decision_priors, [
    "fail_closed_on_unknown",
    "read_only_packet_before_mutation",
  ]);
  assert.equal(built.record.decision_priors_are_labels_only, true);
  assert.equal(built.record.scoring, false);
  assert.equal(built.record.weighting, false);
  assert.equal(built.record.behavior_change, false);
  assert.equal(built.record.executive_recommended_option, "approve_owner_mutation");
});

test("buildFounderDisagreementRecordV1 rejects approved OARs and unknown priors", () => {
  const approved = buildFounderDisagreementRecordV1({
    oar: { decision_id: "d1", decision_status: "approved" },
    decision_priors: ["no_invented_facts"],
  });
  assert.equal(approved.ok, false);

  const bad = buildFounderDisagreementRecordV1({
    oar: { decision_id: "d2", decision_status: "rejected" },
    decision_priors: ["not_catalog"],
  });
  assert.equal(bad.ok, false);
});

test("retainExecutiveRecommendationDecisionPriorsOnOarV1 is pure label retention", () => {
  const retained = retainExecutiveRecommendationDecisionPriorsOnOarV1({
    oar: { decision_id: "d3", decision_status: "deferred" },
    decision_priors: ["harm_reduction_over_coverage", "no_buy_cta_without_proof"],
  });
  assert.equal(retained.ok, true);
  if (!retained.ok) return;
  assert.deepEqual(retained.oar.executive_recommendation_decision_priors, [
    "harm_reduction_over_coverage",
    "no_buy_cta_without_proof",
  ]);
});

test("projection tags candidates and emits disagreement records without new store or authority", () => {
  const projection = buildDecisionPriorsFrameworkProjectionV1({
    now: () => new Date("2026-08-10T12:00:00.000Z"),
    candidates: [
      {
        decision_request_id: "odr-v1-tagged",
        recommended_option: "approve_owner_mutation",
        decision_priors: ["no_autonomous_apply", "founder_authority_required"],
      },
      {
        decision_request_id: "odr-v1-untagged",
        recommended_option: "approve_owner_mutation",
      },
    ],
    oar_rows: [
      {
        decision_id: "decision-disagree-linked",
        decision_status: "rejected",
        source_decision_packet_id: "owner_decision_request_v1:odr-v1-tagged",
      },
      {
        decision_id: "decision-approved-skip",
        decision_status: "approved",
      },
      {
        decision_id: "decision-disagree-oar-retained",
        decision_status: "deferred",
        executive_recommendation_decision_priors: ["single_lane_no_mixed_dirty_tree"],
      },
    ],
  });

  assert.equal(projection.contract, DECISION_PRIORS_FRAMEWORK_CONTRACT_V1);
  assert.equal(projection.read_only, true);
  assert.equal(projection.data_mutation, false);
  assert.equal(projection.mutation_authorized, false);
  assert.equal(projection.steering_authority, false);
  assert.equal(projection.nba_authority, false);
  assert.equal(projection.dispatch_authority, false);
  assert.equal(projection.daily_operator_authority, false);
  assert.equal(projection.command_center_authority, false);
  assert.equal(projection.labels_only, true);
  assert.equal(projection.scoring, false);
  assert.equal(projection.weighting, false);
  assert.equal(projection.behavior_change, false);
  assert.equal(projection.new_store_created, false);
  assert.equal(projection.tagged_candidate_count, 1);
  assert.equal(projection.disagreement_record_count, 2);

  const linked = projection.disagreement_records.find(
    (r) => r.oar_decision_id === "decision-disagree-linked",
  );
  assert.ok(linked);
  assert.equal(linked?.candidate_decision_request_id, "odr-v1-tagged");
  assert.deepEqual(linked?.decision_priors, [
    "no_autonomous_apply",
    "founder_authority_required",
  ]);

  const retained = projection.disagreement_records.find(
    (r) => r.oar_decision_id === "decision-disagree-oar-retained",
  );
  assert.ok(retained);
  assert.deepEqual(retained?.decision_priors, ["single_lane_no_mixed_dirty_tree"]);
});

test("founder registry validator accepts optional executive_recommendation_decision_priors", () => {
  const base = {
    decision_id: "decision-priors-registry-test",
    source_queue_row_id: "queue-test",
    source_decision_packet_id: "decision_packet_v1:queue-test",
    decided_at: "2026-08-10T12:00:00.000Z",
    decision_status: "needs_more_evidence",
    owner_note: "Need more evidence before mutation.",
    allowed_next_scope: "read_only_agent",
    evidence_required_before_mutation: false,
    prohibited_actions_still_apply: ["Do not mutate retailer_links."],
  };

  const ok = validateFounderDecisionRegistryRowV1({
    ...base,
    executive_recommendation_decision_priors: [
      "fail_closed_on_unknown",
      "no_autonomous_apply",
    ],
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.deepEqual(ok.row.executive_recommendation_decision_priors, [
      "fail_closed_on_unknown",
      "no_autonomous_apply",
    ]);
  }

  const legacy = validateFounderDecisionRegistryRowV1(base);
  assert.equal(legacy.ok, true);
  if (legacy.ok) {
    assert.equal(legacy.row.executive_recommendation_decision_priors, undefined);
  }

  const bad = validateFounderDecisionRegistryRowV1({
    ...base,
    executive_recommendation_decision_priors: ["invented_weight"],
  });
  assert.equal(bad.ok, false);
});
