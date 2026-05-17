import assert from "node:assert/strict";
import test from "node:test";

import { BATCH_AMAZON_RESCUE_DEFAULT_COHORT_TOKENS_V1 } from "./batch-production-amazon-rescue-source-v1";
import {
  BATCH_AGENT_EVIDENCE_CAPTURE_AGENT_ROLE_V1,
  BATCH_AGENT_EVIDENCE_CAPTURE_PACKET_CONTRACT_V1,
  BATCH_AGENT_EVIDENCE_CAPTURE_PROHIBITED_ACTIONS_V1,
  batchAgentEvidenceCapturePacketGrantsWriteAuthority,
  buildBatchAgentEvidenceCapturePacketV1,
} from "./batch-agent-evidence-capture-packet-v1";
import { buildBatchEvidenceCollectionPlanV1 } from "./batch-evidence-collection-plan-v1";
import { buildBatchOwnerScreenshotFactsTemplateV1 } from "./batch-owner-screenshot-facts-template-v1";
import {
  buildBatchProductionReviewReportV1,
  type BatchProductionReviewReportRowV1,
} from "./batch-production-lane-v1";

function reviewRow(
  partial: Partial<BatchProductionReviewReportRowV1> & { row_id: string },
): BatchProductionReviewReportRowV1 {
  return {
    row_id: partial.row_id,
    token: partial.token ?? "TOKEN",
    slug: partial.slug ?? partial.row_id,
    url: partial.url ?? null,
    source_queue_row_id: partial.source_queue_row_id ?? "queue-amazon-agent",
    title: partial.title ?? null,
    candidate_kind: partial.candidate_kind ?? "rescue_target",
    classification: partial.classification ?? "needs_more_evidence",
    buyer_path_safety: partial.buyer_path_safety ?? "unknown",
    wrong_purchase_risk: partial.wrong_purchase_risk ?? "unknown",
    recommended_next_action: partial.recommended_next_action ?? "review",
    missing_evidence: partial.missing_evidence ?? [],
    stop_reason: partial.stop_reason ?? "buyer_path_unknown",
    requires_owner_approval_before_mutation: true,
    may_mutate: false,
  };
}

function amazonRescuePlanAndTemplate() {
  const slugs = ["adq75795101", "da97-08006b", "da97-17376a", "da97-19467c", "w10413645a"];
  const report = buildBatchProductionReviewReportV1({
    rows: slugs.map((slug, i) =>
      reviewRow({
        row_id: slug,
        slug,
        token: BATCH_AMAZON_RESCUE_DEFAULT_COHORT_TOKENS_V1[i] ?? slug,
      }),
    ),
    generated_at: "t",
  });
  const plan = buildBatchEvidenceCollectionPlanV1({ reviewReport: report, generated_at: "t" });
  const template = buildBatchOwnerScreenshotFactsTemplateV1({ plan, generated_at: "t" });
  return { plan, template };
}

test("packet envelope is read-only with may_write_evidence false and Layer 6 NOT_PROVEN", () => {
  const { plan, template } = amazonRescuePlanAndTemplate();
  const packet = buildBatchAgentEvidenceCapturePacketV1({ plan, template, generated_at: "t" });
  assert.equal(packet.contract, BATCH_AGENT_EVIDENCE_CAPTURE_PACKET_CONTRACT_V1);
  assert.equal(packet.read_only, true);
  assert.equal(packet.data_mutation, false);
  assert.equal(packet.may_write_evidence, false);
  assert.equal(packet.may_mutate, false);
  assert.equal(packet.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.equal(batchAgentEvidenceCapturePacketGrantsWriteAuthority(packet), false);
});

test("amazon-rescue cohort produces 5 packet rows with facts_template_to_fill", () => {
  const { plan, template } = amazonRescuePlanAndTemplate();
  const packet = buildBatchAgentEvidenceCapturePacketV1({ plan, template, generated_at: "t" });
  assert.equal(packet.packet_row_count, 5);
  const w104 = packet.rows.find((r) => r.row_id === "w10413645a");
  assert.ok(w104);
  assert.equal(w104!.token, "W10413645A");
  assert.equal(w104!.facts_template_to_fill.browser_evidence.token_searched, "W10413645A");
  assert.ok(w104!.required_checks.length >= 7);
  assert.equal(w104!.owner_review_required, true);
});

test("agent is instructed to fill facts; owner is not primary JSON author", () => {
  const { plan, template } = amazonRescuePlanAndTemplate();
  const packet = buildBatchAgentEvidenceCapturePacketV1({ plan, template, generated_at: "t" });
  const blob = JSON.stringify(packet);
  assert.match(packet.agent_role, /agent.*fills/i);
  assert.match(blob, /Agent:/i);
  assert.match(packet.owner_role, /reviews agent-filled/i);
  assert.match(packet.owner_manual_json_fallback_note, /fallback\/debug/i);
  assert.match(packet.agent_role, /does not manually author JSON in the main workflow/i);
  assert.ok(
    packet.agent_instructions.some((line) => line.includes(BATCH_AGENT_EVIDENCE_CAPTURE_AGENT_ROLE_V1)),
  );
  assert.ok(packet.agent_instructions.some((line) => /Do not instruct the owner to hand-author JSON/i.test(line)));
});

test("prohibited actions include production evidence retailer_links Supabase affiliate commit", () => {
  const { plan, template } = amazonRescuePlanAndTemplate();
  const packet = buildBatchAgentEvidenceCapturePacketV1({ plan, template, generated_at: "t" });
  const joined = BATCH_AGENT_EVIDENCE_CAPTURE_PROHIBITED_ACTIONS_V1.join(" ");
  assert.match(joined, /data\/evidence/);
  assert.match(joined, /retailer_links/);
  assert.match(joined, /Supabase/);
  assert.match(joined, /affiliate/);
  assert.match(joined, /commits/);
  assert.deepEqual(packet.prohibited_actions, [...BATCH_AGENT_EVIDENCE_CAPTURE_PROHIBITED_ACTIONS_V1]);
});

test("output_json_shape references facts array for draft CLI", () => {
  const { plan, template } = amazonRescuePlanAndTemplate();
  const packet = buildBatchAgentEvidenceCapturePacketV1({ plan, template, generated_at: "t" });
  assert.equal(packet.output_json_shape.envelope.facts, "array of nested observation objects (one per plan row)");
  assert.match(packet.output_json_shape.example_path, /data\/batch-production\/drafts\//);
});

test("UNKNOWN rule is present on packet", () => {
  const { plan, template } = amazonRescuePlanAndTemplate();
  const packet = buildBatchAgentEvidenceCapturePacketV1({ plan, template, generated_at: "t" });
  assert.match(packet.unknown_when_not_proven_rule, /UNKNOWN/);
});
