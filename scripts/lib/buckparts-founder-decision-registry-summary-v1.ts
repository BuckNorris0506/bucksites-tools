/**
 * Command Center v1 summary lane for founder decision registry (read-only projection).
 */

import type { FounderDecisionRegistryReadModelV1 } from "@/lib/owner-dashboard/founder-decision-registry-read-model-v1";

const MAX_LATEST_DECISIONS = 3;

type RuntimeStatus = "OK" | "ATTENTION" | "UNKNOWN";

export type FounderDecisionRegistrySummaryLatestDecisionV1 = {
  decision_id: string;
  decision_status: string;
  source: string;
};

export type FounderDecisionRegistrySummaryV1 = {
  contract: "founder_decision_registry_summary_v1";
  read_only: true;
  data_mutation: false;
  generated_at: string;
  runtime_status: RuntimeStatus;
  total_documents: number;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  active_mutation_approvals: number;
  expired_or_review_due_rows: number;
  latest_decisions: FounderDecisionRegistrySummaryLatestDecisionV1[];
  source_command: "npm run buckparts:founder-decision-registry";
  proven_facts: string[];
  unknown_facts: string[];
};

function runtimeStatusFromRegistry(model: FounderDecisionRegistryReadModelV1): RuntimeStatus {
  if (model.invalid_rows > 0 || model.expired_or_review_due_rows > 0) return "ATTENTION";
  if (model.total_rows === 0) return "UNKNOWN";
  return "OK";
}

export function buildFounderDecisionRegistrySummaryV1FromReport(
  model: FounderDecisionRegistryReadModelV1,
): FounderDecisionRegistrySummaryV1 {
  const latest_decisions = model.latest_decisions.slice(0, MAX_LATEST_DECISIONS).map((row) => ({
    decision_id: row.decision_id,
    decision_status: row.decision_status,
    source: row.source,
  }));
  return {
    contract: "founder_decision_registry_summary_v1",
    read_only: true,
    data_mutation: false,
    generated_at: model.generated_at,
    runtime_status: runtimeStatusFromRegistry(model),
    total_documents: model.total_documents,
    total_rows: model.total_rows,
    valid_rows: model.valid_rows,
    invalid_rows: model.invalid_rows,
    active_mutation_approvals: model.active_mutation_approvals,
    expired_or_review_due_rows: model.expired_or_review_due_rows,
    latest_decisions,
    source_command: "npm run buckparts:founder-decision-registry",
    proven_facts: [
      ...model.proven_facts,
      "founder_decision_registry_summary_v1 is a read-only projection of founder_decision_registry_read_model_v1 for Command Center JSON.",
    ],
    unknown_facts: model.unknown_facts,
  };
}
