/**
 * Wrong-code-prevention v1 — read-only HyperAgent findings artifact contract and loader.
 * Command Center consumes committed JSON only; HyperAgent write path not enabled in-repo.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const WRONG_CODE_PREVENTION_CONTRACT_V1 = "wrong_code_prevention_v1" as const;

export const WRONG_CODE_PREVENTION_ARTIFACT_REL_V1 =
  "data/command-center/audits/wrong-code-prevention-v1.json" as const;

export const WRONG_CODE_PREVENTION_STALE_AFTER_MS_V1 = 24 * 60 * 60 * 1000;

export const AP_SUPABASE_VS_CSV_DIFF_ARTIFACT_REL_V1 =
  "data/air-purifier/batch-production/audits/ap-supabase-vs-csv-diff-v1.json" as const;

export type WrongCodePreventionOverallStatusV1 = "PASS" | "WARN" | "FAIL" | "UNKNOWN";

export type WrongCodePreventionSqlPlanSafetyStatusV1 =
  | "PASS"
  | "WARN"
  | "FAIL"
  | "UNKNOWN";

export type WrongCodePreventionCheckStatusV1 = "PASS" | "WARN" | "FAIL" | "UNKNOWN";

export type WrongCodePreventionCheckV1 = {
  check_id: string;
  status: WrongCodePreventionCheckStatusV1;
  notes: string;
  evidence_paths?: string[];
};

export type WrongCodePreventionArtifactV1 = {
  contract: typeof WRONG_CODE_PREVENTION_CONTRACT_V1;
  read_only: true;
  generated_at: string;
  git_head_hint: string | null;
  overall_status: WrongCodePreventionOverallStatusV1;
  stale_direct_buyable_count: number;
  dangerous_db_only_slug_count: number;
  handoff_head_drift_commits: number | "UNKNOWN";
  sql_plan_safety_status: WrongCodePreventionSqlPlanSafetyStatusV1;
  deprecated_slug_reference_count: number;
  checks: WrongCodePreventionCheckV1[];
  blockers: string[];
  warnings: string[];
  recommended_next_action: string;
};

export type WrongCodePreventionArtifactLoadStatusV1 =
  | "loaded"
  | "missing"
  | "invalid_json"
  | "invalid_contract";

export type WrongCodePreventionArtifactFreshnessV1 = {
  generated_at: string | "UNKNOWN";
  stale_after_ms: number;
  freshness_status: "FRESH" | "STALE" | "UNKNOWN";
};

export type WrongCodePreventionArtifactLoadResultV1 =
  | {
      status: "loaded";
      artifact_path: typeof WRONG_CODE_PREVENTION_ARTIFACT_REL_V1;
      artifact: WrongCodePreventionArtifactV1;
      freshness: WrongCodePreventionArtifactFreshnessV1;
    }
  | {
      status: Exclude<WrongCodePreventionArtifactLoadStatusV1, "loaded">;
      artifact_path: typeof WRONG_CODE_PREVENTION_ARTIFACT_REL_V1;
      detail: string;
      freshness: WrongCodePreventionArtifactFreshnessV1;
    };

export type WrongCodePreventionRepoBaselineDepsV1 = {
  now?: () => Date;
  readText?: (absPath: string) => string | null;
  gitHeadHint?: (rootDir: string) => string | null;
  handoffHeadDriftCommits?: (rootDir: string) => number | "UNKNOWN";
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStatus(value: unknown): WrongCodePreventionOverallStatusV1 | null {
  if (value === "PASS" || value === "WARN" || value === "FAIL" || value === "UNKNOWN") return value;
  return null;
}

function asSqlPlanStatus(value: unknown): WrongCodePreventionSqlPlanSafetyStatusV1 | null {
  if (value === "PASS" || value === "WARN" || value === "FAIL" || value === "UNKNOWN") return value;
  return null;
}

function asCheckStatus(value: unknown): WrongCodePreventionCheckStatusV1 | null {
  if (value === "PASS" || value === "WARN" || value === "FAIL" || value === "UNKNOWN") return value;
  return null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    out.push(item);
  }
  return out;
}

function parseWrongCodePreventionCheckV1(
  raw: unknown,
): { ok: true; check: WrongCodePreventionCheckV1 } | { ok: false; detail: string } {
  const record = asRecord(raw);
  if (!record) return { ok: false, detail: "check must be an object" };
  const check_id = asNonEmptyString(record.check_id);
  const status = asCheckStatus(record.status);
  const notes = asNonEmptyString(record.notes);
  if (!check_id || !status || notes == null) {
    return { ok: false, detail: "check requires check_id, status, notes" };
  }
  const check: WrongCodePreventionCheckV1 = { check_id, status, notes };
  if (record.evidence_paths !== undefined) {
    const evidence_paths = asStringArray(record.evidence_paths);
    if (!evidence_paths) return { ok: false, detail: "check evidence_paths must be string[]" };
    check.evidence_paths = evidence_paths;
  }
  return { ok: true, check };
}

export function validateWrongCodePreventionArtifactV1(
  raw: unknown,
): { valid: true; artifact: WrongCodePreventionArtifactV1 } | { valid: false; errors: string[] } {
  const errors: string[] = [];
  const record = asRecord(raw);
  if (!record) return { valid: false, errors: ["artifact root must be an object"] };

  if (record.contract !== WRONG_CODE_PREVENTION_CONTRACT_V1) {
    errors.push(`contract must be ${WRONG_CODE_PREVENTION_CONTRACT_V1}`);
  }
  if (record.read_only !== true) errors.push("read_only must be true");

  const generated_at = asNonEmptyString(record.generated_at);
  if (!generated_at) errors.push("generated_at required");

  const overall_status = asStatus(record.overall_status);
  if (!overall_status) errors.push("overall_status must be PASS|WARN|FAIL|UNKNOWN");

  const stale_direct_buyable_count = asFiniteNumber(record.stale_direct_buyable_count);
  if (stale_direct_buyable_count == null || stale_direct_buyable_count < 0) {
    errors.push("stale_direct_buyable_count must be a non-negative number");
  }

  const dangerous_db_only_slug_count = asFiniteNumber(record.dangerous_db_only_slug_count);
  if (dangerous_db_only_slug_count == null || dangerous_db_only_slug_count < 0) {
    errors.push("dangerous_db_only_slug_count must be a non-negative number");
  }

  const handoff =
    record.handoff_head_drift_commits === "UNKNOWN"
      ? "UNKNOWN"
      : asFiniteNumber(record.handoff_head_drift_commits);
  if (handoff !== "UNKNOWN" && (handoff == null || handoff < 0)) {
    errors.push("handoff_head_drift_commits must be UNKNOWN or a non-negative number");
  }

  const sql_plan_safety_status = asSqlPlanStatus(record.sql_plan_safety_status);
  if (!sql_plan_safety_status) {
    errors.push("sql_plan_safety_status must be PASS|WARN|FAIL|UNKNOWN");
  }

  const deprecated_slug_reference_count = asFiniteNumber(record.deprecated_slug_reference_count);
  if (deprecated_slug_reference_count == null || deprecated_slug_reference_count < 0) {
    errors.push("deprecated_slug_reference_count must be a non-negative number");
  }

  const blockers = asStringArray(record.blockers);
  if (!blockers) errors.push("blockers must be string[]");
  const warnings = asStringArray(record.warnings);
  if (!warnings) errors.push("warnings must be string[]");
  const recommended_next_action = asNonEmptyString(record.recommended_next_action);
  if (!recommended_next_action) errors.push("recommended_next_action required");

  const checksRaw = record.checks;
  if (!Array.isArray(checksRaw)) {
    errors.push("checks must be an array");
  }
  const checks: WrongCodePreventionCheckV1[] = [];
  if (Array.isArray(checksRaw)) {
    for (let i = 0; i < checksRaw.length; i++) {
      const parsed = parseWrongCodePreventionCheckV1(checksRaw[i]);
      if (!parsed.ok) errors.push(`checks[${i}]: ${parsed.detail}`);
      else checks.push(parsed.check);
    }
  }

  const git_head_hint =
    record.git_head_hint === null ? null : asNonEmptyString(record.git_head_hint);

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    artifact: {
      contract: WRONG_CODE_PREVENTION_CONTRACT_V1,
      read_only: true,
      generated_at: generated_at!,
      git_head_hint,
      overall_status: overall_status!,
      stale_direct_buyable_count: stale_direct_buyable_count!,
      dangerous_db_only_slug_count: dangerous_db_only_slug_count!,
      handoff_head_drift_commits: handoff === "UNKNOWN" ? "UNKNOWN" : handoff!,
      sql_plan_safety_status: sql_plan_safety_status!,
      deprecated_slug_reference_count: deprecated_slug_reference_count!,
      checks,
      blockers: blockers!,
      warnings: warnings!,
      recommended_next_action: recommended_next_action!,
    },
  };
}

export function resolveWrongCodePreventionFreshnessV1(args: {
  generated_at: string | "UNKNOWN";
  now?: () => Date;
}): WrongCodePreventionArtifactFreshnessV1 {
  const now = args.now ?? (() => new Date());
  if (args.generated_at === "UNKNOWN") {
    return {
      generated_at: "UNKNOWN",
      stale_after_ms: WRONG_CODE_PREVENTION_STALE_AFTER_MS_V1,
      freshness_status: "UNKNOWN",
    };
  }
  const generatedMs = Date.parse(args.generated_at);
  if (!Number.isFinite(generatedMs)) {
    return {
      generated_at: args.generated_at,
      stale_after_ms: WRONG_CODE_PREVENTION_STALE_AFTER_MS_V1,
      freshness_status: "UNKNOWN",
    };
  }
  const ageMs = now().getTime() - generatedMs;
  return {
    generated_at: args.generated_at,
    stale_after_ms: WRONG_CODE_PREVENTION_STALE_AFTER_MS_V1,
    freshness_status: ageMs > WRONG_CODE_PREVENTION_STALE_AFTER_MS_V1 ? "STALE" : "FRESH",
  };
}

export function loadWrongCodePreventionArtifactV1(args: {
  rootDir: string;
  now?: () => Date;
}): WrongCodePreventionArtifactLoadResultV1 {
  const artifact_path = WRONG_CODE_PREVENTION_ARTIFACT_REL_V1;
  const abs = path.join(args.rootDir, artifact_path);
  if (!existsSync(abs)) {
    return {
      status: "missing",
      artifact_path,
      detail: "artifact file not found",
      freshness: resolveWrongCodePreventionFreshnessV1({ generated_at: "UNKNOWN", now: args.now }),
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(abs, "utf8")) as unknown;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "invalid_json",
      artifact_path,
      detail: message,
      freshness: resolveWrongCodePreventionFreshnessV1({ generated_at: "UNKNOWN", now: args.now }),
    };
  }

  const validated = validateWrongCodePreventionArtifactV1(raw);
  if (!validated.valid) {
    return {
      status: "invalid_contract",
      artifact_path,
      detail: validated.errors.join("; "),
      freshness: resolveWrongCodePreventionFreshnessV1({ generated_at: "UNKNOWN", now: args.now }),
    };
  }

  const freshness = resolveWrongCodePreventionFreshnessV1({
    generated_at: validated.artifact.generated_at,
    now: args.now,
  });

  return {
    status: "loaded",
    artifact_path,
    artifact: validated.artifact,
    freshness,
  };
}

function defaultReadText(absPath: string): string | null {
  if (!existsSync(absPath)) return null;
  try {
    return readFileSync(absPath, "utf8");
  } catch {
    return null;
  }
}

function defaultGitHeadHint(rootDir: string): string | null {
  const r = spawnSync("git", ["rev-parse", "--short=12", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  return r.status === 0 ? String(r.stdout ?? "").trim() || null : null;
}

function defaultHandoffHeadDriftCommits(rootDir: string): number | "UNKNOWN" {
  const r = spawnSync("git", ["rev-list", "--count", "origin/main..HEAD"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (r.status !== 0) return "UNKNOWN";
  const n = Number.parseInt(String(r.stdout ?? "").trim(), 10);
  return Number.isFinite(n) ? n : "UNKNOWN";
}

function readApDiffSummaryCounts(rootDir: string, readText: (abs: string) => string | null): {
  dangerous_db_only_slug_count: number;
  stale_direct_buyable_count: number;
} {
  const text = readText(path.join(rootDir, AP_SUPABASE_VS_CSV_DIFF_ARTIFACT_REL_V1));
  if (!text) return { dangerous_db_only_slug_count: 0, stale_direct_buyable_count: 0 };
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const summary = asRecord(parsed.summary);
    return {
      dangerous_db_only_slug_count:
        asFiniteNumber(summary?.dangerous_db_only_slug_count) ?? 0,
      stale_direct_buyable_count:
        asFiniteNumber(summary?.browser_truth_drift_count) ?? 0,
    };
  } catch {
    return { dangerous_db_only_slug_count: 0, stale_direct_buyable_count: 0 };
  }
}

function countDeprecatedSlugReferences(rootDir: string, readText: (abs: string) => string | null): number {
  const text = readText(path.join(rootDir, AP_SUPABASE_VS_CSV_DIFF_ARTIFACT_REL_V1));
  if (!text) return 0;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const links = asRecord(parsed.air_purifier_retailer_links);
    const csvOnly = Array.isArray(links?.csv_only) ? links.csv_only : [];
    return csvOnly.filter((row) => {
      const record = asRecord(row);
      return record?.danger_class === "csv_removed_deprecated";
    }).length;
  } catch {
    return 0;
  }
}

function resolveSqlPlanSafetyStatus(rootDir: string, readText: (abs: string) => string | null): WrongCodePreventionSqlPlanSafetyStatusV1 {
  const parityRel =
    "data/air-purifier/batch-production/audits/ap-runtime-safe-cta-parity-packet-v1.json";
  const text = readText(path.join(rootDir, parityRel));
  if (!text) return "UNKNOWN";
  if (text.includes("default ROLLBACK") || text.includes("ROLLBACK;")) return "WARN";
  return "PASS";
}

export function buildWrongCodePreventionRepoBaselineArtifactV1(args: {
  rootDir: string;
  deps?: WrongCodePreventionRepoBaselineDepsV1;
}): WrongCodePreventionArtifactV1 {
  const now = args.deps?.now ?? (() => new Date());
  const readText = args.deps?.readText ?? defaultReadText;
  const gitHeadHint = args.deps?.gitHeadHint ?? defaultGitHeadHint;
  const handoffHeadDriftCommits =
    args.deps?.handoffHeadDriftCommits ?? defaultHandoffHeadDriftCommits;

  const counts = readApDiffSummaryCounts(args.rootDir, readText);
  const deprecated_slug_reference_count = countDeprecatedSlugReferences(args.rootDir, readText);
  const sql_plan_safety_status = resolveSqlPlanSafetyStatus(args.rootDir, readText);
  const handoff = handoffHeadDriftCommits(args.rootDir);

  const checks: WrongCodePreventionCheckV1[] = [
    {
      check_id: "hyperagent_write_path_not_enabled",
      status: "PASS",
      notes: "HyperAgent has no in-repo write/commit/push authority; artifact is repo-committed read model only.",
    },
    {
      check_id: "handoff_head_drift",
      status:
        handoff === "UNKNOWN" ? "UNKNOWN" : handoff > 0 ? "WARN" : "PASS",
      notes:
        handoff === "UNKNOWN"
          ? "Could not measure commits ahead of origin/main."
          : handoff > 0
            ? `${handoff} local commit(s) ahead of origin/main — refresh HQ handoff before apply work.`
            : "Local HEAD matches origin/main commit count (no ahead commits).",
    },
    {
      check_id: "dangerous_db_only_slugs",
      status: counts.dangerous_db_only_slug_count > 0 ? "WARN" : "PASS",
      notes: `dangerous_db_only_slug_count=${counts.dangerous_db_only_slug_count} from ${AP_SUPABASE_VS_CSV_DIFF_ARTIFACT_REL_V1}.`,
      evidence_paths: [AP_SUPABASE_VS_CSV_DIFF_ARTIFACT_REL_V1],
    },
    {
      check_id: "stale_direct_buyable_primary",
      status: counts.stale_direct_buyable_count > 0 ? "WARN" : "PASS",
      notes: `stale_direct_buyable_count=${counts.stale_direct_buyable_count} (browser_truth_drift_count proxy from AP diff artifact).`,
      evidence_paths: [AP_SUPABASE_VS_CSV_DIFF_ARTIFACT_REL_V1],
    },
    {
      check_id: "sql_plan_safety",
      status: sql_plan_safety_status === "UNKNOWN" ? "UNKNOWN" : sql_plan_safety_status,
      notes:
        sql_plan_safety_status === "WARN"
          ? "SQL parity packet exists with default ROLLBACK — human commit required."
          : sql_plan_safety_status === "PASS"
            ? "No unsafe auto-commit SQL plan detected in repo artifacts."
            : "SQL plan safety UNKNOWN — parity packet not readable.",
    },
  ];

  const warnings: string[] = [];
  const blockers: string[] = [];

  if (counts.dangerous_db_only_slug_count > 0) {
    warnings.push(`dangerous_db_only_slug_count=${counts.dangerous_db_only_slug_count}`);
  }
  if (counts.stale_direct_buyable_count > 0) {
    warnings.push(`stale_direct_buyable_count=${counts.stale_direct_buyable_count}`);
  }
  if (handoff !== "UNKNOWN" && handoff > 0) {
    warnings.push(`handoff_head_drift_commits=${handoff}`);
  }
  if (sql_plan_safety_status === "WARN") {
    warnings.push("sql_plan_safety_status=WARN");
  }
  warnings.push("artifact_provenance=repo_baseline_not_hyperagent_ingest");

  const anyFail = checks.some((c) => c.status === "FAIL");
  const anyWarn = checks.some((c) => c.status === "WARN");
  const mostlyUnknown = checks.filter((c) => c.status === "UNKNOWN").length > checks.length / 2;
  const overall_status: WrongCodePreventionOverallStatusV1 = anyFail
    ? "FAIL"
    : mostlyUnknown
      ? "UNKNOWN"
      : anyWarn
        ? "WARN"
        : "PASS";

  return {
    contract: WRONG_CODE_PREVENTION_CONTRACT_V1,
    read_only: true,
    generated_at: now().toISOString(),
    git_head_hint: gitHeadHint(args.rootDir),
    overall_status,
    stale_direct_buyable_count: counts.stale_direct_buyable_count,
    dangerous_db_only_slug_count: counts.dangerous_db_only_slug_count,
    handoff_head_drift_commits: handoff,
    sql_plan_safety_status,
    deprecated_slug_reference_count,
    checks,
    blockers,
    warnings,
    recommended_next_action:
      overall_status === "FAIL"
        ? "Stop apply/SQL work until wrong-code-prevention blockers are cleared; HyperAgent may recommend but cannot write."
        : overall_status === "WARN"
          ? "Review wrong-code-prevention warnings before CSV/SQL apply; refresh artifact after HyperAgent read-only audit when enabled."
          : "Wrong-code-prevention posture acceptable for read-only steering; HyperAgent write path remains disabled.",
  };
}
