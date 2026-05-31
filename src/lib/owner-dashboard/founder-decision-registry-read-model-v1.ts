/**
 * Founder Decision Registry Read Model v1 — pure aggregation over parsed registry JSON.
 * PROVEN: no queue / packet / Runner / gate side effects; counts and facts only.
 */

import type {
  CodexOutputReviewRegistryFounderOptionIdV1,
  FounderDecisionRegistryDecisionStatusV1,
  FounderDecisionRegistryRowV1,
} from "./founder-decision-registry-v1";
import type { BatchProductionOwnerReviewRegistryFounderOptionIdV1 } from "./founder-decision-registry-v1";
import {
  expectedFridgeBuyerPathBatchApprovalSourceDecisionPacketId,
  isCodexOutputReviewRegistryRowV1,
  isFridgeBuyerPathBatchApprovalRegistryRowV1,
  isFounderRegistryRowActiveMutationApproval,
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
} from "./founder-decision-registry-v1";

export const FOUNDER_DECISION_REGISTRY_READ_MODEL_CONTRACT_V1 =
  "founder_decision_registry_read_model_v1" as const;

export type FounderDecisionRegistryReadModelFileInputV1 =
  | { source: string; parsed: unknown }
  | { source: string; parseError: string };

export type FounderDecisionRegistryReadModelLatestDecisionV1 = {
  decision_id: string;
  source_queue_row_id: string;
  source_decision_packet_id: string;
  decided_at: string;
  decision_status: FounderDecisionRegistryDecisionStatusV1;
  allowed_next_scope: FounderDecisionRegistryRowV1["allowed_next_scope"];
  source: string;
};

export type FounderDecisionRegistryReadModelInvalidRowV1 = {
  source: string;
  row_index: number;
  errors: string[];
};

export type FounderDecisionRegistryCodexReviewDigestMatchV1 =
  | { kind: "NO_DIGEST_CODEX_REVIEW_CONTEXT" }
  | { kind: "NO_REGISTRY_ROW_FOR_QUEUE"; source_queue_row_id: string }
  | {
      kind: "MATCHED";
      source_queue_row_id: string;
      registry_source: string;
      decision_id: string;
      decided_at: string;
      decision_status: FounderDecisionRegistryDecisionStatusV1;
      allowed_next_scope: FounderDecisionRegistryRowV1["allowed_next_scope"];
      codex_output_review_founder_option_id: CodexOutputReviewRegistryFounderOptionIdV1;
    };

export type FounderDecisionRegistryFridgeBuyerPathBatchApprovalDigestMatchV1 =
  | { kind: "NO_DIGEST_FRIDGE_BATCH_APPROVAL_CONTEXT" }
  | { kind: "NO_REGISTRY_ROW_FOR_BATCH"; proposed_batch_id: string }
  | {
      kind: "MATCHED";
      proposed_batch_id: string;
      source_decision_packet_id: string;
      registry_source: string;
      decision_id: string;
      decided_at: string;
      decision_status: FounderDecisionRegistryDecisionStatusV1;
      allowed_next_scope: FounderDecisionRegistryRowV1["allowed_next_scope"];
      fridge_buyer_path_batch_approval_founder_option_id: BatchProductionOwnerReviewRegistryFounderOptionIdV1;
    };

export type FounderDecisionRegistryReadModelV1 = {
  contract: typeof FOUNDER_DECISION_REGISTRY_READ_MODEL_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  reference_time_iso: string;
  total_documents: number;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  active_mutation_approvals: number;
  expired_or_review_due_rows: number;
  read_only_agent_rows: number;
  human_external_rows: number;
  /** Rows with `codex_output_review_context_v1` set (validated). */
  codex_output_review_decision_rows: number;
  approved_readonly_findings_count: number;
  rejected_findings_count: number;
  request_followup_readonly_count: number;
  deferred_review_count: number;
  /** Rows with `fridge_buyer_path_batch_approval_context_v1` set (validated). */
  fridge_buyer_path_batch_approval_decision_rows: number;
  /** Digest-only: when founder digest supplies Codex review `source_queue_row_id`, latest matching registry row (if any). */
  codex_output_review_digest_match: FounderDecisionRegistryCodexReviewDigestMatchV1;
  /** When caller supplies fridge batch `proposed_batch_id`, latest matching registry row (if any). */
  fridge_buyer_path_batch_approval_digest_match: FounderDecisionRegistryFridgeBuyerPathBatchApprovalDigestMatchV1;
  latest_decisions: FounderDecisionRegistryReadModelLatestDecisionV1[];
  proven_facts: string[];
  unknown_facts: string[];
  /** PROVEN: invalid row-level salvage outcomes (document envelope may have failed). */
  invalid_row_details: FounderDecisionRegistryReadModelInvalidRowV1[];
};

function rowTimeGateElapsed(row: FounderDecisionRegistryRowV1, referenceTimeIso: string): boolean {
  const now = Date.parse(referenceTimeIso);
  if (Number.isNaN(now)) return false;
  if (row.expires_at != null && row.expires_at !== "") {
    const exp = Date.parse(row.expires_at);
    if (!Number.isNaN(exp) && now >= exp) return true;
  }
  if (row.review_after != null && row.review_after !== "") {
    const rev = Date.parse(row.review_after);
    if (!Number.isNaN(rev) && now >= rev) return true;
  }
  return false;
}

/**
 * PROVEN: pure function — caller supplies already-parsed JSON per file (or parse errors).
 * INFERRED: `active_mutation_approvals` uses the same time semantics as `isFounderRegistryRowActiveMutationApproval`.
 * Optional `codex_output_review_digest_match` ties digest-built Codex review `source_queue_row_id` to registry rows (informational only).
 */
export function buildFounderDecisionRegistryReadModelV1(
  files: FounderDecisionRegistryReadModelFileInputV1[],
  options: {
    generated_at: string;
    reference_time_iso: string;
    /** When digest passes Codex Output Review `source_queue_row_id`, surface latest matching `codex_output_review_context_v1` row. */
    codex_output_review_digest_match?: { source_queue_row_id: string | null } | null;
    /** When caller passes fridge buyer-path batch `proposed_batch_id`, surface latest matching approval row. */
    fridge_buyer_path_batch_approval_digest_match?: { proposed_batch_id: string | null } | null;
  },
): FounderDecisionRegistryReadModelV1 {
  const generated_at = options.generated_at;
  const reference_time_iso = options.reference_time_iso;
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [];
  const invalid_row_details: FounderDecisionRegistryReadModelInvalidRowV1[] = [];
  const validRecords: Array<{ source: string; row: FounderDecisionRegistryRowV1 }> = [];

  let total_documents = 0;
  let total_rows = 0;
  let valid_rows = 0;
  let invalid_rows = 0;

  if (files.length === 0) {
    proven_facts.push(
      "PROVEN: Read model received zero registry JSON file inputs under the supplied scan set.",
    );
    unknown_facts.push(
      "UNKNOWN: Whether `data/owner-decisions/*.json` exists on disk until `npm run buckparts:founder-decision-registry` (or digest scan) runs. For machine-parseable JSON stdout use `node --import tsx scripts/report-founder-decision-registry.ts` per `docs/BuckParts-JSON-STDOUT-CONTRACT.md`.",
    );
  }

  for (const file of files) {
    total_documents++;
    if ("parseError" in file) {
      proven_facts.push(`PROVEN: File "${file.source}" failed JSON.parse — excluded from row counts.`);
      unknown_facts.push(`UNKNOWN: Repair JSON in "${file.source}" (${file.parseError}).`);
      continue;
    }

    const docResult = validateFounderDecisionRegistryDocumentV1(file.parsed);
    if (docResult.ok) {
      for (const row of docResult.doc.rows) {
        total_rows++;
        valid_rows++;
        validRecords.push({ source: file.source, row });
      }
      continue;
    }

    const p = file.parsed;
    if (p && typeof p === "object" && !Array.isArray(p) && Array.isArray((p as Record<string, unknown>).rows)) {
      const rows = (p as { rows: unknown[] }).rows;
      rows.forEach((raw, idx) => {
        total_rows++;
        const rv = validateFounderDecisionRegistryRowV1(raw);
        if (rv.ok) {
          valid_rows++;
          validRecords.push({ source: file.source, row: rv.row });
        } else {
          invalid_rows++;
          invalid_row_details.push({ source: file.source, row_index: idx, errors: rv.errors });
        }
      });
      proven_facts.push(
        `PROVEN: File "${file.source}" failed full-document validation; salvage processed ${rows.length} raw row(s).`,
      );
      unknown_facts.push(`UNKNOWN: Document-level errors for "${file.source}": ${docResult.errors.join("; ")}.`);
    } else {
      unknown_facts.push(
        `UNKNOWN: File "${file.source}" failed document validation and has no salvageable rows[] (${docResult.errors.join("; ")}).`,
      );
    }
  }

  if (files.length > 0) {
    proven_facts.push(
      `PROVEN: Processed ${total_documents} JSON file input(s); row slots=${total_rows}; valid=${valid_rows}; invalid=${invalid_rows}.`,
    );
  }

  let active_mutation_approvals = 0;
  let expired_or_review_due_rows = 0;
  let read_only_agent_rows = 0;
  let human_external_rows = 0;

  for (const { row } of validRecords) {
    if (isFounderRegistryRowActiveMutationApproval(row, reference_time_iso)) {
      active_mutation_approvals++;
    } else if (rowTimeGateElapsed(row, reference_time_iso)) {
      expired_or_review_due_rows++;
    }
    if (row.allowed_next_scope === "read_only_agent") {
      read_only_agent_rows++;
    }
    if (row.allowed_next_scope === "human_external") {
      human_external_rows++;
    }
  }

  let codex_output_review_decision_rows = 0;
  let approved_readonly_findings_count = 0;
  let rejected_findings_count = 0;
  let request_followup_readonly_count = 0;
  let deferred_review_count = 0;

  for (const { row } of validRecords) {
    if (!isCodexOutputReviewRegistryRowV1(row) || !row.codex_output_review_context_v1) continue;
    codex_output_review_decision_rows++;
    const opt = row.codex_output_review_context_v1.founder_option_id;
    if (opt === "approve_readonly_findings") approved_readonly_findings_count++;
    else if (opt === "reject_findings") rejected_findings_count++;
    else if (opt === "request_followup_readonly") request_followup_readonly_count++;
    else if (opt === "defer_review") deferred_review_count++;
  }

  let fridge_buyer_path_batch_approval_decision_rows = 0;
  for (const { row } of validRecords) {
    if (!isFridgeBuyerPathBatchApprovalRegistryRowV1(row) || !row.fridge_buyer_path_batch_approval_context_v1) {
      continue;
    }
    fridge_buyer_path_batch_approval_decision_rows++;
  }

  const matchOpt = options.codex_output_review_digest_match;
  let codex_output_review_digest_match: FounderDecisionRegistryCodexReviewDigestMatchV1 = {
    kind: "NO_DIGEST_CODEX_REVIEW_CONTEXT",
  };
  if (matchOpt != null && matchOpt.source_queue_row_id != null && matchOpt.source_queue_row_id.trim() !== "") {
    const qid = matchOpt.source_queue_row_id.trim();
    const candidates = validRecords.filter(
      (r) => isCodexOutputReviewRegistryRowV1(r.row) && r.row.source_queue_row_id === qid,
    );
    if (candidates.length === 0) {
      codex_output_review_digest_match = { kind: "NO_REGISTRY_ROW_FOR_QUEUE", source_queue_row_id: qid };
    } else {
      const sortedC = [...candidates].sort((a, b) => Date.parse(b.row.decided_at) - Date.parse(a.row.decided_at));
      const top = sortedC[0]!;
      const ctx = top.row.codex_output_review_context_v1!;
      codex_output_review_digest_match = {
        kind: "MATCHED",
        source_queue_row_id: qid,
        registry_source: top.source,
        decision_id: top.row.decision_id,
        decided_at: top.row.decided_at,
        decision_status: top.row.decision_status,
        allowed_next_scope: top.row.allowed_next_scope,
        codex_output_review_founder_option_id: ctx.founder_option_id,
      };
    }
  }

  const fridgeMatchOpt = options.fridge_buyer_path_batch_approval_digest_match;
  let fridge_buyer_path_batch_approval_digest_match: FounderDecisionRegistryFridgeBuyerPathBatchApprovalDigestMatchV1 =
    { kind: "NO_DIGEST_FRIDGE_BATCH_APPROVAL_CONTEXT" };
  if (
    fridgeMatchOpt != null &&
    fridgeMatchOpt.proposed_batch_id != null &&
    fridgeMatchOpt.proposed_batch_id.trim() !== ""
  ) {
    const batchId = fridgeMatchOpt.proposed_batch_id.trim();
    const expectedPacketId = expectedFridgeBuyerPathBatchApprovalSourceDecisionPacketId(batchId);
    const candidates = validRecords.filter((r) => {
      const ctx = r.row.fridge_buyer_path_batch_approval_context_v1;
      return (
        isFridgeBuyerPathBatchApprovalRegistryRowV1(r.row) &&
        ctx?.proposed_batch_id === batchId &&
        r.row.source_decision_packet_id === expectedPacketId
      );
    });
    if (candidates.length === 0) {
      fridge_buyer_path_batch_approval_digest_match = {
        kind: "NO_REGISTRY_ROW_FOR_BATCH",
        proposed_batch_id: batchId,
      };
    } else {
      const sortedF = [...candidates].sort(
        (a, b) => Date.parse(b.row.decided_at) - Date.parse(a.row.decided_at),
      );
      const topF = sortedF[0]!;
      const ctxF = topF.row.fridge_buyer_path_batch_approval_context_v1!;
      fridge_buyer_path_batch_approval_digest_match = {
        kind: "MATCHED",
        proposed_batch_id: batchId,
        source_decision_packet_id: topF.row.source_decision_packet_id,
        registry_source: topF.source,
        decision_id: topF.row.decision_id,
        decided_at: topF.row.decided_at,
        decision_status: topF.row.decision_status,
        allowed_next_scope: topF.row.allowed_next_scope,
        fridge_buyer_path_batch_approval_founder_option_id: ctxF.founder_option_id,
      };
    }
  }

  proven_facts.push(
    `PROVEN: Codex Output Review-linked registry rows (codex_output_review_context_v1): ${codex_output_review_decision_rows} (by option — approve_readonly_findings=${approved_readonly_findings_count}, reject_findings=${rejected_findings_count}, request_followup_readonly=${request_followup_readonly_count}, defer_review=${deferred_review_count}).`,
  );
  proven_facts.push(
    `PROVEN: Fridge buyer-path batch approval registry rows (fridge_buyer_path_batch_approval_context_v1): ${fridge_buyer_path_batch_approval_decision_rows}.`,
  );
  const sorted = [...validRecords].sort((a, b) => Date.parse(b.row.decided_at) - Date.parse(a.row.decided_at));
  const latest_decisions: FounderDecisionRegistryReadModelLatestDecisionV1[] = sorted.slice(0, 20).map((r) => ({
    decision_id: r.row.decision_id,
    source_queue_row_id: r.row.source_queue_row_id,
    source_decision_packet_id: r.row.source_decision_packet_id,
    decided_at: r.row.decided_at,
    decision_status: r.row.decision_status,
    allowed_next_scope: r.row.allowed_next_scope,
    source: r.source,
  }));

  proven_facts.push(
    `PROVEN: Active mutation-shaped approvals (counted only; not consumed by Runner, queues, packets, or gates): ${active_mutation_approvals}.`,
  );
  proven_facts.push(
    `PROVEN: Expired / review-due time gates (among valid rows, excluding active mutation approvals): ${expired_or_review_due_rows}.`,
  );
  proven_facts.push(
    `PROVEN: Registry read model does not alter Founder Action Queue, Decision Packets, Execution Packets, Runner Step, or mutation gates.`,
  );

  return {
    contract: FOUNDER_DECISION_REGISTRY_READ_MODEL_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at,
    reference_time_iso,
    total_documents,
    total_rows,
    valid_rows,
    invalid_rows,
    active_mutation_approvals,
    expired_or_review_due_rows,
    read_only_agent_rows,
    human_external_rows,
    codex_output_review_decision_rows,
    approved_readonly_findings_count,
    rejected_findings_count,
    request_followup_readonly_count,
    deferred_review_count,
    fridge_buyer_path_batch_approval_decision_rows,
    codex_output_review_digest_match,
    fridge_buyer_path_batch_approval_digest_match,
    latest_decisions,
    proven_facts,
    unknown_facts,
    invalid_row_details,
  };
}

/** Markdown fragment for weekly digest (read-only summary; automation non-consuming). */
export function formatFounderDecisionRegistryReadModelDigestMarkdownV1(model: FounderDecisionRegistryReadModelV1): string {
  const codexDigestLines = (() => {
    const m = model.codex_output_review_digest_match;
    if (m.kind === "NO_DIGEST_CODEX_REVIEW_CONTEXT") {
      return [
        "**Codex Output Review ↔ Founder Decision Registry (digest correlation):** **UNKNOWN** — digest did not supply a Codex review `source_queue_row_id` for this read-model build (e.g. `npm run buckparts:founder-decision-registry` without digest env). Counts above still include any on-disk Codex-linked rows.",
        "**NOT PROVEN:** Recording a row authorizes Supabase writes, `retailer_links` mutation, evidence JSON writes, affiliate edits, git commits, Runner automation, or any closed-loop agent behavior — registry rows are **owner judgment only**.",
      ];
    }
    if (m.kind === "NO_REGISTRY_ROW_FOR_QUEUE") {
      return [
        `**Codex Output Review ↔ Founder Decision Registry:** **PROVEN:** Digest Codex review targets \`source_queue_row_id\`=\`${m.source_queue_row_id}\` — **no validated registry row** with \`codex_output_review_context_v1\` was found for that queue id in \`data/owner-decisions/*.json\`.`,
        "**NOT PROVEN:** Absence of a row implies nothing about Codex correctness — only that structured owner judgment was not recorded yet.",
        "**NOT PROVEN:** A future matching row would still be informational only (no mutation authority, no Runner input).",
      ];
    }
    return [
      `**Codex Output Review ↔ Founder Decision Registry:** **PROVEN:** Latest matching row for digest Codex review queue \`${m.source_queue_row_id}\` (file \`${m.registry_source}\`).`,
      `- \`decision_id\`: \`${m.decision_id}\` · \`decided_at\`: \`${m.decided_at}\``,
      `- \`decision_status\`: \`${m.decision_status}\` · \`allowed_next_scope\`: \`${m.allowed_next_scope}\` · \`codex_output_review_founder_option_id\`: \`${m.codex_output_review_founder_option_id}\``,
      "**PROVEN:** This match proves **read visibility** of owner judgment for Codex Output Review — **not** Layer 6 completion, **not** automation consumption, **not** mutation authority (including for `approve_readonly_findings`: still no Supabase / `retailer_links` / evidence / affiliate / commits / Runner gates).",
    ];
  })();

  const lines = [
    `**PROVEN:** Contract \`${model.contract}\` · read_only=\`${String(model.read_only)}\` · data_mutation=\`${String(model.data_mutation)}\`.`,
    `**PROVEN:** Registry JSON documents: \`${model.total_documents}\`; rows: \`${model.total_rows}\` total · \`${model.valid_rows}\` valid · \`${model.invalid_rows}\` invalid.`,
    `**PROVEN:** Active mutation-shaped approvals (**counted only**, not consumed by automation): \`${model.active_mutation_approvals}\`. Expired / review-due (time-gated) valid rows: \`${model.expired_or_review_due_rows}\`.`,
    `**PROVEN:** Scope labels — \`read_only_agent\`: \`${model.read_only_agent_rows}\`; \`human_external\`: \`${model.human_external_rows}\`.`,
    `**PROVEN:** \`codex_output_review_context_v1\` rows: \`${model.codex_output_review_decision_rows}\` — approve_readonly=\`${model.approved_readonly_findings_count}\`, reject=\`${model.rejected_findings_count}\`, request_followup_readonly=\`${model.request_followup_readonly_count}\`, defer=\`${model.deferred_review_count}\`.`,
    `**PROVEN:** \`fridge_buyer_path_batch_approval_context_v1\` rows: \`${model.fridge_buyer_path_batch_approval_decision_rows}\`.`,
    "**PROVEN:** This read model does **not** instruct agents, CI, or Runner to act on registry decisions.",
    "",
    ...codexDigestLines,
    "",
    "**Facts (trimmed):**",
    ...model.proven_facts.slice(-6).map((f) => `- ${f}`),
    ...(model.unknown_facts.length > 0 ? ["", "**Unknown / follow-ups:**", ...model.unknown_facts.slice(0, 4).map((f) => `- ${f}`)] : []),
    "",
  ];
  return `${lines.join("\n")}\n`;
}
