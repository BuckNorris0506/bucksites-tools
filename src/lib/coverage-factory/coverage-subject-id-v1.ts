/**
 * Universal Coverage Factory — namespaced stable subject ID grammar v1.
 * Rejects raw slug-only IDs (e.g. `alen-b75-mp`).
 */

import { isHomekeepWedgeCatalog, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";

export const COVERAGE_SUBJECT_ID_CONTRACT_V1 = "coverage_subject_id_v1" as const;

/** Short segments used in subject_id middle position (e.g. air_purifier:filter:slug). */
export const COVERAGE_SUBJECT_ID_KIND_SEGMENTS_V1 = [
  "model",
  "filter",
  "replacement_part",
  "pair",
  "model_replacement_pair",
  "page",
] as const;

export type CoverageSubjectIdKindSegmentV1 =
  (typeof COVERAGE_SUBJECT_ID_KIND_SEGMENTS_V1)[number];

export type CoverageSubjectIdResolvedKindV1 =
  | "model"
  | "replacement_part"
  | "model_replacement_pair"
  | "page";

const KIND_SEGMENT_TO_SUBJECT_KIND: Record<
  CoverageSubjectIdKindSegmentV1,
  CoverageSubjectIdResolvedKindV1
> = {
  model: "model",
  filter: "replacement_part",
  replacement_part: "replacement_part",
  pair: "model_replacement_pair",
  model_replacement_pair: "model_replacement_pair",
  page: "page",
};

const LOCAL_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isKindSegment(value: string): value is CoverageSubjectIdKindSegmentV1 {
  return (COVERAGE_SUBJECT_ID_KIND_SEGMENTS_V1 as readonly string[]).includes(value);
}

export type ParsedCoverageSubjectIdV1 = {
  wedge: HomekeepWedgeCatalog;
  kind_segment: CoverageSubjectIdKindSegmentV1;
  subject_kind: CoverageSubjectIdResolvedKindV1;
  local_key: string;
  subject_id: string;
};

/** Raw slug-only IDs (no namespace) must be rejected. */
export function coverageSubjectIdIsRawSlugOnlyV1(subjectId: string): boolean {
  if (!isNonEmptyString(subjectId)) return true;
  return !subjectId.includes(":");
}

export function parseCoverageSubjectIdV1(subjectId: string): ParsedCoverageSubjectIdV1 | null {
  if (coverageSubjectIdIsRawSlugOnlyV1(subjectId)) return null;

  const parts = subjectId.split(":");
  if (parts.length !== 3) return null;

  const [wedge, kindSegment, localKey] = parts;
  if (!isHomekeepWedgeCatalog(wedge)) return null;
  if (!isKindSegment(kindSegment)) return null;
  if (!isNonEmptyString(localKey) || !LOCAL_KEY_PATTERN.test(localKey)) return null;

  return {
    wedge,
    kind_segment: kindSegment,
    subject_kind: KIND_SEGMENT_TO_SUBJECT_KIND[kindSegment],
    local_key: localKey,
    subject_id: subjectId,
  };
}

export function validateCoverageSubjectIdV1(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return parseCoverageSubjectIdV1(value) !== null;
}

export function coverageSubjectIdMatchesWedgeV1(
  subjectId: string,
  wedge: HomekeepWedgeCatalog,
): boolean {
  const parsed = parseCoverageSubjectIdV1(subjectId);
  return parsed !== null && parsed.wedge === wedge;
}

export function buildCoverageSubjectIdV1(args: {
  wedge: HomekeepWedgeCatalog;
  kind_segment: CoverageSubjectIdKindSegmentV1;
  local_key: string;
}): string {
  const subjectId = `${args.wedge}:${args.kind_segment}:${args.local_key}`;
  if (!validateCoverageSubjectIdV1(subjectId)) {
    throw new Error(`Invalid coverage subject_id: ${subjectId}`);
  }
  return subjectId;
}
