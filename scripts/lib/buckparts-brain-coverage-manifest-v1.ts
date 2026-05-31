/**
 * Read-only map of BuckParts operating systems vs Command Center JSON ownership.
 * PROVEN: no Supabase, retailer_links, or evidence writes.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type {
  BrainCoverageManifestEntryV1,
  BrainCoverageVerdictCountsV1,
  BrainCoverageVerdictV1,
  CommandCenterBrainCoverageManifestV1,
} from "./buckparts-command-center-v2-types";

export type BuildBrainCoverageManifestArgs = {
  rootDir: string;
  now: () => Date;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
};

type EntrySeed = Omit<BrainCoverageManifestEntryV1, "system_id"> & { system_id: string };

const VERDICTS: BrainCoverageVerdictV1[] = [
  "CONNECTED",
  "PARTIAL",
  "BYPASSING",
  "DUPLICATE",
  "DEPRECATED",
  "MISSING",
];

function entry(
  seed: EntrySeed,
): BrainCoverageManifestEntryV1 {
  return {
    system_id: seed.system_id,
    npm_script_or_path: seed.npm_script_or_path,
    cc_json_path: seed.cc_json_path,
    dashboard_only: seed.dashboard_only,
    verdict: seed.verdict,
    blocks_lane_work: seed.blocks_lane_work,
    validation_command: seed.validation_command,
    reason: seed.reason,
  };
}

/** Curated systems beyond package.json script enumeration. */
const CURATED_ENTRIES: EntrySeed[] = [
  {
    system_id: "buckparts_command_center",
    npm_script_or_path: "npm run buckparts:command-center → scripts/report-buckparts-command-center.ts",
    cc_json_path: "report_name=buckparts_command_center_v1; command_center_v2",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command: "npm run buckparts:command-center",
    reason: "Primary Command Center JSON builder; aggregates v1 summaries, command_center_v2 lanes, and owner_command_center_neurons.",
  },
  {
    system_id: "owner_command_center_neurons",
    npm_script_or_path: "src/lib/owner-dashboard/owner-command-center-neurons-v1.ts",
    cc_json_path: "owner_command_center_neurons",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.owner_command_center_neurons.data_mutation'",
    reason: "Eight neurons built during Command Center report generation (not dashboard-only).",
  },
  {
    system_id: "owner_quarantined_fridge_models",
    npm_script_or_path: "src/lib/owner-dashboard/owner-quarantined-fridge-models-v1.ts",
    cc_json_path: "command_center_v2.owner_quarantined_fridge_models_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.owner_quarantined_fridge_models_v1.data_mutation'",
    reason: "Quarantined fridge model summary built during Command Center report generation (read-only).",
  },
  {
    system_id: "owner_vertical_launch_policy",
    npm_script_or_path: "src/lib/owner-dashboard/owner-vertical-launch-policy-v1.ts",
    cc_json_path: "command_center_v2.owner_vertical_launch_policy_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.owner_vertical_launch_policy_v1.data_mutation'",
    reason: "Vertical launch policy built during Command Center report generation (read-only).",
  },
  {
    system_id: "owner_integrity_sentinel",
    npm_script_or_path: "src/lib/owner-dashboard/owner-integrity-sentinel-v1.ts",
    cc_json_path: "command_center_v2.owner_integrity_sentinel_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.owner_integrity_sentinel_v1.data_mutation'",
    reason: "Truth-quality sentinel built during Command Center report generation (read-only).",
  },
  {
    system_id: "owner_gsc_external_demand",
    npm_script_or_path: "src/lib/owner-dashboard/load-command-center-report.ts",
    cc_json_path: null,
    dashboard_only: true,
    verdict: "DUPLICATE",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.owner_command_center_neurons.neurons[] | select(.neuron_key==\"gsc_search_discovery\")'",
    reason: "Dashboard re-builds GSC demand neuron; CC already exposes gsc_search_discovery neuron and external_measurement_freshness_v1.",
  },
  {
    system_id: "owner_search_demand_and_gaps",
    npm_script_or_path: "src/lib/owner-dashboard/load-command-center-report.ts",
    cc_json_path: null,
    dashboard_only: true,
    verdict: "DUPLICATE",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.owner_command_center_neurons.neurons[] | select(.neuron_key==\"search_demand_and_gaps\")'",
    reason: "Dashboard attachment duplicates search_and_click_intelligence_summary and search_demand_and_gaps neuron.",
  },
  {
    system_id: "hq_handoff_doc",
    npm_script_or_path: "docs/BuckParts-HQ-HANDOFF.md",
    cc_json_path: null,
    dashboard_only: false,
    verdict: "DEPRECATED",
    blocks_lane_work: false,
    validation_command: "test -f docs/BuckParts-HQ-HANDOFF.md",
    reason: "Migration/context handoff only; operating truth must come from Command Center JSON.",
  },
  {
    system_id: "sentry_error_monitoring",
    npm_script_or_path: "sentry.server.config.ts; src/lib/monitoring/error-monitoring.ts",
    cc_json_path: null,
    dashboard_only: false,
    verdict: "MISSING",
    blocks_lane_work: false,
    validation_command: "test -f sentry.server.config.ts",
    reason: "Runtime errors go to Sentry; no CC lane aggregates incident or stuck-agent state.",
  },
  {
    system_id: "github_actions_live_status",
    npm_script_or_path: ".github/workflows/buckparts-daily-operator.yml; .github/workflows/buckparts-founder-digest.yml; .github/workflows/buckparts-runner-step.yml",
    cc_json_path: null,
    dashboard_only: false,
    verdict: "MISSING",
    blocks_lane_work: false,
    validation_command: "ls .github/workflows",
    reason: "Workflow files exist in repo; last-run pass/fail status is not ingested into Command Center JSON.",
  },
];

/** Per npm script overrides (package.json keys starting with buckparts:). */
const NPM_SCRIPT_OVERRIDES: Record<string, Partial<EntrySeed>> = {
  "buckparts:command-center": {
    system_id: "buckparts_command_center",
    cc_json_path: "report_name=buckparts_command_center_v1; command_center_v2.deploy_publish_queue_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.deploy_publish_queue_v1.netlify_api_call_authorized'",
    reason:
      "Canonical Command Center JSON stdout; includes read-only deploy_publish_queue_v1 Netlify API budget gate (never executes Netlify).",
  },
  "buckparts:command-surface": {
    cc_json_path: "ingested via buildBuckpartsCommandCenterReport → coverage_health, v1 summaries",
    verdict: "PARTIAL",
    validation_command: "npm run buckparts:command-surface",
    reason: "Consumed during CC build; also runnable as standalone CLI JSON.",
  },
  "buckparts:affiliate-tracker": {
    cc_json_path: "affiliate_readiness_summary; command_center_v2.affiliate_readiness",
    verdict: "CONNECTED",
    validation_command: "npm run buckparts:affiliate-tracker",
    reason: "Tracker JSON ingested once per CC build.",
  },
  "buckparts:blocked-link-queue": {
    cc_json_path: "blocked_link_summary",
    verdict: "CONNECTED",
    validation_command: "npm run buckparts:blocked-link-queue",
    reason: "Blocked link rollup is a v1 CC field.",
  },
  "buckparts:amazon-first-blocked-queue": {
    cc_json_path: "amazon_first_blocked_queue_summary; command_center_v2.amazon_rescue",
    verdict: "PARTIAL",
    validation_command: "npm run buckparts:amazon-first-blocked-queue",
    reason: "Ingested by CC build and available as standalone queue JSON (drift risk).",
  },
  "buckparts:frigidaire-dead-oem-link-ids": {
    cc_json_path: "recent_learning_outcomes.frigidaire_dead_oem_outcome",
    verdict: "CONNECTED",
    validation_command: "npm run buckparts:frigidaire-dead-oem-link-ids",
    reason: "Frigidaire dead OEM outcome embedded in CC v1.",
  },
  "buckparts:frigidaire-next-candidates": {
    cc_json_path: "top_money_queue",
    verdict: "PARTIAL",
    validation_command: "npm run buckparts:frigidaire-next-candidates",
    reason: "Feeds top_money_queue lane inside CC.",
  },
  "buckparts:oem-next-money-cohort": {
    cc_json_path: "top_money_queue",
    verdict: "PARTIAL",
    validation_command: "npm run buckparts:oem-next-money-cohort",
    reason: "Feeds top_money_queue lane inside CC.",
  },
  "buckparts:gsc:fetch": {
    cc_json_path: "command_center_v2.external_measurement_freshness_v1.gsc",
    verdict: "PARTIAL",
    validation_command: "npm run buckparts:gsc:fetch",
    reason: "Writes artifact only; CC reads artifact via external_measurement_freshness_v1 (no live fetch in CC).",
  },
  "buckparts:ga4:fetch": {
    cc_json_path: "command_center_v2.external_measurement_freshness_v1.ga4",
    verdict: "PARTIAL",
    validation_command: "npm run buckparts:ga4:fetch",
    reason: "Writes artifact only; CC reads artifact via external_measurement_freshness_v1.",
  },
  "buckparts:live-site-smoke:check": {
    cc_json_path: "command_center_v2.deploy_live_site_monitor_v1.inspect_summary",
    verdict: "CONNECTED",
    validation_command: "npm run buckparts:live",
    reason: "Read-only check feeds deploy_live_site_monitor_v1 lane (inline on CLI when artifact missing).",
  },
  "buckparts:daily": {
    cc_json_path: "command_center_v2.daily_operator_summary_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.daily_operator_summary_v1.data_mutation'",
    reason:
      "Daily operator decision summary projected into Command Center JSON during report generation (read-only); full buckparts_daily_operator_v1 remains on npm run buckparts:daily.",
  },
  "buckparts:demand-work-queue": {
    cc_json_path: "command_center_v2.demand_work_queue_summary_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.demand_work_queue_summary_v1.data_mutation'",
    reason:
      "Demand work queue summary projected into Command Center JSON during report generation (read-only); full buckparts_demand_work_queue_v1 remains on npm run buckparts:demand-work-queue.",
  },
  "buckparts:large-batch-coverage-factory": {
    cc_json_path: "command_center_v2.large_batch_coverage_factory_summary_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.large_batch_coverage_factory_summary_v1.data_mutation'",
    reason:
      "Large Batch Coverage Factory summary projected into Command Center JSON during report generation (read-only); full buckparts_large_batch_coverage_factory_v1 remains on npm run buckparts:large-batch-coverage-factory.",
  },
  "buckparts:fridge-buyer-path-owner-review-bridge": {
    cc_json_path: "command_center_v2.fridge_buyer_path_owner_review_bridge_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.fridge_buyer_path_owner_review_bridge_v1.data_mutation'",
    reason:
      "Fridge buyer-path owner-review bridge projected into Command Center JSON during report generation (read-only); full fridge_buyer_path_owner_review_bridge_v1 remains on npm run buckparts:fridge-buyer-path-owner-review-bridge.",
  },
  "buckparts:fridge-buyer-path-owner-review-packet": {
    cc_json_path: "command_center_v2.fridge_buyer_path_owner_review_packet_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.fridge_buyer_path_owner_review_packet_v1.data_mutation'",
    reason:
      "Fridge buyer-path owner review packet projected into Command Center JSON during report generation (read-only); full fridge_buyer_path_owner_review_packet_v1 with normalized committed_live_row rows remains on npm run buckparts:fridge-buyer-path-owner-review-packet.",
  },
  "buckparts:fridge-buyer-path-batch-proposal": {
    cc_json_path: "command_center_v2.fridge_buyer_path_batch_proposal_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.fridge_buyer_path_batch_proposal_v1.data_mutation'",
    reason:
      "Fridge buyer-path batch proposal projected into Command Center JSON during report generation (read-only); full fridge_buyer_path_batch_proposal_v1 with proposed_rows remains on npm run buckparts:fridge-buyer-path-batch-proposal.",
  },
  "buckparts:owner-drift-detector": {
    cc_json_path: "command_center_v2.owner_drift_detector_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.owner_drift_detector_v1.data_mutation'",
    reason:
      "Owner drift detector projected into Command Center JSON during report generation (read-only); classify arbitrary ideas via npm run buckparts:owner-drift-detector -- --idea \"...\".",
  },
  "buckparts:audit": {
    cc_json_path: "command_center_v2.system_contract_audit_summary_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.system_contract_audit_summary_v1.data_mutation'",
    reason:
      "System contract audit summary projected into Command Center JSON during report generation (read-only); full buckparts_system_contract_audit_v1 remains on npm run buckparts:audit.",
  },
  "buckparts:founder-digest": {
    cc_json_path: null,
    verdict: "BYPASSING",
    validation_command: "npm run buckparts:founder-digest",
    reason:
      "Markdown downstream digest; intentionally standalone. Reformats Command Center JSON plus optional CI/artifact inputs for founder copy/paste; not Command Center operating truth.",
  },
  "buckparts:next-execution-packet": {
    cc_json_path: "command_center_v2.next_execution_packet_summary_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.next_execution_packet_summary_v1.data_mutation'",
    reason:
      "Next execution packet summary projected into Command Center JSON during report generation (read-only); full snapshot remains on npm run buckparts:next-execution-packet.",
  },
  "buckparts:operating-map": {
    cc_json_path: "command_center_v2.operating_map_summary_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.operating_map_summary_v1.data_mutation'",
    reason:
      "Operating map summary projected into Command Center JSON during report generation (read-only); full buckparts_operating_map_v1 remains on npm run buckparts:operating-map.",
  },
  "buckparts:precheck:amazon-refrigerator-tokens": {
    cc_json_path: null,
    verdict: "BYPASSING",
    validation_command: "npm run buckparts:precheck:amazon-refrigerator-tokens -- --tokens GSWF",
    reason:
      "On-demand Amazon refrigerator insert-safety precheck; intentionally standalone. Cohort-level token priority lives in command_center_v2.amazon_rescue / amazon_first_blocked_queue_summary; run this CLI with --tokens from the CC Amazon rescue cohort only when insert planning or ASIN reuse proof is needed.",
  },
  "buckparts:founder-decision-registry": {
    cc_json_path: "command_center_v2.founder_decision_registry_summary_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.founder_decision_registry_summary_v1.data_mutation'",
    reason:
      "Founder decision registry summary projected into Command Center JSON during report generation (read-only); full founder_decision_registry_read_model_v1 remains on npm run buckparts:founder-decision-registry.",
  },
  "buckparts:runner-step": {
    cc_json_path: null,
    verdict: "BYPASSING",
    validation_command: "npm run buckparts:runner-step",
    reason:
      "Runner Step v1 validation harness; intentionally standalone — must not run inside Command Center. Packet/orientation truth lives in command_center_v2.next_execution_packet_summary_v1; run npm run buckparts:runner-step, CI artifact buckparts-runner-step, or npm run buckparts:runner-step:gh for validation capture; founder digest may embed optional runner JSON via FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH when artifact exists.",
  },
  "buckparts:learning-outcomes-approved-insert:mutate": {
    cc_json_path: null,
    verdict: "BYPASSING",
    blocks_lane_work: true,
    validation_command: "npm run buckparts:learning-outcomes-approved-insert:mutate",
    reason: "Mutating executor; must never be classified as CC read-only truth.",
  },
};

function scriptPathFromPackageValue(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^tsx\s+(\S+)/);
  if (match?.[1]) return match[1];
  return trimmed;
}

function systemIdFromScriptName(scriptName: string): string {
  return scriptName.replace(/^buckparts:/, "buckparts_").replace(/[:.]/g, "_");
}

function parseBuckpartsScripts(packageJsonText: string): Array<{ scriptName: string; scriptPath: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(packageJsonText);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null) return [];
  const scripts = (parsed as { scripts?: Record<string, string> }).scripts;
  if (!scripts) return [];
  const out: Array<{ scriptName: string; scriptPath: string }> = [];
  for (const [scriptName, value] of Object.entries(scripts)) {
    if (!scriptName.startsWith("buckparts:")) continue;
    out.push({ scriptName, scriptPath: scriptPathFromPackageValue(value) });
  }
  out.sort((a, b) => a.scriptName.localeCompare(b.scriptName));
  return out;
}

export function buildBrainCoverageVerdictCountsV1(
  entries: BrainCoverageManifestEntryV1[],
): BrainCoverageVerdictCountsV1 {
  const counts = Object.fromEntries(VERDICTS.map((v) => [v, 0])) as BrainCoverageVerdictCountsV1;
  for (const row of entries) {
    counts[row.verdict] += 1;
  }
  return counts;
}

export function buildCommandCenterBrainCoverageManifestV1(
  args: BuildBrainCoverageManifestArgs,
): CommandCenterBrainCoverageManifestV1 {
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
  const packagePath = path.join(args.rootDir, "package.json");
  const packageJsonText = fileExists(packagePath) ? readTextFile(packagePath) : "{}";
  const buckpartsScripts = parseBuckpartsScripts(packageJsonText);

  const entries: BrainCoverageManifestEntryV1[] = [];
  const seenIds = new Set<string>();

  const pushEntry = (seed: EntrySeed) => {
    if (seenIds.has(seed.system_id)) return;
    seenIds.add(seed.system_id);
    entries.push(entry(seed));
  };

  for (const curated of CURATED_ENTRIES) {
    pushEntry(curated);
  }

  for (const { scriptName, scriptPath } of buckpartsScripts) {
    const override = NPM_SCRIPT_OVERRIDES[scriptName];
    const system_id = override?.system_id ?? systemIdFromScriptName(scriptName);
    pushEntry({
      system_id,
      npm_script_or_path: `npm run ${scriptName} → ${scriptPath}`,
      cc_json_path: override?.cc_json_path ?? null,
      dashboard_only: override?.dashboard_only ?? false,
      verdict: override?.verdict ?? "BYPASSING",
      blocks_lane_work: override?.blocks_lane_work ?? false,
      validation_command: override?.validation_command ?? `npm run ${scriptName}`,
      reason:
        override?.reason ??
        "buckparts:* CLI emits a separate report contract; not embedded in Command Center JSON stdout.",
    });
  }

  const workflowDir = path.join(args.rootDir, ".github/workflows");
  const workflowPartial =
    fileExists(path.join(workflowDir, "buckparts-daily-operator.yml")) &&
    fileExists(path.join(workflowDir, "buckparts-founder-digest.yml")) &&
    fileExists(path.join(workflowDir, "buckparts-runner-step.yml"));

  const proven_facts = [
    "command_center_brain_coverage_manifest_v1 is read-only metadata; it does not mutate Supabase, retailer_links, or evidence.",
    `Enumerated ${buckpartsScripts.length} package.json scripts with prefix buckparts:.`,
    `Curated ${CURATED_ENTRIES.length} non-script systems (dashboard attachments, HQ handoff, Sentry, GitHub workflows).`,
    workflowPartial
      ? "PROVEN: .github/workflows/buckparts-*.yml files exist on disk."
      : "UNKNOWN: one or more expected .github/workflows/buckparts-*.yml files missing.",
  ];

  const unknown_facts = [
    "Last GitHub Actions run status (pass/fail/timing) is not proven from workflow files alone.",
    "Sentry incident counts and agent stuck-loop state are not proven in Command Center JSON.",
    "Individual buckparts:* scripts without explicit override default to BYPASSING unless ingested by report-buckparts-command-center.ts.",
  ];

  const sortedEntries = entries.sort((a, b) => a.system_id.localeCompare(b.system_id));
  const verdict_counts = buildBrainCoverageVerdictCountsV1(sortedEntries);
  const summary = {
    total_entries: sortedEntries.length,
    verdict_counts,
  };

  return {
    contract: "command_center_brain_coverage_manifest_v1",
    generated_at: args.now().toISOString(),
    read_only: true,
    data_mutation: false,
    total_entries: sortedEntries.length,
    entries: sortedEntries,
    verdict_counts,
    summary,
    summary_by_verdict: verdict_counts,
    proven_facts,
    unknown_facts,
  };
}
