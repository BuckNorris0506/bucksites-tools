/**
 * Read-only fridge buyer-path apply-plan approval bridge — checklist + founder registry linkage.
 * PROVEN: does not authorize applying planned_changes, CSV apply, Supabase writes, or buy-link mutation.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  BATCH_OWNER_APPROVAL_CHOOSE_ONE_SENTINEL_V1,
  BATCH_OWNER_APPROVAL_FOUNDER_OPTIONS_V1,
  BATCH_OWNER_APPROVAL_PROHIBITED_ACTIONS_V1,
  mapBatchOwnerOptionToRegistryStatusScope,
  type BatchOwnerApprovalFounderOptionV1,
} from "../../src/lib/owner-dashboard/batch-owner-approval-v1";
import {
  expectedFridgeBuyerPathBatchApplyPlanApprovalSourceDecisionPacketId,
  FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
  isFridgeBuyerPathBatchApplyPlanApprovalRegistryRowV1,
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryDocumentV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { scanFounderDecisionRegistryJsonFilesV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-scan-v1";
import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
  type FridgeBuyerPathBatchApplyPlanOwnerReviewStatusV1,
  type FridgeBuyerPathBatchApplyPlanStatusV1,
} from "./fridge-buyer-path-batch-apply-plan-proposal-v1";

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CONTRACT_V1 =
  "fridge_buyer_path_batch_apply_plan_approval_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_REPORT_NAME_V1 =
  "fridge_buyer_path_batch_apply_plan_approval_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1 =
  "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_DEFAULT_REGISTRY_REL_V1 =
  "data/owner-decisions/fridge-buyer-path-batch-apply-plan-approval-v1.json" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_ACTIVE_DECISION_BEGIN_PREFIX_V1 =
  "BEGIN_ACTIVE_DECISION apply_plan_artifact_rel_path=" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_NO_AUTHORITY_ATTESTATION_V1 =
  "PROVEN: Owner approval of this apply-plan artifact does not authorize applying planned_changes to CSV, retailer_links, Supabase, public UI, buy-link, evidence, deploy, or Netlify. approve_for_next_planning_only is read_only_agent scope only — not production mutation approval.";

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_RECOMMENDED_NEXT_ACTION_V1 =
  "Review checklist_markdown, choose one founder_decision for the full apply-plan artifact, then compile with --decisions and optional --registry-out. Planning approval only — does not authorize applying planned_changes." as const;

export type FridgeBuyerPathBatchApplyPlanApprovalStatusV1 =
  | "awaiting_owner_approval"
  | "owner_approved_for_next_planning_only"
  | "owner_rejected"
  | "UNKNOWN";

export type FridgeBuyerPathBatchApplyPlanArtifactV1 = {
  contract: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1;
  source_apply_plan_artifact_rel_path: string;
  proposed_batch_id: string;
  run_id: string;
  plan_status: FridgeBuyerPathBatchApplyPlanStatusV1;
  owner_review_status: FridgeBuyerPathBatchApplyPlanOwnerReviewStatusV1;
  planned_change_count: number;
  planned_changes: Array<{ slug: string }>;
};

export type FridgeBuyerPathBatchApplyPlanApprovalDecisionParseV1 = {
  source_apply_plan_artifact_rel_path: string;
  planned_change_count: number | null;
  founder_option_id: BatchOwnerApprovalFounderOptionV1 | null;
  owner_note: string;
  parse_errors: string[];
};

export type FridgeBuyerPathBatchApplyPlanApprovalReportV1 = {
  contract: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CONTRACT_V1;
  report_name: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_apply_plan_artifact_rel_path: string;
  proposed_batch_id: string;
  run_id: string;
  plan_status: FridgeBuyerPathBatchApplyPlanStatusV1;
  owner_review_status: FridgeBuyerPathBatchApplyPlanOwnerReviewStatusV1;
  planned_change_count: number;
  approval_status: FridgeBuyerPathBatchApplyPlanApprovalStatusV1;
  owner_approval_required: true;
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  checklist_markdown: string;
  matched_registry_row: FounderDecisionRegistryRowV1 | null;
  registry_validation_errors: string[];
  founder_decision_registry_export_preview: FounderDecisionRegistryDocumentV1 | null;
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildFridgeBuyerPathBatchApplyPlanApprovalDepsV1 = {
  rootDir: string;
  now?: () => Date;
  applyPlanArtifactRelPath?: string;
  loadApplyPlanArtifact?: (args: {
    rootDir: string;
    relPath: string;
  }) => FridgeBuyerPathBatchApplyPlanArtifactV1 | null;
  readRegistryFiles?: typeof scanFounderDecisionRegistryJsonFilesV1;
};

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

export function assertFridgeApplyPlanApprovalRegistryOutPathAllowedV1(
  outPath: string,
  rootDir: string,
): void {
  const abs = path.resolve(rootDir, outPath);
  const allowedAbs = path.resolve(
    rootDir,
    FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_DEFAULT_REGISTRY_REL_V1,
  );
  if (abs !== allowedAbs) {
    throw new Error(
      `--registry-out must be exactly ${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_DEFAULT_REGISTRY_REL_V1} (got ${outPath})`,
    );
  }
}

export function loadFridgeBuyerPathBatchApplyPlanArtifactV1(args: {
  rootDir: string;
  relPath: string;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
}): FridgeBuyerPathBatchApplyPlanArtifactV1 | null {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const abs = path.join(args.rootDir, args.relPath);
  if (!fileExists(abs)) return null;
  try {
    const doc = JSON.parse(readText(abs)) as Record<string, unknown>;
    if (doc.contract !== FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1) {
      return null;
    }
    const planned_change_count = doc.planned_change_count;
    const planned_changes = doc.planned_changes;
    if (
      typeof planned_change_count !== "number" ||
      !Number.isInteger(planned_change_count) ||
      planned_change_count < 1 ||
      !Array.isArray(planned_changes)
    ) {
      return null;
    }
    const plan_status = doc.plan_status;
    if (plan_status !== "READY_FOR_OWNER_REVIEW" && plan_status !== "BLOCKED") {
      return null;
    }
    const owner_review_status = doc.owner_review_status;
    const resolvedOwnerReviewStatus =
      owner_review_status === "OWNER_REVIEW_READY" || owner_review_status === "OWNER_REVIEW_BLOCKED"
        ? owner_review_status
        : plan_status === "READY_FOR_OWNER_REVIEW"
          ? "OWNER_REVIEW_READY"
          : "OWNER_REVIEW_BLOCKED";
    return {
      contract: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
      source_apply_plan_artifact_rel_path: args.relPath,
      proposed_batch_id: String(doc.proposed_batch_id ?? ""),
      run_id: String(doc.run_id ?? ""),
      plan_status,
      owner_review_status: resolvedOwnerReviewStatus,
      planned_change_count,
      planned_changes: planned_changes.map((row) => ({
        slug: typeof (row as Record<string, unknown>).slug === "string"
          ? ((row as Record<string, unknown>).slug as string)
          : "",
      })),
    };
  } catch {
    return null;
  }
}

export function buildFridgeBuyerPathBatchApplyPlanApprovalChecklistMarkdownV1(
  applyPlan: FridgeBuyerPathBatchApplyPlanArtifactV1,
): string {
  const slugLines = applyPlan.planned_changes.map((row) => `- \`${row.slug}\``);

  return [
    "# Fridge buyer-path apply-plan owner approval checklist",
    "",
    `Generated from apply-plan artifact \`${applyPlan.source_apply_plan_artifact_rel_path}\`.`,
    "",
    FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_NO_AUTHORITY_ATTESTATION_V1,
    "",
    "## Apply-plan summary",
    "",
    `- **source_apply_plan_artifact_rel_path:** \`${applyPlan.source_apply_plan_artifact_rel_path}\``,
    `- **proposed_batch_id:** \`${applyPlan.proposed_batch_id}\``,
    `- **run_id:** \`${applyPlan.run_id}\``,
    `- **plan_status:** \`${applyPlan.plan_status}\``,
    `- **owner_review_status:** \`${applyPlan.owner_review_status}\``,
    `- **planned_change_count:** ${String(applyPlan.planned_change_count)}`,
    "",
    "## Planned slugs",
    "",
    ...slugLines,
    "",
    "## Founder decision (apply-plan artifact — one decision for all planned changes)",
    "",
    "Allowed `founder_decision` values (set exactly one in the active block below):",
    BATCH_OWNER_APPROVAL_FOUNDER_OPTIONS_V1.map((opt) => `\`${opt}\``).join(" · "),
    "",
    `${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_ACTIVE_DECISION_BEGIN_PREFIX_V1}${applyPlan.source_apply_plan_artifact_rel_path}`,
    `apply_plan_artifact_rel_path: ${applyPlan.source_apply_plan_artifact_rel_path}`,
    `planned_change_count: ${String(applyPlan.planned_change_count)}`,
    `founder_decision: ${BATCH_OWNER_APPROVAL_CHOOSE_ONE_SENTINEL_V1}`,
    "owner_note:",
    "END_ACTIVE_DECISION",
    "",
    "## After you decide",
    "",
    "Compile (stdout JSON only):",
    "`npm run buckparts:fridge-buyer-path-batch-apply-plan-approval -- --decisions <this-file.md>`",
    "",
    "Optional registry export (owner decision artifact only):",
    `\`npm run buckparts:fridge-buyer-path-batch-apply-plan-approval -- --decisions <this-file.md> --registry-out ${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_DEFAULT_REGISTRY_REL_V1}\``,
    "",
  ].join("\n");
}

export function parseFridgeBuyerPathBatchApplyPlanApprovalDecisionsFromMarkdownV1(args: {
  markdown: string;
  expected_apply_plan_artifact_rel_path: string;
  expected_planned_change_count: number;
}): FridgeBuyerPathBatchApplyPlanApprovalDecisionParseV1 {
  const errors: string[] = [];
  const beginPrefix = `${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_ACTIVE_DECISION_BEGIN_PREFIX_V1}${args.expected_apply_plan_artifact_rel_path}`;
  const beginIdx = args.markdown.indexOf(beginPrefix);
  if (beginIdx < 0) {
    return {
      source_apply_plan_artifact_rel_path: args.expected_apply_plan_artifact_rel_path,
      planned_change_count: null,
      founder_option_id: null,
      owner_note: "",
      parse_errors: [
        `missing active decision block for apply_plan_artifact_rel_path ${args.expected_apply_plan_artifact_rel_path}`,
      ],
    };
  }
  const endIdx = args.markdown.indexOf("END_ACTIVE_DECISION", beginIdx);
  if (endIdx < 0) {
    return {
      source_apply_plan_artifact_rel_path: args.expected_apply_plan_artifact_rel_path,
      planned_change_count: null,
      founder_option_id: null,
      owner_note: "",
      parse_errors: ["missing END_ACTIVE_DECISION sentinel"],
    };
  }
  const block = args.markdown.slice(beginIdx, endIdx);
  const artifactMatch = block.match(/apply_plan_artifact_rel_path:\s*(\S+)/);
  const countMatch = block.match(/planned_change_count:\s*(\d+)/);
  const decisionMatch = block.match(/founder_decision:\s*(\S+)/);
  const noteMatch = block.match(/owner_note:\s*([\s\S]*?)$/);

  const artifactPath = artifactMatch?.[1]?.trim() ?? "";
  if (artifactPath !== args.expected_apply_plan_artifact_rel_path) {
    errors.push(
      `apply_plan_artifact_rel_path must be ${args.expected_apply_plan_artifact_rel_path} (got ${artifactPath || "missing"})`,
    );
  }

  const parsedCount = countMatch?.[1] ? Number.parseInt(countMatch[1], 10) : null;
  if (parsedCount == null || parsedCount !== args.expected_planned_change_count) {
    errors.push(
      `planned_change_count must be ${String(args.expected_planned_change_count)} (got ${countMatch?.[1] ?? "missing"})`,
    );
  }

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
    source_apply_plan_artifact_rel_path: args.expected_apply_plan_artifact_rel_path,
    planned_change_count: parsedCount,
    founder_option_id,
    owner_note: (noteMatch?.[1] ?? "").trim(),
    parse_errors: errors,
  };
}

export function buildFridgeBuyerPathBatchApplyPlanApprovalRegistryRowV1(args: {
  applyPlan: FridgeBuyerPathBatchApplyPlanArtifactV1;
  founder_option_id: BatchOwnerApprovalFounderOptionV1;
  owner_note: string;
  decided_at: string;
}): FounderDecisionRegistryRowV1 {
  const mapped = mapBatchOwnerOptionToRegistryStatusScope(args.founder_option_id);
  return {
    decision_id: `decision-${args.decided_at.slice(0, 10)}-fridge-buyer-path-apply-plan-${args.applyPlan.proposed_batch_id}`,
    source_queue_row_id: "queue-fridge-buyer-path-apply-plan-v1",
    source_decision_packet_id: expectedFridgeBuyerPathBatchApplyPlanApprovalSourceDecisionPacketId(
      args.applyPlan.source_apply_plan_artifact_rel_path,
    ),
    decided_at: args.decided_at,
    decision_status: mapped.decision_status,
    owner_note: args.owner_note,
    allowed_next_scope: mapped.allowed_next_scope,
    evidence_required_before_mutation: false,
    prohibited_actions_still_apply: [...BATCH_OWNER_APPROVAL_PROHIBITED_ACTIONS_V1],
    fridge_buyer_path_batch_apply_plan_approval_context_v1: {
      review_packet_contract: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CONTRACT_V1,
      founder_option_id: args.founder_option_id,
      source_apply_plan_artifact_rel_path: args.applyPlan.source_apply_plan_artifact_rel_path,
      planned_change_count: args.applyPlan.planned_change_count,
    },
  };
}

export function findMatchingFridgeBuyerPathBatchApplyPlanApprovalRegistryRowV1(args: {
  source_apply_plan_artifact_rel_path: string;
  files: ReturnType<typeof scanFounderDecisionRegistryJsonFilesV1>;
}): {
  matched_row: FounderDecisionRegistryRowV1 | null;
  validation_errors: string[];
} {
  const validation_errors: string[] = [];
  const expectedPacketId = expectedFridgeBuyerPathBatchApplyPlanApprovalSourceDecisionPacketId(
    args.source_apply_plan_artifact_rel_path,
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
      if (!isFridgeBuyerPathBatchApplyPlanApprovalRegistryRowV1(row)) continue;
      const ctx = row.fridge_buyer_path_batch_apply_plan_approval_context_v1;
      if (ctx?.source_apply_plan_artifact_rel_path !== args.source_apply_plan_artifact_rel_path) {
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
          `${file.source}: duplicate registry rows for apply_plan_artifact_rel_path ${args.source_apply_plan_artifact_rel_path}`,
        );
      }
      matched_row = row;
    }
  }

  return { matched_row, validation_errors };
}

export function resolveFridgeBuyerPathBatchApplyPlanApprovalStatusV1(args: {
  matched_row: FounderDecisionRegistryRowV1 | null;
  validation_errors: string[];
}): FridgeBuyerPathBatchApplyPlanApprovalStatusV1 {
  if (args.validation_errors.length > 0) {
    return "UNKNOWN";
  }
  if (!args.matched_row?.fridge_buyer_path_batch_apply_plan_approval_context_v1) {
    return "awaiting_owner_approval";
  }
  const opt = args.matched_row.fridge_buyer_path_batch_apply_plan_approval_context_v1.founder_option_id;
  if (opt === "approve_for_next_planning_only") {
    return "owner_approved_for_next_planning_only";
  }
  if (opt === "reject") {
    return "owner_rejected";
  }
  return "awaiting_owner_approval";
}

export function buildFridgeBuyerPathBatchApplyPlanApprovalReportV1(
  deps: BuildFridgeBuyerPathBatchApplyPlanApprovalDepsV1,
): FridgeBuyerPathBatchApplyPlanApprovalReportV1 {
  const now = deps.now ?? (() => new Date());
  const applyPlanRelPath =
    deps.applyPlanArtifactRelPath ??
    FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1;
  const loadApplyPlan =
    deps.loadApplyPlanArtifact ??
    ((args: { rootDir: string; relPath: string }) =>
      loadFridgeBuyerPathBatchApplyPlanArtifactV1(args));
  const readRegistry = deps.readRegistryFiles ?? scanFounderDecisionRegistryJsonFilesV1;

  const applyPlan = loadApplyPlan({ rootDir: deps.rootDir, relPath: applyPlanRelPath });
  if (!applyPlan) {
    throw new Error(`apply-plan artifact missing or invalid at ${applyPlanRelPath}`);
  }

  const registryFiles = readRegistry(deps.rootDir);
  const { matched_row, validation_errors } =
    findMatchingFridgeBuyerPathBatchApplyPlanApprovalRegistryRowV1({
      source_apply_plan_artifact_rel_path: applyPlan.source_apply_plan_artifact_rel_path,
      files: registryFiles,
    });
  const approval_status = resolveFridgeBuyerPathBatchApplyPlanApprovalStatusV1({
    matched_row,
    validation_errors,
  });

  return {
    contract: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CONTRACT_V1,
    report_name: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    source_apply_plan_artifact_rel_path: applyPlan.source_apply_plan_artifact_rel_path,
    proposed_batch_id: applyPlan.proposed_batch_id,
    run_id: applyPlan.run_id,
    plan_status: applyPlan.plan_status,
    owner_review_status: applyPlan.owner_review_status,
    planned_change_count: applyPlan.planned_change_count,
    approval_status,
    owner_approval_required: true,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    checklist_markdown: buildFridgeBuyerPathBatchApplyPlanApprovalChecklistMarkdownV1(applyPlan),
    matched_registry_row: matched_row,
    registry_validation_errors: validation_errors,
    founder_decision_registry_export_preview: null,
    recommended_next_action: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_RECOMMENDED_NEXT_ACTION_V1,
    proven_facts: [
      `PROVEN: approval bridge built from apply-plan artifact ${applyPlan.source_apply_plan_artifact_rel_path}.`,
      `PROVEN: planned_change_count=${String(applyPlan.planned_change_count)} pulled from artifact, not hardcoded.`,
      `PROVEN: approval_status=${approval_status}; plan_status=${applyPlan.plan_status}; owner_review_status=${applyPlan.owner_review_status}.`,
      "PROVEN: all mutation authorization fields false; planning-only founder options.",
      "PROVEN: approval does not authorize applying planned_changes to CSV, retailer_links, Supabase, public UI, buy-link, evidence, deploy, or Netlify.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether founder has filled checklist markdown but not yet exported registry JSON.",
      "UNKNOWN: Whether an apply executor exists after planning approval.",
    ],
  };
}

export function compileFridgeBuyerPathBatchApplyPlanApprovalRegistryExportV1(args: {
  applyPlan: FridgeBuyerPathBatchApplyPlanArtifactV1;
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
  const parsed = parseFridgeBuyerPathBatchApplyPlanApprovalDecisionsFromMarkdownV1({
    markdown: args.decisionsMarkdown,
    expected_apply_plan_artifact_rel_path: args.applyPlan.source_apply_plan_artifact_rel_path,
    expected_planned_change_count: args.applyPlan.planned_change_count,
  });
  if (parsed.parse_errors.length > 0 || !parsed.founder_option_id) {
    return { ok: false, errors: parsed.parse_errors };
  }
  const row = buildFridgeBuyerPathBatchApplyPlanApprovalRegistryRowV1({
    applyPlan: args.applyPlan,
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
