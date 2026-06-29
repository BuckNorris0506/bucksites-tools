/**
 * External signals registry v1 — read-only discovery from committed repo artifacts.
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  loadWrongCodePreventionArtifactV1,
  WRONG_CODE_PREVENTION_ARTIFACT_REL_V1,
} from "./wrong-code-prevention-v1";
import { buildExternalQualitySignalUsefulnessLaneV1 } from "./external-quality-signal-usefulness-v1";

export const EXTERNAL_SIGNALS_REGISTRY_CONTRACT_V1 =
  "buckparts_external_signals_registry_v1" as const;

export const EXTERNAL_SIGNALS_REGISTRY_REL_V1 =
  "data/command-center/external-signals/registry-v1.json" as const;

export type ExternalSignalSourceTypeV1 =
  | "hyperagent_audit"
  | "github_actions"
  | "sentry_runtime"
  | "cursor_implementation"
  | "owner_browser_proof";

export type ExternalSignalValidationStatusV1 =
  | "CANDIDATE"
  | "REPO_VALIDATED"
  | "SUPERSEDED"
  | "STALE"
  | "REJECTED";

export type ExternalSignalSeverityV1 = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type BuckpartsExternalSignalV1 = {
  contract: "buckparts_external_signal_v1";
  signal_id: string;
  source_type: ExternalSignalSourceTypeV1;
  source_name: string;
  generated_at: string;
  observed_repo_head: string | null;
  observed_dirty_tree_status: "CLEAN" | "DIRTY" | "UNKNOWN";
  scope: Record<string, unknown>;
  findings: Array<{
    finding_id: string;
    summary: string;
    detail?: string;
    evidence_rel_paths?: string[];
    severity: ExternalSignalSeverityV1;
  }>;
  severity: ExternalSignalSeverityV1;
  expires_at: string | null;
  freshness_policy: {
    stale_after_ms: number;
    head_match_required: boolean;
    revalidation_command: string;
    escalation_after_expiry: "BLOCKING_STALE_CRITICAL" | "SILENT_ARCHIVE";
  };
  validation_status: ExternalSignalValidationStatusV1;
  promoted_to_learning_rule: boolean;
  blocks_command_center: boolean;
  blocks_mutation: boolean;
  owner_action_required: boolean;
  artifact_rel_path: string;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  truth_closure_authorized: false;
  stale_reason?: string;
};

export type SecurityHardeningExternalSignalsStatusV1 = {
  status: "CLEAR" | "ATTENTION" | "BLOCKING" | "UNKNOWN";
  open_security_signal_count: number;
  blocking_non_security_work: boolean;
  unresolved_without_repo_validation: number;
  signals: ExternalSignalSummaryV1[];
  ties_to_lane: "evidence_freshness_recovery_v1" | "guarded_apply_evidence_freshness_v1";
};

export type ExternalSignalSummaryV1 = {
  signal_id: string;
  source_type: string;
  source_name: string;
  severity: string;
  validation_status: string;
  summary: string;
  artifact_rel_path: string;
  generated_at: string;
  expires_at: string | null;
  blocks_mutation: boolean;
  blocks_command_center: boolean;
  owner_action_required: boolean;
  stale_reason?: string;
};

export type BuckpartsExternalSignalsRegistryV1 = {
  contract: typeof EXTERNAL_SIGNALS_REGISTRY_CONTRACT_V1;
  contract_version: 1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  current_repo_head: string;
  signals: BuckpartsExternalSignalV1[];
  indexes: {
    active_critical_signals: string[];
    stale_signals: string[];
    unvalidated_hyperagent_findings: string[];
    failing_github_actions: string[];
    open_sentry_production_issues: string[];
    signals_blocking_mutation: string[];
    signals_blocking_public_trust: string[];
    signals_needing_owner_action: string[];
    blocking_stale_critical: string[];
  };
  security_hardening_external_signals: SecurityHardeningExternalSignalsStatusV1;
  provenance: {
    discovery_roots: string[];
    signals_discovered: number;
    signals_loaded: number;
    signals_rejected: number;
  };
};

export type BuildExternalSignalsRegistryDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
  readDir?: (abs: string) => string[];
};

function gitShortHead(rootDir: string): string {
  const r = spawnSync("git", ["rev-parse", "--short=12", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  return r.status === 0 ? r.stdout.trim() : "UNKNOWN";
}

function hashPrefix(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 8);
}

function toPosixRel(rootDir: string, abs: string): string {
  return path.relative(rootDir, abs).split(path.sep).join("/");
}

function walkFiles(dir: string, fileExists: (p: string) => boolean): string[] {
  if (!fileExists(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!fileExists(full)) continue;
    if (statSync(full).isDirectory()) {
      out.push(...walkFiles(full, fileExists));
    } else {
      out.push(full);
    }
  }
  return out;
}

function loadJsonRecord(abs: string, readText: (p: string) => string): Record<string, unknown> | null {
  try {
    return JSON.parse(readText(abs)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function summarizeSignal(signal: BuckpartsExternalSignalV1): ExternalSignalSummaryV1 {
  return {
    signal_id: signal.signal_id,
    source_type: signal.source_type,
    source_name: signal.source_name,
    severity: signal.severity,
    validation_status: signal.validation_status,
    summary: signal.findings[0]?.summary ?? signal.source_name,
    artifact_rel_path: signal.artifact_rel_path,
    generated_at: signal.generated_at,
    expires_at: signal.expires_at,
    blocks_mutation: signal.blocks_mutation,
    blocks_command_center: signal.blocks_command_center,
    owner_action_required: signal.owner_action_required,
    stale_reason: signal.stale_reason,
  };
}

function applyFreshnessRules(
  signal: BuckpartsExternalSignalV1,
  currentHead: string,
  nowMs: number,
): BuckpartsExternalSignalV1 {
  let validation_status = signal.validation_status;
  let stale_reason: string | undefined;
  const generatedMs = Date.parse(signal.generated_at);
  const ageMs = Number.isNaN(generatedMs) ? Number.POSITIVE_INFINITY : nowMs - generatedMs;

  if (
    signal.freshness_policy.head_match_required &&
    signal.observed_repo_head &&
    signal.observed_repo_head !== "UNKNOWN" &&
    currentHead !== "UNKNOWN" &&
    signal.observed_repo_head !== currentHead
  ) {
    validation_status = "STALE";
    stale_reason = "STALE_NEEDS_REVALIDATION:observed_repo_head_mismatch";
  } else if (ageMs > signal.freshness_policy.stale_after_ms) {
    validation_status = "STALE";
    stale_reason = stale_reason ?? "STALE_NEEDS_REVALIDATION:stale_after_ms_exceeded";
  }
  if (signal.expires_at) {
    const expMs = Date.parse(signal.expires_at);
    if (!Number.isNaN(expMs) && nowMs > expMs) {
      validation_status = "STALE";
      stale_reason = stale_reason ?? "STALE_NEEDS_REVALIDATION:expires_at_passed";
    }
  }

  const blocks_mutation =
    validation_status === "REPO_VALIDATED" ? signal.blocks_mutation : false;

  return {
    ...signal,
    validation_status,
    stale_reason,
    blocks_mutation,
    blocks_command_center:
      validation_status === "STALE" && signal.severity === "CRITICAL"
        ? true
        : signal.blocks_command_center,
  };
}

function signalFromWrongCodePrevention(args: {
  rootDir: string;
  currentHead: string;
  nowMs: number;
  readText: (abs: string) => string;
}): BuckpartsExternalSignalV1 | null {
  const loaded = loadWrongCodePreventionArtifactV1({
    rootDir: args.rootDir,
    now: () => new Date(args.nowMs),
  });
  if (loaded.status !== "loaded") return null;
  const artifact = loaded.artifact;
  const rel = WRONG_CODE_PREVENTION_ARTIFACT_REL_V1;
  const signal_id = `hyperagent_audit:wrong_code_prevention:${hashPrefix(rel)}`;
  const severity: ExternalSignalSeverityV1 =
    artifact.overall_status === "FAIL"
      ? "CRITICAL"
      : artifact.overall_status === "WARN"
        ? "HIGH"
        : "MEDIUM";

  const base: BuckpartsExternalSignalV1 = {
    contract: "buckparts_external_signal_v1",
    signal_id,
    source_type: "hyperagent_audit",
    source_name: "wrong_code_prevention",
    generated_at: artifact.generated_at,
    observed_repo_head: artifact.git_head_hint,
    observed_dirty_tree_status: "UNKNOWN",
    scope: { security_domain: null, wedge: "multi" },
    findings: [
      {
        finding_id: "wrong_code_prevention_overall",
        summary: `overall_status=${artifact.overall_status}; blockers=${artifact.blockers.length}`,
        severity,
        evidence_rel_paths: [rel],
      },
    ],
    severity,
    expires_at: new Date(args.nowMs + 7 * 24 * 60 * 60 * 1000).toISOString(),
    freshness_policy: {
      stale_after_ms: 24 * 60 * 60 * 1000,
      head_match_required: true,
      revalidation_command: "npm run buckparts:external-signals-registry",
      escalation_after_expiry: "BLOCKING_STALE_CRITICAL",
    },
    validation_status: "CANDIDATE",
    promoted_to_learning_rule: false,
    blocks_command_center: severity === "CRITICAL" || severity === "HIGH",
    blocks_mutation: false,
    owner_action_required: artifact.blockers.length > 0,
    artifact_rel_path: rel,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    truth_closure_authorized: false,
  };
  return applyFreshnessRules(base, args.currentHead, args.nowMs);
}

function discoverCursorValidationSignals(args: {
  rootDir: string;
  currentHead: string;
  nowMs: number;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): BuckpartsExternalSignalV1[] {
  const draftsDir = path.join(args.rootDir, "data/fridge/batch-production/drafts");
  const files = walkFiles(draftsDir, args.fileExists).filter((f) =>
    f.endsWith("-cursor-validation-v1.json"),
  );
  const signals: BuckpartsExternalSignalV1[] = [];
  for (const abs of files) {
    const rel = toPosixRel(args.rootDir, abs);
    const record = loadJsonRecord(abs, args.readText);
    if (!record || record.contract !== "buckparts_cursor_validation_packet_v1") continue;
    const generated_at =
      typeof record.validated_at === "string" ? record.validated_at : new Date(args.nowMs).toISOString();
    const validationStatus = String(record.validation_status ?? "UNKNOWN");
    const severity: ExternalSignalSeverityV1 =
      validationStatus.includes("FAIL") ? "HIGH" : "MEDIUM";
    const signal_id = `cursor_implementation:${path.basename(rel, ".json")}:${hashPrefix(rel)}`;
    const base: BuckpartsExternalSignalV1 = {
      contract: "buckparts_external_signal_v1",
      signal_id,
      source_type: "cursor_implementation",
      source_name: path.basename(rel, ".json"),
      generated_at,
      observed_repo_head: null,
      observed_dirty_tree_status: "UNKNOWN",
      scope: {
        wedge: "refrigerator_water",
        validation_scope: record.validation_scope ?? null,
      },
      findings: [
        {
          finding_id: "cursor_validation_status",
          summary: `validation_status=${validationStatus}`,
          severity,
          evidence_rel_paths: [rel],
        },
      ],
      severity,
      expires_at: new Date(args.nowMs + 14 * 24 * 60 * 60 * 1000).toISOString(),
      freshness_policy: {
        stale_after_ms: 48 * 60 * 60 * 1000,
        head_match_required: true,
        revalidation_command: "npm run buckparts:external-signals-registry",
        escalation_after_expiry: "BLOCKING_STALE_CRITICAL",
      },
      validation_status: "CANDIDATE",
      promoted_to_learning_rule: false,
      blocks_command_center: false,
      blocks_mutation: false,
      owner_action_required: validationStatus !== "VALIDATION_PASS",
      artifact_rel_path: rel,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      truth_closure_authorized: false,
    };
    signals.push(applyFreshnessRules(base, args.currentHead, args.nowMs));
  }
  return signals;
}

function discoverOwnerBrowserProofSignals(args: {
  rootDir: string;
  currentHead: string;
  nowMs: number;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): BuckpartsExternalSignalV1[] {
  const draftsDir = path.join(args.rootDir, "data/fridge/batch-production/drafts");
  const files = walkFiles(draftsDir, args.fileExists).filter((f) =>
    /session-.*-owner-browser-proof-intake-v1\.json$/i.test(f),
  );
  const signals: BuckpartsExternalSignalV1[] = [];
  for (const abs of files) {
    const rel = toPosixRel(args.rootDir, abs);
    const record = loadJsonRecord(abs, args.readText);
    if (!record) continue;
    const generated_at =
      typeof record.generated_at === "string"
        ? record.generated_at
        : new Date(args.nowMs).toISOString();
    const signal_id = `owner_browser_proof:${path.basename(rel, ".json")}:${hashPrefix(rel)}`;
    const base: BuckpartsExternalSignalV1 = {
      contract: "buckparts_external_signal_v1",
      signal_id,
      source_type: "owner_browser_proof",
      source_name: path.basename(rel, ".json"),
      generated_at,
      observed_repo_head: null,
      observed_dirty_tree_status: "UNKNOWN",
      scope: { wedge: "refrigerator_water" },
      findings: [
        {
          finding_id: "owner_browser_proof_intake",
          summary: "Owner browser proof intake packet on disk (candidate only)",
          severity: "INFO",
          evidence_rel_paths: [rel],
        },
      ],
      severity: "INFO",
      expires_at: null,
      freshness_policy: {
        stale_after_ms: 45 * 24 * 60 * 60 * 1000,
        head_match_required: false,
        revalidation_command: "npm run buckparts:external-signals-registry",
        escalation_after_expiry: "BLOCKING_STALE_CRITICAL",
      },
      validation_status: "CANDIDATE",
      promoted_to_learning_rule: false,
      blocks_command_center: false,
      blocks_mutation: false,
      owner_action_required: true,
      artifact_rel_path: rel,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      truth_closure_authorized: false,
    };
    signals.push(applyFreshnessRules(base, args.currentHead, args.nowMs));
  }
  return signals;
}

function githubWorkflowStubSignals(args: {
  rootDir: string;
  currentHead: string;
  nowMs: number;
  qualityLane: ReturnType<typeof buildExternalQualitySignalUsefulnessLaneV1>;
}): BuckpartsExternalSignalV1[] {
  return args.qualityLane.github_workflow_basenames.map((basename) => {
    const rel = `.github/workflows/${basename}`;
    const signal_id = `github_actions:${basename.replace(/\.(yml|yaml)$/, "")}:NOT_PROVEN`;
    const base: BuckpartsExternalSignalV1 = {
      contract: "buckparts_external_signal_v1",
      signal_id,
      source_type: "github_actions",
      source_name: basename.replace(/\.(yml|yaml)$/, ""),
      generated_at: new Date(args.nowMs).toISOString(),
      observed_repo_head: null,
      observed_dirty_tree_status: "UNKNOWN",
      scope: { workflow: rel, environment: "github_actions" },
      findings: [
        {
          finding_id: "live_status_not_ingested",
          summary:
            "Workflow file PROVEN on disk; PASS/FAIL/UNKNOWN without committed ingest artifact (NOT_PROVEN live ingest)",
          severity: "INFO",
        },
      ],
      severity: "INFO",
      expires_at: null,
      freshness_policy: {
        stale_after_ms: 12 * 60 * 60 * 1000,
        head_match_required: true,
        revalidation_command: "npm run buckparts:external-signals-registry",
        escalation_after_expiry: "BLOCKING_STALE_CRITICAL",
      },
      validation_status: "CANDIDATE",
      promoted_to_learning_rule: false,
      blocks_command_center: false,
      blocks_mutation: false,
      owner_action_required: false,
      artifact_rel_path: rel,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      truth_closure_authorized: false,
    };
    return applyFreshnessRules(base, args.currentHead, args.nowMs);
  });
}

function sentryRuntimeStubSignal(args: {
  rootDir: string;
  currentHead: string;
  nowMs: number;
  qualityLane: ReturnType<typeof buildExternalQualitySignalUsefulnessLaneV1>;
}): BuckpartsExternalSignalV1 | null {
  if (args.qualityLane.sentry_config_present !== "PROVEN") return null;
  const rel = "sentry.server.config.ts";
  const base: BuckpartsExternalSignalV1 = {
    contract: "buckparts_external_signal_v1",
    signal_id: `sentry_runtime:production_errors:${hashPrefix(rel)}`,
    source_type: "sentry_runtime",
    source_name: "production_errors",
    generated_at: new Date(args.nowMs).toISOString(),
    observed_repo_head: null,
    observed_dirty_tree_status: "UNKNOWN",
    scope: { environment: "production" },
    findings: [
      {
        finding_id: "sentry_sdk_wired_not_ingested",
        summary:
          args.qualityLane.sentry_errors_feed_command_center === "NOT_PROVEN"
            ? "Sentry SDK PROVEN on disk; open production issues NOT_PROVEN (no ingest artifact)"
            : "Sentry SDK configured; live incident feed status UNKNOWN",
        severity: "INFO",
      },
    ],
    severity: "INFO",
    expires_at: null,
    freshness_policy: {
      stale_after_ms: 60 * 60 * 1000,
      head_match_required: false,
      revalidation_command: "npm run buckparts:external-signals-registry",
      escalation_after_expiry: "BLOCKING_STALE_CRITICAL",
    },
    validation_status: "CANDIDATE",
    promoted_to_learning_rule: false,
    blocks_command_center: false,
    blocks_mutation: false,
    owner_action_required: false,
    artifact_rel_path: rel,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    truth_closure_authorized: false,
  };
  return applyFreshnessRules(base, args.currentHead, args.nowMs);
}

function buildIndexes(signals: BuckpartsExternalSignalV1[]): BuckpartsExternalSignalsRegistryV1["indexes"] {
  const active_critical_signals: string[] = [];
  const stale_signals: string[] = [];
  const unvalidated_hyperagent_findings: string[] = [];
  const failing_github_actions: string[] = [];
  const open_sentry_production_issues: string[] = [];
  const signals_blocking_mutation: string[] = [];
  const signals_blocking_public_trust: string[] = [];
  const signals_needing_owner_action: string[] = [];
  const blocking_stale_critical: string[] = [];

  for (const s of signals) {
    if (s.severity === "CRITICAL" && s.validation_status !== "REJECTED" && s.validation_status !== "SUPERSEDED") {
      active_critical_signals.push(s.signal_id);
    }
    if (s.validation_status === "STALE") stale_signals.push(s.signal_id);
    if (s.source_type === "hyperagent_audit" && s.validation_status === "CANDIDATE") {
      unvalidated_hyperagent_findings.push(s.signal_id);
    }
    if (s.source_type === "github_actions") {
      failing_github_actions.push(s.signal_id);
    }
    if (s.source_type === "sentry_runtime") {
      open_sentry_production_issues.push(s.signal_id);
    }
    if (s.blocks_mutation) signals_blocking_mutation.push(s.signal_id);
    if (s.owner_action_required) signals_needing_owner_action.push(s.signal_id);
    if (
      s.validation_status === "STALE" &&
      s.severity === "CRITICAL" &&
      s.freshness_policy.escalation_after_expiry === "BLOCKING_STALE_CRITICAL"
    ) {
      blocking_stale_critical.push(s.signal_id);
    }
  }

  return {
    active_critical_signals,
    stale_signals,
    unvalidated_hyperagent_findings,
    failing_github_actions,
    open_sentry_production_issues,
    signals_blocking_mutation,
    signals_blocking_public_trust,
    signals_needing_owner_action,
    blocking_stale_critical,
  };
}

function buildSecurityHardeningSlice(
  signals: BuckpartsExternalSignalV1[],
): SecurityHardeningExternalSignalsStatusV1 {
  const securitySignals = signals.filter(
    (s) =>
      s.scope.security_domain != null ||
      s.findings.some((f) => f.finding_id.includes("security")),
  );
  const unresolved = signals.filter(
    (s) => s.validation_status !== "REPO_VALIDATED" && s.validation_status !== "REJECTED",
  ).length;
  const open_security_signal_count = securitySignals.length;
  let status: SecurityHardeningExternalSignalsStatusV1["status"] = "CLEAR";
  if (open_security_signal_count > 0) status = "ATTENTION";
  if (signals.some((s) => s.blocks_mutation && s.validation_status === "REPO_VALIDATED")) {
    status = "BLOCKING";
  }
  return {
    status,
    open_security_signal_count,
    blocking_non_security_work: false,
    unresolved_without_repo_validation: unresolved,
    signals: securitySignals.map(summarizeSignal),
    ties_to_lane: "evidence_freshness_recovery_v1",
  };
}

export function buildExternalSignalsRegistryV1(
  deps: BuildExternalSignalsRegistryDepsV1,
): BuckpartsExternalSignalsRegistryV1 {
  const now = deps.now ?? (() => new Date());
  const nowMs = now().getTime();
  const fileExists = deps.fileExists ?? ((abs: string) => existsSync(abs));
  const readText = deps.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));
  const current_repo_head = gitShortHead(deps.rootDir);

  const qualityLane = buildExternalQualitySignalUsefulnessLaneV1({
    rootDir: deps.rootDir,
    fileExists,
    readTextFile: readText,
  });

  const discovered: BuckpartsExternalSignalV1[] = [];
  let signals_rejected = 0;

  const wcp = signalFromWrongCodePrevention({
    rootDir: deps.rootDir,
    currentHead: current_repo_head,
    nowMs,
    readText,
  });
  if (wcp) discovered.push(wcp);
  else signals_rejected += 1;

  discovered.push(
    ...discoverCursorValidationSignals({
      rootDir: deps.rootDir,
      currentHead: current_repo_head,
      nowMs,
      fileExists,
      readText,
    }),
  );
  discovered.push(
    ...discoverOwnerBrowserProofSignals({
      rootDir: deps.rootDir,
      currentHead: current_repo_head,
      nowMs,
      fileExists,
      readText,
    }),
  );
  discovered.push(
    ...githubWorkflowStubSignals({
      rootDir: deps.rootDir,
      currentHead: current_repo_head,
      nowMs,
      qualityLane,
    }),
  );
  const sentrySignal = sentryRuntimeStubSignal({
    rootDir: deps.rootDir,
    currentHead: current_repo_head,
    nowMs,
    qualityLane,
  });
  if (sentrySignal) discovered.push(sentrySignal);

  const signals = discovered.sort((a, b) => a.signal_id.localeCompare(b.signal_id));

  return {
    contract: EXTERNAL_SIGNALS_REGISTRY_CONTRACT_V1,
    contract_version: 1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    current_repo_head,
    signals,
    indexes: buildIndexes(signals),
    security_hardening_external_signals: buildSecurityHardeningSlice(signals),
    provenance: {
      discovery_roots: [
        "data/command-center/audits/",
        "data/fridge/batch-production/drafts/*cursor-validation*.json",
        "data/fridge/batch-production/drafts/session-*-owner-browser-proof-intake-v1.json",
        ".github/workflows/",
        "sentry.server.config.ts",
      ],
      signals_discovered: signals.length + signals_rejected,
      signals_loaded: signals.length,
      signals_rejected,
    },
  };
}

export function summarizeExternalSignalsForCommandCenter(
  registry: BuckpartsExternalSignalsRegistryV1,
): ExternalSignalSummaryV1[] {
  return registry.signals.map(summarizeSignal);
}
