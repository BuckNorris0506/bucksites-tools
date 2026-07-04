/**
 * eptwfu01 only — scoped fridge retailer_links CSV ↔ Supabase parity + sync.
 * Dry-run default. Write requires MUTATION + founder approval for eptwfu01.
 */

import {
  applyScopedFridgeRetailerLinksWriteV1,
  assertOnlyAllowedSlugsV1,
  buildScopedFridgeRetailerLinksParityReportV1,
  buildScopedFieldParityV1,
  fridgeRetailerLinksScopedFieldValuesMatchV1,
  loadScopedSupabasePrimariesV1,
  normalizeUtcInstantForParityV1,
  parseScopedFridgeRetailerLinksCliArgsV1,
  planScopedWriteOpsV1,
  selectScopedCsvPrimaryRowsV1,
  writeScopedParityReportArtifactV1,
  type FridgeRetailerLinksScopedLaneConfigV1,
  type FridgeRetailerLinksScopedParityReportV1,
  type FridgeRetailerLinksScopedWriteOpV1,
} from "./fridge-retailer-links-scoped-supabase-parity-core-v1";

export const FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_PARITY_CONTRACT_V1 =
  "fridge_safe_link_eptwfu01_retailer_links_supabase_parity_v1" as const;

export const FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_ALLOWED_SLUGS_V1 = [
  "eptwfu01",
] as const;

export type FridgeSafeLinkEptwfu01SlugV1 =
  (typeof FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_ALLOWED_SLUGS_V1)[number];

export const FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_LANE_V1: FridgeRetailerLinksScopedLaneConfigV1<FridgeSafeLinkEptwfu01SlugV1> =
  {
    contract: FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_PARITY_CONTRACT_V1,
    closeout_contract: "fridge_safe_link_eptwfu01_retailer_links_supabase_parity_closeout_v1",
    allowed_slugs: FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_ALLOWED_SLUGS_V1,
    report_artifact_rel:
      "data/fridge/batch-production/drafts/fridge-safe-link-eptwfu01-retailer-links-supabase-parity-v1.json",
    closeout_artifact_rel:
      "data/fridge/batch-production/closeout/fridge-safe-link-eptwfu01-retailer-links-supabase-parity-closeout-v1.json",
    dry_run_command: "npm run buckparts:fridge-safe-link-eptwfu01-retailer-links-supabase-parity",
    write_command:
      "BUCKPARTS_IO_CAPABILITY=MUTATION npm run buckparts:fridge-safe-link-eptwfu01-retailer-links-supabase-parity -- --write",
    allowlist_proven_fact: "PROVEN: lane allowlist is exactly eptwfu01.",
    max_planned_rows: 1,
  };

export {
  normalizeUtcInstantForParityV1,
  fridgeRetailerLinksScopedFieldValuesMatchV1 as eptwfu01FieldValuesMatchV1,
};

export function assertOnlyEptwfu01SlugV1(slugs: readonly string[]): {
  ok: boolean;
  blockers: string[];
} {
  return assertOnlyAllowedSlugsV1(FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_LANE_V1, slugs);
}

export function selectEptwfu01CsvPrimaryRowsV1(args: {
  rootDir: string;
  readText?: (abs: string) => string;
}) {
  return selectScopedCsvPrimaryRowsV1({
    lane: FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_LANE_V1,
    ...args,
  });
}

export async function buildEptwfu01FridgeRetailerLinksParityReportV1(args: {
  rootDir: string;
  mode?: "dry_run" | "write";
  now?: () => Date;
  readText?: (abs: string) => string;
  loadSupabase?: typeof loadScopedSupabasePrimariesV1<FridgeSafeLinkEptwfu01SlugV1>;
}): Promise<FridgeRetailerLinksScopedParityReportV1<FridgeSafeLinkEptwfu01SlugV1>> {
  return buildScopedFridgeRetailerLinksParityReportV1({
    lane: FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_LANE_V1,
    ...args,
  });
}

export function planEptwfu01WriteOpsV1(
  report: FridgeRetailerLinksScopedParityReportV1<FridgeSafeLinkEptwfu01SlugV1>,
): FridgeRetailerLinksScopedWriteOpV1<FridgeSafeLinkEptwfu01SlugV1>[] {
  return planScopedWriteOpsV1(FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_LANE_V1, report);
}

export async function applyEptwfu01FridgeRetailerLinksWriteV1(args: {
  rootDir: string;
  report: FridgeRetailerLinksScopedParityReportV1<FridgeSafeLinkEptwfu01SlugV1>;
  now?: () => Date;
}) {
  return applyScopedFridgeRetailerLinksWriteV1({
    lane: FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_LANE_V1,
    ...args,
  });
}

export function parseEptwfu01FridgeRetailerLinksCliArgsV1(argv: readonly string[]): {
  write: boolean;
} {
  return parseScopedFridgeRetailerLinksCliArgsV1(argv);
}

export function eptwfu01FridgeRetailerLinksDryRunCommandV1(): string {
  return FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_LANE_V1.dry_run_command;
}

export function eptwfu01FridgeRetailerLinksWriteCommandV1(): string {
  return FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_LANE_V1.write_command;
}

export function writeEptwfu01ParityReportArtifactV1(args: {
  rootDir: string;
  report: FridgeRetailerLinksScopedParityReportV1<FridgeSafeLinkEptwfu01SlugV1>;
}): string {
  return writeScopedParityReportArtifactV1({
    lane: FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_LANE_V1,
    ...args,
  });
}

export { buildScopedFieldParityV1, loadScopedSupabasePrimariesV1 };
