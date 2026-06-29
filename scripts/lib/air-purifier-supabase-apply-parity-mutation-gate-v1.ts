/**
 * AP Supabase parity mutation gate — founder approval, trust currency, IO capability.
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

export type ApSupabaseParityMutationGateModeV1 = "dry_run" | "apply";

export type ApSupabaseParityMutationGatePlanV1 = {
  planned_changes?: Array<{ filter_slug: string }>;
};

export const AP_SUPABASE_PARITY_MUTATION_GATE_CONTRACT_V1 =
  "ap_supabase_parity_mutation_gate_v1" as const;

export const AP_SUPABASE_PARITY_IO_READ_INDEX_SUPABASE_BLOCKER_V1 =
  "io_capability_read_index_cannot_mutate_supabase" as const;

export type ApSupabaseParityMutationPreflightV1 = {
  contract: typeof AP_SUPABASE_PARITY_MUTATION_GATE_CONTRACT_V1;
  read_only: true;
  mode: ApSupabaseParityMutationGateModeV1;
  mutation_authorized: boolean;
  blockers: string[];
  founder_decision_id: string | null;
  io_capability: BuckpartsIoCapabilityV1;
};

function normalizePlanRelV1(planRel: string): string {
  return planRel.trim().replace(/\\/g, "/").toLowerCase();
}

export function founderRowAuthorizesApSupabaseParityPlanV1(args: {
  planRel: string;
  planSlugs: readonly string[];
  loaded: FounderDecisionRowWithSlugCorrelationV1;
}): boolean {
  const planRelNorm = normalizePlanRelV1(args.planRel);
  if (args.loaded.apply_context_apply_plan_rel_paths.includes(planRelNorm)) {
    return true;
  }
  if (args.planSlugs.length === 0) return false;
  return args.planSlugs.every((slug) =>
    founderDecisionRowMatchesSlugIdentityV1({
      slug,
      applyPlanRel: args.planRel,
      loaded: args.loaded,
    }),
  );
}

function planSlugsFromApSupabaseParityPlanV1(plan: ApSupabaseParityMutationGatePlanV1): string[] {
  return (plan.planned_changes ?? []).map((change) => change.filter_slug);
}

export function findActiveFounderDecisionForApSupabaseParityPlanV1(args: {
  rootDir: string;
  planRel: string;
  plan: ApSupabaseParityMutationGatePlanV1;
  nowIso: string;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
}): FounderDecisionRegistryRowV1 | null {
  const planSlugs = planSlugsFromApSupabaseParityPlanV1(args.plan);
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
      founderRowAuthorizesApSupabaseParityPlanV1({
        planRel: args.planRel,
        planSlugs,
        loaded,
      })
    ) {
      return row;
    }
  }
  return null;
}

export function buildApSupabaseParityMutationPreflightV1(args: {
  rootDir: string;
  mode: ApSupabaseParityMutationGateModeV1;
  planRel: string;
  plan: ApSupabaseParityMutationGatePlanV1;
  io_capability?: BuckpartsIoCapabilityV1;
  now?: () => Date;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
}): ApSupabaseParityMutationPreflightV1 {
  const io_capability = args.io_capability ?? "READ_INDEX";
  const now = args.now ?? (() => new Date());
  const blockers: string[] = [];

  if (args.mode === "dry_run") {
    return {
      contract: AP_SUPABASE_PARITY_MUTATION_GATE_CONTRACT_V1,
      read_only: true,
      mode: args.mode,
      mutation_authorized: false,
      blockers: [],
      founder_decision_id: null,
      io_capability,
    };
  }

  if (io_capability === "READ_INDEX") {
    blockers.push(AP_SUPABASE_PARITY_IO_READ_INDEX_SUPABASE_BLOCKER_V1);
  }

  const trustPreflight = buildGuardedApplyTrustCurrencyPreflightV1({
    rootDir: args.rootDir,
    now,
  });
  if (guardedApplyTrustCurrencyBlocksMutationV1(trustPreflight)) {
    blockers.push(...trustPreflight.blockers.map((b) => `trust_currency:${b}`));
  }

  const founderRow = findActiveFounderDecisionForApSupabaseParityPlanV1({
    rootDir: args.rootDir,
    planRel: args.planRel,
    plan: args.plan,
    nowIso: now().toISOString(),
    readText: args.readText,
    founderRows: args.founderRows,
  });
  if (founderRow == null) {
    blockers.push("founder_owner_mutation_approved_missing_or_inactive");
  }

  const uniqueBlockers = Array.from(new Set(blockers));
  return {
    contract: AP_SUPABASE_PARITY_MUTATION_GATE_CONTRACT_V1,
    read_only: true,
    mode: args.mode,
    mutation_authorized: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    founder_decision_id: founderRow?.decision_id ?? null,
    io_capability,
  };
}

export function apSupabaseParityMutationAuthorizedV1(
  preflight: ApSupabaseParityMutationPreflightV1,
): boolean {
  return preflight.mode === "apply" && preflight.mutation_authorized;
}
