/**
 * Read-only Command Center lane: GitHub / Sentry decision usefulness audit (repo filesystem only).
 *
 * Does not call GitHub API, Sentry API, or the public web.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const EXTERNAL_QUALITY_SIGNAL_USEFULNESS_CONTRACT_V1 =
  "external_quality_signal_usefulness_v1" as const;
export const EXTERNAL_QUALITY_SIGNAL_USEFULNESS_CC_JQ_PATH_V1 =
  ".command_center_v2.external_quality_signal_usefulness_v1" as const;

export type QualitySignalStatusV1 = "PROVEN" | "NOT_PROVEN" | "UNKNOWN";

export type ExternalQualitySignalUsefulnessLaneV1 = {
  contract: typeof EXTERNAL_QUALITY_SIGNAL_USEFULNESS_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof EXTERNAL_QUALITY_SIGNAL_USEFULNESS_CC_JQ_PATH_V1;
  usefulness_standard: string;
  github_workflow_basenames: string[];
  github_workflows_present: QualitySignalStatusV1;
  github_checks_block_bad_changes: QualitySignalStatusV1;
  sentry_config_present: QualitySignalStatusV1;
  sentry_errors_feed_command_center: QualitySignalStatusV1;
  sentry_changes_prioritization: QualitySignalStatusV1;
  external_quality_signals_affect_decisions: QualitySignalStatusV1;
  netlify_api_authorized: false;
  deploy_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  csv_apply_authorized: false;
  buckparts_verified_link_authorized: false;
  proven_facts: string[];
  not_proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

export type BuildExternalQualitySignalUsefulnessDepsV1 = {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readDir?: (abs: string) => string[];
  readTextFile?: (abs: string) => string;
};

function readIncludes(text: string, needle: string): boolean {
  return text.includes(needle);
}

export function buildExternalQualitySignalUsefulnessLaneV1(
  deps: BuildExternalQualitySignalUsefulnessDepsV1,
): ExternalQualitySignalUsefulnessLaneV1 {
  const fileExists = deps.fileExists ?? ((abs: string) => existsSync(abs));
  const readDir = deps.readDir ?? ((abs: string) => readdirSync(abs));
  const readTextFile = deps.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));

  const workflowsDir = path.join(deps.rootDir, ".github/workflows");
  const github_workflow_basenames = fileExists(workflowsDir)
    ? readDir(workflowsDir).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml")).sort()
    : [];

  const github_workflows_present: QualitySignalStatusV1 =
    github_workflow_basenames.length > 0 ? "PROVEN" : "NOT_PROVEN";

  let github_checks_block_bad_changes: QualitySignalStatusV1 = "NOT_PROVEN";
  if (github_workflow_basenames.length > 0) {
    const hasPullRequestTrigger = github_workflow_basenames.some((basename) => {
      const abs = path.join(workflowsDir, basename);
      if (!fileExists(abs)) return false;
      try {
        const text = readTextFile(abs);
        return readIncludes(text, "pull_request") || readIncludes(text, "push:");
      } catch {
        return false;
      }
    });
    github_checks_block_bad_changes = hasPullRequestTrigger ? "UNKNOWN" : "NOT_PROVEN";
  }

  const sentryServer = path.join(deps.rootDir, "sentry.server.config.ts");
  const errorMonitoring = path.join(deps.rootDir, "src/lib/monitoring/error-monitoring.ts");
  const nextConfig = path.join(deps.rootDir, "next.config.mjs");
  const instrumentation = path.join(deps.rootDir, "src/instrumentation.ts");

  const sentryFilesPresent =
    fileExists(sentryServer) &&
    fileExists(errorMonitoring) &&
    (fileExists(nextConfig)
      ? readTextFile(nextConfig).includes("@sentry/nextjs")
      : false);

  const sentry_config_present: QualitySignalStatusV1 = sentryFilesPresent ? "PROVEN" : "NOT_PROVEN";

  const brainManifest = path.join(deps.rootDir, "scripts/lib/buckparts-brain-coverage-manifest-v1.ts");
  let sentry_errors_feed_command_center: QualitySignalStatusV1 = "NOT_PROVEN";
  if (fileExists(brainManifest)) {
    try {
      const text = readTextFile(brainManifest);
      if (text.includes("sentry_error_monitoring") && text.includes("cc_json_path: null")) {
        sentry_errors_feed_command_center = "NOT_PROVEN";
      }
    } catch {
      sentry_errors_feed_command_center = "UNKNOWN";
    }
  }

  const sentry_changes_prioritization: QualitySignalStatusV1 = "NOT_PROVEN";
  const external_quality_signals_affect_decisions: QualitySignalStatusV1 = "NOT_PROVEN";

  const proven_facts: string[] = [];
  if (github_workflows_present === "PROVEN") {
    proven_facts.push(
      `PROVEN: ${String(github_workflow_basenames.length)} GitHub workflow file(s) on disk: ${github_workflow_basenames.join(", ")}.`,
    );
  }
  if (sentry_config_present === "PROVEN") {
    proven_facts.push(
      "PROVEN: Sentry SDK wired via sentry.server.config.ts, error-monitoring.ts, and next.config.mjs withSentryConfig.",
    );
  }
  if (fileExists(instrumentation)) {
    proven_facts.push("PROVEN: src/instrumentation.ts present for runtime hooks.");
  }

  const not_proven_facts = [
    "NOT_PROVEN: GitHub workflow PASS/FAIL is not ingested into Command Center JSON (brain manifest github_actions_live_status cc_json_path null).",
    "NOT_PROVEN: Sentry error counts/incidents do not feed Command Center lanes or next_best_action.",
    "NOT_PROVEN: GitHub checks do not block merges on PR — workflows are schedule/workflow_dispatch oriented.",
    "NOT_PROVEN: external quality signals change prioritization or block deploys today.",
  ];

  const unknown_facts = [
    "UNKNOWN: live Sentry DSN configured in production (env not inspected by this lane).",
    "UNKNOWN: last GitHub Actions run outcome (no GitHub API).",
  ];

  return {
    contract: EXTERNAL_QUALITY_SIGNAL_USEFULNESS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: EXTERNAL_QUALITY_SIGNAL_USEFULNESS_CC_JQ_PATH_V1,
    usefulness_standard:
      "A tool is useful only if it blocks bad changes, surfaces real defects, or changes prioritization.",
    github_workflow_basenames,
    github_workflows_present,
    github_checks_block_bad_changes,
    sentry_config_present,
    sentry_errors_feed_command_center,
    sentry_changes_prioritization,
    external_quality_signals_affect_decisions,
    netlify_api_authorized: false,
    deploy_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    csv_apply_authorized: false,
    buckparts_verified_link_authorized: false,
    proven_facts,
    not_proven_facts,
    unknown_facts,
    recommended_next_action:
      "Treat GitHub/Sentry as decoration until wired: either ingest PASS/FAIL + Sentry defect summaries into Command Center, or stop expecting them to steer next_best_action.",
  };
}
