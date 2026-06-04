/**
 * BuckParts ops-agent workflow v1 — doctrine packet contracts (types + guards).
 * Documentation: docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md
 * No Mission Control runtime; read-only validation helpers for tests and future ingest.
 */

export const OPS_AGENT_WORKFLOW_DOC_REL_V1 = "docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md" as const;

export const COMMAND_CENTER_TASK_PACKET_CONTRACT_V1 =
  "buckparts_command_center_task_packet_v1" as const;

export const HYPERAGENT_BATCH_BUNDLE_CONTRACT_V1 =
  "buckparts_hyperagent_batch_bundle_v1" as const;

export const HYPERAGENT_BATCH_MANIFEST_CONTRACT_V1 =
  "buckparts_hyperagent_batch_manifest_v1" as const;

export const HYPERAGENT_INGEST_PACKET_CONTRACT_V1 =
  "buckparts_hyperagent_ingest_packet_v1" as const;

/** Cursor validation hard-fail when bundle packets are not full Mission Control bodies. */
export const CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED =
  "FULL_HYPERAGENT_PACKET_BODIES_REQUIRED" as const;

/** Allowed provenance for per-slug packets in a truth-validation bundle. */
export const VALID_HYPERAGENT_PACKET_BODY_SOURCE_V1 = "hyperagent_mission_control" as const;

/** Sources that must never pass Cursor truth validation. */
export const INVALID_HYPERAGENT_PACKET_BODY_SOURCES_V1 = [
  "stub",
  "materialized",
  "synthetic",
  "repo_join",
  "cursor_synthesis",
  "dev_only",
] as const;

export const FRIDGE_SAFE_LINK_BATCH_COHORT_SIZE_V1 = 26 as const;

const UUID_V4ISH_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STUB_SPECIALIST_SUMMARY_RE = /^(Discovery|TruthRisk) for [a-z0-9-]+$/i;

export const CURSOR_VALIDATION_PACKET_CONTRACT_V1 =
  "buckparts_cursor_validation_packet_v1" as const;

export const COMMAND_CENTER_STATUS_UPDATE_PACKET_CONTRACT_V1 =
  "buckparts_command_center_status_update_packet_v1" as const;

export const OPS_AGENT_MISSION_TYPES_V1 = [
  "SAFE_LINK_BATCH",
  "FOH",
  "GRANT",
  "RUNNER",
  "CUSTOM",
] as const;

export const OPS_AGENT_DEFAULT_MISSION_TYPE_V1 = "SAFE_LINK_BATCH" as const;

export const ONE_PRODUCT_EXCEPTIONS_V1 = [
  "TEST",
  "PROOF",
  "DEBUG",
  "BLOCKER_RECONCILIATION",
] as const;

/** HyperAgent discovery/workflow statuses only — not repo truth closure. */
export const HYPERAGENT_DISCOVERY_STATUSES_V1 = [
  "DISCOVERY_OPEN",
  "DISCOVERY_COMPLETE",
  "DISCOVERY_BLOCKED",
] as const;

/** Forbidden on HyperAgent ingest — repo/batch-factory truth-closure vocabulary. */
export const HYPERAGENT_FORBIDDEN_TRUTH_CLOSURE_STATUSES_V1 = [
  "APPLY_ELIGIBLE_WITH_EXISTING_PROOF",
  "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF",
  "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED",
  "CONFLICT_REQUIRES_RECONCILIATION",
  "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL",
  "DO_NOT_USE_WRONG_PART_RISK",
  "VALIDATION_PASS",
  "VALIDATION_FAIL",
  "PARITY_APPLIED",
  "PROVEN",
  "CLOSEOUT_COMPLETE",
  "APPLIED",
] as const;

export const CURSOR_VALIDATION_STATUSES_V1 = [
  "VALIDATION_PASS",
  "VALIDATION_FAIL",
  "VALIDATION_PARTIAL",
] as const;

export type OneProductExceptionV1 = (typeof ONE_PRODUCT_EXCEPTIONS_V1)[number];

export type CommandCenterTaskPacketV1 = {
  contract: typeof COMMAND_CENTER_TASK_PACKET_CONTRACT_V1;
  task_id: string;
  created_at: string;
  mission_type: (typeof OPS_AGENT_MISSION_TYPES_V1)[number];
  title: string;
  source_command_center_lanes: string[];
  cohort_key?: string | null;
  expected_coverage_delta?: number | null;
  owner_browser_needed_count?: number | null;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  hyperagent_dispatch_authorized: boolean;
  cursor_validation_required: true;
  one_product_exception: OneProductExceptionV1 | null;
  proven_facts?: string[];
  unknown_facts?: string[];
};

export type HyperAgentIngestPacketV1 = {
  contract: typeof HYPERAGENT_INGEST_PACKET_CONTRACT_V1;
  ingest_id: string;
  task_id: string;
  created_at: string;
  discovery_status: (typeof HYPERAGENT_DISCOVERY_STATUSES_V1)[number];
  truth_closure_claimed: false;
  specialist_outputs: Array<{ specialist: string; summary: string }>;
  candidate_rows: Array<{
    slug: string;
    candidate_url: string | null;
    source_type: string;
    notes: string;
  }>;
  conflicts: string[];
  read_only: true;
  data_mutation: false;
  not_authorized: string[];
  proven_facts?: string[];
  unknown_facts?: string[];
};

export type CursorValidationPacketV1 = {
  contract: typeof CURSOR_VALIDATION_PACKET_CONTRACT_V1;
  validation_id: string;
  task_id: string;
  ingest_id: string | null;
  validated_at: string;
  validation_status: (typeof CURSOR_VALIDATION_STATUSES_V1)[number];
  commands_run: string[];
  batch_factory_artifacts: string[];
  truth_closure_authorized: boolean;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  proven_facts?: string[];
  unknown_facts?: string[];
};

export type CommandCenterStatusUpdatePacketV1 = {
  contract: typeof COMMAND_CENTER_STATUS_UPDATE_PACKET_CONTRACT_V1;
  update_id: string;
  task_id: string;
  validation_id: string;
  requires_validation_id: true;
  updated_at: string;
  lane_status_deltas: Array<{ lane: string; status: string; note: string }>;
  cc_refresh_command: string;
  read_only: true;
  data_mutation: false;
  applied: boolean;
  proven_facts?: string[];
  unknown_facts?: string[];
};

export function isHyperAgentDiscoveryStatusV1(status: string): boolean {
  return (HYPERAGENT_DISCOVERY_STATUSES_V1 as readonly string[]).includes(status);
}

export function isForbiddenHyperAgentTruthClosureStatusV1(status: string): boolean {
  return (HYPERAGENT_FORBIDDEN_TRUTH_CLOSURE_STATUSES_V1 as readonly string[]).includes(status);
}

export function assertHyperAgentIngestNotTruthClosure(packet: Pick<HyperAgentIngestPacketV1, "discovery_status" | "truth_closure_claimed">): void {
  if (packet.truth_closure_claimed !== false) {
    throw new Error("hyperagent_ingest: truth_closure_claimed must be false");
  }
  if (!isHyperAgentDiscoveryStatusV1(packet.discovery_status)) {
    throw new Error(`hyperagent_ingest: invalid discovery_status ${packet.discovery_status}`);
  }
  if (isForbiddenHyperAgentTruthClosureStatusV1(packet.discovery_status)) {
    throw new Error(`hyperagent_ingest: discovery_status must not be truth-closure vocabulary: ${packet.discovery_status}`);
  }
}

export function assertCommandCenterClosureRequiresValidation(args: {
  validation: Pick<CursorValidationPacketV1, "validation_status" | "truth_closure_authorized"> | null;
  statusUpdate: Pick<CommandCenterStatusUpdatePacketV1, "validation_id" | "requires_validation_id">;
}): void {
  if (!args.statusUpdate.requires_validation_id) {
    throw new Error("command_center_status_update: requires_validation_id must be true");
  }
  if (!args.statusUpdate.validation_id?.trim()) {
    throw new Error("command_center_status_update: validation_id required");
  }
  if (!args.validation) {
    throw new Error("command_center_status_update: validation packet required before closure");
  }
  if (args.validation.validation_status !== "VALIDATION_PASS") {
    throw new Error("command_center_status_update: validation_status must be VALIDATION_PASS for closure");
  }
  if (!args.validation.truth_closure_authorized) {
    throw new Error("command_center_status_update: truth_closure_authorized must be true on validation packet");
  }
}

/** Redirect one-slug safe-link missions to batch/factory unless explicitly excepted. */
export function shouldRedirectOneProductSafeLinkWork(
  task: Pick<CommandCenterTaskPacketV1, "mission_type" | "one_product_exception" | "cohort_key">,
): { redirect: boolean; reason: string } {
  if (task.mission_type !== "SAFE_LINK_BATCH") {
    return { redirect: false, reason: "not_safe_link_batch_mission" };
  }
  if (task.one_product_exception != null) {
    return { redirect: false, reason: "one_product_exception_set" };
  }
  const cohort = (task.cohort_key ?? "").toLowerCase();
  const singleSlugCohort =
    cohort.includes("single_slug") ||
    cohort.includes("one_slug") ||
    cohort.endsWith("_slug_only");
  if (singleSlugCohort) {
    return {
      redirect: true,
      reason: "safe_link_batch_default_requires_batch_factory_not_single_slug_cohort",
    };
  }
  return { redirect: false, reason: "batch_cohort_ok" };
}

export type HyperAgentBatchManifestV1 = {
  contract: typeof HYPERAGENT_BATCH_MANIFEST_CONTRACT_V1;
  manifest_id: string;
  task_id: string;
  total_slugs: number;
  discovery_status: string;
  truth_closure_claimed: boolean;
  slug_index?: Array<{ slug: string; proposed_state: string; state_changed?: boolean }>;
};

export type HyperAgentBatchPacketV1 = {
  contract: typeof HYPERAGENT_INGEST_PACKET_CONTRACT_V1;
  ingest_id: string;
  task_id: string;
  slug: string;
  created_at?: string;
  discovery_status: string;
  truth_closure_claimed: boolean;
  batch_factory_state_at_discovery: string;
  proposed_state: string;
  state_changed_from_batch_factory: boolean;
  read_only?: boolean;
  data_mutation?: boolean;
  specialist_outputs?: Array<{ specialist: string; summary: string }>;
  packet_body_source?: string;
  materialized_from_manifest?: boolean;
  materialized_from_repo?: boolean;
  synthetic?: boolean;
  identity_status?: string;
  proven_facts?: unknown[];
  inferred_facts?: unknown[];
  unknown_facts?: unknown[];
  [key: string]: unknown;
};

export type HyperAgentBatchBundleV1 = {
  contract: typeof HYPERAGENT_BATCH_BUNDLE_CONTRACT_V1;
  manifest: HyperAgentBatchManifestV1;
  packets: HyperAgentBatchPacketV1[];
  packet_count: number;
};

export type HyperAgentBundleAuthenticityResultV1 = {
  authentic: boolean;
  failure_code: typeof CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED | null;
  errors: string[];
  synthetic_packet_slugs: string[];
};

export function isHyperAgentIngestIdUuidV1(ingestId: string): boolean {
  return UUID_V4ISH_RE.test(ingestId.trim());
}

export function isSyntheticHyperAgentPacketBodyV1(
  packet: HyperAgentBatchPacketV1,
): { synthetic: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (packet.materialized_from_manifest === true) {
    reasons.push("materialized_from_manifest=true");
  }
  if (packet.materialized_from_repo === true) {
    reasons.push("materialized_from_repo=true");
  }
  if (packet.synthetic === true) {
    reasons.push("synthetic=true");
  }
  if (typeof packet.packet_body_source === "string") {
    const src = packet.packet_body_source.toLowerCase();
    if ((INVALID_HYPERAGENT_PACKET_BODY_SOURCES_V1 as readonly string[]).includes(src)) {
      reasons.push(`packet_body_source=${packet.packet_body_source}`);
    }
  }
  if (packet.ingest_id.startsWith("materialized-")) {
    reasons.push("ingest_id has materialized- prefix");
  }
  if (!isHyperAgentIngestIdUuidV1(packet.ingest_id)) {
    reasons.push("ingest_id is not a UUID");
  }
  if (!packet.slug?.trim()) {
    reasons.push("missing slug");
  }
  if (!packet.batch_factory_state_at_discovery?.trim()) {
    reasons.push("missing batch_factory_state_at_discovery");
  }
  if (!packet.proposed_state?.trim()) {
    reasons.push("missing proposed_state");
  }
  if (packet.read_only !== true) {
    reasons.push("read_only must be true");
  }
  if (packet.truth_closure_claimed !== false) {
    reasons.push("truth_closure_claimed must be false");
  }
  if (!isHyperAgentDiscoveryStatusV1(packet.discovery_status)) {
    reasons.push(`invalid discovery_status=${packet.discovery_status}`);
  }
  if (!Array.isArray(packet.specialist_outputs) || packet.specialist_outputs.length < 2) {
    reasons.push("specialist_outputs must include Discovery and TruthRisk");
  } else {
    const names = new Set(packet.specialist_outputs.map((o) => o.specialist));
    if (!names.has("Discovery") || !names.has("TruthRisk")) {
      reasons.push("specialist_outputs missing Discovery or TruthRisk");
    }
    if (packet.specialist_outputs.every((o) => STUB_SPECIALIST_SUMMARY_RE.test(o.summary))) {
      reasons.push("specialist_outputs use stub summaries");
    }
  }
  if (
    !Array.isArray(packet.proven_facts) &&
    !Array.isArray(packet.inferred_facts) &&
    !Array.isArray(packet.unknown_facts)
  ) {
    reasons.push("missing proven_facts/inferred_facts/unknown_facts arrays");
  }
  if (packet.identity_status == null || String(packet.identity_status).trim() === "") {
    reasons.push("missing identity_status");
  }

  return { synthetic: reasons.length > 0, reasons };
}

export function validateHyperAgentBatchBundleForCursorValidationV1(
  bundle: HyperAgentBatchBundleV1,
  expectedSlugCount: number = FRIDGE_SAFE_LINK_BATCH_COHORT_SIZE_V1,
): HyperAgentBundleAuthenticityResultV1 {
  const errors: string[] = [];
  const synthetic_packet_slugs: string[] = [];

  if (bundle.contract !== HYPERAGENT_BATCH_BUNDLE_CONTRACT_V1) {
    errors.push(`bundle.contract must be ${HYPERAGENT_BATCH_BUNDLE_CONTRACT_V1}`);
  }
  if (bundle.manifest.contract !== HYPERAGENT_BATCH_MANIFEST_CONTRACT_V1) {
    errors.push(`manifest.contract must be ${HYPERAGENT_BATCH_MANIFEST_CONTRACT_V1}`);
  }
  if (bundle.packet_count !== expectedSlugCount) {
    errors.push(`packet_count=${bundle.packet_count} expected ${expectedSlugCount}`);
  }
  if (bundle.manifest.total_slugs !== expectedSlugCount) {
    errors.push(`manifest.total_slugs=${bundle.manifest.total_slugs} expected ${expectedSlugCount}`);
  }
  if (bundle.packets.length !== expectedSlugCount) {
    errors.push(`packets.length=${bundle.packets.length} expected ${expectedSlugCount}`);
  }
  if (bundle.manifest.truth_closure_claimed !== false) {
    errors.push("manifest.truth_closure_claimed must be false");
  }
  if (!isHyperAgentDiscoveryStatusV1(bundle.manifest.discovery_status)) {
    errors.push(`manifest.discovery_status invalid: ${bundle.manifest.discovery_status}`);
  }

  const slugSet = new Set<string>();
  for (const packet of bundle.packets) {
    if (packet.contract !== HYPERAGENT_INGEST_PACKET_CONTRACT_V1) {
      errors.push(`${packet.slug ?? "?"}: invalid packet.contract`);
    }
    const syn = isSyntheticHyperAgentPacketBodyV1(packet);
    if (syn.synthetic) {
      synthetic_packet_slugs.push(packet.slug);
      errors.push(`${packet.slug}: synthetic packet body — ${syn.reasons.join("; ")}`);
    }
    slugSet.add(packet.slug);
  }

  if (slugSet.size !== expectedSlugCount) {
    errors.push(`unique slug count=${slugSet.size} expected ${expectedSlugCount}`);
  }

  if (bundle.manifest.slug_index) {
    if (bundle.manifest.slug_index.length !== expectedSlugCount) {
      errors.push(`manifest.slug_index length=${bundle.manifest.slug_index.length}`);
    }
    for (const idx of bundle.manifest.slug_index) {
      if (!slugSet.has(idx.slug)) {
        errors.push(`slug_index references missing packet slug=${idx.slug}`);
      }
    }
  }

  const authentic = errors.length === 0;
  return {
    authentic,
    failure_code: authentic ? null : CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED,
    errors,
    synthetic_packet_slugs,
  };
}

/** Stub/synthetic bundles cannot confirm state changes or authorize CC status updates. */
export function assertCursorValidationMayProceedFromBundle(
  authenticity: HyperAgentBundleAuthenticityResultV1,
): void {
  if (!authenticity.authentic) {
    throw new Error(
      `${authenticity.failure_code ?? CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED}: ${authenticity.errors.join(" | ")}`,
    );
  }
}

export function assertOneProductWorkAllowedOrRedirected(
  task: Pick<CommandCenterTaskPacketV1, "mission_type" | "one_product_exception" | "cohort_key">,
): void {
  const { redirect, reason } = shouldRedirectOneProductSafeLinkWork(task);
  if (redirect) {
    throw new Error(`one_product_safe_link_redirect: ${reason}`);
  }
  if (task.mission_type === "SAFE_LINK_BATCH" && task.one_product_exception == null) {
    return;
  }
  if (task.one_product_exception != null) {
    if (!(ONE_PRODUCT_EXCEPTIONS_V1 as readonly string[]).includes(task.one_product_exception)) {
      throw new Error(`invalid one_product_exception: ${task.one_product_exception}`);
    }
    return;
  }
}
