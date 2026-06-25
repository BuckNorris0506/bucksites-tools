/**
 * UCF fail-closed enforcement experiment v1 — read-only falsification of Boardy's claim
 * that suppressed subjects can be mutated without system-level rejection (i.e. fail-closed is
 * only personal discipline, not architecture).
 * In-memory simulation only; never mutates repo artifacts or production pipelines.
 */

import type { HomekeepWedgeCatalog } from "@/lib/catalog/identity";

import { resetFridgeAdapterAuditCacheV1 } from "./adapters/fridge-coverage-factory-adapter-v1";
import type { CoverageAssessmentDispositionV1 } from "./coverage-assessment-v1";
import {
  COVERAGE_WORK_ITEM_CONTRACT_V1,
  type CoverageWorkItemActionClassV1,
  type CoverageWorkItemV1,
} from "./coverage-work-item-v1";
import {
  buildUniversalCoverageFactoryDecisionLayerV1,
  universalCoverageFactoryDecisionLayerGrantsMutationAuthorityV1,
  validateUniversalCoverageFactoryDecisionLayerV1,
  type UniversalCoverageFactoryDecisionLayerV1,
} from "./universal-coverage-factory-decision-layer-v1";
import {
  buildUniversalCoverageFactoryWorkGeneratorV1,
  dispositionForCoverageAssessmentV1,
  expectedActionClassForWorkGeneratorDisposition,
  universalCoverageFactoryWorkGeneratorGrantsMutationAuthorityV1,
  type UniversalCoverageFactoryWorkGeneratorDispositionV1,
  type UniversalCoverageFactoryWorkGeneratorV1,
} from "./universal-coverage-factory-work-generator-v1";
import {
  buildUniversalCoverageFactoryV1,
  deriveFactorySubjectTruthBlockersV1,
  universalCoverageFactoryGrantsMutationAuthorityV1,
  type UniversalCoverageFactorySubjectRowV1,
  type UniversalCoverageFactorySubjectTruthBlockerV1,
  type UniversalCoverageFactoryV1,
  type UniversalCoverageFactoryEvidenceSummaryV1,
} from "./universal-coverage-factory-v1";

export const UCF_FAIL_CLOSED_ENFORCEMENT_EXPERIMENT_CONTRACT_V1 =
  "ucf_fail_closed_enforcement_experiment_v1" as const;

export const UCF_FAIL_CLOSED_ENFORCEMENT_EXPERIMENT_REPORT_NAME_V1 =
  "ucf_fail_closed_enforcement_experiment_v1" as const;

export const UCF_FAIL_CLOSED_FALSIFICATION_CLAIM_V1 =
  "If a suppressed subject can be mutated without system-level rejection, fail-closed is personal discipline, not architecture." as const;

export type UcfFailClosedMutationAttemptKindV1 =
  | "request_plan_change_work_item"
  | "request_candidate_apply_disposition"
  | "request_policy_apply"
  | "inject_decision_layer_candidate_work_item"
  | "work_generator_plan_change_action_class"
  | "layer_mutation_authorization_flags";

export type UcfFailClosedMutationSystemResponseV1 = "rejected" | "omitted" | "blocked" | "leaked";

export type UcfFailClosedMutationAttemptV1 = {
  attempt_kind: UcfFailClosedMutationAttemptKindV1;
  system_response: UcfFailClosedMutationSystemResponseV1;
  enforced_without_manual_review: boolean;
  detail: string;
};

export type UcfFailClosedSubjectBaselineV1 = {
  subject_id: string;
  wedge: HomekeepWedgeCatalog;
  disposition: CoverageAssessmentDispositionV1;
  evidence_summary: UniversalCoverageFactoryEvidenceSummaryV1;
  policy_apply_allowed: boolean;
  work_item_class: CoverageWorkItemActionClassV1 | null;
  truth_blockers: UniversalCoverageFactorySubjectTruthBlockerV1[];
  decision_truth_blocker_codes: readonly string[];
  has_candidate_work_item: boolean;
  has_generated_work_item: boolean;
  factory_mutation_authorized: false;
  decision_mutation_authorized: false;
  work_generator_mutation_authorized: false;
};

export type UcfFailClosedSubjectEnforcementResultV1 = {
  subject_id: string;
  wedge: HomekeepWedgeCatalog;
  selection_reason: string;
  baseline: UcfFailClosedSubjectBaselineV1;
  mutation_attempts: UcfFailClosedMutationAttemptV1[];
  system_blocked: boolean;
};

export type UcfFailClosedEnforcementVerdictV1 =
  | "FAIL_CLOSED_ENFORCED"
  | "FAIL_CLOSED_CONVENTION_RISK"
  | "MIXED";

export type UcfFailClosedEnforcementExperimentReportV1 = {
  contract: typeof UCF_FAIL_CLOSED_ENFORCEMENT_EXPERIMENT_CONTRACT_V1;
  report_name: typeof UCF_FAIL_CLOSED_ENFORCEMENT_EXPERIMENT_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  falsification_claim: typeof UCF_FAIL_CLOSED_FALSIFICATION_CLAIM_V1;
  selected_subject_ids: readonly string[];
  subject_results: UcfFailClosedSubjectEnforcementResultV1[];
  system_blocked_count: number;
  system_leaked_count: number;
  verdict: UcfFailClosedEnforcementVerdictV1;
  proven_facts: string[];
  unknown_facts: string[];
};

const EXPERIMENT_WEDGES_V1 = [
  "air_purifier",
  "whole_house_water",
  "refrigerator_water",
] as const satisfies readonly HomekeepWedgeCatalog[];

const SUPPRESSED_DISPOSITION_V1 = "suppressed" as const satisfies CoverageAssessmentDispositionV1;

export function selectUcfFailClosedExperimentSuppressedSubjectsV1(
  factory: UniversalCoverageFactoryV1,
): UniversalCoverageFactorySubjectRowV1[] {
  const selected: UniversalCoverageFactorySubjectRowV1[] = [];

  for (const wedge of EXPERIMENT_WEDGES_V1) {
    const candidates = factory.subject_rows
      .filter((row) => row.wedge === wedge && row.disposition === SUPPRESSED_DISPOSITION_V1)
      .sort((left, right) => left.subject_id.localeCompare(right.subject_id));

    const pick = candidates[0];
    if (!pick) {
      throw new Error(
        `ucf fail-closed experiment: no suppressed subject for wedge ${wedge} (fail closed)`,
      );
    }
    selected.push(pick);
  }

  return selected;
}

function buildFakePlanChangeCandidateWorkItemV1(subjectId: string): CoverageWorkItemV1 {
  return {
    contract: COVERAGE_WORK_ITEM_CONTRACT_V1,
    work_item_id: `ucf-decision-${subjectId.replaceAll(":", "-")}`,
    subject_ids: [subjectId],
    required_evidence_checks: ["identity", "fit", "buyer_path"],
    permitted_action_class: "PLAN_CHANGE",
    requires_owner_review: false,
    priority_score: 99,
    blockers: [],
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    artifact_write_authorized: false,
  };
}

export function simulateSuppressedSubjectMutationAttemptsV1(args: {
  subject_id: string;
  row: UniversalCoverageFactorySubjectRowV1;
  factory: UniversalCoverageFactoryV1;
  decision: UniversalCoverageFactoryDecisionLayerV1;
  workGenerator: UniversalCoverageFactoryWorkGeneratorV1;
}): UcfFailClosedMutationAttemptV1[] {
  const attempts: UcfFailClosedMutationAttemptV1[] = [];

  const generatedWorkItem = args.workGenerator.work_items.find((item) =>
    item.subject_ids.includes(args.subject_id),
  );
  const candidateWorkItem = args.decision.candidate_work_items.find((item) =>
    item.subject_ids.includes(args.subject_id),
  );
  const planChangeWorkItem =
    generatedWorkItem?.permitted_action_class === "PLAN_CHANGE" ? generatedWorkItem : null;

  attempts.push({
    attempt_kind: "request_plan_change_work_item",
    system_response: planChangeWorkItem ? "leaked" : "omitted",
    enforced_without_manual_review: !planChangeWorkItem,
    detail: planChangeWorkItem
      ? "PLAN_CHANGE work item present for suppressed subject"
      : "no PLAN_CHANGE work item in work generator output",
  });

  const candidateApplyReachable =
    args.row.disposition === "candidate_apply" && args.row.policy_apply_allowed;
  attempts.push({
    attempt_kind: "request_candidate_apply_disposition",
    system_response: candidateApplyReachable ? "leaked" : "blocked",
    enforced_without_manual_review: !candidateApplyReachable,
    detail: candidateApplyReachable
      ? "suppressed subject reached candidate_apply with policy_apply_allowed"
      : `disposition=${args.row.disposition} policy_apply_allowed=${String(args.row.policy_apply_allowed)}`,
  });

  const policyApplyGranted = args.row.policy_apply_allowed === true;
  attempts.push({
    attempt_kind: "request_policy_apply",
    system_response: policyApplyGranted ? "leaked" : "blocked",
    enforced_without_manual_review: !policyApplyGranted,
    detail: policyApplyGranted
      ? "policy_apply_allowed=true for suppressed subject"
      : "policy_apply_allowed remains false",
  });

  const tamperedDecision: UniversalCoverageFactoryDecisionLayerV1 = {
    ...args.decision,
    candidate_work_items: [
      ...args.decision.candidate_work_items,
      buildFakePlanChangeCandidateWorkItemV1(args.subject_id),
    ],
  };
  const tamperedDecisionValid = validateUniversalCoverageFactoryDecisionLayerV1(tamperedDecision);
  attempts.push({
    attempt_kind: "inject_decision_layer_candidate_work_item",
    system_response: tamperedDecisionValid ? "leaked" : "rejected",
    enforced_without_manual_review: !tamperedDecisionValid,
    detail: tamperedDecisionValid
      ? "decision layer accepted suppressed subject in candidate_work_items"
      : "validateUniversalCoverageFactoryDecisionLayerV1 rejected tampered candidate_work_items",
  });

  const workGeneratorDisposition = dispositionForCoverageAssessmentV1(SUPPRESSED_DISPOSITION_V1);
  const planChangeActionClass = expectedActionClassForWorkGeneratorDisposition(
    workGeneratorDisposition as UniversalCoverageFactoryWorkGeneratorDispositionV1,
  );
  attempts.push({
    attempt_kind: "work_generator_plan_change_action_class",
    system_response: planChangeActionClass === "PLAN_CHANGE" ? "leaked" : "blocked",
    enforced_without_manual_review: planChangeActionClass !== "PLAN_CHANGE",
    detail:
      planChangeActionClass === null
        ? "suppressed disposition maps to null action class at work-generator layer"
        : `unexpected action class ${planChangeActionClass}`,
  });

  const layersGrantMutation =
    (candidateWorkItem?.mutation_authorized ?? false) ||
    (generatedWorkItem?.mutation_authorized ?? false) ||
    (candidateWorkItem?.production_mutation_authorized ?? false) ||
    (generatedWorkItem?.production_mutation_authorized ?? false) ||
    (candidateWorkItem?.artifact_write_authorized ?? false) ||
    (generatedWorkItem?.artifact_write_authorized ?? false);

  attempts.push({
    attempt_kind: "layer_mutation_authorization_flags",
    system_response: layersGrantMutation ? "leaked" : "blocked",
    enforced_without_manual_review: !layersGrantMutation,
    detail: layersGrantMutation
      ? "work item granted mutation or artifact-write authority"
      : "mutation_authorized=false and artifact_write_authorized=false on work items; factory/decision/work-generator layers are read-only",
  });

  return attempts;
}

export function isSuppressedSubjectSystemBlockedV1(
  attempts: readonly UcfFailClosedMutationAttemptV1[],
): boolean {
  return attempts.every((attempt) => attempt.system_response !== "leaked");
}

export function classifyUcfFailClosedEnforcementVerdictV1(
  results: readonly UcfFailClosedSubjectEnforcementResultV1[],
): UcfFailClosedEnforcementVerdictV1 {
  const blockedCount = results.filter((row) => row.system_blocked).length;
  if (blockedCount === results.length) return "FAIL_CLOSED_ENFORCED";
  if (blockedCount === 0) return "FAIL_CLOSED_CONVENTION_RISK";
  return "MIXED";
}

function buildSubjectBaselineV1(args: {
  row: UniversalCoverageFactorySubjectRowV1;
  decision: UniversalCoverageFactoryDecisionLayerV1;
  workGenerator: UniversalCoverageFactoryWorkGeneratorV1;
}): UcfFailClosedSubjectBaselineV1 {
  const candidateWorkItem = args.decision.candidate_work_items.find((item) =>
    item.subject_ids.includes(args.row.subject_id),
  );
  const generatedWorkItem = args.workGenerator.work_items.find((item) =>
    item.subject_ids.includes(args.row.subject_id),
  );

  const factoryTruthBlockers = deriveFactorySubjectTruthBlockersV1({
    disposition: args.row.disposition,
    evidence_summary: args.row.evidence_summary,
    adapter_state: args.row.adapter_state,
    policy_apply_allowed: args.row.policy_apply_allowed,
  });

  const decisionTruthBlockerCodes = args.decision.truth_blockers
    .filter((blocker) => blocker.subject_id === args.row.subject_id)
    .map((blocker) => blocker.code);

  return {
    subject_id: args.row.subject_id,
    wedge: args.row.wedge,
    disposition: args.row.disposition,
    evidence_summary: args.row.evidence_summary,
    policy_apply_allowed: args.row.policy_apply_allowed,
    work_item_class: generatedWorkItem?.permitted_action_class ?? null,
    truth_blockers: factoryTruthBlockers,
    decision_truth_blocker_codes: decisionTruthBlockerCodes,
    has_candidate_work_item: candidateWorkItem !== undefined,
    has_generated_work_item: generatedWorkItem !== undefined,
    factory_mutation_authorized: false,
    decision_mutation_authorized: false,
    work_generator_mutation_authorized: false,
  };
}

export function runUcfFailClosedSubjectEnforcementExperimentV1(args: {
  row: UniversalCoverageFactorySubjectRowV1;
  factory: UniversalCoverageFactoryV1;
  decision: UniversalCoverageFactoryDecisionLayerV1;
  workGenerator: UniversalCoverageFactoryWorkGeneratorV1;
}): UcfFailClosedSubjectEnforcementResultV1 {
  const baseline = buildSubjectBaselineV1({
    row: args.row,
    decision: args.decision,
    workGenerator: args.workGenerator,
  });

  const mutation_attempts = simulateSuppressedSubjectMutationAttemptsV1({
    subject_id: args.row.subject_id,
    row: args.row,
    factory: args.factory,
    decision: args.decision,
    workGenerator: args.workGenerator,
  });

  const selection_reason = `suppressed disposition=${args.row.disposition} adapter_state=${args.row.adapter_state} assessment_blockers=${String(args.row.blockers.length)}`;

  return {
    subject_id: args.row.subject_id,
    wedge: args.row.wedge,
    selection_reason,
    baseline,
    mutation_attempts,
    system_blocked: isSuppressedSubjectSystemBlockedV1(mutation_attempts),
  };
}

export function buildUcfFailClosedEnforcementExperimentReportV1(args: {
  rootDir: string;
  now?: () => Date;
}): UcfFailClosedEnforcementExperimentReportV1 {
  resetFridgeAdapterAuditCacheV1();
  const now = args.now ?? (() => new Date());

  const factory = buildUniversalCoverageFactoryV1({ rootDir: args.rootDir, now });
  const decision = buildUniversalCoverageFactoryDecisionLayerV1(factory);
  const workGenerator = buildUniversalCoverageFactoryWorkGeneratorV1(decision);
  const selectedRows = selectUcfFailClosedExperimentSuppressedSubjectsV1(factory);

  if (
    universalCoverageFactoryGrantsMutationAuthorityV1() !== false ||
    universalCoverageFactoryDecisionLayerGrantsMutationAuthorityV1() !== false ||
    universalCoverageFactoryWorkGeneratorGrantsMutationAuthorityV1() !== false
  ) {
    throw new Error("ucf fail-closed experiment: UCF layer granted mutation authority (fail closed)");
  }

  const subject_results = selectedRows.map((row) =>
    runUcfFailClosedSubjectEnforcementExperimentV1({
      row,
      factory,
      decision,
      workGenerator,
    }),
  );

  const system_blocked_count = subject_results.filter((row) => row.system_blocked).length;
  const system_leaked_count = subject_results.length - system_blocked_count;
  const verdict = classifyUcfFailClosedEnforcementVerdictV1(subject_results);

  return {
    contract: UCF_FAIL_CLOSED_ENFORCEMENT_EXPERIMENT_CONTRACT_V1,
    report_name: UCF_FAIL_CLOSED_ENFORCEMENT_EXPERIMENT_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    falsification_claim: UCF_FAIL_CLOSED_FALSIFICATION_CLAIM_V1,
    selected_subject_ids: subject_results.map((row) => row.subject_id),
    subject_results,
    system_blocked_count,
    system_leaked_count,
    verdict,
    proven_facts: [
      `PROVEN: ${UCF_FAIL_CLOSED_ENFORCEMENT_EXPERIMENT_CONTRACT_V1} is read-only and simulates in-memory mutation attempts only.`,
      `PROVEN: selected_subject_count=${String(subject_results.length)} (one suppressed subject per committed wedge).`,
      `PROVEN: system_blocked_count=${String(system_blocked_count)} system_leaked_count=${String(system_leaked_count)}.`,
      `PROVEN: falsification_verdict=${verdict}.`,
      ...subject_results.map(
        (row) =>
          `PROVEN: subject=${row.subject_id} system_blocked=${String(row.system_blocked)} has_candidate_work_item=${String(row.baseline.has_candidate_work_item)} has_generated_work_item=${String(row.baseline.has_generated_work_item)}.`,
      ),
    ],
    unknown_facts: [
      "UNKNOWN: Experiment does not exercise out-of-band repo file edits or operator CSV mutations.",
      "UNKNOWN: Non-UCF legacy apply executors outside committed factory path are not simulated.",
    ],
  };
}

export function ucfFailClosedEnforcementExperimentGrantsMutationAuthorityV1(): false {
  return false;
}
