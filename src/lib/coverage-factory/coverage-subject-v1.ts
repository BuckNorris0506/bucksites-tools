/**
 * Universal Coverage Factory — canonical coverage subject v1.
 * Pure contracts + validators; no wedge paths, retailers, or I/O.
 */

import {
  HOMEKEEP_WEDGE_CATALOG,
  isHomekeepWedgeCatalog,
  type HomekeepWedgeCatalog,
} from "@/lib/catalog/identity";

import {
  coverageSubjectIdMatchesWedgeV1,
  parseCoverageSubjectIdV1,
  validateCoverageSubjectIdV1,
} from "./coverage-subject-id-v1";

export const COVERAGE_SUBJECT_CONTRACT_V1 = "coverage_subject_v1" as const;

export const COVERAGE_SUBJECT_KINDS_V1 = [
  "model",
  "replacement_part",
  "model_replacement_pair",
  "page",
] as const;

export type CoverageSubjectKindV1 = (typeof COVERAGE_SUBJECT_KINDS_V1)[number];

export type CoverageSubjectV1 = {
  contract: typeof COVERAGE_SUBJECT_CONTRACT_V1;
  subject_id: string;
  wedge: HomekeepWedgeCatalog;
  kind: CoverageSubjectKindV1;
  /** BuckParts internal label(s); secondary to official identity. */
  internal_slug_labels: string[];
  official_model_token: string | null;
  official_replacement_token: string | null;
  official_replacement_name: string | null;
  read_only: true;
  data_mutation: false;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function validateCoverageSubjectV1(value: unknown): value is CoverageSubjectV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  if (row.contract !== COVERAGE_SUBJECT_CONTRACT_V1) return false;
  if (!validateCoverageSubjectIdV1(row.subject_id)) return false;
  if (typeof row.wedge !== "string" || !isHomekeepWedgeCatalog(row.wedge)) return false;
  if (!coverageSubjectIdMatchesWedgeV1(row.subject_id, row.wedge)) return false;
  const parsedSubjectId = parseCoverageSubjectIdV1(row.subject_id);
  if (!parsedSubjectId) return false;
  if (
    typeof row.kind !== "string" ||
    !(COVERAGE_SUBJECT_KINDS_V1 as readonly string[]).includes(row.kind)
  ) {
    return false;
  }
  if (parsedSubjectId.subject_kind !== row.kind) return false;
  if (!isStringArray(row.internal_slug_labels)) return false;
  if (row.official_model_token !== null && typeof row.official_model_token !== "string") {
    return false;
  }
  if (row.official_replacement_token !== null && typeof row.official_replacement_token !== "string") {
    return false;
  }
  if (row.official_replacement_name !== null && typeof row.official_replacement_name !== "string") {
    return false;
  }
  if (row.read_only !== true || row.data_mutation !== false) return false;
  return true;
}

/** Every subject must use a canonical Homekeep wedge key — never legacy aliases like `refrigerator`. */
export function coverageSubjectHasCanonicalWedgeIdentityV1(subject: CoverageSubjectV1): boolean {
  return isHomekeepWedgeCatalog(subject.wedge);
}

export function assertCanonicalWedgeCatalogValuesV1(): readonly HomekeepWedgeCatalog[] {
  return Object.values(HOMEKEEP_WEDGE_CATALOG);
}
