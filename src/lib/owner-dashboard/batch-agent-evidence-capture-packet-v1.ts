/**
 * Batch Agent Evidence Capture Packet v1 — agent-facing schema/prompt from evidence plan + facts template.
 * PROVEN: no I/O; does not write production evidence or mutate production.
 */

import {
  BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1,
  type BatchEvidenceCollectionPlanV1,
  type BatchEvidenceRequiredCheckV1,
} from "./batch-evidence-collection-plan-v1";
import {
  BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_CONTRACT_V1,
  buildBatchOwnerScreenshotFactsTemplateV1,
  buildFactsTemplateNestedForPlanRowV1,
  type BatchOwnerScreenshotFactsTemplateNestedV1,
  type BatchOwnerScreenshotFactsTemplateV1,
} from "./batch-owner-screenshot-facts-template-v1";

export const BATCH_AGENT_EVIDENCE_CAPTURE_PACKET_CONTRACT_V1 =
  "batch_agent_evidence_capture_packet_v1" as const;

export const BATCH_AGENT_EVIDENCE_CAPTURE_NO_MUTATION_ATTESTATION_V1 =
  "PROVEN: This packet does not authorize Supabase writes, retailer_links mutation, affiliate URL changes, git commits, or writing production evidence JSON under data/evidence/. may_write_evidence and may_mutate are false on every row. layer_6_founder_only_approval remains NOT_PROVEN. Agent output is draft/review input only until founder review.";

export const BATCH_AGENT_EVIDENCE_CAPTURE_AGENT_ROLE_V1 =
  "The agent (Codex or other automation) gathers Amazon PDP screenshot observations and fills the nested facts JSON. The owner/founder does not manually author JSON in the main workflow.";

export const BATCH_AGENT_EVIDENCE_CAPTURE_OWNER_ROLE_V1 =
  "Owner/founder reviews agent-filled draft facts and draft packets only. Owner manual JSON entry is fallback/debug, not the primary path.";

export const BATCH_AGENT_EVIDENCE_CAPTURE_UNKNOWN_RULE_V1 =
  "When a field is not proven from visible PDP/screenshot evidence, use UNKNOWN (or null for optional fields per schema). Do not guess buyability, OEM status, ASIN, or token visibility.";

export const BATCH_AGENT_EVIDENCE_CAPTURE_PROHIBITED_ACTIONS_V1 = [
  "Do not write files under data/evidence/ (production evidence).",
  "Do not mutate data/retailer_links.csv or any retailer_links rows.",
  "Do not write to Supabase or call production mutation APIs.",
  "Do not change affiliate URLs or tracking parameters.",
  "Do not create git commits or open PRs that imply Layer 6 approval.",
  "Do not mark mutation_ready true or claim buyer-path safety is proven without evidence.",
  "Do not use Amazon search/category pages as PDP evidence.",
] as const;

export const BATCH_AGENT_EVIDENCE_CAPTURE_OUTPUT_JSON_SHAPE_V1 = {
  description:
    "Agent returns lane-local draft facts JSON only (review input). Same shape accepted by report-batch-owner-screenshot-drafts.ts.",
  envelope: { facts: "array of nested observation objects (one per plan row)" },
  example_path:
    "data/batch-production/drafts/owner-screenshot-facts-template.amazon-rescue-default.json",
} as const;

export type BatchAgentEvidenceCapturePacketRowV1 = {
  row_id: string;
  token: string | null;
  slug: string | null;
  source_queue_row_id: string | null;
  /** Reference only — not a write target for the agent. */
  evidence_prefix: string | null;
  suggested_production_evidence_path: string | null;
  required_checks: BatchEvidenceRequiredCheckV1[];
  facts_template_to_fill: BatchOwnerScreenshotFactsTemplateNestedV1;
  agent_task_summary: string;
  owner_review_required: true;
  may_write_evidence: false;
  may_mutate: false;
};

export type BatchAgentEvidenceCapturePacketV1 = {
  contract: typeof BATCH_AGENT_EVIDENCE_CAPTURE_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  may_write_evidence: false;
  may_mutate: false;
  automation_input: true;
  generated_at: string;
  source_plan_contract: typeof BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1;
  source_template_contract: typeof BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_CONTRACT_V1;
  packet_row_count: number;
  layer_6_founder_only_approval: "NOT_PROVEN";
  no_mutation_attestation: typeof BATCH_AGENT_EVIDENCE_CAPTURE_NO_MUTATION_ATTESTATION_V1;
  agent_role: typeof BATCH_AGENT_EVIDENCE_CAPTURE_AGENT_ROLE_V1;
  owner_role: typeof BATCH_AGENT_EVIDENCE_CAPTURE_OWNER_ROLE_V1;
  unknown_when_not_proven_rule: typeof BATCH_AGENT_EVIDENCE_CAPTURE_UNKNOWN_RULE_V1;
  prohibited_actions: readonly string[];
  output_json_shape: typeof BATCH_AGENT_EVIDENCE_CAPTURE_OUTPUT_JSON_SHAPE_V1;
  agent_instructions: string[];
  owner_manual_json_fallback_note: string;
  rows: BatchAgentEvidenceCapturePacketRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildBatchAgentEvidenceCapturePacketOptionsV1 = {
  plan: BatchEvidenceCollectionPlanV1;
  template?: BatchOwnerScreenshotFactsTemplateV1;
  generated_at?: string;
};

function buildAgentTaskSummaryForRow(
  token: string | null,
  slug: string | null,
): string {
  const t = token?.trim() || "UNKNOWN";
  const s = slug?.trim() || "UNKNOWN";
  return [
    `Agent: open Amazon, search exact token ${t}, locate seller-controlled PDP for slug ${s}.`,
    "Fill facts_template_to_fill from visible PDP/screenshot only.",
    "Use UNKNOWN when not proven. Save output as lane draft JSON under data/batch-production/drafts/ (not data/evidence/).",
    "Founder reviews via report-batch-owner-screenshot-drafts.ts after agent output is saved.",
  ].join(" ");
}

/**
 * Pure builder: evidence plan + facts template → agent capture packet (stdout / prompt input).
 */
export function buildBatchAgentEvidenceCapturePacketV1(
  options: BuildBatchAgentEvidenceCapturePacketOptionsV1,
): BatchAgentEvidenceCapturePacketV1 {
  const generated_at = options.generated_at ?? new Date().toISOString();
  const template =
    options.template ??
    buildBatchOwnerScreenshotFactsTemplateV1({
      plan: options.plan,
      generated_at,
    });

  const templateByRowId = new Map(template.rows.map((r) => [r.row_id, r]));

  const rows: BatchAgentEvidenceCapturePacketRowV1[] = options.plan.rows.map((planRow) => {
    const templateRow = templateByRowId.get(planRow.row_id);
    const facts_template_to_fill =
      templateRow?.facts_template ?? buildFactsTemplateNestedForPlanRowV1(planRow);

    return {
      row_id: planRow.row_id,
      token: planRow.token,
      slug: planRow.slug,
      source_queue_row_id: planRow.source_queue_row_id,
      evidence_prefix: planRow.evidence_prefix,
      suggested_production_evidence_path: templateRow?.suggested_production_evidence_path ?? null,
      required_checks: [...planRow.required_checks],
      facts_template_to_fill,
      agent_task_summary: buildAgentTaskSummaryForRow(planRow.token, planRow.slug),
      owner_review_required: true,
      may_write_evidence: false,
      may_mutate: false,
    };
  });

  const agent_instructions = [
    BATCH_AGENT_EVIDENCE_CAPTURE_AGENT_ROLE_V1,
    BATCH_AGENT_EVIDENCE_CAPTURE_UNKNOWN_RULE_V1,
    "For each row, complete facts_template_to_fill using nested fields: page_observation, buyability_observation, seller_observation, product_relationship, browser_evidence, screenshot_sources.",
    "Allowed page_kind values: product_detail_page, search_results_page, other, unknown — use product_detail_page only when PDP is proven.",
    "Allowed stock_status values: in_stock, out_of_stock, unknown.",
    "Allowed oem_or_aftermarket values: oem_official, compatible_aftermarket, unknown, blocked_unsafe.",
    "Capture 10-char ASIN and canonical /dp/ URL when visible; otherwise leave empty and note UNKNOWN in notes.",
    `Write agent output JSON to ${BATCH_AGENT_EVIDENCE_CAPTURE_OUTPUT_JSON_SHAPE_V1.example_path} or another path under data/batch-production/drafts/ only.`,
    "Do not instruct the owner to hand-author JSON; owner reviews agent output.",
  ];

  return {
    contract: BATCH_AGENT_EVIDENCE_CAPTURE_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    may_write_evidence: false,
    may_mutate: false,
    automation_input: true,
    generated_at,
    source_plan_contract: BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1,
    source_template_contract: BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_CONTRACT_V1,
    packet_row_count: rows.length,
    layer_6_founder_only_approval: "NOT_PROVEN",
    no_mutation_attestation: BATCH_AGENT_EVIDENCE_CAPTURE_NO_MUTATION_ATTESTATION_V1,
    agent_role: BATCH_AGENT_EVIDENCE_CAPTURE_AGENT_ROLE_V1,
    owner_role: BATCH_AGENT_EVIDENCE_CAPTURE_OWNER_ROLE_V1,
    unknown_when_not_proven_rule: BATCH_AGENT_EVIDENCE_CAPTURE_UNKNOWN_RULE_V1,
    prohibited_actions: [...BATCH_AGENT_EVIDENCE_CAPTURE_PROHIBITED_ACTIONS_V1],
    output_json_shape: BATCH_AGENT_EVIDENCE_CAPTURE_OUTPUT_JSON_SHAPE_V1,
    agent_instructions,
    owner_manual_json_fallback_note:
      "INFERRED: Owner-filled JSON via worksheet/template file writes is fallback/debug only. Primary path: agent fills facts → founder reviews draft packet.",
    rows,
    proven_facts: [
      "PROVEN: Packet built read-only from batch_evidence_collection_plan_v1 + batch_owner_screenshot_facts_template_v1.",
      "PROVEN: Agent is assigned facts capture; owner is assigned review only.",
      `PROVEN: packet_row_count=${rows.length}.`,
    ],
    unknown_facts: [
      "UNKNOWN: Whether agent browser access will succeed for every cohort token.",
      "UNKNOWN: Whether founder will approve any row for production evidence commit after review.",
    ],
  };
}

/** PROVEN: packet never grants write or mutation authority. */
export function batchAgentEvidenceCapturePacketGrantsWriteAuthority(
  packet: BatchAgentEvidenceCapturePacketV1,
): boolean {
  if (packet.may_write_evidence !== false) return true;
  if (packet.may_mutate !== false) return true;
  if (packet.data_mutation !== false) return true;
  if (packet.read_only !== true) return true;
  if (packet.layer_6_founder_only_approval !== "NOT_PROVEN") return true;
  return packet.rows.some((r) => r.may_write_evidence !== false || r.may_mutate !== false);
}
