/**
 * Remove demo wedge brands mutation gate — founder approval, trust currency, plan + slug scope.
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

export type RemoveDemoWedgeBrandsMutationGateModeV1 = Extract<
  SupabaseMutationGateModeV1,
  "dry_run" | "write"
>;

export const REMOVE_DEMO_WEDGE_BRANDS_MUTATION_GATE_CONTRACT_V1 =
  "remove_demo_wedge_brands_mutation_gate_v1" as const;

export const REMOVE_DEMO_WEDGE_BRANDS_MUTATION_GATE_REF_V1 =
  "remove_demo_wedge_brands_mutation_gate_v1" as const;

export const REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1 = "scripts/remove-demo-wedge-brands.ts";

export const REMOVE_DEMO_WEDGE_BRANDS_MUTATION_LANE_V1 =
  "remove_demo_wedge_brands_v1" as const;

export const REMOVE_DEMO_WEDGE_BRAND_TARGET_SLUGS_V1 = ["purebrand", "poewat"] as const;

export const REMOVE_DEMO_WEDGE_BRANDS_IO_READ_INDEX_SUPABASE_BLOCKER_V1 =
  "io_capability_read_index_cannot_mutate_supabase" as const;

export const REMOVE_DEMO_FROZEN_SCRIPT_BLOCKED_V1 =
  "frozen_script_blocked_buckparts_allow_frozen_not_set" as const;

export type RemoveDemoWedgeBrandsMutationPreflightV1 = {
  contract: typeof REMOVE_DEMO_WEDGE_BRANDS_MUTATION_GATE_CONTRACT_V1;
  read_only: true;
  mode: RemoveDemoWedgeBrandsMutationGateModeV1;
  mutation_authorized: boolean;
  blockers: string[];
  founder_decision_id: string | null;
  io_capability: BuckpartsIoCapabilityV1;
  apply_plan_rel: typeof REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1;
  target_slugs: readonly string[];
  mutation_lane: typeof REMOVE_DEMO_WEDGE_BRANDS_MUTATION_LANE_V1;
  mutationGateRef: typeof REMOVE_DEMO_WEDGE_BRANDS_MUTATION_GATE_REF_V1;
};

function normalizePlanRelV1(planRel: string): string {
  return planRel.trim().replace(/\\/g, "/").toLowerCase();
}

export function founderRowAuthorizesRemoveDemoWedgeBrandsPlanV1(args: {
  planRel: string;
  loaded: FounderDecisionRowWithSlugCorrelationV1;
}): boolean {
  const planRelNorm = normalizePlanRelV1(args.planRel);
  return args.loaded.apply_context_apply_plan_rel_paths.includes(planRelNorm);
}

export function founderRowAuthorizesRemoveDemoWedgeBrandTargetSlugsV1(args: {
  loaded: FounderDecisionRowWithSlugCorrelationV1;
}): boolean {
  const slugs = new Set(
    args.loaded.apply_context_target_slugs.map((s) => s.trim().toLowerCase()),
  );
  return REMOVE_DEMO_WEDGE_BRAND_TARGET_SLUGS_V1.every((s) => slugs.has(s));
}

export function findActiveFounderDecisionForRemoveDemoWedgeBrandsV1(args: {
  rootDir: string;
  planRel: string;
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
      !founderRowAuthorizesRemoveDemoWedgeBrandsPlanV1({
        planRel: args.planRel,
        loaded,
      })
    ) {
      continue;
    }
    if (!founderRowAuthorizesRemoveDemoWedgeBrandTargetSlugsV1({ loaded })) {
      continue;
    }
    return row;
  }
  return null;
}

export function buildRemoveDemoWedgeBrandsMutationPreflightV1(args: {
  rootDir: string;
  mode: RemoveDemoWedgeBrandsMutationGateModeV1;
  planRel?: string;
  io_capability?: BuckpartsIoCapabilityV1;
  now?: () => Date;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
  allowFrozen?: boolean;
}): RemoveDemoWedgeBrandsMutationPreflightV1 {
  const io_capability = args.io_capability ?? resolveIoCapabilityFromEnvV1();
  const now = args.now ?? (() => new Date());
  const planRel = args.planRel ?? REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1;
  const blockers: string[] = [];

  if (args.mode === "dry_run") {
    return {
      contract: REMOVE_DEMO_WEDGE_BRANDS_MUTATION_GATE_CONTRACT_V1,
      read_only: true,
      mode: args.mode,
      mutation_authorized: false,
      blockers: [],
      founder_decision_id: null,
      io_capability,
      apply_plan_rel: REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1,
      target_slugs: REMOVE_DEMO_WEDGE_BRAND_TARGET_SLUGS_V1,
      mutation_lane: REMOVE_DEMO_WEDGE_BRANDS_MUTATION_LANE_V1,
      mutationGateRef: REMOVE_DEMO_WEDGE_BRANDS_MUTATION_GATE_REF_V1,
    };
  }

  if (args.allowFrozen !== true) {
    blockers.push(REMOVE_DEMO_FROZEN_SCRIPT_BLOCKED_V1);
  }

  if (io_capability === "READ_INDEX") {
    blockers.push(REMOVE_DEMO_WEDGE_BRANDS_IO_READ_INDEX_SUPABASE_BLOCKER_V1);
  }

  const trustPreflight = buildGuardedApplyTrustCurrencyPreflightV1({
    rootDir: args.rootDir,
    now,
  });
  if (guardedApplyTrustCurrencyBlocksMutationV1(trustPreflight)) {
    blockers.push(...trustPreflight.blockers.map((b) => `trust_currency:${b}`));
  }

  const founderRow = findActiveFounderDecisionForRemoveDemoWedgeBrandsV1({
    rootDir: args.rootDir,
    planRel,
    nowIso: now().toISOString(),
    readText: args.readText,
    founderRows: args.founderRows,
  });
  if (founderRow == null) {
    blockers.push("founder_owner_mutation_approved_missing_or_inactive");
  }

  const uniqueBlockers = Array.from(new Set(blockers));
  return {
    contract: REMOVE_DEMO_WEDGE_BRANDS_MUTATION_GATE_CONTRACT_V1,
    read_only: true,
    mode: args.mode,
    mutation_authorized: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    founder_decision_id: founderRow?.decision_id ?? null,
    io_capability,
    apply_plan_rel: REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1,
    target_slugs: REMOVE_DEMO_WEDGE_BRAND_TARGET_SLUGS_V1,
    mutation_lane: REMOVE_DEMO_WEDGE_BRANDS_MUTATION_LANE_V1,
    mutationGateRef: REMOVE_DEMO_WEDGE_BRANDS_MUTATION_GATE_REF_V1,
  };
}

export function removeDemoWedgeBrandsMutationAuthorizedV1(
  preflight: RemoveDemoWedgeBrandsMutationPreflightV1,
): boolean {
  return preflight.mode === "write" && preflight.mutation_authorized;
}

export function assertRemoveDemoWedgeBrandsWriteAuthorizedV1(
  preflight: RemoveDemoWedgeBrandsMutationPreflightV1,
): void {
  assertSupabaseMutationAuthorizedV1(preflight);
}
