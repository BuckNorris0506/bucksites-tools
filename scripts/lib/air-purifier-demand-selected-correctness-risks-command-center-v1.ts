/**
 * Read-only Command Center projection for AP demand-selected correctness risks audit.
 *
 * Does not change NBA, steering, owner-review rankings, mutation authority, or catalog/runtime behavior.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CONTRACT_V1 =
  "air_purifier_demand_selected_correctness_risks_v1" as const;
export const AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CC_JQ_PATH_V1 =
  ".command_center_v2.air_purifier_demand_selected_correctness_risks_v1" as const;
export const AP_DEMAND_SELECTED_CORRECTNESS_RISKS_AUDIT_REL_PATH_V1 =
  "data/air-purifier/batch-production/audits/ap-demand-selected-correctness-risks-v1.json" as const;

type ApDemandSelectedCorrectnessRiskSeverityV1 = "high" | "medium" | "low";

type ApDemandSelectedCorrectnessRiskRowV1 = {
  risk_id: string;
  severity: ApDemandSelectedCorrectnessRiskSeverityV1;
  label?: string;
  detail?: string;
};

type ApDemandSelectedCorrectnessSlugAssessmentV1 = {
  filter_slug: string;
  correctness_risks?: ApDemandSelectedCorrectnessRiskRowV1[];
};

type ApDemandSelectedCorrectnessRisksAuditV1 = {
  contract?: string;
  generated_at?: string;
  executive_summary?: {
    "vornado-md1-0023"?: { verdict?: string };
    "renpho-rp-ap003"?: { verdict?: string };
  };
  slug_assessments?: ApDemandSelectedCorrectnessSlugAssessmentV1[];
  recommended_next_steps_read_only?: string[];
};

export type AirPurifierDemandSelectedCorrectnessRisksLaneV1 = {
  contract: typeof AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CC_JQ_PATH_V1;
  source_artifact_rel_path: typeof AP_DEMAND_SELECTED_CORRECTNESS_RISKS_AUDIT_REL_PATH_V1;
  source_status: "PROVEN" | "UNKNOWN";
  risk_count: number | "UNKNOWN";
  high_risk_slug_count: number | "UNKNOWN";
  vornado_md1_0023_status: string | "UNKNOWN";
  renpho_rp_ap003_status: string | "UNKNOWN";
  recommended_action: string | "UNKNOWN";
  generated_at: string | "UNKNOWN";
};

export type BuildAirPurifierDemandSelectedCorrectnessRisksLaneDepsV1 = {
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
};

function slugHasHighRiskV1(assessment: ApDemandSelectedCorrectnessSlugAssessmentV1): boolean {
  return (assessment.correctness_risks ?? []).some((risk) => risk.severity === "high");
}

export function projectApDemandSelectedCorrectnessRisksFromAuditV1(
  audit: ApDemandSelectedCorrectnessRisksAuditV1,
): Pick<
  AirPurifierDemandSelectedCorrectnessRisksLaneV1,
  | "risk_count"
  | "high_risk_slug_count"
  | "vornado_md1_0023_status"
  | "renpho_rp_ap003_status"
  | "recommended_action"
  | "generated_at"
> {
  const slugAssessments = audit.slug_assessments ?? [];
  const risk_count = slugAssessments.reduce(
    (total, assessment) => total + (assessment.correctness_risks?.length ?? 0),
    0,
  );
  const high_risk_slug_count = slugAssessments.filter(slugHasHighRiskV1).length;
  const vornado_md1_0023_status =
    audit.executive_summary?.["vornado-md1-0023"]?.verdict ?? "UNKNOWN";
  const renpho_rp_ap003_status =
    audit.executive_summary?.["renpho-rp-ap003"]?.verdict ?? "UNKNOWN";
  const stepAction = audit.recommended_next_steps_read_only?.join(" | ");
  const fallbackAction = [vornado_md1_0023_status, renpho_rp_ap003_status]
    .filter((value) => value !== "UNKNOWN")
    .join(" | ");
  const recommended_action = stepAction ?? (fallbackAction || "UNKNOWN");

  return {
    risk_count,
    high_risk_slug_count,
    vornado_md1_0023_status,
    renpho_rp_ap003_status,
    recommended_action,
    generated_at: audit.generated_at ?? "UNKNOWN",
  };
}

export function buildAirPurifierDemandSelectedCorrectnessRisksLaneUnknownV1(args?: {
  reason?: string;
}): AirPurifierDemandSelectedCorrectnessRisksLaneV1 {
  return {
    contract: AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CC_JQ_PATH_V1,
    source_artifact_rel_path: AP_DEMAND_SELECTED_CORRECTNESS_RISKS_AUDIT_REL_PATH_V1,
    source_status: "UNKNOWN",
    risk_count: "UNKNOWN",
    high_risk_slug_count: "UNKNOWN",
    vornado_md1_0023_status: "UNKNOWN",
    renpho_rp_ap003_status: "UNKNOWN",
    recommended_action: args?.reason ?? "UNKNOWN",
    generated_at: "UNKNOWN",
  };
}

export function buildAirPurifierDemandSelectedCorrectnessRisksLaneV1(
  deps: BuildAirPurifierDemandSelectedCorrectnessRisksLaneDepsV1,
): AirPurifierDemandSelectedCorrectnessRisksLaneV1 {
  const fileExists = deps.fileExists ?? existsSync;
  const readTextFile = deps.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));

  const auditPath = path.resolve(deps.rootDir, AP_DEMAND_SELECTED_CORRECTNESS_RISKS_AUDIT_REL_PATH_V1);
  if (!fileExists(auditPath)) {
    return buildAirPurifierDemandSelectedCorrectnessRisksLaneUnknownV1({
      reason: `Audit artifact missing at ${AP_DEMAND_SELECTED_CORRECTNESS_RISKS_AUDIT_REL_PATH_V1}`,
    });
  }

  let audit: ApDemandSelectedCorrectnessRisksAuditV1;
  try {
    audit = JSON.parse(readTextFile(auditPath)) as ApDemandSelectedCorrectnessRisksAuditV1;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return buildAirPurifierDemandSelectedCorrectnessRisksLaneUnknownV1({
      reason: `Audit artifact parse failed: ${message}`,
    });
  }

  if (audit.contract !== "ap_demand_selected_correctness_risks_v1") {
    return buildAirPurifierDemandSelectedCorrectnessRisksLaneUnknownV1({
      reason: `Unexpected audit contract: ${String(audit.contract)}`,
    });
  }

  return {
    contract: AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CC_JQ_PATH_V1,
    source_artifact_rel_path: AP_DEMAND_SELECTED_CORRECTNESS_RISKS_AUDIT_REL_PATH_V1,
    source_status: "PROVEN",
    ...projectApDemandSelectedCorrectnessRisksFromAuditV1(audit),
  };
}
