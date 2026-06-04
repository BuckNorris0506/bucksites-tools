/**
 * BuckParts ops-agent workflow v1 — doctrine packet contracts (types + guards).
 * Documentation: docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md
 * No Mission Control runtime; read-only validation helpers for tests and future ingest.
 */

export const OPS_AGENT_WORKFLOW_DOC_REL_V1 = "docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md" as const;

export const COMMAND_CENTER_TASK_PACKET_CONTRACT_V1 =
  "buckparts_command_center_task_packet_v1" as const;

export const HYPERAGENT_INGEST_PACKET_CONTRACT_V1 =
  "buckparts_hyperagent_ingest_packet_v1" as const;

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
