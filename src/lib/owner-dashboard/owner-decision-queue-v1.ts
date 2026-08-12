/**
 * Owner Decision Queue v1 — first-class pending owner decisions for Runner, Command Center,
 * readiness gates, and guarded apply flows. Read-only queue artifacts; never auto-approves or mutates.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  validateFounderDecisionRegistryDocumentV1,
  type FounderDecisionRegistryRowV1,
} from "./founder-decision-registry-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import { scanFounderDecisionRegistryJsonFilesV1 } from "./founder-decision-registry-scan-v1";
import type { DecisionPriorIdV1 } from "./decision-priors-framework-v1";
import {
  buildPrecedentClauseDraftingV1,
  loadClosedOarPrecedentSubstratesV1,
  precedentClassForOwnerDecisionRequestV1,
  type ClosedOarPrecedentSubstrateV1,
} from "./precedent-clause-drafting-v1";

export const OWNER_DECISION_QUEUE_CONTRACT_V1 = "owner_decision_queue_v1" as const;
export const OWNER_DECISION_REQUEST_CONTRACT_V1 = "owner_decision_request_v1" as const;

export const OWNER_DECISION_QUEUE_MANIFEST_REL_V1 =
  "data/owner-decisions/queue/owner-decision-queue-v1.json" as const;

export const OWNER_DECISION_QUEUE_REQUESTS_DIR_REL_V1 =
  "data/owner-decisions/queue/requests" as const;

export const OWNER_DECISION_QUEUE_CC_JQ_PATH_V1 =
  ".command_center_v2.owner_decision_queue_v1" as const;

export type OwnerDecisionRequestStatusV1 =
  | "PENDING_OWNER_DECISION"
  | "APPROVED"
  | "REJECTED"
  | "STALE"
  | "SUPERSEDED";

export type OwnerDecisionTypeV1 =
  | "owner_mutation_approval"
  | "csv_apply_authorization"
  | "supabase_csv_parity_export"
  | "manufacturer_rescue_apply"
  | "guarded_apply_bridge";

export type OwnerDecisionOptionV1 = {
  option_id: string;
  label: string;
  founder_registry_scope_hint: "owner_mutation_approved" | "read_only_agent" | "none";
};

export type OwnerDecisionRequestV1 = {
  contract: typeof OWNER_DECISION_REQUEST_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  decision_request_id: string;
  created_at: string;
  updated_at: string;
  source_system: string;
  source_artifact_path: string;
  target_slugs: string[];
  decision_type: OwnerDecisionTypeV1;
  options: OwnerDecisionOptionV1[];
  recommended_option: string;
  evidence_summary: string;
  blockers: string[];
  risks: string[];
  exact_downstream_action_if_approved: string;
  exact_downstream_action_if_rejected: string;
  expires_or_stale_after: string | null;
  status: OwnerDecisionRequestStatusV1;
  /**
   * Precedent Clause drafting discipline v1 — read-only text only.
   * Does not affect effective status, Runner gates, NBA, Dispatch, or Daily Operator.
   */
  precedent_clause?: string;
  /**
   * Decision Priors Framework v1 — optional label-only priors that influenced
   * this Executive recommendation. Absent on legacy ODRs (treated as untagged).
   * Does not score, weight, or change queue / Runner / NBA behavior.
   * INSTANTIATED_ZERO_AUTHORITY — existence ≠ Executive permission.
   */
  decision_priors?: readonly DecisionPriorIdV1[];
  founder_decision_registry_bridge: {
    expected_allowed_next_scope: "owner_mutation_approved";
    matching_registry_sources: string[];
    active_mutation_approval_decision_id: string | null;
  };
  runner_halt_context?: {
    mission_id: string;
    run_id: string;
    step_id: string;
    halt_reason: string;
    halt_detail: string | null;
  };
};

export type OwnerDecisionQueueRequestSummaryV1 = {
  decision_request_id: string;
  request_artifact_rel_path: string;
  status: OwnerDecisionRequestStatusV1;
  decision_type: OwnerDecisionTypeV1;
  target_slugs: string[];
  source_system: string;
  updated_at: string;
};

export type OwnerDecisionQueueManifestV1 = {
  contract: typeof OWNER_DECISION_QUEUE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  request_count: number;
  pending_count: number;
  request_artifact_paths: string[];
  requests: OwnerDecisionQueueRequestSummaryV1[];
};

export type OwnerDecisionRequestProjectionV1 = OwnerDecisionRequestV1 & {
  request_artifact_rel_path: string;
  effective_status: OwnerDecisionRequestStatusV1;
};

export type OwnerDecisionQueueProjectionV1 = {
  contract: typeof OWNER_DECISION_QUEUE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  queue_manifest_path: typeof OWNER_DECISION_QUEUE_MANIFEST_REL_V1;
  manifest_present: boolean;
  request_count: number;
  pending_count: number;
  stale_count: number;
  approved_count: number;
  top_pending_decisions: OwnerDecisionRequestProjectionV1[];
  stale_decisions: OwnerDecisionRequestProjectionV1[];
  recently_approved_decisions: OwnerDecisionRequestProjectionV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

const DEFAULT_APPROVE_OPTION: OwnerDecisionOptionV1 = {
  option_id: "approve_owner_mutation",
  label: "Approve owner_mutation_approved scope in Founder Decision Registry v1",
  founder_registry_scope_hint: "owner_mutation_approved",
};

const DEFAULT_REJECT_OPTION: OwnerDecisionOptionV1 = {
  option_id: "reject_mutation",
  label: "Reject mutation — keep read-only until more evidence",
  founder_registry_scope_hint: "none",
};

const DEFAULT_DEFER_OPTION: OwnerDecisionOptionV1 = {
  option_id: "defer_decision",
  label: "Defer — no mutation authority granted",
  founder_registry_scope_hint: "read_only_agent",
};

export function ownerDecisionRequestArtifactRelPathV1(decisionRequestId: string): string {
  const safe = decisionRequestId.replace(/[^a-zA-Z0-9-]/g, "");
  return `${OWNER_DECISION_QUEUE_REQUESTS_DIR_REL_V1}/${safe}.json`;
}

export function deriveOwnerDecisionRequestIdV1(args: {
  source_system: string;
  step_id: string;
  target_slugs: readonly string[];
}): string {
  const payload = JSON.stringify({
    source_system: args.source_system,
    step_id: args.step_id,
    target_slugs: [...args.target_slugs].sort(),
  });
  const hash = createHash("sha256").update(payload).digest("hex").slice(0, 12);
  return `odr-v1-${hash}`;
}

export function extractTargetSlugsFromReportJsonV1(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== "object") return [];
  const o = parsed as Record<string, unknown>;
  const slugs = new Set<string>();

  const pushSlug = (value: unknown) => {
    if (typeof value === "string" && value.trim()) {
      slugs.add(value.trim().toLowerCase());
    }
  };

  for (const key of ["target_slugs", "filter_slugs", "ready_for_apply_slugs", "blocked_slugs"]) {
    const v = o[key];
    if (Array.isArray(v)) {
      for (const item of v) pushSlug(item);
    }
  }

  pushSlug(o.filter_slug);
  pushSlug(o.slug);
  pushSlug(o.recommended_wedge);

  const gapRows = o.supabase_has_win_csv_missing_rows ?? o.gap_rows ?? o.parity_gap_rows;
  if (Array.isArray(gapRows)) {
    for (const row of gapRows) {
      if (row && typeof row === "object") {
        pushSlug((row as Record<string, unknown>).filter_slug);
        pushSlug((row as Record<string, unknown>).slug);
      }
    }
  }

  const candidates = o.slug_candidates ?? o.ready_for_apply_candidates;
  if (Array.isArray(candidates)) {
    for (const row of candidates) {
      if (row && typeof row === "object") {
        pushSlug((row as Record<string, unknown>).slug);
        pushSlug((row as Record<string, unknown>).filter_slug);
      }
    }
  }

  return Array.from(slugs).sort();
}

export function inferDecisionTypeFromRunnerStepV1(stepId: string): OwnerDecisionTypeV1 {
  if (stepId.includes("supabase_csv") || stepId.includes("parity")) {
    return "supabase_csv_parity_export";
  }
  if (stepId.includes("readiness")) {
    return "manufacturer_rescue_apply";
  }
  if (stepId.includes("bridge") || stepId.includes("guarded_apply")) {
    return "guarded_apply_bridge";
  }
  if (stepId.includes("lifecycle")) {
    return "csv_apply_authorization";
  }
  return "owner_mutation_approval";
}

export function loadFounderDecisionRegistryRowsV1(rootDir: string): FounderDecisionRegistryRowV1[] {
  const files = scanFounderDecisionRegistryJsonFilesV1(rootDir);
  const rows: FounderDecisionRegistryRowV1[] = [];
  for (const file of files) {
    if (!("parsed" in file) || !file.parsed || typeof file.parsed !== "object") continue;
    const validated = validateFounderDecisionRegistryDocumentV1(file.parsed);
    if (!validated.ok) continue;
    rows.push(...validated.doc.rows);
  }
  return rows;
}

export function isOwnerDecisionRequestExpiredV1(args: {
  request: Pick<OwnerDecisionRequestV1, "expires_or_stale_after">;
  referenceTimeIso: string;
}): boolean {
  const staleAfter = args.request.expires_or_stale_after?.trim();
  if (!staleAfter) return false;
  const staleAt = Date.parse(staleAfter);
  const now = Date.parse(args.referenceTimeIso);
  return !Number.isNaN(staleAt) && !Number.isNaN(now) && now >= staleAt;
}

export function registryRowMatchesOwnerDecisionRequestV1(args: {
  row: FounderDecisionRegistryRowV1;
  request: Pick<
    OwnerDecisionRequestV1,
    "decision_request_id" | "source_artifact_path" | "target_slugs"
  >;
}): boolean {
  const packetId = args.request.decision_request_id.trim();
  const rowPacket = args.row.source_decision_packet_id.trim();
  if (
    rowPacket === `owner_decision_request_v1:${packetId}` ||
    rowPacket.endsWith(`:${packetId}`) ||
    rowPacket.includes(packetId)
  ) {
    return true;
  }

  const sourcePath = args.request.source_artifact_path.trim().toLowerCase();
  if (sourcePath && rowPacket.toLowerCase().includes(sourcePath)) {
    return true;
  }

  for (const slug of args.request.target_slugs) {
    const s = slug.trim().toLowerCase();
    if (!s) continue;
    if (rowPacket.toLowerCase().includes(s)) return true;
    const ctx = args.row.fridge_buyer_path_batch_approval_context_v1;
    if (ctx?.proposed_batch_id?.toLowerCase().includes(s)) return true;
    const applyCtx = args.row.fridge_buyer_path_batch_apply_plan_approval_context_v1;
    if (applyCtx?.source_apply_plan_artifact_rel_path?.toLowerCase().includes(s)) {
      return true;
    }
  }

  return false;
}

export function findMatchingActiveMutationApprovalForRequestV1(args: {
  request: Pick<OwnerDecisionRequestV1, "target_slugs" | "decision_request_id" | "source_artifact_path">;
  registryRows: FounderDecisionRegistryRowV1[];
  referenceTimeIso: string;
  rootDir: string;
  readText?: (abs: string) => string;
}): { row: FounderDecisionRegistryRowV1; source: string } | null {
  for (const row of args.registryRows) {
    const gate = founderRegistryRowPassesMutationApprovalGateV1({
      row,
      referenceTimeIso: args.referenceTimeIso,
      rootDir: args.rootDir,
      readText: args.readText,
    });
    if (!gate.ok) continue;
    if (!registryRowMatchesOwnerDecisionRequestV1({ row, request: args.request })) {
      continue;
    }
    return { row, source: row.decision_id };
  }
  return null;
}

export function findMatchingRejectedDecisionForRequestV1(args: {
  request: Pick<OwnerDecisionRequestV1, "target_slugs" | "source_artifact_path" | "decision_request_id">;
  registryRows: FounderDecisionRegistryRowV1[];
}): FounderDecisionRegistryRowV1 | null {
  for (const row of args.registryRows) {
    if (row.decision_status !== "rejected") continue;
    if (registryRowMatchesOwnerDecisionRequestV1({ row, request: args.request })) {
      return row;
    }
  }
  return null;
}

export function resolveOwnerDecisionRequestEffectiveStatusV1(args: {
  request: OwnerDecisionRequestV1;
  registryRows: FounderDecisionRegistryRowV1[];
  referenceTimeIso: string;
  rootDir: string;
  readText?: (abs: string) => string;
  supersededByIds?: ReadonlySet<string>;
}): OwnerDecisionRequestStatusV1 {
  if (args.supersededByIds?.has(args.request.decision_request_id)) {
    return "SUPERSEDED";
  }

  if (
    isOwnerDecisionRequestExpiredV1({
      request: args.request,
      referenceTimeIso: args.referenceTimeIso,
    })
  ) {
    return "STALE";
  }

  const rejected = findMatchingRejectedDecisionForRequestV1({
    request: args.request,
    registryRows: args.registryRows,
  });
  if (rejected) return "REJECTED";

  const approved = findMatchingActiveMutationApprovalForRequestV1({
    request: args.request,
    registryRows: args.registryRows,
    referenceTimeIso: args.referenceTimeIso,
    rootDir: args.rootDir,
    readText: args.readText,
  });
  if (approved) return "APPROVED";

  return "PENDING_OWNER_DECISION";
}

export function loadOwnerDecisionQueueManifestV1(rootDir: string): OwnerDecisionQueueManifestV1 | null {
  const abs = path.join(rootDir, OWNER_DECISION_QUEUE_MANIFEST_REL_V1);
  if (!existsSync(abs)) return null;
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as OwnerDecisionQueueManifestV1;
    if (parsed.contract !== OWNER_DECISION_QUEUE_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadOwnerDecisionRequestV1(
  rootDir: string,
  requestArtifactRelPath: string,
): OwnerDecisionRequestV1 | null {
  const abs = path.join(rootDir, requestArtifactRelPath);
  if (!existsSync(abs)) return null;
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as OwnerDecisionRequestV1;
    if (parsed.contract !== OWNER_DECISION_REQUEST_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function listOwnerDecisionRequestArtifactPathsV1(rootDir: string): string[] {
  const dir = path.join(rootDir, OWNER_DECISION_QUEUE_REQUESTS_DIR_REL_V1);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => `${OWNER_DECISION_QUEUE_REQUESTS_DIR_REL_V1}/${name}`)
    .sort();
}

export function buildOwnerDecisionQueueProjectionV1(args: {
  rootDir: string;
  now?: () => Date;
}): OwnerDecisionQueueProjectionV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const manifest = loadOwnerDecisionQueueManifestV1(args.rootDir);
  const registryRows = loadFounderDecisionRegistryRowsV1(args.rootDir);

  const artifactPaths = manifest?.request_artifact_paths.length
    ? manifest.request_artifact_paths
    : listOwnerDecisionRequestArtifactPathsV1(args.rootDir);

  const projections: OwnerDecisionRequestProjectionV1[] = [];
  const seenIds = new Set<string>();

  for (const rel of artifactPaths) {
    const request = loadOwnerDecisionRequestV1(args.rootDir, rel);
    if (!request) continue;
    seenIds.add(request.decision_request_id);
    const effective_status = resolveOwnerDecisionRequestEffectiveStatusV1({
      request,
      registryRows,
      referenceTimeIso: generatedAt,
      rootDir: args.rootDir,
    });
    const approval = findMatchingActiveMutationApprovalForRequestV1({
      request,
      registryRows,
      referenceTimeIso: generatedAt,
      rootDir: args.rootDir,
    });
    projections.push({
      ...request,
      status: effective_status,
      effective_status,
      request_artifact_rel_path: rel,
      founder_decision_registry_bridge: {
        ...request.founder_decision_registry_bridge,
        active_mutation_approval_decision_id: approval?.row.decision_id ?? null,
        matching_registry_sources: approval ? [approval.source] : [],
      },
    });
  }

  const pending = projections.filter((p) => p.effective_status === "PENDING_OWNER_DECISION");
  const stale = projections.filter((p) => p.effective_status === "STALE");
  const approved = projections.filter((p) => p.effective_status === "APPROVED");

  return {
    contract: OWNER_DECISION_QUEUE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: generatedAt,
    queue_manifest_path: OWNER_DECISION_QUEUE_MANIFEST_REL_V1,
    manifest_present: manifest !== null,
    request_count: projections.length,
    pending_count: pending.length,
    stale_count: stale.length,
    approved_count: approved.length,
    top_pending_decisions: pending.slice(0, 5),
    stale_decisions: stale.slice(0, 5),
    recently_approved_decisions: approved.slice(0, 5),
    proven_facts: [
      "PROVEN: owner_decision_queue_v1 is read-only — queue never auto-approves or mutates production.",
      `PROVEN: ${String(projections.length)} decision request artifact(s) indexed; ${String(pending.length)} pending owner decision(s).`,
      "PROVEN: APPROVED status requires active founder_decision_registry_v1 owner_mutation_approved row — queue does not grant mutation by itself.",
    ],
    unknown_facts: manifest
      ? []
      : ["UNKNOWN: Queue manifest missing — using requests directory scan fallback only."],
  };
}

export function ownerDecisionRequestApprovalSatisfiesRunnerGateV1(args: {
  rootDir: string;
  decisionRequestId: string;
  now?: () => Date;
}): boolean {
  const rel = ownerDecisionRequestArtifactRelPathV1(args.decisionRequestId);
  const request = loadOwnerDecisionRequestV1(args.rootDir, rel);
  if (!request) return false;
  const registryRows = loadFounderDecisionRegistryRowsV1(args.rootDir);
  const effective = resolveOwnerDecisionRequestEffectiveStatusV1({
    request,
    registryRows,
    referenceTimeIso: (args.now ?? (() => new Date()))().toISOString(),
    rootDir: args.rootDir,
  });
  return effective === "APPROVED";
}

export function buildOwnerDecisionRequestFromRunnerHaltV1(args: {
  missionId: string;
  runId: string;
  stepId: string;
  stepProvenance: string;
  haltReason: string;
  haltDetail: string | null;
  parsedJson: unknown | null;
  now?: () => Date;
  /**
   * Existing closed OARs for Precedent Clause drafting only.
   * Pass loaded rows (may be `[]`). Omit/undefined ⇒ clause reports UNKNOWN (does not invent zero).
   */
  closed_oar_rows?: readonly ClosedOarPrecedentSubstrateV1[] | null;
}): OwnerDecisionRequestV1 {
  const now = args.now ?? (() => new Date());
  const iso = now().toISOString();
  const targetSlugs = extractTargetSlugsFromReportJsonV1(args.parsedJson);
  const sourceArtifactPath =
    typeof args.parsedJson === "object" &&
    args.parsedJson &&
    typeof (args.parsedJson as Record<string, unknown>).artifact_rel_path === "string"
      ? String((args.parsedJson as Record<string, unknown>).artifact_rel_path)
      : args.stepProvenance;

  const decisionRequestId = deriveOwnerDecisionRequestIdV1({
    source_system: `buckparts_runner_v1:${args.missionId}`,
    step_id: args.stepId,
    target_slugs: targetSlugs,
  });

  const decisionType = inferDecisionTypeFromRunnerStepV1(args.stepId);
  const slugLabel = targetSlugs.length > 0 ? targetSlugs.join(", ") : "scoped batch";
  const precedent = buildPrecedentClauseDraftingV1({
    decision_class: precedentClassForOwnerDecisionRequestV1(decisionType),
    closed_oar_rows: args.closed_oar_rows,
    current: {
      recommended_option: DEFAULT_APPROVE_OPTION.option_id,
      draft_status: "pending",
    },
  });

  return {
    contract: OWNER_DECISION_REQUEST_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    decision_request_id: decisionRequestId,
    created_at: iso,
    updated_at: iso,
    source_system: `buckparts_runner_v1:${args.missionId}`,
    source_artifact_path: sourceArtifactPath,
    target_slugs: targetSlugs,
    decision_type: decisionType,
    options: [DEFAULT_APPROVE_OPTION, DEFAULT_DEFER_OPTION, DEFAULT_REJECT_OPTION],
    recommended_option: DEFAULT_APPROVE_OPTION.option_id,
    evidence_summary:
      args.haltDetail ??
      `Runner halted at step ${args.stepId} with ${args.haltReason} for ${slugLabel}.`,
    blockers: [args.haltReason, ...(args.haltDetail ? [args.haltDetail] : [])],
    risks: [
      "INFERRED: Approving grants owner_mutation_approved in Founder Decision Registry only — guarded apply executor still required for CSV/Supabase mutation.",
      "PROVEN: Queue artifact approval does not itself mutate retailer_links or production.",
    ],
    exact_downstream_action_if_approved:
      "Record founder_decision_registry_v1 row with allowed_next_scope=owner_mutation_approved for target slug(s); then run guarded apply executor separately with explicit flags.",
    exact_downstream_action_if_rejected:
      "Record rejected/deferred outcome in founder_decision_registry_v1; Runner remains halted; no CSV or Supabase mutation.",
    expires_or_stale_after: new Date(now().getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: "PENDING_OWNER_DECISION",
    precedent_clause: precedent.precedent_clause,
    founder_decision_registry_bridge: {
      expected_allowed_next_scope: "owner_mutation_approved",
      matching_registry_sources: [],
      active_mutation_approval_decision_id: null,
    },
    runner_halt_context: {
      mission_id: args.missionId,
      run_id: args.runId,
      step_id: args.stepId,
      halt_reason: args.haltReason,
      halt_detail: args.haltDetail,
    },
  };
}

export function upsertOwnerDecisionRequestFromRunnerHaltV1(args: {
  rootDir: string;
  missionId: string;
  runId: string;
  stepId: string;
  stepProvenance: string;
  haltReason: string;
  haltDetail: string | null;
  parsedJson: unknown | null;
  now?: () => Date;
  writeArtifacts?: boolean;
}): { request: OwnerDecisionRequestV1; request_artifact_rel_path: string; created: boolean } {
  const writeArtifacts = args.writeArtifacts !== false;
  const now = args.now ?? (() => new Date());
  const existingRel = ownerDecisionRequestArtifactRelPathV1(
    deriveOwnerDecisionRequestIdV1({
      source_system: `buckparts_runner_v1:${args.missionId}`,
      step_id: args.stepId,
      target_slugs: extractTargetSlugsFromReportJsonV1(args.parsedJson),
    }),
  );
  const existing = loadOwnerDecisionRequestV1(args.rootDir, existingRel);
  const closedOars = loadClosedOarPrecedentSubstratesV1(args.rootDir);
  const request =
    existing ??
    buildOwnerDecisionRequestFromRunnerHaltV1({
      missionId: args.missionId,
      runId: args.runId,
      stepId: args.stepId,
      stepProvenance: args.stepProvenance,
      haltReason: args.haltReason,
      haltDetail: args.haltDetail,
      parsedJson: args.parsedJson,
      now,
      closed_oar_rows: closedOars,
    });

  const precedentRefresh = buildPrecedentClauseDraftingV1({
    decision_class: precedentClassForOwnerDecisionRequestV1(request.decision_type),
    closed_oar_rows: closedOars,
    current: {
      recommended_option: request.recommended_option,
      draft_status: "pending",
    },
  });

  const updated: OwnerDecisionRequestV1 = {
    ...request,
    updated_at: now().toISOString(),
    precedent_clause: precedentRefresh.precedent_clause,
    runner_halt_context: {
      mission_id: args.missionId,
      run_id: args.runId,
      step_id: args.stepId,
      halt_reason: args.haltReason,
      halt_detail: args.haltDetail,
    },
  };

  const requestRel = ownerDecisionRequestArtifactRelPathV1(updated.decision_request_id);

  if (writeArtifacts) {
    const requestAbs = path.join(args.rootDir, requestRel);
    mkdirSync(path.dirname(requestAbs), { recursive: true });
    writeFileSync(requestAbs, `${JSON.stringify(updated, null, 2)}\n`, "utf8");

    const manifest = loadOwnerDecisionQueueManifestV1(args.rootDir);
    const requests = manifest?.requests ?? [];
    const paths = new Set(manifest?.request_artifact_paths ?? []);
    paths.add(requestRel);
    const summaryMap = new Map(requests.map((r) => [r.decision_request_id, r]));
    summaryMap.set(updated.decision_request_id, {
      decision_request_id: updated.decision_request_id,
      request_artifact_rel_path: requestRel,
      status: updated.status,
      decision_type: updated.decision_type,
      target_slugs: updated.target_slugs,
      source_system: updated.source_system,
      updated_at: updated.updated_at,
    });

    const nextManifest: OwnerDecisionQueueManifestV1 = {
      contract: OWNER_DECISION_QUEUE_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      generated_at: now().toISOString(),
      request_count: summaryMap.size,
      pending_count: Array.from(summaryMap.values()).filter(
        (r) => r.status === "PENDING_OWNER_DECISION",
      ).length,
      request_artifact_paths: Array.from(paths).sort(),
      requests: Array.from(summaryMap.values()).sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at),
      ),
    };

    const manifestAbs = path.join(args.rootDir, OWNER_DECISION_QUEUE_MANIFEST_REL_V1);
    mkdirSync(path.dirname(manifestAbs), { recursive: true });
    writeFileSync(manifestAbs, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");
  }

  return {
    request: updated,
    request_artifact_rel_path: requestRel,
    created: existing === null,
  };
}

export function missingOwnerDecisionQueueFallbackV1(args: {
  generated_at: string;
  reason?: string;
}): OwnerDecisionQueueProjectionV1 {
  return {
    contract: OWNER_DECISION_QUEUE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: args.generated_at,
    queue_manifest_path: OWNER_DECISION_QUEUE_MANIFEST_REL_V1,
    manifest_present: false,
    request_count: 0,
    pending_count: 0,
    stale_count: 0,
    approved_count: 0,
    top_pending_decisions: [],
    stale_decisions: [],
    recently_approved_decisions: [],
    proven_facts: [
      "PROVEN: owner_decision_queue_v1 missing-queue fallback — no pending decisions indexed.",
    ],
    unknown_facts: [
      args.reason ??
        "UNKNOWN: Queue manifest and requests directory absent — owner decisions may still exist only in founder_decision_registry_v1.",
    ],
  };
}
