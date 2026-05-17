import assert from "node:assert/strict";
import test from "node:test";

import {
  BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1,
  type BatchEvidenceCollectionPlanV1,
} from "./batch-evidence-collection-plan-v1";
import {
  BATCH_OWNER_FACTS_TOKEN_CONFLICT_WITH_PLAN_V1,
  BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1,
  batchOwnerScreenshotDraftGrantsProductionWrite,
  buildBatchOwnerScreenshotDraftPacketV1,
  listMissingOwnerFactsForBuildV1,
  normalizeBatchOwnerScreenshotFactsRowV1,
  parseBatchOwnerScreenshotFactsInputV1,
  reconcileOwnerFactsTokenWithPlanRowV1,
} from "./batch-owner-screenshot-draft-packet-v1";

const W10413645A_FACTS = {
  row_id: "w10413645a",
  token: "W10413645A",
  filter_slug: "w10413645a",
  screenshot_sources: [
    {
      label: "owner_chat_screenshot",
      path: null,
      committed_to_repo: false,
    },
  ],
  page_kind: "product_detail_page" as const,
  token_visible_in_pdp_title: true,
  token_visible_elsewhere_on_page: false,
  seller_controlled_pdp_identity: true,
  buy_path_visible: true,
  stock_status: "in_stock",
  price_visible_usd: 33.99,
  sold_by: "LIMERDU",
  fulfilled_by: "Amazon",
  brand_visible: "Yanhour",
  oem_or_aftermarket: "compatible_aftermarket" as const,
  relationship_notes: "Compatible replacement; not OEM Whirlpool.",
  asin: null,
  canonical_url: null,
  seller_title_visible: "Title includes exact token W10413645A",
};

/** Nested observation sections (evidence-packet-style), not top-level flat fields. */
const W10413645A_NESTED_FACTS = {
  row_id: "w10413645a",
  token: "W10413645A",
  filter_slug: "w10413645a",
  screenshot_sources: [
    {
      label: "owner_chat_screenshot_w10413645a_pdp",
      path: null,
      committed_to_repo: false,
      captured_at_iso: null,
    },
  ],
  page_observation: {
    page_kind: "product_detail_page",
    token_visible_in_pdp_title: true,
    token_visible_elsewhere_on_page: false,
    seller_controlled_pdp_identity: true,
  },
  buyability_observation: {
    buy_path_visible: true,
    stock_status: "in_stock",
    price_visible_usd: 33.99,
  },
  seller_observation: {
    sold_by: "LIMERDU",
    fulfilled_by: "Amazon",
    brand_visible: "Yanhour",
  },
  product_relationship: {
    oem_or_aftermarket: "compatible_aftermarket",
    notes: "Compatible replacement; not OEM Whirlpool.",
  },
  browser_evidence: {
    token_searched: "W10413645A",
    asin: null,
    seller_title_visible: "Title includes exact token W10413645A (owner screenshot observation)",
  },
};

const W10413645A_INCOMPLETE_NESTED = {
  row_id: "w10413645a",
  token: "W10413645A",
  screenshot_sources: [],
};

/** Nested observations only — token comes from plan row when matched by row_id. */
const W10413645A_NESTED_NO_TOKEN = {
  row_id: "w10413645a",
  filter_slug: "w10413645a",
  screenshot_sources: W10413645A_NESTED_FACTS.screenshot_sources,
  page_observation: W10413645A_NESTED_FACTS.page_observation,
  buyability_observation: W10413645A_NESTED_FACTS.buyability_observation,
  seller_observation: W10413645A_NESTED_FACTS.seller_observation,
  product_relationship: W10413645A_NESTED_FACTS.product_relationship,
};

const W10413645A_NESTED_TOKEN_CONFLICT = {
  ...W10413645A_NESTED_FACTS,
  token: "ADQ75795101",
};

function minimalPlan(rowIds: string[]): BatchEvidenceCollectionPlanV1 {
  return {
    contract: BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    may_write_evidence: false,
    automation_input: false,
    generated_at: "t",
    source_review_contract: "batch_production_review_report_v1",
    source_review_generated_at: "t",
    plan_row_count: rowIds.length,
    layer_6_founder_only_approval: "NOT_PROVEN",
    no_evidence_write_attestation: "x",
    rows: rowIds.map((row_id) => ({
      row_id,
      token: row_id === "w10413645a" ? "W10413645A" : "TOKEN",
      slug: row_id,
      source_queue_row_id: "queue-amazon-agent",
      evidence_prefix: `data/evidence/amazon-${row_id}-`,
      required_checks: [],
      screenshot_needed: true,
      owner_browser_required: true,
      may_write_evidence: false,
      may_mutate: false,
      recommended_next_action: "owner_browser_capture_required",
      review_classification: "needs_more_evidence",
      review_missing_evidence: [],
    })),
    proven_facts: [],
    unknown_facts: [],
  };
}

test("missing owner facts fail closed with missing_owner_facts", () => {
  const packet = buildBatchOwnerScreenshotDraftPacketV1({
    plan: minimalPlan(["adq75795101", "w10413645a"]),
    factsInput: { facts: [W10413645A_FACTS] },
    generated_at: "t",
  });
  const missingRow = packet.rows.find((r) => r.row_id === "adq75795101");
  assert.ok(missingRow);
  assert.ok(missingRow!.missing_owner_facts.includes("owner_facts_row_missing"));
  assert.equal(missingRow!.draft_packet, null);
  assert.equal(missingRow!.draft_ready_for_owner_review, false);
});

test("W10413645A compatible aftermarket facts produce draft but may_write_production_evidence false", () => {
  const packet = buildBatchOwnerScreenshotDraftPacketV1({
    plan: minimalPlan(["w10413645a"]),
    factsInput: { facts: [W10413645A_FACTS] },
    generated_at: "t",
  });
  const row = packet.rows[0]!;
  assert.equal(row.row_id, "w10413645a");
  assert.ok(row.draft_packet);
  assert.equal(row.draft_packet!.owner_verdict, "DIRECT_BUYABLE_EXACT_TOKEN_COMPATIBLE_AFTERMARKET");
  assert.equal(row.may_write_production_evidence, false);
  assert.equal(row.may_mutate, false);
  assert.equal(row.draft_packet!.mutation_ready, false);
  assert.equal(row.proposed_production_evidence_prefix, "data/evidence/amazon-w10413645a-");
  assert.ok(row.suggested_production_evidence_path?.startsWith("data/evidence/amazon-w10413645a-"));
  assert.ok(row.missing_owner_facts.some((m) => /ASIN/i.test(m)));
  assert.equal(row.draft_ready_for_owner_review, false);
});

test("production path is prefix reference only in draft output", () => {
  const packet = buildBatchOwnerScreenshotDraftPacketV1({
    plan: minimalPlan(["w10413645a"]),
    factsInput: { facts: [W10413645A_FACTS] },
    generated_at: "t",
  });
  const row = packet.rows[0]!;
  assert.match(row.proposed_production_evidence_prefix ?? "", /^data\/evidence\/amazon-/);
  assert.ok(row.suggested_production_evidence_path);
  assert.ok(
    row.draft_packet?.suggested_commit_path?.startsWith("data/evidence/") ||
      row.suggested_production_evidence_path?.startsWith("data/evidence/"),
  );
});

test("Layer 6 remains NOT_PROVEN and no mutation authority granted", () => {
  const packet = buildBatchOwnerScreenshotDraftPacketV1({
    plan: minimalPlan(["w10413645a"]),
    factsInput: { facts: [W10413645A_FACTS] },
    generated_at: "t",
  });
  assert.equal(packet.contract, BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1);
  assert.equal(packet.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.equal(packet.may_write_production_evidence, false);
  assert.equal(batchOwnerScreenshotDraftGrantsProductionWrite(packet), false);
});

test("listMissingOwnerFactsForBuildV1 detects absent row", () => {
  assert.deepEqual(listMissingOwnerFactsForBuildV1(null), ["owner_facts_row_missing"]);
});

test("normalizeBatchOwnerScreenshotFactsRowV1 flattens nested observation sections", () => {
  const flat = normalizeBatchOwnerScreenshotFactsRowV1(W10413645A_NESTED_FACTS);
  assert.equal(flat.page_kind, "product_detail_page");
  assert.equal(flat.oem_or_aftermarket, "compatible_aftermarket");
  assert.equal(flat.token_visible_in_pdp_title, true);
  assert.equal(flat.buy_path_visible, true);
  assert.equal(flat.sold_by, "LIMERDU");
});

test("nested W10413645A compatible aftermarket facts build draft_packet", () => {
  const factsInput = parseBatchOwnerScreenshotFactsInputV1({
    facts: [W10413645A_NESTED_FACTS],
  });
  const packet = buildBatchOwnerScreenshotDraftPacketV1({
    plan: minimalPlan(["w10413645a"]),
    factsInput,
    generated_at: "t",
  });
  const row = packet.rows[0]!;
  assert.ok(row.draft_packet);
  assert.equal(row.draft_packet!.owner_verdict, "DIRECT_BUYABLE_EXACT_TOKEN_COMPATIBLE_AFTERMARKET");
  assert.equal(row.may_write_production_evidence, false);
  assert.equal(row.may_mutate, false);
  assert.equal(row.draft_packet!.mutation_ready, false);
});

test("nested facts keep ASIN and uncommitted screenshot from ready=true", () => {
  const packet = buildBatchOwnerScreenshotDraftPacketV1({
    plan: minimalPlan(["w10413645a"]),
    factsInput: parseBatchOwnerScreenshotFactsInputV1({ facts: [W10413645A_NESTED_FACTS] }),
    generated_at: "t",
  });
  const row = packet.rows[0]!;
  assert.ok(row.missing_owner_facts.some((m) => /ASIN/i.test(m)));
  assert.ok(row.missing_owner_facts.some((m) => /committed_to_repo/i.test(m)));
  assert.equal(row.draft_ready_for_owner_review, false);
});

test("flat facts still work after normalizer introduction", () => {
  const packet = buildBatchOwnerScreenshotDraftPacketV1({
    plan: minimalPlan(["w10413645a"]),
    factsInput: parseBatchOwnerScreenshotFactsInputV1({ facts: [W10413645A_FACTS] }),
    generated_at: "t",
  });
  assert.ok(packet.rows[0]!.draft_packet);
});

test("incomplete nested facts fail closed without draft_packet", () => {
  const packet = buildBatchOwnerScreenshotDraftPacketV1({
    plan: minimalPlan(["w10413645a"]),
    factsInput: parseBatchOwnerScreenshotFactsInputV1({ facts: [W10413645A_INCOMPLETE_NESTED] }),
    generated_at: "t",
  });
  const row = packet.rows[0]!;
  assert.equal(row.draft_packet, null);
  assert.ok(row.missing_owner_facts.includes("page_kind"));
  assert.equal(row.draft_ready_for_owner_review, false);
});

test("nested W104 without token inherits plan token and builds draft_packet", () => {
  const plan = minimalPlan(["w10413645a"]);
  const reconciled = reconcileOwnerFactsTokenWithPlanRowV1(
    plan.rows[0]!,
    normalizeBatchOwnerScreenshotFactsRowV1(W10413645A_NESTED_NO_TOKEN),
  );
  assert.equal(reconciled.token_conflict, false);
  assert.equal(reconciled.facts?.token, "W10413645A");

  const packet = buildBatchOwnerScreenshotDraftPacketV1({
    plan,
    factsInput: parseBatchOwnerScreenshotFactsInputV1({ facts: [W10413645A_NESTED_NO_TOKEN] }),
    generated_at: "t",
  });
  const row = packet.rows[0]!;
  assert.ok(row.draft_packet);
  assert.equal(row.draft_packet!.token, "W10413645A");
  assert.equal(row.may_write_production_evidence, false);
  assert.equal(row.may_mutate, false);
  assert.equal(row.draft_packet!.mutation_ready, false);
  assert.equal(row.draft_ready_for_owner_review, false);
});

test("nested W104 with matching explicit token still builds draft_packet", () => {
  const packet = buildBatchOwnerScreenshotDraftPacketV1({
    plan: minimalPlan(["w10413645a"]),
    factsInput: parseBatchOwnerScreenshotFactsInputV1({ facts: [W10413645A_NESTED_FACTS] }),
    generated_at: "t",
  });
  assert.ok(packet.rows[0]!.draft_packet);
  assert.equal(packet.rows[0]!.draft_packet!.token, "W10413645A");
});

test("nested W104 with conflicting token fails closed without draft_packet", () => {
  const packet = buildBatchOwnerScreenshotDraftPacketV1({
    plan: minimalPlan(["w10413645a"]),
    factsInput: parseBatchOwnerScreenshotFactsInputV1({ facts: [W10413645A_NESTED_TOKEN_CONFLICT] }),
    generated_at: "t",
  });
  const row = packet.rows[0]!;
  assert.equal(row.draft_packet, null);
  assert.ok(row.missing_owner_facts.includes(BATCH_OWNER_FACTS_TOKEN_CONFLICT_WITH_PLAN_V1));
  assert.equal(row.may_write_production_evidence, false);
  assert.equal(row.may_mutate, false);
});

test("token inheritance path keeps Layer 6 NOT_PROVEN", () => {
  const packet = buildBatchOwnerScreenshotDraftPacketV1({
    plan: minimalPlan(["w10413645a"]),
    factsInput: parseBatchOwnerScreenshotFactsInputV1({ facts: [W10413645A_NESTED_NO_TOKEN] }),
    generated_at: "t",
  });
  assert.equal(packet.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.equal(batchOwnerScreenshotDraftGrantsProductionWrite(packet), false);
});
