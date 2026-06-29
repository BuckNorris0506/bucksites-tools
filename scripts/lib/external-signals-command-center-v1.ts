/**
 * Command Center v2 lane: external_signals_v1 (read-only registry projection).
 */

import {
  buildExternalSignalsRegistryV1,
  EXTERNAL_SIGNALS_REGISTRY_REL_V1,
  summarizeExternalSignalsForCommandCenter,
  type BuckpartsExternalSignalsRegistryV1,
  type ExternalSignalSummaryV1,
} from "./external-signals-registry-v1";

export const EXTERNAL_SIGNALS_CC_LANE_CONTRACT_V1 = "external_signals_v1" as const;

export const EXTERNAL_SIGNALS_CC_JQ_PATH_V1 =
  ".command_center_v2.external_signals_v1" as const;

export type ExternalSignalsCommandCenterLaneV1 = {
  contract: typeof EXTERNAL_SIGNALS_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  deploy_authorized: false;
  recommended_jq_path: typeof EXTERNAL_SIGNALS_CC_JQ_PATH_V1;
  registry_rel_path: typeof EXTERNAL_SIGNALS_REGISTRY_REL_V1;
  registry_load_status: "loaded" | "missing" | "stale" | "invalid_contract";
  generated_at: string;
  current_repo_head: string | "UNKNOWN";
  signal_counts: {
    total: number;
    by_source_type: Record<string, number>;
    by_validation_status: Record<string, number>;
    by_severity: Record<string, number>;
  };
  active_critical_signals: ExternalSignalSummaryV1[];
  stale_signals: ExternalSignalSummaryV1[];
  unvalidated_hyperagent_findings: ExternalSignalSummaryV1[];
  failing_github_actions: ExternalSignalSummaryV1[];
  open_sentry_production_issues: ExternalSignalSummaryV1[];
  signals_blocking_mutation: ExternalSignalSummaryV1[];
  signals_blocking_public_trust: ExternalSignalSummaryV1[];
  signals_needing_owner_action: ExternalSignalSummaryV1[];
  blocking_stale_critical: ExternalSignalSummaryV1[];
  security_hardening_external_signals: BuckpartsExternalSignalsRegistryV1["security_hardening_external_signals"];
  recommended_next_action: string;
  proven_facts: string[];
  not_proven_facts: string[];
  unknown_facts: string[];
  github_actions_live_ingest: "PROVEN" | "NOT_PROVEN" | "UNKNOWN";
  sentry_live_ingest: "PROVEN" | "NOT_PROVEN" | "UNKNOWN";
};

function countBy<T extends string>(items: T[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    out[item] = (out[item] ?? 0) + 1;
  }
  return out;
}

function pickSummaries(
  registry: BuckpartsExternalSignalsRegistryV1,
  ids: string[],
): ExternalSignalSummaryV1[] {
  const byId = new Map(registry.signals.map((s) => [s.signal_id, s]));
  return ids
    .map((id) => byId.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => ({
      signal_id: s.signal_id,
      source_type: s.source_type,
      source_name: s.source_name,
      severity: s.severity,
      validation_status: s.validation_status,
      summary: s.findings[0]?.summary ?? s.source_name,
      artifact_rel_path: s.artifact_rel_path,
      generated_at: s.generated_at,
      expires_at: s.expires_at,
      blocks_mutation: s.blocks_mutation,
      blocks_command_center: s.blocks_command_center,
      owner_action_required: s.owner_action_required,
      stale_reason: s.stale_reason,
    }));
}

export function buildExternalSignalsCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
  registry?: BuckpartsExternalSignalsRegistryV1;
}): ExternalSignalsCommandCenterLaneV1 {
  const now = args.now ?? (() => new Date());
  const registry =
    args.registry ??
    buildExternalSignalsRegistryV1({ rootDir: args.rootDir, now });

  const summaries = summarizeExternalSignalsForCommandCenter(registry);
  const staleCount = registry.indexes.stale_signals.length;
  const registry_load_status: ExternalSignalsCommandCenterLaneV1["registry_load_status"] =
    registry.signals.length === 0
      ? "missing"
      : staleCount > registry.signals.length / 2
        ? "stale"
        : "loaded";

  const signal_counts = {
    total: registry.signals.length,
    by_source_type: countBy(registry.signals.map((s) => s.source_type)),
    by_validation_status: countBy(registry.signals.map((s) => s.validation_status)),
    by_severity: countBy(registry.signals.map((s) => s.severity)),
  };

  const github_actions_live_ingest: ExternalSignalsCommandCenterLaneV1["github_actions_live_ingest"] =
    "NOT_PROVEN";
  const sentry_live_ingest: ExternalSignalsCommandCenterLaneV1["sentry_live_ingest"] =
    registry.signals.some((s) => s.source_type === "sentry_runtime")
      ? "NOT_PROVEN"
      : "UNKNOWN";

  return {
    contract: EXTERNAL_SIGNALS_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    deploy_authorized: false,
    recommended_jq_path: EXTERNAL_SIGNALS_CC_JQ_PATH_V1,
    registry_rel_path: EXTERNAL_SIGNALS_REGISTRY_REL_V1,
    registry_load_status,
    generated_at: registry.generated_at,
    current_repo_head: registry.current_repo_head,
    signal_counts,
    active_critical_signals: pickSummaries(registry, registry.indexes.active_critical_signals),
    stale_signals: pickSummaries(registry, registry.indexes.stale_signals),
    unvalidated_hyperagent_findings: pickSummaries(
      registry,
      registry.indexes.unvalidated_hyperagent_findings,
    ),
    failing_github_actions: pickSummaries(registry, registry.indexes.failing_github_actions),
    open_sentry_production_issues: pickSummaries(
      registry,
      registry.indexes.open_sentry_production_issues,
    ),
    signals_blocking_mutation: pickSummaries(
      registry,
      registry.indexes.signals_blocking_mutation,
    ),
    signals_blocking_public_trust: pickSummaries(
      registry,
      registry.indexes.signals_blocking_public_trust,
    ),
    signals_needing_owner_action: pickSummaries(
      registry,
      registry.indexes.signals_needing_owner_action,
    ),
    blocking_stale_critical: pickSummaries(registry, registry.indexes.blocking_stale_critical),
    security_hardening_external_signals: registry.security_hardening_external_signals,
    recommended_next_action:
      staleCount > 0
        ? "Revalidate STALE external signals (STALE_NEEDS_REVALIDATION) before treating HyperAgent/Cursor findings as current."
        : "Review CANDIDATE external signals; none authorize mutation until REPO_VALIDATED with cited artifacts.",
    proven_facts: [
      `PROVEN: external signals registry built from committed repo artifacts (${registry.provenance.signals_loaded} loaded).`,
      "PROVEN: all external signals have mutation_authorized=false and truth_closure_authorized=false.",
      `PROVEN: GitHub workflow files on disk indexed as candidate stubs (${signal_counts.by_source_type.github_actions ?? 0}).`,
    ],
    not_proven_facts: [
      "NOT_PROVEN: GitHub Actions PASS/FAIL live ingest — workflow stubs only unless ingest JSON committed under data/command-center/external-signals/ingest/github-actions/.",
      "NOT_PROVEN: Sentry open production issues ingest — SDK presence only unless ingest JSON committed under data/command-center/external-signals/ingest/sentry/.",
      "NOT_PROVEN: Cursor chat summaries without committed validation JSON.",
      "NOT_PROVEN: HyperAgent DISCOVERY_COMPLETE or audit PASS closes issue lifecycle without repo evidence gates.",
    ],
    unknown_facts: [
      "UNKNOWN: production Sentry DSN env (not inspected by registry builder).",
      "UNKNOWN: last GitHub Actions run conclusion without GitHub API or committed workflow_run artifact.",
    ],
    github_actions_live_ingest,
    sentry_live_ingest,
  };
}
