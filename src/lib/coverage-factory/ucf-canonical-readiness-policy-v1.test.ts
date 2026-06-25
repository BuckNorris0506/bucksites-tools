import assert from "node:assert/strict";
import test from "node:test";

import {
  assessUcfCanonicalReadinessV1,
  classifyUcfParityFindingV1,
  UCF_ACCEPTED_INTERPRETATION_SUBJECT_IDS_V1,
  type UcfParityFindingV1,
} from "./ucf-canonical-readiness-policy-v1";

const REGISTERED = new Set([
  "refrigerator_water:filter:rpwfe",
  ...UCF_ACCEPTED_INTERPRETATION_SUBJECT_IDS_V1,
]);

function finding(overrides: Partial<UcfParityFindingV1> & Pick<UcfParityFindingV1, "subject_id">): UcfParityFindingV1 {
  return {
    wedge: "refrigerator_water",
    source_truth: {},
    ucf_truth: {},
    mismatch_type: "ADAPTER_BUG",
    severity: "critical",
    evidence: "factory subject_row disposition != adapter assessment",
    ...overrides,
  };
}

test("critical adapter bugs block canonical readiness when registered", () => {
  const classified = classifyUcfParityFindingV1(
    finding({
      subject_id: "refrigerator_water:filter:rpwfe",
      mismatch_type: "ADAPTER_BUG",
      severity: "critical",
      evidence: "registered adapter subject missing from universal factory",
    }),
    { registered_subject_ids: REGISTERED },
  );

  assert.equal(classified.governance_class, "ADAPTER_BUG");
  assert.equal(classified.blocks_canonical_readiness, true);

  const assessment = assessUcfCanonicalReadinessV1({
    findings: [classified],
    registered_subject_ids: REGISTERED,
    scale_gap: 0,
    work_recommendation_diff_subject_count: 0,
  });

  assert.equal(assessment.verdict, "NOT_CANONICAL_READY");
  assert.equal(assessment.registered_critical_raw_count, 1);
});

test("legacy lane bugs classify as canonical blockers", () => {
  const classified = classifyUcfParityFindingV1(
    finding({
      subject_id: "refrigerator_water:filter:rpwfe",
      mismatch_type: "LEGACY_LANE_BUG",
      severity: "critical",
      evidence: "rescue disposition overrides audit fit=blocked",
    }),
    { registered_subject_ids: REGISTERED },
  );

  assert.equal(classified.governance_class, "CANONICAL_BLOCKER");
  assert.equal(classified.blocks_canonical_readiness, true);
});

test("accepted interpretations do not block canonical readiness", () => {
  const acceptedFindings = UCF_ACCEPTED_INTERPRETATION_SUBJECT_IDS_V1.map((subject_id) =>
    classifyUcfParityFindingV1(
      finding({
        subject_id,
        mismatch_type: "UCF_CONTRACT_INTERPRETATION",
        severity: "high",
        evidence: "identity: hint=unknown actual=proven",
      }),
      { registered_subject_ids: REGISTERED },
    ),
  );

  for (const classified of acceptedFindings) {
    assert.equal(classified.governance_class, "ACCEPTED_INTERPRETATION");
    assert.equal(classified.blocks_canonical_readiness, false);
  }

  const assessment = assessUcfCanonicalReadinessV1({
    findings: acceptedFindings,
    registered_subject_ids: REGISTERED,
    scale_gap: 1,
    work_recommendation_diff_subject_count: 0,
  });

  assert.equal(assessment.registered_accepted_interpretation_count, 11);
  assert.equal(assessment.registered_canonical_blocker_count, 0);
  assert.equal(assessment.registered_critical_raw_count, 0);
  assert.equal(assessment.verdict, "CANONICAL_READY_WITH_FIXES");
});

test("current registered interpretation inventory yields canonical ready with fixes", () => {
  const findings: UcfParityFindingV1[] = [
    ...UCF_ACCEPTED_INTERPRETATION_SUBJECT_IDS_V1.map((subject_id, index) =>
      finding({
        subject_id,
        mismatch_type: "UCF_CONTRACT_INTERPRETATION",
        severity: "high",
        evidence:
          index === 2
            ? "buyer_path: hint=unknown actual=blocked"
            : "identity: hint=unknown actual=proven",
      }),
    ),
  ];

  const registered = new Set(UCF_ACCEPTED_INTERPRETATION_SUBJECT_IDS_V1);
  const assessment = assessUcfCanonicalReadinessV1({
    findings,
    registered_subject_ids: registered,
    scale_gap: 1,
    work_recommendation_diff_subject_count: 0,
  });

  assert.equal(assessment.registered_accepted_interpretation_count, 11);
  assert.equal(assessment.registered_canonical_blocker_count, 0);
  assert.equal(assessment.verdict, "CANONICAL_READY_WITH_FIXES");
  assert.equal(assessment.can_replace_existing_decision_logic_today, false);
});

test("unregistered interpretation drift is governance debt not a registered blocker", () => {
  const classified = classifyUcfParityFindingV1(
    finding({
      subject_id: "refrigerator_water:filter:unregistered-example",
      mismatch_type: "UCF_CONTRACT_INTERPRETATION",
      severity: "high",
      evidence: "identity: hint=unknown actual=proven",
    }),
    { registered_subject_ids: REGISTERED },
  );

  assert.equal(classified.governance_class, "GOVERNANCE_DEBT");
  assert.equal(classified.blocks_canonical_readiness, false);
});
