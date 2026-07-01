/**
 * Fridge CSV seed import mutation gate — founder approval, trust currency, CSV artifact binding.
 */

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";
import {
  assertSupabaseMutationAuthorizedV1,
  resolveIoCapabilityFromEnvV1,
  type SupabaseMutationGateModeV1,
} from "./buckparts-supabase-mutation-gate-core-v1";
import {
  buildGuardedApplyTrustCurrencyPreflightV1,
  guardedApplyTrustCurrencyBlocksMutationV1,
} from "./guarded-apply-trust-currency-preflight-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import {
  loadFounderDecisionRowsWithSlugCorrelationV1,
  type FounderDecisionRowWithSlugCorrelationV1,
} from "./founder-decision-slug-correlation-v1";
import { founderRowBindsAllCsvArtifactsV1 } from "./seed-import-csv-artifact-binding-v1";
import { importSeedCsvRelPathsV1 } from "./seed-import-csv-paths-v1";

export type ImportSeedMutationGateModeV1 = Extract<SupabaseMutationGateModeV1, "dry_run" | "write">;

export const IMPORT_SEED_MUTATION_GATE_CONTRACT_V1 = "import_seed_mutation_gate_v1" as const;

export const IMPORT_SEED_MUTATION_GATE_REF_V1 = "import_seed_mutation_gate_v1" as const;

export const IMPORT_SEED_PLAN_REL_V1 = "scripts/import-seed.ts";

export const IMPORT_SEED_MUTATION_LANE_V1 = "import_seed_fridge_catalog_v1" as const;

export const IMPORT_SEED_IO_READ_INDEX_SUPABASE_BLOCKER_V1 =
  "io_capability_read_index_cannot_mutate_supabase" as const;

/** No founder-schema field authorizes destructive prune — block until explicit scope exists. */
export const IMPORT_SEED_PRUNE_FRIDGE_CATALOG_BLOCKED_V1 =
  "prune_fridge_catalog_not_authorized_in_founder_schema_v1" as const;

export type ImportSeedMutationPreflightV1 = {
  contract: typeof IMPORT_SEED_MUTATION_GATE_CONTRACT_V1;
  read_only: true;
  mode: ImportSeedMutationGateModeV1;
  mutation_authorized: boolean;
  blockers: string[];
  founder_decision_id: string | null;
  io_capability: BuckpartsIoCapabilityV1;
  apply_plan_rel: typeof IMPORT_SEED_PLAN_REL_V1;
  csv_artifact_rels: string[];
  prune_fridge_catalog: boolean;
  mutation_lane: typeof IMPORT_SEED_MUTATION_LANE_V1;
  mutationGateRef: typeof IMPORT_SEED_MUTATION_GATE_REF_V1;
};

function normalizePlanRelV1(planRel: string): string {
  return planRel.trim().replace(/\\/g, "/").toLowerCase();
}

export function founderRowAuthorizesImportSeedPlanV1(args: {
  planRel: string;
  loaded: FounderDecisionRowWithSlugCorrelationV1;
}): boolean {
  return args.loaded.apply_context_apply_plan_rel_paths.includes(normalizePlanRelV1(args.planRel));
}

export function findActiveFounderDecisionForImportSeedV1(args: {
  rootDir: string;
  planRel: string;
  csvRelPaths: readonly string[];
  nowIso: string;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
  fileExists?: (abs: string) => boolean;
}): FounderDecisionRegistryRowV1 | null {
  const founderRows =
    args.founderRows ?? loadFounderDecisionRowsWithSlugCorrelationV1(args.rootDir);

  for (const loaded of founderRows) {
    const row = loaded.row;
    if (row.decision_status !== "approved") continue;
    if (row.allowed_next_scope !== "owner_mutation_approved") continue;
    const gate = founderRegistryRowPassesMutationApprovalGateV1({
      row,
      referenceTimeIso: args.nowIso,
      rootDir: args.rootDir,
      readText: args.readText,
    });
    if (!gate.ok) continue;
    if (!founderRowAuthorizesImportSeedPlanV1({ planRel: args.planRel, loaded })) continue;
    const csvBind = founderRowBindsAllCsvArtifactsV1({
      row,
      csvRelPaths: args.csvRelPaths,
      rootDir: args.rootDir,
      readText: args.readText,
    });
    if (!csvBind.ok) continue;
    return row;
  }
  return null;
}

export function buildImportSeedMutationPreflightV1(args: {
  rootDir: string;
  mode: ImportSeedMutationGateModeV1;
  useSample: boolean;
  pruneFridgeCatalog: boolean;
  planRel?: string;
  io_capability?: BuckpartsIoCapabilityV1;
  now?: () => Date;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
  fileExists?: (abs: string) => boolean;
}): ImportSeedMutationPreflightV1 {
  const io_capability = args.io_capability ?? resolveIoCapabilityFromEnvV1();
  const now = args.now ?? (() => new Date());
  const planRel = args.planRel ?? IMPORT_SEED_PLAN_REL_V1;
  const csvRelPaths = importSeedCsvRelPathsV1({
    rootDir: args.rootDir,
    useSample: args.useSample,
    fileExists: args.fileExists,
  });
  const blockers: string[] = [];

  if (args.mode === "dry_run") {
    return {
      contract: IMPORT_SEED_MUTATION_GATE_CONTRACT_V1,
      read_only: true,
      mode: args.mode,
      mutation_authorized: false,
      blockers: [],
      founder_decision_id: null,
      io_capability,
      apply_plan_rel: IMPORT_SEED_PLAN_REL_V1,
      csv_artifact_rels: csvRelPaths,
      prune_fridge_catalog: args.pruneFridgeCatalog,
      mutation_lane: IMPORT_SEED_MUTATION_LANE_V1,
      mutationGateRef: IMPORT_SEED_MUTATION_GATE_REF_V1,
    };
  }

  if (io_capability === "READ_INDEX") {
    blockers.push(IMPORT_SEED_IO_READ_INDEX_SUPABASE_BLOCKER_V1);
  }

  const trustPreflight = buildGuardedApplyTrustCurrencyPreflightV1({
    rootDir: args.rootDir,
    now,
  });
  if (guardedApplyTrustCurrencyBlocksMutationV1(trustPreflight)) {
    blockers.push(...trustPreflight.blockers.map((b) => `trust_currency:${b}`));
  }

  if (args.pruneFridgeCatalog) {
    blockers.push(IMPORT_SEED_PRUNE_FRIDGE_CATALOG_BLOCKED_V1);
  }

  const founderRow = findActiveFounderDecisionForImportSeedV1({
    rootDir: args.rootDir,
    planRel,
    csvRelPaths,
    nowIso: now().toISOString(),
    readText: args.readText,
    founderRows: args.founderRows,
    fileExists: args.fileExists,
  });
  if (founderRow == null) {
    blockers.push("founder_owner_mutation_approved_missing_or_inactive");
  }

  const uniqueBlockers = Array.from(new Set(blockers));
  return {
    contract: IMPORT_SEED_MUTATION_GATE_CONTRACT_V1,
    read_only: true,
    mode: args.mode,
    mutation_authorized: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    founder_decision_id: founderRow?.decision_id ?? null,
    io_capability,
    apply_plan_rel: IMPORT_SEED_PLAN_REL_V1,
    csv_artifact_rels: csvRelPaths,
    prune_fridge_catalog: args.pruneFridgeCatalog,
    mutation_lane: IMPORT_SEED_MUTATION_LANE_V1,
    mutationGateRef: IMPORT_SEED_MUTATION_GATE_REF_V1,
  };
}

export function importSeedMutationAuthorizedV1(preflight: ImportSeedMutationPreflightV1): boolean {
  return preflight.mode === "write" && preflight.mutation_authorized;
}

export function assertImportSeedWriteAuthorizedV1(preflight: ImportSeedMutationPreflightV1): void {
  assertSupabaseMutationAuthorizedV1(preflight);
}
