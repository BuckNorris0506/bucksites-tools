/**
 * Verify OEM retailer links Playwright write-db mutation gate — founder, trust, CSV artifact binding.
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

export type VerifyOemRetailerLinksMutationGateModeV1 = Extract<
  SupabaseMutationGateModeV1,
  "dry_run" | "write"
>;

export const VERIFY_OEM_RETAILER_LINKS_MUTATION_GATE_CONTRACT_V1 =
  "verify_oem_retailer_links_mutation_gate_v1" as const;

export const VERIFY_OEM_RETAILER_LINKS_MUTATION_GATE_REF_V1 =
  "verify_oem_retailer_links_mutation_gate_v1" as const;

export const VERIFY_OEM_RETAILER_LINKS_PLAN_REL_V1 =
  "scripts/verify-oem-retailer-links-playwright.ts";

export const VERIFY_OEM_RETAILER_LINKS_MUTATION_LANE_V1 =
  "verify_oem_retailer_links_write_db_v1" as const;

export const VERIFY_OEM_RETAILER_LINKS_IO_READ_INDEX_SUPABASE_BLOCKER_V1 =
  "io_capability_read_index_cannot_mutate_supabase" as const;

export type VerifyOemRetailerLinksMutationPreflightV1 = {
  contract: typeof VERIFY_OEM_RETAILER_LINKS_MUTATION_GATE_CONTRACT_V1;
  read_only: true;
  mode: VerifyOemRetailerLinksMutationGateModeV1;
  mutation_authorized: boolean;
  blockers: string[];
  founder_decision_id: string | null;
  io_capability: BuckpartsIoCapabilityV1;
  apply_plan_rel: typeof VERIFY_OEM_RETAILER_LINKS_PLAN_REL_V1;
  csv_rel_paths: string[];
  mutation_lane: typeof VERIFY_OEM_RETAILER_LINKS_MUTATION_LANE_V1;
  mutationGateRef: typeof VERIFY_OEM_RETAILER_LINKS_MUTATION_GATE_REF_V1;
};

function normalizePlanRelV1(planRel: string): string {
  return planRel.trim().replace(/\\/g, "/").toLowerCase();
}

export function founderRowAuthorizesVerifyOemRetailerLinksPlanV1(args: {
  planRel: string;
  loaded: FounderDecisionRowWithSlugCorrelationV1;
}): boolean {
  const planRelNorm = normalizePlanRelV1(args.planRel);
  return args.loaded.apply_context_apply_plan_rel_paths.includes(planRelNorm);
}

export function findActiveFounderDecisionForVerifyOemRetailerLinksWriteDbV1(args: {
  rootDir: string;
  planRel: string;
  csvRelPaths: readonly string[];
  nowIso: string;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
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
    if (
      !founderRowAuthorizesVerifyOemRetailerLinksPlanV1({
        planRel: args.planRel,
        loaded,
      })
    ) {
      continue;
    }
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

export function buildVerifyOemRetailerLinksMutationPreflightV1(args: {
  rootDir: string;
  mode: VerifyOemRetailerLinksMutationGateModeV1;
  csvRelPaths: readonly string[];
  planRel?: string;
  io_capability?: BuckpartsIoCapabilityV1;
  now?: () => Date;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
}): VerifyOemRetailerLinksMutationPreflightV1 {
  const io_capability = args.io_capability ?? resolveIoCapabilityFromEnvV1();
  const now = args.now ?? (() => new Date());
  const planRel = args.planRel ?? VERIFY_OEM_RETAILER_LINKS_PLAN_REL_V1;
  const csvRelPaths = [...args.csvRelPaths];
  const blockers: string[] = [];

  if (args.mode === "dry_run") {
    return {
      contract: VERIFY_OEM_RETAILER_LINKS_MUTATION_GATE_CONTRACT_V1,
      read_only: true,
      mode: args.mode,
      mutation_authorized: false,
      blockers: [],
      founder_decision_id: null,
      io_capability,
      apply_plan_rel: VERIFY_OEM_RETAILER_LINKS_PLAN_REL_V1,
      csv_rel_paths: csvRelPaths,
      mutation_lane: VERIFY_OEM_RETAILER_LINKS_MUTATION_LANE_V1,
      mutationGateRef: VERIFY_OEM_RETAILER_LINKS_MUTATION_GATE_REF_V1,
    };
  }

  if (io_capability === "READ_INDEX") {
    blockers.push(VERIFY_OEM_RETAILER_LINKS_IO_READ_INDEX_SUPABASE_BLOCKER_V1);
  }

  const trustPreflight = buildGuardedApplyTrustCurrencyPreflightV1({
    rootDir: args.rootDir,
    now,
  });
  if (guardedApplyTrustCurrencyBlocksMutationV1(trustPreflight)) {
    blockers.push(...trustPreflight.blockers.map((b) => `trust_currency:${b}`));
  }

  if (csvRelPaths.length === 0) {
    blockers.push("csv_artifact_rel_paths_missing");
  }

  let founderRow: FounderDecisionRegistryRowV1 | null = null;
  if (csvRelPaths.length > 0) {
    founderRow = findActiveFounderDecisionForVerifyOemRetailerLinksWriteDbV1({
      rootDir: args.rootDir,
      planRel,
      csvRelPaths,
      nowIso: now().toISOString(),
      readText: args.readText,
      founderRows: args.founderRows,
    });
  }
  if (founderRow == null) {
    blockers.push("founder_owner_mutation_approved_missing_or_inactive");
  }

  const uniqueBlockers = Array.from(new Set(blockers));
  return {
    contract: VERIFY_OEM_RETAILER_LINKS_MUTATION_GATE_CONTRACT_V1,
    read_only: true,
    mode: args.mode,
    mutation_authorized: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    founder_decision_id: founderRow?.decision_id ?? null,
    io_capability,
    apply_plan_rel: VERIFY_OEM_RETAILER_LINKS_PLAN_REL_V1,
    csv_rel_paths: csvRelPaths,
    mutation_lane: VERIFY_OEM_RETAILER_LINKS_MUTATION_LANE_V1,
    mutationGateRef: VERIFY_OEM_RETAILER_LINKS_MUTATION_GATE_REF_V1,
  };
}

export function verifyOemRetailerLinksMutationAuthorizedV1(
  preflight: VerifyOemRetailerLinksMutationPreflightV1,
): boolean {
  return preflight.mode === "write" && preflight.mutation_authorized;
}

export function assertVerifyOemRetailerLinksWriteDbAuthorizedV1(
  preflight: VerifyOemRetailerLinksMutationPreflightV1,
): void {
  assertSupabaseMutationAuthorizedV1(preflight);
}
