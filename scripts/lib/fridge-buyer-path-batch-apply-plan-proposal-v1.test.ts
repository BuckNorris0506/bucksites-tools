import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import type { FridgeBuyerPathBatchApprovalReportV1 } from "./fridge-buyer-path-batch-approval-v1";
import type { FridgeBuyerPathBatchProposalReportV1 } from "./fridge-buyer-path-batch-proposal-v1";
import {
  assertFridgeApplyPlanOutPathAllowedV1,
  buildFridgeApplyPlanArtifactRelPathV1,
  buildFridgeBuyerPathBatchApplyPlanProposalV1,
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1,
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
} from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import {
  FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1,
  FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_STAGE_V1,
} from "./fridge-buyer-path-batch-run-registry-v1";

const REPO_ROOT = process.cwd();
const FRIDGE_BATCH_ID = "fridge-buyer-path-batch-proposal-v1-0fec4a7b623a";
const SLUGS = [
  "4396710",
  "4396841",
  "46-9002",
  "8171413",
  "da29-00019a",
  "da97-15217d",
  "edr1rxd1",
  "edr2rxd1",
  "lt1000p",
  "lt1000pc",
  "lt600p",
  "lt700p",
  "lt800p",
  "mdj64844601",
];

const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/fridge-buyer-path-batch-apply-plan-proposal-v1.ts"),
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/report-fridge-buyer-path-batch-apply-plan-proposal-v1.ts"),
  "utf8",
);

function proposalRow(slug: string) {
  return {
    proposal_rank: 1,
    slug,
    oem_token: slug.toUpperCase(),
    brand: "whirlpool",
    evidence_artifact_path: `data/evidence/amazon-${slug.toLowerCase()}-live-outcome.2026-05-04.json`,
    destination_url: "https://www.amazon.com/dp/B087PDLZL9",
    affiliate_url: "https://www.amazon.com/dp/B087PDLZL9?tag=buckparts20-20",
    retailer_key: "amazon",
    retailer_name: "Amazon",
    browser_truth_classification: "direct_buyable",
    committed_buyer_path_status: "SEARCH_PLACEHOLDER",
    apply_mutation_authorized: false as const,
    csv_apply_authorized: false as const,
  };
}

function proposalFixture(
  rows = SLUGS.map(proposalRow),
): FridgeBuyerPathBatchProposalReportV1 {
  return {
    contract: "fridge_buyer_path_batch_proposal_v1",
    report_name: "fridge_buyer_path_batch_proposal_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-05-31T12:00:00.000Z",
    source_packet_contract: "fridge_buyer_path_owner_review_packet_v1",
    source_packet_report: "fridge_buyer_path_owner_review_packet_v1",
    wedge: "refrigerator_water",
    proposed_batch_id: FRIDGE_BATCH_ID,
    proposed_run_id: FRIDGE_BATCH_ID,
    proposed_row_count: rows.length,
    proposed_rows: rows,
    owner_approval_required: true,
    apply_authorization_present: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    formal_batch_exists: false,
    formal_batch_registry_path: null,
    required_pre_apply_checks: [],
    forbidden_mutations: [],
    recommended_next_action: "x",
    proven_facts: [],
    unknown_facts: [],
  };
}

function approvalFixture(): FridgeBuyerPathBatchApprovalReportV1 {
  return {
    contract: "fridge_buyer_path_batch_approval_v1",
    report_name: "fridge_buyer_path_batch_approval_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-05-31T12:00:00.000Z",
    source_proposal_contract: "fridge_buyer_path_batch_proposal_v1",
    proposed_batch_id: FRIDGE_BATCH_ID,
    proposed_row_count: SLUGS.length,
    proposed_slugs: SLUGS,
    approval_status: "owner_approved_for_next_planning_only",
    owner_approval_required: true,
    apply_authorization_present: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    formal_batch_exists: false,
    founder_decision_options: [],
    checklist_markdown: "",
    recommended_next_action: "x",
    proven_facts: [],
    unknown_facts: [],
  };
}

function registryDoc() {
  return {
    contract: FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    run_id: "fridge-buyer-path-batch-run-v1-0fec4a7b623a",
    wedge: "refrigerator_water",
    stage: FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_STAGE_V1,
    closeout_complete: false,
    proposed_batch_id: FRIDGE_BATCH_ID,
    proposed_row_count: SLUGS.length,
    proposed_slugs: SLUGS,
    owner_approval_artifact_rel_path: "data/owner-decisions/fridge-buyer-path-batch-approval-v1.json",
    source_proposal_contract: "fridge_buyer_path_batch_proposal_v1",
    created_at: "2026-05-31T12:00:00.000Z",
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
  };
}

function writeFixtureTree(dir: string, opts: {
  registry?: boolean;
  registryMalformed?: boolean;
  csvRows?: string;
  evidenceWithCommittedLiveRow?: boolean;
  evidenceMissingCommitted?: boolean;
}) {
  const registryRel = buildFridgeApplyPlanArtifactRelPathV1(FRIDGE_BATCH_ID).replace(
    /^data\/fridge\/batch-production\/apply-plans\//,
    "",
  );
  void registryRel;

  const runRegistryRel = `data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json`;
  if (opts.registryMalformed) {
    const abs = path.join(dir, runRegistryRel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify({ contract: "bad", closeout_complete: true }), "utf8");
  } else if (opts.registry !== false) {
    const abs = path.join(dir, runRegistryRel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(registryDoc(), null, 2)}\n`, "utf8");
  }

  const csvAbs = path.join(dir, "data/retailer_links.csv");
  mkdirSync(path.dirname(csvAbs), { recursive: true });
  const header =
    "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\n";
  const csvBody =
    opts.csvRows ??
    SLUGS.map(
      (slug) =>
        `${slug},OEM parts catalog (keyword lookup),https://www.repairclinic.com/Search?SearchTerm=${slug},true,0,oem-parts-catalog,,,`,
    ).join("\n");
  writeFileSync(csvAbs, `${header}${csvBody}\n`, "utf8");

  for (const slug of SLUGS) {
    const evidenceRel = `data/evidence/amazon-${slug.toLowerCase()}-live-outcome.2026-05-04.json`;
    const evidenceAbs = path.join(dir, evidenceRel);
    mkdirSync(path.dirname(evidenceAbs), { recursive: true });
    const payload =
      opts.evidenceMissingCommitted === true
        ? { verdict: "LIVE_OUTCOME_RECORDED" }
        : {
            verdict: "LIVE_OUTCOME_RECORDED",
            committed_live_row: {
              destination_url: "https://www.amazon.com/dp/B087PDLZL9",
              affiliate_url: "https://www.amazon.com/dp/B087PDLZL9?tag=buckparts20-20",
            },
          };
    writeFileSync(evidenceAbs, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
}

test("buildFridgeBuyerPathBatchApplyPlanProposalV1 on repo when planning registry exists", () => {
  const registryAbs = path.join(
    REPO_ROOT,
    "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
  );
  if (!existsSync(registryAbs)) return;

  const report = buildFridgeBuyerPathBatchApplyPlanProposalV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.apply_mutation_authorized, false);
  assert.equal(report.csv_apply_authorized, false);
  if (report.plan_status === "READY_FOR_OWNER_REVIEW") {
    assert.equal(report.planned_change_count, 14);
    assert.deepEqual(
      report.planned_changes.map((row) => row.slug).sort(),
      [...SLUGS].sort(),
    );
    for (const change of report.planned_changes) {
      assert.equal(change.action, FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1);
      assert.equal(change.mutation_authorized, false);
    }
  }
});

test("temp fixture: READY_FOR_OWNER_REVIEW with planned_changes limited to batch slugs", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fridge-apply-plan-"));
  writeFixtureTree(dir, {});

  const report = buildFridgeBuyerPathBatchApplyPlanProposalV1({
    rootDir: dir,
    buildProposal: () => proposalFixture(),
    buildApproval: () => approvalFixture(),
  });

  assert.equal(report.plan_status, "READY_FOR_OWNER_REVIEW");
  assert.equal(report.planned_change_count, SLUGS.length);
  assert.equal(report.blocked_rows.length, 0);
  assert.equal(report.apply_mutation_authorized, false);
});

test("missing run-registry blocks plan", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fridge-apply-plan-no-reg-"));
  writeFixtureTree(dir, { registry: false });

  const report = buildFridgeBuyerPathBatchApplyPlanProposalV1({
    rootDir: dir,
    buildProposal: () => proposalFixture(),
    buildApproval: () => approvalFixture(),
  });

  assert.equal(report.plan_status, "BLOCKED");
  assert.equal(report.planned_change_count, 0);
  assert.ok(report.plan_status_reasons.some((r) => r.includes("PROVEN_PLANNING_RUN_REGISTRY")));
});

test("malformed run-registry blocks plan", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fridge-apply-plan-bad-reg-"));
  writeFixtureTree(dir, { registryMalformed: true });

  const report = buildFridgeBuyerPathBatchApplyPlanProposalV1({
    rootDir: dir,
    buildProposal: () => proposalFixture(),
    buildApproval: () => approvalFixture(),
  });

  assert.equal(report.plan_status, "BLOCKED");
  assert.equal(report.planned_change_count, 0);
});

test("missing committed_live_row blocks row", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fridge-apply-plan-no-clr-"));
  writeFixtureTree(dir, { evidenceMissingCommitted: true });

  const report = buildFridgeBuyerPathBatchApplyPlanProposalV1({
    rootDir: dir,
    buildProposal: () => proposalFixture(),
    buildApproval: () => approvalFixture(),
  });

  assert.equal(report.plan_status, "BLOCKED");
  assert.equal(report.planned_change_count, 0);
  assert.ok(report.blocked_rows.every((row) => row.blockers.some((b) => b.includes("committed_live_row"))));
});

test("missing destination_url blocks row", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fridge-apply-plan-no-dest-"));
  writeFixtureTree(dir, {});
  const rows = SLUGS.map(proposalRow);
  rows[0] = { ...rows[0]!, destination_url: "" };

  const report = buildFridgeBuyerPathBatchApplyPlanProposalV1({
    rootDir: dir,
    buildProposal: () => proposalFixture(rows),
    buildApproval: () => approvalFixture(),
  });

  assert.equal(report.plan_status, "BLOCKED");
  assert.equal(report.blocked_rows[0]?.slug, rows[0]!.slug);
});

test("missing affiliate_url blocks row", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fridge-apply-plan-no-aff-"));
  writeFixtureTree(dir, {});
  const rows = SLUGS.map(proposalRow);
  rows[0] = { ...rows[0]!, affiliate_url: "" };

  const report = buildFridgeBuyerPathBatchApplyPlanProposalV1({
    rootDir: dir,
    buildProposal: () => proposalFixture(rows),
    buildApproval: () => approvalFixture(),
  });

  assert.equal(report.plan_status, "BLOCKED");
  assert.ok(report.blocked_rows[0]?.blockers.some((b) => b.includes("affiliate_url")));
});

test("missing committed CSV row blocks row", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fridge-apply-plan-no-csv-"));
  writeFixtureTree(dir, { csvRows: "lt1000p,OEM,https://example.com,true,0,oem-parts-catalog,,," });

  const report = buildFridgeBuyerPathBatchApplyPlanProposalV1({
    rootDir: dir,
    buildProposal: () => proposalFixture(),
    buildApproval: () => approvalFixture(),
  });

  assert.equal(report.plan_status, "BLOCKED");
  assert.ok(report.blocked_rows.length > 0);
});

test("canonical --plan-out path guard", () => {
  const expected = buildFridgeApplyPlanArtifactRelPathV1(FRIDGE_BATCH_ID);
  assert.doesNotThrow(() => assertFridgeApplyPlanOutPathAllowedV1(expected, REPO_ROOT));
  assert.throws(() => assertFridgeApplyPlanOutPathAllowedV1("data/evidence/plan.json", REPO_ROOT));
  assert.equal(
    expected,
    "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json",
  );
});

test("sources avoid forbidden product/CSV/Supabase/Netlify writes in lib", () => {
  assert.ok(!LIB_SOURCE.includes("writeFileSync"));
  assert.ok(!LIB_SOURCE.includes("mkdirSync"));
  assert.ok(!/from ["'].*supabase/i.test(LIB_SOURCE));
  assert.ok(!LIB_SOURCE.includes("@netlify"));
  assert.ok(REPORT_SOURCE.includes("--plan-out"));
});
