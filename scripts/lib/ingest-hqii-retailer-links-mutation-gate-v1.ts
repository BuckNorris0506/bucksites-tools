/**
 * HQII retailer-links ingest mutation gate — founder approval, trust currency, input artifact binding.
 */

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  extractBoundArtifactsFromFounderRowV1,
  verifyArtifactSha256V1,
} from "../../src/lib/owner-dashboard/truth-ledger-v1";
import { normalizeRepoRelPathV1 } from "./buckparts-io-capabilities-v1";
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

export type IngestHqiiRetailerLinksMutationGateModeV1 = Extract<
  SupabaseMutationGateModeV1,
  "dry_run" | "write"
>;

export const INGEST_HQII_RETAILER_LINKS_MUTATION_GATE_CONTRACT_V1 =
  "ingest_hqii_retailer_links_mutation_gate_v1" as const;

export const INGEST_HQII_RETAILER_LINKS_MUTATION_GATE_REF_V1 =
  "ingest_hqii_retailer_links_mutation_gate_v1" as const;

export const INGEST_HQII_RETAILER_LINKS_PLAN_REL_V1 = "scripts/ingest-hqii-retailer-links.ts";

export const INGEST_HQII_RETAILER_LINKS_MUTATION_LANE_V1 =
  "ingest_hqii_retailer_links_v1" as const;

export const INGEST_HQII_RETAILER_LINKS_IO_READ_INDEX_SUPABASE_BLOCKER_V1 =
  "io_capability_read_index_cannot_mutate_supabase" as const;

export type IngestHqiiRetailerLinksMutationPreflightV1 = {
  contract: typeof INGEST_HQII_RETAILER_LINKS_MUTATION_GATE_CONTRACT_V1;
  read_only: true;
  mode: IngestHqiiRetailerLinksMutationGateModeV1;
  mutation_authorized: boolean;
  blockers: string[];
  founder_decision_id: string | null;
  io_capability: BuckpartsIoCapabilityV1;
  apply_plan_rel: typeof INGEST_HQII_RETAILER_LINKS_PLAN_REL_V1;
  input_artifact_rel: string | null;
  mutation_lane: typeof INGEST_HQII_RETAILER_LINKS_MUTATION_LANE_V1;
  mutationGateRef: typeof INGEST_HQII_RETAILER_LINKS_MUTATION_GATE_REF_V1;
};

function normalizePlanRelV1(planRel: string): string {
  return planRel.trim().replace(/\\/g, "/").toLowerCase();
}

export function founderRowAuthorizesIngestHqiiRetailerLinksPlanV1(args: {
  planRel: string;
  loaded: FounderDecisionRowWithSlugCorrelationV1;
}): boolean {
  const planRelNorm = normalizePlanRelV1(args.planRel);
  return args.loaded.apply_context_apply_plan_rel_paths.includes(planRelNorm);
}

export function founderRowBindsInputArtifactV1(args: {
  row: FounderDecisionRegistryRowV1;
  inputRelPath: string;
  rootDir: string;
  readText?: (abs: string) => string;
}): { ok: true } | { ok: false; blockers: string[] } {
  const inputNorm = normalizePlanRelV1(
    normalizeRepoRelPathV1(args.inputRelPath, args.rootDir),
  );
  const bindings = extractBoundArtifactsFromFounderRowV1(args.row);
  const match = bindings.find(
    (b) => normalizePlanRelV1(b.artifact_rel_path) === inputNorm,
  );
  if (!match) {
    return { ok: false, blockers: ["founder_input_artifact_unbound"] };
  }
  const verify = verifyArtifactSha256V1({
    rootDir: args.rootDir,
    artifact_rel_path: match.artifact_rel_path,
    expected_sha256: match.sha256_at_binding,
    readText: args.readText,
  });
  if (!verify.ok) {
    return { ok: false, blockers: [`${verify.reason}:input_artifact`] };
  }
  return { ok: true };
}

export function findActiveFounderDecisionForIngestHqiiRetailerLinksV1(args: {
  rootDir: string;
  planRel: string;
  inputRelPath: string;
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
      !founderRowAuthorizesIngestHqiiRetailerLinksPlanV1({
        planRel: args.planRel,
        loaded,
      })
    ) {
      continue;
    }
    const inputBind = founderRowBindsInputArtifactV1({
      row,
      inputRelPath: args.inputRelPath,
      rootDir: args.rootDir,
      readText: args.readText,
    });
    if (!inputBind.ok) continue;
    return row;
  }
  return null;
}

export function buildIngestHqiiRetailerLinksMutationPreflightV1(args: {
  rootDir: string;
  mode: IngestHqiiRetailerLinksMutationGateModeV1;
  inputRelPath?: string | null;
  planRel?: string;
  io_capability?: BuckpartsIoCapabilityV1;
  now?: () => Date;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
}): IngestHqiiRetailerLinksMutationPreflightV1 {
  const io_capability = args.io_capability ?? resolveIoCapabilityFromEnvV1();
  const now = args.now ?? (() => new Date());
  const planRel = args.planRel ?? INGEST_HQII_RETAILER_LINKS_PLAN_REL_V1;
  const inputRel =
    args.inputRelPath != null
      ? normalizeRepoRelPathV1(args.inputRelPath, args.rootDir)
      : null;
  const blockers: string[] = [];

  if (args.mode === "dry_run") {
    return {
      contract: INGEST_HQII_RETAILER_LINKS_MUTATION_GATE_CONTRACT_V1,
      read_only: true,
      mode: args.mode,
      mutation_authorized: false,
      blockers: [],
      founder_decision_id: null,
      io_capability,
      apply_plan_rel: INGEST_HQII_RETAILER_LINKS_PLAN_REL_V1,
      input_artifact_rel: inputRel,
      mutation_lane: INGEST_HQII_RETAILER_LINKS_MUTATION_LANE_V1,
      mutationGateRef: INGEST_HQII_RETAILER_LINKS_MUTATION_GATE_REF_V1,
    };
  }

  if (io_capability === "READ_INDEX") {
    blockers.push(INGEST_HQII_RETAILER_LINKS_IO_READ_INDEX_SUPABASE_BLOCKER_V1);
  }

  const trustPreflight = buildGuardedApplyTrustCurrencyPreflightV1({
    rootDir: args.rootDir,
    now,
  });
  if (guardedApplyTrustCurrencyBlocksMutationV1(trustPreflight)) {
    blockers.push(...trustPreflight.blockers.map((b) => `trust_currency:${b}`));
  }

  if (!inputRel) {
    blockers.push("input_artifact_rel_missing");
  }

  let founderRow: FounderDecisionRegistryRowV1 | null = null;
  if (inputRel) {
    founderRow = findActiveFounderDecisionForIngestHqiiRetailerLinksV1({
      rootDir: args.rootDir,
      planRel,
      inputRelPath: inputRel,
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
    contract: INGEST_HQII_RETAILER_LINKS_MUTATION_GATE_CONTRACT_V1,
    read_only: true,
    mode: args.mode,
    mutation_authorized: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    founder_decision_id: founderRow?.decision_id ?? null,
    io_capability,
    apply_plan_rel: INGEST_HQII_RETAILER_LINKS_PLAN_REL_V1,
    input_artifact_rel: inputRel,
    mutation_lane: INGEST_HQII_RETAILER_LINKS_MUTATION_LANE_V1,
    mutationGateRef: INGEST_HQII_RETAILER_LINKS_MUTATION_GATE_REF_V1,
  };
}

export function ingestHqiiRetailerLinksMutationAuthorizedV1(
  preflight: IngestHqiiRetailerLinksMutationPreflightV1,
): boolean {
  return preflight.mode === "write" && preflight.mutation_authorized;
}

export function assertIngestHqiiRetailerLinksWriteAuthorizedV1(
  preflight: IngestHqiiRetailerLinksMutationPreflightV1,
): void {
  assertSupabaseMutationAuthorizedV1(preflight);
}
