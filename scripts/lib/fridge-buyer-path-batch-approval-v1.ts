/**
 * Read-only fridge buyer-path batch approval bridge — checklist + founder registry linkage.
 * PROVEN: does not authorize CSV apply, Supabase writes, or buy-link mutation.
 */

import {
  BATCH_OWNER_APPROVAL_ACTIVE_DECISION_BEGIN_PREFIX_V1,
  BATCH_OWNER_APPROVAL_ACTIVE_DECISION_END_V1,
  BATCH_OWNER_APPROVAL_CHOOSE_ONE_SENTINEL_V1,
  BATCH_OWNER_APPROVAL_FOUNDER_OPTIONS_V1,
  BATCH_OWNER_APPROVAL_NO_AUTHORITY_ATTESTATION_V1,
  BATCH_OWNER_APPROVAL_PROHIBITED_ACTIONS_V1,
  mapBatchOwnerOptionToRegistryStatusScope,
  type BatchOwnerApprovalFounderOptionV1,
} from "../../src/lib/owner-dashboard/batch-owner-approval-v1";
import {
  expectedFridgeBuyerPathBatchApprovalSourceDecisionPacketId,
  FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
  isFridgeBuyerPathBatchApprovalRegistryRowV1,
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryDocumentV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { scanFounderDecisionRegistryJsonFilesV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-scan-v1";
import {
  buildFridgeBuyerPathBatchProposalV1,
  FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1,
  FRIDGE_BUYER_PATH_BATCH_PROPOSAL_FORBIDDEN_MUTATIONS_V1,
  type BuildFridgeBuyerPathBatchProposalDepsV1,
  type FridgeBuyerPathBatchProposalReportV1,
} from "./fridge-buyer-path-batch-proposal-v1";

export const FRIDGE_BUYER_PATH_BATCH_APPROVAL_CONTRACT_V1 =
  "fridge_buyer_path_batch_approval_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPROVAL_REPORT_NAME_V1 =
  "fridge_buyer_path_batch_approval_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPROVAL_DEFAULT_REGISTRY_REL_V1 =
  "data/owner-decisions/fridge-buyer-path-batch-approval-v1.json" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPROVAL_RECOMMENDED_NEXT_ACTION_V1 =
  "Review checklist_markdown, choose one founder_decision for the full proposed batch, then compile with --decisions and optional --registry-out. Planning approval only — no CSV apply or run-registry mutation from this lane." as const;

export type FridgeBuyerPathBatchApprovalStatusV1 =
  | "awaiting_owner_approval"
  | "owner_approved_for_next_planning_only"
  | "owner_rejected"
  | "UNKNOWN";

export type FridgeBuyerPathBatchApprovalDecisionParseV1 = {
  proposed_batch_id: string;
  founder_option_id: BatchOwnerApprovalFounderOptionV1 | null;
  owner_note: string;
  parse_errors: string[];
};

export type FridgeBuyerPathBatchApprovalReportV1 = {
  contract: typeof FRIDGE_BUYER_PATH_BATCH_APPROVAL_CONTRACT_V1;
  report_name: typeof FRIDGE_BUYER_PATH_BATCH_APPROVAL_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_proposal_contract: typeof FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1;
  proposed_batch_id: string;
  proposed_row_count: number;
  proposed_slugs: string[];
  approval_status: FridgeBuyerPathBatchApprovalStatusV1;
  owner_approval_required: true;
  apply_authorization_present: false;
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  formal_batch_exists: false;
  founder_decision_options: readonly BatchOwnerApprovalFounderOptionV1[];
  checklist_markdown: string;
  matched_registry_row: FounderDecisionRegistryRowV1 | null;
  registry_validation_errors: string[];
  founder_decision_registry_export_preview: FounderDecisionRegistryDocumentV1 | null;
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildFridgeBuyerPathBatchApprovalDepsV1 = {
  rootDir: string;
  now?: () => Date;
  buildProposalReport?: (
    deps: BuildFridgeBuyerPathBatchProposalDepsV1,
  ) => FridgeBuyerPathBatchProposalReportV1;
  readRegistryFiles?: typeof scanFounderDecisionRegistryJsonFilesV1;
};

export function buildFridgeBuyerPathBatchApprovalChecklistMarkdownV1(
  proposal: FridgeBuyerPathBatchProposalReportV1,
): string {
  const slugLines = proposal.proposed_rows.map(
    (row) =>
      `- \`${row.slug}\` (${row.oem_token}) — ${row.browser_truth_classification ?? "UNKNOWN"} — committed \`${row.committed_buyer_path_status}\``,
  );

  return [
    "# Fridge buyer-path batch owner approval checklist",
    "",
    `Generated from \`${proposal.contract}\` at ${proposal.generated_at}.`,
    "",
    BATCH_OWNER_APPROVAL_NO_AUTHORITY_ATTESTATION_V1,
    "",
    "## Batch summary",
    "",
    `- **proposed_batch_id:** \`${proposal.proposed_batch_id}\``,
    `- **proposed_row_count:** ${String(proposal.proposed_row_count)}`,
    `- **formal_batch_exists:** false`,
    `- **owner_approval_required:** true`,
    "",
    "## Proposed slugs",
    "",
    ...slugLines,
    "",
    "## Founder decision (batch-level — one decision for all proposed rows)",
    "",
    "Allowed `founder_decision` values (set exactly one in the active block below):",
    BATCH_OWNER_APPROVAL_FOUNDER_OPTIONS_V1.map((opt) => `\`${opt}\``).join(" · "),
    "",
    `${BATCH_OWNER_APPROVAL_ACTIVE_DECISION_BEGIN_PREFIX_V1}${proposal.proposed_batch_id}`,
    `proposed_batch_id: ${proposal.proposed_batch_id}`,
    `founder_decision: ${BATCH_OWNER_APPROVAL_CHOOSE_ONE_SENTINEL_V1}`,
    "owner_note:",
    BATCH_OWNER_APPROVAL_ACTIVE_DECISION_END_V1,
    "",
    "## After you decide",
    "",
    "Compile (stdout JSON only):",
    "`npm run buckparts:fridge-buyer-path-batch-approval -- --decisions <this-file.md>`",
    "",
    "Optional registry export (owner decision artifact only):",
    `\`npm run buckparts:fridge-buyer-path-batch-approval -- --decisions <this-file.md> --registry-out ${FRIDGE_BUYER_PATH_BATCH_APPROVAL_DEFAULT_REGISTRY_REL_V1}\``,
    "",
  ].join("\n");
}

export function parseFridgeBuyerPathBatchApprovalDecisionsFromMarkdownV1(args: {
  markdown: string;
  expected_proposed_batch_id: string;
}): FridgeBuyerPathBatchApprovalDecisionParseV1 {
  const errors: string[] = [];
  const beginPrefix = `${BATCH_OWNER_APPROVAL_ACTIVE_DECISION_BEGIN_PREFIX_V1}${args.expected_proposed_batch_id}`;
  const beginIdx = args.markdown.indexOf(beginPrefix);
  if (beginIdx < 0) {
    return {
      proposed_batch_id: args.expected_proposed_batch_id,
      founder_option_id: null,
      owner_note: "",
      parse_errors: [`missing active decision block for ${args.expected_proposed_batch_id}`],
    };
  }
  const endIdx = args.markdown.indexOf(BATCH_OWNER_APPROVAL_ACTIVE_DECISION_END_V1, beginIdx);
  if (endIdx < 0) {
    return {
      proposed_batch_id: args.expected_proposed_batch_id,
      founder_option_id: null,
      owner_note: "",
      parse_errors: ["missing END_ACTIVE_DECISION sentinel"],
    };
  }
  const block = args.markdown.slice(beginIdx, endIdx);
  const decisionMatch = block.match(/founder_decision:\s*(\S+)/);
  const noteMatch = block.match(/owner_note:\s*([\s\S]*?)$/);
  const rawDecision = decisionMatch?.[1]?.trim() ?? "";
  if (!rawDecision || rawDecision === BATCH_OWNER_APPROVAL_CHOOSE_ONE_SENTINEL_V1) {
    errors.push("founder_decision must be set to a concrete option (not _choose_one_)");
  }
  const founder_option_id = BATCH_OWNER_APPROVAL_FOUNDER_OPTIONS_V1.includes(
    rawDecision as BatchOwnerApprovalFounderOptionV1,
  )
    ? (rawDecision as BatchOwnerApprovalFounderOptionV1)
    : null;
  if (!founder_option_id) {
    errors.push(
      `founder_decision must be one of: ${BATCH_OWNER_APPROVAL_FOUNDER_OPTIONS_V1.join(", ")}`,
    );
  }
  return {
    proposed_batch_id: args.expected_proposed_batch_id,
    founder_option_id,
    owner_note: (noteMatch?.[1] ?? "").trim(),
    parse_errors: errors,
  };
}

export function buildFridgeBuyerPathBatchApprovalRegistryRowV1(args: {
  proposal: FridgeBuyerPathBatchProposalReportV1;
  founder_option_id: BatchOwnerApprovalFounderOptionV1;
  owner_note: string;
  decided_at: string;
}): FounderDecisionRegistryRowV1 {
  const mapped = mapBatchOwnerOptionToRegistryStatusScope(args.founder_option_id);
  return {
    decision_id: `decision-${args.decided_at.slice(0, 10)}-fridge-buyer-path-batch-${args.proposal.proposed_batch_id}`,
    source_queue_row_id: "queue-fridge-buyer-path-batch-proposal-v1",
    source_decision_packet_id: expectedFridgeBuyerPathBatchApprovalSourceDecisionPacketId(
      args.proposal.proposed_batch_id,
    ),
    decided_at: args.decided_at,
    decision_status: mapped.decision_status,
    owner_note: args.owner_note,
    allowed_next_scope: mapped.allowed_next_scope,
    evidence_required_before_mutation: false,
    prohibited_actions_still_apply: [...BATCH_OWNER_APPROVAL_PROHIBITED_ACTIONS_V1],
    fridge_buyer_path_batch_approval_context_v1: {
      review_packet_contract: FRIDGE_BUYER_PATH_BATCH_APPROVAL_CONTRACT_V1,
      founder_option_id: args.founder_option_id,
      proposed_batch_id: args.proposal.proposed_batch_id,
    },
  };
}

export function findMatchingFridgeBuyerPathBatchApprovalRegistryRowV1(args: {
  proposed_batch_id: string;
  files: ReturnType<typeof scanFounderDecisionRegistryJsonFilesV1>;
}): {
  matched_row: FounderDecisionRegistryRowV1 | null;
  validation_errors: string[];
} {
  const validation_errors: string[] = [];
  const expectedPacketId = expectedFridgeBuyerPathBatchApprovalSourceDecisionPacketId(
    args.proposed_batch_id,
  );
  let matched_row: FounderDecisionRegistryRowV1 | null = null;

  for (const file of args.files) {
    if ("parseError" in file) {
      validation_errors.push(`${file.source}: ${file.parseError}`);
      continue;
    }
    const docResult = validateFounderDecisionRegistryDocumentV1(file.parsed);
    if (!docResult.ok) {
      validation_errors.push(`${file.source}: ${docResult.errors.join("; ")}`);
      continue;
    }
    for (const row of docResult.doc.rows) {
      if (!isFridgeBuyerPathBatchApprovalRegistryRowV1(row)) continue;
      if (row.fridge_buyer_path_batch_approval_context_v1?.proposed_batch_id !== args.proposed_batch_id) {
        continue;
      }
      if (row.source_decision_packet_id !== expectedPacketId) {
        validation_errors.push(
          `${file.source}: row ${row.decision_id} source_decision_packet_id mismatch`,
        );
        continue;
      }
      if (matched_row) {
        validation_errors.push(
          `${file.source}: duplicate registry rows for proposed_batch_id ${args.proposed_batch_id}`,
        );
      }
      matched_row = row;
    }
  }

  return { matched_row, validation_errors };
}

export function resolveFridgeBuyerPathBatchApprovalStatusV1(args: {
  matched_row: FounderDecisionRegistryRowV1 | null;
  validation_errors: string[];
}): FridgeBuyerPathBatchApprovalStatusV1 {
  if (args.validation_errors.length > 0) {
    return "UNKNOWN";
  }
  if (!args.matched_row?.fridge_buyer_path_batch_approval_context_v1) {
    return "awaiting_owner_approval";
  }
  const opt = args.matched_row.fridge_buyer_path_batch_approval_context_v1.founder_option_id;
  if (opt === "approve_for_next_planning_only") {
    return "owner_approved_for_next_planning_only";
  }
  if (opt === "reject") {
    return "owner_rejected";
  }
  return "awaiting_owner_approval";
}

export function buildFridgeBuyerPathBatchApprovalReportV1(
  deps: BuildFridgeBuyerPathBatchApprovalDepsV1,
): FridgeBuyerPathBatchApprovalReportV1 {
  const now = deps.now ?? (() => new Date());
  const buildProposal =
    deps.buildProposalReport ??
    ((proposalDeps: BuildFridgeBuyerPathBatchProposalDepsV1) =>
      buildFridgeBuyerPathBatchProposalV1(proposalDeps));
  const proposal = buildProposal({ rootDir: deps.rootDir, now: deps.now });
  const readRegistry = deps.readRegistryFiles ?? scanFounderDecisionRegistryJsonFilesV1;
  const registryFiles = readRegistry(deps.rootDir);
  const { matched_row, validation_errors } = findMatchingFridgeBuyerPathBatchApprovalRegistryRowV1({
    proposed_batch_id: proposal.proposed_batch_id,
    files: registryFiles,
  });
  const approval_status = resolveFridgeBuyerPathBatchApprovalStatusV1({
    matched_row,
    validation_errors,
  });

  return {
    contract: FRIDGE_BUYER_PATH_BATCH_APPROVAL_CONTRACT_V1,
    report_name: FRIDGE_BUYER_PATH_BATCH_APPROVAL_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    source_proposal_contract: proposal.contract,
    proposed_batch_id: proposal.proposed_batch_id,
    proposed_row_count: proposal.proposed_row_count,
    proposed_slugs: proposal.proposed_rows.map((row) => row.slug),
    approval_status,
    owner_approval_required: true,
    apply_authorization_present: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    formal_batch_exists: false,
    founder_decision_options: BATCH_OWNER_APPROVAL_FOUNDER_OPTIONS_V1,
    checklist_markdown: buildFridgeBuyerPathBatchApprovalChecklistMarkdownV1(proposal),
    matched_registry_row: matched_row,
    registry_validation_errors: validation_errors,
    founder_decision_registry_export_preview: null,
    recommended_next_action: FRIDGE_BUYER_PATH_BATCH_APPROVAL_RECOMMENDED_NEXT_ACTION_V1,
    proven_facts: [
      `PROVEN: approval bridge built from ${proposal.report_name} (${proposal.proposed_batch_id}).`,
      `PROVEN: proposed_row_count=${String(proposal.proposed_row_count)} pulled from proposal, not hardcoded.`,
      `PROVEN: approval_status=${approval_status}.`,
      "PROVEN: all mutation authorization fields false; planning-only founder options.",
      `PROVEN: forbidden mutations include ${FRIDGE_BUYER_PATH_BATCH_PROPOSAL_FORBIDDEN_MUTATIONS_V1.slice(0, 3).join(", ")}…`,
    ],
    unknown_facts: [
      "UNKNOWN: Whether founder has filled checklist markdown but not yet exported registry JSON.",
      "UNKNOWN: Whether run-registry JSON will be created after planning approval.",
      ...proposal.unknown_facts,
    ],
  };
}

export function compileFridgeBuyerPathBatchApprovalRegistryExportV1(args: {
  proposal: FridgeBuyerPathBatchProposalReportV1;
  decisionsMarkdown: string;
  decided_at: string;
}): {
  ok: true;
  row: FounderDecisionRegistryRowV1;
  document: FounderDecisionRegistryDocumentV1;
} | {
  ok: false;
  errors: string[];
} {
  const parsed = parseFridgeBuyerPathBatchApprovalDecisionsFromMarkdownV1({
    markdown: args.decisionsMarkdown,
    expected_proposed_batch_id: args.proposal.proposed_batch_id,
  });
  if (parsed.parse_errors.length > 0 || !parsed.founder_option_id) {
    return { ok: false, errors: parsed.parse_errors };
  }
  const row = buildFridgeBuyerPathBatchApprovalRegistryRowV1({
    proposal: args.proposal,
    founder_option_id: parsed.founder_option_id,
    owner_note: parsed.owner_note,
    decided_at: args.decided_at,
  });
  const validated = validateFounderDecisionRegistryRowV1(row);
  if (!validated.ok) {
    return { ok: false, errors: validated.errors };
  }
  const document: FounderDecisionRegistryDocumentV1 = {
    contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    rows: [validated.row],
  };
  const docValidated = validateFounderDecisionRegistryDocumentV1(document);
  if (!docValidated.ok) {
    return { ok: false, errors: docValidated.errors };
  }
  return { ok: true, row: validated.row, document: docValidated.doc };
}
