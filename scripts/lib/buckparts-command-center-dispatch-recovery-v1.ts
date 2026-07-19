/**
 * Phase 2 — Idempotent dispatch run_id + failure/recovery state machine.
 *
 * Lifecycle:
 *   READY_TO_EXECUTE → EXECUTION_IN_PROGRESS → FAILED | EXECUTED_ARTIFACT_PENDING
 *   → EXECUTED_LEDGER_PENDING → EXECUTED | ALREADY_EXECUTED
 *   EXECUTION_OUTCOME_UNKNOWN — post-success persistence failure (never auto-rerun)
 *
 * Durable journal = dispatch-run-${run_id}.json (atomic temp+rename).
 */

import { createHash } from "node:crypto";
import { renameSync, writeFileSync } from "node:fs";
import path from "node:path";

export const DISPATCH_RUN_LIFECYCLE_V1 = [
  "READY_TO_EXECUTE",
  "EXECUTION_IN_PROGRESS",
  "EXECUTION_OUTCOME_UNKNOWN",
  "REFUSED",
  "FAILED",
  "EXECUTED",
  "EXECUTED_ARTIFACT_PENDING",
  "EXECUTED_LEDGER_PENDING",
  "ALREADY_EXECUTED",
] as const;

export type DispatchRunLifecycleV1 = (typeof DISPATCH_RUN_LIFECYCLE_V1)[number];

/** Deterministic tagged safety values — never coerce missing/invalid to false. */
export type TriStateSafetyTagV1 =
  | "BOOLEAN_TRUE"
  | "BOOLEAN_FALSE"
  | "MISSING"
  | `INVALID:${string}`;

export type DispatchRunIdMaterialV1 = {
  source_commit: string;
  selected_subsystem: string;
  exact_command: string;
  steering_override_source: string;
  dispatch_status: string;
  owner_review_required: TriStateSafetyTagV1;
  mutation_allowed: TriStateSafetyTagV1;
  mutation_posture_classification: string;
  command_kind: string;
  artifact_write_behavior: string;
  no_artifact_allowed: TriStateSafetyTagV1;
};

/**
 * Classify a safety value into a stable tag for run-ID hashing.
 * Does not use unstable object stringification.
 */
export function classifyTriStateSafetyValueV1(value: unknown): TriStateSafetyTagV1 {
  if (value === true) return "BOOLEAN_TRUE";
  if (value === false) return "BOOLEAN_FALSE";
  if (value === null) return "INVALID:null";
  if (Array.isArray(value)) return "INVALID:array";
  const t = typeof value;
  if (t === "string") return "INVALID:string";
  if (t === "number") return Number.isNaN(value as number) ? "INVALID:number_nan" : "INVALID:number";
  if (t === "bigint") return "INVALID:bigint";
  if (t === "symbol") return "INVALID:symbol";
  if (t === "function") return "INVALID:function";
  if (t === "undefined") return "INVALID:undefined";
  if (t === "object") return "INVALID:object";
  return "INVALID:unknown";
}

/** Read a top-level safety field preserving missing vs present. */
export function readTriStateSafetyFieldV1(
  obj: Record<string, unknown> | null | undefined,
  key: string,
): TriStateSafetyTagV1 {
  if (!obj || !(key in obj)) return "MISSING";
  return classifyTriStateSafetyValueV1(obj[key]);
}

/** Deterministic canonical serialization for run_id hashing. */
export function serializeDispatchRunIdMaterialV1(m: DispatchRunIdMaterialV1): string {
  const keys = Object.keys(m).sort() as (keyof DispatchRunIdMaterialV1)[];
  return keys.map((k) => `${k}=${JSON.stringify(m[k])}`).join("\n");
}

export function mutationPostureClassificationV1(args: {
  mutation_allowed: TriStateSafetyTagV1 | boolean;
  read_only?: TriStateSafetyTagV1 | boolean;
  data_mutation?: TriStateSafetyTagV1 | boolean;
}): string {
  const tag = (v: TriStateSafetyTagV1 | boolean | undefined, fallback: TriStateSafetyTagV1) => {
    if (v === undefined) return fallback;
    if (typeof v === "boolean") return v ? "BOOLEAN_TRUE" : "BOOLEAN_FALSE";
    return v;
  };
  return [
    `mutation_allowed=${tag(args.mutation_allowed, "MISSING")}`,
    `read_only=${tag(args.read_only, "BOOLEAN_TRUE")}`,
    `data_mutation=${tag(args.data_mutation, "BOOLEAN_FALSE")}`,
  ].join("|");
}

export function buildDispatchRunIdV1(material: DispatchRunIdMaterialV1): string {
  return createHash("sha256").update(serializeDispatchRunIdMaterialV1(material)).digest("hex").slice(0, 32);
}

export function isValidDispatchRunIdV1(run_id: string): boolean {
  return /^[a-f0-9]{32}$/.test(run_id);
}

/**
 * Build run-ID material from the same canonical (or legacy batch) object used for
 * allowlist equality — never overwrite malformed safety fields with allowlist defaults.
 */
export function extractDispatchRunIdMaterialV1(args: {
  source_commit: string;
  canonRaw?: Record<string, unknown> | null;
  batch?: Record<string, unknown> | null;
}): DispatchRunIdMaterialV1 {
  const source = args.canonRaw ?? null;
  if (source) {
    const posture =
      source.mutation_posture &&
      typeof source.mutation_posture === "object" &&
      !Array.isArray(source.mutation_posture)
        ? (source.mutation_posture as Record<string, unknown>)
        : null;
    const mutation_allowed = posture
      ? readTriStateSafetyFieldV1(posture, "mutation_allowed")
      : "MISSING";
    const owner_review_required = readTriStateSafetyFieldV1(source, "owner_review_required");
    const no_artifact_allowed = readTriStateSafetyFieldV1(source, "no_artifact_allowed");
    const classification =
      posture && typeof posture.classification === "string" && posture.classification.length > 0
        ? posture.classification
        : mutationPostureClassificationV1({
            mutation_allowed,
            read_only: posture ? readTriStateSafetyFieldV1(posture, "read_only") : "MISSING",
            data_mutation: posture
              ? readTriStateSafetyFieldV1(posture, "data_mutation")
              : "MISSING",
          });
    return {
      source_commit: args.source_commit,
      selected_subsystem: String(source.selected_subsystem ?? ""),
      exact_command: String(source.exact_command ?? ""),
      steering_override_source: String(source.steering_override_source ?? ""),
      dispatch_status: String(source.dispatch_status ?? ""),
      owner_review_required,
      mutation_allowed,
      mutation_posture_classification: classification,
      command_kind: String(source.command_kind ?? ""),
      artifact_write_behavior: String(source.artifact_write_behavior ?? ""),
      no_artifact_allowed,
    };
  }
  const batch = args.batch ?? {};
  const posture =
    batch.mutation_posture &&
    typeof batch.mutation_posture === "object" &&
    !Array.isArray(batch.mutation_posture)
      ? (batch.mutation_posture as Record<string, unknown>)
      : null;
  const mutation_allowed = posture
    ? readTriStateSafetyFieldV1(posture, "mutation_allowed")
    : readTriStateSafetyFieldV1(batch, "mutation_allowed");
  const owner_review_required = readTriStateSafetyFieldV1(batch, "owner_review_required");
  const no_artifact_allowed = readTriStateSafetyFieldV1(batch, "no_artifact_allowed");
  return {
    source_commit: args.source_commit,
    selected_subsystem: String(batch.selected_subsystem ?? ""),
    exact_command: String(batch.exact_command ?? ""),
    steering_override_source: String(batch.steering_override_source ?? "batch_dispatch"),
    dispatch_status: String(batch.dispatch_status ?? ""),
    owner_review_required,
    mutation_allowed,
    mutation_posture_classification:
      posture && typeof posture.classification === "string" && posture.classification.length > 0
        ? posture.classification
        : mutationPostureClassificationV1({
            mutation_allowed,
            read_only: posture ? readTriStateSafetyFieldV1(posture, "read_only") : "MISSING",
            data_mutation: posture
              ? readTriStateSafetyFieldV1(posture, "data_mutation")
              : "MISSING",
          }),
    command_kind: String(batch.command_kind ?? ""),
    artifact_write_behavior: String(batch.artifact_write_behavior ?? ""),
    no_artifact_allowed,
  };
}

/** Compare durable journal binding fields to current expected material. */
export function validateResumeRecordBindingV1(args: {
  expected_run_id: string;
  expected: DispatchRunIdMaterialV1;
  stored: Record<string, unknown>;
}): { ok: true } | { ok: false; blockers: string[] } {
  const blockers: string[] = [];
  const check = (field: string, actual: unknown, expected: unknown) => {
    if (actual !== expected) {
      blockers.push(
        `resume_record_mismatch:${field} (stored=${JSON.stringify(actual)} expected=${JSON.stringify(expected)})`,
      );
    }
  };
  check("run_id", args.stored.run_id, args.expected_run_id);
  check("source_commit", args.stored.source_commit, args.expected.source_commit);
  check("selected_subsystem", args.stored.selected_subsystem, args.expected.selected_subsystem);
  check("exact_command", args.stored.exact_command, args.expected.exact_command);
  check(
    "steering_override_source",
    args.stored.steering_override_source,
    args.expected.steering_override_source,
  );
  const storedStatus = args.stored.dispatch_status_before ?? args.stored.dispatch_status ?? "";
  check("dispatch_status", storedStatus, args.expected.dispatch_status);
  check(
    "owner_review_required",
    args.stored.owner_review_required,
    args.expected.owner_review_required,
  );
  check("mutation_allowed", args.stored.mutation_allowed, args.expected.mutation_allowed);
  check(
    "mutation_posture_classification",
    args.stored.mutation_posture_classification,
    args.expected.mutation_posture_classification,
  );
  check("command_kind", args.stored.command_kind, args.expected.command_kind);
  check(
    "artifact_write_behavior",
    args.stored.artifact_write_behavior,
    args.expected.artifact_write_behavior,
  );
  check("no_artifact_allowed", args.stored.no_artifact_allowed, args.expected.no_artifact_allowed);
  if (blockers.length > 0) return { ok: false, blockers };
  return { ok: true };
}

export function dispatchResumeCommandV1(run_id: string): string {
  return `npm run buckparts:command-center:run-dispatch -- --resume-run-id=${run_id}`;
}

export function dispatchRunArtifactFileNameV1(run_id: string): string {
  return `dispatch-run-${run_id}.json`;
}

export type PriorDispatchArtifactLookupV1 =
  | {
      status: "found";
      abs_path: string;
      parsed: Record<string, unknown>;
      raw: string;
    }
  | {
      status: "parse_failed";
      abs_path: string;
      parsed: null;
      raw: string;
      discovery_blocker: string;
    }
  | {
      status: "structurally_invalid";
      abs_path: string;
      parsed: null;
      raw: string;
      discovery_blocker: string;
    };

/**
 * Resolve the canonical artifact path from the expected/requested run ID first.
 * Discovery does not trust or require the stored run_id to match.
 * Binding validation emits resume_record_mismatch:run_id when the body is tampered.
 */
export function findPriorDispatchArtifactByRunIdV1(args: {
  dirAbs: string;
  run_id: string;
  readText: (abs: string) => string;
  exists: (abs: string) => boolean;
  /** @deprecated unused — lookup is canonical-filename only (no directory scan). */
  readdir?: (abs: string) => string[];
}): PriorDispatchArtifactLookupV1 | null {
  if (!args.exists(args.dirAbs)) return null;
  const abs = path.join(args.dirAbs, dispatchRunArtifactFileNameV1(args.run_id));
  if (!args.exists(abs)) return null;
  let raw = "";
  try {
    raw = args.readText(abs);
  } catch (err) {
    return {
      status: "parse_failed",
      abs_path: abs,
      parsed: null,
      raw: "",
      discovery_blocker: `resume_record_read_failed:${err instanceof Error ? err.message : String(err)}`,
    };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        status: "structurally_invalid",
        abs_path: abs,
        parsed: null,
        raw,
        discovery_blocker: "resume_record_structurally_invalid",
      };
    }
    return {
      status: "found",
      abs_path: abs,
      parsed: parsed as Record<string, unknown>,
      raw,
    };
  } catch (err) {
    return {
      status: "parse_failed",
      abs_path: abs,
      parsed: null,
      raw,
      discovery_blocker: `resume_record_json_parse_failed:${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function isTerminalSuccessfulLifecycleV1(life: string | undefined): boolean {
  return life === "EXECUTED" || life === "ALREADY_EXECUTED";
}

export function isAmbiguousExecutionLifecycleV1(life: string | undefined): boolean {
  return life === "EXECUTION_IN_PROGRESS" || life === "EXECUTION_OUTCOME_UNKNOWN";
}

/** Stages that skip subprocess on resume (artifact/ledger finalization). */
export function shouldSkipSubprocessForPriorRunV1(prior: Record<string, unknown> | null): boolean {
  if (!prior) return false;
  const life = String(prior.execution_lifecycle ?? prior.execution_status ?? "");
  return (
    isTerminalSuccessfulLifecycleV1(life) ||
    life === "EXECUTED_LEDGER_PENDING" ||
    life === "EXECUTED_ARTIFACT_PENDING"
  );
}

/**
 * Ordinary (non-resume) invocation must refuse these durable states.
 * FAILED / READY_TO_EXECUTE require explicit --resume-run-id.
 */
export function ordinaryInvocationMustRefuseLifecycleV1(life: string | undefined): boolean {
  return (
    life === "FAILED" ||
    life === "READY_TO_EXECUTE" ||
    life === "EXECUTION_IN_PROGRESS" ||
    life === "EXECUTION_OUTCOME_UNKNOWN"
  );
}

export function resumeStageForLifecycleV1(life: DispatchRunLifecycleV1): string {
  switch (life) {
    case "READY_TO_EXECUTE":
    case "FAILED":
      return "subprocess";
    case "EXECUTION_IN_PROGRESS":
    case "EXECUTION_OUTCOME_UNKNOWN":
      return "reconcile_uncertain_execution";
    case "EXECUTED_ARTIFACT_PENDING":
      return "artifact_write";
    case "EXECUTED_LEDGER_PENDING":
      return "ledger_refresh";
    case "EXECUTED":
    case "ALREADY_EXECUTED":
      return "complete";
    case "REFUSED":
    default:
      return "gates";
  }
}

export function atomicWriteJsonV1(args: {
  absPath: string;
  value: unknown;
  writeText?: (abs: string, contents: string) => void;
  rename?: (from: string, to: string) => void;
}): void {
  const writeText = args.writeText ?? ((p, c) => writeFileSync(p, c, "utf8"));
  const rename = args.rename ?? renameSync;
  const tmp = `${args.absPath}.${process.pid}.${Date.now()}.tmp`;
  const body = JSON.stringify(args.value, null, 2) + "\n";
  writeText(tmp, body);
  rename(tmp, args.absPath);
}
