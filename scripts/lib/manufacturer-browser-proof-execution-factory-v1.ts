/**
 * Manufacturer Browser Proof Execution Factory v1 — read-only execution packet producer.
 * Consumes committed refresh-orchestrator, browser-proof-factory, and rescue-orchestrator artifacts only.
 * Never auto-grants PASS_BROWSER_PROOF; reduces repetitive browser-proof preparation only.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { BUCKPARTS_FILTER_LIVE_URL_BASE_V1 } from "./fridge-safe-link-owner-browser-proof-session-v1";
import {
  loadManufacturerBrowserProofFactoryReportV1,
  MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
  MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1,
  MANUFACTURER_BROWSER_PROOF_NORMALIZATION_DRAFT_CONTRACT_V1,
  manufacturerBrowserProofNormalizationDraftRelV1,
  normalizeGeBrowserEvidenceToOwnerProofDraftV1,
  type ManufacturerBrowserCaptureStrategyV1,
  type ManufacturerBrowserProofFactoryReportV1,
  type ManufacturerBrowserProofNormalizationDraftV1,
  type ManufacturerBrowserProofSlugAssessmentV1,
} from "./manufacturer-browser-proof-factory-v1";
import {
  loadManufacturerBrowserProofRefreshOrchestratorReportV1,
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1,
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1,
  type ManufacturerBrowserProofRefreshBatchV1,
  type ManufacturerBrowserProofRefreshOrchestratorReportV1,
  type ManufacturerBrowserProofRefreshWorkItemV1,
} from "./manufacturer-browser-proof-refresh-orchestrator-v1";
import { loadGeRefrigeratorRescueBrowserEvidenceArtifactV1 } from "./ge-refrigerator-rescue-browser-capture-v1";
import { geRescueBrowserEvidenceArtifactRelPathV1 } from "./ge-refrigerator-rescue-adapter-v1";
import { READ_ONLY_MUTATION_FLAGS_V1 } from "./manufacturer-safe-link-rescue-framework-v1";
import {
  MANUFACTURER_RESCUE_OWNER_PROOF_REL_BY_SLUG_V1,
  MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1,
} from "./manufacturer-safe-link-rescue-owner-browser-proof-evidence-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1,
  type ManufacturerRescueOrchestratorQueueRowV1,
  type ManufacturerRescueOrchestratorReportV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";

export const MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1 =
  "manufacturer_browser_proof_execution_factory_v1" as const;

export const MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-browser-proof-execution-factory-v1.json" as const;

export const MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_MD_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-browser-proof-execution-factory-v1.md" as const;

export const MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_SOURCE_COMMAND_V1 =
  "npm run buckparts:manufacturer-browser-proof-execution-factory" as const;

export const MANUFACTURER_BROWSER_PROOF_GE_NORMALIZATION_EXECUTION_PACKET_CONTRACT_V1 =
  "manufacturer_browser_proof_ge_normalization_execution_packet_v1" as const;

export const MANUFACTURER_BROWSER_PROOF_EXECUTION_PACKET_CONTRACT_V1 =
  "manufacturer_browser_proof_execution_packet_v1" as const;

export const MANUFACTURER_BROWSER_PROOF_OWNER_SESSION_PACKET_CONTRACT_V1 =
  "manufacturer_browser_proof_owner_session_packet_v1" as const;

export const MANUFACTURER_BROWSER_PROOF_EXECUTION_MANIFEST_CONTRACT_V1 =
  "manufacturer_browser_proof_execution_manifest_v1" as const;

export type ManufacturerBrowserProofExecutionArtifactIntakeV1 = {
  artifact_rel: string;
  status: "LOADED" | "MISSING" | "INVALID";
  generated_at: string;
};

export type ManufacturerBrowserProofOwnerSessionSlugRowV1 = {
  session_order: number;
  filter_slug: string;
  oem_part_token: string;
  manufacturer_key: string;
  capture_strategy: ManufacturerBrowserCaptureStrategyV1;
  evidence_status: string;
  schedule_reasons: string[];
  refresh_priority: number;
  live_buckparts_url: string;
  exact_urls: Array<{
    priority: number;
    url: string;
    url_role: "official_target" | "adapter_discovery" | "repo_proven_official" | "UNKNOWN";
    notes: string | null;
  }>;
  expected_evidence: {
    owner_proof_artifact_rel: string | null;
    owner_proof_checked_at: string | null;
    official_pass: boolean | "UNKNOWN";
    freshness_notes: string | null;
  };
  required_screenshots: string[];
  validation_checklist: string[];
  pass_criteria: string;
  fail_criteria: string[];
  auto_pass_forbidden: true;
  owner_verdict_options: readonly [
    "PASS_BROWSER_PROOF",
    "FAIL_BROWSER_PROOF",
    "NEEDS_RECONCILIATION",
    "NO_SAFE_LINK_FOUND",
  ];
};

export type ManufacturerBrowserProofOwnerSessionPacketV1 = {
  contract: typeof MANUFACTURER_BROWSER_PROOF_OWNER_SESSION_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  auto_pass_forbidden: true;
  browser_automation_authorized: false;
  batch_id: string;
  manufacturer_key: string;
  slug_count: number;
  session_slugs: ManufacturerBrowserProofOwnerSessionSlugRowV1[];
  pre_session_checklist: string[];
  post_session_owner_action: string;
};

export type ManufacturerBrowserProofGeNormalizationExecutionPacketV1 = {
  contract: typeof MANUFACTURER_BROWSER_PROOF_GE_NORMALIZATION_EXECUTION_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  auto_pass_forbidden: true;
  owner_confirmation_required_before_pass: true;
  filter_slug: string;
  oem_part_token: string;
  manufacturer_key: string;
  normalization_status:
    | "COMMITTED_FACTORY_DRAFT_READY"
    | "GE_EVIDENCE_COMMITTED_PREPARED"
    | "CAPTURE_REQUIRED_UNKNOWN";
  source_ge_evidence_artifact_rel: string | null;
  factory_normalization_draft_rel: string | null;
  prepared_verdict: "NEEDS_OWNER_BROWSER_REVIEW";
  recommended_capture_command: string;
  owner_confirmation_checklist: string[];
  normalization_draft_snapshot: ManufacturerBrowserProofNormalizationDraftV1 | null;
  trust_gates_preserved: string[];
  unknown_gaps: string[];
};

export type ManufacturerBrowserProofExecutionPacketV1 = {
  contract: typeof MANUFACTURER_BROWSER_PROOF_EXECUTION_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  auto_pass_forbidden: true;
  browser_automation_authorized: false;
  batch_id: string;
  manufacturer_key: string;
  scheduled_slug_count: number;
  execution_order: Array<{
    filter_slug: string;
    oem_part_token: string;
    refresh_priority: number;
    capture_strategy: ManufacturerBrowserCaptureStrategyV1;
  }>;
  capture_strategies: ManufacturerBrowserCaptureStrategyV1[];
  capture_commands: string[];
  schedule_reasons: string[];
  ge_normalization_draft_only: boolean;
  pre_execution_checklist: string[];
  post_capture_owner_action: string;
  owner_session_packet_rel: string;
  ge_normalization_packet_rels: string[];
};

export type ManufacturerBrowserProofExecutionManifestV1 = {
  contract: typeof MANUFACTURER_BROWSER_PROOF_EXECUTION_MANIFEST_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  auto_pass_forbidden: true;
  browser_automation_authorized: false;
  batch_id: string;
  manufacturer_key: string;
  scheduled_slug_count: number;
  execution_packet_rel: string;
  owner_session_packet_rel: string;
  ge_normalization_packet_rels: string[];
  refresh_batch_rel: string;
  capture_commands: string[];
  recommended_next_action: string;
};

export type ManufacturerBrowserProofExecutionFactoryReportV1 = {
  contract: typeof MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  auto_pass_forbidden: true;
  generated_at: string;
  source_command: typeof MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_SOURCE_COMMAND_V1;
  refresh_orchestrator_contract: typeof MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1;
  factory_contract: typeof MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1;
  rescue_orchestrator_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1;
  artifact_intake: {
    refresh_orchestrator: ManufacturerBrowserProofExecutionArtifactIntakeV1;
    browser_proof_factory: ManufacturerBrowserProofExecutionArtifactIntakeV1;
    rescue_orchestrator: ManufacturerBrowserProofExecutionArtifactIntakeV1;
  };
  intake_complete: boolean;
  browser_proof_max_age_days: number;
  scheduled_slug_count: number;
  manufacturer_execution_batch_count: number;
  execution_packets: ManufacturerBrowserProofExecutionPacketV1[];
  owner_session_packets: ManufacturerBrowserProofOwnerSessionPacketV1[];
  ge_normalization_packets: ManufacturerBrowserProofGeNormalizationExecutionPacketV1[];
  manufacturer_execution_manifests: ManufacturerBrowserProofExecutionManifestV1[];
  execution_packet_rels: string[];
  owner_session_packet_rels: string[];
  ge_normalization_packet_rels: string[];
  manufacturer_execution_manifest_rels: string[];
  inspect_summary: {
    recommended_next_action: string;
    trust_gate_note: string;
    factory_note: string;
  };
  proven_facts: string[];
  unknown_facts: string[];
};

function sanitizeManufacturerKey(manufacturerKey: string): string {
  return manufacturerKey.replace(/[^a-z0-9]+/g, "-");
}

export function manufacturerBrowserProofExecutionPacketRelV1(manufacturerKey: string): string {
  return `data/fridge/batch-production/drafts/manufacturer-browser-proof-execution-packet-${sanitizeManufacturerKey(manufacturerKey)}-v1.json`;
}

export function manufacturerBrowserProofOwnerSessionPacketRelV1(manufacturerKey: string): string {
  return `data/fridge/batch-production/drafts/manufacturer-browser-proof-owner-session-packet-${sanitizeManufacturerKey(manufacturerKey)}-v1.json`;
}

export function manufacturerBrowserProofExecutionManifestRelV1(manufacturerKey: string): string {
  return `data/fridge/batch-production/drafts/manufacturer-browser-proof-execution-manifest-${sanitizeManufacturerKey(manufacturerKey)}-v1.json`;
}

export function manufacturerBrowserProofGeNormalizationExecutionPacketRelV1(slug: string): string {
  return `data/fridge/batch-production/drafts/manufacturer-browser-proof-ge-normalization-packet-${slug.trim().toLowerCase()}-v1.json`;
}

function loadCommittedRescueOrchestratorReportV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerRescueOrchestratorReportV1 | null {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1);
  if (!fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(readText(abs)) as ManufacturerRescueOrchestratorReportV1;
    if (parsed.contract !== MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function loadCommittedNormalizationDraftV1(args: {
  rootDir: string;
  rel: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerBrowserProofNormalizationDraftV1 | null {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, args.rel);
  if (!fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(readText(abs)) as ManufacturerBrowserProofNormalizationDraftV1;
    if (parsed.contract !== MANUFACTURER_BROWSER_PROOF_NORMALIZATION_DRAFT_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function assessmentMap(
  factory: ManufacturerBrowserProofFactoryReportV1,
): Map<string, ManufacturerBrowserProofSlugAssessmentV1> {
  return new Map(factory.slug_assessments.map((a) => [a.filter_slug, a]));
}

function orchestratorRowMap(
  orchestrator: ManufacturerRescueOrchestratorReportV1 | null,
): Map<string, ManufacturerRescueOrchestratorQueueRowV1> {
  if (!orchestrator) return new Map();
  return new Map(orchestrator.unified_rescue_queue.map((row) => [row.filter_slug, row]));
}

function recommendedScreenshotNames(slug: string): string[] {
  return [
    `${slug}-official-pdp-full-page.png`,
    `${slug}-oem-token-visible.png`,
    `${slug}-buy-or-add-to-cart-visible.png`,
  ];
}

function validationChecklistForStrategy(args: {
  strategy: ManufacturerBrowserCaptureStrategyV1;
  maxAgeDays: number;
}): string[] {
  const common = [
    `Confirm owner proof artifact is dated within ${String(args.maxAgeDays)} days before PASS.`,
    "Exact OEM part token visible on official manufacturer PDP.",
    "Page is official manufacturer product detail — not search placeholder or third-party listing.",
    "No wrong-family product signals (forbidden cross-family tokens absent).",
    "Owner records verdict manually — factory never auto-grants PASS_BROWSER_PROOF.",
  ];
  switch (args.strategy) {
    case "ge_automated_playwright_spec_capture":
      return [
        ...common,
        "Run GE Playwright capture command only when owner-authorized; review GE evidence artifact before PASS.",
        "Reconcile GE normalization draft — owner confirmation required before PASS_BROWSER_PROOF.",
      ];
    case "everydrop_whirlpool_playwright_official_capture":
      return [
        ...common,
        "Everydrop official capture requires owner-authorized Playwright run — no auto PASS from factory.",
        "Confirm adapter_discovery_url resolves to official Whirlpool/Everydrop PDP.",
      ];
    default:
      return [
        ...common,
        "Complete visual owner browser session — compare live page to OEM token and BuckParts filter page.",
      ];
  }
}

function buildExactUrls(args: {
  workItem: ManufacturerBrowserProofRefreshWorkItemV1;
  assessment: ManufacturerBrowserProofSlugAssessmentV1 | undefined;
  orchestratorRow: ManufacturerRescueOrchestratorQueueRowV1 | undefined;
}): ManufacturerBrowserProofOwnerSessionSlugRowV1["exact_urls"] {
  const urls: ManufacturerBrowserProofOwnerSessionSlugRowV1["exact_urls"] = [];
  let priority = 1;
  const push = (
    url: string | null | undefined,
    url_role: ManufacturerBrowserProofOwnerSessionSlugRowV1["exact_urls"][number]["url_role"],
    notes: string | null,
  ) => {
    if (!url) return;
    urls.push({ priority, url, url_role, notes });
    priority += 1;
  };
  push(args.workItem.target_url, "official_target", "Primary target from factory assessment");
  push(args.assessment?.adapter_discovery_url, "adapter_discovery", "Adapter discovery URL from factory");
  push(
    args.orchestratorRow?.repo_proven_official_target_url,
    "repo_proven_official",
    "Repo-proven official target from rescue orchestrator",
  );
  if (urls.length === 0) {
    urls.push({
      priority: 1,
      url: "UNKNOWN",
      url_role: "UNKNOWN",
      notes: "No committed target URL — owner must identify official PDP manually.",
    });
  }
  return urls;
}

function buildOwnerSessionSlugRow(args: {
  sessionOrder: number;
  workItem: ManufacturerBrowserProofRefreshWorkItemV1;
  assessment: ManufacturerBrowserProofSlugAssessmentV1 | undefined;
  orchestratorRow: ManufacturerRescueOrchestratorQueueRowV1 | undefined;
  maxAgeDays: number;
}): ManufacturerBrowserProofOwnerSessionSlugRowV1 {
  const slug = args.workItem.filter_slug;
  return {
    session_order: args.sessionOrder,
    filter_slug: slug,
    oem_part_token: args.workItem.oem_part_token,
    manufacturer_key: args.assessment?.manufacturer_key ?? args.orchestratorRow?.manufacturer_key ?? "UNKNOWN",
    capture_strategy: args.workItem.capture_strategy,
    evidence_status: args.workItem.evidence_status,
    schedule_reasons: args.workItem.schedule_reasons,
    refresh_priority: args.workItem.refresh_priority,
    live_buckparts_url: `${BUCKPARTS_FILTER_LIVE_URL_BASE_V1}${slug}`,
    exact_urls: buildExactUrls(args),
    expected_evidence: {
      owner_proof_artifact_rel:
        args.workItem.owner_proof_artifact_rel ??
        args.assessment?.owner_proof_artifact_rel ??
        MANUFACTURER_RESCUE_OWNER_PROOF_REL_BY_SLUG_V1[slug] ??
        null,
      owner_proof_checked_at: args.assessment?.owner_proof_checked_at ?? null,
      official_pass: args.assessment?.official_pass ?? "UNKNOWN",
      freshness_notes: args.assessment?.freshness_notes ?? null,
    },
    required_screenshots: recommendedScreenshotNames(slug),
    validation_checklist: validationChecklistForStrategy({
      strategy: args.workItem.capture_strategy,
      maxAgeDays: args.maxAgeDays,
    }),
    pass_criteria:
      "Owner visually confirms exact OEM token on official manufacturer PDP with no wrong-family signals; commits PASS_BROWSER_PROOF verdict to owner proof artifact only after review.",
    fail_criteria: [
      "Search placeholder or non-official listing is primary buy path.",
      "OEM token mismatch or wrong-family product detected.",
      "Page unreachable or evidence stale beyond max age contract.",
    ],
    auto_pass_forbidden: true,
    owner_verdict_options: [
      "PASS_BROWSER_PROOF",
      "FAIL_BROWSER_PROOF",
      "NEEDS_RECONCILIATION",
      "NO_SAFE_LINK_FOUND",
    ],
  };
}

export function buildManufacturerBrowserProofGeNormalizationExecutionPacketV1(args: {
  rootDir: string;
  workItem: ManufacturerBrowserProofRefreshWorkItemV1;
  assessment: ManufacturerBrowserProofSlugAssessmentV1 | undefined;
  orchestratorRow: ManufacturerRescueOrchestratorQueueRowV1 | undefined;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerBrowserProofGeNormalizationExecutionPacketV1 {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const slug = args.workItem.filter_slug;
  const factoryDraftRel =
    args.assessment?.normalization_draft_rel ?? manufacturerBrowserProofNormalizationDraftRelV1(slug);
  const committedFactoryDraft = loadCommittedNormalizationDraftV1({
    rootDir: args.rootDir,
    rel: factoryDraftRel,
    fileExists,
    readText,
  });
  const geEvidenceRel = geRescueBrowserEvidenceArtifactRelPathV1(slug);
  const geEvidence = loadGeRefrigeratorRescueBrowserEvidenceArtifactV1({
    rootDir: args.rootDir,
    filterSlug: slug,
    fileExists,
    readTextFile: readText,
  });

  let normalization_status: ManufacturerBrowserProofGeNormalizationExecutionPacketV1["normalization_status"] =
    "CAPTURE_REQUIRED_UNKNOWN";
  let normalization_draft_snapshot: ManufacturerBrowserProofNormalizationDraftV1 | null = null;
  const unknown_gaps: string[] = [];

  if (committedFactoryDraft) {
    normalization_status = "COMMITTED_FACTORY_DRAFT_READY";
    normalization_draft_snapshot = committedFactoryDraft;
  } else if (geEvidence && args.orchestratorRow) {
    normalization_status = "GE_EVIDENCE_COMMITTED_PREPARED";
    const ownerProofRel =
      MANUFACTURER_RESCUE_OWNER_PROOF_REL_BY_SLUG_V1[slug] ??
      `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-${slug}-v1.json`;
    normalization_draft_snapshot = normalizeGeBrowserEvidenceToOwnerProofDraftV1({
      row: args.orchestratorRow,
      geArtifact: geEvidence,
      ownerProofArtifactRel: ownerProofRel,
    });
  } else {
    unknown_gaps.push(
      "UNKNOWN: GE browser evidence artifact not committed — run recommended capture command before normalization review.",
    );
    if (!args.orchestratorRow) {
      unknown_gaps.push("UNKNOWN: rescue orchestrator row missing — OEM context incomplete.");
    }
  }

  return {
    contract: MANUFACTURER_BROWSER_PROOF_GE_NORMALIZATION_EXECUTION_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    auto_pass_forbidden: true,
    owner_confirmation_required_before_pass: true,
    filter_slug: slug,
    oem_part_token: args.workItem.oem_part_token,
    manufacturer_key: args.assessment?.manufacturer_key ?? args.orchestratorRow?.manufacturer_key ?? "UNKNOWN",
    normalization_status,
    source_ge_evidence_artifact_rel: geEvidence ? geEvidenceRel : null,
    factory_normalization_draft_rel: committedFactoryDraft ? factoryDraftRel : null,
    prepared_verdict: "NEEDS_OWNER_BROWSER_REVIEW",
    recommended_capture_command: args.workItem.recommended_capture_command,
    owner_confirmation_checklist: [
      "Review GE Playwright capture output and normalization draft snapshot.",
      "Confirm exact OEM token and official GE Appliance Parts PDP path type.",
      "Owner must explicitly set PASS_BROWSER_PROOF — factory never auto-grants PASS.",
      "If normalization_status=CAPTURE_REQUIRED_UNKNOWN, run capture command before review.",
    ],
    normalization_draft_snapshot,
    trust_gates_preserved: [
      "exact_token_gate_not_auto_waived",
      "wrong_family_gate_not_auto_waived",
      "official_pdp_path_type_required_for_pass",
      "pass_browser_proof_requires_owner_verdict",
    ],
    unknown_gaps,
  };
}

function buildExecutionPacketForBatch(args: {
  batch: ManufacturerBrowserProofRefreshBatchV1;
  ownerSessionPacketRel: string;
  geNormalizationPacketRels: string[];
}): ManufacturerBrowserProofExecutionPacketV1 {
  const execution_order = args.batch.work_items
    .slice()
    .sort((a, b) => b.refresh_priority - a.refresh_priority || a.filter_slug.localeCompare(b.filter_slug))
    .map((item) => ({
      filter_slug: item.filter_slug,
      oem_part_token: item.oem_part_token,
      refresh_priority: item.refresh_priority,
      capture_strategy: item.capture_strategy,
    }));

  return {
    contract: MANUFACTURER_BROWSER_PROOF_EXECUTION_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    auto_pass_forbidden: true,
    browser_automation_authorized: false,
    batch_id: args.batch.batch_id,
    manufacturer_key: args.batch.manufacturer_key,
    scheduled_slug_count: args.batch.scheduled_slug_count,
    execution_order,
    capture_strategies: args.batch.capture_strategies,
    capture_commands: args.batch.capture_commands,
    schedule_reasons: args.batch.schedule_reasons,
    ge_normalization_draft_only: args.batch.ge_normalization_draft_only,
    pre_execution_checklist: [
      "Confirm refresh orchestrator batch is current — do not skip stale upstream artifacts.",
      "Factory is read-only — capture commands listed for owner reference only; browser_automation_authorized=false.",
      "Never commit PASS_BROWSER_PROOF without owner visual review.",
      args.batch.ge_normalization_draft_only
        ? "GE batch: reconcile normalization execution packets before owner PASS."
        : "Owner session packet lists exact URLs and screenshot requirements per slug.",
    ],
    post_capture_owner_action: args.batch.post_capture_owner_action,
    owner_session_packet_rel: args.ownerSessionPacketRel,
    ge_normalization_packet_rels: args.geNormalizationPacketRels,
  };
}

function buildOwnerSessionPacketForBatch(args: {
  batch: ManufacturerBrowserProofRefreshBatchV1;
  assessments: Map<string, ManufacturerBrowserProofSlugAssessmentV1>;
  orchestratorRows: Map<string, ManufacturerRescueOrchestratorQueueRowV1>;
  maxAgeDays: number;
}): ManufacturerBrowserProofOwnerSessionPacketV1 {
  const sorted = args.batch.work_items
    .slice()
    .sort((a, b) => b.refresh_priority - a.refresh_priority || a.filter_slug.localeCompare(b.filter_slug));

  return {
    contract: MANUFACTURER_BROWSER_PROOF_OWNER_SESSION_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    auto_pass_forbidden: true,
    browser_automation_authorized: false,
    batch_id: args.batch.batch_id,
    manufacturer_key: args.batch.manufacturer_key,
    slug_count: sorted.length,
    session_slugs: sorted.map((item, index) =>
      buildOwnerSessionSlugRow({
        sessionOrder: index + 1,
        workItem: item,
        assessment: args.assessments.get(item.filter_slug),
        orchestratorRow: args.orchestratorRows.get(item.filter_slug),
        maxAgeDays: args.maxAgeDays,
      }),
    ),
    pre_session_checklist: [
      "Open owner session packet slugs in priority order.",
      "Use exact_urls — do not substitute search results or retailer guesses.",
      "Capture required_screenshots before recording owner proof verdict.",
    ],
    post_session_owner_action: args.batch.post_capture_owner_action,
  };
}

function buildExecutionManifestForBatch(args: {
  batch: ManufacturerBrowserProofRefreshBatchV1;
  executionPacketRel: string;
  ownerSessionPacketRel: string;
  geNormalizationPacketRels: string[];
}): ManufacturerBrowserProofExecutionManifestV1 {
  return {
    contract: MANUFACTURER_BROWSER_PROOF_EXECUTION_MANIFEST_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    auto_pass_forbidden: true,
    browser_automation_authorized: false,
    batch_id: args.batch.batch_id,
    manufacturer_key: args.batch.manufacturer_key,
    scheduled_slug_count: args.batch.scheduled_slug_count,
    execution_packet_rel: args.executionPacketRel,
    owner_session_packet_rel: args.ownerSessionPacketRel,
    ge_normalization_packet_rels: args.geNormalizationPacketRels,
    refresh_batch_rel: `data/fridge/batch-production/drafts/manufacturer-browser-proof-refresh-batch-${sanitizeManufacturerKey(args.batch.manufacturer_key)}-v1.json`,
    capture_commands: args.batch.capture_commands,
    recommended_next_action: args.batch.post_capture_owner_action,
  };
}

export function buildManufacturerBrowserProofExecutionFactoryV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  refreshOrchestrator?: ManufacturerBrowserProofRefreshOrchestratorReportV1;
  factory?: ManufacturerBrowserProofFactoryReportV1;
  rescueOrchestrator?: ManufacturerRescueOrchestratorReportV1 | null;
}): ManufacturerBrowserProofExecutionFactoryReportV1 {
  const now = args.now ?? (() => new Date());
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));

  const refreshOrchestrator =
    args.refreshOrchestrator ??
    loadManufacturerBrowserProofRefreshOrchestratorReportV1({
      rootDir: args.rootDir,
      fileExists,
      readText,
    });
  if (!refreshOrchestrator) {
    throw new Error(
      `manufacturer-browser-proof-refresh-orchestrator artifact missing at ${MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1}; run npm run buckparts:manufacturer-browser-proof-refresh-orchestrator first`,
    );
  }

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

  const rescueOrchestrator =
    args.rescueOrchestrator !== undefined
      ? args.rescueOrchestrator
      : loadCommittedRescueOrchestratorReportV1({
          rootDir: args.rootDir,
          fileExists,
          readText,
        });

  const assessments = assessmentMap(factory);
  const orchestratorRows = orchestratorRowMap(rescueOrchestrator);
  const maxAgeDays =
    factory.browser_proof_max_age_days ?? MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1;

  const execution_packets: ManufacturerBrowserProofExecutionPacketV1[] = [];
  const owner_session_packets: ManufacturerBrowserProofOwnerSessionPacketV1[] = [];
  const ge_normalization_packets: ManufacturerBrowserProofGeNormalizationExecutionPacketV1[] = [];
  const manufacturer_execution_manifests: ManufacturerBrowserProofExecutionManifestV1[] = [];
  const execution_packet_rels: string[] = [];
  const owner_session_packet_rels: string[] = [];
  const ge_normalization_packet_rels: string[] = [];
  const manufacturer_execution_manifest_rels: string[] = [];

  for (const batch of refreshOrchestrator.manufacturer_refresh_batches) {
    const ownerSessionPacketRel = manufacturerBrowserProofOwnerSessionPacketRelV1(batch.manufacturer_key);
    const batchGeRels: string[] = [];

    for (const item of batch.work_items) {
      if (item.capture_strategy !== "ge_automated_playwright_spec_capture") continue;
      const gePacket = buildManufacturerBrowserProofGeNormalizationExecutionPacketV1({
        rootDir: args.rootDir,
        workItem: item,
        assessment: assessments.get(item.filter_slug),
        orchestratorRow: orchestratorRows.get(item.filter_slug),
        fileExists,
        readText,
      });
      ge_normalization_packets.push(gePacket);
      const geRel = manufacturerBrowserProofGeNormalizationExecutionPacketRelV1(item.filter_slug);
      ge_normalization_packet_rels.push(geRel);
      batchGeRels.push(geRel);
    }

    const ownerSession = buildOwnerSessionPacketForBatch({
      batch,
      assessments,
      orchestratorRows,
      maxAgeDays,
    });
    owner_session_packets.push(ownerSession);
    owner_session_packet_rels.push(ownerSessionPacketRel);

    const executionPacket = buildExecutionPacketForBatch({
      batch,
      ownerSessionPacketRel,
      geNormalizationPacketRels: batchGeRels,
    });
    execution_packets.push(executionPacket);
    execution_packet_rels.push(manufacturerBrowserProofExecutionPacketRelV1(batch.manufacturer_key));

    manufacturer_execution_manifests.push(
      buildExecutionManifestForBatch({
        batch,
        executionPacketRel: manufacturerBrowserProofExecutionPacketRelV1(batch.manufacturer_key),
        ownerSessionPacketRel,
        geNormalizationPacketRels: batchGeRels,
      }),
    );
    manufacturer_execution_manifest_rels.push(
      manufacturerBrowserProofExecutionManifestRelV1(batch.manufacturer_key),
    );
  }

  const scheduled_slug_count = refreshOrchestrator.scheduled_slug_count;
  const intake_complete =
    refreshOrchestrator.contract === MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1 &&
    factory.contract === MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1 &&
    rescueOrchestrator !== null;

  return {
    contract: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1,
    ...READ_ONLY_MUTATION_FLAGS_V1,
    browser_automation_authorized: false,
    auto_pass_forbidden: true,
    generated_at: now().toISOString(),
    source_command: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_SOURCE_COMMAND_V1,
    refresh_orchestrator_contract: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1,
    factory_contract: MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
    rescue_orchestrator_contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    artifact_intake: {
      refresh_orchestrator: {
        artifact_rel: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1,
        status: "LOADED",
        generated_at: refreshOrchestrator.generated_at,
      },
      browser_proof_factory: {
        artifact_rel: MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1,
        status: "LOADED",
        generated_at: factory.generated_at,
      },
      rescue_orchestrator: {
        artifact_rel: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1,
        status: rescueOrchestrator ? "LOADED" : "MISSING",
        generated_at: rescueOrchestrator?.generated_at ?? "UNKNOWN",
      },
    },
    intake_complete,
    browser_proof_max_age_days: maxAgeDays,
    scheduled_slug_count,
    manufacturer_execution_batch_count: refreshOrchestrator.manufacturer_refresh_batch_count,
    execution_packets,
    owner_session_packets,
    ge_normalization_packets,
    manufacturer_execution_manifests,
    execution_packet_rels,
    owner_session_packet_rels,
    ge_normalization_packet_rels,
    manufacturer_execution_manifest_rels,
    inspect_summary: {
      recommended_next_action:
        scheduled_slug_count > 0
          ? `Execute ${String(manufacturer_execution_manifests.length)} manufacturer execution manifest(s) in refresh priority order; complete owner session packets and GE normalization reviews before PASS owner-browser-proof artifacts. Then re-run factory, readiness gate, and apply-plan factory.`
          : "No execution packets — refresh orchestrator reports zero scheduled slugs.",
      trust_gate_note:
        "Execution factory never auto-grants PASS_BROWSER_PROOF — owner confirmation required for all strategies.",
      factory_note:
        "Consumes committed refresh-orchestrator, browser-proof-factory, and rescue-orchestrator artifacts only — does not rebuild upstream systems.",
    },
    proven_facts: [
      "PROVEN: Execution factory is read-only — browser_automation_authorized=false; auto_pass_forbidden=true.",
      `PROVEN: ${String(scheduled_slug_count)} slug(s) across ${String(manufacturer_execution_manifests.length)} manufacturer execution manifest(s) from committed refresh orchestrator.`,
      `PROVEN: ${String(ge_normalization_packets.length)} GE normalization execution packet(s) prepared (owner confirmation required before PASS).`,
      intake_complete
        ? "PROVEN: All three upstream committed artifacts loaded."
        : "PROVEN: rescue orchestrator artifact missing — intake_complete=false; some URL context may be UNKNOWN.",
    ],
    unknown_facts: [
      "UNKNOWN: Live production buyer-path parity until post-capture owner proof committed.",
      "UNKNOWN: Post-execution readiness gate outcome until owner PASS proof artifacts committed.",
      !intake_complete
        ? "UNKNOWN: Rescue orchestrator row context incomplete — exact_urls may include UNKNOWN placeholders."
        : "UNKNOWN: Owner review throughput (slugs/session) — no committed velocity metric.",
    ],
  };
}

export function buildManufacturerBrowserProofExecutionFactoryMarkdownV1(
  report: ManufacturerBrowserProofExecutionFactoryReportV1,
): string {
  const lines = [
    "# Manufacturer browser proof execution factory v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- intake_complete: **${String(report.intake_complete)}**`,
    `- scheduled_slug_count: **${String(report.scheduled_slug_count)}**`,
    `- manufacturer_execution_batch_count: **${String(report.manufacturer_execution_batch_count)}**`,
    `- ge_normalization_packet_count: **${String(report.ge_normalization_packets.length)}**`,
    `- auto_pass_forbidden: **true**`,
    "",
    "## Manufacturer execution manifests",
    "",
  ];

  if (report.manufacturer_execution_manifests.length === 0) {
    lines.push("_No execution manifests — refresh orchestrator scheduled zero slugs._", "");
  } else {
    for (const manifest of report.manufacturer_execution_manifests) {
      lines.push(
        `### ${manifest.batch_id}`,
        `- manufacturer: **${manifest.manufacturer_key}**`,
        `- scheduled_slug_count: **${String(manifest.scheduled_slug_count)}**`,
        `- execution_packet: \`${manifest.execution_packet_rel}\``,
        `- owner_session_packet: \`${manifest.owner_session_packet_rel}\``,
        `- ge_normalization_packets: ${String(manifest.ge_normalization_packet_rels.length)}`,
        "",
      );
    }
  }

  lines.push("## Recommended next action", "", report.inspect_summary.recommended_next_action, "");
  return lines.join("\n");
}

export function writeManufacturerBrowserProofExecutionFactoryArtifactsV1(args: {
  rootDir: string;
  report: ManufacturerBrowserProofExecutionFactoryReportV1;
}): {
  factoryJsonRelPath: string;
  factoryMdRelPath: string;
  executionPacketRelPaths: string[];
  ownerSessionPacketRelPaths: string[];
  geNormalizationPacketRelPaths: string[];
  executionManifestRelPaths: string[];
} {
  const jsonAbs = path.join(args.rootDir, MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    `${buildManufacturerBrowserProofExecutionFactoryMarkdownV1(args.report)}\n`,
    "utf8",
  );

  const executionPacketRelPaths: string[] = [];
  for (const packet of args.report.execution_packets) {
    const rel = manufacturerBrowserProofExecutionPacketRelV1(packet.manufacturer_key);
    const abs = path.join(args.rootDir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
    executionPacketRelPaths.push(rel);
  }

  const ownerSessionPacketRelPaths: string[] = [];
  for (const packet of args.report.owner_session_packets) {
    const rel = manufacturerBrowserProofOwnerSessionPacketRelV1(packet.manufacturer_key);
    const abs = path.join(args.rootDir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
    ownerSessionPacketRelPaths.push(rel);
  }

  const geNormalizationPacketRelPaths: string[] = [];
  for (const packet of args.report.ge_normalization_packets) {
    const rel = manufacturerBrowserProofGeNormalizationExecutionPacketRelV1(packet.filter_slug);
    const abs = path.join(args.rootDir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
    geNormalizationPacketRelPaths.push(rel);
  }

  const executionManifestRelPaths: string[] = [];
  for (const manifest of args.report.manufacturer_execution_manifests) {
    const rel = manufacturerBrowserProofExecutionManifestRelV1(manifest.manufacturer_key);
    const abs = path.join(args.rootDir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    executionManifestRelPaths.push(rel);
  }

  return {
    factoryJsonRelPath: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_JSON_REL_V1,
    factoryMdRelPath: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_MD_REL_V1,
    executionPacketRelPaths,
    ownerSessionPacketRelPaths,
    geNormalizationPacketRelPaths,
    executionManifestRelPaths,
  };
}

export function loadManufacturerBrowserProofExecutionFactoryReportV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerBrowserProofExecutionFactoryReportV1 | null {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_JSON_REL_V1);
  if (!fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(readText(abs)) as ManufacturerBrowserProofExecutionFactoryReportV1;
    if (parsed.contract !== MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}
