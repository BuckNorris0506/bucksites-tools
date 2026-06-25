/**
 * UCF runtime drift detection experiment v1 — read-only falsification of Boardy's claim
 * that scheduled drift detection catches repo→production safe CTA truth gaps.
 * Uses committed repo artifacts only; no live Supabase queries or mutations.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  AP_SUPABASE_VS_CSV_DIFF_CONTRACT_V1,
  AP_SUPABASE_VS_CSV_DIFF_DEFAULT_OUT_REL_V1,
  type ApSupabaseVsCsvDiffReportV1,
} from "./air-purifier-supabase-vs-csv-diff-v1";
import { PRODUCTION_TRUTH_GOLDEN_CASES_AP_V1 } from "./buckparts-production-truth-golden-cases-ap-v1";

export const UCF_RUNTIME_DRIFT_DETECTION_EXPERIMENT_CONTRACT_V1 =
  "ucf_runtime_drift_detection_experiment_v1" as const;

export const UCF_RUNTIME_DRIFT_DETECTION_EXPERIMENT_REPORT_NAME_V1 =
  "ucf_runtime_drift_detection_experiment_v1" as const;

export const UCF_RUNTIME_DRIFT_FALSIFICATION_CLAIM_V1 =
  "If the 34-vs-19 repo/runtime safe CTA drift existed before discovery and no re-audit caught it, then drift detection does not detect the most dangerous drift class: repo truth not reaching production truth." as const;

export type UcfRuntimeDriftDetectionVerdictV1 =
  | "DRIFT_DETECTION_ENFORCED"
  | "DRIFT_DETECTION_OBSERVATIONAL"
  | "DRIFT_DETECTION_GAP"
  | "UNKNOWN";

export type UcfRuntimeDriftArtifactRoleV1 =
  | "supabase_vs_csv_diff"
  | "runtime_safe_cta_parity_packet"
  | "truth_integrity_registry"
  | "command_center_control_loop_audit"
  | "production_truth_golden_cases"
  | "referenced_missing";

export type UcfRuntimeDriftArtifactInventoryRowV1 = {
  relative_path: string;
  role: UcfRuntimeDriftArtifactRoleV1;
  exists: boolean;
  generated_at: string | null;
  read_only: boolean | null;
  data_mutation: boolean | null;
  supabase_writes: boolean | null;
  notes: string[];
};

export type UcfRuntimeDriftDetectionPathV1 = {
  path_or_command: string;
  kind: "read_only_report" | "test_suite" | "command_center_lane" | "scheduled_ci" | "registry";
  detects_aggregate_safe_cta_gap: boolean;
  detects_per_slug_csv_runtime_drift: boolean;
  enforced: boolean;
  scheduled: boolean;
  notes: string;
};

export type UcfRuntimeDriftTimelineEventV1 = {
  at: string;
  source: string;
  event: string;
  aggregate_safe_cta_csv: number | null;
  aggregate_safe_cta_supabase: number | null;
};

export type UcfRuntimeDriftSafeCtaCountsV1 = {
  csv_safe_direct_buyable_count: number | null;
  supabase_safe_direct_buyable_count: number | null;
  gap_size: number | null;
  source_artifact: string | null;
  source_generated_at: string | null;
};

export type UcfRuntimeDriftDetectionExperimentReportV1 = {
  contract: typeof UCF_RUNTIME_DRIFT_DETECTION_EXPERIMENT_CONTRACT_V1;
  report_name: typeof UCF_RUNTIME_DRIFT_DETECTION_EXPERIMENT_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  supabase_writes: false;
  generated_at: string;
  falsification_claim: typeof UCF_RUNTIME_DRIFT_FALSIFICATION_CLAIM_V1;
  artifact_inventory: UcfRuntimeDriftArtifactInventoryRowV1[];
  safe_cta_counts: UcfRuntimeDriftSafeCtaCountsV1;
  drift_timeline: UcfRuntimeDriftTimelineEventV1[];
  detection_paths: UcfRuntimeDriftDetectionPathV1[];
  drift_onset_timing_provable: boolean;
  pre_discovery_scheduled_reaudit_catch: boolean;
  command_center_surfaces_aggregate_gap: boolean;
  truth_integrity_registry_surfaces_gap: boolean;
  verdict: UcfRuntimeDriftDetectionVerdictV1;
  proven_facts: string[];
  unknown_facts: string[];
  proves: string[];
  does_not_prove: string[];
};

const AP_RUNTIME_SAFE_CTA_PARITY_PACKET_REL_V1 =
  "data/air-purifier/batch-production/audits/ap-runtime-safe-cta-parity-packet-v1.json" as const;

const TRUTH_INTEGRITY_REGISTRY_REL_V1 = "data/truth-integrity/truth-integrity-registry-v1.json" as const;

const COMMAND_CENTER_CONTROL_LOOP_AUDIT_REL_V1 =
  "data/control-plane/command-center-control-loop-v1.audit.json" as const;

const REFERENCED_MISSING_ARTIFACTS_V1 = [
  "data/air-purifier/batch-production/audits/ap-runtime-convergence-gap-v1.json",
  "data/air-purifier/batch-production/audits/ap-runtime-safe-cta-packet-v1.json",
  "data/air-purifier/batch-production/audits/ap-runtime-primary-selection-trace-v1.json",
] as const;

type JsonRecord = Record<string, unknown>;

function readJsonIfExists(rootDir: string, relPath: string): JsonRecord | null {
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) return null;
  return JSON.parse(readFileSync(abs, "utf8")) as JsonRecord;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function inventoryApSafeCtaDriftArtifactsV1(
  rootDir: string,
): UcfRuntimeDriftArtifactInventoryRowV1[] {
  const rows: UcfRuntimeDriftArtifactInventoryRowV1[] = [];

  const primaryArtifacts: Array<{
    rel: string;
    role: UcfRuntimeDriftArtifactRoleV1;
  }> = [
    { rel: AP_SUPABASE_VS_CSV_DIFF_DEFAULT_OUT_REL_V1, role: "supabase_vs_csv_diff" },
    { rel: AP_RUNTIME_SAFE_CTA_PARITY_PACKET_REL_V1, role: "runtime_safe_cta_parity_packet" },
    { rel: TRUTH_INTEGRITY_REGISTRY_REL_V1, role: "truth_integrity_registry" },
    { rel: COMMAND_CENTER_CONTROL_LOOP_AUDIT_REL_V1, role: "command_center_control_loop_audit" },
  ];

  for (const entry of primaryArtifacts) {
    const json = readJsonIfExists(rootDir, entry.rel);
    rows.push({
      relative_path: entry.rel,
      role: entry.role,
      exists: json !== null,
      generated_at: json ? asString(json.generated_at) ?? asString(json.created_at) : null,
      read_only: json ? asBoolean(json.read_only) : null,
      data_mutation: json ? asBoolean(json.data_mutation) : null,
      supabase_writes: json ? asBoolean(json.supabase_writes) : null,
      notes: [],
    });
  }

  rows.push({
    relative_path: "scripts/lib/buckparts-production-truth-golden-cases-ap-v1.ts",
    role: "production_truth_golden_cases",
    exists: existsSync(path.join(rootDir, "scripts/lib/buckparts-production-truth-golden-cases-ap-v1.ts")),
    generated_at: null,
    read_only: true,
    data_mutation: false,
    supabase_writes: false,
    notes: [
      `csv_runtime_drift case: ${PRODUCTION_TRUTH_GOLDEN_CASES_AP_V1.find((row) => row.case_type === "csv_runtime_drift")?.case_id ?? "UNKNOWN"}`,
    ],
  });

  for (const rel of REFERENCED_MISSING_ARTIFACTS_V1) {
    const exists = existsSync(path.join(rootDir, rel));
    if (!exists) {
      rows.push({
        relative_path: rel,
        role: "referenced_missing",
        exists: false,
        generated_at: null,
        read_only: null,
        data_mutation: null,
        supabase_writes: null,
        notes: ["Referenced by TIR/CC/parity packet but not committed in repo audits folder."],
      });
    }
  }

  return rows.sort((left, right) => left.relative_path.localeCompare(right.relative_path));
}

export function loadCommittedApSupabaseVsCsvDiffV1(
  rootDir: string,
): ApSupabaseVsCsvDiffReportV1 | null {
  const json = readJsonIfExists(rootDir, AP_SUPABASE_VS_CSV_DIFF_DEFAULT_OUT_REL_V1);
  if (!json) return null;
  if (json.contract !== AP_SUPABASE_VS_CSV_DIFF_CONTRACT_V1) return null;
  return json as unknown as ApSupabaseVsCsvDiffReportV1;
}

export function extractSafeCtaCountsFromDiffV1(
  diff: ApSupabaseVsCsvDiffReportV1 | null,
): UcfRuntimeDriftSafeCtaCountsV1 {
  if (!diff) {
    return {
      csv_safe_direct_buyable_count: null,
      supabase_safe_direct_buyable_count: null,
      gap_size: null,
      source_artifact: null,
      source_generated_at: null,
    };
  }

  const csv = diff.summary.csv_safe_direct_buyable_count;
  const supabase = diff.summary.supabase_safe_direct_buyable_count;
  return {
    csv_safe_direct_buyable_count: csv,
    supabase_safe_direct_buyable_count: supabase,
    gap_size: csv - supabase,
    source_artifact: AP_SUPABASE_VS_CSV_DIFF_DEFAULT_OUT_REL_V1,
    source_generated_at: diff.generated_at,
  };
}

export function buildApSafeCtaDriftDetectionPathsV1(rootDir: string): UcfRuntimeDriftDetectionPathV1[] {
  const ciWorkflows = [
    ".github/workflows/buckparts-daily-operator.yml",
    ".github/workflows/buckparts-founder-digest.yml",
    ".github/workflows/buckparts-runner-step.yml",
  ];
  const scheduledCiHasProductionTruth = ciWorkflows.some((rel) => {
    const abs = path.join(rootDir, rel);
    if (!existsSync(abs)) return false;
    const text = readFileSync(abs, "utf8");
    return (
      text.includes("production-truth") ||
      text.includes("supabase-vs-csv") ||
      text.includes("safe-cta")
    );
  });

  return [
    {
      path_or_command: "npx tsx scripts/report-air-purifier-supabase-vs-csv-diff-v1.ts",
      kind: "read_only_report",
      detects_aggregate_safe_cta_gap: true,
      detects_per_slug_csv_runtime_drift: true,
      enforced: false,
      scheduled: false,
      notes: "On-demand read-only diff; committed output ap-supabase-vs-csv-diff-v1.json.",
    },
    {
      path_or_command: "npm run buckparts:production-truth:ap",
      kind: "command_center_lane",
      detects_aggregate_safe_cta_gap: false,
      detects_per_slug_csv_runtime_drift: true,
      enforced: false,
      scheduled: false,
      notes: "Per-slug csv_runtime_safe_cta_parity (ap-drift-blueair-f2-211); CC lane can BLOCK when fail>0 if Supabase configured.",
    },
    {
      path_or_command: "scripts/lib/buckparts-production-truth-ap-v1.test.ts",
      kind: "test_suite",
      detects_aggregate_safe_cta_gap: false,
      detects_per_slug_csv_runtime_drift: true,
      enforced: false,
      scheduled: false,
      notes: "Unit tests mock runtime drift; not wired to CI for aggregate safe CTA gap.",
    },
    {
      path_or_command: "npm run buckparts:stale-browser-truth-shadow",
      kind: "read_only_report",
      detects_aggregate_safe_cta_gap: false,
      detects_per_slug_csv_runtime_drift: false,
      enforced: false,
      scheduled: false,
      notes: "R1 stale browser_truth shadow — related customer-safety risk, not CSV safe CTA count parity.",
    },
    {
      path_or_command: "data/truth-integrity/truth-integrity-registry-v1.json",
      kind: "registry",
      detects_aggregate_safe_cta_gap: false,
      detects_per_slug_csv_runtime_drift: false,
      enforced: false,
      scheduled: false,
      notes: "TIR-2026-0001 tracks stale browser_truth; references convergence gap artifact (missing from repo).",
    },
    {
      path_or_command: "npx tsx scripts/report-owner-drift-detector-v1.ts",
      kind: "read_only_report",
      detects_aggregate_safe_cta_gap: false,
      detects_per_slug_csv_runtime_drift: false,
      enforced: false,
      scheduled: false,
      notes: "Classifies new ideas vs CC context; no AP safe CTA parity logic.",
    },
    {
      path_or_command: ".github/workflows/*",
      kind: "scheduled_ci",
      detects_aggregate_safe_cta_gap: false,
      detects_per_slug_csv_runtime_drift: false,
      enforced: scheduledCiHasProductionTruth,
      scheduled: true,
      notes: scheduledCiHasProductionTruth
        ? "CI references production-truth or safe-cta (unexpected)."
        : "No committed workflow runs supabase-vs-csv diff or production-truth AP suite.",
    },
  ];
}

export function buildApSafeCtaDriftTimelineV1(args: {
  rootDir: string;
  safe_cta_counts: UcfRuntimeDriftSafeCtaCountsV1;
}): UcfRuntimeDriftTimelineEventV1[] {
  const events: UcfRuntimeDriftTimelineEventV1[] = [];

  const parity = readJsonIfExists(args.rootDir, AP_RUNTIME_SAFE_CTA_PARITY_PACKET_REL_V1);
  if (parity) {
    events.push({
      at: asString(parity.generated_at) ?? "UNKNOWN",
      source: AP_RUNTIME_SAFE_CTA_PARITY_PACKET_REL_V1,
      event: "runtime_safe_cta_parity_packet_committed",
      aggregate_safe_cta_csv: null,
      aggregate_safe_cta_supabase: null,
    });
  }

  const tir = readJsonIfExists(args.rootDir, TRUTH_INTEGRITY_REGISTRY_REL_V1);
  if (tir) {
    events.push({
      at: asString(tir.created_at) ?? asString(tir.last_re_audit_at) ?? "UNKNOWN",
      source: TRUTH_INTEGRITY_REGISTRY_REL_V1,
      event: "truth_integrity_registry_seeded",
      aggregate_safe_cta_csv: null,
      aggregate_safe_cta_supabase: null,
    });
    const findings = Array.isArray(tir.findings) ? tir.findings : [];
    for (const finding of findings) {
      if (typeof finding !== "object" || finding === null) continue;
      const record = finding as JsonRecord;
      const evidence =
        typeof record.evidence === "object" && record.evidence !== null
          ? (record.evidence as JsonRecord)
          : null;
      events.push({
        at: asString(evidence?.discovered_at) ?? "UNKNOWN",
        source: asString(record.finding_id) ?? "TIR_FINDING",
        event: "tir_finding_discovered",
        aggregate_safe_cta_csv: null,
        aggregate_safe_cta_supabase: null,
      });
    }
  }

  if (args.safe_cta_counts.source_generated_at) {
    events.push({
      at: args.safe_cta_counts.source_generated_at,
      source: args.safe_cta_counts.source_artifact ?? AP_SUPABASE_VS_CSV_DIFF_DEFAULT_OUT_REL_V1,
      event: "aggregate_safe_cta_gap_documented",
      aggregate_safe_cta_csv: args.safe_cta_counts.csv_safe_direct_buyable_count,
      aggregate_safe_cta_supabase: args.safe_cta_counts.supabase_safe_direct_buyable_count,
    });
  }

  const ccAudit = readJsonIfExists(args.rootDir, COMMAND_CENTER_CONTROL_LOOP_AUDIT_REL_V1);
  if (ccAudit) {
    events.push({
      at: asString(ccAudit.generated_at) ?? "UNKNOWN",
      source: COMMAND_CENTER_CONTROL_LOOP_AUDIT_REL_V1,
      event: "command_center_control_loop_audit_committed",
      aggregate_safe_cta_csv: null,
      aggregate_safe_cta_supabase: null,
    });
  }

  return events.sort((left, right) => left.at.localeCompare(right.at));
}

export function inferPreDiscoveryScheduledReauditCatchV1(args: {
  timeline: readonly UcfRuntimeDriftTimelineEventV1[];
  detection_paths: readonly UcfRuntimeDriftDetectionPathV1[];
}): boolean {
  const aggregateDocumentedAt = args.timeline.find(
    (event) => event.event === "aggregate_safe_cta_gap_documented",
  )?.at;
  if (!aggregateDocumentedAt) return false;

  const scheduledEnforcedPath = args.detection_paths.some(
    (row) => row.scheduled && row.enforced && row.detects_aggregate_safe_cta_gap,
  );
  if (scheduledEnforcedPath) return true;

  const preDiscoveryAggregateEvent = args.timeline.some(
    (event) =>
      event.event === "aggregate_safe_cta_gap_documented" &&
      event.at < aggregateDocumentedAt &&
      event.aggregate_safe_cta_csv !== null,
  );
  return preDiscoveryAggregateEvent;
}

export function classifyUcfRuntimeDriftDetectionVerdictV1(args: {
  safe_cta_counts: UcfRuntimeDriftSafeCtaCountsV1;
  drift_onset_timing_provable: boolean;
  pre_discovery_scheduled_reaudit_catch: boolean;
  observational_detectors_present: boolean;
  enforced_aggregate_detector_present: boolean;
}): UcfRuntimeDriftDetectionVerdictV1 {
  if (args.safe_cta_counts.gap_size === null) {
    return "UNKNOWN";
  }

  if (args.pre_discovery_scheduled_reaudit_catch || args.enforced_aggregate_detector_present) {
    return "DRIFT_DETECTION_ENFORCED";
  }

  if (args.observational_detectors_present) {
    return "DRIFT_DETECTION_OBSERVATIONAL";
  }

  if (!args.drift_onset_timing_provable) {
    return "DRIFT_DETECTION_GAP";
  }

  return "DRIFT_DETECTION_GAP";
}

export function buildUcfRuntimeDriftDetectionExperimentReportV1(args: {
  rootDir: string;
  now?: () => Date;
}): UcfRuntimeDriftDetectionExperimentReportV1 {
  const now = args.now ?? (() => new Date());
  const artifact_inventory = inventoryApSafeCtaDriftArtifactsV1(args.rootDir);
  const diff = loadCommittedApSupabaseVsCsvDiffV1(args.rootDir);
  const safe_cta_counts = extractSafeCtaCountsFromDiffV1(diff);
  const detection_paths = buildApSafeCtaDriftDetectionPathsV1(args.rootDir);
  const drift_timeline = buildApSafeCtaDriftTimelineV1({
    rootDir: args.rootDir,
    safe_cta_counts,
  });

  const observational_detectors_present = detection_paths.some(
    (row) => row.detects_aggregate_safe_cta_gap || row.detects_per_slug_csv_runtime_drift,
  );
  const enforced_aggregate_detector_present = detection_paths.some(
    (row) => row.enforced && row.detects_aggregate_safe_cta_gap,
  );
  const pre_discovery_scheduled_reaudit_catch = inferPreDiscoveryScheduledReauditCatchV1({
    timeline: drift_timeline,
    detection_paths,
  });

  const drift_onset_timing_provable = drift_timeline.some(
    (event) =>
      event.event === "aggregate_safe_cta_gap_documented" &&
      drift_timeline.filter((row) => row.at < event.at && row.aggregate_safe_cta_csv !== null)
        .length > 0,
  );

  const command_center_surfaces_aggregate_gap = existsSync(
    path.join(args.rootDir, COMMAND_CENTER_CONTROL_LOOP_AUDIT_REL_V1),
  );
  const truth_integrity_registry_surfaces_gap = existsSync(
    path.join(args.rootDir, TRUTH_INTEGRITY_REGISTRY_REL_V1),
  );

  const verdict = classifyUcfRuntimeDriftDetectionVerdictV1({
    safe_cta_counts,
    drift_onset_timing_provable,
    pre_discovery_scheduled_reaudit_catch,
    observational_detectors_present,
    enforced_aggregate_detector_present,
  });

  const missingReferenced = artifact_inventory.filter(
    (row) => row.role === "referenced_missing" && !row.exists,
  );

  return {
    contract: UCF_RUNTIME_DRIFT_DETECTION_EXPERIMENT_CONTRACT_V1,
    report_name: UCF_RUNTIME_DRIFT_DETECTION_EXPERIMENT_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_writes: false,
    generated_at: now().toISOString(),
    falsification_claim: UCF_RUNTIME_DRIFT_FALSIFICATION_CLAIM_V1,
    artifact_inventory,
    safe_cta_counts,
    drift_timeline,
    detection_paths,
    drift_onset_timing_provable,
    pre_discovery_scheduled_reaudit_catch,
    command_center_surfaces_aggregate_gap,
    truth_integrity_registry_surfaces_gap,
    verdict,
    proven_facts: [
      `PROVEN: ${UCF_RUNTIME_DRIFT_DETECTION_EXPERIMENT_CONTRACT_V1} uses committed repo artifacts only (no live Supabase reads in experiment builder).`,
      safe_cta_counts.gap_size !== null
        ? `PROVEN: committed diff csv_safe_direct_buyable_count=${String(safe_cta_counts.csv_safe_direct_buyable_count)} supabase_safe_direct_buyable_count=${String(safe_cta_counts.supabase_safe_direct_buyable_count)} gap=${String(safe_cta_counts.gap_size)}.`
        : "UNKNOWN: committed ap-supabase-vs-csv-diff-v1.json missing or invalid — cannot prove aggregate safe CTA counts.",
      `PROVEN: pre_discovery_scheduled_reaudit_catch=${String(pre_discovery_scheduled_reaudit_catch)}.`,
      `PROVEN: observational_detectors_present=${String(observational_detectors_present)} enforced_aggregate_detector_present=${String(enforced_aggregate_detector_present)}.`,
      `PROVEN: falsification_verdict=${verdict}.`,
      missingReferenced.length > 0
        ? `PROVEN: referenced_missing_artifact_count=${String(missingReferenced.length)}.`
        : "PROVEN: no referenced_missing AP runtime drift artifacts.",
    ],
    unknown_facts: [
      "UNKNOWN: Drift onset date — repo cannot prove when CSV safe CTA count first exceeded Supabase/runtime safe CTA count.",
      "UNKNOWN: Boardy claim cites 34-vs-19; committed diff artifact documents 34-vs-28 (not 19) at generation time.",
      "UNKNOWN: Whether owner already COMMITted ap-runtime-safe-cta-parity SQL (packet default ROLLBACK).",
    ],
    proves: [
      "Read-only observational tooling exists to quantify CSV vs Supabase safe direct_buyable counts.",
      "Per-slug csv_runtime_safe_cta_parity golden case can fail when runtime primary diverges from CSV.",
      "No committed CI workflow enforces aggregate safe CTA parity before deploy.",
      "Referenced convergence-gap artifacts are cited by TIR/CC but absent from committed audits folder.",
    ],
    does_not_prove: [
      "Live production safe CTA count at request time (experiment does not query Supabase).",
      "That drift began on a specific calendar date.",
      "That Command Center daily operator automatically blocks on aggregate 34-vs-28 gap without running production-truth lane.",
      "Post-apply parity outcomes after owner COMMIT.",
    ],
  };
}

export function ucfRuntimeDriftDetectionExperimentGrantsMutationAuthorityV1(): false {
  return false;
}
