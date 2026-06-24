/**
 * Universal Coverage Factory — typed provenance reference v1.
 */

export const COVERAGE_PROVENANCE_REF_CONTRACT_V1 = "coverage_provenance_ref_v1" as const;

export const COVERAGE_PROVENANCE_REF_KINDS_V1 = [
  "artifact_path_hash",
  "packet_id",
  "contract_row",
] as const;

export type CoverageProvenanceRefKindV1 = (typeof COVERAGE_PROVENANCE_REF_KINDS_V1)[number];

export type CoverageProvenanceRefArtifactPathHashV1 = {
  kind: "artifact_path_hash";
  label: string;
  hash: string;
};

export type CoverageProvenanceRefPacketIdV1 = {
  kind: "packet_id";
  packet_id: string;
};

export type CoverageProvenanceRefContractRowV1 = {
  kind: "contract_row";
  contract: string;
  row_key: string;
};

export type CoverageProvenanceRefV1 =
  | CoverageProvenanceRefArtifactPathHashV1
  | CoverageProvenanceRefPacketIdV1
  | CoverageProvenanceRefContractRowV1;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRefKind(value: unknown): value is CoverageProvenanceRefKindV1 {
  return (
    typeof value === "string" &&
    (COVERAGE_PROVENANCE_REF_KINDS_V1 as readonly string[]).includes(value)
  );
}

export function validateCoverageProvenanceRefV1(value: unknown): value is CoverageProvenanceRefV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (!isRefKind(row.kind)) return false;

  switch (row.kind) {
    case "artifact_path_hash":
      return isNonEmptyString(row.label) && isNonEmptyString(row.hash);
    case "packet_id":
      return isNonEmptyString(row.packet_id);
    case "contract_row":
      return isNonEmptyString(row.contract) && isNonEmptyString(row.row_key);
    default:
      return false;
  }
}

export function validateCoverageProvenanceRefListV1(
  value: unknown,
): value is CoverageProvenanceRefV1[] {
  return Array.isArray(value) && value.every((ref) => validateCoverageProvenanceRefV1(ref));
}

/** Proven claims must cite at least one typed provenance ref — no empty opaque strings. */
export function coverageProvenanceRefsSatisfyProvenClaimV1(
  refs: CoverageProvenanceRefV1[],
): boolean {
  return refs.length > 0 && refs.every((ref) => validateCoverageProvenanceRefV1(ref));
}
