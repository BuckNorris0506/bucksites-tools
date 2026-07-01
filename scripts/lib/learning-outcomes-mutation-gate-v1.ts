/**
 * Learning outcomes insert mutation gate — founder approval, trust currency, artifact binding.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
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
import { founderRowBindsAllCsvArtifactsV1 } from "./seed-import-csv-artifact-binding-v1";

export type LearningOutcomesMutationGateModeV1 = Extract<
  SupabaseMutationGateModeV1,
  "dry_run" | "write"
>;

export const LEARNING_OUTCOMES_MUTATION_GATE_CONTRACT_V1 =
  "learning_outcomes_mutation_gate_v1" as const;

export const LEARNING_OUTCOMES_MUTATION_GATE_REF_V1 =
  "learning_outcomes_mutation_gate_v1" as const;

export const LEARNING_OUTCOMES_PLAN_REL_V1 =
  "scripts/execute-learning-outcomes-approved-insert-v1.ts";

export const LEARNING_OUTCOMES_CONFIDENCE_APPROVALS_REL_V1 =
  "data/ops/learning-outcomes-confidence-approvals.json";

export const LEARNING_OUTCOMES_MUTATION_LANE_V1 = "learning_outcomes_insert_v1" as const;

export const LEARNING_OUTCOMES_IO_READ_INDEX_SUPABASE_BLOCKER_V1 =
  "io_capability_read_index_cannot_mutate_supabase" as const;

export type LearningOutcomesMutationPreflightV1 = {
  contract: typeof LEARNING_OUTCOMES_MUTATION_GATE_CONTRACT_V1;
  read_only: true;
  mode: LearningOutcomesMutationGateModeV1;
  mutation_authorized: boolean;
  blockers: string[];
  founder_decision_id: string | null;
  io_capability: BuckpartsIoCapabilityV1;
  apply_plan_rel: typeof LEARNING_OUTCOMES_PLAN_REL_V1;
  artifact_rel_paths: string[];
  mutation_lane: typeof LEARNING_OUTCOMES_MUTATION_LANE_V1;
  mutationGateRef: typeof LEARNING_OUTCOMES_MUTATION_GATE_REF_V1;
};

function normalizePlanRelV1(planRel: string): string {
  return planRel.trim().replace(/\\/g, "/").toLowerCase();
}

export function isRepoRelativeHashableArtifactV1(args: {
  relOrAbs: string;
  rootDir: string;
  fileExists?: (abs: string) => boolean;
}): boolean {
  const rel = normalizeRepoRelPathV1(args.relOrAbs, args.rootDir);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
  const exists = args.fileExists ?? ((abs) => existsSync(abs));
  return exists(path.join(args.rootDir, rel));
}

export function learningOutcomesArtifactRelPathsV1(args: {
  rootDir: string;
  evidenceSourceRel: string | null;
  fileExists?: (abs: string) => boolean;
}): string[] {
  const rels = [LEARNING_OUTCOMES_CONFIDENCE_APPROVALS_REL_V1];
  if (
    args.evidenceSourceRel &&
    isRepoRelativeHashableArtifactV1({
      relOrAbs: args.evidenceSourceRel,
      rootDir: args.rootDir,
      fileExists: args.fileExists,
    })
  ) {
    rels.push(normalizeRepoRelPathV1(args.evidenceSourceRel, args.rootDir));
  }
  return rels;
}

export function founderRowAuthorizesLearningOutcomesPlanV1(args: {
  planRel: string;
  loaded: FounderDecisionRowWithSlugCorrelationV1;
}): boolean {
  const planRelNorm = normalizePlanRelV1(args.planRel);
  return args.loaded.apply_context_apply_plan_rel_paths.includes(planRelNorm);
}

export function findActiveFounderDecisionForLearningOutcomesInsertV1(args: {
  rootDir: string;
  planRel: string;
  artifactRelPaths: readonly string[];
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
      !founderRowAuthorizesLearningOutcomesPlanV1({
        planRel: args.planRel,
        loaded,
      })
    ) {
      continue;
    }
    const artifactBind = founderRowBindsAllCsvArtifactsV1({
      row,
      csvRelPaths: args.artifactRelPaths,
      rootDir: args.rootDir,
      readText: args.readText,
    });
    if (!artifactBind.ok) continue;
    return row;
  }
  return null;
}

export function buildLearningOutcomesMutationPreflightV1(args: {
  rootDir: string;
  mode: LearningOutcomesMutationGateModeV1;
  evidenceSourceRel?: string | null;
  planRel?: string;
  io_capability?: BuckpartsIoCapabilityV1;
  now?: () => Date;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
  fileExists?: (abs: string) => boolean;
}): LearningOutcomesMutationPreflightV1 {
  const io_capability = args.io_capability ?? resolveIoCapabilityFromEnvV1();
  const now = args.now ?? (() => new Date());
  const planRel = args.planRel ?? LEARNING_OUTCOMES_PLAN_REL_V1;
  const artifactRelPaths = learningOutcomesArtifactRelPathsV1({
    rootDir: args.rootDir,
    evidenceSourceRel: args.evidenceSourceRel ?? null,
    fileExists: args.fileExists,
  });
  const blockers: string[] = [];

  if (args.mode === "dry_run") {
    return {
      contract: LEARNING_OUTCOMES_MUTATION_GATE_CONTRACT_V1,
      read_only: true,
      mode: args.mode,
      mutation_authorized: false,
      blockers: [],
      founder_decision_id: null,
      io_capability,
      apply_plan_rel: LEARNING_OUTCOMES_PLAN_REL_V1,
      artifact_rel_paths: artifactRelPaths,
      mutation_lane: LEARNING_OUTCOMES_MUTATION_LANE_V1,
      mutationGateRef: LEARNING_OUTCOMES_MUTATION_GATE_REF_V1,
    };
  }

  if (io_capability === "READ_INDEX") {
    blockers.push(LEARNING_OUTCOMES_IO_READ_INDEX_SUPABASE_BLOCKER_V1);
  }

  const trustPreflight = buildGuardedApplyTrustCurrencyPreflightV1({
    rootDir: args.rootDir,
    now,
  });
  if (guardedApplyTrustCurrencyBlocksMutationV1(trustPreflight)) {
    blockers.push(...trustPreflight.blockers.map((b) => `trust_currency:${b}`));
  }

  let founderRow: FounderDecisionRegistryRowV1 | null = null;
  founderRow = findActiveFounderDecisionForLearningOutcomesInsertV1({
    rootDir: args.rootDir,
    planRel,
    artifactRelPaths,
    nowIso: now().toISOString(),
    readText: args.readText,
    founderRows: args.founderRows,
  });
  if (founderRow == null) {
    blockers.push("founder_owner_mutation_approved_missing_or_inactive");
  }

  const uniqueBlockers = Array.from(new Set(blockers));
  return {
    contract: LEARNING_OUTCOMES_MUTATION_GATE_CONTRACT_V1,
    read_only: true,
    mode: args.mode,
    mutation_authorized: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    founder_decision_id: founderRow?.decision_id ?? null,
    io_capability,
    apply_plan_rel: LEARNING_OUTCOMES_PLAN_REL_V1,
    artifact_rel_paths: artifactRelPaths,
    mutation_lane: LEARNING_OUTCOMES_MUTATION_LANE_V1,
    mutationGateRef: LEARNING_OUTCOMES_MUTATION_GATE_REF_V1,
  };
}

export function learningOutcomesMutationAuthorizedV1(
  preflight: LearningOutcomesMutationPreflightV1,
): boolean {
  return preflight.mode === "write" && preflight.mutation_authorized;
}

export function assertLearningOutcomesWriteAuthorizedV1(
  preflight: LearningOutcomesMutationPreflightV1,
): void {
  assertSupabaseMutationAuthorizedV1(preflight);
}
