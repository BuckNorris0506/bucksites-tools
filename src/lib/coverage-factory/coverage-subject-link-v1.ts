/**
 * Universal Coverage Factory — subject graph link v1.
 */

import { validateCoverageSubjectIdV1 } from "./coverage-subject-id-v1";

export const COVERAGE_SUBJECT_LINK_CONTRACT_V1 = "coverage_subject_link_v1" as const;

export const COVERAGE_SUBJECT_LINK_KINDS_V1 = [
  "fits",
  "primary_for",
  "publishes",
  "buy_slot",
  "supersedes",
  "related_to",
] as const;

export type CoverageSubjectLinkKindV1 = (typeof COVERAGE_SUBJECT_LINK_KINDS_V1)[number];

export type CoverageSubjectLinkV1 = {
  contract: typeof COVERAGE_SUBJECT_LINK_CONTRACT_V1;
  from_subject_id: string;
  to_subject_id: string;
  link_kind: CoverageSubjectLinkKindV1;
  read_only: true;
  data_mutation: false;
};

function isLinkKind(value: unknown): value is CoverageSubjectLinkKindV1 {
  return (
    typeof value === "string" &&
    (COVERAGE_SUBJECT_LINK_KINDS_V1 as readonly string[]).includes(value)
  );
}

export function validateCoverageSubjectLinkV1(value: unknown): value is CoverageSubjectLinkV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (row.contract !== COVERAGE_SUBJECT_LINK_CONTRACT_V1) return false;
  if (!validateCoverageSubjectIdV1(row.from_subject_id)) return false;
  if (!validateCoverageSubjectIdV1(row.to_subject_id)) return false;
  if (row.from_subject_id === row.to_subject_id) return false;
  if (!isLinkKind(row.link_kind)) return false;
  if (row.read_only !== true || row.data_mutation !== false) return false;
  return true;
}
