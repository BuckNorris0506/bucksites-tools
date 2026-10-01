/**
 * Grant-gated write of the existing AP model-first evidence result artifact.
 * Consumes only the ratified founder file. Does not change dispatch or mutation gates.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  FOUNDER_DECISION_REGISTRY_MODEL_FIRST_EVIDENCE_RESULT_WRITE_SCOPE_V1,
  isFounderRegistryRowActiveModelFirstEvidenceResultWriteApproval,
  validateFounderDecisionRegistryDocumentV1,
  type FounderDecisionRegistryRowV1,
} from "@/lib/owner-dashboard/founder-decision-registry-v1";

import type { ApModelFirstEvidenceQueueReportV1 } from "./ap-model-first-evidence-queue-v1";
import {
  AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1,
  buildModelFirstEvidenceResultV1,
  isAllowedModelFirstEvidenceResultRelPathV1,
  loadAllRepoModelSlugsForAnchorFilterV1,
  validateModelFirstEvidenceResultV1,
} from "./air-purifier-model-first-evidence-result-v1";

export const AP_MODEL_FIRST_EVIDENCE_RESULT_WRITE_GRANT_REL_V1 =
  "data/owner-decisions/ap-model-first-evidence-result-write-owner-approval-v1.json" as const;

export type ModelFirstEvidenceResultWriteBlockedReasonV1 =
  | "grant_file_missing_or_unreadable"
  | "grant_document_invalid"
  | "grant_not_approved_or_inactive"
  | "grant_scope_not_evidence_result_write"
  | "grant_expired"
  | "queue_not_ready"
  | "no_valid_top_candidate"
  | "result_validation_failed"
  | "result_path_not_allowed";

export type ModelFirstEvidenceResultWriteOutcomeV1 = {
  wrote: boolean;
  blocked_reason: ModelFirstEvidenceResultWriteBlockedReasonV1 | null;
  grant_active: boolean;
  grant_mutation_approval_active: false;
  allowed_next_scope: string | null;
  queue_status: ApModelFirstEvidenceQueueReportV1["queue_status"] | null;
  anchor_filter_slug: string | null;
  result_rel: string | null;
  packets_written: false;
};

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

function emptyOutcome(
  partial: Partial<ModelFirstEvidenceResultWriteOutcomeV1> & {
    blocked_reason: ModelFirstEvidenceResultWriteBlockedReasonV1;
  },
): ModelFirstEvidenceResultWriteOutcomeV1 {
  return {
    wrote: false,
    grant_active: false,
    grant_mutation_approval_active: false,
    allowed_next_scope: null,
    queue_status: null,
    anchor_filter_slug: null,
    result_rel: null,
    packets_written: false,
    ...partial,
  };
}

export function modelFirstEvidenceResultRelPathForAnchorV1(anchorFilterSlug: string): string {
  return `${AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/ap-model-first-${anchorFilterSlug}-v1.results.json`;
}

export function loadRatifiedModelFirstEvidenceResultWriteGrantRowV1(args: {
  rootDir: string;
  nowIso: string;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
}): {
  row: FounderDecisionRegistryRowV1 | null;
  active: boolean;
  blocked_reason: ModelFirstEvidenceResultWriteBlockedReasonV1 | null;
} {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const abs = path.join(args.rootDir, AP_MODEL_FIRST_EVIDENCE_RESULT_WRITE_GRANT_REL_V1);
  if (!fileExists(abs)) {
    return { row: null, active: false, blocked_reason: "grant_file_missing_or_unreadable" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readText(abs));
  } catch {
    return { row: null, active: false, blocked_reason: "grant_file_missing_or_unreadable" };
  }
  const doc = validateFounderDecisionRegistryDocumentV1(parsed);
  if (!doc.ok) {
    return { row: null, active: false, blocked_reason: "grant_document_invalid" };
  }
  const row = doc.doc.rows[0] ?? null;
  if (!row) {
    return { row: null, active: false, blocked_reason: "grant_document_invalid" };
  }
  if (row.allowed_next_scope !== FOUNDER_DECISION_REGISTRY_MODEL_FIRST_EVIDENCE_RESULT_WRITE_SCOPE_V1) {
    return { row, active: false, blocked_reason: "grant_scope_not_evidence_result_write" };
  }
  if (row.decision_status !== "approved") {
    return { row, active: false, blocked_reason: "grant_not_approved_or_inactive" };
  }
  if (!isFounderRegistryRowActiveModelFirstEvidenceResultWriteApproval(row, args.nowIso)) {
    return { row, active: false, blocked_reason: "grant_expired" };
  }
  return { row, active: true, blocked_reason: null };
}

export function writeTopCandidateModelFirstEvidenceResultIfGrantActiveV1(args: {
  rootDir: string;
  queue: ApModelFirstEvidenceQueueReportV1;
  now?: () => Date;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
}): ModelFirstEvidenceResultWriteOutcomeV1 {
  const now = args.now ?? (() => new Date());
  const nowIso = now().toISOString();
  const grant = loadRatifiedModelFirstEvidenceResultWriteGrantRowV1({
    rootDir: args.rootDir,
    nowIso,
    readText: args.readText,
    fileExists: args.fileExists,
  });

  if (!grant.active || !grant.row) {
    return emptyOutcome({
      blocked_reason: grant.blocked_reason ?? "grant_not_approved_or_inactive",
      allowed_next_scope: grant.row?.allowed_next_scope ?? null,
      queue_status: args.queue.queue_status,
    });
  }

  if (args.queue.queue_status !== "READY") {
    return emptyOutcome({
      blocked_reason: "queue_not_ready",
      grant_active: true,
      allowed_next_scope: grant.row.allowed_next_scope,
      queue_status: args.queue.queue_status,
    });
  }

  const top = args.queue.top_candidates[0] ?? null;
  const anchorFilterSlug = top?.filter_slug?.trim() || null;
  if (!top || !anchorFilterSlug) {
    return emptyOutcome({
      blocked_reason: "no_valid_top_candidate",
      grant_active: true,
      allowed_next_scope: grant.row.allowed_next_scope,
      queue_status: args.queue.queue_status,
    });
  }

  const allRepoModelSlugs = loadAllRepoModelSlugsForAnchorFilterV1(
    args.rootDir,
    anchorFilterSlug,
    args.readText,
    args.fileExists,
  );
  const modelSlugs = allRepoModelSlugs.length > 0 ? allRepoModelSlugs : top.sample_model_slugs;

  const draft = buildModelFirstEvidenceResultV1({
    rootDir: args.rootDir,
    queue: args.queue,
    anchorFilterSlug,
    modelSlugs,
    writeResult: false,
    now,
    readText: args.readText,
    fileExists: args.fileExists,
  });
  if (!validateModelFirstEvidenceResultV1(draft)) {
    return emptyOutcome({
      blocked_reason: "result_validation_failed",
      grant_active: true,
      allowed_next_scope: grant.row.allowed_next_scope,
      queue_status: args.queue.queue_status,
      anchor_filter_slug: anchorFilterSlug,
    });
  }

  const resultRel = modelFirstEvidenceResultRelPathForAnchorV1(anchorFilterSlug);
  if (!isAllowedModelFirstEvidenceResultRelPathV1(resultRel)) {
    return emptyOutcome({
      blocked_reason: "result_path_not_allowed",
      grant_active: true,
      allowed_next_scope: grant.row.allowed_next_scope,
      queue_status: args.queue.queue_status,
      anchor_filter_slug: anchorFilterSlug,
      result_rel: resultRel,
    });
  }

  buildModelFirstEvidenceResultV1({
    rootDir: args.rootDir,
    queue: args.queue,
    anchorFilterSlug,
    modelSlugs,
    writeResult: true,
    now,
    readText: args.readText,
    fileExists: args.fileExists,
  });

  return {
    wrote: true,
    blocked_reason: null,
    grant_active: true,
    grant_mutation_approval_active: false,
    allowed_next_scope: grant.row.allowed_next_scope,
    queue_status: args.queue.queue_status,
    anchor_filter_slug: anchorFilterSlug,
    result_rel: resultRel,
    packets_written: false,
  };
}
