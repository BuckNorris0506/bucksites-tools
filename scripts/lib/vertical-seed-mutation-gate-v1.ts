/**
 * Vertical CSV seed import mutation gate — founder approval, trust currency, CSV artifact binding.
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
import { verticalSeedCsvRelPathsV1, type VerticalSeedKeyV1 } from "./seed-import-csv-paths-v1";

export type VerticalSeedMutationGateModeV1 = Extract<
  SupabaseMutationGateModeV1,
  "dry_run" | "write"
>;

export const VERTICAL_SEED_MUTATION_GATE_CONTRACT_V1 = "vertical_seed_mutation_gate_v1" as const;

export const VERTICAL_SEED_MUTATION_GATE_REF_V1 = "vertical_seed_mutation_gate_v1" as const;

export const VERTICAL_SEED_PLAN_REL_V1 = "scripts/lib/vertical-seed-run-v1.ts";

export const VERTICAL_SEED_MUTATION_LANE_V1 = "vertical_seed_catalog_v1" as const;

export const VERTICAL_SEED_IO_READ_INDEX_SUPABASE_BLOCKER_V1 =
  "io_capability_read_index_cannot_mutate_supabase" as const;

export type VerticalSeedMutationPreflightV1 = {
  contract: typeof VERTICAL_SEED_MUTATION_GATE_CONTRACT_V1;
  read_only: true;
  mode: VerticalSeedMutationGateModeV1;
  mutation_authorized: boolean;
  blockers: string[];
  founder_decision_id: string | null;
  io_capability: BuckpartsIoCapabilityV1;
  apply_plan_rel: typeof VERTICAL_SEED_PLAN_REL_V1;
  catalog_scope: VerticalSeedKeyV1;
  csv_artifact_rels: string[];
  mutation_lane: typeof VERTICAL_SEED_MUTATION_LANE_V1;
  mutationGateRef: typeof VERTICAL_SEED_MUTATION_GATE_REF_V1;
};

function normalizePlanRelV1(planRel: string): string {
  return planRel.trim().replace(/\\/g, "/").toLowerCase();
}

export function founderRowAuthorizesVerticalSeedPlanV1(args: {
  planRel: string;
  loaded: FounderDecisionRowWithSlugCorrelationV1;
}): boolean {
  return args.loaded.apply_context_apply_plan_rel_paths.includes(normalizePlanRelV1(args.planRel));
}

export function findActiveFounderDecisionForVerticalSeedV1(args: {
  rootDir: string;
  planRel: string;
  verticalKey: VerticalSeedKeyV1;
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
    if (!founderRowAuthorizesVerticalSeedPlanV1({ planRel: args.planRel, loaded })) continue;
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

export function buildVerticalSeedMutationPreflightV1(args: {
  rootDir: string;
  mode: VerticalSeedMutationGateModeV1;
  verticalKey: VerticalSeedKeyV1;
  useSample: boolean;
  planRel?: string;
  io_capability?: BuckpartsIoCapabilityV1;
  now?: () => Date;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
  fileExists?: (abs: string) => boolean;
}): VerticalSeedMutationPreflightV1 {
  const io_capability = args.io_capability ?? resolveIoCapabilityFromEnvV1();
  const now = args.now ?? (() => new Date());
  const planRel = args.planRel ?? VERTICAL_SEED_PLAN_REL_V1;
  const csvRelPaths = verticalSeedCsvRelPathsV1({
    rootDir: args.rootDir,
    verticalKey: args.verticalKey,
    useSample: args.useSample,
    fileExists: args.fileExists,
  });
  const blockers: string[] = [];

  if (args.mode === "dry_run") {
    return {
      contract: VERTICAL_SEED_MUTATION_GATE_CONTRACT_V1,
      read_only: true,
      mode: args.mode,
      mutation_authorized: false,
      blockers: [],
      founder_decision_id: null,
      io_capability,
      apply_plan_rel: VERTICAL_SEED_PLAN_REL_V1,
      catalog_scope: args.verticalKey,
      csv_artifact_rels: csvRelPaths,
      mutation_lane: VERTICAL_SEED_MUTATION_LANE_V1,
      mutationGateRef: VERTICAL_SEED_MUTATION_GATE_REF_V1,
    };
  }

  if (io_capability === "READ_INDEX") {
    blockers.push(VERTICAL_SEED_IO_READ_INDEX_SUPABASE_BLOCKER_V1);
  }

  const trustPreflight = buildGuardedApplyTrustCurrencyPreflightV1({
    rootDir: args.rootDir,
    now,
  });
  if (guardedApplyTrustCurrencyBlocksMutationV1(trustPreflight)) {
    blockers.push(...trustPreflight.blockers.map((b) => `trust_currency:${b}`));
  }

  const founderRow = findActiveFounderDecisionForVerticalSeedV1({
    rootDir: args.rootDir,
    planRel,
    verticalKey: args.verticalKey,
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
    contract: VERTICAL_SEED_MUTATION_GATE_CONTRACT_V1,
    read_only: true,
    mode: args.mode,
    mutation_authorized: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    founder_decision_id: founderRow?.decision_id ?? null,
    io_capability,
    apply_plan_rel: VERTICAL_SEED_PLAN_REL_V1,
    catalog_scope: args.verticalKey,
    csv_artifact_rels: csvRelPaths,
    mutation_lane: VERTICAL_SEED_MUTATION_LANE_V1,
    mutationGateRef: VERTICAL_SEED_MUTATION_GATE_REF_V1,
  };
}

export function verticalSeedMutationAuthorizedV1(preflight: VerticalSeedMutationPreflightV1): boolean {
  return preflight.mode === "write" && preflight.mutation_authorized;
}

export function assertVerticalSeedWriteAuthorizedV1(preflight: VerticalSeedMutationPreflightV1): void {
  assertSupabaseMutationAuthorizedV1(preflight);
}
