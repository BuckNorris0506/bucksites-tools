/**
 * Committed owner acceptance for AP repo→runtime safe CTA divergence (v1).
 * Read-only loader — no env override; fixed path only.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { ApSupabaseTruthStatusV1 } from "./air-purifier-supabase-vs-csv-diff-v1";

export const AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_CONTRACT_V1 =
  "ap_repo_runtime_convergence_acceptance_v1" as const;

export const AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1 =
  "data/air-purifier/batch-production/audits/ap-repo-runtime-convergence-acceptance-v1.json" as const;

export type ApRepoRuntimeConvergenceMeasuredGapV1 = {
  csv_safe_direct_buyable_count: number;
  supabase_safe_direct_buyable_count: number;
  gap_size: number;
  measured_at: string;
  supabase_truth_status: ApSupabaseTruthStatusV1;
};

export type ApRepoRuntimeConvergenceAcceptanceV1 = {
  contract: typeof AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  wedge: "air_purifier";
  accepted_at: string;
  accepted_by: string;
  reason: string;
  re_review_by: string;
  measured_gap: ApRepoRuntimeConvergenceMeasuredGapV1;
};

export type ApSafeCtaConvergenceLiveMeasurementV1 = {
  csv_safe_direct_buyable_count: number;
  supabase_safe_direct_buyable_count: number;
  gap_size: number;
  supabase_truth_status: ApSupabaseTruthStatusV1;
  measured_at: string;
};

export type ApRepoRuntimeConvergenceAcceptanceLoadResultV1 =
  | { status: "missing"; artifact_path: string }
  | { status: "invalid_json"; artifact_path: string; detail: string }
  | { status: "invalid_contract"; artifact_path: string; detail: string }
  | { status: "loaded"; artifact_path: string; artifact: ApRepoRuntimeConvergenceAcceptanceV1 };

export type ApRepoRuntimeConvergenceAcceptanceValidationV1 = {
  valid: boolean;
  errors: string[];
};

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseAcceptanceArtifactV1(
  raw: unknown,
): { ok: true; artifact: ApRepoRuntimeConvergenceAcceptanceV1 } | { ok: false; detail: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, detail: "acceptance root must be an object" };
  }
  const record = raw as Record<string, unknown>;
  if (record.contract !== AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_CONTRACT_V1) {
    return {
      ok: false,
      detail: `contract must be ${AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_CONTRACT_V1}`,
    };
  }
  if (record.read_only !== true || record.data_mutation !== false) {
    return { ok: false, detail: "read_only must be true and data_mutation must be false" };
  }
  if (record.wedge !== "air_purifier") {
    return { ok: false, detail: 'wedge must be "air_purifier"' };
  }

  const accepted_by = asNonEmptyString(record.accepted_by);
  const reason = asNonEmptyString(record.reason);
  const accepted_at = asNonEmptyString(record.accepted_at);
  const re_review_by = asNonEmptyString(record.re_review_by);
  if (!accepted_by || !reason || !accepted_at || !re_review_by) {
    return { ok: false, detail: "accepted_by, reason, accepted_at, re_review_by required" };
  }

  if (typeof record.measured_gap !== "object" || record.measured_gap === null) {
    return { ok: false, detail: "measured_gap required" };
  }
  const gap = record.measured_gap as Record<string, unknown>;
  const csv = asFiniteNumber(gap.csv_safe_direct_buyable_count);
  const supabase = asFiniteNumber(gap.supabase_safe_direct_buyable_count);
  const gap_size = asFiniteNumber(gap.gap_size);
  const measured_at = asNonEmptyString(gap.measured_at);
  const supabase_truth_status = gap.supabase_truth_status;
  if (
    csv === null ||
    supabase === null ||
    gap_size === null ||
    !measured_at ||
    supabase_truth_status !== "CHECKED"
  ) {
    return {
      ok: false,
      detail: "measured_gap requires finite counts, measured_at, supabase_truth_status CHECKED",
    };
  }
  if (gap_size !== csv - supabase) {
    return { ok: false, detail: "measured_gap.gap_size must equal csv minus supabase" };
  }

  return {
    ok: true,
    artifact: {
      contract: AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      wedge: "air_purifier",
      accepted_at,
      accepted_by,
      reason,
      re_review_by,
      measured_gap: {
        csv_safe_direct_buyable_count: csv,
        supabase_safe_direct_buyable_count: supabase,
        gap_size,
        measured_at,
        supabase_truth_status: "CHECKED",
      },
    },
  };
}

export function loadApRepoRuntimeConvergenceAcceptanceV1(
  rootDir: string,
): ApRepoRuntimeConvergenceAcceptanceLoadResultV1 {
  const artifact_path = AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1;
  const abs = path.join(rootDir, artifact_path);
  if (!existsSync(abs)) {
    return { status: "missing", artifact_path };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(abs, "utf8")) as unknown;
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    return { status: "invalid_json", artifact_path, detail };
  }

  const shape = parseAcceptanceArtifactV1(parsed);
  if (!shape.ok) {
    return { status: "invalid_contract", artifact_path, detail: shape.detail };
  }

  return { status: "loaded", artifact_path, artifact: shape.artifact };
}

export function validateApRepoRuntimeConvergenceAcceptanceV1(args: {
  acceptance: ApRepoRuntimeConvergenceAcceptanceV1;
  live: ApSafeCtaConvergenceLiveMeasurementV1;
  now: Date;
}): ApRepoRuntimeConvergenceAcceptanceValidationV1 {
  const errors: string[] = [];
  const { acceptance, live, now } = args;

  if (live.supabase_truth_status !== "CHECKED") {
    errors.push("live supabase_truth_status must be CHECKED");
  }
  if (acceptance.measured_gap.supabase_truth_status !== "CHECKED") {
    errors.push("acceptance measured_gap.supabase_truth_status must be CHECKED");
  }
  if (acceptance.measured_gap.csv_safe_direct_buyable_count !== live.csv_safe_direct_buyable_count) {
    errors.push("acceptance csv_safe_direct_buyable_count does not match live measurement");
  }
  if (
    acceptance.measured_gap.supabase_safe_direct_buyable_count !==
    live.supabase_safe_direct_buyable_count
  ) {
    errors.push("acceptance supabase_safe_direct_buyable_count does not match live measurement");
  }
  if (acceptance.measured_gap.gap_size !== live.gap_size) {
    errors.push("acceptance gap_size does not match live measurement");
  }

  const reReviewAt = Date.parse(acceptance.re_review_by);
  if (!Number.isFinite(reReviewAt)) {
    errors.push("re_review_by is not a valid ISO date");
  } else if (reReviewAt <= now.getTime()) {
    errors.push("re_review_by is not in the future");
  }

  return { valid: errors.length === 0, errors };
}
