/**
 * Universal Coverage Factory — actionable work item v1 (read-only task envelope).
 */

export const COVERAGE_WORK_ITEM_CONTRACT_V1 = "coverage_work_item_v1" as const;

export const COVERAGE_WORK_ITEM_ACTION_CLASSES_V1 = [
  "READ_ONLY_RESEARCH",
  "MAPPING_REVIEW",
  "OWNER_REVIEW",
  "PLAN_CHANGE",
] as const;

export type CoverageWorkItemActionClassV1 =
  (typeof COVERAGE_WORK_ITEM_ACTION_CLASSES_V1)[number];

export type CoverageWorkItemV1 = {
  contract: typeof COVERAGE_WORK_ITEM_CONTRACT_V1;
  work_item_id: string;
  subject_ids: string[];
  required_evidence_checks: string[];
  permitted_action_class: CoverageWorkItemActionClassV1;
  requires_owner_review: boolean;
  priority_score: number | null;
  blockers: string[];
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  production_mutation_authorized: false;
  artifact_write_authorized: false;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isActionClass(value: unknown): value is CoverageWorkItemActionClassV1 {
  return (
    typeof value === "string" &&
    (COVERAGE_WORK_ITEM_ACTION_CLASSES_V1 as readonly string[]).includes(value)
  );
}

export function validateCoverageWorkItemV1(value: unknown): value is CoverageWorkItemV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (row.contract !== COVERAGE_WORK_ITEM_CONTRACT_V1) return false;
  if (!isNonEmptyString(row.work_item_id)) return false;
  if (!Array.isArray(row.subject_ids) || row.subject_ids.length === 0) return false;
  if (!row.subject_ids.every((id) => typeof id === "string" && id.trim().length > 0)) {
    return false;
  }
  if (
    !Array.isArray(row.required_evidence_checks) ||
    !row.required_evidence_checks.every((c) => typeof c === "string")
  ) {
    return false;
  }
  if (!isActionClass(row.permitted_action_class)) return false;
  if (typeof row.requires_owner_review !== "boolean") return false;
  if (row.priority_score !== null && typeof row.priority_score !== "number") return false;
  if (!Array.isArray(row.blockers) || !row.blockers.every((b) => typeof b === "string")) {
    return false;
  }
  if (row.read_only !== true || row.data_mutation !== false) return false;
  if (row.mutation_authorized !== false) return false;
  if (row.production_mutation_authorized !== false) return false;
  if (row.artifact_write_authorized !== false) return false;
  return true;
}

export function coverageWorkItemGrantsMutationAuthorityV1(item: CoverageWorkItemV1): false {
  void item;
  return false;
}
