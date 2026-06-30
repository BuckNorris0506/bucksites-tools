/**
 * RPWFE official GE Supabase parity mutation gate — founder approval, trust currency, IO capability.
 */

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";
import {
  buildGuardedApplyTrustCurrencyPreflightV1,
  guardedApplyTrustCurrencyBlocksMutationV1,
} from "./guarded-apply-trust-currency-preflight-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import {
  founderDecisionRowMatchesSlugIdentityV1,
  loadFounderDecisionRowsWithSlugCorrelationV1,
  type FounderDecisionRowWithSlugCorrelationV1,
} from "./founder-decision-slug-correlation-v1";
import { RPWFE_OFFICIAL_GE_RETAILER_LINKS_APPLY_RUN_REL_V1 } from "./rpwfe-official-ge-retailer-links-apply-v1";

export type RpwfeOfficialGeSupabaseParityMutationGateModeV1 = "dry_run" | "apply";

export type RpwfeOfficialGeSupabaseParityMutationGatePlanV1 = {
  filter_slug: "rpwfe";
};

export const RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1 =
  RPWFE_OFFICIAL_GE_RETAILER_LINKS_APPLY_RUN_REL_V1;

export const RPWFE_OFFICIAL_GE_SUPABASE_PARITY_MUTATION_GATE_CONTRACT_V1 =
  "rpwfe_official_ge_supabase_parity_mutation_gate_v1" as const;

export const RPWFE_OFFICIAL_GE_SUPABASE_PARITY_IO_READ_INDEX_SUPABASE_BLOCKER_V1 =
  "io_capability_read_index_cannot_mutate_supabase" as const;

export type RpwfeOfficialGeSupabaseParityMutationPreflightV1 = {
  contract: typeof RPWFE_OFFICIAL_GE_SUPABASE_PARITY_MUTATION_GATE_CONTRACT_V1;
  read_only: true;
  mode: RpwfeOfficialGeSupabaseParityMutationGateModeV1;
  mutation_authorized: boolean;
  blockers: string[];
  founder_decision_id: string | null;
  io_capability: BuckpartsIoCapabilityV1;
  apply_artifact_rel: typeof RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1;
};

function normalizePlanRelV1(planRel: string): string {
  return planRel.trim().replace(/\\/g, "/").toLowerCase();
}

export function founderRowAuthorizesRpwfeOfficialGeSupabaseParityPlanV1(args: {
  planRel: string;
  planSlug: string;
  loaded: FounderDecisionRowWithSlugCorrelationV1;
}): boolean {
  const planRelNorm = normalizePlanRelV1(args.planRel);
  if (args.loaded.apply_context_apply_plan_rel_paths.includes(planRelNorm)) {
    return true;
  }
  return founderDecisionRowMatchesSlugIdentityV1({
    slug: args.planSlug,
    applyPlanRel: args.planRel,
    loaded: args.loaded,
  });
}

export function findActiveFounderDecisionForRpwfeOfficialGeSupabaseParityPlanV1(args: {
  rootDir: string;
  planRel: string;
  plan: RpwfeOfficialGeSupabaseParityMutationGatePlanV1;
  nowIso: string;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
}): FounderDecisionRegistryRowV1 | null {
  const planSlug = args.plan.filter_slug;
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
      founderRowAuthorizesRpwfeOfficialGeSupabaseParityPlanV1({
        planRel: args.planRel,
        planSlug,
        loaded,
      })
    ) {
      return row;
    }
  }
  return null;
}

export function buildRpwfeOfficialGeSupabaseParityMutationPreflightV1(args: {
  rootDir: string;
  mode: RpwfeOfficialGeSupabaseParityMutationGateModeV1;
  planRel?: string;
  plan?: RpwfeOfficialGeSupabaseParityMutationGatePlanV1;
  io_capability?: BuckpartsIoCapabilityV1;
  now?: () => Date;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
}): RpwfeOfficialGeSupabaseParityMutationPreflightV1 {
  const io_capability = args.io_capability ?? "READ_INDEX";
  const now = args.now ?? (() => new Date());
  const planRel = args.planRel ?? RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1;
  const plan = args.plan ?? { filter_slug: "rpwfe" as const };
  const blockers: string[] = [];

  if (args.mode === "dry_run") {
    return {
      contract: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_MUTATION_GATE_CONTRACT_V1,
      read_only: true,
      mode: args.mode,
      mutation_authorized: false,
      blockers: [],
      founder_decision_id: null,
      io_capability,
      apply_artifact_rel: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
    };
  }

  if (io_capability === "READ_INDEX") {
    blockers.push(RPWFE_OFFICIAL_GE_SUPABASE_PARITY_IO_READ_INDEX_SUPABASE_BLOCKER_V1);
  }

  const trustPreflight = buildGuardedApplyTrustCurrencyPreflightV1({
    rootDir: args.rootDir,
    now,
  });
  if (guardedApplyTrustCurrencyBlocksMutationV1(trustPreflight)) {
    blockers.push(...trustPreflight.blockers.map((b) => `trust_currency:${b}`));
  }

  const founderRow = findActiveFounderDecisionForRpwfeOfficialGeSupabaseParityPlanV1({
    rootDir: args.rootDir,
    planRel,
    plan,
    nowIso: now().toISOString(),
    readText: args.readText,
    founderRows: args.founderRows,
  });
  if (founderRow == null) {
    blockers.push("founder_owner_mutation_approved_missing_or_inactive");
  }

  const uniqueBlockers = Array.from(new Set(blockers));
  return {
    contract: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_MUTATION_GATE_CONTRACT_V1,
    read_only: true,
    mode: args.mode,
    mutation_authorized: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    founder_decision_id: founderRow?.decision_id ?? null,
    io_capability,
    apply_artifact_rel: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
  };
}

export function rpwfeOfficialGeSupabaseParityMutationAuthorizedV1(
  preflight: RpwfeOfficialGeSupabaseParityMutationPreflightV1,
): boolean {
  return preflight.mode === "apply" && preflight.mutation_authorized;
}
