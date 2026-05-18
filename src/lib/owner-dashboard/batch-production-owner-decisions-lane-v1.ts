/**
 * Command Center v2 — read-only batch production owner decision lane.
 * PROVEN: loads committed founder_decision_registry_v1 rows with batch_production_owner_review_context_v1 only.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { scanFounderDecisionRegistryJsonFilesV1 } from "./founder-decision-registry-scan-v1";
import {
  isBatchProductionOwnerReviewRegistryRowV1,
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "./founder-decision-registry-v1";

export const BATCH_PRODUCTION_OWNER_DECISIONS_LANE_CONTRACT_V1 =
  "batch_production_owner_decisions_lane_v1" as const;

/** Primary committed export from Layer 7 five-row E2E (HQ handoff 78ff67d). */
export const BATCH_NON_AMAZON_PDP_OWNER_APPROVAL_REGISTRY_RELATIVE_V1 =
  "data/owner-decisions/batch-non-amazon-pdp-owner-approval.json" as const;

/** Documented in docs/BuckParts-HQ-HANDOFF.md stopping point — verified at build when handoff present. */
const HQ_HANDOFF_RELATIVE_V1 = "docs/BuckParts-HQ-HANDOFF.md" as const;

const HQ_DOCUMENTED_SOURCE_ROW_COUNT_V1 = 5;
const HQ_DOCUMENTED_EXCLUDED_ROW_IDS_V1 = ["da29-00012b", "adq75795101"] as const;

export type BatchProductionOwnerDecisionsLaneRuntimeStatusV1 =
  | "OK"
  | "UNKNOWN_REGISTRY_MISSING"
  | "UNKNOWN_PARSE_ERROR"
  | "UNKNOWN_NO_BATCH_ROWS";

export type BatchProductionOwnerDecisionsApprovedRowV1 = {
  row_id: string;
  token: string;
  decision_status: FounderDecisionRegistryRowV1["decision_status"];
  allowed_next_scope: FounderDecisionRegistryRowV1["allowed_next_scope"];
  founder_option_id: string;
  source_registry_file: string;
};

export type BatchProductionOwnerDecisionsLaneV1 = {
  contract: typeof BATCH_PRODUCTION_OWNER_DECISIONS_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  runtime_status: BatchProductionOwnerDecisionsLaneRuntimeStatusV1;
  source_registry_files: string[];
  primary_source_registry_file: string | "UNKNOWN";
  approved_for_planning_count: number;
  approved_rows: BatchProductionOwnerDecisionsApprovedRowV1[];
  source_row_count: number | "UNKNOWN";
  excluded_not_owner_review_ready_row_ids: string[] | "UNKNOWN";
  mutation_authority: false;
  may_mutate: false;
  may_write_production_evidence: false;
  automation_input: false;
  layer_6_founder_only_production_mutation_approval: "NOT_PROVEN";
  production_evidence_commit: "NOT_PROVEN";
  batch_size_20_status: "BLOCKED";
  owner_action_required: "none";
  next_agent_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

function verifyHqHandoffDocumentsE2eContext(rootDir: string): {
  source_row_count: number | "UNKNOWN";
  excluded_row_ids: string[] | "UNKNOWN";
} {
  const handoffAbs = path.join(rootDir, HQ_HANDOFF_RELATIVE_V1);
  if (!existsSync(handoffAbs)) {
    return { source_row_count: "UNKNOWN", excluded_row_ids: "UNKNOWN" };
  }
  let text: string;
  try {
    text = readFileSync(handoffAbs, "utf8");
  } catch {
    return { source_row_count: "UNKNOWN", excluded_row_ids: "UNKNOWN" };
  }
  const hasFiveSource =
    text.includes("5 source rows") || text.includes("**5 source rows**");
  const excludedOk = HQ_DOCUMENTED_EXCLUDED_ROW_IDS_V1.every(
    (id) => text.includes(`\`${id}\``) || text.includes(id),
  );
  return {
    source_row_count: hasFiveSource ? HQ_DOCUMENTED_SOURCE_ROW_COUNT_V1 : "UNKNOWN",
    excluded_row_ids: excludedOk ? [...HQ_DOCUMENTED_EXCLUDED_ROW_IDS_V1] : "UNKNOWN",
  };
}

export function buildBatchProductionOwnerDecisionsLaneV1(args: {
  rootDir: string;
  generated_at?: string;
}): BatchProductionOwnerDecisionsLaneV1 {
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [];
  const source_registry_files: string[] = [];
  const approved_rows: BatchProductionOwnerDecisionsApprovedRowV1[] = [];

  const scanned = scanFounderDecisionRegistryJsonFilesV1(args.rootDir);
  for (const file of scanned) {
    source_registry_files.push(file.source);
    if ("parseError" in file) {
      unknown_facts.push(`Registry parse error in ${file.source}: ${file.parseError}`);
      continue;
    }
    const docResult = validateFounderDecisionRegistryDocumentV1(file.parsed);
    if (!docResult.ok) {
      unknown_facts.push(`Registry document invalid in ${file.source}: ${docResult.errors.join("; ")}`);
      continue;
    }
    for (let i = 0; i < docResult.doc.rows.length; i++) {
      const rowResult = validateFounderDecisionRegistryRowV1(docResult.doc.rows[i]!);
      if (!rowResult.ok) {
        unknown_facts.push(`${file.source} rows[${i}]: ${rowResult.errors.join("; ")}`);
        continue;
      }
      const row = rowResult.row;
      if (!isBatchProductionOwnerReviewRegistryRowV1(row)) continue;
      const ctx = row.batch_production_owner_review_context_v1!;
      if (row.allowed_next_scope === "read_only_agent" && row.decision_status === "approved") {
        approved_rows.push({
          row_id: ctx.batch_row_id,
          token: ctx.token,
          decision_status: row.decision_status,
          allowed_next_scope: row.allowed_next_scope,
          founder_option_id: ctx.founder_option_id,
          source_registry_file: file.source,
        });
      }
    }
  }

  const primaryExists = existsSync(
    path.join(args.rootDir, BATCH_NON_AMAZON_PDP_OWNER_APPROVAL_REGISTRY_RELATIVE_V1),
  );
  const primary_source_registry_file = primaryExists
    ? BATCH_NON_AMAZON_PDP_OWNER_APPROVAL_REGISTRY_RELATIVE_V1
    : "UNKNOWN";

  const hqContext = verifyHqHandoffDocumentsE2eContext(args.rootDir);

  let runtime_status: BatchProductionOwnerDecisionsLaneRuntimeStatusV1;
  if (!primaryExists && approved_rows.length === 0) {
    runtime_status = "UNKNOWN_REGISTRY_MISSING";
    unknown_facts.push(
      `Primary registry export missing: ${BATCH_NON_AMAZON_PDP_OWNER_APPROVAL_REGISTRY_RELATIVE_V1}`,
    );
  } else if (approved_rows.length === 0) {
    runtime_status = "UNKNOWN_NO_BATCH_ROWS";
    unknown_facts.push("No validated batch_production_owner_review_context_v1 approved rows found.");
  } else if (unknown_facts.some((f) => f.includes("parse error") || f.includes("document invalid"))) {
    runtime_status = "UNKNOWN_PARSE_ERROR";
  } else {
    runtime_status = "OK";
    proven_facts.push(
      `PROVEN: ${approved_rows.length} approved planning-only row(s) from founder_decision_registry_v1 batch context.`,
    );
    if (primaryExists) {
      proven_facts.push(`PROVEN: primary export ${BATCH_NON_AMAZON_PDP_OWNER_APPROVAL_REGISTRY_RELATIVE_V1}.`);
    }
  }

  if (approved_rows.every((r) => r.allowed_next_scope === "read_only_agent")) {
    proven_facts.push("PROVEN: all approved rows have allowed_next_scope read_only_agent (no mutation authority).");
  }

  if (hqContext.source_row_count !== "UNKNOWN") {
    proven_facts.push(
      `PROVEN: source_row_count=${hqContext.source_row_count} from ${HQ_HANDOFF_RELATIVE_V1} Layer 7 E2E section.`,
    );
  } else {
    unknown_facts.push(`source_row_count UNKNOWN (not documented in ${HQ_HANDOFF_RELATIVE_V1}).`);
  }

  if (hqContext.excluded_row_ids !== "UNKNOWN") {
    proven_facts.push(
      `PROVEN: excluded_not_owner_review_ready_row_ids=${hqContext.excluded_row_ids.join(", ")} from ${HQ_HANDOFF_RELATIVE_V1}.`,
    );
  } else {
    unknown_facts.push(
      `excluded_not_owner_review_ready_row_ids UNKNOWN (not documented in ${HQ_HANDOFF_RELATIVE_V1}).`,
    );
  }

  proven_facts.push("PROVEN: batch_size_20_status BLOCKED per docs/BuckParts-BATCH-PRODUCTION-LANE-V1.md (V1 cap 5–10; 20–50 deferred).");
  proven_facts.push("PROVEN: layer_6_founder_only_production_mutation_approval NOT_PROVEN; production_evidence_commit NOT_PROVEN.");

  return {
    contract: BATCH_PRODUCTION_OWNER_DECISIONS_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    runtime_status,
    source_registry_files: Array.from(new Set(source_registry_files)).sort(),
    primary_source_registry_file,
    approved_for_planning_count: approved_rows.length,
    approved_rows: approved_rows.sort((a, b) => a.row_id.localeCompare(b.row_id)),
    source_row_count: hqContext.source_row_count,
    excluded_not_owner_review_ready_row_ids: hqContext.excluded_row_ids,
    mutation_authority: false,
    may_mutate: false,
    may_write_production_evidence: false,
    automation_input: false,
    layer_6_founder_only_production_mutation_approval: "NOT_PROVEN",
    production_evidence_commit: "NOT_PROVEN",
    batch_size_20_status: "BLOCKED",
    owner_action_required: "none",
    next_agent_action:
      "Read-only batch planning/reporting only — use buckparts:batch-owner-review and buckparts:batch-owner-approval-checklist; no production mutation, evidence commit, Supabase, retailer_links, or apply execution.",
    proven_facts,
    unknown_facts,
  };
}
