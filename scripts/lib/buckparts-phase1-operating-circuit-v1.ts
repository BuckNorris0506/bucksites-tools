/**
 * Phase 1 operating-circuit lane for Command Center.
 * Surfaces Ship Guard, canonical Credit Control, dispatch history,
 * repository provenance, and GSC/GA4 freshness blockers — read-only.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { resolveArtifactProvenanceV1 } from "./buckparts-artifact-provenance-v1";
import {
  buildBuckpartsCreditControlCenterV1,
  type BuckpartsCreditControlCenterReportV1,
} from "./buckparts-credit-control-center-v1";
import {
  buildBuckpartsShipGuardReportV1,
  type ShipGuardReportV1,
} from "./buckparts-ship-guard-v1";
import {
  COMMAND_CENTER_DISPATCH_RUN_REPORT_NAME_V1,
  COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1,
  type BuckpartsCommandCenterDispatchRunV1,
} from "./buckparts-command-center-dispatch-runner-v1";
import {
  EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1,
  freshnessStatusFromTimestampV1,
  type ExternalMeasurementFreshnessV1,
} from "../../src/lib/owner-dashboard/external-measurement-freshness-v1";

export const BUCKPARTS_PHASE1_OPERATING_CIRCUIT_CONTRACT_V1 =
  "buckparts_phase1_operating_circuit_v1" as const;

export type DispatchHistoryFreshnessV1 = "FRESH" | "STALE" | "UNKNOWN" | "MISSING";

export type CommandCenterDispatchHistoryV1 = {
  contract: "buckparts_command_center_dispatch_history_v1";
  read_only: true;
  data_mutation: false;
  dispatch_runs_dir_rel: typeof COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1;
  artifact_count: number;
  latest_run_id: string | null;
  latest_generated_at: string | null;
  latest_execution_status: string | null;
  latest_selected_subsystem: string | null;
  latest_source_commit: string | null;
  refusal_count: number;
  latest_refusal_reason: string | null;
  freshness_status: DispatchHistoryFreshnessV1;
  age_days: number | null;
  blockers: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type CommandCenterRepositoryProvenanceV1 = {
  contract: "buckparts_command_center_repository_provenance_v1";
  read_only: true;
  data_mutation: false;
  head_commit: string | "UNKNOWN";
  base_commit: string | "UNKNOWN";
  source_commit: string | null;
  worktree_clean: boolean | null;
  provenance_status: "BOUND_TO_SOURCE_COMMIT" | "DIRTY_WORKTREE" | "UNKNOWN";
  proven_facts: string[];
};

export type MeasurementChannelFreshnessBlockerV1 = {
  channel: "gsc" | "ga4";
  artifact_present: boolean;
  observed_or_generated_at: string | "UNKNOWN";
  age_days: number | null;
  freshness_status: "FRESH" | "STALE" | "UNKNOWN";
  blocker: string | null;
};

export type GscGa4FreshnessBlockersV1 = {
  contract: "buckparts_gsc_ga4_freshness_blockers_v1";
  read_only: true;
  data_mutation: false;
  stale_threshold_days: typeof EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1;
  gsc: MeasurementChannelFreshnessBlockerV1;
  ga4: MeasurementChannelFreshnessBlockerV1;
  blockers: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type Phase1OperatingCircuitV1 = {
  contract: typeof BUCKPARTS_PHASE1_OPERATING_CIRCUIT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  ship_guard_enforcement_v1: {
    contract: "buckparts_ship_guard_enforcement_summary_v1";
    mode: "enforce";
    push_assessment: ShipGuardReportV1["push_assessment"];
    enforcement_status: "PASS" | "BLOCKED" | "UNKNOWN";
    blockers: string[];
    credit_control_deploy_held: boolean;
    production_deploy_recommended: false;
    deploy_authorized: false;
    recursive_preflight_invocation: false;
    proven_facts: string[];
  };
  credit_control_canonical_v1: Pick<
    BuckpartsCreditControlCenterReportV1,
    | "contract"
    | "deployment_posture"
    | "deploy_held"
    | "production_deploy_recommended"
    | "push_allowed"
    | "credit_spend_authorized"
    | "netlify_api_call_authorized"
    | "credit_evidence_present"
    | "credit_evidence_freshness"
    | "credit_evidence_age_days"
    | "work_class"
    | "proven_facts"
  > & {
    source: "buckparts_credit_control_center_v1";
    credits_available_equals_deploy_authorization: false;
  };
  dispatch_history_v1: CommandCenterDispatchHistoryV1;
  repository_provenance_v1: CommandCenterRepositoryProvenanceV1;
  gsc_ga4_freshness_blockers_v1: GscGa4FreshnessBlockersV1;
};

function ageDaysFromIso(iso: string | null | undefined, now: Date): number | null {
  if (!iso || !String(iso).trim()) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  return (now.getTime() - t.getTime()) / (24 * 60 * 60 * 1000);
}

export function buildCommandCenterDispatchHistoryV1(args: {
  rootDir: string;
  now?: () => Date;
  dispatchRunsDirRel?: string;
  readDir?: (abs: string) => string[];
  readText?: (abs: string) => string;
  exists?: (abs: string) => boolean;
}): CommandCenterDispatchHistoryV1 {
  const now = args.now ?? (() => new Date());
  const rel = args.dispatchRunsDirRel ?? COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1;
  const absDir = path.join(args.rootDir, rel);
  const exists = args.exists ?? ((p) => existsSync(p));
  const readDir = args.readDir ?? ((p) => readdirSync(p));
  const readText = args.readText ?? ((p) => readFileSync(p, "utf8"));
  const blockers: string[] = [];
  const unknown_facts: string[] = [];
  const proven_facts: string[] = [];

  if (!exists(absDir)) {
    return {
      contract: "buckparts_command_center_dispatch_history_v1",
      read_only: true,
      data_mutation: false,
      dispatch_runs_dir_rel: COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1,
      artifact_count: 0,
      latest_run_id: null,
      latest_generated_at: null,
      latest_execution_status: null,
      latest_selected_subsystem: null,
      latest_source_commit: null,
      refusal_count: 0,
      latest_refusal_reason: null,
      freshness_status: "MISSING",
      age_days: null,
      blockers: [`dispatch_runs_dir_missing:${rel}`],
      proven_facts: [`PROVEN: dispatch_runs_dir missing at ${rel}.`],
      unknown_facts: ["UNKNOWN: no dispatch-run artifacts to score."],
    };
  }

  let names: string[] = [];
  try {
    names = readDir(absDir).filter((n) => n.endsWith(".json")).sort();
  } catch (err) {
    blockers.push(`dispatch_runs_dir_unreadable:${err instanceof Error ? err.message : String(err)}`);
  }

  const parsed: Array<{ name: string; run: BuckpartsCommandCenterDispatchRunV1 }> = [];
  let malformed = 0;
  for (const name of names) {
    try {
      const raw = JSON.parse(readText(path.join(absDir, name))) as BuckpartsCommandCenterDispatchRunV1;
      if (raw.report_name !== COMMAND_CENTER_DISPATCH_RUN_REPORT_NAME_V1) {
        malformed += 1;
        continue;
      }
      parsed.push({ name, run: raw });
    } catch {
      malformed += 1;
    }
  }
  if (malformed > 0) {
    blockers.push(`dispatch_run_malformed_count:${String(malformed)}`);
    unknown_facts.push(`UNKNOWN: ${String(malformed)} dispatch-run JSON file(s) failed parse/contract.`);
  }

  parsed.sort((a, b) => String(a.run.generated_at).localeCompare(String(b.run.generated_at)));
  const latest = parsed.length > 0 ? parsed[parsed.length - 1]! : null;
  const refusals = parsed.filter((p) => p.run.execution_status === "REFUSED");
  const latestRefusal = [...refusals].reverse()[0] ?? null;
  const age_days = latest ? ageDaysFromIso(latest.run.generated_at, now()) : null;
  let freshness_status: DispatchHistoryFreshnessV1 = "MISSING";
  if (!latest) {
    freshness_status = names.length === 0 ? "MISSING" : "UNKNOWN";
    if (names.length === 0) blockers.push("dispatch_history_empty");
  } else if (age_days == null) {
    freshness_status = "UNKNOWN";
    blockers.push("dispatch_latest_generated_at_invalid");
  } else if (age_days < 0) {
    // Future-dated receipts must never score as FRESH (negative age is not "recent").
    freshness_status = "UNKNOWN";
    blockers.push("dispatch_timestamp_in_future");
  } else if (age_days > EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1) {
    freshness_status = "STALE";
  } else {
    freshness_status = "FRESH";
  }

  proven_facts.push(
    `PROVEN: artifact_count=${String(parsed.length)}; refusal_count=${String(refusals.length)}; freshness_status=${freshness_status}.`,
  );
  if (latest) {
    proven_facts.push(
      `PROVEN: latest_run_id=${latest.name}; latest_execution_status=${latest.run.execution_status}; latest_selected_subsystem=${latest.run.selected_subsystem}.`,
    );
  }

  return {
    contract: "buckparts_command_center_dispatch_history_v1",
    read_only: true,
    data_mutation: false,
    dispatch_runs_dir_rel: COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1,
    artifact_count: parsed.length,
    latest_run_id: latest?.name ?? null,
    latest_generated_at: latest?.run.generated_at ?? null,
    latest_execution_status: latest?.run.execution_status ?? null,
    latest_selected_subsystem: latest?.run.selected_subsystem ?? null,
    latest_source_commit:
      latest?.run.source_commit === "UNKNOWN" ? "UNKNOWN" : (latest?.run.source_commit ?? null),
    refusal_count: refusals.length,
    latest_refusal_reason: latestRefusal?.run.blocked_reasons?.[0] ?? null,
    freshness_status,
    age_days,
    blockers,
    proven_facts,
    unknown_facts,
  };
}

export function buildCommandCenterRepositoryProvenanceV1(args: {
  rootDir: string;
}): CommandCenterRepositoryProvenanceV1 {
  const p = resolveArtifactProvenanceV1({ rootDir: args.rootDir });
  return {
    contract: "buckparts_command_center_repository_provenance_v1",
    read_only: true,
    data_mutation: false,
    head_commit: p.base_commit,
    base_commit: p.base_commit,
    source_commit: p.source_commit,
    worktree_clean: p.worktree_clean,
    provenance_status: p.provenance_status,
    proven_facts: [
      `PROVEN: provenance_status=${p.provenance_status}; worktree_clean=${String(p.worktree_clean)}; source_commit=${p.source_commit === null ? "null" : p.source_commit}.`,
    ],
  };
}

function channelBlocker(args: {
  channel: "gsc" | "ga4";
  artifactPresent: boolean;
  timestamp: string | "UNKNOWN";
  now: Date;
}): MeasurementChannelFreshnessBlockerV1 {
  const age_days = args.timestamp === "UNKNOWN" ? null : ageDaysFromIso(args.timestamp, args.now);
  let freshness_status: "FRESH" | "STALE" | "UNKNOWN" = "UNKNOWN";
  if (!args.artifactPresent) {
    freshness_status = "UNKNOWN";
  } else {
    const recency = freshnessStatusFromTimestampV1(args.timestamp, args.now);
    freshness_status = recency === "OK" ? "FRESH" : recency === "STALE" ? "STALE" : "UNKNOWN";
  }
  let blocker: string | null = null;
  if (!args.artifactPresent) {
    blocker = `${args.channel}_artifact_missing`;
  } else if (freshness_status === "STALE") {
    blocker = `${args.channel}_artifact_stale_gt_${String(EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1)}d`;
  } else if (freshness_status === "UNKNOWN") {
    blocker = `${args.channel}_artifact_freshness_unknown`;
  }
  return {
    channel: args.channel,
    artifact_present: args.artifactPresent,
    observed_or_generated_at: args.timestamp,
    age_days,
    freshness_status,
    blocker,
  };
}

export function buildGscGa4FreshnessBlockersV1(args: {
  freshness: ExternalMeasurementFreshnessV1;
  now?: () => Date;
}): GscGa4FreshnessBlockersV1 {
  const now = (args.now ?? (() => new Date()))();
  const gscPresent =
    args.freshness.gsc.artifact_source !== "NONE" &&
    args.freshness.gsc.fetched_at_or_export_date !== "UNKNOWN";
  const ga4Present =
    args.freshness.ga4.artifact_source !== "NONE" && args.freshness.ga4.fetched_at !== "UNKNOWN";
  // Prefer explicit presence from source; if source says LOCAL/SUPABASE but timestamp unknown, still "present but unknown".
  const gscArtifactPresent = args.freshness.gsc.artifact_source !== "NONE";
  const ga4ArtifactPresent = args.freshness.ga4.artifact_source !== "NONE";

  const gsc = channelBlocker({
    channel: "gsc",
    artifactPresent: gscArtifactPresent,
    timestamp: args.freshness.gsc.fetched_at_or_export_date,
    now,
  });
  const ga4 = channelBlocker({
    channel: "ga4",
    artifactPresent: ga4ArtifactPresent,
    timestamp: args.freshness.ga4.fetched_at,
    now,
  });
  const blockers = [gsc.blocker, ga4.blocker].filter((b): b is string => Boolean(b));
  void gscPresent;
  void ga4Present;
  return {
    contract: "buckparts_gsc_ga4_freshness_blockers_v1",
    read_only: true,
    data_mutation: false,
    stale_threshold_days: EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1,
    gsc,
    ga4,
    blockers,
    proven_facts: [
      `PROVEN: gsc freshness=${gsc.freshness_status}; ga4 freshness=${ga4.freshness_status}; threshold_days=${String(EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1)}.`,
      "PROVEN: no GSC/GA4 values invented; blockers derive from existing external_measurement_freshness_v1 fields only.",
    ],
    unknown_facts:
      blockers.length > 0
        ? ["UNKNOWN: production decisions that require fresh GSC/GA4 must wait for artifact refresh."]
        : [],
  };
}

export function buildPhase1OperatingCircuitV1(args: {
  rootDir: string;
  externalMeasurementFreshness: ExternalMeasurementFreshnessV1;
  now?: () => Date;
  shipGuardReport?: ShipGuardReportV1;
  creditControlReport?: BuckpartsCreditControlCenterReportV1;
}): Phase1OperatingCircuitV1 {
  const now = args.now ?? (() => new Date());
  const ship =
    args.shipGuardReport ??
    buildBuckpartsShipGuardReportV1({
      rootDir: args.rootDir,
      mode: "enforce",
      runValidations: false,
    });
  const credit =
    args.creditControlReport ??
    buildBuckpartsCreditControlCenterV1({ rootDir: args.rootDir, now });

  const enforcement_status: "PASS" | "BLOCKED" | "UNKNOWN" =
    ship.push_assessment === "SAFE"
      ? "PASS"
      : ship.push_assessment === "BLOCKED"
        ? "BLOCKED"
        : "UNKNOWN";

  return {
    contract: BUCKPARTS_PHASE1_OPERATING_CIRCUIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    ship_guard_enforcement_v1: {
      contract: "buckparts_ship_guard_enforcement_summary_v1",
      mode: "enforce",
      push_assessment: ship.push_assessment,
      enforcement_status,
      blockers: ship.blockers,
      credit_control_deploy_held: ship.credit_control.deploy_held,
      production_deploy_recommended: false,
      deploy_authorized: false,
      recursive_preflight_invocation: false,
      proven_facts: [
        "PROVEN: ship guard enforce mode is read-only; does not invoke deploy:preflight, credit-control CLI, or Netlify API.",
        `PROVEN: enforcement_status=${enforcement_status}; push_assessment=${ship.push_assessment}.`,
      ],
    },
    credit_control_canonical_v1: {
      source: "buckparts_credit_control_center_v1",
      contract: credit.contract,
      deployment_posture: credit.deployment_posture,
      deploy_held: credit.deploy_held,
      production_deploy_recommended: credit.production_deploy_recommended,
      push_allowed: credit.push_allowed,
      credit_spend_authorized: false,
      netlify_api_call_authorized: false,
      credit_evidence_present: credit.credit_evidence_present,
      credit_evidence_freshness: credit.credit_evidence_freshness,
      credit_evidence_age_days: credit.credit_evidence_age_days,
      work_class: credit.work_class,
      credits_available_equals_deploy_authorization: false,
      proven_facts: credit.proven_facts.slice(0, 6),
    },
    dispatch_history_v1: buildCommandCenterDispatchHistoryV1({ rootDir: args.rootDir, now }),
    repository_provenance_v1: buildCommandCenterRepositoryProvenanceV1({ rootDir: args.rootDir }),
    gsc_ga4_freshness_blockers_v1: buildGscGa4FreshnessBlockersV1({
      freshness: args.externalMeasurementFreshness,
      now,
    }),
  };
}
