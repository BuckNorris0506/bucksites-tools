/**
 * Command Center v1 projection for Truth Integrity Registry (read-only).
 */

import {
  buildRecommendedTruthIntegrityNextActionV1,
  countTruthIntegrityFindingsByStatusV1,
  isTruthIntegrityFindingUnfixedV1,
  isTruthIntegrityHighSeverityV1,
  loadTruthIntegrityRegistryV1,
  selectTopTruthIntegrityRiskV1,
  TRUTH_INTEGRITY_REGISTRY_CONTRACT_V1,
  TRUTH_INTEGRITY_REGISTRY_REL_V1,
  type TruthIntegrityFindingV1,
  type TruthIntegrityTopRiskV1,
} from "./truth-integrity-registry-v1";

export const TRUTH_INTEGRITY_REGISTRY_CC_LANE_CONTRACT_V1 =
  "truth_integrity_registry_v1" as const;

export const TRUTH_INTEGRITY_REGISTRY_CC_JQ_PATH_V1 =
  ".command_center_v2.truth_integrity_registry_v1" as const;

export type TruthIntegrityRegistryCommandCenterLaneV1 = {
  contract: typeof TRUTH_INTEGRITY_REGISTRY_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  automation_authorized: false;
  steering_override_active: false;
  recommended_jq_path: typeof TRUTH_INTEGRITY_REGISTRY_CC_JQ_PATH_V1;
  source_registry_contract: typeof TRUTH_INTEGRITY_REGISTRY_CONTRACT_V1;
  source_registry_rel: typeof TRUTH_INTEGRITY_REGISTRY_REL_V1;
  registry_exists: boolean;
  generated_at: string;
  total_findings: number;
  truth_integrity_open_count: number;
  truth_integrity_shadowed_count: number;
  truth_integrity_measured_count: number;
  truth_integrity_fixed_count: number;
  high_severity_unfixed_count: number;
  next_re_audit_due_count: number;
  top_truth_integrity_risk: TruthIntegrityTopRiskV1 | null;
  recommended_truth_integrity_next_action: string;
  findings_preview: TruthIntegrityFindingV1[];
  parse_errors: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

const FINDINGS_PREVIEW_CAP_V1 = 10;

export function buildTruthIntegrityRegistryCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
}): TruthIntegrityRegistryCommandCenterLaneV1 {
  const now = args.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const loaded = loadTruthIntegrityRegistryV1(args);
  const findings = loaded.document?.findings ?? [];
  const by_status = countTruthIntegrityFindingsByStatusV1(findings);
  const nowDate = now();

  const unfixed = findings.filter((finding) => isTruthIntegrityFindingUnfixedV1(finding.status));
  const high_severity_unfixed_count = unfixed.filter((finding) =>
    isTruthIntegrityHighSeverityV1(finding.severity),
  ).length;

  const next_re_audit_due_count = unfixed.filter((finding) => {
    const dueMs = Date.parse(finding.re_audit.next_re_audit_after);
    return Number.isFinite(dueMs) && nowDate.getTime() >= dueMs;
  }).length;

  const top_truth_integrity_risk = selectTopTruthIntegrityRiskV1(findings, nowDate);
  const recommended_truth_integrity_next_action = buildRecommendedTruthIntegrityNextActionV1({
    findings,
    next_re_audit_due_count,
    top_risk: top_truth_integrity_risk,
  });

  const proven_facts = [
    `PROVEN: Truth Integrity lane is read-only at ${TRUTH_INTEGRITY_REGISTRY_CC_JQ_PATH_V1}.`,
    `PROVEN: Source registry ${TRUTH_INTEGRITY_REGISTRY_REL_V1} contract ${TRUTH_INTEGRITY_REGISTRY_CONTRACT_V1}.`,
    `PROVEN: total_findings=${String(findings.length)} open=${String(by_status.OPEN)} shadowed=${String(by_status.SHADOWED)} measured=${String(by_status.MEASURED)} fixed=${String(by_status.FIXED)}.`,
    `PROVEN: high_severity_unfixed_count=${String(high_severity_unfixed_count)} next_re_audit_due_count=${String(next_re_audit_due_count)}.`,
  ];
  if (top_truth_integrity_risk) {
    proven_facts.push(
      `PROVEN: top_truth_integrity_risk=${top_truth_integrity_risk.finding_id} severity=${top_truth_integrity_risk.severity} status=${top_truth_integrity_risk.status}.`,
    );
  }

  const inferred_facts = [
    "INFERRED: This lane does not enforce buy gates, HQ handoff freshness, or mutation authority.",
  ];
  if (by_status.SHADOWED > 0) {
    inferred_facts.push(
      "INFERRED: SHADOWED findings expose truth debt in count/diagnostic mode only until owner approves enforcement.",
    );
  }

  const unknown_facts = [...loaded.parse_errors];
  if (!loaded.registry_exists) {
    unknown_facts.push(`UNKNOWN: registry missing at ${TRUTH_INTEGRITY_REGISTRY_REL_V1}.`);
  }

  return {
    contract: TRUTH_INTEGRITY_REGISTRY_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    automation_authorized: false,
    steering_override_active: false,
    recommended_jq_path: TRUTH_INTEGRITY_REGISTRY_CC_JQ_PATH_V1,
    source_registry_contract: TRUTH_INTEGRITY_REGISTRY_CONTRACT_V1,
    source_registry_rel: TRUTH_INTEGRITY_REGISTRY_REL_V1,
    registry_exists: loaded.registry_exists,
    generated_at,
    total_findings: findings.length,
    truth_integrity_open_count: by_status.OPEN,
    truth_integrity_shadowed_count: by_status.SHADOWED,
    truth_integrity_measured_count: by_status.MEASURED,
    truth_integrity_fixed_count: by_status.FIXED,
    high_severity_unfixed_count,
    next_re_audit_due_count,
    top_truth_integrity_risk,
    recommended_truth_integrity_next_action,
    findings_preview: findings.slice(0, FINDINGS_PREVIEW_CAP_V1),
    parse_errors: loaded.parse_errors,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
