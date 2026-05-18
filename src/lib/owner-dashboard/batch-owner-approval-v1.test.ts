import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  BATCH_NON_AMAZON_PDP_QUEUE_ROW_ID_V1,
  BATCH_PRODUCTION_SOURCE_NON_AMAZON_PDP_CANDIDATES_V1,
} from "./batch-production-non-amazon-pdp-source-v1";
import { resolveBatchDraftReviewForOwnerApprovalV1 } from "./batch-production-lane-pipeline-v1";
import {
  BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1,
  type BatchEvidenceCollectionPlanV1,
} from "./batch-evidence-collection-plan-v1";
import {
  buildBatchOwnerScreenshotDraftPacketV1,
  type BatchOwnerScreenshotDraftPacketV1,
} from "./batch-owner-screenshot-draft-packet-v1";
import {
  BATCH_OWNER_APPROVAL_ACTIVE_DECISION_BEGIN_PREFIX_V1,
  BATCH_OWNER_APPROVAL_ACTIVE_DECISION_END_V1,
  BATCH_OWNER_APPROVAL_CHOOSE_ONE_SENTINEL_V1,
  batchOwnerApprovalPacketGrantsProductionWrite,
  buildBatchOwnerApprovalChecklistMarkdownV1,
  buildBatchOwnerApprovalPacketV1,
  compileBatchOwnerApprovalFromMarkdownV1,
  parseBatchOwnerApprovalDecisionsMarkdownV1,
} from "./batch-owner-approval-v1";
import {
  founderRegistryRowGrantsMutatingRepoAuthority,
  validateFounderDecisionRegistryRowV1,
} from "./founder-decision-registry-v1";
import {
  validateBatchOwnerApprovalChecklistOutputPathV1,
  validateBatchOwnerApprovalPacketOutputPathV1,
  validateBatchOwnerApprovalRegistryExportPathV1,
} from "./batch-owner-approval-write-v1";
import { OwnerScreenshotFactsDraftPathErrorV1 } from "./batch-owner-screenshot-facts-template-draft-write-v1";

const REPO_ROOT = process.cwd();

const NON_AMAZON_ROWS = [
  ["da97-08006b", "DA97-08006B"],
  ["da97-15217d", "DA97-15217D"],
  ["da29-00012b", "DA29-00012B"],
  ["adq75795101", "ADQ75795101"],
  ["rpwfe", "RPWFE"],
] as const;

function nonAmazonPlan(): BatchEvidenceCollectionPlanV1 {
  return {
    contract: BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    may_write_evidence: false,
    automation_input: false,
    generated_at: "t",
    source_review_contract: "batch_production_review_report_v1",
    source_review_generated_at: "t",
    plan_row_count: NON_AMAZON_ROWS.length,
    layer_6_founder_only_approval: "NOT_PROVEN",
    no_evidence_write_attestation: "x",
    rows: NON_AMAZON_ROWS.map(([row_id, token]) => ({
      row_id,
      token,
      slug: row_id,
      source_queue_row_id: BATCH_NON_AMAZON_PDP_QUEUE_ROW_ID_V1,
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

function fiveRowReadyDraftReview(): BatchOwnerScreenshotDraftPacketV1 {
  const facts = NON_AMAZON_ROWS.map(([row_id, token]) => ({
    row_id,
    token,
    filter_slug: row_id,
    screenshot_sources: [{ label: "agent", path: "", committed_to_repo: false }],
    page_kind: "product_detail_page" as const,
    token_visible_in_pdp_title: true,
    token_visible_elsewhere_on_page: true,
    seller_controlled_pdp_identity: true,
    buy_path_visible: true,
    stock_status: "in_stock",
    price_visible_usd: 99.99,
    oem_or_aftermarket: "oem_official" as const,
    relationship_notes: `Agent observation for ${token}`,
    canonical_url: `https://example.com/${row_id}`,
  }));
  return buildBatchOwnerScreenshotDraftPacketV1({
    plan: nonAmazonPlan(),
    factsInput: { facts },
    generated_at: "2026-05-17T12:00:00.000Z",
  });
}

function activeDecisionBlock(
  row_id: string,
  founder_decision: string,
  owner_note?: string,
): string {
  return [
    `${BATCH_OWNER_APPROVAL_ACTIVE_DECISION_BEGIN_PREFIX_V1}${row_id}`,
    `row_id: ${row_id}`,
    `founder_decision: ${founder_decision}`,
    owner_note != null ? `owner_note: ${owner_note}` : "owner_note:",
    BATCH_OWNER_APPROVAL_ACTIVE_DECISION_END_V1,
  ].join("\n");
}

const FILLED_DECISIONS_MD = NON_AMAZON_ROWS.map(([row_id]) =>
  [
    `## ${row_id} - TOKEN`,
    "",
    activeDecisionBlock(
      row_id,
      "approve_for_next_planning_only",
      "Approved for planning only after owner review.",
    ),
    "",
  ].join("\n"),
).join("\n---\n\n");

test("checklist markdown includes 5 owner-review-ready rows", () => {
  const review = fiveRowReadyDraftReview();
  const md = buildBatchOwnerApprovalChecklistMarkdownV1(review);
  assert.equal((md.match(/^## [a-z0-9-]+ -/gm) ?? []).length, 5);
  assert.match(md, /NOT_PROVEN/);
  assert.match(md, /does \*\*not\*\* authorize Supabase/);
  for (const [row_id] of NON_AMAZON_ROWS) {
    assert.match(md, new RegExp(row_id));
  }
});

test("parse decisions markdown and compile approval packet for 5 rows", () => {
  const review = fiveRowReadyDraftReview();
  const parsed = parseBatchOwnerApprovalDecisionsMarkdownV1(FILLED_DECISIONS_MD);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.decisions.length, 5);

  const { packet, compile_errors } = compileBatchOwnerApprovalFromMarkdownV1({
    draftReview: review,
    decisionsMarkdown: FILLED_DECISIONS_MD,
  });
  assert.equal(compile_errors.length, 0);
  assert.equal(packet.approval_row_count, 5);
  assert.equal(packet.may_mutate, false);
  assert.equal(packet.may_write_production_evidence, false);
  assert.equal(packet.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.equal(batchOwnerApprovalPacketGrantsProductionWrite(packet), false);
  assert.ok(packet.founder_decision_registry_export);
  assert.equal(packet.founder_decision_registry_export!.rows.length, 5);

  for (const row of packet.rows) {
    assert.equal(row.registry_validation_errors.length, 0);
    assert.ok(row.registry_row);
    assert.equal(row.registry_row!.allowed_next_scope, "read_only_agent");
    assert.equal(
      founderRegistryRowGrantsMutatingRepoAuthority(row.registry_row!, "2026-05-20T00:00:00.000Z"),
      false,
    );
    assert.ok(row.registry_row!.batch_production_owner_review_context_v1);
  }
});

test("approve_for_next_planning_only fails closed when draft not ready", () => {
  const review = fiveRowReadyDraftReview();
  const blocked = { ...review.rows[0]!, draft_ready_for_owner_review: false };
  const reviewBlocked = { ...review, rows: [blocked, ...review.rows.slice(1)] };
  const packet = buildBatchOwnerApprovalPacketV1({
    draftReview: reviewBlocked,
    decisions: [
      {
        row_id: blocked.row_id,
        founder_option_id: "approve_for_next_planning_only",
      },
    ],
  });
  assert.ok(packet.rows[0]!.registry_validation_errors.length > 0);
  assert.equal(packet.rows[0]!.registry_row, null);
});

test("path validators refuse production paths", () => {
  const forbidden = [
    ["packet", validateBatchOwnerApprovalPacketOutputPathV1, "data/evidence/x.json"],
    ["packet", validateBatchOwnerApprovalPacketOutputPathV1, "data/retailer_links/x.json"],
    ["checklist", validateBatchOwnerApprovalChecklistOutputPathV1, "src/x.md"],
    ["registry", validateBatchOwnerApprovalRegistryExportPathV1, "data/evidence/x.json"],
    ["registry", validateBatchOwnerApprovalRegistryExportPathV1, "scripts/x.json"],
  ] as const;
  for (const [, fn, p] of forbidden) {
    assert.throws(() => fn(REPO_ROOT, p), OwnerScreenshotFactsDraftPathErrorV1);
  }
  validateBatchOwnerApprovalRegistryExportPathV1(
    REPO_ROOT,
    "data/owner-decisions/batch-test-approval.json",
  );
  validateBatchOwnerApprovalPacketOutputPathV1(
    REPO_ROOT,
    "data/batch-production/drafts/batch-owner-approval.test.json",
  );
});

test("planning-seed approve_for_next_planning_only fails closed without agent facts", () => {
  const { draftReview } = resolveBatchDraftReviewForOwnerApprovalV1({
    source: BATCH_PRODUCTION_SOURCE_NON_AMAZON_PDP_CANDIDATES_V1,
    repoRoot: REPO_ROOT,
    deps: {
      readTextFile: (p) => readFileSync(p, "utf8"),
      listEvidenceFilenames: (dir) => {
        try {
          return readdirSync(dir);
        } catch {
          return [];
        }
      },
    },
    generated_at: "2026-05-17T12:00:00.000Z",
  });

  const packet = buildBatchOwnerApprovalPacketV1({
    draftReview,
    decisions: [
      {
        row_id: "da97-08006b",
        founder_option_id: "approve_for_next_planning_only",
      },
    ],
  });

  assert.equal(packet.may_mutate, false);
  assert.ok(packet.rows[0]!.registry_validation_errors.length > 0);
  assert.equal(packet.rows[0]!.registry_row, null);
});

test("unfilled _choose_one_ checklist fails compile with zero valid decisions", () => {
  const review = fiveRowReadyDraftReview();
  const md = buildBatchOwnerApprovalChecklistMarkdownV1(review);
  const parsed = parseBatchOwnerApprovalDecisionsMarkdownV1(md);
  assert.equal(parsed.decisions.length, 0);
  assert.ok(parsed.errors.length > 0);
  assert.match(parsed.errors.join("\n"), new RegExp(BATCH_OWNER_APPROVAL_CHOOSE_ONE_SENTINEL_V1));

  const { compile_errors, packet } = compileBatchOwnerApprovalFromMarkdownV1({
    draftReview: review,
    decisionsMarkdown: md,
  });
  assert.ok(compile_errors.length > 0);
  assert.equal(packet.founder_decision_registry_export, null);
});

test("fenced example founder_decision lines outside active block are ignored", () => {
  const md = [
    "## da97-08006b - DA97-08006B",
    "",
    "```text",
    "founder_decision: defer",
    "founder_decision: reject",
    "owner_note: (optional — one sentence)",
    "```",
    "",
    activeDecisionBlock("da97-08006b", "reject", "Real owner note."),
    "",
  ].join("\n");

  const parsed = parseBatchOwnerApprovalDecisionsMarkdownV1(md);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.decisions.length, 1);
  assert.equal(parsed.decisions[0]!.founder_option_id, "reject");
  assert.equal(parsed.decisions[0]!.owner_note, "Real owner note.");
});

test("placeholder owner_note in active block is normalized to empty", () => {
  const md = [
    "## rpwfe - RPWFE",
    "",
    activeDecisionBlock("rpwfe", "defer", "(optional — one sentence)"),
    "",
  ].join("\n");

  const parsed = parseBatchOwnerApprovalDecisionsMarkdownV1(md);
  assert.equal(parsed.decisions.length, 1);
  assert.equal(parsed.decisions[0]!.owner_note, undefined);
});

test("active defer compiles for planning-seed row", () => {
  const { draftReview } = resolveBatchDraftReviewForOwnerApprovalV1({
    source: BATCH_PRODUCTION_SOURCE_NON_AMAZON_PDP_CANDIDATES_V1,
    repoRoot: REPO_ROOT,
    deps: {
      readTextFile: (p) => readFileSync(p, "utf8"),
      listEvidenceFilenames: (dir) => {
        try {
          return readdirSync(dir);
        } catch {
          return [];
        }
      },
    },
    generated_at: "2026-05-17T12:00:00.000Z",
  });

  const md = [
    "## da97-08006b - DA97-08006B",
    "",
    activeDecisionBlock("da97-08006b", "defer"),
    "",
  ].join("\n");

  const { compile_errors, packet } = compileBatchOwnerApprovalFromMarkdownV1({
    draftReview,
    decisionsMarkdown: md,
    generated_at: "2026-05-17T12:00:00.000Z",
    decided_at: "2026-05-17T12:00:00.000Z",
  });
  assert.ok(compile_errors.length > 0);
  assert.match(compile_errors.join("\n"), /expected 5 valid founder decisions/);
  assert.equal(packet.founder_decision_registry_export, null);

  const allDeferMd = draftReview.rows
    .map(
      (row) =>
        `## ${row.row_id} - ${row.token ?? row.row_id}\n\n${activeDecisionBlock(row.row_id, "defer")}\n`,
    )
    .join("\n---\n\n");

  const compiled = compileBatchOwnerApprovalFromMarkdownV1({
    draftReview,
    decisionsMarkdown: allDeferMd,
    generated_at: "2026-05-17T12:00:00.000Z",
    decided_at: "2026-05-17T12:00:00.000Z",
  });
  assert.equal(compiled.compile_errors.length, 0);
  assert.equal(compiled.packet.rows[0]!.founder_option_id, "defer");
  assert.ok(compiled.packet.founder_decision_registry_export);
  assert.equal(compiled.packet.founder_decision_registry_export!.rows.length, 5);
});

test("registry row rejects owner_mutation_approved with batch context", () => {
  const review = fiveRowReadyDraftReview();
  const packet = buildBatchOwnerApprovalPacketV1({
    draftReview: review,
    decisions: [{ row_id: "da97-08006b", founder_option_id: "approve_for_next_planning_only" }],
  });
  const row = packet.rows[0]!.registry_row!;
  const tampered = { ...row, allowed_next_scope: "owner_mutation_approved" as const, evidence_required_before_mutation: true, owner_note: "mutation attempt" };
  const v = validateFounderDecisionRegistryRowV1(tampered);
  assert.equal(v.ok, false);
});
