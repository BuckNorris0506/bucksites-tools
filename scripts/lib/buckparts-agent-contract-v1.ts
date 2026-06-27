/**
 * BuckParts Agent Contract + Dispatch Manifest v1 — vendor-agnostic external agent handoff.
 * BuckParts Truth Contract: UNKNOWN over guessing; fail closed; no mutation without founder approval.
 * Runner writes dispatch manifests; external operators write result artifacts; Runner validates before continue.
 */

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const BUCKPARTS_AGENT_CONTRACT_V1 = "agent_contract_v1" as const;

export const BUCKPARTS_AGENT_DISPATCH_MANIFEST_CONTRACT_V1 =
  "buckparts_agent_dispatch_manifest_v1" as const;

export const BUCKPARTS_AGENT_RESULT_CONTRACT_V1 = "buckparts_agent_result_v1" as const;

export const BUCKPARTS_AGENT_VALIDATION_CONTRACT_V1 =
  "buckparts_agent_result_validation_v1" as const;

export const BUCKPARTS_AGENT_DISPATCH_MANIFESTS_DIR_REL_V1 =
  "data/command-center/agent-dispatch/manifests" as const;

export const BUCKPARTS_AGENT_DISPATCH_RESULTS_DIR_REL_V1 =
  "data/command-center/agent-dispatch/results" as const;

export const BUCKPARTS_AGENT_CC_JQ_PATH_V1 = ".command_center_v2.agent_contract_v1" as const;

export const BUCKPARTS_AGENT_SOURCE_COMMAND_V1 = "npm run buckparts:agent-contract" as const;

/** Surfaces allowed in manifests — never vendor product names. */
export type AgentExecutionSurfaceV1 = "EXTERNAL_OPERATOR" | "EXTERNAL_AUTOMATION";

export type AgentDispatchTemplateIdV1 = "read_only_evidence_collection_v1";

export type AgentDispatchObjectiveClassV1 =
  | "READ_ONLY_EVIDENCE_COLLECTION"
  | "READ_ONLY_DISCOVERY_PACKET";

export type AgentDispatchManifestStatusV1 =
  | "DISPATCH_WRITTEN"
  | "RESULT_PENDING"
  | "RESULT_RECEIVED"
  | "VALIDATION_PASS"
  | "VALIDATION_FAIL"
  | "TIMED_OUT"
  | "EXHAUSTED";

export type AgentResultCompletionStatusV1 = "COMPLETE" | "PARTIAL" | "FAILED";

export type AgentResultValidationStatusV1 =
  | "PENDING"
  | "VALIDATION_PASS"
  | "VALIDATION_FAIL";

export type AgentDispatchTemplateV1 = {
  template_id: AgentDispatchTemplateIdV1;
  title: string;
  execution_surface: AgentExecutionSurfaceV1;
  objective_class: AgentDispatchObjectiveClassV1;
  prohibited_actions: readonly string[];
  required_result_fields: readonly string[];
  result_must_assert: {
    mutation_authorized: false;
    truth_closure_claimed: false;
    csv_apply_authorized?: false;
    evidence_write_authorized?: false;
  };
  default_timeout_ms: number;
  default_max_attempts: number;
};

export type AgentDispatchStepConfigV1 = {
  template_id: AgentDispatchTemplateIdV1;
  input_artifact_rel_paths: readonly string[];
  objective_summary: string;
  timeout_ms?: number;
  max_attempts?: number;
};

export type AgentDispatchRetryPolicyV1 = {
  max_attempts: number;
  attempt_number: number;
  retry_after_validation_fail: true;
  retry_after_timeout: true;
};

export type AgentOwnershipBoundariesV1 = {
  runner_may_write: readonly string[];
  external_operator_may_write: readonly string[];
  founder_required_for: readonly string[];
  runner_must_not: readonly string[];
};

export type BuckpartsAgentDispatchManifestV1 = {
  contract: typeof BUCKPARTS_AGENT_DISPATCH_MANIFEST_CONTRACT_V1;
  manifest_id: string;
  dispatch_id: string;
  run_id: string;
  mission_id: string;
  step_id: string;
  created_at: string;
  updated_at: string;
  status: AgentDispatchManifestStatusV1;
  template_id: AgentDispatchTemplateIdV1;
  execution_surface: AgentExecutionSurfaceV1;
  objective_class: AgentDispatchObjectiveClassV1;
  objective_summary: string;
  input_artifact_rel_paths: readonly string[];
  result_artifact_rel_path: string;
  expected_result_contract: typeof BUCKPARTS_AGENT_RESULT_CONTRACT_V1;
  validation_contract: typeof BUCKPARTS_AGENT_VALIDATION_CONTRACT_V1;
  timeout_at: string;
  retry_policy: AgentDispatchRetryPolicyV1;
  ownership_boundaries: AgentOwnershipBoundariesV1;
  prohibited_actions: readonly string[];
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  proven_facts: readonly string[];
  unknown_facts: readonly string[];
};

export type BuckpartsAgentResultV1 = {
  contract: typeof BUCKPARTS_AGENT_RESULT_CONTRACT_V1;
  manifest_id: string;
  dispatch_id: string;
  result_id: string;
  submitted_at: string;
  submitted_by_surface: AgentExecutionSurfaceV1;
  completion_status: AgentResultCompletionStatusV1;
  validation_status: AgentResultValidationStatusV1;
  output_artifact_rel_paths: readonly string[];
  structured_summary: Record<string, unknown>;
  proven_facts: readonly string[];
  unknown_facts: readonly string[];
  mutation_authorized: false;
  truth_closure_claimed: false;
  csv_apply_authorized?: false;
  evidence_write_authorized?: false;
};

export type AgentResultValidationOutcomeV1 = {
  contract: typeof BUCKPARTS_AGENT_VALIDATION_CONTRACT_V1;
  manifest_id: string;
  validated_at: string;
  validation_pass: boolean;
  validation_errors: readonly string[];
  validation_warnings: readonly string[];
  retry_eligible: boolean;
  attempts_remaining: number;
};

export type AgentDispatchExecutionOutcomeV1 = {
  manifest: BuckpartsAgentDispatchManifestV1;
  manifest_rel_path: string;
  result: BuckpartsAgentResultV1 | null;
  result_rel_path: string | null;
  validation: AgentResultValidationOutcomeV1 | null;
  runner_status: "PASS" | "HALTED" | "FAIL";
  halt_reason: "EXTERNAL_AGENT_REQUIRED" | "DISPATCH_EXHAUSTED" | null;
  halt_detail: string | null;
};

export const AGENT_DISPATCH_TEMPLATES_V1: Record<
  AgentDispatchTemplateIdV1,
  AgentDispatchTemplateV1
> = {
  read_only_evidence_collection_v1: {
    template_id: "read_only_evidence_collection_v1",
    title: "Read-only evidence collection",
    execution_surface: "EXTERNAL_OPERATOR",
    objective_class: "READ_ONLY_EVIDENCE_COLLECTION",
    prohibited_actions: [
      "mutate_csv",
      "mutate_supabase",
      "auto_promote_buy_links",
      "truth_closure_without_repo_validation",
      "commit_or_push_from_external_surface",
    ],
    required_result_fields: [
      "completion_status",
      "output_artifact_rel_paths",
      "mutation_authorized",
      "truth_closure_claimed",
    ],
    result_must_assert: {
      mutation_authorized: false,
      truth_closure_claimed: false,
      csv_apply_authorized: false,
      evidence_write_authorized: false,
    },
    default_timeout_ms: 86_400_000,
    default_max_attempts: 3,
  },
};

export const AGENT_OWNERSHIP_BOUNDARIES_V1: AgentOwnershipBoundariesV1 = {
  runner_may_write: [
    "dispatch manifest under data/command-center/agent-dispatch/manifests/",
    "runner checkpoint and runner run artifact",
  ],
  external_operator_may_write: [
    "result artifact under data/command-center/agent-dispatch/results/",
    "output evidence files referenced by result.output_artifact_rel_paths",
  ],
  founder_required_for: [
    "csv_apply_authorized",
    "mutation_authorized",
    "owner_mutation_approved",
    "evidence_write_authorized",
    "truth closure promotion to PROVEN buyer path",
  ],
  runner_must_not: [
    "invoke vendor APIs or chat surfaces",
    "auto-approve external agent outputs",
    "mutate product truth from result prose alone",
  ],
};

const VENDOR_FORBIDDEN_TOKENS_V1 = [
  "hyperagent",
  "cursor",
  "codex",
  "claude",
  "openai",
  "anthropic",
] as const;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function containsVendorToken(text: string): string | null {
  const lower = text.toLowerCase();
  for (const token of VENDOR_FORBIDDEN_TOKENS_V1) {
    if (lower.includes(token)) {
      return token;
    }
  }
  return null;
}

export function manifestRelPathV1(runId: string, stepId: string): string {
  const safeRun = runId.replace(/[^a-zA-Z0-9-]/g, "");
  const safeStep = stepId.replace(/[^a-zA-Z0-9-_]/g, "");
  return `${BUCKPARTS_AGENT_DISPATCH_MANIFESTS_DIR_REL_V1}/${safeRun}/${safeStep}.json`;
}

export function resultRelPathV1(manifestId: string): string {
  const safeId = manifestId.replace(/[^a-zA-Z0-9-]/g, "");
  return `${BUCKPARTS_AGENT_DISPATCH_RESULTS_DIR_REL_V1}/${safeId}.json`;
}

export function buildManifestIdV1(args: {
  runId: string;
  stepId: string;
  attemptNumber: number;
}): string {
  const raw = `${args.runId}:${args.stepId}:${String(args.attemptNumber)}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export function getAgentDispatchTemplateV1(
  templateId: string,
): AgentDispatchTemplateV1 | null {
  if (!(templateId in AGENT_DISPATCH_TEMPLATES_V1)) {
    return null;
  }
  return AGENT_DISPATCH_TEMPLATES_V1[templateId as AgentDispatchTemplateIdV1];
}

export function validateAgentDispatchStepConfigV1(
  config: AgentDispatchStepConfigV1,
): string[] {
  const errors: string[] = [];
  const template = getAgentDispatchTemplateV1(config.template_id);
  if (!template) {
    errors.push(`unknown template_id ${config.template_id}`);
  }
  if (!isNonEmptyString(config.objective_summary)) {
    errors.push("objective_summary must be non-empty");
  }
  const vendorInObjective = containsVendorToken(config.objective_summary);
  if (vendorInObjective) {
    errors.push(`objective_summary must not reference vendor token ${vendorInObjective}`);
  }
  if (!Array.isArray(config.input_artifact_rel_paths) || config.input_artifact_rel_paths.length === 0) {
    errors.push("input_artifact_rel_paths must be a non-empty array");
  }
  for (const rel of config.input_artifact_rel_paths ?? []) {
    if (!isNonEmptyString(rel)) {
      errors.push("input_artifact_rel_paths entries must be non-empty strings");
    }
  }
  if (config.timeout_ms !== undefined && (config.timeout_ms <= 0 || !Number.isFinite(config.timeout_ms))) {
    errors.push("timeout_ms must be a positive finite number when set");
  }
  if (
    config.max_attempts !== undefined &&
    (!Number.isInteger(config.max_attempts) || config.max_attempts < 1)
  ) {
    errors.push("max_attempts must be a positive integer when set");
  }
  return errors;
}

export function buildAgentDispatchManifestV1(args: {
  runId: string;
  missionId: string;
  stepId: string;
  config: AgentDispatchStepConfigV1;
  attemptNumber: number;
  now: () => Date;
}): BuckpartsAgentDispatchManifestV1 {
  const template = getAgentDispatchTemplateV1(args.config.template_id);
  if (!template) {
    throw new Error(`Unknown dispatch template: ${args.config.template_id}`);
  }
  const configErrors = validateAgentDispatchStepConfigV1(args.config);
  if (configErrors.length > 0) {
    throw new Error(`Invalid dispatch config: ${configErrors.join("; ")}`);
  }

  const timeoutMs = args.config.timeout_ms ?? template.default_timeout_ms;
  const maxAttempts = args.config.max_attempts ?? template.default_max_attempts;
  const nowIso = args.now().toISOString();
  const manifestId = buildManifestIdV1({
    runId: args.runId,
    stepId: args.stepId,
    attemptNumber: args.attemptNumber,
  });

  return {
    contract: BUCKPARTS_AGENT_DISPATCH_MANIFEST_CONTRACT_V1,
    manifest_id: manifestId,
    dispatch_id: randomUUID(),
    run_id: args.runId,
    mission_id: args.missionId,
    step_id: args.stepId,
    created_at: nowIso,
    updated_at: nowIso,
    status: "DISPATCH_WRITTEN",
    template_id: template.template_id,
    execution_surface: template.execution_surface,
    objective_class: template.objective_class,
    objective_summary: args.config.objective_summary.trim(),
    input_artifact_rel_paths: [...args.config.input_artifact_rel_paths],
    result_artifact_rel_path: resultRelPathV1(manifestId),
    expected_result_contract: BUCKPARTS_AGENT_RESULT_CONTRACT_V1,
    validation_contract: BUCKPARTS_AGENT_VALIDATION_CONTRACT_V1,
    timeout_at: new Date(args.now().getTime() + timeoutMs).toISOString(),
    retry_policy: {
      max_attempts: maxAttempts,
      attempt_number: args.attemptNumber,
      retry_after_validation_fail: true,
      retry_after_timeout: true,
    },
    ownership_boundaries: AGENT_OWNERSHIP_BOUNDARIES_V1,
    prohibited_actions: [...template.prohibited_actions],
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    proven_facts: [
      "PROVEN: Dispatch manifest is read-only handoff — Runner does not call external agent APIs.",
      `PROVEN: template_id=${template.template_id} objective_class=${template.objective_class}.`,
      "PROVEN: Founder-only mutation approval remains required for CSV/Supabase/truth closure.",
    ],
    unknown_facts: [
      "UNKNOWN: External operator completion time until result artifact is written.",
    ],
  };
}

export function validateDispatchManifestStructureV1(
  raw: unknown,
): { ok: true; manifest: BuckpartsAgentDispatchManifestV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isPlainObject(raw)) {
    return { ok: false, errors: ["manifest must be an object"] };
  }
  if (raw.contract !== BUCKPARTS_AGENT_DISPATCH_MANIFEST_CONTRACT_V1) {
    errors.push(`contract must be ${BUCKPARTS_AGENT_DISPATCH_MANIFEST_CONTRACT_V1}`);
  }
  for (const field of [
    "manifest_id",
    "dispatch_id",
    "run_id",
    "mission_id",
    "step_id",
    "created_at",
    "updated_at",
    "timeout_at",
    "objective_summary",
    "result_artifact_rel_path",
  ] as const) {
    if (!isNonEmptyString(raw[field])) {
      errors.push(`${field} must be a non-empty string`);
    }
  }
  if (raw.read_only !== true || raw.data_mutation !== false || raw.mutation_authorized !== false) {
    errors.push("read_only=true, data_mutation=false, mutation_authorized=false required");
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, manifest: raw as BuckpartsAgentDispatchManifestV1 };
}

export function validateAgentResultStructureV1(
  raw: unknown,
): { ok: true; result: BuckpartsAgentResultV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isPlainObject(raw)) {
    return { ok: false, errors: ["result must be an object"] };
  }
  if (raw.contract !== BUCKPARTS_AGENT_RESULT_CONTRACT_V1) {
    errors.push(`contract must be ${BUCKPARTS_AGENT_RESULT_CONTRACT_V1}`);
  }
  for (const field of [
    "manifest_id",
    "dispatch_id",
    "result_id",
    "submitted_at",
    "completion_status",
  ] as const) {
    if (!isNonEmptyString(raw[field])) {
      errors.push(`${field} must be a non-empty string`);
    }
  }
  if (
    raw.completion_status !== "COMPLETE" &&
    raw.completion_status !== "PARTIAL" &&
    raw.completion_status !== "FAILED"
  ) {
    errors.push("completion_status must be COMPLETE, PARTIAL, or FAILED");
  }
  if (!Array.isArray(raw.output_artifact_rel_paths)) {
    errors.push("output_artifact_rel_paths must be an array");
  }
  if (raw.mutation_authorized !== false) {
    errors.push("mutation_authorized must be false");
  }
  if (raw.truth_closure_claimed !== false) {
    errors.push("truth_closure_claimed must be false");
  }
  const serialized = JSON.stringify(raw);
  const vendor = containsVendorToken(serialized);
  if (vendor) {
    errors.push(`result artifact must not contain vendor token ${vendor}`);
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, result: raw as BuckpartsAgentResultV1 };
}

export function validateAgentResultAgainstManifestV1(args: {
  manifest: BuckpartsAgentDispatchManifestV1;
  result: BuckpartsAgentResultV1;
  rootDir: string;
  now?: () => Date;
}): AgentResultValidationOutcomeV1 {
  const now = args.now ?? (() => new Date());
  const errors: string[] = [];
  const warnings: string[] = [];

  const template = getAgentDispatchTemplateV1(args.manifest.template_id);
  if (!template) {
    errors.push(`unknown template_id on manifest: ${args.manifest.template_id}`);
  }

  if (args.result.manifest_id !== args.manifest.manifest_id) {
    errors.push(
      `result.manifest_id ${args.result.manifest_id} !== manifest.manifest_id ${args.manifest.manifest_id}`,
    );
  }
  if (args.result.dispatch_id !== args.manifest.dispatch_id) {
    errors.push(
      `result.dispatch_id ${args.result.dispatch_id} !== manifest.dispatch_id ${args.manifest.dispatch_id}`,
    );
  }

  if (args.result.completion_status === "FAILED") {
    errors.push("completion_status=FAILED — external operator reported failure");
  }

  if (template) {
    for (const field of template.required_result_fields) {
      if (!(field in args.result)) {
        errors.push(`missing required result field ${field}`);
      }
    }
    for (const [key, expected] of Object.entries(template.result_must_assert)) {
      if ((args.result as Record<string, unknown>)[key] !== expected) {
        errors.push(`result.${key} must be ${String(expected)}`);
      }
    }
  }

  if (args.result.output_artifact_rel_paths.length === 0 && args.result.completion_status === "COMPLETE") {
    warnings.push("COMPLETE with empty output_artifact_rel_paths — verify intentional");
  }

  for (const rel of args.result.output_artifact_rel_paths) {
    if (!isNonEmptyString(rel)) {
      errors.push("output_artifact_rel_paths contains empty entry");
      continue;
    }
    const abs = path.join(args.rootDir, rel);
    if (!existsSync(abs)) {
      errors.push(`output artifact missing on disk: ${rel}`);
    }
  }

  for (const rel of args.manifest.input_artifact_rel_paths) {
    const abs = path.join(args.rootDir, rel);
    if (!existsSync(abs)) {
      warnings.push(`input artifact missing on disk: ${rel}`);
    }
  }

  const attemptsRemaining = Math.max(
    0,
    args.manifest.retry_policy.max_attempts - args.manifest.retry_policy.attempt_number,
  );
  const validationPass = errors.length === 0;
  const retryEligible = !validationPass && attemptsRemaining > 0;

  return {
    contract: BUCKPARTS_AGENT_VALIDATION_CONTRACT_V1,
    manifest_id: args.manifest.manifest_id,
    validated_at: now().toISOString(),
    validation_pass: validationPass,
    validation_errors: errors,
    validation_warnings: warnings,
    retry_eligible: retryEligible,
    attempts_remaining: retryEligible ? attemptsRemaining : 0,
  };
}

export function writeAgentDispatchManifestV1(
  rootDir: string,
  manifest: BuckpartsAgentDispatchManifestV1,
): string {
  const rel = manifestRelPathV1(manifest.run_id, manifest.step_id);
  const abs = path.join(rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return rel;
}

export function loadAgentDispatchManifestV1(
  rootDir: string,
  runId: string,
  stepId: string,
): BuckpartsAgentDispatchManifestV1 | null {
  const abs = path.join(rootDir, manifestRelPathV1(runId, stepId));
  if (!existsSync(abs)) {
    return null;
  }
  const parsed = validateDispatchManifestStructureV1(
    JSON.parse(readFileSync(abs, "utf8")) as unknown,
  );
  return parsed.ok ? parsed.manifest : null;
}

export function loadAgentResultV1(
  rootDir: string,
  resultRelPath: string,
): BuckpartsAgentResultV1 | null {
  const abs = path.join(rootDir, resultRelPath);
  if (!existsSync(abs)) {
    return null;
  }
  const parsed = validateAgentResultStructureV1(
    JSON.parse(readFileSync(abs, "utf8")) as unknown,
  );
  return parsed.ok ? parsed.result : null;
}

export function executeAgentDispatchStepV1(args: {
  rootDir: string;
  runId: string;
  missionId: string;
  stepId: string;
  stepTitle: string;
  config: AgentDispatchStepConfigV1;
  writeArtifacts: boolean;
  now?: () => Date;
}): AgentDispatchExecutionOutcomeV1 {
  const now = args.now ?? (() => new Date());
  const configErrors = validateAgentDispatchStepConfigV1(args.config);
  if (configErrors.length > 0) {
    throw new Error(`Invalid agent dispatch config: ${configErrors.join("; ")}`);
  }

  let manifest =
    loadAgentDispatchManifestV1(args.rootDir, args.runId, args.stepId) ??
    buildAgentDispatchManifestV1({
      runId: args.runId,
      missionId: args.missionId,
      stepId: args.stepId,
      config: args.config,
      attemptNumber: 1,
      now,
    });

  if (args.writeArtifacts) {
    writeAgentDispatchManifestV1(args.rootDir, manifest);
  }

  const result = loadAgentResultV1(args.rootDir, manifest.result_artifact_rel_path);
  const resultRelPath = result ? manifest.result_artifact_rel_path : null;

  if (!result) {
    const timedOut = now().getTime() > new Date(manifest.timeout_at).getTime();
    if (timedOut) {
      manifest = {
        ...manifest,
        status: "TIMED_OUT",
        updated_at: now().toISOString(),
        unknown_facts: [
          ...manifest.unknown_facts,
          `PROVEN: Dispatch timed out at ${manifest.timeout_at} without result artifact.`,
        ],
      };
      if (args.writeArtifacts) {
        writeAgentDispatchManifestV1(args.rootDir, manifest);
      }

      const canRetry =
        manifest.retry_policy.retry_after_timeout &&
        manifest.retry_policy.attempt_number < manifest.retry_policy.max_attempts;

      if (canRetry) {
        const nextAttempt = manifest.retry_policy.attempt_number + 1;
        manifest = buildAgentDispatchManifestV1({
          runId: args.runId,
          missionId: args.missionId,
          stepId: args.stepId,
          config: args.config,
          attemptNumber: nextAttempt,
          now,
        });
        manifest.status = "RESULT_PENDING";
        if (args.writeArtifacts) {
          writeAgentDispatchManifestV1(args.rootDir, manifest);
        }
        return {
          manifest,
          manifest_rel_path: manifestRelPathV1(args.runId, args.stepId),
          result: null,
          result_rel_path: null,
          validation: null,
          runner_status: "HALTED",
          halt_reason: "EXTERNAL_AGENT_REQUIRED",
          halt_detail: `Dispatch timed out — retry attempt ${String(nextAttempt)}/${String(manifest.retry_policy.max_attempts)}; write result to ${manifest.result_artifact_rel_path}`,
        };
      }

      return {
        manifest,
        manifest_rel_path: manifestRelPathV1(args.runId, args.stepId),
        result: null,
        result_rel_path: null,
        validation: null,
        runner_status: "FAIL",
        halt_reason: "DISPATCH_EXHAUSTED",
        halt_detail: `Dispatch timed out after ${String(manifest.retry_policy.max_attempts)} attempt(s)`,
      };
    }

    manifest = {
      ...manifest,
      status: "RESULT_PENDING",
      updated_at: now().toISOString(),
    };
    if (args.writeArtifacts) {
      writeAgentDispatchManifestV1(args.rootDir, manifest);
    }

    return {
      manifest,
      manifest_rel_path: manifestRelPathV1(args.runId, args.stepId),
      result: null,
      result_rel_path: null,
      validation: null,
      runner_status: "HALTED",
      halt_reason: "EXTERNAL_AGENT_REQUIRED",
      halt_detail: `Awaiting result artifact at ${manifest.result_artifact_rel_path} (timeout ${manifest.timeout_at})`,
    };
  }

  const structureCheck = validateAgentResultStructureV1(result);
  if (!structureCheck.ok) {
    const validation: AgentResultValidationOutcomeV1 = {
      contract: BUCKPARTS_AGENT_VALIDATION_CONTRACT_V1,
      manifest_id: manifest.manifest_id,
      validated_at: now().toISOString(),
      validation_pass: false,
      validation_errors: structureCheck.errors,
      validation_warnings: [],
      retry_eligible:
        manifest.retry_policy.attempt_number < manifest.retry_policy.max_attempts,
      attempts_remaining: Math.max(
        0,
        manifest.retry_policy.max_attempts - manifest.retry_policy.attempt_number,
      ),
    };
    return handleValidationFailureV1({
      rootDir: args.rootDir,
      runId: args.runId,
      missionId: args.missionId,
      stepId: args.stepId,
      config: args.config,
      writeArtifacts: args.writeArtifacts,
      manifest,
      validation,
      now,
    });
  }

  const validation = validateAgentResultAgainstManifestV1({
    manifest,
    result: structureCheck.result,
    rootDir: args.rootDir,
    now,
  });

  if (!validation.validation_pass) {
    return handleValidationFailureV1({
      rootDir: args.rootDir,
      runId: args.runId,
      missionId: args.missionId,
      stepId: args.stepId,
      config: args.config,
      writeArtifacts: args.writeArtifacts,
      manifest,
      validation,
      now,
      result: structureCheck.result,
    });
  }

  manifest = {
    ...manifest,
    status: "VALIDATION_PASS",
    updated_at: now().toISOString(),
    proven_facts: [
      ...manifest.proven_facts,
      "PROVEN: Result artifact validated — Runner may continue mission.",
    ],
  };
  if (args.writeArtifacts) {
    writeAgentDispatchManifestV1(args.rootDir, manifest);
  }

  return {
    manifest,
    manifest_rel_path: manifestRelPathV1(args.runId, args.stepId),
    result: structureCheck.result,
    result_rel_path: resultRelPath,
    validation,
    runner_status: "PASS",
    halt_reason: null,
    halt_detail: null,
  };
}

function handleValidationFailureV1(args: {
  rootDir: string;
  runId: string;
  missionId: string;
  stepId: string;
  config: AgentDispatchStepConfigV1;
  writeArtifacts: boolean;
  manifest: BuckpartsAgentDispatchManifestV1;
  validation: AgentResultValidationOutcomeV1;
  now: () => Date;
  result?: BuckpartsAgentResultV1;
}): AgentDispatchExecutionOutcomeV1 {
  let manifest: BuckpartsAgentDispatchManifestV1 = {
    ...args.manifest,
    status: "VALIDATION_FAIL",
    updated_at: args.now().toISOString(),
  };
  if (args.writeArtifacts) {
    writeAgentDispatchManifestV1(args.rootDir, manifest);
  }

  if (args.validation.retry_eligible) {
    const nextAttempt = manifest.retry_policy.attempt_number + 1;
    manifest = buildAgentDispatchManifestV1({
      runId: args.runId,
      missionId: args.missionId,
      stepId: args.stepId,
      config: args.config,
      attemptNumber: nextAttempt,
      now: args.now,
    });
    manifest.status = "RESULT_PENDING";
    if (args.writeArtifacts) {
      writeAgentDispatchManifestV1(args.rootDir, manifest);
    }
    return {
      manifest,
      manifest_rel_path: manifestRelPathV1(args.runId, args.stepId),
      result: args.result ?? null,
      result_rel_path: args.result ? manifest.result_artifact_rel_path : null,
      validation: args.validation,
      runner_status: "HALTED",
      halt_reason: "EXTERNAL_AGENT_REQUIRED",
      halt_detail: `Result validation failed — retry ${String(nextAttempt)}/${String(manifest.retry_policy.max_attempts)}: ${args.validation.validation_errors.join("; ")}`,
    };
  }

  manifest = {
    ...manifest,
    status: "EXHAUSTED",
    updated_at: args.now().toISOString(),
  };
  if (args.writeArtifacts) {
    writeAgentDispatchManifestV1(args.rootDir, manifest);
  }

  return {
    manifest,
    manifest_rel_path: manifestRelPathV1(args.runId, args.stepId),
    result: args.result ?? null,
    result_rel_path: args.result ? manifest.result_artifact_rel_path : null,
    validation: args.validation,
    runner_status: "FAIL",
    halt_reason: "DISPATCH_EXHAUSTED",
    halt_detail: `Result validation exhausted after ${String(args.manifest.retry_policy.max_attempts)} attempt(s): ${args.validation.validation_errors.join("; ")}`,
  };
}

export type AgentContractProjectionV1 = {
  contract: typeof BUCKPARTS_AGENT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof BUCKPARTS_AGENT_CC_JQ_PATH_V1;
  source_command: typeof BUCKPARTS_AGENT_SOURCE_COMMAND_V1;
  generated_at: string;
  manifest_count: number;
  pending_result_count: number;
  validation_pass_count: number;
  validation_fail_count: number;
  timed_out_count: number;
  exhausted_count: number;
  latest_manifests: BuckpartsAgentDispatchManifestV1[];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export function listAgentDispatchManifestsV1(rootDir: string): BuckpartsAgentDispatchManifestV1[] {
  const base = path.join(rootDir, BUCKPARTS_AGENT_DISPATCH_MANIFESTS_DIR_REL_V1);
  if (!existsSync(base)) {
    return [];
  }
  const manifests: BuckpartsAgentDispatchManifestV1[] = [];

  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        const parsed = validateDispatchManifestStructureV1(
          JSON.parse(readFileSync(full, "utf8")) as unknown,
        );
        if (parsed.ok) {
          manifests.push(parsed.manifest);
        }
      }
    }
  }

  walk(base);
  return manifests.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function buildAgentContractProjectionV1(args: {
  rootDir: string;
  now?: () => Date;
}): AgentContractProjectionV1 {
  const now = args.now ?? (() => new Date());
  const manifests = listAgentDispatchManifestsV1(args.rootDir);

  const pending = manifests.filter(
    (m) => m.status === "DISPATCH_WRITTEN" || m.status === "RESULT_PENDING",
  );
  const validationPass = manifests.filter((m) => m.status === "VALIDATION_PASS");
  const validationFail = manifests.filter((m) => m.status === "VALIDATION_FAIL");
  const timedOut = manifests.filter((m) => m.status === "TIMED_OUT");
  const exhausted = manifests.filter((m) => m.status === "EXHAUSTED");

  let recommended = "PROVEN: No agent dispatch manifests on disk — Runner writes manifests when missions include agent_dispatch steps.";
  if (pending.length > 0) {
    const top = pending[0]!;
    recommended = `PROVEN: ${String(pending.length)} dispatch(es) awaiting result — external operator writes ${top.result_artifact_rel_path}; Runner validates on resume.`;
  } else if (exhausted.length > 0) {
    recommended = `PROVEN: ${String(exhausted.length)} exhausted dispatch(es) — inspect validation errors in manifest artifacts; founder approval still required for any mutation.`;
  } else if (validationPass.length > 0) {
    recommended = "PROVEN: Latest dispatches validated — continue Runner mission or ingest output artifacts through existing repo validation paths.";
  }

  return {
    contract: BUCKPARTS_AGENT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: BUCKPARTS_AGENT_CC_JQ_PATH_V1,
    source_command: BUCKPARTS_AGENT_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    manifest_count: manifests.length,
    pending_result_count: pending.length,
    validation_pass_count: validationPass.length,
    validation_fail_count: validationFail.length,
    timed_out_count: timedOut.length,
    exhausted_count: exhausted.length,
    latest_manifests: manifests.slice(0, 8),
    recommended_next_action: recommended,
    proven_facts: [
      "PROVEN: Agent Contract v1 is vendor-agnostic — Runner never invokes external agent APIs.",
      "PROVEN: Dispatch manifests written by Runner; result artifacts written by external operator.",
      "PROVEN: Founder-only mutation approval preserved — result validation does not grant csv_apply_authorized.",
    ],
    unknown_facts:
      pending.length > 0
        ? ["UNKNOWN: External operator completion time for pending dispatches."]
        : [],
  };
}
