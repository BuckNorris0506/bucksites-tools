/**
 * Universal Coverage Factory — immutable-shaped run manifest v1.
 */

import { isHomekeepWedgeCatalog, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";

import {
  COVERAGE_ASSESSMENT_DISPOSITIONS_V1,
  type CoverageAssessmentDispositionV1,
} from "./coverage-assessment-v1";

export const COVERAGE_RUN_MANIFEST_CONTRACT_V1 = "coverage_run_manifest_v1" as const;

export type CoverageRunManifestInputHashesV1 = Readonly<Record<string, string>>;

export type CoverageRunManifestAssessmentCountsV1 = Readonly<
  Partial<Record<CoverageAssessmentDispositionV1, number>>
>;

export type CoverageRunManifestV1 = {
  contract: typeof COVERAGE_RUN_MANIFEST_CONTRACT_V1;
  schema_version: string;
  run_id: string;
  adapter_id: string;
  adapter_version: string;
  wedge: HomekeepWedgeCatalog;
  generated_at: string;
  /** Logical input labels → content hash (e.g. sha256 hex); no filesystem paths required. */
  input_artifact_hashes: CoverageRunManifestInputHashesV1;
  assessment_counts: CoverageRunManifestAssessmentCountsV1;
  subject_count: number;
  /** Hash over the provenance ref index emitted for this run (opaque at contract layer). */
  provenance_index_hash: string;
  prior_run_id: string | null;
  immutable: true;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  production_mutation_authorized: false;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  return !Number.isNaN(Date.parse(value));
}

function isInputHashesRecord(value: unknown): value is CoverageRunManifestInputHashesV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  for (const [key, hash] of Object.entries(value)) {
    if (!isNonEmptyString(key)) return false;
    if (!isNonEmptyString(hash)) return false;
  }
  return true;
}

function isAssessmentCountsRecord(value: unknown): value is CoverageRunManifestAssessmentCountsV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  for (const [key, count] of Object.entries(value)) {
    if (
      !(COVERAGE_ASSESSMENT_DISPOSITIONS_V1 as readonly string[]).includes(key) ||
      typeof count !== "number" ||
      !Number.isFinite(count) ||
      count < 0 ||
      !Number.isInteger(count)
    ) {
      return false;
    }
  }
  return true;
}

export function validateCoverageRunManifestV1(value: unknown): value is CoverageRunManifestV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (row.contract !== COVERAGE_RUN_MANIFEST_CONTRACT_V1) return false;
  if (!isNonEmptyString(row.schema_version)) return false;
  if (!isNonEmptyString(row.run_id)) return false;
  if (!isNonEmptyString(row.adapter_id)) return false;
  if (!isNonEmptyString(row.adapter_version)) return false;
  if (typeof row.wedge !== "string" || !isHomekeepWedgeCatalog(row.wedge)) return false;
  if (!isValidIsoTimestamp(row.generated_at)) return false;
  if (!isInputHashesRecord(row.input_artifact_hashes)) return false;
  if (!isAssessmentCountsRecord(row.assessment_counts)) return false;
  if (typeof row.subject_count !== "number" || !Number.isInteger(row.subject_count) || row.subject_count < 0) {
    return false;
  }
  if (!isNonEmptyString(row.provenance_index_hash)) return false;
  if (row.prior_run_id !== null && !isNonEmptyString(row.prior_run_id)) return false;
  if (row.immutable !== true) return false;
  if (row.read_only !== true || row.data_mutation !== false) return false;
  if (row.mutation_authorized !== false) return false;
  if (row.production_mutation_authorized !== false) return false;
  return true;
}

/** Manifest must carry at least one input hash for traceability. */
export function coverageRunManifestHasInputHashesV1(manifest: CoverageRunManifestV1): boolean {
  return Object.keys(manifest.input_artifact_hashes).length > 0;
}

export function coverageRunManifestIsImmutableShapedV1(manifest: CoverageRunManifestV1): boolean {
  return manifest.immutable === true;
}
