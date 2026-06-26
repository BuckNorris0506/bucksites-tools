/**
 * Manufacturer Browser Proof Refresh Orchestrator v1 — read-only refresh scheduling.
 * Consumes manufacturer-browser-proof-factory-v1 outputs only; never auto-grants PASS.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  loadManufacturerBrowserProofFactoryReportV1,
  MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
  MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1,
  type ManufacturerBrowserCaptureStrategyV1,
  type ManufacturerBrowserProofEvidenceStatusV1,
  type ManufacturerBrowserProofFactoryReportV1,
  type ManufacturerBrowserProofSlugAssessmentV1,
} from "./manufacturer-browser-proof-factory-v1";
import { READ_ONLY_MUTATION_FLAGS_V1 } from "./manufacturer-safe-link-rescue-framework-v1";
import {
  loadManufacturerRescueDeployBuildMarkerV1,
  type ManufacturerRescueReadinessDeployMarkerV1,
} from "./manufacturer-safe-link-rescue-readiness-gate-v1";
import { MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1 } from "./manufacturer-safe-link-rescue-owner-browser-proof-evidence-v1";

export const MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1 =
  "manufacturer_browser_proof_refresh_orchestrator_v1" as const;

export const MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-browser-proof-refresh-orchestrator-v1.json" as const;

export const MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_MD_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-browser-proof-refresh-orchestrator-v1.md" as const;

export const MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_SOURCE_COMMAND_V1 =
  "npm run buckparts:manufacturer-browser-proof-refresh-orchestrator" as const;

export const MANUFACTURER_BROWSER_PROOF_REFRESH_SCHEDULE_REASONS_V1 = [
  "owner_browser_proof_artifact_missing",
  "browser_proof_stale",
  "fresh_proof_without_official_pass",
  "deploy_marker_present_refresh_recommended",
  "factory_capture_work_required",
] as const;

export type ManufacturerBrowserProofRefreshScheduleReasonV1 =
  (typeof MANUFACTURER_BROWSER_PROOF_REFRESH_SCHEDULE_REASONS_V1)[number];

export type ManufacturerBrowserProofRefreshWorkItemV1 = {
  filter_slug: string;
  oem_part_token: string;
  capture_strategy: ManufacturerBrowserCaptureStrategyV1;
  evidence_status: ManufacturerBrowserProofEvidenceStatusV1;
  schedule_reasons: string[];
  refresh_priority: number;
  recommended_capture_command: string;
  target_url: string | null;
  owner_proof_artifact_rel: string | null;
  normalization_draft_only: boolean;
  auto_pass_forbidden: true;
};

export type ManufacturerBrowserProofRefreshBatchV1 = {
  batch_id: string;
  manufacturer_key: string;
  scheduled_slug_count: number;
  work_items: ManufacturerBrowserProofRefreshWorkItemV1[];
  capture_strategies: ManufacturerBrowserCaptureStrategyV1[];
  capture_commands: string[];
  max_refresh_priority: number;
  schedule_reasons: string[];
  ge_normalization_draft_only: boolean;
  auto_pass_forbidden: true;
  browser_automation_authorized: false;
  post_capture_owner_action: string;
};

export type ManufacturerBrowserProofRefreshOrchestratorReportV1 = {
  contract: typeof MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  auto_pass_forbidden: true;
  readiness_gate_promotion_authorized: false;
  generated_at: string;
  source_command: typeof MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_SOURCE_COMMAND_V1;
  factory_contract: typeof MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1;
  factory_artifact_path: string;
  factory_generated_at: string;
  factory_orchestrator_generated_at: string;
  browser_proof_max_age_days: number;
  deploy_build_marker: ManufacturerRescueReadinessDeployMarkerV1;
  scheduled_slug_count: number;
  manufacturer_refresh_batch_count: number;
  manufacturer_refresh_batches: ManufacturerBrowserProofRefreshBatchV1[];
  manufacturer_refresh_batch_rels: string[];
  inspect_summary: {
    recommended_next_action: string;
    readiness_gate_note: string;
    factory_note: string;
  };
  proven_facts: string[];
  unknown_facts: string[];
};

function sanitizeManufacturerKey(manufacturerKey: string): string {
  return manufacturerKey.replace(/[^a-z0-9]+/g, "-");
}

export function manufacturerBrowserProofRefreshBatchRelV1(manufacturerKey: string): string {
  return `data/fridge/batch-production/drafts/manufacturer-browser-proof-refresh-batch-${sanitizeManufacturerKey(manufacturerKey)}-v1.json`;
}

function basePriorityForEvidenceStatus(status: ManufacturerBrowserProofEvidenceStatusV1): number {
  switch (status) {
    case "MISSING":
      return 100;
    case "STALE":
      return 80;
    case "FRESH_NOT_OFFICIAL_PASS":
      return 60;
    default:
      return 0;
  }
}

export function buildManufacturerBrowserProofRefreshScheduleReasonsV1(args: {
  assessment: ManufacturerBrowserProofSlugAssessmentV1;
  deployMarker: ManufacturerRescueReadinessDeployMarkerV1;
}): string[] {
  const reasons = new Set<string>();
  if (args.assessment.capture_work_reason) {
    reasons.add(args.assessment.capture_work_reason);
  }
  reasons.add("factory_capture_work_required");
  if (
    args.deployMarker.marker !== "UNKNOWN" &&
    (args.assessment.evidence_status === "MISSING" || args.assessment.evidence_status === "STALE")
  ) {
    reasons.add("deploy_marker_present_refresh_recommended");
  }
  return Array.from(reasons);
}

export function computeManufacturerBrowserProofRefreshPriorityV1(args: {
  assessment: ManufacturerBrowserProofSlugAssessmentV1;
  deployMarker: ManufacturerRescueReadinessDeployMarkerV1;
}): number {
  let priority = basePriorityForEvidenceStatus(args.assessment.evidence_status);
  if (
    args.deployMarker.marker !== "UNKNOWN" &&
    (args.assessment.evidence_status === "MISSING" || args.assessment.evidence_status === "STALE")
  ) {
    priority += 20;
  }
  return priority;
}

function postCaptureOwnerActionForStrategy(
  strategy: ManufacturerBrowserCaptureStrategyV1,
): string {
  if (strategy === "ge_automated_playwright_spec_capture") {
    return "GE Playwright capture may produce browser evidence only — owner must reconcile normalization draft and record PASS owner browser proof manually.";
  }
  if (strategy === "everydrop_whirlpool_playwright_official_capture") {
    return "Everydrop/Whirlpool Playwright capture is owner-authorized — no auto PASS; owner browser proof session required.";
  }
  return "Owner browser proof session required — factory never auto-grants PASS_BROWSER_PROOF.";
}

export function buildManufacturerBrowserProofRefreshWorkItemV1(args: {
  assessment: ManufacturerBrowserProofSlugAssessmentV1;
  deployMarker: ManufacturerRescueReadinessDeployMarkerV1;
}): ManufacturerBrowserProofRefreshWorkItemV1 | null {
  if (!args.assessment.capture_work_required || args.assessment.evidence_status === "BLOCKED") {
    return null;
  }
  const normalization_draft_only =
    args.assessment.capture_strategy === "ge_automated_playwright_spec_capture";
  return {
    filter_slug: args.assessment.filter_slug,
    oem_part_token: args.assessment.oem_part_token,
    capture_strategy: args.assessment.capture_strategy,
    evidence_status: args.assessment.evidence_status,
    schedule_reasons: buildManufacturerBrowserProofRefreshScheduleReasonsV1(args),
    refresh_priority: computeManufacturerBrowserProofRefreshPriorityV1(args),
    recommended_capture_command: args.assessment.recommended_capture_command,
    target_url: args.assessment.target_url,
    owner_proof_artifact_rel: args.assessment.owner_proof_artifact_rel,
    normalization_draft_only,
    auto_pass_forbidden: true,
  };
}

export function buildManufacturerBrowserProofRefreshBatchesFromFactoryV1(args: {
  factory: ManufacturerBrowserProofFactoryReportV1;
  deployMarker: ManufacturerRescueReadinessDeployMarkerV1;
}): ManufacturerBrowserProofRefreshBatchV1[] {
  const byManufacturer = new Map<string, ManufacturerBrowserProofRefreshWorkItemV1[]>();

  for (const assessment of args.factory.slug_assessments) {
    const item = buildManufacturerBrowserProofRefreshWorkItemV1({
      assessment,
      deployMarker: args.deployMarker,
    });
    if (!item) continue;
    const list = byManufacturer.get(assessment.manufacturer_key) ?? [];
    list.push(item);
    byManufacturer.set(assessment.manufacturer_key, list);
  }

  return Array.from(byManufacturer.entries())
    .map(([manufacturer_key, work_items]) => {
      const sorted = work_items.sort(
        (a, b) => b.refresh_priority - a.refresh_priority || a.filter_slug.localeCompare(b.filter_slug),
      );
      const capture_strategies = Array.from(
        new Set(sorted.map((item) => item.capture_strategy)),
      ).sort();
      const capture_commands = Array.from(
        new Set(sorted.map((item) => item.recommended_capture_command)),
      ).sort();
      const schedule_reasons = Array.from(new Set(sorted.flatMap((item) => item.schedule_reasons))).sort();
      const ge_normalization_draft_only = capture_strategies.includes(
        "ge_automated_playwright_spec_capture",
      );
      const primaryStrategy = sorted[0]?.capture_strategy ?? "owner_browser_proof_session_assist";
      return {
        batch_id: `refresh_batch_${sanitizeManufacturerKey(manufacturer_key)}`,
        manufacturer_key,
        scheduled_slug_count: sorted.length,
        work_items: sorted,
        capture_strategies,
        capture_commands,
        max_refresh_priority: sorted[0]?.refresh_priority ?? 0,
        schedule_reasons,
        ge_normalization_draft_only,
        auto_pass_forbidden: true as const,
        browser_automation_authorized: false as const,
        post_capture_owner_action: ge_normalization_draft_only
          ? postCaptureOwnerActionForStrategy("ge_automated_playwright_spec_capture")
          : postCaptureOwnerActionForStrategy(primaryStrategy),
      };
    })
    .sort(
      (a, b) =>
        b.max_refresh_priority - a.max_refresh_priority ||
        b.scheduled_slug_count - a.scheduled_slug_count ||
        a.manufacturer_key.localeCompare(b.manufacturer_key),
    );
}

export function buildManufacturerBrowserProofRefreshOrchestratorV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  factory?: ManufacturerBrowserProofFactoryReportV1;
}): ManufacturerBrowserProofRefreshOrchestratorReportV1 {
  const now = args.now ?? (() => new Date());
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));

  const factory =
    args.factory ??
    loadManufacturerBrowserProofFactoryReportV1({
      rootDir: args.rootDir,
      fileExists,
      readText,
    });
  if (!factory) {
    throw new Error(
      `manufacturer-browser-proof-factory artifact missing at ${MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1}; run npm run buckparts:manufacturer-browser-proof-factory first`,
    );
  }

  const deployMarker = loadManufacturerRescueDeployBuildMarkerV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });

  const manufacturer_refresh_batches = buildManufacturerBrowserProofRefreshBatchesFromFactoryV1({
    factory,
    deployMarker,
  });
  const scheduled_slug_count = manufacturer_refresh_batches.reduce(
    (sum, batch) => sum + batch.scheduled_slug_count,
    0,
  );

  return {
    contract: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1,
    ...READ_ONLY_MUTATION_FLAGS_V1,
    browser_automation_authorized: false,
    auto_pass_forbidden: true,
    readiness_gate_promotion_authorized: false,
    generated_at: now().toISOString(),
    source_command: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_SOURCE_COMMAND_V1,
    factory_contract: MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
    factory_artifact_path: MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1,
    factory_generated_at: factory.generated_at,
    factory_orchestrator_generated_at: factory.orchestrator_generated_at,
    browser_proof_max_age_days:
      factory.browser_proof_max_age_days ?? MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1,
    deploy_build_marker: deployMarker,
    scheduled_slug_count,
    manufacturer_refresh_batch_count: manufacturer_refresh_batches.length,
    manufacturer_refresh_batches,
    manufacturer_refresh_batch_rels: manufacturer_refresh_batches.map((batch) =>
      manufacturerBrowserProofRefreshBatchRelV1(batch.manufacturer_key),
    ),
    inspect_summary: {
      recommended_next_action:
        scheduled_slug_count > 0
          ? `Execute ${String(manufacturer_refresh_batches.length)} manufacturer refresh batch(es) in priority order; owner review required before PASS owner-browser-proof artifacts. Then re-run factory, readiness gate, and apply-plan factory.`
          : "No browser proof refresh work scheduled — factory reports all slugs fresh PASS, blocked, or not requiring capture.",
      readiness_gate_note:
        "manufacturer_safe_link_rescue_readiness_gate_v1 remains sole READY_FOR_APPLY promotion authority.",
      factory_note:
        "Orchestrator consumes manufacturer_browser_proof_factory_v1 only — does not rebuild director, runner, or orchestrator queues.",
    },
    proven_facts: [
      "PROVEN: Orchestrator is read-only — browser_automation_authorized=false; schedules work only.",
      "PROVEN: auto_pass_forbidden — orchestrator never grants PASS_BROWSER_PROOF.",
      `PROVEN: scheduled ${String(scheduled_slug_count)} slug(s) across ${String(manufacturer_refresh_batches.length)} manufacturer batch(es) from committed factory artifact.`,
      `PROVEN: ${String(MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1)}-day freshness contract inherited from factory.`,
      deployMarker.marker === "UNKNOWN"
        ? "PROVEN: deploy marker UNKNOWN — deploy-marker refresh boost not applied beyond factory reasons."
        : `PROVEN: deploy marker ${deployMarker.marker} present — stale/missing slugs receive deploy_marker_present_refresh_recommended.`,
    ],
    unknown_facts: [
      "UNKNOWN: Live production buyer-path parity until post-capture owner proof and census re-run.",
      deployMarker.proof_after_marker_proven === "UNKNOWN"
        ? "UNKNOWN: proof-after-deploy-marker ordering not provable from committed artifacts alone."
        : "UNKNOWN: post-refresh readiness gate outcome until owner PASS proof committed.",
    ],
  };
}

export function buildManufacturerBrowserProofRefreshOrchestratorMarkdownV1(
  report: ManufacturerBrowserProofRefreshOrchestratorReportV1,
): string {
  const lines = [
    "# Manufacturer browser proof refresh orchestrator v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- factory_generated_at: **${report.factory_generated_at}**`,
    `- scheduled_slug_count: **${String(report.scheduled_slug_count)}**`,
    `- manufacturer_refresh_batch_count: **${String(report.manufacturer_refresh_batch_count)}**`,
    `- browser_proof_max_age_days: **${String(report.browser_proof_max_age_days)}**`,
    `- deploy_marker: **${report.deploy_build_marker.marker}**`,
    "",
    "## Manufacturer refresh batches",
    "",
  ];

  if (report.manufacturer_refresh_batches.length === 0) {
    lines.push("_No refresh batches scheduled._", "");
  } else {
    for (const batch of report.manufacturer_refresh_batches) {
      lines.push(
        `### ${batch.batch_id}`,
        `- manufacturer: **${batch.manufacturer_key}**`,
        `- scheduled_slug_count: **${String(batch.scheduled_slug_count)}**`,
        `- max_refresh_priority: **${String(batch.max_refresh_priority)}**`,
        `- capture_strategies: ${batch.capture_strategies.join(", ")}`,
        `- ge_normalization_draft_only: **${String(batch.ge_normalization_draft_only)}**`,
        `- commands: ${batch.capture_commands.map((c) => `\`${c}\``).join(", ")}`,
        `- slugs: ${batch.work_items.map((item) => item.filter_slug).join(", ")}`,
        `- post_capture: ${batch.post_capture_owner_action}`,
        "",
      );
    }
  }

  lines.push("## Recommended next action", "", report.inspect_summary.recommended_next_action, "");
  return lines.join("\n");
}

export function writeManufacturerBrowserProofRefreshOrchestratorArtifactsV1(args: {
  rootDir: string;
  report: ManufacturerBrowserProofRefreshOrchestratorReportV1;
}): {
  orchestratorJsonRelPath: string;
  orchestratorMdRelPath: string;
  refreshBatchRelPaths: string[];
} {
  const jsonAbs = path.join(args.rootDir, MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    `${buildManufacturerBrowserProofRefreshOrchestratorMarkdownV1(args.report)}\n`,
    "utf8",
  );

  const refreshBatchRelPaths: string[] = [];
  for (const batch of args.report.manufacturer_refresh_batches) {
    const rel = manufacturerBrowserProofRefreshBatchRelV1(batch.manufacturer_key);
    const abs = path.join(args.rootDir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(batch, null, 2)}\n`, "utf8");
    refreshBatchRelPaths.push(rel);
  }

  return {
    orchestratorJsonRelPath: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1,
    orchestratorMdRelPath: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_MD_REL_V1,
    refreshBatchRelPaths,
  };
}

export function loadManufacturerBrowserProofRefreshOrchestratorReportV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerBrowserProofRefreshOrchestratorReportV1 | null {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1);
  if (!fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(readText(abs)) as ManufacturerBrowserProofRefreshOrchestratorReportV1;
    if (parsed.contract !== MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}
