/**
 * Manufacturer Browser Proof Factory v1 — read-only evidence production planning.
 * Batches capture work by manufacturer/strategy; never auto-grants PASS browser proof.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
  type OwnerBrowserProofResultV1,
} from "./fridge-safe-link-owner-browser-proof-result-v1";
import { geRescueBrowserEvidenceArtifactRelPathV1 } from "./ge-refrigerator-rescue-adapter-v1";
import {
  loadGeRefrigeratorRescueBrowserEvidenceArtifactV1,
  type GeRefrigeratorRescueBrowserEvidenceArtifactV1,
} from "./ge-refrigerator-rescue-browser-capture-v1";
import {
  isManufacturerRescueBrowserWorkCandidateV1,
  loadManufacturerRescueOrchestratorInputV1,
} from "./manufacturer-safe-link-rescue-director-v1";
import { READ_ONLY_MUTATION_FLAGS_V1 } from "./manufacturer-safe-link-rescue-framework-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
  type ManufacturerRescueOrchestratorQueueRowV1,
  type ManufacturerRescueOrchestratorReportV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";
import {
  loadManufacturerRescueOwnerBrowserProofArtifactV1,
  MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1,
  MANUFACTURER_RESCUE_OWNER_PROOF_REL_BY_SLUG_V1,
  summarizeManufacturerRescueOwnerBrowserProofEvidenceV1,
} from "./manufacturer-safe-link-rescue-owner-browser-proof-evidence-v1";

export const MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1 =
  "manufacturer_browser_proof_factory_v1" as const;

export const MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-browser-proof-factory-v1.json" as const;

export const MANUFACTURER_BROWSER_PROOF_CAPTURE_QUEUE_MD_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-browser-proof-capture-queue-v1.md" as const;

export const MANUFACTURER_BROWSER_PROOF_OWNER_WORK_PACKET_MD_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-browser-proof-owner-work-packet-v1.md" as const;

export const MANUFACTURER_BROWSER_PROOF_FACTORY_SOURCE_COMMAND_V1 =
  "npm run buckparts:manufacturer-browser-proof-factory" as const;

export const MANUFACTURER_BROWSER_CAPTURE_STRATEGIES_V1 = [
  "ge_automated_playwright_spec_capture",
  "owner_browser_proof_session_assist",
  "everydrop_whirlpool_playwright_official_capture",
] as const;

export type ManufacturerBrowserCaptureStrategyV1 =
  (typeof MANUFACTURER_BROWSER_CAPTURE_STRATEGIES_V1)[number];

export const MANUFACTURER_BROWSER_PROOF_EVIDENCE_STATUSES_V1 = [
  "MISSING",
  "STALE",
  "FRESH_OFFICIAL_PASS",
  "FRESH_NOT_OFFICIAL_PASS",
  "BLOCKED",
] as const;

export type ManufacturerBrowserProofEvidenceStatusV1 =
  (typeof MANUFACTURER_BROWSER_PROOF_EVIDENCE_STATUSES_V1)[number];

export const MANUFACTURER_BROWSER_PROOF_NORMALIZATION_DRAFT_CONTRACT_V1 =
  "manufacturer_browser_proof_normalization_draft_v1" as const;

export type ManufacturerBrowserProofNormalizationDraftV1 = {
  contract: typeof MANUFACTURER_BROWSER_PROOF_NORMALIZATION_DRAFT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  auto_pass_forbidden: true;
  target_contract: typeof FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1;
  target_artifact_rel: string;
  filter_slug: string;
  manufacturer_key: string;
  oem_part_token: string;
  source_capture_strategy: ManufacturerBrowserCaptureStrategyV1;
  source_artifact_rel: string;
  source_artifact_contract: string;
  normalized_verdict: "NEEDS_OWNER_BROWSER_REVIEW";
  owner_proof_result_draft: Pick<
    OwnerBrowserProofResultV1,
    "slug" | "oem_part_token" | "verdict" | "owner_proof_urls"
  > & {
    checked_at: string | null;
    capture_method: string;
    normalization_notes: string[];
  };
  trust_gates_preserved: string[];
};

export type ManufacturerBrowserProofSlugAssessmentV1 = {
  filter_slug: string;
  manufacturer_key: string;
  oem_part_token: string;
  capture_strategy: ManufacturerBrowserCaptureStrategyV1;
  evidence_status: ManufacturerBrowserProofEvidenceStatusV1;
  owner_proof_artifact_rel: string | null;
  owner_proof_checked_at: string | null;
  official_pass: boolean;
  freshness_notes: string | null;
  capture_work_required: boolean;
  capture_work_reason: string | null;
  target_url: string | null;
  adapter_discovery_url: string | null;
  blocked_reasons: string[];
  normalization_draft_rel: string | null;
  recommended_capture_command: string;
};

export type ManufacturerBrowserProofCaptureBatchV1 = {
  batch_id: string;
  manufacturer_key: string;
  capture_strategy: ManufacturerBrowserCaptureStrategyV1;
  source_command: string;
  slug_count: number;
  filter_slugs: string[];
  work_reasons: string[];
  target_urls: string[];
};

export type ManufacturerBrowserProofFactoryReportV1 = {
  contract: typeof MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  generated_at: string;
  source_command: typeof MANUFACTURER_BROWSER_PROOF_FACTORY_SOURCE_COMMAND_V1;
  orchestrator_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1;
  orchestrator_generated_at: string;
  browser_proof_max_age_days: number;
  slug_assessment_count: number;
  capture_work_required_count: number;
  fresh_official_pass_count: number;
  stale_count: number;
  missing_count: number;
  blocked_count: number;
  slug_assessments: ManufacturerBrowserProofSlugAssessmentV1[];
  capture_batches: ManufacturerBrowserProofCaptureBatchV1[];
  normalization_draft_rels: string[];
  inspect_summary: {
    recommended_next_action: string;
    readiness_gate_note: string;
    apply_plan_factory_note: string;
  };
  proven_facts: string[];
  unknown_facts: string[];
};

const CAPTURE_COMMAND_BY_STRATEGY: Readonly<Record<ManufacturerBrowserCaptureStrategyV1, string>> = {
  ge_automated_playwright_spec_capture: "npm run buckparts:ge-refrigerator-rescue-capture -- --all",
  owner_browser_proof_session_assist:
    "npm run buckparts:fridge-safe-link-owner-browser-proof-session (owner visual inspection required)",
  everydrop_whirlpool_playwright_official_capture:
    "npm run buckparts:fridge-safe-link-everydrop-whirlpool-official-proof (owner-authorized; no auto PASS)",
};

export function manufacturerBrowserProofNormalizationDraftRelV1(slug: string): string {
  return `data/fridge/batch-production/drafts/manufacturer-browser-proof-normalization-draft-${slug.trim().toLowerCase()}-v1.json`;
}

export function manufacturerBrowserProofCaptureBatchRelV1(args: {
  manufacturer_key: string;
  capture_strategy: ManufacturerBrowserCaptureStrategyV1;
}): string {
  const mfg = args.manufacturer_key.replace(/[^a-z0-9]+/g, "-");
  const strategy = args.capture_strategy.replace(/[^a-z0-9]+/g, "-");
  return `data/fridge/batch-production/drafts/manufacturer-browser-proof-capture-batch-${mfg}-${strategy}-v1.json`;
}

export function resolveManufacturerBrowserCaptureStrategyV1(
  manufacturerKey: string,
  row: ManufacturerRescueOrchestratorQueueRowV1,
): ManufacturerBrowserCaptureStrategyV1 {
  if (manufacturerKey === "ge_appliance_parts") {
    return "ge_automated_playwright_spec_capture";
  }
  if (
    manufacturerKey === "everydrop_whirlpool" &&
    row.adapter_discovery_url &&
    row.browser_truth_status === "NOT_CAPTURED"
  ) {
    return "everydrop_whirlpool_playwright_official_capture";
  }
  return "owner_browser_proof_session_assist";
}

export function assessManufacturerBrowserProofSlugV1(args: {
  row: ManufacturerRescueOrchestratorQueueRowV1;
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerBrowserProofSlugAssessmentV1 {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const slug = args.row.filter_slug;
  const manufacturerKey = args.row.manufacturer_key;
  const captureStrategy = resolveManufacturerBrowserCaptureStrategyV1(manufacturerKey, args.row);

  if (args.row.blocked_reasons.some((r) => r.includes("known_broken"))) {
    return {
      filter_slug: slug,
      manufacturer_key: manufacturerKey,
      oem_part_token: args.row.oem_part_token,
      capture_strategy: captureStrategy,
      evidence_status: "BLOCKED",
      owner_proof_artifact_rel: MANUFACTURER_RESCUE_OWNER_PROOF_REL_BY_SLUG_V1[slug] ?? null,
      owner_proof_checked_at: null,
      official_pass: false,
      freshness_notes: null,
      capture_work_required: false,
      capture_work_reason: null,
      target_url: args.row.repo_proven_official_target_url ?? args.row.adapter_discovery_url,
      adapter_discovery_url: args.row.adapter_discovery_url,
      blocked_reasons: args.row.blocked_reasons,
      normalization_draft_rel: null,
      recommended_capture_command: CAPTURE_COMMAND_BY_STRATEGY[captureStrategy],
    };
  }

  const proofLoad = loadManufacturerRescueOwnerBrowserProofArtifactV1({
    rootDir: args.rootDir,
    filter_slug: slug,
    fileExists,
    readText,
  });
  const summary = summarizeManufacturerRescueOwnerBrowserProofEvidenceV1({
    filter_slug: slug,
    artifact: proofLoad.artifact,
    artifact_rel: proofLoad.artifact_rel,
    now: args.now,
  });

  let evidence_status: ManufacturerBrowserProofEvidenceStatusV1;
  if (!proofLoad.artifact) {
    evidence_status = "MISSING";
  } else if (!summary.freshness?.fresh) {
    evidence_status = "STALE";
  } else if (summary.official_pass) {
    evidence_status = "FRESH_OFFICIAL_PASS";
  } else {
    evidence_status = "FRESH_NOT_OFFICIAL_PASS";
  }

  let capture_work_required = false;
  let capture_work_reason: string | null = null;
  if (evidence_status === "MISSING") {
    capture_work_required = isManufacturerRescueBrowserWorkCandidateV1(args.row) || args.row.browser_truth_status !== "PASS";
    capture_work_reason = "owner_browser_proof_artifact_missing";
  } else if (evidence_status === "STALE") {
    capture_work_required = true;
    capture_work_reason = summary.freshness?.notes ?? "browser_proof_stale";
  } else if (evidence_status === "FRESH_NOT_OFFICIAL_PASS") {
    capture_work_required = isManufacturerRescueBrowserWorkCandidateV1(args.row);
    capture_work_reason = "fresh_proof_without_official_pass";
  }

  const target_url =
    args.row.repo_proven_official_target_url ??
    args.row.adapter_discovery_url ??
    proofLoad.artifact?.owner_proof_urls?.[0]?.url ??
    null;

  let normalization_draft_rel: string | null = null;
  if (manufacturerKey === "ge_appliance_parts" && capture_work_required) {
    const geArtifact = loadGeRefrigeratorRescueBrowserEvidenceArtifactV1({
      rootDir: args.rootDir,
      filterSlug: slug,
      fileExists,
      readTextFile: readText,
    });
    if (geArtifact) {
      normalization_draft_rel = manufacturerBrowserProofNormalizationDraftRelV1(slug);
    }
  }

  return {
    filter_slug: slug,
    manufacturer_key: manufacturerKey,
    oem_part_token: args.row.oem_part_token,
    capture_strategy: captureStrategy,
    evidence_status,
    owner_proof_artifact_rel: proofLoad.artifact_rel,
    owner_proof_checked_at: summary.checked_at,
    official_pass: summary.official_pass,
    freshness_notes: summary.freshness?.notes ?? null,
    capture_work_required,
    capture_work_reason,
    target_url,
    adapter_discovery_url: args.row.adapter_discovery_url,
    blocked_reasons: args.row.blocked_reasons,
    normalization_draft_rel,
    recommended_capture_command: CAPTURE_COMMAND_BY_STRATEGY[captureStrategy],
  };
}

export function normalizeGeBrowserEvidenceToOwnerProofDraftV1(args: {
  row: ManufacturerRescueOrchestratorQueueRowV1;
  geArtifact: GeRefrigeratorRescueBrowserEvidenceArtifactV1;
  ownerProofArtifactRel: string;
}): ManufacturerBrowserProofNormalizationDraftV1 {
  const slug = args.row.filter_slug;
  const signals = args.geArtifact.captured_signals;
  const officialUrl = args.geArtifact.target_url;
  const browserStatus = args.geArtifact.browser_truth_status;
  return {
    contract: MANUFACTURER_BROWSER_PROOF_NORMALIZATION_DRAFT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    auto_pass_forbidden: true,
    target_contract: FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
    target_artifact_rel: args.ownerProofArtifactRel,
    filter_slug: slug,
    manufacturer_key: args.row.manufacturer_key,
    oem_part_token: args.row.oem_part_token,
    source_capture_strategy: "ge_automated_playwright_spec_capture",
    source_artifact_rel: geRescueBrowserEvidenceArtifactRelPathV1(slug),
    source_artifact_contract: args.geArtifact.contract,
    normalized_verdict: "NEEDS_OWNER_BROWSER_REVIEW",
    owner_proof_result_draft: {
      slug,
      oem_part_token: args.row.oem_part_token,
      verdict: "NEEDS_OWNER_BROWSER_REVIEW",
      checked_at: args.geArtifact.checked_at,
      capture_method: "ge_automated_playwright_spec_capture_normalized",
      normalization_notes: [
        "Factory never auto-grants PASS_BROWSER_PROOF — owner visual inspection required.",
        `GE browser_truth_status=${browserStatus} mapped for review only.`,
        `GE validation gates: ${args.geArtifact.validation_gates.map((g) => `${g.gate_id}=${g.status}`).join(", ")}`,
      ],
      owner_proof_urls: [
        {
          url: officialUrl,
          retailer: "GE Appliance Parts",
          path_type: "official_manufacturer_pdp",
          browser_proof_status: "NEEDS_OWNER_REVIEW",
          proven_observations: [
            signals.page_title ? `INFERRED title: ${signals.page_title}` : "UNKNOWN title",
            signals.h1_text ? `INFERRED h1: ${signals.h1_text}` : "UNKNOWN h1",
            `INFERRED classification: ${String(signals.classification)}`,
          ],
        },
      ],
    },
    trust_gates_preserved: [
      "exact_token_gate_not_auto_waived",
      "wrong_family_gate_not_auto_waived",
      "official_pdp_path_type_required_for_pass",
      "pass_browser_proof_requires_owner_verdict",
    ],
  };
}

function buildCaptureBatches(
  assessments: ManufacturerBrowserProofSlugAssessmentV1[],
): ManufacturerBrowserProofCaptureBatchV1[] {
  const byKey = new Map<string, ManufacturerBrowserProofSlugAssessmentV1[]>();
  for (const a of assessments) {
    if (!a.capture_work_required) continue;
    const key = `${a.manufacturer_key}::${a.capture_strategy}`;
    const list = byKey.get(key) ?? [];
    list.push(a);
    byKey.set(key, list);
  }

  return Array.from(byKey.entries())
    .map(([key, slugs]) => {
      const [manufacturer_key, capture_strategy] = key.split("::") as [
        string,
        ManufacturerBrowserCaptureStrategyV1,
      ];
      const sorted = slugs.slice().sort((a, b) => a.filter_slug.localeCompare(b.filter_slug));
      const workReasons = Array.from(
        new Set(sorted.map((s) => s.capture_work_reason).filter((r): r is string => Boolean(r))),
      );
      return {
        batch_id: `capture_batch_${manufacturer_key}_${capture_strategy}`,
        manufacturer_key,
        capture_strategy,
        source_command: CAPTURE_COMMAND_BY_STRATEGY[capture_strategy],
        slug_count: sorted.length,
        filter_slugs: sorted.map((s) => s.filter_slug),
        work_reasons: workReasons,
        target_urls: sorted.map((s) => s.target_url).filter((u): u is string => Boolean(u)),
      };
    })
    .sort((a, b) => b.slug_count - a.slug_count || a.manufacturer_key.localeCompare(b.manufacturer_key));
}

export function buildManufacturerBrowserProofFactoryV1(args: {
  rootDir: string;
  orchestrator?: ManufacturerRescueOrchestratorReportV1;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): {
  report: ManufacturerBrowserProofFactoryReportV1;
  normalization_drafts: ManufacturerBrowserProofNormalizationDraftV1[];
} {
  const now = args.now ?? (() => new Date());
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const orchestrator =
    args.orchestrator ??
    loadManufacturerRescueOrchestratorInputV1({
      rootDir: args.rootDir,
      now: args.now,
      fileExists,
      readTextFile: args.readText,
    }).orchestrator;

  const rescueRows = orchestrator.unified_rescue_queue.filter(
    (r) => r.cohort_lane !== "REFERENCE_ALREADY_APPLIED",
  );

  const slug_assessments = rescueRows.map((row) =>
    assessManufacturerBrowserProofSlugV1({
      row,
      rootDir: args.rootDir,
      now: args.now,
      fileExists,
      readText,
    }),
  );

  const normalization_drafts: ManufacturerBrowserProofNormalizationDraftV1[] = [];
  for (const assessment of slug_assessments) {
    if (!assessment.normalization_draft_rel) continue;
    const row = rescueRows.find((r) => r.filter_slug === assessment.filter_slug);
    if (!row) continue;
    const geArtifact = loadGeRefrigeratorRescueBrowserEvidenceArtifactV1({
      rootDir: args.rootDir,
      filterSlug: row.filter_slug,
      fileExists,
      readTextFile: readText,
    });
    if (!geArtifact) continue;
    const ownerRel =
      assessment.owner_proof_artifact_rel ??
      MANUFACTURER_RESCUE_OWNER_PROOF_REL_BY_SLUG_V1[row.filter_slug] ??
      `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-${row.filter_slug}-v1.json`;
    normalization_drafts.push(
      normalizeGeBrowserEvidenceToOwnerProofDraftV1({
        row,
        geArtifact,
        ownerProofArtifactRel: ownerRel,
      }),
    );
  }

  const capture_batches = buildCaptureBatches(slug_assessments);
  const capture_work_required_count = slug_assessments.filter((s) => s.capture_work_required).length;

  const report: ManufacturerBrowserProofFactoryReportV1 = {
    contract: MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
    ...READ_ONLY_MUTATION_FLAGS_V1,
    browser_automation_authorized: false,
    generated_at: now().toISOString(),
    source_command: MANUFACTURER_BROWSER_PROOF_FACTORY_SOURCE_COMMAND_V1,
    orchestrator_contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    orchestrator_generated_at: orchestrator.generated_at,
    browser_proof_max_age_days: MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1,
    slug_assessment_count: slug_assessments.length,
    capture_work_required_count,
    fresh_official_pass_count: slug_assessments.filter((s) => s.evidence_status === "FRESH_OFFICIAL_PASS")
      .length,
    stale_count: slug_assessments.filter((s) => s.evidence_status === "STALE").length,
    missing_count: slug_assessments.filter((s) => s.evidence_status === "MISSING").length,
    blocked_count: slug_assessments.filter((s) => s.evidence_status === "BLOCKED").length,
    slug_assessments,
    capture_batches,
    normalization_draft_rels: normalization_drafts.map((d) =>
      manufacturerBrowserProofNormalizationDraftRelV1(d.filter_slug),
    ),
    inspect_summary: {
      recommended_next_action:
        capture_work_required_count > 0
          ? `Execute ${String(capture_batches.length)} batched capture batch(es) (${String(capture_work_required_count)} slug(s)); owner review required before PASS owner-browser-proof artifacts. Then re-run readiness gate and apply-plan factory.`
          : "No capture work required — re-run readiness gate and apply-plan factory if owner proof already fresh.",
      readiness_gate_note:
        "manufacturer_safe_link_rescue_readiness_gate_v1 remains sole READY_FOR_APPLY promotion authority.",
      apply_plan_factory_note:
        "manufacturer_safe_link_rescue_apply_plan_factory_v1 consumes fresh official PASS owner proof only.",
    },
    proven_facts: [
      "PROVEN: Factory is read-only — no CSV, Supabase, SQL, or production mutation.",
      "PROVEN: auto_pass_forbidden — factory never writes PASS_BROWSER_PROOF verdicts.",
      `PROVEN: assessed ${String(slug_assessments.length)} orchestrator rescue slug(s) using ${String(MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1)}-day freshness contract.`,
      `PROVEN: ${String(capture_batches.length)} batched capture group(s) by manufacturer and strategy.`,
      `PROVEN: ${String(normalization_drafts.length)} GE normalization draft(s) for owner reconciliation (NEEDS_OWNER_BROWSER_REVIEW only).`,
    ],
    unknown_facts: [
      "UNKNOWN: Live production buyer-path parity until post-capture owner proof and census re-run.",
    ],
  };

  return { report, normalization_drafts };
}

export function buildManufacturerBrowserProofCaptureQueueMarkdownV1(
  report: ManufacturerBrowserProofFactoryReportV1,
): string {
  const lines = [
    "# Manufacturer browser proof capture queue v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- orchestrator_generated_at: **${report.orchestrator_generated_at}**`,
    `- capture_work_required_count: **${String(report.capture_work_required_count)}**`,
    `- browser_proof_max_age_days: **${String(report.browser_proof_max_age_days)}**`,
    "",
    "## Batched capture batches",
    "",
  ];

  if (report.capture_batches.length === 0) {
    lines.push("_No capture batches — all slugs fresh PASS or blocked._", "");
  } else {
    for (const batch of report.capture_batches) {
      lines.push(
        `### ${batch.batch_id}`,
        `- manufacturer: **${batch.manufacturer_key}**`,
        `- strategy: **${batch.capture_strategy}**`,
        `- slug_count: **${String(batch.slug_count)}**`,
        `- command: \`${batch.source_command}\``,
        `- slugs: ${batch.filter_slugs.join(", ")}`,
        "",
      );
    }
  }

  lines.push("## Per-slug assessments", "");
  for (const slug of report.slug_assessments.filter((s) => s.capture_work_required)) {
    lines.push(
      `- **${slug.filter_slug}** (${slug.manufacturer_key}) — ${slug.evidence_status}: ${slug.capture_work_reason ?? "work required"}`,
    );
  }
  lines.push("", "## Recommended next action", "", report.inspect_summary.recommended_next_action, "");
  return lines.join("\n");
}

export function buildManufacturerBrowserProofOwnerWorkPacketMarkdownV1(
  report: ManufacturerBrowserProofFactoryReportV1,
): string {
  const lines = [
    "# Manufacturer browser proof owner work packet v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- stale_count: **${String(report.stale_count)}**`,
    `- missing_count: **${String(report.missing_count)}**`,
    "",
    "## Trust gates (never weakened)",
    "",
    "- exact-token proof required before PASS",
    "- wrong-family tokens fail closed",
    "- official PDP path type required for official_pass",
    "- factory never auto-grants PASS_BROWSER_PROOF",
    "",
    "## Owner session work (grouped by strategy)",
    "",
  ];

  const ownerBatches = report.capture_batches.filter(
    (b) => b.capture_strategy === "owner_browser_proof_session_assist",
  );
  if (ownerBatches.length === 0) {
    lines.push("_No owner browser proof session batches pending._", "");
  } else {
    for (const batch of ownerBatches) {
      lines.push(
        `### ${batch.manufacturer_key}`,
        `- slugs: ${batch.filter_slugs.join(", ")}`,
        `- command: \`${batch.source_command}\``,
        "",
      );
      for (const slug of batch.filter_slugs) {
        const assessment = report.slug_assessments.find((s) => s.filter_slug === slug);
        if (!assessment) continue;
        lines.push(
          `- **${slug}** — ${assessment.evidence_status}`,
          `  - target: ${assessment.target_url ?? "UNKNOWN"}`,
          `  - owner proof artifact: \`${assessment.owner_proof_artifact_rel ?? "UNKNOWN"}\``,
        );
      }
      lines.push("");
    }
  }

  if (report.normalization_draft_rels.length > 0) {
    lines.push("## GE normalization drafts (owner reconciliation)", "");
    for (const rel of report.normalization_draft_rels) {
      lines.push(`- \`${rel}\` — NEEDS_OWNER_BROWSER_REVIEW (not PASS)`);
    }
    lines.push("");
  }

  lines.push(
    "## Downstream",
    "",
    report.inspect_summary.readiness_gate_note,
    report.inspect_summary.apply_plan_factory_note,
    "",
    "## Recommended next action",
    "",
    report.inspect_summary.recommended_next_action,
    "",
  );
  return lines.join("\n");
}

export function writeManufacturerBrowserProofFactoryArtifactsV1(args: {
  rootDir: string;
  report: ManufacturerBrowserProofFactoryReportV1;
  normalization_drafts: ManufacturerBrowserProofNormalizationDraftV1[];
}): {
  factoryJsonRelPath: string;
  captureQueueMdRelPath: string;
  ownerWorkPacketMdRelPath: string;
  captureBatchRelPaths: string[];
  normalizationDraftRelPaths: string[];
} {
  const factoryAbs = path.join(args.rootDir, MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1);
  const queueAbs = path.join(args.rootDir, MANUFACTURER_BROWSER_PROOF_CAPTURE_QUEUE_MD_REL_V1);
  const packetAbs = path.join(args.rootDir, MANUFACTURER_BROWSER_PROOF_OWNER_WORK_PACKET_MD_REL_V1);
  mkdirSync(path.dirname(factoryAbs), { recursive: true });
  writeFileSync(factoryAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    queueAbs,
    `${buildManufacturerBrowserProofCaptureQueueMarkdownV1(args.report)}\n`,
    "utf8",
  );
  writeFileSync(
    packetAbs,
    `${buildManufacturerBrowserProofOwnerWorkPacketMarkdownV1(args.report)}\n`,
    "utf8",
  );

  const captureBatchRelPaths: string[] = [];
  for (const batch of args.report.capture_batches) {
    const rel = manufacturerBrowserProofCaptureBatchRelV1({
      manufacturer_key: batch.manufacturer_key,
      capture_strategy: batch.capture_strategy,
    });
    const abs = path.join(args.rootDir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(batch, null, 2)}\n`, "utf8");
    captureBatchRelPaths.push(rel);
  }

  const normalizationDraftRelPaths: string[] = [];
  for (const draft of args.normalization_drafts) {
    const rel = manufacturerBrowserProofNormalizationDraftRelV1(draft.filter_slug);
    const abs = path.join(args.rootDir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(draft, null, 2)}\n`, "utf8");
    normalizationDraftRelPaths.push(rel);
  }

  return {
    factoryJsonRelPath: MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1,
    captureQueueMdRelPath: MANUFACTURER_BROWSER_PROOF_CAPTURE_QUEUE_MD_REL_V1,
    ownerWorkPacketMdRelPath: MANUFACTURER_BROWSER_PROOF_OWNER_WORK_PACKET_MD_REL_V1,
    captureBatchRelPaths,
    normalizationDraftRelPaths,
  };
}

export function loadManufacturerBrowserProofFactoryReportV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerBrowserProofFactoryReportV1 | null {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1);
  if (!fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(readText(abs)) as ManufacturerBrowserProofFactoryReportV1;
    if (parsed.contract !== MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}
