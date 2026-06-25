/**
 * UCF Canonical Readiness Policy v1 — explicit governance classification for parity findings.
 * Classifies raw parity findings; does not mutate registry, adapters, or dispositions.
 */

export const UCF_CANONICAL_READINESS_POLICY_CONTRACT_V1 = "ucf_canonical_readiness_policy_v1" as const;

export const UCF_PARITY_FINDING_TYPES_V1 = [
  "UCF_CONTRACT_INTERPRETATION",
  "LEGACY_LANE_BUG",
  "ADAPTER_BUG",
  "MISSING_EVIDENCE",
] as const;

export type UcfParityFindingTypeV1 = (typeof UCF_PARITY_FINDING_TYPES_V1)[number];

export const UCF_PARITY_FINDING_SEVERITIES_V1 = ["critical", "high", "medium", "low"] as const;

export type UcfParityFindingSeverityV1 = (typeof UCF_PARITY_FINDING_SEVERITIES_V1)[number];

export const UCF_CANONICAL_READINESS_GOVERNANCE_CLASSES_V1 = [
  "CANONICAL_BLOCKER",
  "ACCEPTED_INTERPRETATION",
  "GOVERNANCE_DEBT",
  "ADAPTER_BUG",
  "FACTORY_BUG",
  "UNKNOWN",
] as const;

export type UcfCanonicalReadinessGovernanceClassV1 =
  (typeof UCF_CANONICAL_READINESS_GOVERNANCE_CLASSES_V1)[number];

export const UCF_CANONICAL_READINESS_VERDICTS_V1 = [
  "CANONICAL_READY",
  "CANONICAL_READY_WITH_FIXES",
  "NOT_CANONICAL_READY",
] as const;

export type UcfCanonicalReadinessVerdictV1 = (typeof UCF_CANONICAL_READINESS_VERDICTS_V1)[number];

/** Cohort 3B interpretation inventory — documented INTENTIONAL_CONTRACT_INTERPRETATION subjects. */
export const UCF_ACCEPTED_INTERPRETATION_SUBJECT_IDS_V1 = [
  "refrigerator_water:filter:4396842",
  "refrigerator_water:filter:adq75795101",
  "refrigerator_water:filter:da97-19467c",
  "refrigerator_water:filter:frig-242017801",
  "refrigerator_water:filter:gswf2",
  "refrigerator_water:filter:mswf",
  "refrigerator_water:filter:opfg3f",
  "refrigerator_water:filter:pfmwf",
  "refrigerator_water:filter:smartwater-mwfp",
  "refrigerator_water:filter:w10413645a",
  "refrigerator_water:filter:wf2cb",
] as const;

export type UcfParityFindingV1 = {
  wedge: string;
  subject_id: string;
  source_truth: Record<string, unknown>;
  ucf_truth: Record<string, unknown>;
  mismatch_type: string;
  severity: UcfParityFindingSeverityV1;
  evidence: string;
};

export type ClassifiedUcfParityFindingV1 = UcfParityFindingV1 & {
  governance_class: UcfCanonicalReadinessGovernanceClassV1;
  blocks_canonical_readiness: boolean;
};

export type UcfCanonicalReadinessAssessmentV1 = {
  contract: typeof UCF_CANONICAL_READINESS_POLICY_CONTRACT_V1;
  verdict: UcfCanonicalReadinessVerdictV1;
  classified_findings: ClassifiedUcfParityFindingV1[];
  registered_canonical_blocker_count: number;
  registered_accepted_interpretation_count: number;
  registered_governance_debt_count: number;
  registered_adapter_bug_count: number;
  registered_factory_bug_count: number;
  registered_unknown_count: number;
  registered_critical_raw_count: number;
  can_replace_existing_decision_logic_today: boolean;
};

const ACCEPTED_INTERPRETATION_SUBJECT_ID_SET = new Set<string>(
  UCF_ACCEPTED_INTERPRETATION_SUBJECT_IDS_V1,
);

function isEvidenceDimensionHintDrift(finding: UcfParityFindingV1): boolean {
  return (
    finding.mismatch_type === "UCF_CONTRACT_INTERPRETATION" &&
    (finding.evidence.startsWith("identity: hint=") ||
      finding.evidence.startsWith("fit: hint=") ||
      finding.evidence.startsWith("buyer_path: hint="))
  );
}

function isFactoryCrossCheckFinding(finding: UcfParityFindingV1): boolean {
  return (
    finding.mismatch_type === "ADAPTER_BUG" &&
    (finding.evidence.includes("factory subject_row") ||
      finding.evidence.includes("factory evidence_summary") ||
      finding.evidence.includes("work generator emitted"))
  );
}

function blocksRegisteredCanonicalReadiness(args: {
  governance_class: UcfCanonicalReadinessGovernanceClassV1;
  severity: UcfParityFindingSeverityV1;
  is_registered: boolean;
}): boolean {
  if (!args.is_registered) return false;

  if (args.governance_class === "CANONICAL_BLOCKER") return true;
  if (args.governance_class === "ADAPTER_BUG" && args.severity === "critical") return true;
  if (args.governance_class === "FACTORY_BUG" && args.severity === "critical") return true;
  if (args.governance_class === "UNKNOWN" && args.severity === "critical") return true;

  return false;
}

export function classifyUcfParityFindingV1(
  finding: UcfParityFindingV1,
  context: { registered_subject_ids: ReadonlySet<string> },
): ClassifiedUcfParityFindingV1 {
  const is_registered = context.registered_subject_ids.has(finding.subject_id);
  let governance_class: UcfCanonicalReadinessGovernanceClassV1;

  if (finding.mismatch_type === "LEGACY_LANE_BUG") {
    governance_class = "CANONICAL_BLOCKER";
  } else if (finding.mismatch_type === "ADAPTER_BUG") {
    governance_class = isFactoryCrossCheckFinding(finding) ? "FACTORY_BUG" : "ADAPTER_BUG";
  } else if (finding.mismatch_type === "MISSING_EVIDENCE") {
    governance_class = finding.severity === "critical" ? "CANONICAL_BLOCKER" : "GOVERNANCE_DEBT";
  } else if (finding.mismatch_type === "UCF_CONTRACT_INTERPRETATION") {
    if (
      ACCEPTED_INTERPRETATION_SUBJECT_ID_SET.has(finding.subject_id) &&
      isEvidenceDimensionHintDrift(finding)
    ) {
      governance_class = "ACCEPTED_INTERPRETATION";
    } else if (!is_registered) {
      governance_class = "GOVERNANCE_DEBT";
    } else {
      governance_class = "GOVERNANCE_DEBT";
    }
  } else {
    governance_class = "UNKNOWN";
  }

  return {
    ...finding,
    governance_class,
    blocks_canonical_readiness: blocksRegisteredCanonicalReadiness({
      governance_class,
      severity: finding.severity,
      is_registered,
    }),
  };
}

export function assessUcfCanonicalReadinessV1(args: {
  findings: readonly UcfParityFindingV1[];
  registered_subject_ids: ReadonlySet<string>;
  scale_gap: number;
  work_recommendation_diff_subject_count: number;
}): UcfCanonicalReadinessAssessmentV1 {
  const classified_findings = args.findings.map((finding) =>
    classifyUcfParityFindingV1(finding, {
      registered_subject_ids: args.registered_subject_ids,
    }),
  );

  const registered = classified_findings.filter((finding) =>
    args.registered_subject_ids.has(finding.subject_id),
  );

  const registered_canonical_blocker_count = registered.filter(
    (finding) => finding.governance_class === "CANONICAL_BLOCKER",
  ).length;
  const registered_accepted_interpretation_count = registered.filter(
    (finding) => finding.governance_class === "ACCEPTED_INTERPRETATION",
  ).length;
  const registered_governance_debt_count = registered.filter(
    (finding) => finding.governance_class === "GOVERNANCE_DEBT",
  ).length;
  const registered_adapter_bug_count = registered.filter(
    (finding) => finding.governance_class === "ADAPTER_BUG",
  ).length;
  const registered_factory_bug_count = registered.filter(
    (finding) => finding.governance_class === "FACTORY_BUG",
  ).length;
  const registered_unknown_count = registered.filter(
    (finding) => finding.governance_class === "UNKNOWN",
  ).length;
  const registered_critical_raw_count = registered.filter(
    (finding) => finding.severity === "critical",
  ).length;

  const registered_blocks = registered.filter((finding) => finding.blocks_canonical_readiness);

  let verdict: UcfCanonicalReadinessVerdictV1;
  if (registered_blocks.length > 0) {
    verdict = "NOT_CANONICAL_READY";
  } else if (args.scale_gap > 0 || classified_findings.length > 0) {
    verdict = "CANONICAL_READY_WITH_FIXES";
  } else {
    verdict = "CANONICAL_READY";
  }

  const can_replace_existing_decision_logic_today =
    args.scale_gap === 0 &&
    registered_blocks.length === 0 &&
    args.work_recommendation_diff_subject_count === 0;

  return {
    contract: UCF_CANONICAL_READINESS_POLICY_CONTRACT_V1,
    verdict,
    classified_findings,
    registered_canonical_blocker_count,
    registered_accepted_interpretation_count,
    registered_governance_debt_count,
    registered_adapter_bug_count,
    registered_factory_bug_count,
    registered_unknown_count,
    registered_critical_raw_count,
    can_replace_existing_decision_logic_today,
  };
}
