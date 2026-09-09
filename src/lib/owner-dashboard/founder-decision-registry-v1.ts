/**
 * Founder Decision Registry v1 — pure types + validation for durable owner decisions.
 * PROVEN: no I/O, no agents, no Runner wiring; does not alter Founder Decision Packet eligibility.
 */

import {
  validateDecisionPriorsV1,
  type DecisionPriorIdV1,
} from "./decision-priors-framework-v1";

export const FOUNDER_DECISION_REGISTRY_CONTRACT_V1 = "founder_decision_registry_v1" as const;

/** Short footer appended to each decision packet’s recommended block (registry pointer only). */
export const FOUNDER_DECISION_REGISTRY_PACKET_FOOTER_V1 =
  "**PROVEN:** After you decide, record structured state in **Founder Decision Registry v1** (`docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`). **PROVEN:** Digest + `npm run buckparts:founder-decision-registry` read optional `data/owner-decisions/*.json` (including `codex_output_review_context_v1` for Codex Output Review judgments) — counts and correlation are informational only; **not** Runner/queue/packet/gate inputs.";

/** Plain sentence for React owner dashboard (no markdown emphasis). */
export const FOUNDER_DECISION_REGISTRY_OWNER_DASHBOARD_LINE_V1 =
  "Record approve / reject / defer in Founder Decision Registry v1 (docs/BuckParts-FOUNDER-DECISION-REGISTRY.md; optional data/owner-decisions/). Digest and dashboard surface read-model counts only — BuckParts automation does not act on registry rows.";

/** Short hint for digest / dashboard headers (single source of truth). */
export const FOUNDER_DECISION_REGISTRY_DIGEST_HINT_V1 =
  "**PROVEN:** Record approve / reject / defer outcomes in **Founder Decision Registry v1** (`docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`; optional row files under `data/owner-decisions/` per README). **PROVEN:** Weekly digest also embeds **read model v1** counts from the same directory (machine-parseable JSON stdout: `node --import tsx scripts/report-founder-decision-registry.ts`; see `docs/BuckParts-JSON-STDOUT-CONTRACT.md`). **INFERRED:** Counts are informational — no automation consumes registry rows to change queues, packets, or Runner.";

export type FounderDecisionRegistryDecisionStatusV1 =
  | "approved"
  | "rejected"
  | "deferred"
  | "needs_more_evidence";

export type FounderDecisionRegistryAllowedNextScopeV1 =
  | "none"
  | "read_only_agent"
  | "human_external"
  | "owner_mutation_approved";

/** Mirrors `codex_output_review_packet_v1` founder option ids — kept here to avoid circular imports. */
export const CODEX_OUTPUT_REVIEW_REGISTRY_FOUNDER_OPTION_IDS_V1 = [
  "approve_readonly_findings",
  "reject_findings",
  "request_followup_readonly",
  "defer_review",
] as const;

export type CodexOutputReviewRegistryFounderOptionIdV1 =
  (typeof CODEX_OUTPUT_REVIEW_REGISTRY_FOUNDER_OPTION_IDS_V1)[number];

const CODEX_REVIEW_OPTIONS = new Set<string>(CODEX_OUTPUT_REVIEW_REGISTRY_FOUNDER_OPTION_IDS_V1);

/** Mirrors `batch_owner_approval_packet_v1` / review checklist founder option ids. */
export const BATCH_PRODUCTION_OWNER_REVIEW_REGISTRY_FOUNDER_OPTION_IDS_V1 = [
  "approve_for_next_planning_only",
  "reject",
  "request_more_evidence",
  "defer",
] as const;

export type BatchProductionOwnerReviewRegistryFounderOptionIdV1 =
  (typeof BATCH_PRODUCTION_OWNER_REVIEW_REGISTRY_FOUNDER_OPTION_IDS_V1)[number];

const BATCH_OWNER_REVIEW_OPTIONS = new Set<string>(
  BATCH_PRODUCTION_OWNER_REVIEW_REGISTRY_FOUNDER_OPTION_IDS_V1,
);

/** Optional linkage: founder recorded a judgment for Codex Output Review (read-only informational row). */
export type FounderDecisionRegistryCodexOutputReviewContextV1 = {
  review_packet_contract: "codex_output_review_packet_v1";
  founder_option_id: CodexOutputReviewRegistryFounderOptionIdV1;
};

/** Optional linkage: founder recorded a judgment for Batch Production owner review (read-only). */
export type FounderDecisionRegistryBatchProductionOwnerReviewContextV1 = {
  review_packet_contract: "batch_owner_screenshot_draft_packet_v1";
  founder_option_id: BatchProductionOwnerReviewRegistryFounderOptionIdV1;
  batch_row_id: string;
  token: string;
};

/** Optional linkage: founder recorded a judgment for fridge buyer-path batch approval (read-only planning). */
export type FounderDecisionRegistryFridgeBuyerPathBatchApprovalContextV1 = {
  review_packet_contract: "fridge_buyer_path_batch_approval_v1";
  founder_option_id: BatchProductionOwnerReviewRegistryFounderOptionIdV1;
  proposed_batch_id: string;
};

/** Optional linkage: founder recorded a judgment for fridge buyer-path apply-plan approval (read-only planning). */
export type FounderDecisionRegistryFridgeBuyerPathBatchApplyPlanApprovalContextV1 = {
  review_packet_contract: "fridge_buyer_path_batch_apply_plan_approval_v1";
  founder_option_id: BatchProductionOwnerReviewRegistryFounderOptionIdV1;
  source_apply_plan_artifact_rel_path: string;
  planned_change_count: number;
};

export type FounderDecisionRegistryRowV1 = {
  decision_id: string;
  source_queue_row_id: string;
  source_decision_packet_id: string;
  decided_at: string;
  decision_status: FounderDecisionRegistryDecisionStatusV1;
  owner_note: string;
  allowed_next_scope: FounderDecisionRegistryAllowedNextScopeV1;
  /** Optional ISO 8601 — after this instant the row must not be treated as an active standing approval. */
  expires_at?: string | null;
  /** Optional ISO 8601 — founder-scheduled re-read; past instant ⇒ not an active approval. */
  review_after?: string | null;
  /**
   * When `true`, founder attests that evidence gates remain before any mutating work.
   * Required to be `true` when `allowed_next_scope === "owner_mutation_approved"`.
   */
  evidence_required_before_mutation: boolean;
  /** Snapshot of prohibitions that still bind (e.g. copied from the decision packet). */
  prohibited_actions_still_apply: readonly string[];
  /**
   * When set, this row records owner judgment for `codex_output_review_packet_v1` (digest/dashboard read-only).
   * **PROVEN in validator:** `source_decision_packet_id` must be `codex_output_review_packet_v1:${source_queue_row_id}`;
   * `decision_status` / `allowed_next_scope` must align with `founder_option_id` (no `owner_mutation_approved` for approve-read-only).
   */
  codex_output_review_context_v1?: FounderDecisionRegistryCodexOutputReviewContextV1;
  /**
   * When set, records owner judgment for `batch_owner_screenshot_draft_packet_v1` (batch lane read-only).
   * **PROVEN in validator:** `source_decision_packet_id` must be `batch_owner_review_packet_v1:${batch_row_id}`;
   * `approve_for_next_planning_only` uses `read_only_agent` only — never `owner_mutation_approved`.
   */
  batch_production_owner_review_context_v1?: FounderDecisionRegistryBatchProductionOwnerReviewContextV1;
  /**
   * When set, records owner judgment for `fridge_buyer_path_batch_approval_v1` (planning-only).
   * **PROVEN in validator:** `source_decision_packet_id` must be `fridge_buyer_path_batch_approval_v1:${proposed_batch_id}`;
   * `approve_for_next_planning_only` uses `read_only_agent` only — never `owner_mutation_approved`.
   */
  fridge_buyer_path_batch_approval_context_v1?: FounderDecisionRegistryFridgeBuyerPathBatchApprovalContextV1;
  /**
   * When set, records owner judgment for `fridge_buyer_path_batch_apply_plan_approval_v1` (planning-only).
   * **PROVEN in validator:** `source_decision_packet_id` must be `fridge_buyer_path_batch_apply_plan_approval_v1:${source_apply_plan_artifact_rel_path}`;
   * `approve_for_next_planning_only` uses `read_only_agent` only — never `owner_mutation_approved`.
   */
  fridge_buyer_path_batch_apply_plan_approval_context_v1?: FounderDecisionRegistryFridgeBuyerPathBatchApplyPlanApprovalContextV1;
  /**
   * Tamper-evident artifact bindings required for owner_mutation_approved standing approvals.
   * Guarded apply verifies sha256_at_binding matches on-disk artifact at mutation time.
   */
  bound_artifacts_v1?: FounderDecisionRegistryBoundArtifactV1[];
  /**
   * Decision Priors Framework v1 (INSTANTIATED_ZERO_AUTHORITY — existence ≠ permission) —
   * optional labels that influenced the Executive recommendation.
   * Retained on OAR / disagreement-shaped rows (rejected|deferred|needs_more_evidence).
   * Labels only: no scoring, weighting, or behavior change. Catalog validated when present.
   */
  executive_recommendation_decision_priors?: readonly DecisionPriorIdV1[];
};

export type FounderDecisionRegistryBoundArtifactV1 = {
  artifact_rel_path: string;
  sha256_at_binding: string;
  entry_type:
    | "evidence"
    | "founder_approval"
    | "execution_plan"
    | "apply_plan"
    | "csv_mutation_closeout";
};

export type FounderDecisionRegistryDocumentV1 = {
  contract: typeof FOUNDER_DECISION_REGISTRY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  rows: FounderDecisionRegistryRowV1[];
};

const DECISION_STATUS_LIST: FounderDecisionRegistryDecisionStatusV1[] = [
  "approved",
  "rejected",
  "deferred",
  "needs_more_evidence",
];
const DECISION_STATUSES = new Set(DECISION_STATUS_LIST);

const SCOPE_LIST: FounderDecisionRegistryAllowedNextScopeV1[] = [
  "none",
  "read_only_agent",
  "human_external",
  "owner_mutation_approved",
];
const SCOPES = new Set(SCOPE_LIST);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** PROVEN: structural predicate for read-model Codex review decision counts (validated rows only). */
export function isCodexOutputReviewRegistryRowV1(row: FounderDecisionRegistryRowV1): boolean {
  return row.codex_output_review_context_v1 != null;
}

/** PROVEN: structural predicate for batch production owner-review decision rows. */
export function isBatchProductionOwnerReviewRegistryRowV1(
  row: FounderDecisionRegistryRowV1,
): boolean {
  return row.batch_production_owner_review_context_v1 != null;
}

/** PROVEN: structural predicate for fridge buyer-path batch approval decision rows. */
export function isFridgeBuyerPathBatchApprovalRegistryRowV1(
  row: FounderDecisionRegistryRowV1,
): boolean {
  return row.fridge_buyer_path_batch_approval_context_v1 != null;
}

/** PROVEN: structural predicate for fridge buyer-path apply-plan approval decision rows. */
export function isFridgeBuyerPathBatchApplyPlanApprovalRegistryRowV1(
  row: FounderDecisionRegistryRowV1,
): boolean {
  return row.fridge_buyer_path_batch_apply_plan_approval_context_v1 != null;
}

function expectedBatchOwnerReviewSourceDecisionPacketId(batch_row_id: string): string {
  return `batch_owner_review_packet_v1:${batch_row_id.trim()}`;
}

function expectedCodexReviewSourceDecisionPacketId(source_queue_row_id: string): string {
  return `codex_output_review_packet_v1:${source_queue_row_id}`;
}

function validateCodexOutputReviewContextV1(args: {
  ctx: FounderDecisionRegistryCodexOutputReviewContextV1;
  decision_status: FounderDecisionRegistryDecisionStatusV1;
  allowed_next_scope: FounderDecisionRegistryAllowedNextScopeV1;
  source_queue_row_id: string;
  source_decision_packet_id: string;
}): string[] {
  const errors: string[] = [];
  const { ctx, decision_status, allowed_next_scope, source_queue_row_id, source_decision_packet_id } = args;
  if (ctx.review_packet_contract !== "codex_output_review_packet_v1") {
    errors.push(
      'codex_output_review_context_v1.review_packet_contract must be "codex_output_review_packet_v1"',
    );
  }
  const expectedId = expectedCodexReviewSourceDecisionPacketId(source_queue_row_id);
  if (source_decision_packet_id !== expectedId) {
    errors.push(
      `source_decision_packet_id must be "${expectedId}" when codex_output_review_context_v1 is set (got ${JSON.stringify(source_decision_packet_id)})`,
    );
  }
  const opt = ctx.founder_option_id;
  if (opt === "approve_readonly_findings") {
    if (decision_status !== "approved" || allowed_next_scope !== "read_only_agent") {
      errors.push(
        "codex_output_review_context_v1.founder_option_id approve_readonly_findings requires decision_status approved and allowed_next_scope read_only_agent (does not grant mutation authority)",
      );
    }
  } else if (opt === "reject_findings") {
    if (decision_status !== "rejected" || allowed_next_scope !== "none") {
      errors.push(
        "codex_output_review_context_v1.founder_option_id reject_findings requires decision_status rejected and allowed_next_scope none",
      );
    }
  } else if (opt === "request_followup_readonly") {
    if (decision_status !== "needs_more_evidence" || allowed_next_scope !== "read_only_agent") {
      errors.push(
        "codex_output_review_context_v1.founder_option_id request_followup_readonly requires decision_status needs_more_evidence and allowed_next_scope read_only_agent",
      );
    }
  } else if (opt === "defer_review") {
    if (decision_status !== "deferred" || allowed_next_scope !== "none") {
      errors.push(
        "codex_output_review_context_v1.founder_option_id defer_review requires decision_status deferred and allowed_next_scope none",
      );
    }
  }
  return errors;
}

export function expectedFridgeBuyerPathBatchApprovalSourceDecisionPacketId(
  proposed_batch_id: string,
): string {
  return `fridge_buyer_path_batch_approval_v1:${proposed_batch_id.trim()}`;
}

export function expectedFridgeBuyerPathBatchApplyPlanApprovalSourceDecisionPacketId(
  source_apply_plan_artifact_rel_path: string,
): string {
  return `fridge_buyer_path_batch_apply_plan_approval_v1:${source_apply_plan_artifact_rel_path.trim()}`;
}

function validateFridgeBuyerPathBatchApprovalContextV1(args: {
  ctx: FounderDecisionRegistryFridgeBuyerPathBatchApprovalContextV1;
  decision_status: FounderDecisionRegistryDecisionStatusV1;
  allowed_next_scope: FounderDecisionRegistryAllowedNextScopeV1;
  source_decision_packet_id: string;
}): string[] {
  const errors: string[] = [];
  const { ctx, decision_status, allowed_next_scope, source_decision_packet_id } = args;
  if (ctx.review_packet_contract !== "fridge_buyer_path_batch_approval_v1") {
    errors.push(
      'fridge_buyer_path_batch_approval_context_v1.review_packet_contract must be "fridge_buyer_path_batch_approval_v1"',
    );
  }
  if (!isNonEmptyString(ctx.proposed_batch_id)) {
    errors.push("fridge_buyer_path_batch_approval_context_v1.proposed_batch_id must be non-empty");
  }
  const expectedId = expectedFridgeBuyerPathBatchApprovalSourceDecisionPacketId(ctx.proposed_batch_id);
  if (source_decision_packet_id !== expectedId) {
    errors.push(
      `source_decision_packet_id must be "${expectedId}" when fridge_buyer_path_batch_approval_context_v1 is set (got ${JSON.stringify(source_decision_packet_id)})`,
    );
  }
  const opt = ctx.founder_option_id;
  if (opt === "approve_for_next_planning_only") {
    if (decision_status !== "approved" || allowed_next_scope !== "read_only_agent") {
      errors.push(
        "fridge_buyer_path_batch_approval_context_v1.founder_option_id approve_for_next_planning_only requires decision_status approved and allowed_next_scope read_only_agent (does not grant mutation authority)",
      );
    }
  } else if (opt === "reject") {
    if (decision_status !== "rejected" || allowed_next_scope !== "none") {
      errors.push(
        "fridge_buyer_path_batch_approval_context_v1.founder_option_id reject requires decision_status rejected and allowed_next_scope none",
      );
    }
  } else if (opt === "request_more_evidence") {
    if (decision_status !== "needs_more_evidence" || allowed_next_scope !== "read_only_agent") {
      errors.push(
        "fridge_buyer_path_batch_approval_context_v1.founder_option_id request_more_evidence requires decision_status needs_more_evidence and allowed_next_scope read_only_agent",
      );
    }
  } else if (opt === "defer") {
    if (decision_status !== "deferred" || allowed_next_scope !== "none") {
      errors.push(
        "fridge_buyer_path_batch_approval_context_v1.founder_option_id defer requires decision_status deferred and allowed_next_scope none",
      );
    }
  }
  return errors;
}

function validateFridgeBuyerPathBatchApplyPlanApprovalContextV1(args: {
  ctx: FounderDecisionRegistryFridgeBuyerPathBatchApplyPlanApprovalContextV1;
  decision_status: FounderDecisionRegistryDecisionStatusV1;
  allowed_next_scope: FounderDecisionRegistryAllowedNextScopeV1;
  source_decision_packet_id: string;
}): string[] {
  const errors: string[] = [];
  const { ctx, decision_status, allowed_next_scope, source_decision_packet_id } = args;
  if (ctx.review_packet_contract !== "fridge_buyer_path_batch_apply_plan_approval_v1") {
    errors.push(
      'fridge_buyer_path_batch_apply_plan_approval_context_v1.review_packet_contract must be "fridge_buyer_path_batch_apply_plan_approval_v1"',
    );
  }
  if (!isNonEmptyString(ctx.source_apply_plan_artifact_rel_path)) {
    errors.push(
      "fridge_buyer_path_batch_apply_plan_approval_context_v1.source_apply_plan_artifact_rel_path must be non-empty",
    );
  }
  if (
    typeof ctx.planned_change_count !== "number" ||
    !Number.isInteger(ctx.planned_change_count) ||
    ctx.planned_change_count < 1
  ) {
    errors.push(
      "fridge_buyer_path_batch_apply_plan_approval_context_v1.planned_change_count must be a positive integer",
    );
  }
  const expectedId = expectedFridgeBuyerPathBatchApplyPlanApprovalSourceDecisionPacketId(
    ctx.source_apply_plan_artifact_rel_path,
  );
  if (source_decision_packet_id !== expectedId) {
    errors.push(
      `source_decision_packet_id must be "${expectedId}" when fridge_buyer_path_batch_apply_plan_approval_context_v1 is set (got ${JSON.stringify(source_decision_packet_id)})`,
    );
  }
  const opt = ctx.founder_option_id;
  if (opt === "approve_for_next_planning_only") {
    if (decision_status !== "approved" || allowed_next_scope !== "read_only_agent") {
      errors.push(
        "fridge_buyer_path_batch_apply_plan_approval_context_v1.founder_option_id approve_for_next_planning_only requires decision_status approved and allowed_next_scope read_only_agent (does not grant mutation authority)",
      );
    }
  } else if (opt === "reject") {
    if (decision_status !== "rejected" || allowed_next_scope !== "none") {
      errors.push(
        "fridge_buyer_path_batch_apply_plan_approval_context_v1.founder_option_id reject requires decision_status rejected and allowed_next_scope none",
      );
    }
  } else if (opt === "request_more_evidence") {
    if (decision_status !== "needs_more_evidence" || allowed_next_scope !== "read_only_agent") {
      errors.push(
        "fridge_buyer_path_batch_apply_plan_approval_context_v1.founder_option_id request_more_evidence requires decision_status needs_more_evidence and allowed_next_scope read_only_agent",
      );
    }
  } else if (opt === "defer") {
    if (decision_status !== "deferred" || allowed_next_scope !== "none") {
      errors.push(
        "fridge_buyer_path_batch_apply_plan_approval_context_v1.founder_option_id defer requires decision_status deferred and allowed_next_scope none",
      );
    }
  }
  return errors;
}

function parseFridgeBuyerPathBatchApplyPlanApprovalContextV1(
  raw: unknown,
): { ok: true; ctx?: FounderDecisionRegistryFridgeBuyerPathBatchApplyPlanApprovalContextV1 } | {
  ok: false;
  errors: string[];
} {
  if (raw === undefined || raw === null) {
    return { ok: true };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      errors: ["fridge_buyer_path_batch_apply_plan_approval_context_v1 must be an object when present"],
    };
  }
  const o = raw as Record<string, unknown>;
  const errors: string[] = [];
  const contract = o.review_packet_contract;
  const opt = o.founder_option_id;
  const source_apply_plan_artifact_rel_path = o.source_apply_plan_artifact_rel_path;
  const planned_change_count = o.planned_change_count;
  if (contract !== "fridge_buyer_path_batch_apply_plan_approval_v1") {
    errors.push(
      'fridge_buyer_path_batch_apply_plan_approval_context_v1.review_packet_contract must be "fridge_buyer_path_batch_apply_plan_approval_v1"',
    );
  }
  if (typeof opt !== "string" || !BATCH_OWNER_REVIEW_OPTIONS.has(opt)) {
    errors.push(
      `fridge_buyer_path_batch_apply_plan_approval_context_v1.founder_option_id must be one of: ${BATCH_PRODUCTION_OWNER_REVIEW_REGISTRY_FOUNDER_OPTION_IDS_V1.join(", ")}`,
    );
  }
  if (
    typeof source_apply_plan_artifact_rel_path !== "string" ||
    !source_apply_plan_artifact_rel_path.trim()
  ) {
    errors.push(
      "fridge_buyer_path_batch_apply_plan_approval_context_v1.source_apply_plan_artifact_rel_path must be a non-empty string",
    );
  }
  if (
    typeof planned_change_count !== "number" ||
    !Number.isInteger(planned_change_count) ||
    planned_change_count < 1
  ) {
    errors.push(
      "fridge_buyer_path_batch_apply_plan_approval_context_v1.planned_change_count must be a positive integer",
    );
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    ctx: {
      review_packet_contract: "fridge_buyer_path_batch_apply_plan_approval_v1",
      founder_option_id: opt as BatchProductionOwnerReviewRegistryFounderOptionIdV1,
      source_apply_plan_artifact_rel_path: (source_apply_plan_artifact_rel_path as string).trim(),
      planned_change_count: planned_change_count as number,
    },
  };
}

function parseFridgeBuyerPathBatchApprovalContextV1(
  raw: unknown,
): { ok: true; ctx?: FounderDecisionRegistryFridgeBuyerPathBatchApprovalContextV1 } | { ok: false; errors: string[] } {
  if (raw === undefined || raw === null) {
    return { ok: true };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      errors: ["fridge_buyer_path_batch_approval_context_v1 must be an object when present"],
    };
  }
  const o = raw as Record<string, unknown>;
  const errors: string[] = [];
  const contract = o.review_packet_contract;
  const opt = o.founder_option_id;
  const proposed_batch_id = o.proposed_batch_id;
  if (contract !== "fridge_buyer_path_batch_approval_v1") {
    errors.push(
      'fridge_buyer_path_batch_approval_context_v1.review_packet_contract must be "fridge_buyer_path_batch_approval_v1"',
    );
  }
  if (typeof opt !== "string" || !BATCH_OWNER_REVIEW_OPTIONS.has(opt)) {
    errors.push(
      `fridge_buyer_path_batch_approval_context_v1.founder_option_id must be one of: ${BATCH_PRODUCTION_OWNER_REVIEW_REGISTRY_FOUNDER_OPTION_IDS_V1.join(", ")}`,
    );
  }
  if (typeof proposed_batch_id !== "string" || !proposed_batch_id.trim()) {
    errors.push("fridge_buyer_path_batch_approval_context_v1.proposed_batch_id must be a non-empty string");
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    ctx: {
      review_packet_contract: "fridge_buyer_path_batch_approval_v1",
      founder_option_id: opt as BatchProductionOwnerReviewRegistryFounderOptionIdV1,
      proposed_batch_id: (proposed_batch_id as string).trim(),
    },
  };
}

function validateBatchProductionOwnerReviewContextV1(args: {
  ctx: FounderDecisionRegistryBatchProductionOwnerReviewContextV1;
  decision_status: FounderDecisionRegistryDecisionStatusV1;
  allowed_next_scope: FounderDecisionRegistryAllowedNextScopeV1;
  source_decision_packet_id: string;
}): string[] {
  const errors: string[] = [];
  const { ctx, decision_status, allowed_next_scope, source_decision_packet_id } = args;
  if (ctx.review_packet_contract !== "batch_owner_screenshot_draft_packet_v1") {
    errors.push(
      'batch_production_owner_review_context_v1.review_packet_contract must be "batch_owner_screenshot_draft_packet_v1"',
    );
  }
  if (!isNonEmptyString(ctx.batch_row_id)) {
    errors.push("batch_production_owner_review_context_v1.batch_row_id must be non-empty");
  }
  if (!isNonEmptyString(ctx.token)) {
    errors.push("batch_production_owner_review_context_v1.token must be non-empty");
  }
  const expectedId = expectedBatchOwnerReviewSourceDecisionPacketId(ctx.batch_row_id);
  if (source_decision_packet_id !== expectedId) {
    errors.push(
      `source_decision_packet_id must be "${expectedId}" when batch_production_owner_review_context_v1 is set (got ${JSON.stringify(source_decision_packet_id)})`,
    );
  }
  const opt = ctx.founder_option_id;
  if (opt === "approve_for_next_planning_only") {
    if (decision_status !== "approved" || allowed_next_scope !== "read_only_agent") {
      errors.push(
        "batch_production_owner_review_context_v1.founder_option_id approve_for_next_planning_only requires decision_status approved and allowed_next_scope read_only_agent (does not grant mutation authority)",
      );
    }
  } else if (opt === "reject") {
    if (decision_status !== "rejected" || allowed_next_scope !== "none") {
      errors.push(
        "batch_production_owner_review_context_v1.founder_option_id reject requires decision_status rejected and allowed_next_scope none",
      );
    }
  } else if (opt === "request_more_evidence") {
    if (decision_status !== "needs_more_evidence" || allowed_next_scope !== "read_only_agent") {
      errors.push(
        "batch_production_owner_review_context_v1.founder_option_id request_more_evidence requires decision_status needs_more_evidence and allowed_next_scope read_only_agent",
      );
    }
  } else if (opt === "defer") {
    if (decision_status !== "deferred" || allowed_next_scope !== "none") {
      errors.push(
        "batch_production_owner_review_context_v1.founder_option_id defer requires decision_status deferred and allowed_next_scope none",
      );
    }
  }
  return errors;
}

function parseBatchProductionOwnerReviewContextV1(
  raw: unknown,
): { ok: true; ctx?: FounderDecisionRegistryBatchProductionOwnerReviewContextV1 } | { ok: false; errors: string[] } {
  if (raw === undefined || raw === null) {
    return { ok: true };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      errors: ["batch_production_owner_review_context_v1 must be an object when present"],
    };
  }
  const o = raw as Record<string, unknown>;
  const errors: string[] = [];
  const contract = o.review_packet_contract;
  const opt = o.founder_option_id;
  const batch_row_id = o.batch_row_id;
  const token = o.token;
  if (contract !== "batch_owner_screenshot_draft_packet_v1") {
    errors.push(
      'batch_production_owner_review_context_v1.review_packet_contract must be "batch_owner_screenshot_draft_packet_v1"',
    );
  }
  if (typeof opt !== "string" || !BATCH_OWNER_REVIEW_OPTIONS.has(opt)) {
    errors.push(
      `batch_production_owner_review_context_v1.founder_option_id must be one of: ${BATCH_PRODUCTION_OWNER_REVIEW_REGISTRY_FOUNDER_OPTION_IDS_V1.join(", ")}`,
    );
  }
  if (typeof batch_row_id !== "string" || !batch_row_id.trim()) {
    errors.push("batch_production_owner_review_context_v1.batch_row_id must be a non-empty string");
  }
  if (typeof token !== "string" || !token.trim()) {
    errors.push("batch_production_owner_review_context_v1.token must be a non-empty string");
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    ctx: {
      review_packet_contract: "batch_owner_screenshot_draft_packet_v1",
      founder_option_id: opt as BatchProductionOwnerReviewRegistryFounderOptionIdV1,
      batch_row_id: (batch_row_id as string).trim(),
      token: (token as string).trim(),
    },
  };
}

function parseCodexOutputReviewContextV1(
  raw: unknown,
): { ok: true; ctx?: FounderDecisionRegistryCodexOutputReviewContextV1 } | { ok: false; errors: string[] } {
  if (raw === undefined || raw === null) {
    return { ok: true };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["codex_output_review_context_v1 must be an object when present"] };
  }
  const o = raw as Record<string, unknown>;
  const errors: string[] = [];
  const contract = o.review_packet_contract;
  const opt = o.founder_option_id;
  if (typeof contract !== "string") {
    errors.push("codex_output_review_context_v1.review_packet_contract must be a string");
  }
  if (typeof opt !== "string" || !CODEX_REVIEW_OPTIONS.has(opt)) {
    errors.push(
      `codex_output_review_context_v1.founder_option_id must be one of: ${CODEX_OUTPUT_REVIEW_REGISTRY_FOUNDER_OPTION_IDS_V1.join(", ")}`,
    );
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    ctx: {
      review_packet_contract: contract as "codex_output_review_packet_v1",
      founder_option_id: opt as CodexOutputReviewRegistryFounderOptionIdV1,
    },
  };
}

function parseIsoInstant(label: string, v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string" || v.trim().length === 0) {
    return undefined;
  }
  const t = Date.parse(v);
  if (Number.isNaN(t)) {
    throw new Error(`${label} must be a parseable ISO 8601 string`);
  }
  return v.trim();
}

function parseBoundArtifactsV1(
  raw: unknown,
): { ok: true; bound?: FounderDecisionRegistryBoundArtifactV1[] } | { ok: false; errors: string[] } {
  if (raw === undefined || raw === null) {
    return { ok: true };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, errors: ["bound_artifacts_v1 must be an array when present"] };
  }
  const ENTRY_TYPES = new Set<FounderDecisionRegistryBoundArtifactV1["entry_type"]>([
    "evidence",
    "founder_approval",
    "execution_plan",
    "apply_plan",
    "csv_mutation_closeout",
  ]);
  const bound: FounderDecisionRegistryBoundArtifactV1[] = [];
  const errors: string[] = [];
  raw.forEach((entry, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`bound_artifacts_v1[${index}] must be an object`);
      return;
    }
    const o = entry as Record<string, unknown>;
    const artifact_rel_path =
      typeof o.artifact_rel_path === "string" ? o.artifact_rel_path.trim() : "";
    const sha256_at_binding =
      typeof o.sha256_at_binding === "string" ? o.sha256_at_binding.trim().toLowerCase() : "";
    const entry_type = o.entry_type;
    if (!artifact_rel_path) {
      errors.push(`bound_artifacts_v1[${index}].artifact_rel_path must be a non-empty string`);
    }
    if (!/^[a-f0-9]{64}$/.test(sha256_at_binding)) {
      errors.push(`bound_artifacts_v1[${index}].sha256_at_binding must be a 64-char hex sha256`);
    }
    if (typeof entry_type !== "string" || !ENTRY_TYPES.has(entry_type as FounderDecisionRegistryBoundArtifactV1["entry_type"])) {
      errors.push(
        `bound_artifacts_v1[${index}].entry_type must be one of: ${Array.from(ENTRY_TYPES).join(", ")}`,
      );
    }
    if (
      artifact_rel_path &&
      /^[a-f0-9]{64}$/.test(sha256_at_binding) &&
      typeof entry_type === "string" &&
      ENTRY_TYPES.has(entry_type as FounderDecisionRegistryBoundArtifactV1["entry_type"])
    ) {
      bound.push({
        artifact_rel_path,
        sha256_at_binding,
        entry_type: entry_type as FounderDecisionRegistryBoundArtifactV1["entry_type"],
      });
    }
  });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, bound };
}

export function validateFounderDecisionRegistryRowV1(
  input: unknown,
): { ok: true; row: FounderDecisionRegistryRowV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["row must be a non-null object"] };
  }
  const o = input as Record<string, unknown>;

  if (!isNonEmptyString(o.decision_id)) errors.push("decision_id must be a non-empty string");
  if (!isNonEmptyString(o.source_queue_row_id)) errors.push("source_queue_row_id must be a non-empty string");
  if (!isNonEmptyString(o.source_decision_packet_id)) {
    errors.push("source_decision_packet_id must be a non-empty string");
  }
  if (!isNonEmptyString(o.decided_at)) {
    errors.push("decided_at must be a non-empty ISO 8601 string");
  } else if (Number.isNaN(Date.parse(o.decided_at))) {
    errors.push("decided_at must parse as a date (ISO 8601)");
  }

  const status = o.decision_status;
  if (typeof status !== "string" || !DECISION_STATUSES.has(status as FounderDecisionRegistryDecisionStatusV1)) {
    errors.push(
      `decision_status must be one of: ${DECISION_STATUS_LIST.join(", ")} (got ${JSON.stringify(status)})`,
    );
  }

  const scope = o.allowed_next_scope;
  if (typeof scope !== "string" || !SCOPES.has(scope as FounderDecisionRegistryAllowedNextScopeV1)) {
    errors.push(`allowed_next_scope must be one of: ${SCOPE_LIST.join(", ")} (got ${JSON.stringify(scope)})`);
  }

  const owner_note = typeof o.owner_note === "string" ? o.owner_note : "";
  if (scope === "owner_mutation_approved" && owner_note.trim().length === 0) {
    errors.push("owner_mutation_approved requires a non-empty owner_note (explicit founder text)");
  }

  const ev = o.evidence_required_before_mutation;
  if (typeof ev !== "boolean") {
    errors.push("evidence_required_before_mutation must be a boolean");
  } else if (scope === "owner_mutation_approved" && ev !== true) {
    errors.push(
      "owner_mutation_approved requires evidence_required_before_mutation === true (explicit evidence gate before mutation)",
    );
  }

  const prohib = o.prohibited_actions_still_apply;
  if (!Array.isArray(prohib) || prohib.length === 0) {
    errors.push("prohibited_actions_still_apply must be a non-empty array of strings");
  } else if (!prohib.every((x) => typeof x === "string" && x.trim().length > 0)) {
    errors.push("prohibited_actions_still_apply entries must be non-empty strings");
  }

  let codexCtx: FounderDecisionRegistryCodexOutputReviewContextV1 | undefined;
  const codexParse = parseCodexOutputReviewContextV1(o.codex_output_review_context_v1);
  if (!codexParse.ok) {
    errors.push(...codexParse.errors);
  } else if (codexParse.ctx) {
    codexCtx = codexParse.ctx;
  }

  let batchCtx: FounderDecisionRegistryBatchProductionOwnerReviewContextV1 | undefined;
  const batchParse = parseBatchProductionOwnerReviewContextV1(
    o.batch_production_owner_review_context_v1,
  );
  if (!batchParse.ok) {
    errors.push(...batchParse.errors);
  } else if (batchParse.ctx) {
    batchCtx = batchParse.ctx;
  }

  let fridgeBatchCtx: FounderDecisionRegistryFridgeBuyerPathBatchApprovalContextV1 | undefined;
  const fridgeBatchParse = parseFridgeBuyerPathBatchApprovalContextV1(
    o.fridge_buyer_path_batch_approval_context_v1,
  );
  if (!fridgeBatchParse.ok) {
    errors.push(...fridgeBatchParse.errors);
  } else if (fridgeBatchParse.ctx) {
    fridgeBatchCtx = fridgeBatchParse.ctx;
  }

  let fridgeApplyPlanCtx: FounderDecisionRegistryFridgeBuyerPathBatchApplyPlanApprovalContextV1 | undefined;
  const fridgeApplyPlanParse = parseFridgeBuyerPathBatchApplyPlanApprovalContextV1(
    o.fridge_buyer_path_batch_apply_plan_approval_context_v1,
  );
  if (!fridgeApplyPlanParse.ok) {
    errors.push(...fridgeApplyPlanParse.errors);
  } else if (fridgeApplyPlanParse.ctx) {
    fridgeApplyPlanCtx = fridgeApplyPlanParse.ctx;
  }

  let boundArtifacts: FounderDecisionRegistryBoundArtifactV1[] | undefined;
  const boundParse = parseBoundArtifactsV1(o.bound_artifacts_v1);
  if (!boundParse.ok) {
    errors.push(...boundParse.errors);
  } else if (boundParse.bound) {
    boundArtifacts = boundParse.bound;
  }

  let executiveRecommendationDecisionPriors: DecisionPriorIdV1[] | undefined;
  if (o.executive_recommendation_decision_priors !== undefined) {
    const priorsParse = validateDecisionPriorsV1(o.executive_recommendation_decision_priors);
    if (!priorsParse.ok) {
      errors.push(...priorsParse.errors.map((e) => `executive_recommendation_decision_priors: ${e}`));
    } else {
      executiveRecommendationDecisionPriors = priorsParse.decision_priors;
    }
  }

  const contextCount = [codexCtx, batchCtx, fridgeBatchCtx, fridgeApplyPlanCtx].filter(Boolean).length;
  if (contextCount > 1) {
    errors.push(
      "row must set at most one of codex_output_review_context_v1, batch_production_owner_review_context_v1, fridge_buyer_path_batch_approval_context_v1, fridge_buyer_path_batch_apply_plan_approval_context_v1",
    );
  }

  let expires_at: string | null | undefined;
  let review_after: string | null | undefined;
  try {
    expires_at = parseIsoInstant("expires_at", o.expires_at);
    review_after = parseIsoInstant("review_after", o.review_after);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const decision_status = o.decision_status as FounderDecisionRegistryDecisionStatusV1;
  const allowed_next_scope = o.allowed_next_scope as FounderDecisionRegistryAllowedNextScopeV1;
  const source_queue_row_id = (o.source_queue_row_id as string).trim();
  const source_decision_packet_id = (o.source_decision_packet_id as string).trim();

  if (codexCtx) {
    errors.push(
      ...validateCodexOutputReviewContextV1({
        ctx: codexCtx,
        decision_status,
        allowed_next_scope,
        source_queue_row_id,
        source_decision_packet_id,
      }),
    );
  }

  if (batchCtx) {
    errors.push(
      ...validateBatchProductionOwnerReviewContextV1({
        ctx: batchCtx,
        decision_status,
        allowed_next_scope,
        source_decision_packet_id,
      }),
    );
  }

  if (fridgeBatchCtx) {
    errors.push(
      ...validateFridgeBuyerPathBatchApprovalContextV1({
        ctx: fridgeBatchCtx,
        decision_status,
        allowed_next_scope,
        source_decision_packet_id,
      }),
    );
  }

  if (fridgeApplyPlanCtx) {
    errors.push(
      ...validateFridgeBuyerPathBatchApplyPlanApprovalContextV1({
        ctx: fridgeApplyPlanCtx,
        decision_status,
        allowed_next_scope,
        source_decision_packet_id,
      }),
    );
  }

  if (allowed_next_scope === "owner_mutation_approved") {
    if (expires_at == null || expires_at === undefined || expires_at.trim() === "") {
      errors.push("owner_mutation_approved requires expires_at (non-null ISO 8601 instant)");
    } else {
      const decidedAtMs = Date.parse((o.decided_at as string).trim());
      const expiresAtMs = Date.parse(expires_at);
      if (!Number.isNaN(decidedAtMs) && !Number.isNaN(expiresAtMs) && expiresAtMs <= decidedAtMs) {
        errors.push("owner_mutation_approved expires_at must be after decided_at");
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const evidence_required_before_mutation = ev as boolean;
  const row: FounderDecisionRegistryRowV1 = {
    decision_id: (o.decision_id as string).trim(),
    source_queue_row_id,
    source_decision_packet_id,
    decided_at: (o.decided_at as string).trim(),
    decision_status,
    owner_note,
    allowed_next_scope,
    expires_at,
    review_after,
    evidence_required_before_mutation,
    prohibited_actions_still_apply: prohib as string[],
    ...(codexCtx ? { codex_output_review_context_v1: codexCtx } : {}),
    ...(batchCtx ? { batch_production_owner_review_context_v1: batchCtx } : {}),
    ...(fridgeBatchCtx ? { fridge_buyer_path_batch_approval_context_v1: fridgeBatchCtx } : {}),
    ...(fridgeApplyPlanCtx
      ? { fridge_buyer_path_batch_apply_plan_approval_context_v1: fridgeApplyPlanCtx }
      : {}),
    ...(boundArtifacts ? { bound_artifacts_v1: boundArtifacts } : {}),
    ...(executiveRecommendationDecisionPriors !== undefined
      ? { executive_recommendation_decision_priors: executiveRecommendationDecisionPriors }
      : {}),
  };
  return { ok: true, row };
}

export function validateFounderDecisionRegistryDocumentV1(
  input: unknown,
): { ok: true; doc: FounderDecisionRegistryDocumentV1 } | { ok: false; errors: string[] } {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["document must be a non-null object"] };
  }
  const o = input as Record<string, unknown>;
  const errors: string[] = [];
  if (o.contract !== FOUNDER_DECISION_REGISTRY_CONTRACT_V1) {
    errors.push(`contract must be "${FOUNDER_DECISION_REGISTRY_CONTRACT_V1}"`);
  }
  if (o.read_only !== true) errors.push("read_only must be true");
  if (o.data_mutation !== false) errors.push("data_mutation must be false");
  if (!Array.isArray(o.rows)) {
    errors.push("rows must be an array");
    return { ok: false, errors };
  }
  const rows: FounderDecisionRegistryRowV1[] = [];
  o.rows.forEach((r, i) => {
    const v = validateFounderDecisionRegistryRowV1(r);
    if (!v.ok) {
      errors.push(`rows[${i}]: ${v.errors.join("; ")}`);
    } else {
      rows.push(v.row);
    }
  });
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    doc: {
      contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      rows,
    },
  };
}

/**
 * PROVEN: `read_only_agent` never authorizes mutating repo scripts or production mutation.
 * INFERRED: Only `owner_mutation_approved` can surface as a mutation-shaped scope label — still subject to time bounds.
 *
 * INFORMATIONAL ONLY: does not verify `bound_artifacts_v1`. Mutation paths MUST use
 * `founderRegistryRowPassesMutationApprovalGateV1` from founder-mutation-approval-gate-v1.
 */
export function founderRegistryRowGrantsMutatingRepoAuthority(
  row: FounderDecisionRegistryRowV1,
  referenceTimeIso: string,
): boolean {
  return isFounderRegistryRowActiveMutationApproval(row, referenceTimeIso);
}

/** Active “standing approval” for mutation-shaped scope: approved + owner_mutation_approved + not past expires_at/review_after. */
export function isFounderRegistryRowActiveMutationApproval(
  row: FounderDecisionRegistryRowV1,
  referenceTimeIso: string,
): boolean {
  const v = validateFounderDecisionRegistryRowV1(row);
  if (!v.ok) return false;
  const r = v.row;
  if (r.decision_status !== "approved" || r.allowed_next_scope !== "owner_mutation_approved") {
    return false;
  }
  const now = Date.parse(referenceTimeIso);
  if (Number.isNaN(now)) return false;
  if (r.expires_at == null || String(r.expires_at).trim() === "") {
    return false;
  }
  const exp = Date.parse(r.expires_at);
  if (Number.isNaN(exp) || now >= exp) return false;
  if (r.review_after != null && r.review_after !== "") {
    const rev = Date.parse(r.review_after);
    if (!Number.isNaN(rev) && now >= rev) return false;
  }
  return true;
}
