/**
 * Repo→runtime convergence gate v1 — AP aggregate safe CTA parity at deploy boundary.
 * Read-only measurement via existing AP Supabase-vs-CSV diff builder; fail closed under enforce.
 */

import {
  buildAirPurifierSupabaseVsCsvDiffV1Report,
  type ApSupabaseVsCsvDiffReportV1,
  type ApSupabaseTruthStatusV1,
} from "./air-purifier-supabase-vs-csv-diff-v1";
import {
  AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1,
  loadApRepoRuntimeConvergenceAcceptanceV1,
  validateApRepoRuntimeConvergenceAcceptanceV1,
  type ApRepoRuntimeConvergenceAcceptanceLoadResultV1,
  type ApSafeCtaConvergenceLiveMeasurementV1,
} from "./ap-repo-runtime-convergence-acceptance-v1";

export const REPO_RUNTIME_CONVERGENCE_GATE_CONTRACT_V1 = "repo_runtime_convergence_gate_v1" as const;

export type RepoRuntimeConvergenceGateStateV1 =
  | "CONVERGED"
  | "EXPLICITLY_DIVERGED"
  | "BLOCKED";

export type RepoRuntimeConvergenceGateMeasurementV1 = {
  wedge: "air_purifier";
  csv_safe_direct_buyable_count: number | null;
  supabase_safe_direct_buyable_count: number | null;
  gap_size: number | null;
  supabase_truth_status: ApSupabaseTruthStatusV1 | "MEASUREMENT_ERROR";
  measured_at: string | null;
  measurement_source: "air_purifier_supabase_vs_csv_diff_v1";
  measurement_error: string | null;
};

export type RepoRuntimeConvergenceGateReportV1 = {
  contract: typeof REPO_RUNTIME_CONVERGENCE_GATE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  supabase_writes: false;
  generated_at: string;
  wedge: "air_purifier";
  enforce: boolean;
  state: RepoRuntimeConvergenceGateStateV1;
  deploy_allowed: boolean;
  exit_code: number;
  measurement: RepoRuntimeConvergenceGateMeasurementV1;
  acceptance_artifact_path: typeof AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1;
  acceptance_load: ApRepoRuntimeConvergenceAcceptanceLoadResultV1;
  acceptance_validation_errors: string[];
  block_reasons: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildRepoRuntimeConvergenceGateDepsV1 = {
  now?: () => Date;
  buildDiffReport?: (rootDir: string) => Promise<ApSupabaseVsCsvDiffReportV1>;
};

export function extractApSafeCtaConvergenceFromDiffV1(
  diff: ApSupabaseVsCsvDiffReportV1,
): ApSafeCtaConvergenceLiveMeasurementV1 {
  const csv = diff.summary.csv_safe_direct_buyable_count;
  const supabase = diff.summary.supabase_safe_direct_buyable_count;
  return {
    csv_safe_direct_buyable_count: csv,
    supabase_safe_direct_buyable_count: supabase,
    gap_size: csv - supabase,
    supabase_truth_status: diff.supabase_truth_status,
    measured_at: diff.generated_at,
  };
}

export function classifyRepoRuntimeConvergenceGateStateV1(args: {
  live: ApSafeCtaConvergenceLiveMeasurementV1 | null;
  measurement_error: string | null;
  acceptance_load: ApRepoRuntimeConvergenceAcceptanceLoadResultV1;
  acceptance_validation_errors: string[];
}): { state: RepoRuntimeConvergenceGateStateV1; block_reasons: string[] } {
  const block_reasons: string[] = [];

  if (args.measurement_error) {
    block_reasons.push(`measurement_error: ${args.measurement_error}`);
    return { state: "BLOCKED", block_reasons };
  }

  const live = args.live;
  if (!live) {
    block_reasons.push("live measurement unavailable");
    return { state: "BLOCKED", block_reasons };
  }

  if (live.supabase_truth_status !== "CHECKED") {
    block_reasons.push(`supabase_truth_status=${live.supabase_truth_status}`);
    return { state: "BLOCKED", block_reasons };
  }

  if (live.gap_size === 0) {
    return { state: "CONVERGED", block_reasons };
  }

  if (args.acceptance_load.status === "missing") {
    block_reasons.push("gap exists and acceptance artifact is missing");
    return { state: "BLOCKED", block_reasons };
  }
  if (args.acceptance_load.status === "invalid_json") {
    block_reasons.push(`acceptance invalid JSON: ${args.acceptance_load.detail}`);
    return { state: "BLOCKED", block_reasons };
  }
  if (args.acceptance_load.status === "invalid_contract") {
    block_reasons.push(`acceptance invalid contract: ${args.acceptance_load.detail}`);
    return { state: "BLOCKED", block_reasons };
  }

  if (args.acceptance_validation_errors.length > 0) {
    block_reasons.push(...args.acceptance_validation_errors.map((e) => `acceptance: ${e}`));
    return { state: "BLOCKED", block_reasons };
  }

  return { state: "EXPLICITLY_DIVERGED", block_reasons };
}

export function resolveRepoRuntimeConvergenceGateExitCodeV1(args: {
  state: RepoRuntimeConvergenceGateStateV1;
  enforce: boolean;
}): number {
  if (!args.enforce) {
    return 0;
  }
  if (args.state === "BLOCKED") {
    return 1;
  }
  return 0;
}

export function repoRuntimeConvergenceGateDeployAllowedV1(
  state: RepoRuntimeConvergenceGateStateV1,
): boolean {
  return state === "CONVERGED" || state === "EXPLICITLY_DIVERGED";
}

export async function buildRepoRuntimeConvergenceGateReportV1(args: {
  rootDir: string;
  enforce?: boolean;
  deps?: BuildRepoRuntimeConvergenceGateDepsV1;
}): Promise<RepoRuntimeConvergenceGateReportV1> {
  const now = args.deps?.now ?? (() => new Date());
  const enforce = args.enforce === true;
  const acceptance_load = loadApRepoRuntimeConvergenceAcceptanceV1(args.rootDir);

  let live: ApSafeCtaConvergenceLiveMeasurementV1 | null = null;
  let measurement_error: string | null = null;
  let supabase_truth_status: RepoRuntimeConvergenceGateMeasurementV1["supabase_truth_status"] =
    "MEASUREMENT_ERROR";

  try {
    const buildDiff =
      args.deps?.buildDiffReport ??
      ((rootDir: string) =>
        buildAirPurifierSupabaseVsCsvDiffV1Report({
          rootDir,
          deps: { now },
        }));
    const diff = await buildDiff(args.rootDir);
    live = extractApSafeCtaConvergenceFromDiffV1(diff);
    supabase_truth_status = live.supabase_truth_status;
  } catch (error: unknown) {
    measurement_error = error instanceof Error ? error.message : String(error);
  }

  const acceptance_validation_errors: string[] = [];
  if (acceptance_load.status === "loaded" && live && !measurement_error) {
    const validation = validateApRepoRuntimeConvergenceAcceptanceV1({
      acceptance: acceptance_load.artifact,
      live,
      now: now(),
    });
    acceptance_validation_errors.push(...validation.errors);
  }

  const { state, block_reasons } = classifyRepoRuntimeConvergenceGateStateV1({
    live,
    measurement_error,
    acceptance_load,
    acceptance_validation_errors,
  });

  const exit_code = resolveRepoRuntimeConvergenceGateExitCodeV1({ state, enforce });

  const measurement: RepoRuntimeConvergenceGateMeasurementV1 = {
    wedge: "air_purifier",
    csv_safe_direct_buyable_count: live?.csv_safe_direct_buyable_count ?? null,
    supabase_safe_direct_buyable_count: live?.supabase_safe_direct_buyable_count ?? null,
    gap_size: live?.gap_size ?? null,
    supabase_truth_status,
    measured_at: live?.measured_at ?? null,
    measurement_source: "air_purifier_supabase_vs_csv_diff_v1",
    measurement_error,
  };

  return {
    contract: REPO_RUNTIME_CONVERGENCE_GATE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_writes: false,
    generated_at: now().toISOString(),
    wedge: "air_purifier",
    enforce,
    state,
    deploy_allowed: repoRuntimeConvergenceGateDeployAllowedV1(state),
    exit_code,
    measurement,
    acceptance_artifact_path: AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1,
    acceptance_load,
    acceptance_validation_errors,
    block_reasons,
    proven_facts: [
      `PROVEN: ${REPO_RUNTIME_CONVERGENCE_GATE_CONTRACT_V1} measures AP aggregate safe CTA via air_purifier_supabase_vs_csv_diff_v1.`,
      `PROVEN: state=${state}; enforce=${String(enforce)}; exit_code=${String(exit_code)}.`,
      measurement.gap_size !== null
        ? `PROVEN: csv_safe_direct_buyable_count=${String(measurement.csv_safe_direct_buyable_count)} supabase_safe_direct_buyable_count=${String(measurement.supabase_safe_direct_buyable_count)} gap_size=${String(measurement.gap_size)}.`
        : "UNKNOWN: aggregate safe CTA counts not measured.",
    ],
    unknown_facts: [
      "UNKNOWN: Per-slug csv_runtime_safe_cta_parity is not gated in v1.",
      "UNKNOWN: Non-aggregate AP diff dimensions are not gated in v1.",
    ],
  };
}

export function repoRuntimeConvergenceGateGrantsMutationAuthorityV1(): false {
  return false;
}
