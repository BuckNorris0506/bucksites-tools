import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1 } from "./fridge-safe-link-owner-browser-proof-result-v1";
import {
  buildManufacturerRescueApplyPlanForSlugV1,
  buildManufacturerSafeLinkRescueApplyPlanFactoryPlansV1,
  MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_CONTRACT_V1,
  manufacturerSafeLinkRescueApplyPlanRelV1,
  RETAILER_LINKS_CSV_REL_V1,
  writeManufacturerSafeLinkRescueApplyPlanFactoryArtifactsV1,
} from "./manufacturer-safe-link-rescue-apply-plan-factory-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
  type ManufacturerRescueOrchestratorQueueRowV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";

const REPO_ROOT = process.cwd();

function baseQueueRow(
  overrides: Partial<ManufacturerRescueOrchestratorQueueRowV1>,
): ManufacturerRescueOrchestratorQueueRowV1 {
  return {
    filter_slug: "edr4rxd1",
    manufacturer_key: "everydrop_whirlpool",
    oem_part_token: "EDR4RXD1",
    cohort_lane: "RESCUE_SEARCH_PLACEHOLDER",
    in_fridge_rescue_queue: true,
    rescue_queue_rank: 1,
    census_rescue_priority_score: 100,
    orchestrator_priority_score: 900,
    expected_safe_coverage_signal: 200,
    existing_evidence_score: 10,
    browser_ready_state: "READY",
    owner_review_readiness: "READY",
    browser_truth_status: "PASS",
    repo_proven_official_target_url:
      "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html",
    adapter_discovery_url: null,
    adapter_discovery_provenance: "UNKNOWN",
    csv_primary_is_search_placeholder: true,
    blocked_reasons: [],
    recommended_next_action: "owner review",
    orchestrator_rank: 1,
    coverage_unlocked: false,
    ...overrides,
  };
}

function freshEdr4Proof() {
  return {
    contract: FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
    verdict: "PASS_BROWSER_PROOF",
    checked_at: "2026-06-20T12:00:00.000Z",
    slug: "edr4rxd1",
    oem_part_token: "EDR4RXD1",
    owner_proof_urls: [
      {
        url: "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html",
        path_type: "official_manufacturer_pdp",
        browser_proof_status: "PASS",
        proven_observations: ["PROVEN: Model: EDR4RXD1."],
      },
    ],
  };
}

function mockCsvForSlug(slug: string, searchUrl: string): string {
  return [
    "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at",
    `${slug},OEM parts catalog (keyword lookup),${searchUrl},true,0,oem-parts-catalog,,,`,
  ].join("\n");
}

test("no plan generated for missing browser proof", () => {
  const plan = buildManufacturerRescueApplyPlanForSlugV1({
    row: baseQueueRow({}),
    rootDir: REPO_ROOT,
    fileExists: () => false,
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  assert.equal(plan.plan_status, "BLOCKED_MISSING_BROWSER_PROOF");
  assert.equal(plan.proposed_csv_row, null);
});

test("no plan generated for stale browser proof", () => {
  const proof = freshEdr4Proof();
  proof.checked_at = "2026-05-01T12:00:00.000Z";

  const plan = buildManufacturerRescueApplyPlanForSlugV1({
    row: baseQueueRow({}),
    rootDir: REPO_ROOT,
    fileExists: (abs) => abs.endsWith("fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json"),
    readText: (abs) => {
      if (abs.endsWith("fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json")) {
        return JSON.stringify(proof);
      }
      throw new Error(`unexpected read: ${abs}`);
    },
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  assert.equal(plan.plan_status, "BLOCKED_STALE_BROWSER_PROOF");
  assert.equal(plan.proposed_csv_row, null);
});

test("no plan generated for unresolved confusion-family review", () => {
  const proof = freshEdr4Proof();
  const plan = buildManufacturerRescueApplyPlanForSlugV1({
    row: baseQueueRow({
      filter_slug: "wf3cb",
      manufacturer_key: "frigidaire",
      oem_part_token: "WF3CB",
      blocked_reasons: ["confusion_family_review_required"],
    }),
    rootDir: REPO_ROOT,
    fileExists: (abs) => abs.endsWith("fridge-safe-link-owner-browser-proof-result-wf3cb-v1.json"),
    readText: (abs) => {
      if (abs.endsWith("fridge-safe-link-owner-browser-proof-result-wf3cb-v1.json")) {
        return JSON.stringify({
          ...proof,
          slug: "wf3cb",
          oem_part_token: "WF3CB",
          owner_proof_urls: proof.owner_proof_urls,
        });
      }
      throw new Error(`unexpected read: ${abs}`);
    },
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  assert.equal(plan.plan_status, "BLOCKED_CONFUSION_FAMILY_REVIEW");
  assert.equal(plan.proposed_csv_row, null);
});

test("valid fresh proof fixture generates READY_FOR_OWNER_REVIEW plan", () => {
  const proof = freshEdr4Proof();
  const plan = buildManufacturerRescueApplyPlanForSlugV1({
    row: baseQueueRow({}),
    rootDir: REPO_ROOT,
    fileExists: (abs) =>
      abs.endsWith("fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json") ||
      abs.endsWith("retailer_links.csv"),
    readText: (abs) => {
      if (abs.endsWith("fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json")) {
        return JSON.stringify(proof);
      }
      if (abs.endsWith("retailer_links.csv")) {
        return mockCsvForSlug(
          "edr4rxd1",
          "https://www.whirlpoolparts.com/catalog.jsp?searchKeyword=EDR4RXD1",
        );
      }
      throw new Error(`unexpected read: ${abs}`);
    },
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  assert.equal(plan.plan_status, "READY_FOR_OWNER_REVIEW");
  assert.equal(plan.owner_approval_required, true);
  assert.equal(plan.mutation_authorized, false);
  assert.equal(plan.csv_apply_authorized, false);
  assert.equal(plan.readiness_gate_required_after_owner_approval, true);
  assert.ok(plan.proposed_csv_row?.affiliate_url?.includes("whirlpool.com"));
  assert.equal(plan.proposed_csv_row?.browser_truth_classification, "direct_buyable");
});

test("generated plan path matches Readiness Gate apply-plan discovery", () => {
  const rel = manufacturerSafeLinkRescueApplyPlanRelV1("edr4rxd1");
  assert.equal(
    rel,
    "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-edr4rxd1-v1.json",
  );

  const root = mkdtempSync(path.join(tmpdir(), "mfr-apply-plan-factory-"));
  const csvAbs = path.join(root, RETAILER_LINKS_CSV_REL_V1);
  mkdirSync(path.dirname(csvAbs), { recursive: true });
  writeFileSync(
    csvAbs,
    `${mockCsvForSlug("edr4rxd1", "https://www.whirlpoolparts.com/catalog.jsp?searchKeyword=EDR4RXD1")}\n`,
    "utf8",
  );
  const proof = freshEdr4Proof();
  const plan = buildManufacturerRescueApplyPlanForSlugV1({
    row: baseQueueRow({}),
    rootDir: root,
    fileExists: (abs) =>
      abs.endsWith("fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json") ||
      abs === csvAbs,
    readText: (abs) => {
      if (abs.endsWith("fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json")) {
        return JSON.stringify(proof);
      }
      if (abs === csvAbs) {
        return readFileSync(csvAbs, "utf8");
      }
      throw new Error(`unexpected read: ${abs}`);
    },
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  const factory = {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_CONTRACT_V1,
    read_only: true as const,
    data_mutation: false as const,
    mutation_authorized: false as const,
    csv_apply_authorized: false as const,
    supabase_mutation_authorized: false as const,
    browser_automation_authorized: false as const,
    coverage_unlocked: false as const,
    generated_at: "2026-06-26T12:00:00.000Z",
    source_command: "npm run buckparts:manufacturer-safe-link-rescue-apply-plan-factory" as const,
    orchestrator_contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    orchestrator_generated_at: "2026-06-26T12:00:00.000Z",
    browser_proof_max_age_days: 14,
    candidate_count: 1,
    ready_for_owner_review_count: 1,
    blocked_count: 0,
    apply_plans_written: [rel],
    slug_results: [],
    inspect_summary: {
      recommended_next_action: "review",
      readiness_gate_promotion_authority_note: "readiness gate sole authority",
    },
    proven_facts: [],
    unknown_facts: [],
  };
  writeManufacturerSafeLinkRescueApplyPlanFactoryArtifactsV1({
    rootDir: root,
    factory,
    plans: [plan],
  });
  assert.ok(existsSync(path.join(root, rel)));

  const readinessGateCandidateRels = [
    `data/fridge/batch-production/drafts/fridge-safe-link-edr4rxd1-apply-plan-proposal-v1.json`,
    rel,
    `data/fridge/batch-production/drafts/edr4rxd1-manufacturer-rescue-apply-plan-v1.json`,
  ];
  assert.ok(readinessGateCandidateRels.includes(rel));
});

test("default factory mode never mutates retailer_links.csv", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-apply-plan-factory-csv-"));
  const csvAbs = path.join(root, RETAILER_LINKS_CSV_REL_V1);
  mkdirSync(path.dirname(csvAbs), { recursive: true });
  const before = mockCsvForSlug(
    "edr4rxd1",
    "https://www.whirlpoolparts.com/catalog.jsp?searchKeyword=EDR4RXD1",
  );
  writeFileSync(csvAbs, `${before}\n`, "utf8");

  const { factory } = buildManufacturerSafeLinkRescueApplyPlanFactoryPlansV1({
    rootDir: REPO_ROOT,
    fileExists: (abs) => {
      if (abs === csvAbs) return true;
      return existsSync(abs);
    },
    readText: (abs) => {
      if (abs === csvAbs) return before;
      return readFileSync(abs, "utf8");
    },
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });

  assert.equal(factory.data_mutation, false);
  assert.equal(factory.csv_apply_authorized, false);
  assert.equal(readFileSync(csvAbs, "utf8"), `${before}\n`);
});

test("factory proven facts state Readiness Gate remains sole promotion authority", () => {
  const { factory } = buildManufacturerSafeLinkRescueApplyPlanFactoryPlansV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  assert.ok(
    factory.proven_facts.some((f) => f.includes("Readiness Gate remains sole READY_FOR_APPLY")),
  );
  assert.ok(
    factory.inspect_summary.readiness_gate_promotion_authority_note.includes("readiness_gate"),
  );
  assert.equal(
    factory.inspect_summary.readiness_gate_promotion_authority_note.includes("READY_FOR_APPLY"),
    true,
  );
});
