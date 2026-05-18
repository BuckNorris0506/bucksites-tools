/**
 * Batch Owner Approval v1 — founder decisions on owner-review-ready draft rows.
 * PROVEN: read-only compile; does not mutate Supabase, retailer_links, or data/evidence/.
 */

import {
  BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1,
  type BatchOwnerScreenshotDraftPacketV1,
  type BatchOwnerScreenshotDraftRowV1,
} from "./batch-owner-screenshot-draft-packet-v1";
import { parseBatchOwnerScreenshotDraftReviewV1 } from "./batch-owner-review-report-v1";
import {
  FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryDocumentV1,
  type FounderDecisionRegistryRowV1,
} from "./founder-decision-registry-v1";
import type { BatchProductionOwnerReviewRegistryFounderOptionIdV1 } from "./founder-decision-registry-v1";

export const BATCH_OWNER_APPROVAL_PACKET_CONTRACT_V1 = "batch_owner_approval_packet_v1" as const;

export const BATCH_OWNER_APPROVAL_CHECKLIST_CONTRACT_V1 =
  "batch_owner_approval_checklist_v1" as const;

export const BATCH_OWNER_APPROVAL_NO_AUTHORITY_ATTESTATION_V1 =
  "PROVEN: Owner-review approval in this packet does not authorize Supabase writes, retailer_links mutation, production evidence JSON under data/evidence/, affiliate URL changes, git commits, deploys, or batch apply/mutation execution. may_mutate and may_write_production_evidence are false. layer_6_founder_only_approval remains NOT_PROVEN.";

export const BATCH_OWNER_APPROVAL_PROHIBITED_ACTIONS_V1 = [
  "Do not write to Supabase or run SQL that mutates database state.",
  "Do not mutate retailer_links or other retailer catalog/link artifacts.",
  "Do not create, delete, or overwrite production evidence JSON under data/evidence/.",
  "Do not change affiliate program URLs, tracking parameters, or affiliate application state in-repo.",
  "Do not run batch apply/mutation scripts or mutating npm targets from this approval alone.",
  "approve_for_next_planning_only is planning/read-model scope only — not production mutation approval.",
  "This approval row is not automation_input for Runner Step, queues, or mutation gates.",
] as const;

/** Aligned with `BATCH_OWNER_DECISION_OPTIONS_V1` in batch-owner-review-report-v1.ts */
export const BATCH_OWNER_APPROVAL_FOUNDER_OPTIONS_V1 = [
  "approve_for_next_planning_only",
  "reject",
  "request_more_evidence",
  "defer",
] as const;

export type BatchOwnerApprovalFounderOptionV1 =
  (typeof BATCH_OWNER_APPROVAL_FOUNDER_OPTIONS_V1)[number];

export type BatchOwnerApprovalInputRowV1 = {
  row_id: string;
  founder_option_id: BatchOwnerApprovalFounderOptionV1;
  owner_note?: string;
};

export const BATCH_OWNER_APPROVAL_ACTIVE_DECISION_BEGIN_PREFIX_V1 =
  "BEGIN_ACTIVE_DECISION row_id=" as const;

export const BATCH_OWNER_APPROVAL_ACTIVE_DECISION_END_V1 = "END_ACTIVE_DECISION" as const;

export const BATCH_OWNER_APPROVAL_CHOOSE_ONE_SENTINEL_V1 = "_choose_one_" as const;

export type BatchOwnerApprovalDecisionRowParseV1 = {
  row_id: string;
  founder_option_id: BatchOwnerApprovalFounderOptionV1 | null;
  owner_note?: string;
  parse_errors: string[];
};

export type BatchOwnerApprovalDecisionsParseV1 = {
  decisions: BatchOwnerApprovalInputRowV1[];
  row_results: BatchOwnerApprovalDecisionRowParseV1[];
  errors: string[];
};

export type BatchOwnerApprovalPacketRowV1 = {
  row_id: string;
  token: string | null;
  source_queue_row_id: string | null;
  draft_ready_for_owner_review: boolean;
  founder_option_id: BatchOwnerApprovalFounderOptionV1;
  owner_note: string;
  registry_row: FounderDecisionRegistryRowV1 | null;
  registry_validation_errors: string[];
};

export type BatchOwnerApprovalPacketV1 = {
  contract: typeof BATCH_OWNER_APPROVAL_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  may_mutate: false;
  may_write_production_evidence: false;
  automation_input: false;
  generated_at: string;
  source_review_contract: typeof BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1;
  source_review_generated_at: string | null;
  approval_row_count: number;
  layer_6_founder_only_approval: "NOT_PROVEN";
  no_mutation_authority_attestation: typeof BATCH_OWNER_APPROVAL_NO_AUTHORITY_ATTESTATION_V1;
  rows: BatchOwnerApprovalPacketRowV1[];
  founder_decision_registry_export: FounderDecisionRegistryDocumentV1 | null;
  proven_facts: string[];
  unknown_facts: string[];
};

const OPTION_SET = new Set<string>(BATCH_OWNER_APPROVAL_FOUNDER_OPTIONS_V1);

export function expectedBatchOwnerReviewSourceDecisionPacketId(batchRowId: string): string {
  return `batch_owner_review_packet_v1:${batchRowId.trim()}`;
}

export function mapBatchOwnerOptionToRegistryStatusScope(
  option: BatchOwnerApprovalFounderOptionV1,
): {
  decision_status: FounderDecisionRegistryRowV1["decision_status"];
  allowed_next_scope: FounderDecisionRegistryRowV1["allowed_next_scope"];
} {
  switch (option) {
    case "approve_for_next_planning_only":
      return { decision_status: "approved", allowed_next_scope: "read_only_agent" };
    case "reject":
      return { decision_status: "rejected", allowed_next_scope: "none" };
    case "request_more_evidence":
      return { decision_status: "needs_more_evidence", allowed_next_scope: "read_only_agent" };
    case "defer":
      return { decision_status: "deferred", allowed_next_scope: "none" };
  }
}

export function buildFounderRegistryRowFromBatchOwnerApprovalV1(args: {
  draftRow: BatchOwnerScreenshotDraftRowV1;
  founder_option_id: BatchOwnerApprovalFounderOptionV1;
  owner_note: string;
  decided_at: string;
  decision_id?: string;
}): FounderDecisionRegistryRowV1 {
  const { decision_status, allowed_next_scope } = mapBatchOwnerOptionToRegistryStatusScope(
    args.founder_option_id,
  );
  const row_id = args.draftRow.row_id.trim();
  const token = (args.draftRow.token ?? row_id).trim();
  const queueId = args.draftRow.source_queue_row_id?.trim() ?? "queue-non-amazon-pdp-agent";
  const decision_id =
    args.decision_id ??
    `decision-${args.decided_at.slice(0, 10)}-batch-owner-review-${row_id}-${args.founder_option_id}`;

  return {
    decision_id,
    source_queue_row_id: queueId,
    source_decision_packet_id: expectedBatchOwnerReviewSourceDecisionPacketId(row_id),
    decided_at: args.decided_at,
    decision_status,
    owner_note: args.owner_note.trim(),
    allowed_next_scope,
    evidence_required_before_mutation: false,
    prohibited_actions_still_apply: [...BATCH_OWNER_APPROVAL_PROHIBITED_ACTIONS_V1],
    batch_production_owner_review_context_v1: {
      review_packet_contract: "batch_owner_screenshot_draft_packet_v1",
      founder_option_id: args.founder_option_id as BatchProductionOwnerReviewRegistryFounderOptionIdV1,
      batch_row_id: row_id,
      token,
    },
  };
}

function defaultOwnerNote(
  draftRow: BatchOwnerScreenshotDraftRowV1,
  option: BatchOwnerApprovalFounderOptionV1,
): string {
  const token = draftRow.token ?? draftRow.row_id;
  switch (option) {
    case "approve_for_next_planning_only":
      return `Founder approved ${token} (${draftRow.row_id}) for next planning only after batch owner review. Does not authorize production mutation or evidence commit.`;
    case "reject":
      return `Founder rejected ${token} (${draftRow.row_id}) after batch owner review.`;
    case "request_more_evidence":
      return `Founder requests more evidence for ${token} (${draftRow.row_id}) before further batch planning.`;
    case "defer":
      return `Founder deferred decision on ${token} (${draftRow.row_id}).`;
  }
}

function validateApprovalAgainstDraftRow(
  draftRow: BatchOwnerScreenshotDraftRowV1,
  input: BatchOwnerApprovalInputRowV1,
): string[] {
  const errors: string[] = [];
  if (input.row_id.trim() !== draftRow.row_id) {
    errors.push(`row_id mismatch: decision targets ${input.row_id} but draft has ${draftRow.row_id}`);
  }
  if (
    input.founder_option_id === "approve_for_next_planning_only" &&
    !draftRow.draft_ready_for_owner_review
  ) {
    errors.push(
      "approve_for_next_planning_only requires draft_ready_for_owner_review true (fail-closed)",
    );
  }
  if (draftRow.draft_packet?.owner_verdict === "BLOCKED_UNSAFE") {
    errors.push("row owner_verdict is BLOCKED_UNSAFE — cannot approve for planning");
  }
  return errors;
}

export function buildBatchOwnerApprovalPacketV1(args: {
  draftReview: BatchOwnerScreenshotDraftPacketV1;
  decisions: BatchOwnerApprovalInputRowV1[];
  generated_at?: string;
  decided_at?: string;
}): BatchOwnerApprovalPacketV1 {
  const generated_at = args.generated_at ?? new Date().toISOString();
  const decided_at = args.decided_at ?? generated_at;
  const draftByRowId = new Map(
    args.draftReview.rows.map((r) => [r.row_id.trim(), r] as const),
  );

  const packetRows: BatchOwnerApprovalPacketRowV1[] = [];
  const registryRows: FounderDecisionRegistryRowV1[] = [];

  for (const input of args.decisions) {
    const draftRow = draftByRowId.get(input.row_id.trim());
    if (!draftRow) {
      packetRows.push({
        row_id: input.row_id,
        token: null,
        source_queue_row_id: null,
        draft_ready_for_owner_review: false,
        founder_option_id: input.founder_option_id,
        owner_note: input.owner_note?.trim() ?? "",
        registry_row: null,
        registry_validation_errors: [`unknown row_id ${input.row_id} in draft review`],
      });
      continue;
    }

    const rowErrors = validateApprovalAgainstDraftRow(draftRow, input);
    const owner_note = (input.owner_note?.trim() || defaultOwnerNote(draftRow, input.founder_option_id)).trim();

    let registry_row: FounderDecisionRegistryRowV1 | null = null;
    let registry_validation_errors = [...rowErrors];

    if (rowErrors.length === 0) {
      const candidate = buildFounderRegistryRowFromBatchOwnerApprovalV1({
        draftRow,
        founder_option_id: input.founder_option_id,
        owner_note,
        decided_at,
      });
      const validated = validateFounderDecisionRegistryRowV1(candidate);
      if (validated.ok) {
        registry_row = validated.row;
        registryRows.push(validated.row);
      } else {
        registry_validation_errors = validated.errors;
      }
    }

    packetRows.push({
      row_id: draftRow.row_id,
      token: draftRow.token,
      source_queue_row_id: draftRow.source_queue_row_id,
      draft_ready_for_owner_review: draftRow.draft_ready_for_owner_review,
      founder_option_id: input.founder_option_id,
      owner_note,
      registry_row,
      registry_validation_errors,
    });
  }

  let founder_decision_registry_export: FounderDecisionRegistryDocumentV1 | null = null;
  const allPacketRowsValid =
    packetRows.length > 0 &&
    packetRows.every(
      (r) => r.registry_validation_errors.length === 0 && r.registry_row != null,
    );
  if (allPacketRowsValid && registryRows.length === packetRows.length) {
    const doc = {
      contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      rows: registryRows,
    };
    const v = validateFounderDecisionRegistryDocumentV1(doc);
    founder_decision_registry_export = v.ok ? v.doc : null;
  }

  return {
    contract: BATCH_OWNER_APPROVAL_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    may_mutate: false,
    may_write_production_evidence: false,
    automation_input: false,
    generated_at,
    source_review_contract: BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1,
    source_review_generated_at: args.draftReview.generated_at ?? null,
    approval_row_count: packetRows.length,
    layer_6_founder_only_approval: "NOT_PROVEN",
    no_mutation_authority_attestation: BATCH_OWNER_APPROVAL_NO_AUTHORITY_ATTESTATION_V1,
    rows: packetRows,
    founder_decision_registry_export,
    proven_facts: [
      "PROVEN: Approval packet compiled read-only from batch_owner_screenshot_draft_packet_v1 + founder Markdown decisions.",
      `PROVEN: approval_row_count=${packetRows.length}; registry_export_rows=${registryRows.length}.`,
    ],
    unknown_facts: [
      "UNKNOWN: Whether founder will copy registry_export into data/owner-decisions/ for digest visibility.",
    ],
  };
}

export function batchOwnerApprovalPacketGrantsProductionWrite(
  packet: BatchOwnerApprovalPacketV1,
): boolean {
  if (packet.may_write_production_evidence !== false) return true;
  if (packet.may_mutate !== false) return true;
  if (packet.data_mutation !== false) return true;
  if (packet.layer_6_founder_only_approval !== "NOT_PROVEN") return true;
  if (packet.rows.some((r) => r.registry_row?.allowed_next_scope === "owner_mutation_approved")) {
    return true;
  }
  return false;
}

const CHECKLIST_ROW_SECTION_RE = /^##\s+([a-z0-9-]+)\s+[—–-]\s*/gim;

const OWNER_NOTE_PLACEHOLDER_RE = /^\(optional\s*[—–-]\s*one sentence\)$/i;

function isPlaceholderOwnerNoteV1(note: string): boolean {
  const t = note.trim();
  if (!t) return true;
  return OWNER_NOTE_PLACEHOLDER_RE.test(t);
}

function normalizeOwnerNoteFromActiveBlockV1(note: string | undefined): string | undefined {
  if (note == null) return undefined;
  const t = note.trim();
  if (!t || isPlaceholderOwnerNoteV1(t)) return undefined;
  return t;
}

function extractActiveDecisionBlockV1(
  sectionMarkdown: string,
  expectedRowId: string,
): { activeLines: string[]; parse_errors: string[] } {
  const beginRe = new RegExp(
    `^${BATCH_OWNER_APPROVAL_ACTIVE_DECISION_BEGIN_PREFIX_V1}([a-z0-9-]+)\\s*$`,
    "im",
  );
  const endRe = new RegExp(`^${BATCH_OWNER_APPROVAL_ACTIVE_DECISION_END_V1}\\s*$`, "im");
  const beginMatch = beginRe.exec(sectionMarkdown);
  if (!beginMatch?.[1]) {
    return {
      activeLines: [],
      parse_errors: [
        `missing ${BATCH_OWNER_APPROVAL_ACTIVE_DECISION_BEGIN_PREFIX_V1}${expectedRowId} … ${BATCH_OWNER_APPROVAL_ACTIVE_DECISION_END_V1} block`,
      ],
    };
  }

  const beginRowId = beginMatch[1].trim().toLowerCase();
  if (beginRowId !== expectedRowId) {
    return {
      activeLines: [],
      parse_errors: [
        `BEGIN_ACTIVE_DECISION row_id=${beginRowId} does not match checklist section row_id=${expectedRowId}`,
      ],
    };
  }

  const afterBegin = sectionMarkdown.slice((beginMatch.index ?? 0) + beginMatch[0].length);
  const endMatch = endRe.exec(afterBegin);
  if (!endMatch) {
    return {
      activeLines: [],
      parse_errors: [`missing ${BATCH_OWNER_APPROVAL_ACTIVE_DECISION_END_V1} after active block`],
    };
  }

  const activeBody = afterBegin.slice(0, endMatch.index ?? 0);
  return { activeLines: activeBody.split("\n"), parse_errors: [] };
}

function parseActiveDecisionLinesV1(
  activeLines: string[],
  sectionRowId: string,
): Pick<BatchOwnerApprovalDecisionRowParseV1, "founder_option_id" | "owner_note" | "parse_errors"> {
  const parse_errors: string[] = [];
  let resolved_row_id = sectionRowId;
  const founderDecisionValues: string[] = [];
  let owner_note_raw: string | undefined;

  for (const line of activeLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const rowIdMatch = trimmed.match(/^row_id:\s*([a-z0-9-]+)\s*$/i);
    if (rowIdMatch?.[1]) {
      resolved_row_id = rowIdMatch[1].trim().toLowerCase();
      continue;
    }

    const decisionMatch = trimmed.match(/^founder_decision:\s*(.+?)\s*$/i);
    if (decisionMatch?.[1]) {
      founderDecisionValues.push(decisionMatch[1].trim());
      continue;
    }

    const noteMatch = trimmed.match(/^owner_note:\s*(.*)$/i);
    if (noteMatch) {
      owner_note_raw = noteMatch[1] ?? "";
    }
  }

  if (resolved_row_id !== sectionRowId) {
    parse_errors.push(
      `active block row_id:${resolved_row_id} does not match section row_id:${sectionRowId}`,
    );
  }

  if (founderDecisionValues.length === 0) {
    parse_errors.push("founder_decision missing in active block");
  } else if (founderDecisionValues.length > 1) {
    parse_errors.push("duplicate founder_decision lines in active block");
  } else {
    const val = founderDecisionValues[0]!;
    if (
      val === BATCH_OWNER_APPROVAL_CHOOSE_ONE_SENTINEL_V1 ||
      val.toLowerCase() === "choose_one"
    ) {
      parse_errors.push("founder_decision not selected (replace _choose_one_)");
    } else if (!OPTION_SET.has(val)) {
      parse_errors.push(`invalid founder_decision: ${val}`);
    } else {
      const owner_note = normalizeOwnerNoteFromActiveBlockV1(owner_note_raw);
      return {
        founder_option_id: val as BatchOwnerApprovalFounderOptionV1,
        owner_note,
        parse_errors,
      };
    }
  }

  return { founder_option_id: null, owner_note: undefined, parse_errors };
}

/** Parse founder-filled approval checklist Markdown (active block only; ignores prose/fences). */
export function parseBatchOwnerApprovalDecisionsMarkdownV1(
  markdown: string,
): BatchOwnerApprovalDecisionsParseV1 {
  const decisions: BatchOwnerApprovalInputRowV1[] = [];
  const row_results: BatchOwnerApprovalDecisionRowParseV1[] = [];
  const errors: string[] = [];

  const sectionStarts = Array.from(markdown.matchAll(CHECKLIST_ROW_SECTION_RE));

  for (let i = 0; i < sectionStarts.length; i++) {
    const match = sectionStarts[i]!;
    const row_id = match[1]!.trim().toLowerCase();
    const start = match.index ?? 0;
    const end = sectionStarts[i + 1]?.index ?? markdown.length;
    const block = markdown.slice(start, end);

    const { activeLines, parse_errors: blockErrors } = extractActiveDecisionBlockV1(block, row_id);
    const parsed = parseActiveDecisionLinesV1(activeLines, row_id);
    const parse_errors = [...blockErrors, ...parsed.parse_errors];

    const row_result: BatchOwnerApprovalDecisionRowParseV1 = {
      row_id,
      founder_option_id: parsed.founder_option_id,
      owner_note: parsed.owner_note,
      parse_errors,
    };
    row_results.push(row_result);

    if (parse_errors.length > 0) {
      for (const err of parse_errors) {
        errors.push(`${row_id}: ${err}`);
      }
    } else if (parsed.founder_option_id) {
      decisions.push({
        row_id,
        founder_option_id: parsed.founder_option_id,
        owner_note: parsed.owner_note,
      });
    }
  }

  return { decisions, row_results, errors };
}

/** Fail-closed compile: every draft row must have a valid active decision; no partial registry export. */
export function compileBatchOwnerApprovalFromMarkdownV1(args: {
  draftReview: BatchOwnerScreenshotDraftPacketV1;
  decisionsMarkdown: string;
  generated_at?: string;
  decided_at?: string;
}): { packet: BatchOwnerApprovalPacketV1; compile_errors: string[] } {
  const parsed = parseBatchOwnerApprovalDecisionsMarkdownV1(args.decisionsMarkdown);
  const compile_errors = [...parsed.errors];

  const expectedRowIds = args.draftReview.rows.map((r) => r.row_id.trim());
  const parsedRowIds = new Set(parsed.row_results.map((r) => r.row_id));

  for (const row_id of expectedRowIds) {
    if (!parsedRowIds.has(row_id)) {
      compile_errors.push(
        `${row_id}: missing checklist section or ${BATCH_OWNER_APPROVAL_ACTIVE_DECISION_BEGIN_PREFIX_V1}${row_id} block`,
      );
    }
  }

  if (parsed.decisions.length !== expectedRowIds.length) {
    compile_errors.push(
      `expected ${expectedRowIds.length} valid founder decisions, got ${parsed.decisions.length}`,
    );
  }

  const packet = buildBatchOwnerApprovalPacketV1({
    draftReview: args.draftReview,
    decisions: parsed.decisions,
    generated_at: args.generated_at,
    decided_at: args.decided_at,
  });

  for (const row of packet.rows) {
    for (const err of row.registry_validation_errors) {
      compile_errors.push(`${row.row_id}: ${err}`);
    }
  }

  if (compile_errors.length > 0) {
    return {
      packet: { ...packet, founder_decision_registry_export: null },
      compile_errors,
    };
  }

  if (!packet.founder_decision_registry_export) {
    compile_errors.push("registry export missing despite valid decisions (fail-closed)");
  }

  return { packet, compile_errors };
}

function formatChecklistRowSection(draftRow: BatchOwnerScreenshotDraftRowV1): string {
  const token = draftRow.token ?? draftRow.row_id;
  const url =
    draftRow.planning_review_candidate_url ??
    draftRow.draft_packet?.canonical_url ??
    draftRow.draft_packet?.browser_evidence?.amazon_pdp_url_canonical ??
    "—";
  const verdict = draftRow.draft_packet?.owner_verdict ?? "—";
  const ready = draftRow.draft_ready_for_owner_review ? "yes" : "no";
  const planningNote = draftRow.draft_ready_for_owner_review
    ? ""
    : [
        "",
        "> **Planning cohort:** `approve_for_next_planning_only` is **rejected at compile** until agent facts exist and this row is `draft_ready_for_owner_review=yes`. Use `defer`, `reject`, or `request_more_evidence` until then.",
        "",
      ].join("\n");

  return [
    `## ${draftRow.row_id} - ${token}`,
    "",
    `- **token:** \`${token}\``,
    `- **canonical_url:** ${url}`,
    `- **owner_verdict:** \`${verdict}\``,
    `- **draft_ready_for_owner_review:** \`${ready}\``,
    planningNote,
    "Allowed `founder_decision` values (set exactly one in the active block below):",
    "`approve_for_next_planning_only` · `reject` · `request_more_evidence` · `defer`",
    "",
    `${BATCH_OWNER_APPROVAL_ACTIVE_DECISION_BEGIN_PREFIX_V1}${draftRow.row_id}`,
    `row_id: ${draftRow.row_id}`,
    `founder_decision: ${BATCH_OWNER_APPROVAL_CHOOSE_ONE_SENTINEL_V1}`,
    "owner_note:",
    BATCH_OWNER_APPROVAL_ACTIVE_DECISION_END_V1,
    "",
  ].join("\n");
}

export type BuildBatchOwnerApprovalChecklistOptionsV1 = {
  /** When true, rows awaiting agent facts appear in the fillable checklist (planning cohort). */
  include_planning_cohort_rows?: boolean;
};

/** Markdown checklist for founder to fill — not JSON. */
export function buildBatchOwnerApprovalChecklistMarkdownV1(
  draftReview: BatchOwnerScreenshotDraftPacketV1,
  options?: BuildBatchOwnerApprovalChecklistOptionsV1,
): string {
  const includePlanning = options?.include_planning_cohort_rows === true;
  const readyRows = draftReview.rows.filter((r) => r.draft_ready_for_owner_review);
  const blockedRows = draftReview.rows.filter((r) => !r.draft_ready_for_owner_review);
  const checklistRows = includePlanning ? draftReview.rows : readyRows;

  const compileHint = includePlanning
    ? [
        "5. Save this file, then compile (after agent facts exist, add `--facts`):",
        "   `node --import tsx scripts/report-batch-owner-approval.ts --source <source> --facts <agent-facts.json> --decisions <this-file.md>`",
        "   Or with saved draft review: `--review <draft-review.json> --decisions <this-file.md>`",
      ]
    : [
        "5. Save this file, then run:",
        "   `node --import tsx scripts/report-batch-owner-approval.ts --review <draft-review.json> --decisions <this-file.md>`",
        "   Or: `--source <source> --facts <agent-facts.json> --decisions <this-file.md>`",
      ];

  const header = [
    "# Batch Production Lane — Owner Approval Checklist",
    "",
    `Contract: \`${BATCH_OWNER_APPROVAL_CHECKLIST_CONTRACT_V1}\``,
    "",
    "> **Boundary**",
    "> ",
    "> | Field | Value |",
    "> |-------|-------|",
    "> | read_only | **true** |",
    "> | data_mutation | **false** |",
    "> | may_mutate | **false** |",
    "> | may_write_production_evidence | **false** |",
    "> | layer_6_founder_only_approval | **NOT_PROVEN** |",
    "> ",
    "> Filling this checklist records founder judgment only. It does **not** authorize Supabase, `retailer_links`, `data/evidence/`, affiliate edits, commits, deploys, or apply execution.",
    "",
    "## How to complete",
    "",
    "1. For each row below, edit only the lines between",
    `   \`${BATCH_OWNER_APPROVAL_ACTIVE_DECISION_BEGIN_PREFIX_V1}<row_id>\` and \`${BATCH_OWNER_APPROVAL_ACTIVE_DECISION_END_V1}\`.`,
    "2. Replace `founder_decision: _choose_one_` with exactly one allowed value (see row prose).",
    "3. Optionally set `owner_note:` (recommended for approve/reject).",
    "4. Compile only after every row has a real founder decision (unfilled checklists exit nonzero).",
    ...compileHint,
    "",
    `Checklist rows: **${checklistRows.length}** · Owner-review-ready: **${readyRows.length}** · Awaiting agent facts: **${blockedRows.length}**`,
    "",
    "---",
    "",
  ].join("\n");

  const body = checklistRows.map((row) => formatChecklistRowSection(row)).join("\n---\n\n");

  const blockedSection =
    !includePlanning && blockedRows.length > 0
      ? [
          "## Blocked rows (not in approval checklist)",
          "",
          ...blockedRows.map(
            (r) =>
              `- \`${r.row_id}\` — not draft_ready_for_owner_review (${r.missing_owner_facts.join("; ") || "see draft review"})`,
          ),
          "",
        ].join("\n")
      : "";

  return `${header}${body}${blockedSection}`.endsWith("\n") ? `${header}${body}${blockedSection}` : `${header}${body}${blockedSection}\n`;
}

export function parseBatchOwnerApprovalDraftReviewFromFileV1(raw: unknown): BatchOwnerScreenshotDraftPacketV1 {
  return parseBatchOwnerScreenshotDraftReviewV1(raw);
}
