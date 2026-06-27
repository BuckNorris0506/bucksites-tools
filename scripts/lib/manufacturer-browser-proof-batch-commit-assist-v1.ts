/**
 * Manufacturer Browser Proof Batch Commit Assist v1 — owner-confirmed proof artifact writes
 * plus downstream read-only production chain refresh.
 *
 * Consumes committed execution-factory owner session packets only.
 * Never auto-grants PASS_BROWSER_PROOF.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
  FRIDGE_OWNER_BROWSER_PROOF_SESSION_RESULT_OPTIONS_V1,
  validateOwnerBrowserProofResultV1,
  type OwnerBrowserProofResultUrlRowV1,
  type OwnerBrowserProofResultV1,
} from "./fridge-safe-link-owner-browser-proof-result-v1";
import {
  buildManufacturerBrowserProofFactoryV1,
  loadManufacturerBrowserProofFactoryReportV1,
  writeManufacturerBrowserProofFactoryArtifactsV1,
} from "./manufacturer-browser-proof-factory-v1";
import {
  loadManufacturerBrowserProofExecutionFactoryReportV1,
  MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_JSON_REL_V1,
  type ManufacturerBrowserProofOwnerSessionPacketV1,
  type ManufacturerBrowserProofOwnerSessionSlugRowV1,
} from "./manufacturer-browser-proof-execution-factory-v1";
import {
  buildManufacturerRescueOwnerApprovalPacketFactoryV1,
  writeManufacturerRescueOwnerApprovalPacketFactoryArtifactsV1,
} from "./manufacturer-rescue-owner-approval-packet-factory-v1";
import {
  buildManufacturerRescueThroughputAnalyticsV1,
  writeManufacturerRescueThroughputAnalyticsArtifactsV1,
} from "./manufacturer-rescue-throughput-analytics-v1";
import {
  buildManufacturerSafeLinkRescueApplyPlanFactoryPlansV1,
  loadManufacturerSafeLinkRescueApplyPlanFactoryReportV1,
  writeManufacturerSafeLinkRescueApplyPlanFactoryArtifactsV1,
} from "./manufacturer-safe-link-rescue-apply-plan-factory-v1";
import {
  assessManufacturerRescueBrowserProofFreshnessV1,
  manufacturerRescueOwnerProofArtifactRelForSlugV1,
  manufacturerRescueOwnerProofOfficialPassV1,
} from "./manufacturer-safe-link-rescue-owner-browser-proof-evidence-v1";
import {
  buildManufacturerSafeLinkRescueReadinessGateV1,
  loadManufacturerSafeLinkRescueReadinessGateV1,
  writeManufacturerSafeLinkRescueReadinessGateArtifactsV1,
} from "./manufacturer-safe-link-rescue-readiness-gate-v1";
import {
  buildManufacturerSafeLinkRescueRunnerV1,
  writeManufacturerSafeLinkRescueRunnerArtifactsV1,
} from "./manufacturer-safe-link-rescue-runner-v1";
import { loadManufacturerRescueOwnerApprovalPacketFactoryReportV1 } from "./manufacturer-rescue-owner-approval-packet-factory-v1";

export const MANUFACTURER_BROWSER_PROOF_BATCH_COMMIT_ASSIST_CONTRACT_V1 =
  "manufacturer_browser_proof_batch_commit_assist_v1" as const;

export const MANUFACTURER_BROWSER_PROOF_BATCH_COMMIT_ASSIST_SOURCE_COMMAND_V1 =
  "npm run buckparts:manufacturer-browser-proof-batch-commit-assist" as const;

export const OWNER_PROOF_NOT_AUTHORIZED_STANDARD_V1 = [
  "retailer_links_csv_mutation",
  "filters_csv_mutation",
  "compatibility_mappings_csv_mutation",
  "data/evidence_mutation",
  "supabase_mutation",
  "production_go_click",
  "verified_link_authorization",
  "command_center_closure",
  "truth_closure",
  "VALIDATION_PASS",
  "live_link_mutation_from_this_result_alone",
] as const;

export type ManufacturerBrowserProofBatchOwnerVerdictSubmissionV1 = {
  filter_slug: string;
  verdict: (typeof FRIDGE_OWNER_BROWSER_PROOF_SESSION_RESULT_OPTIONS_V1)[number];
  owner_confirmed: true;
  checked_at: string;
  owner_proof_urls: OwnerBrowserProofResultUrlRowV1[];
  capture_method?: string;
  proven_facts?: string[];
  inferred_facts?: string[];
  unknown_facts?: string[];
};

export type ManufacturerBrowserProofBatchCommitIntakeV1 = {
  manufacturer_key: string;
  owner_confirmed: true;
  auto_pass_forbidden_acknowledged: true;
  slug_verdicts: ManufacturerBrowserProofBatchOwnerVerdictSubmissionV1[];
};

export type ManufacturerBrowserProofBatchCommitResultV1 = {
  filter_slug: string;
  verdict: string;
  artifact_rel: string;
  written: boolean;
  validation_errors: string[];
  fresh_after_write: boolean | "UNKNOWN";
  official_pass_after_write: boolean | "UNKNOWN";
};

export type ManufacturerBrowserProofProductionChainSnapshotV1 = {
  fresh_official_pass_count: number;
  ready_for_owner_review_plan_count: number;
  approval_cohort_count: number;
  ready_for_apply_count: number;
  batch_slug_blockers: Record<string, string[]>;
};

export type ManufacturerBrowserProofBatchCommitAssistCompletionReportV1 = {
  contract: typeof MANUFACTURER_BROWSER_PROOF_BATCH_COMMIT_ASSIST_CONTRACT_V1;
  read_only: false;
  data_mutation: true;
  mutation_authorized: true;
  auto_pass_forbidden: true;
  browser_automation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  founder_approval_created: false;
  readiness_gate_promotion_authorized: false;
  generated_at: string;
  source_command: typeof MANUFACTURER_BROWSER_PROOF_BATCH_COMMIT_ASSIST_SOURCE_COMMAND_V1;
  manufacturer_key: string;
  batch_id: string;
  execution_factory_artifact_path: string;
  owner_session_packet_rel: string;
  owner_confirmed: boolean;
  browser_proofs_refreshed: ManufacturerBrowserProofBatchCommitResultV1[];
  downstream_chain_ran: boolean;
  before_snapshot: ManufacturerBrowserProofProductionChainSnapshotV1;
  after_snapshot: ManufacturerBrowserProofProductionChainSnapshotV1;
  deltas: {
    fresh_official_pass_count: number;
    ready_for_owner_review_plan_count: number;
    approval_cohort_count: number;
    ready_for_apply_count: number;
  };
  apply_plans_unlocked: string[];
  owner_approval_packets_created: string[];
  remaining_blockers: Array<{
    filter_slug: string;
    blockers: string[];
  }>;
  inspect_summary: {
    recommended_next_action: string;
    trust_gate_note: string;
  };
  proven_facts: string[];
  unknown_facts: string[];
};

function sanitizeManufacturerKey(manufacturerKey: string): string {
  return manufacturerKey.replace(/[^a-z0-9]+/g, "-");
}

export function manufacturerBrowserProofBatchCommitAssistCompletionRelV1(
  manufacturerKey: string,
): string {
  return `data/fridge/batch-production/drafts/manufacturer-browser-proof-batch-commit-assist-completion-${sanitizeManufacturerKey(manufacturerKey)}-v1.json`;
}

export function manufacturerBrowserProofBatchCommitAssistGuideRelV1(manufacturerKey: string): string {
  return `data/fridge/batch-production/drafts/manufacturer-browser-proof-batch-commit-assist-guide-${sanitizeManufacturerKey(manufacturerKey)}-v1.md`;
}

export function manufacturerBrowserProofBatchCommitIntakeTemplateRelV1(
  manufacturerKey: string,
): string {
  return `data/fridge/batch-production/drafts/manufacturer-browser-proof-batch-commit-intake-template-${sanitizeManufacturerKey(manufacturerKey)}-v1.json`;
}

export function loadCommittedOwnerSessionPacketV1(args: {
  rootDir: string;
  manufacturerKey: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerBrowserProofOwnerSessionPacketV1 | null {
  const executionFactory = loadManufacturerBrowserProofExecutionFactoryReportV1({
    rootDir: args.rootDir,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  if (!executionFactory) return null;
  const normalized = args.manufacturerKey.trim().toLowerCase();
  return (
    executionFactory.owner_session_packets.find(
      (packet) => packet.manufacturer_key.toLowerCase() === normalized,
    ) ?? null
  );
}

export function buildOwnerBrowserProofResultFromVerdictSubmissionV1(args: {
  submission: ManufacturerBrowserProofBatchOwnerVerdictSubmissionV1;
  sessionRow: ManufacturerBrowserProofOwnerSessionSlugRowV1;
  manufacturerKey: string;
  batchId: string;
}): OwnerBrowserProofResultV1 {
  return {
    contract: FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    production_go_click_authorized: false,
    command_center_closure_authorized: false,
    truth_closure_authorized: false,
    apply_planning_authorized: false,
    slug: args.submission.filter_slug.trim().toLowerCase(),
    oem_part_token: args.sessionRow.oem_part_token,
    verdict: args.submission.verdict,
    checked_at: args.submission.checked_at,
    capture_method:
      args.submission.capture_method ??
      "owner_browser_visual_inspection_via_batch_commit_assist_v1",
    verified_by: "owner",
    live_buckparts_url: args.sessionRow.live_buckparts_url,
    owner_proof_urls: args.submission.owner_proof_urls,
    not_authorized: [...OWNER_PROOF_NOT_AUTHORIZED_STANDARD_V1],
    proven_facts: args.submission.proven_facts ?? [
      `PROVEN: owner verdict ${args.submission.verdict} for slug ${args.submission.filter_slug} via batch commit assist.`,
      "PROVEN: artifact is read_only=true with all mutation flags false.",
    ],
    inferred_facts: args.submission.inferred_facts ?? [],
    unknown_facts: args.submission.unknown_facts ?? [
      "UNKNOWN: live retailer_links.csv / Supabase parity — no buyer-path mutation authorized from this result alone.",
    ],
    mission_context: {
      mission_type: "MANUFACTURER_BROWSER_PROOF_BATCH_COMMIT_ASSIST_V1",
      manufacturer_key: args.manufacturerKey,
      batch_id: args.batchId,
      session_order: args.sessionRow.session_order,
      auto_pass_forbidden: true,
    },
  } as OwnerBrowserProofResultV1;
}

export function buildManufacturerBrowserProofBatchCommitAssistGuideMarkdownV1(args: {
  packet: ManufacturerBrowserProofOwnerSessionPacketV1;
  intakeTemplateRel: string;
}): string {
  const lines = [
    "# Manufacturer browser proof batch commit assist — owner session guide",
    "",
    `- manufacturer: **${args.packet.manufacturer_key}**`,
    `- batch_id: **${args.packet.batch_id}**`,
    `- slug_count: **${String(args.packet.slug_count)}**`,
    `- auto_pass_forbidden: **true**`,
    `- intake_template: \`${args.intakeTemplateRel}\``,
    "",
    "## Pre-session checklist",
    "",
    ...args.packet.pre_session_checklist.map((item) => `- ${item}`),
    "",
    "## Slugs (priority order)",
    "",
  ];

  for (const row of args.packet.session_slugs) {
    lines.push(
      `### ${String(row.session_order)}. ${row.filter_slug} (${row.oem_part_token})`,
      `- evidence_status: **${row.evidence_status}**`,
      `- refresh_priority: **${String(row.refresh_priority)}**`,
      `- live_buckparts_url: ${row.live_buckparts_url}`,
      "",
      "**Exact URLs**",
      "",
    );
    for (const urlRow of row.exact_urls) {
      lines.push(
        `- [${String(urlRow.priority)}] ${urlRow.url} (${urlRow.url_role})${urlRow.notes ? ` — ${urlRow.notes}` : ""}`,
      );
    }
    lines.push(
      "",
      "**Required screenshots**",
      "",
      ...row.required_screenshots.map((s) => `- \`${s}\``),
      "",
      "**Validation checklist**",
      "",
      ...row.validation_checklist.map((item) => `- ${item}`),
      "",
      "**Pass criteria**",
      "",
      row.pass_criteria,
      "",
      "**Fail criteria**",
      "",
      ...row.fail_criteria.map((item) => `- ${item}`),
      "",
      "**Owner verdict options** (explicit only — factory never auto-selects)",
      "",
      ...row.owner_verdict_options.map((v) => `- \`${v}\``),
      "",
    );
  }

  lines.push(
    "## Post-session",
    "",
    args.packet.post_session_owner_action,
    "",
    "## Commit instructions",
    "",
    "1. Fill the intake template JSON with `owner_confirmed: true`, `auto_pass_forbidden_acknowledged: true`, and per-slug verdicts.",
    "2. Run batch commit assist with `--intake <path>` — PASS is never written without explicit owner verdict in intake.",
    "3. Downstream read-only factories refresh automatically after successful commits.",
    "",
  );
  return lines.join("\n");
}

export function buildManufacturerBrowserProofBatchCommitIntakeTemplateV1(args: {
  packet: ManufacturerBrowserProofOwnerSessionPacketV1;
}): ManufacturerBrowserProofBatchCommitIntakeV1 {
  return {
    manufacturer_key: args.packet.manufacturer_key,
    owner_confirmed: true,
    auto_pass_forbidden_acknowledged: true,
    slug_verdicts: args.packet.session_slugs.map((row) => ({
      filter_slug: row.filter_slug,
      verdict: "NEEDS_RECONCILIATION",
      owner_confirmed: true,
      checked_at: "REPLACE_WITH_ISO8601_TIMESTAMP",
      owner_proof_urls: row.exact_urls
        .filter((u) => u.url !== "UNKNOWN")
        .map((u, index) => ({
          url: u.url,
          retailer: u.url_role,
          path_type:
            u.url_role === "official_target" || u.url_role === "repo_proven_official"
              ? "official_manufacturer_pdp"
              : undefined,
          browser_proof_status: "NEEDS_OWNER_REVIEW",
          proven_observations: [`Owner session row ${String(index + 1)} — replace after visual review.`],
        })),
      capture_method: "owner_browser_visual_inspection_via_batch_commit_assist_v1",
      proven_facts: [
        `PROVEN: owner confirmed verdict for ${row.filter_slug} — replace NEEDS_RECONCILIATION with explicit verdict.`,
      ],
      unknown_facts: ["UNKNOWN: replace template placeholders before commit."],
    })),
  };
}

function collectProductionChainSnapshot(args: {
  rootDir: string;
  batchSlugs: string[];
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  now?: () => Date;
}): ManufacturerBrowserProofProductionChainSnapshotV1 {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));

  const browserFactory = loadManufacturerBrowserProofFactoryReportV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  const applyFactory = loadManufacturerSafeLinkRescueApplyPlanFactoryReportV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  const approvalFactory = loadManufacturerRescueOwnerApprovalPacketFactoryReportV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  const readiness = loadManufacturerSafeLinkRescueReadinessGateV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });

  const batchSlugBlockers: Record<string, string[]> = {};
  for (const slug of args.batchSlugs) {
    const blockers: string[] = [];
    const applyRow = applyFactory?.slug_results.find((r) => r.filter_slug === slug);
    if (applyRow?.blockers?.length) blockers.push(...applyRow.blockers);
    const readinessRow = readiness?.candidates.find((c) => c.filter_slug === slug);
    if (readinessRow?.blocking_reasons?.length) blockers.push(...readinessRow.blocking_reasons);
    batchSlugBlockers[slug] = Array.from(new Set(blockers)).sort();
  }

  return {
    fresh_official_pass_count: browserFactory?.fresh_official_pass_count ?? 0,
    ready_for_owner_review_plan_count: applyFactory?.ready_for_owner_review_count ?? 0,
    approval_cohort_count: approvalFactory?.approval_cohort_count ?? 0,
    ready_for_apply_count: readiness?.ready_for_apply_count ?? 0,
    batch_slug_blockers: batchSlugBlockers,
  };
}

export function runManufacturerBrowserProofDownstreamProductionChainV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): void {
  const now = args.now ?? (() => new Date());
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));

  const browserBuilt = buildManufacturerBrowserProofFactoryV1({
    rootDir: args.rootDir,
    now,
    fileExists,
    readText,
  });
  writeManufacturerBrowserProofFactoryArtifactsV1({
    rootDir: args.rootDir,
    report: browserBuilt.report,
    normalization_drafts: browserBuilt.normalization_drafts,
  });

  const applyBuilt = buildManufacturerSafeLinkRescueApplyPlanFactoryPlansV1({
    rootDir: args.rootDir,
    now,
    fileExists,
    readText,
  });
  writeManufacturerSafeLinkRescueApplyPlanFactoryArtifactsV1({
    rootDir: args.rootDir,
    factory: applyBuilt.factory,
    plans: applyBuilt.plans,
  });

  const approvalBuilt = buildManufacturerRescueOwnerApprovalPacketFactoryV1({
    rootDir: args.rootDir,
    now,
    fileExists,
    readText,
  });
  writeManufacturerRescueOwnerApprovalPacketFactoryArtifactsV1({
    rootDir: args.rootDir,
    report: approvalBuilt.report,
    packets: approvalBuilt.packets,
    decision_templates: approvalBuilt.decision_templates,
  });

  const readiness = buildManufacturerSafeLinkRescueReadinessGateV1({
    rootDir: args.rootDir,
    now,
    fileExists,
    readText,
  });
  writeManufacturerSafeLinkRescueReadinessGateArtifactsV1({
    rootDir: args.rootDir,
    report: readiness,
  });

  const runner = buildManufacturerSafeLinkRescueRunnerV1({
    rootDir: args.rootDir,
    now,
    fileExists,
    readTextFile: readText,
  });
  writeManufacturerSafeLinkRescueRunnerArtifactsV1({
    rootDir: args.rootDir,
    report: runner,
  });

  const throughput = buildManufacturerRescueThroughputAnalyticsV1({
    rootDir: args.rootDir,
    now,
    fileExists,
    readText,
  });
  writeManufacturerRescueThroughputAnalyticsArtifactsV1({
    rootDir: args.rootDir,
    report: throughput,
  });
}

export function commitManufacturerBrowserProofBatchV1(args: {
  rootDir: string;
  intake: ManufacturerBrowserProofBatchCommitIntakeV1;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  dryRun?: boolean;
}): ManufacturerBrowserProofBatchCommitAssistCompletionReportV1 {
  const now = args.now ?? (() => new Date());
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const generatedAt = now().toISOString();

  const packet = loadCommittedOwnerSessionPacketV1({
    rootDir: args.rootDir,
    manufacturerKey: args.intake.manufacturer_key,
    fileExists,
    readText,
  });
  if (!packet) {
    throw new Error(
      `Committed execution factory owner session packet missing for manufacturer_key=${args.intake.manufacturer_key}. Run npm run buckparts:manufacturer-browser-proof-execution-factory first.`,
    );
  }

  if (args.intake.manufacturer_key.trim().toLowerCase() !== packet.manufacturer_key.toLowerCase()) {
    throw new Error("intake.manufacturer_key does not match committed owner session packet.");
  }
  if (args.intake.owner_confirmed !== true) {
    throw new Error("Fail closed: intake.owner_confirmed must be true before any artifact write.");
  }
  if (args.intake.auto_pass_forbidden_acknowledged !== true) {
    throw new Error(
      "Fail closed: intake.auto_pass_forbidden_acknowledged must be true — auto PASS is forbidden.",
    );
  }

  const batchSlugs = packet.session_slugs.map((row) => row.filter_slug);
  const before_snapshot = collectProductionChainSnapshot({
    rootDir: args.rootDir,
    batchSlugs,
    fileExists,
    readText,
    now,
  });

  const sessionBySlug = new Map(packet.session_slugs.map((row) => [row.filter_slug, row]));
  const browser_proofs_refreshed: ManufacturerBrowserProofBatchCommitResultV1[] = [];
  let anyWritten = false;

  for (const submission of args.intake.slug_verdicts) {
    const sessionRow = sessionBySlug.get(submission.filter_slug);
    if (!sessionRow) {
      browser_proofs_refreshed.push({
        filter_slug: submission.filter_slug,
        verdict: submission.verdict,
        artifact_rel: manufacturerRescueOwnerProofArtifactRelForSlugV1(submission.filter_slug),
        written: false,
        validation_errors: [`slug ${submission.filter_slug} not in committed owner session packet`],
        fresh_after_write: "UNKNOWN",
        official_pass_after_write: "UNKNOWN",
      });
      continue;
    }
    if (submission.owner_confirmed !== true) {
      browser_proofs_refreshed.push({
        filter_slug: submission.filter_slug,
        verdict: submission.verdict,
        artifact_rel: manufacturerRescueOwnerProofArtifactRelForSlugV1(submission.filter_slug),
        written: false,
        validation_errors: ["owner_confirmed must be true per slug"],
        fresh_after_write: "UNKNOWN",
        official_pass_after_write: "UNKNOWN",
      });
      continue;
    }

    const artifact = buildOwnerBrowserProofResultFromVerdictSubmissionV1({
      submission,
      sessionRow,
      manufacturerKey: packet.manufacturer_key,
      batchId: packet.batch_id,
    });
    const validation = validateOwnerBrowserProofResultV1(artifact);
    const artifactRel = manufacturerRescueOwnerProofArtifactRelForSlugV1(submission.filter_slug);

    if (!validation.valid) {
      browser_proofs_refreshed.push({
        filter_slug: submission.filter_slug,
        verdict: submission.verdict,
        artifact_rel: artifactRel,
        written: false,
        validation_errors: validation.errors,
        fresh_after_write: "UNKNOWN",
        official_pass_after_write: "UNKNOWN",
      });
      continue;
    }

    if (args.dryRun) {
      const freshness = assessManufacturerRescueBrowserProofFreshnessV1({
        artifact,
        now,
      });
      browser_proofs_refreshed.push({
        filter_slug: submission.filter_slug,
        verdict: submission.verdict,
        artifact_rel: artifactRel,
        written: false,
        validation_errors: [],
        fresh_after_write: freshness.fresh,
        official_pass_after_write: manufacturerRescueOwnerProofOfficialPassV1(artifact),
      });
      continue;
    }

    const abs = path.join(args.rootDir, artifactRel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    anyWritten = true;

    const freshness = assessManufacturerRescueBrowserProofFreshnessV1({
      artifact,
      now,
    });
    browser_proofs_refreshed.push({
      filter_slug: submission.filter_slug,
      verdict: submission.verdict,
      artifact_rel: artifactRel,
      written: true,
      validation_errors: [],
      fresh_after_write: freshness.fresh,
      official_pass_after_write: manufacturerRescueOwnerProofOfficialPassV1(artifact),
    });
  }

  let downstream_chain_ran = false;
  if (anyWritten && !args.dryRun) {
    runManufacturerBrowserProofDownstreamProductionChainV1({
      rootDir: args.rootDir,
      now,
      fileExists,
      readText,
    });
    downstream_chain_ran = true;
  }

  const after_snapshot = downstream_chain_ran
    ? collectProductionChainSnapshot({
        rootDir: args.rootDir,
        batchSlugs,
        fileExists,
        readText,
        now,
      })
    : before_snapshot;

  const applyFactoryAfter = loadManufacturerSafeLinkRescueApplyPlanFactoryReportV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  const approvalFactoryAfter = loadManufacturerRescueOwnerApprovalPacketFactoryReportV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });

  const apply_plans_unlocked =
    applyFactoryAfter?.slug_results
      .filter(
        (row) =>
          batchSlugs.includes(row.filter_slug) && row.plan_status === "READY_FOR_OWNER_REVIEW",
      )
      .map((row) => row.filter_slug) ?? [];

  const owner_approval_packets_created = approvalFactoryAfter?.cohorts.map((c) => c.cohort_id) ?? [];

  const remaining_blockers = batchSlugs.map((slug) => ({
    filter_slug: slug,
    blockers: after_snapshot.batch_slug_blockers[slug] ?? [],
  }));

  const writtenFreshPassCount = browser_proofs_refreshed.filter(
    (row) => row.written && row.verdict === "PASS_BROWSER_PROOF" && row.fresh_after_write === true,
  ).length;

  return {
    contract: MANUFACTURER_BROWSER_PROOF_BATCH_COMMIT_ASSIST_CONTRACT_V1,
    read_only: false,
    data_mutation: anyWritten,
    mutation_authorized: anyWritten,
    auto_pass_forbidden: true,
    browser_automation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    founder_approval_created: false,
    readiness_gate_promotion_authorized: false,
    generated_at: generatedAt,
    source_command: MANUFACTURER_BROWSER_PROOF_BATCH_COMMIT_ASSIST_SOURCE_COMMAND_V1,
    manufacturer_key: packet.manufacturer_key,
    batch_id: packet.batch_id,
    execution_factory_artifact_path: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_JSON_REL_V1,
    owner_session_packet_rel: `data/fridge/batch-production/drafts/manufacturer-browser-proof-owner-session-packet-${sanitizeManufacturerKey(packet.manufacturer_key)}-v1.json`,
    owner_confirmed: args.intake.owner_confirmed === true,
    browser_proofs_refreshed,
    downstream_chain_ran,
    before_snapshot,
    after_snapshot,
    deltas: {
      fresh_official_pass_count:
        after_snapshot.fresh_official_pass_count - before_snapshot.fresh_official_pass_count,
      ready_for_owner_review_plan_count:
        after_snapshot.ready_for_owner_review_plan_count -
        before_snapshot.ready_for_owner_review_plan_count,
      approval_cohort_count:
        after_snapshot.approval_cohort_count - before_snapshot.approval_cohort_count,
      ready_for_apply_count:
        after_snapshot.ready_for_apply_count - before_snapshot.ready_for_apply_count,
    },
    apply_plans_unlocked,
    owner_approval_packets_created,
    remaining_blockers,
    inspect_summary: {
      recommended_next_action:
        writtenFreshPassCount > 0
          ? "Review unlocked apply plans and owner approval packets; record founder decisions before expecting READY_FOR_APPLY promotion."
          : "No fresh PASS browser proofs committed — resolve validation errors or complete owner session with explicit PASS verdicts.",
      trust_gate_note:
        "Readiness Gate remains sole READY_FOR_APPLY promotion authority; batch commit assist never creates founder approval or CSV mutations.",
    },
    proven_facts: [
      "PROVEN: Batch commit assist never auto-grants PASS_BROWSER_PROOF — explicit owner intake required.",
      `PROVEN: ${String(browser_proofs_refreshed.filter((r) => r.written).length)} owner browser proof artifact(s) written for manufacturer ${packet.manufacturer_key}.`,
      downstream_chain_ran
        ? "PROVEN: Downstream read-only production chain refreshed after successful owner-confirmed writes."
        : "PROVEN: Downstream chain not run — no artifacts written or dry-run mode.",
      "PROVEN: founder_approval_created=false; readiness_gate_promotion_authorized=false.",
    ],
    unknown_facts: [
      "UNKNOWN: Live production buyer-path parity until post-apply census re-run.",
      "UNKNOWN: Calendar time for founder owner approval decisions.",
    ],
  };
}

export function writeManufacturerBrowserProofBatchCommitAssistArtifactsV1(args: {
  rootDir: string;
  packet: ManufacturerBrowserProofOwnerSessionPacketV1;
  completionReport?: ManufacturerBrowserProofBatchCommitAssistCompletionReportV1;
}): {
  guideRelPath: string;
  intakeTemplateRelPath: string;
  completionRelPath: string | null;
} {
  const guideRel = manufacturerBrowserProofBatchCommitAssistGuideRelV1(args.packet.manufacturer_key);
  const intakeRel = manufacturerBrowserProofBatchCommitIntakeTemplateRelV1(args.packet.manufacturer_key);
  mkdirSync(path.dirname(path.join(args.rootDir, guideRel)), { recursive: true });
  writeFileSync(
    path.join(args.rootDir, guideRel),
    `${buildManufacturerBrowserProofBatchCommitAssistGuideMarkdownV1({
      packet: args.packet,
      intakeTemplateRel: intakeRel,
    })}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(args.rootDir, intakeRel),
    `${JSON.stringify(buildManufacturerBrowserProofBatchCommitIntakeTemplateV1({ packet: args.packet }), null, 2)}\n`,
    "utf8",
  );

  let completionRelPath: string | null = null;
  if (args.completionReport) {
    completionRelPath = manufacturerBrowserProofBatchCommitAssistCompletionRelV1(
      args.packet.manufacturer_key,
    );
    writeFileSync(
      path.join(args.rootDir, completionRelPath),
      `${JSON.stringify(args.completionReport, null, 2)}\n`,
      "utf8",
    );
  }

  return { guideRelPath: guideRel, intakeTemplateRelPath: intakeRel, completionRelPath };
}

export function parseManufacturerBrowserProofBatchCommitIntakeV1(
  raw: unknown,
): ManufacturerBrowserProofBatchCommitIntakeV1 {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Intake must be a JSON object.");
  }
  const parsed = raw as Record<string, unknown>;
  if (typeof parsed.manufacturer_key !== "string" || !parsed.manufacturer_key.trim()) {
    throw new Error("intake.manufacturer_key required");
  }
  if (parsed.owner_confirmed !== true) {
    throw new Error("intake.owner_confirmed must be true");
  }
  if (parsed.auto_pass_forbidden_acknowledged !== true) {
    throw new Error("intake.auto_pass_forbidden_acknowledged must be true");
  }
  if (!Array.isArray(parsed.slug_verdicts) || parsed.slug_verdicts.length === 0) {
    throw new Error("intake.slug_verdicts must be a non-empty array");
  }
  return parsed as ManufacturerBrowserProofBatchCommitIntakeV1;
}
