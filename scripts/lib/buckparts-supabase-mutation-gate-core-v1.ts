/**
 * Shared fail-closed Supabase service-role mutation preflight (IO capability only).
 * Lane-specific gates add founder/trust/plan binding on top of this core.
 */

import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";

export const BUCKPARTS_SUPABASE_MUTATION_GATE_CORE_CONTRACT_V1 =
  "buckparts_supabase_mutation_gate_core_v1" as const;

export const BUCKPARTS_IO_CAPABILITY_ENV_V1 = "BUCKPARTS_IO_CAPABILITY" as const;

export const IO_CAPABILITY_READ_INDEX_CANNOT_MUTATE_SUPABASE_V1 =
  "io_capability_read_index_cannot_mutate_supabase" as const;

export type SupabaseMutationGateModeV1 = "dry_run" | "write" | "apply";

export type SupabaseMutationGatePreflightV1 = {
  contract: typeof BUCKPARTS_SUPABASE_MUTATION_GATE_CORE_CONTRACT_V1;
  read_only: true;
  mode: SupabaseMutationGateModeV1;
  mutation_authorized: boolean;
  blockers: string[];
  io_capability: BuckpartsIoCapabilityV1;
};

export function resolveIoCapabilityFromEnvV1(): BuckpartsIoCapabilityV1 {
  const raw = process.env[BUCKPARTS_IO_CAPABILITY_ENV_V1]?.trim().toUpperCase();
  if (raw === "MUTATION") return "MUTATION";
  return "READ_INDEX";
}

export function isSupabaseWriteIntentModeV1(mode: SupabaseMutationGateModeV1): boolean {
  return mode === "write" || mode === "apply";
}

export function buildSupabaseMutationGatePreflightV1(args: {
  mode: SupabaseMutationGateModeV1;
  io_capability?: BuckpartsIoCapabilityV1;
  extra_blockers?: string[];
}): SupabaseMutationGatePreflightV1 {
  const io_capability = args.io_capability ?? resolveIoCapabilityFromEnvV1();

  if (!isSupabaseWriteIntentModeV1(args.mode)) {
    return {
      contract: BUCKPARTS_SUPABASE_MUTATION_GATE_CORE_CONTRACT_V1,
      read_only: true,
      mode: args.mode,
      mutation_authorized: false,
      blockers: [],
      io_capability,
    };
  }

  const blockers = [...(args.extra_blockers ?? [])];
  if (io_capability === "READ_INDEX") {
    blockers.push(IO_CAPABILITY_READ_INDEX_CANNOT_MUTATE_SUPABASE_V1);
  }

  const uniqueBlockers = Array.from(new Set(blockers));
  return {
    contract: BUCKPARTS_SUPABASE_MUTATION_GATE_CORE_CONTRACT_V1,
    read_only: true,
    mode: args.mode,
    mutation_authorized: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    io_capability,
  };
}

export function supabaseMutationAuthorizedV1(
  preflight: SupabaseMutationGatePreflightV1,
): boolean {
  return isSupabaseWriteIntentModeV1(preflight.mode) && preflight.mutation_authorized;
}

export class SupabaseMutationGateBlockedError extends Error {
  readonly blockers: readonly string[];

  constructor(blockers: readonly string[]) {
    super(`supabase_mutation_gate_blocked:${blockers.join(",")}`);
    this.name = "SupabaseMutationGateBlockedError";
    this.blockers = blockers;
  }
}

export function assertSupabaseMutationAuthorizedV1(
  preflight: SupabaseMutationGatePreflightV1,
): void {
  if (!isSupabaseWriteIntentModeV1(preflight.mode)) return;
  if (preflight.mutation_authorized) return;
  throw new SupabaseMutationGateBlockedError(preflight.blockers);
}
