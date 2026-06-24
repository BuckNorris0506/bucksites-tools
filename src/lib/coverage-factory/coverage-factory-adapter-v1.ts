/**
 * Universal Coverage Factory — wedge adapter descriptor v1 (capability metadata only).
 * No CSV paths, retailer logic, or mutation authority.
 */

import { isHomekeepWedgeCatalog, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";

export const COVERAGE_FACTORY_ADAPTER_CONTRACT_V1 = "coverage_factory_adapter_v1" as const;

export const COVERAGE_FACTORY_ADAPTER_CAPABILITIES_V1 = [
  "discover_subjects",
  "collect_signals",
  "classify_policy",
  "map_legacy_state",
] as const;

export type CoverageFactoryAdapterCapabilityV1 =
  (typeof COVERAGE_FACTORY_ADAPTER_CAPABILITIES_V1)[number];

export type CoverageFactoryAdapterDescriptorV1 = {
  contract: typeof COVERAGE_FACTORY_ADAPTER_CONTRACT_V1;
  adapter_id: string;
  adapter_version: string;
  wedge: HomekeepWedgeCatalog;
  capabilities: CoverageFactoryAdapterCapabilityV1[];
  legacy_state_labels: string[];
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  production_mutation_authorized: false;
  artifact_write_authorized: false;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCapability(value: unknown): value is CoverageFactoryAdapterCapabilityV1 {
  return (
    typeof value === "string" &&
    (COVERAGE_FACTORY_ADAPTER_CAPABILITIES_V1 as readonly string[]).includes(value)
  );
}

export function validateCoverageFactoryAdapterDescriptorV1(
  value: unknown,
): value is CoverageFactoryAdapterDescriptorV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (row.contract !== COVERAGE_FACTORY_ADAPTER_CONTRACT_V1) return false;
  if (!isNonEmptyString(row.adapter_id)) return false;
  if (!isNonEmptyString(row.adapter_version)) return false;
  if (typeof row.wedge !== "string" || !isHomekeepWedgeCatalog(row.wedge)) return false;
  if (!Array.isArray(row.capabilities) || row.capabilities.length === 0) return false;
  if (!row.capabilities.every((cap) => isCapability(cap))) return false;
  if (
    !Array.isArray(row.legacy_state_labels) ||
    !row.legacy_state_labels.every((label) => typeof label === "string")
  ) {
    return false;
  }
  if (row.read_only !== true || row.data_mutation !== false) return false;
  if (row.mutation_authorized !== false) return false;
  if (row.production_mutation_authorized !== false) return false;
  if (row.artifact_write_authorized !== false) return false;
  return true;
}

export function coverageFactoryAdapterGrantsMutationAuthorityV1(
  adapter: CoverageFactoryAdapterDescriptorV1,
): false {
  void adapter;
  return false;
}

export function coverageFactoryAdapterDescribesCapabilityOnlyV1(
  adapter: CoverageFactoryAdapterDescriptorV1,
): boolean {
  return (
    adapter.read_only === true &&
    adapter.data_mutation === false &&
    adapter.mutation_authorized === false &&
    adapter.production_mutation_authorized === false &&
    adapter.artifact_write_authorized === false &&
    adapter.capabilities.length > 0
  );
}
