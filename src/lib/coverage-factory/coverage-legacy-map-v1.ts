/**
 * Universal Coverage Factory — legacy lane label mapping schema v1 (no wedge data tables).
 */

import {
  COVERAGE_ASSESSMENT_DISPOSITIONS_V1,
  type CoverageAssessmentDispositionV1,
} from "./coverage-assessment-v1";
import {
  COVERAGE_EVIDENCE_CLAIM_STATUSES_V1,
  COVERAGE_EVIDENCE_DIMENSIONS_V1,
  type CoverageEvidenceClaimStatusV1,
  type CoverageEvidenceDimensionV1,
} from "./coverage-evidence-v1";

export const COVERAGE_LEGACY_MAP_CONTRACT_V1 = "coverage_legacy_map_v1" as const;

export type CoverageLegacyMapEvidenceDimensionHintsV1 = Partial<
  Record<CoverageEvidenceDimensionV1, CoverageEvidenceClaimStatusV1>
>;

export type CoverageLegacyMapEntryV1 = {
  legacy_label: string;
  core_disposition: CoverageAssessmentDispositionV1;
  adapter_state: string | null;
  evidence_dimension_hints: CoverageLegacyMapEvidenceDimensionHintsV1;
};

export type CoverageLegacyMapV1 = {
  contract: typeof COVERAGE_LEGACY_MAP_CONTRACT_V1;
  schema_version: string;
  entries: CoverageLegacyMapEntryV1[];
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  production_mutation_authorized: false;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDisposition(value: unknown): value is CoverageAssessmentDispositionV1 {
  return (
    typeof value === "string" &&
    (COVERAGE_ASSESSMENT_DISPOSITIONS_V1 as readonly string[]).includes(value)
  );
}

function isClaimStatus(value: unknown): value is CoverageEvidenceClaimStatusV1 {
  return (
    typeof value === "string" &&
    (COVERAGE_EVIDENCE_CLAIM_STATUSES_V1 as readonly string[]).includes(value)
  );
}

function isDimension(value: unknown): value is CoverageEvidenceDimensionV1 {
  return (
    typeof value === "string" &&
    (COVERAGE_EVIDENCE_DIMENSIONS_V1 as readonly string[]).includes(value)
  );
}

function validateDimensionHints(
  value: unknown,
): value is CoverageLegacyMapEvidenceDimensionHintsV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  for (const [key, status] of Object.entries(value)) {
    if (!isDimension(key)) return false;
    if (!isClaimStatus(status)) return false;
  }
  return true;
}

function validateEntry(value: unknown): value is CoverageLegacyMapEntryV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (!isNonEmptyString(row.legacy_label)) return false;
  if (!isDisposition(row.core_disposition)) return false;
  if (row.adapter_state !== null && !isNonEmptyString(row.adapter_state)) return false;
  if (!validateDimensionHints(row.evidence_dimension_hints)) return false;
  return true;
}

export function validateCoverageLegacyMapV1(value: unknown): value is CoverageLegacyMapV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (row.contract !== COVERAGE_LEGACY_MAP_CONTRACT_V1) return false;
  if (!isNonEmptyString(row.schema_version)) return false;
  if (!Array.isArray(row.entries) || row.entries.length === 0) return false;
  if (!row.entries.every((entry) => validateEntry(entry))) return false;
  if (row.read_only !== true || row.data_mutation !== false) return false;
  if (row.mutation_authorized !== false) return false;
  if (row.production_mutation_authorized !== false) return false;
  return true;
}

export function coverageLegacyMapGrantsMutationAuthorityV1(map: CoverageLegacyMapV1): false {
  void map;
  return false;
}
