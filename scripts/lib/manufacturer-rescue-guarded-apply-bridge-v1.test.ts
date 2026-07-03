import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1,
} from "./manufacturer-safe-link-rescue-apply-plan-factory-v1";
import {
  assessManufacturerRescueGuardedApplyBridgePreconditionsV1,
  buildManufacturerRescueGuardedApplyBridgeCloseoutV1,
  buildManufacturerRescueUniversalExecutionPlanV1,
  listManufacturerRescueGuardedApplyBridgeSlugIndexedCloseoutRelsV1,
  MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CLOSEOUT_JSON_REL_V1,
  MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CONTRACT_V1,
  manufacturerRescueGuardedApplyBridgeCloseoutSlugRelV1,
  parseManufacturerRescueGuardedApplyBridgeCliArgsV1,
  runManufacturerRescueGuardedApplyBridgeV1,
  writeManufacturerRescueGuardedApplyBridgeCloseoutArtifactsV1,
} from "./manufacturer-rescue-guarded-apply-bridge-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1,
} from "./manufacturer-safe-link-rescue-readiness-gate-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
} from "./manufacturer-safe-link-rescue-runner-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";
import { bindArtifactsAtHashesV1 } from "./truth-ledger-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1 } from "./universal-batch-lifecycle-guarded-csv-apply-executor-v1";

const REPO_ROOT = process.cwd();
const SLUG = "edr4rxd1";
const NOW = () => new Date("2026-06-29T12:00:00.000Z");

function readyChecks() {
  return [
    "browser_proof_exists",
    "browser_proof_fresh",
    "apply_plan_exists",
    "owner_approval_exists",
    "owner_apply_lane_eligible",
    "wrong_family_safe",
    "direct_buyable_exact_token_safe",
    "no_unresolved_blockers",
  ].map((check_id) => ({ check_id, status: "PASS" as const, notes: "test" }));
}

function mockApplyPlan() {
  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    generated_at: NOW().toISOString(),
    source_command: "npm run buckparts:manufacturer-safe-link-rescue-apply-plan-factory",
    filter_slug: SLUG,
    manufacturer_key: "everydrop_whirlpool",
    oem_part_token: "EDR4RXD1",
    plan_status: "READY_FOR_OWNER_REVIEW",
    owner_approval_required: true,
    readiness_gate_required_after_owner_approval: true,
    proof_artifact_path: `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-${SLUG}-v1.json`,
    browser_proof_checked_at: NOW().toISOString(),
    official_destination_url:
      "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html",
    retailer_key: "oem-parts-catalog",
    retailer_slug: "oem-parts-catalog",
    browser_truth_classification: "direct_buyable" as const,
    exact_token_evidence: { mode: "identity_blob_includes" as const, proven: true, notes: "test" },
    wrong_family_evidence: {
      blocked: false,
      forbidden_tokens_checked: [],
      detected_forbidden_tokens: [],
      notes: "ok",
    },
    current_csv_row: {
      filter_slug: SLUG,
      retailer_name: "OEM parts catalog (keyword lookup)",
      affiliate_url: "https://www.whirlpoolparts.com/catalog.jsp?searchKeyword=EDR4RXD1",
      is_primary: true,
      sort_order: "0",
      retailer_key: "oem-parts-catalog",
      browser_truth_classification: null,
      browser_truth_notes: null,
      browser_truth_checked_at: null,
    },
    proposed_csv_row: {
      filter_slug: SLUG,
      retailer_name: "Whirlpool",
      affiliate_url:
        "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html",
      is_primary: true,
      sort_order: "0",
      retailer_key: "oem-parts-catalog",
      browser_truth_classification: "direct_buyable",
      browser_truth_notes: "Manufacturer rescue apply plan v1",
      browser_truth_checked_at: NOW().toISOString(),
      customer_visible_label: "BuckParts Verified Link" as const,
      label_subtype: "official_manufacturer_official_whirlpool",
    },
    blockers: [],
    proven_facts: [],
    unknown_facts: [],
  };
}

function seedBridgeFixtures(root: string): void {
  const applyPlanRel = `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-${SLUG}-v1.json`;
  const officialUrl =
    "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html";
  const generatedAt = NOW().toISOString();
  const gate = {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    generated_at: generatedAt,
    orchestrator_generated_at: generatedAt,
    ready_for_apply_slug: SLUG,
    ready_for_apply_count: 1,
    candidates: [
      {
        filter_slug: SLUG,
        manufacturer_key: "everydrop_whirlpool",
        oem_part_token: "EDR4RXD1",
        readiness_status: "READY_FOR_APPLY",
        ready_for_apply: true,
        director_value_score: 1200,
        checks: readyChecks(),
        blocking_reasons: [],
        source_paths_read: [applyPlanRel],
      },
    ],
    top_pending_work_item: null,
    readiness_summary: { by_status: {}, ready_for_apply_slugs: [SLUG] },
    inspect_summary: { recommended_next_action: "apply" },
    proven_facts: [],
    unknown_facts: [],
  };
  const runner = {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    generated_at: generatedAt,
    ready_for_apply_slug: SLUG,
    slug_states: [],
    proven_facts: [],
    unknown_facts: [],
  };

  writeJson(root, "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-readiness-gate-v1.json", gate);
  writeJson(root, "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-runner-v1.json", runner);
  writeJson(root, applyPlanRel, mockApplyPlan());

  const evidenceRel =
    "data/evidence/whirlpool-edr4rxd1-official-owner-browser-proof-evidence.2026-06-28.json";

  const csv = [
    "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at",
    `${SLUG},OEM parts catalog (keyword lookup),https://www.whirlpoolparts.com/catalog.jsp?searchKeyword=EDR4RXD1,true,0,oem-parts-catalog,,,`,
  ].join("\n");
  writeText(root, "data/retailer_links.csv", `${csv}\n`);

  for (const rel of [
    "data/filters.csv",
    "data/fridge/batch-production/drafts/fridge-safe-link-rescue-owner-review-v1.json",
  ]) {
    const src = path.join(REPO_ROOT, rel);
    if (!existsSync(src)) continue;
    writeText(root, rel, readFileSync(src, "utf8"));
  }

  writeJson(root, "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-orchestrator-v1.json", {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    generated_at: generatedAt,
    unified_rescue_queue: [
      {
        filter_slug: SLUG,
        manufacturer_key: "everydrop_whirlpool",
        oem_part_token: "EDR4RXD1",
        browser_truth_status: "PASS",
        repo_proven_official_target_url: officialUrl,
        blocked_reasons: [],
      },
    ],
  });

  writeJson(root, `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-${SLUG}-v1.json`, {
    contract: "fridge_safe_link_owner_browser_proof_result_v1",
    verdict: "PASS_BROWSER_PROOF",
    checked_at: "2026-06-28T12:00:00.000Z",
    slug: SLUG,
    owner_proof_urls: [
      {
        url: officialUrl,
        path_type: "official_manufacturer_accessory_pdp",
        browser_proof_status: "PASS",
      },
    ],
  });

  writeJson(root, evidenceRel, {
    verdict: "EXACT_PDP_PROVEN_FROM_OWNER_BROWSER",
    generated_at: "2026-06-28T12:00:00.000Z",
    product_attribution: "oem_official",
    primary_proof_track: {
      canonical_url: officialUrl,
      path_type: "official_manufacturer_pdp",
    },
    excluded_evidence_rel_paths: [
      "data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json",
    ],
  });

  const bound_artifacts_v1 = bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: [
      { artifact_rel_path: applyPlanRel, entry_type: "apply_plan" },
      { artifact_rel_path: evidenceRel, entry_type: "evidence" },
    ],
  });

  writeJson(root, "data/owner-decisions/manufacturer-rescue-edr4rxd1-apply-v1.json", {
    contract: "founder_decision_registry_v1",
    rows: [
      {
        decision_id: "manufacturer_rescue_edr4rxd1_apply_v1",
        source_queue_row_id: "queue-manufacturer-rescue-edr4rxd1",
        source_decision_packet_id: "manufacturer_rescue_owner_approval_packet_v1",
        decided_at: "2026-06-29T10:00:00.000Z",
        decision_status: "approved",
        allowed_next_scope: "owner_mutation_approved",
        owner_note: "Approved guarded CSV apply for edr4rxd1 manufacturer rescue plan.",
        evidence_required_before_mutation: true,
        expires_at: "2027-06-01T00:00:00.000Z",
        prohibited_actions_still_apply: [
          "Do not mutate compatibility_mappings.csv from this approval row alone.",
          "Do not auto-approve browser proof or bypass Readiness Gate.",
          "This approval authorizes guarded CSV apply only via manufacturer rescue bridge.",
        ],
        edr4rxd1_apply_context_v1: {
          target_slug: SLUG,
          apply_plan_rel_path: applyPlanRel,
          primary_evidence_rel_path: evidenceRel,
          official_destination_url: officialUrl,
        },
        bound_artifacts_v1,
      },
    ],
  });
}

function writeJson(root: string, rel: string, doc: unknown): void {
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(doc, null, 2));
}

function writeText(root: string, rel: string, text: string): void {
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text);
}

test("buildManufacturerRescueUniversalExecutionPlanV1 emits single-row universal execution plan", () => {
  const applyPlan = mockApplyPlan();
  const built = buildManufacturerRescueUniversalExecutionPlanV1({
    applyPlan,
    applyPlanRelPath: `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-${SLUG}-v1.json`,
    now: NOW,
  });
  assert.equal(built.execution_plan.contract, UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1);
  assert.equal(built.execution_plan.planned_change_count, 1);
  assert.equal(built.execution_plan.row_patch_preview.length, 1);
  assert.equal(built.execution_plan.row_patch_preview[0]?.slug, SLUG);
  assert.equal(built.execution_plan.row_patch_preview[0]?.after_row.browser_truth_classification, "direct_buyable");
});

test("assessManufacturerRescueGuardedApplyBridgePreconditionsV1 blocks without readiness gate", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-bridge-pre-"));
  const result = assessManufacturerRescueGuardedApplyBridgePreconditionsV1({ rootDir: root, now: NOW });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.some((b) => b.includes("readiness_gate_artifact_missing")));
});

test("runManufacturerRescueGuardedApplyBridgeV1 dry-run ready with seeded fixtures", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-bridge-dry-"));
  seedBridgeFixtures(root);

  const report = runManufacturerRescueGuardedApplyBridgeV1({ rootDir: root, now: NOW, writeCsv: false });
  assert.equal(report.contract, MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CONTRACT_V1);
  assert.equal(report.bridge_status, "DRY_RUN_READY", report.blockers.join("; "));
  assert.equal(report.ready_slug, SLUG);
  assert.equal(report.write_csv_applied, false);
  assert.equal(report.data_mutation, false);
  assert.ok(report.execution_plan_artifact_rel_path?.includes("manufacturer-rescue-guarded-apply-execution-plan"));
  assert.equal(
    report.guarded_executor_report?.contract,
    UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1,
  );
  assert.equal(report.guarded_executor_report?.apply_executor_ready, true);
  assert.ok(existsSync(path.join(root, MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CLOSEOUT_JSON_REL_V1)));
  assert.equal(
    existsSync(path.join(root, manufacturerRescueGuardedApplyBridgeCloseoutSlugRelV1(SLUG))),
    false,
  );
});

test("runManufacturerRescueGuardedApplyBridgeV1 write-csv applies single slug and refreshes chain", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-bridge-write-"));
  seedBridgeFixtures(root);

  const report = runManufacturerRescueGuardedApplyBridgeV1({ rootDir: root, now: NOW, writeCsv: true });
  assert.equal(report.bridge_status, "APPLIED");
  assert.equal(report.write_csv_applied, true);
  assert.equal(report.data_mutation, true);

  const csv = readFileSync(path.join(root, "data/retailer_links.csv"), "utf8");
  assert.ok(csv.includes("whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html"));
  assert.ok(csv.includes("direct_buyable"));

  const closeout = JSON.parse(
    readFileSync(path.join(root, MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CLOSEOUT_JSON_REL_V1), "utf8"),
  ) as { new_page_classification: string; write_csv_applied: boolean; post_apply_refresh_ran: boolean };
  assert.equal(closeout.write_csv_applied, true);
  assert.equal(closeout.post_apply_refresh_ran, true);
  assert.equal(closeout.new_page_classification, "SAFE_BUYER_PATH_PROVEN");

  const slugCloseoutPath = path.join(root, manufacturerRescueGuardedApplyBridgeCloseoutSlugRelV1(SLUG));
  assert.ok(existsSync(slugCloseoutPath));
  const slugCloseout = JSON.parse(readFileSync(slugCloseoutPath, "utf8")) as {
    filter_slug: string;
    closeout_durability_tier: string;
    bridge_status: string;
  };
  assert.equal(slugCloseout.filter_slug, SLUG);
  assert.equal(slugCloseout.closeout_durability_tier, "slug_indexed");
  assert.equal(slugCloseout.bridge_status, "APPLIED");
});

test("writeManufacturerRescueGuardedApplyBridgeCloseoutArtifactsV1 preserves prior slug-indexed closeouts", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-bridge-closeout-durability-"));
  const now = NOW;
  const baseCloseoutArgs = {
    bridge_status: "APPLIED" as const,
    write_csv_applied: true,
    census_before: null,
    census_after: null,
    customer_closure_before: null,
    customer_closure_after: null,
    execution_ledger: { entries: [], entry_count: 0 },
    execution_plan_rel_path: "data/fridge/batch-production/apply-execution-plans/plan-a.json",
    apply_plan_rel_path: "data/fridge/batch-production/drafts/plan-a.json",
    guarded_executor: null,
    post_apply_refresh_ran: true,
    now,
  };

  const edr3Closeout = buildManufacturerRescueGuardedApplyBridgeCloseoutV1({
    ...baseCloseoutArgs,
    slug: "edr3rxd1",
    execution_plan_rel_path:
      "data/fridge/batch-production/apply-execution-plans/manufacturer-rescue-guarded-apply-execution-plan-edr3rxd1-v1-fc6a449d5957.json",
    apply_plan_rel_path: "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-edr3rxd1-v1.json",
  });
  writeManufacturerRescueGuardedApplyBridgeCloseoutArtifactsV1({
    rootDir: root,
    slug: "edr3rxd1",
    closeout: edr3Closeout,
  });

  const ultrawfCloseout = buildManufacturerRescueGuardedApplyBridgeCloseoutV1({
    ...baseCloseoutArgs,
    slug: "ultrawf",
    execution_plan_rel_path:
      "data/fridge/batch-production/apply-execution-plans/manufacturer-rescue-guarded-apply-execution-plan-ultrawf-v1-a6a87198586f.json",
    apply_plan_rel_path: "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-ultrawf-v1.json",
  });
  writeManufacturerRescueGuardedApplyBridgeCloseoutArtifactsV1({
    rootDir: root,
    slug: "ultrawf",
    closeout: ultrawfCloseout,
  });

  const edr3Path = path.join(root, manufacturerRescueGuardedApplyBridgeCloseoutSlugRelV1("edr3rxd1"));
  const ultrawfPath = path.join(root, manufacturerRescueGuardedApplyBridgeCloseoutSlugRelV1("ultrawf"));
  assert.ok(existsSync(edr3Path));
  assert.ok(existsSync(ultrawfPath));

  const edr3Persisted = JSON.parse(readFileSync(edr3Path, "utf8")) as { filter_slug: string };
  const ultrawfPersisted = JSON.parse(readFileSync(ultrawfPath, "utf8")) as { filter_slug: string };
  assert.equal(edr3Persisted.filter_slug, "edr3rxd1");
  assert.equal(ultrawfPersisted.filter_slug, "ultrawf");

  const catalog = listManufacturerRescueGuardedApplyBridgeSlugIndexedCloseoutRelsV1({ rootDir: root });
  assert.equal(catalog.length, 2);
  assert.ok(catalog.includes(manufacturerRescueGuardedApplyBridgeCloseoutSlugRelV1("edr3rxd1")));
  assert.ok(catalog.includes(manufacturerRescueGuardedApplyBridgeCloseoutSlugRelV1("ultrawf")));
});

test("live repo bridge is blocked without READY_FOR_APPLY readiness gate", () => {
  const report = runManufacturerRescueGuardedApplyBridgeV1({ rootDir: REPO_ROOT, now: NOW, writeCsv: false });
  assert.equal(report.bridge_status, "BLOCKED");
  assert.equal(report.write_csv_applied, false);
});

function seedMultiReadySlugFixtures(root: string): {
  edr3Url: string;
  ultrawfUrl: string;
} {
  const edr3 = "edr3rxd1";
  const ultra = "ultrawf";
  const edr3Url =
    "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-3.edr3rxd1.html";
  const ultrawfUrl =
    "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/ULTRAWF/1534529";
  const generatedAt = NOW().toISOString();

  const candidate = (slug: string, manufacturer_key: string, token: string, url: string) => ({
    filter_slug: slug,
    manufacturer_key,
    oem_part_token: token,
    readiness_status: "READY_FOR_APPLY" as const,
    ready_for_apply: true,
    director_value_score: slug === edr3 ? 1434 : 1320,
    checks: readyChecks(),
    blocking_reasons: [] as string[],
    source_paths_read: [
      `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-${slug}-v1.json`,
    ],
  });

  writeJson(root, "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-readiness-gate-v1.json", {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    generated_at: generatedAt,
    orchestrator_generated_at: generatedAt,
    ready_for_apply_slug: edr3,
    ready_for_apply_count: 2,
    candidates: [
      candidate(edr3, "everydrop_whirlpool", "EDR3RXD1", edr3Url),
      candidate(ultra, "frigidaire", "ULTRAWF", ultrawfUrl),
    ],
    top_pending_work_item: null,
    readiness_summary: { by_status: {}, ready_for_apply_slugs: [edr3, ultra] },
    inspect_summary: { recommended_next_action: "apply" },
    proven_facts: [],
    unknown_facts: [],
  });

  writeJson(root, "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-runner-v1.json", {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    generated_at: generatedAt,
    ready_for_apply_slug: edr3,
    slug_states: [],
    proven_facts: [],
    unknown_facts: [],
  });

  writeJson(root, "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-orchestrator-v1.json", {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    generated_at: generatedAt,
    unified_rescue_queue: [
      {
        filter_slug: edr3,
        manufacturer_key: "everydrop_whirlpool",
        oem_part_token: "EDR3RXD1",
        browser_truth_status: "PASS",
        repo_proven_official_target_url: edr3Url,
        blocked_reasons: [],
      },
      {
        filter_slug: ultra,
        manufacturer_key: "frigidaire",
        oem_part_token: "ULTRAWF",
        browser_truth_status: "PASS",
        repo_proven_official_target_url: ultrawfUrl,
        blocked_reasons: [],
      },
    ],
  });

  const csv = [
    "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at",
    `${edr3},OEM parts catalog (keyword lookup),https://www.whirlpoolparts.com/catalog.jsp?searchKeyword=EDR3RXD1,true,0,oem-parts-catalog,,,`,
    `${ultra},OEM parts catalog (keyword lookup),https://www.frigidaire.com/en/catalogsearch/result/?q=ULTRAWF,true,0,oem-parts-catalog,,,`,
  ].join("\n");
  writeText(root, "data/retailer_links.csv", `${csv}\n`);

  for (const rel of [
    "data/filters.csv",
    "data/fridge/batch-production/drafts/fridge-safe-link-rescue-owner-review-v1.json",
  ]) {
    const src = path.join(REPO_ROOT, rel);
    if (!existsSync(src)) continue;
    writeText(root, rel, readFileSync(src, "utf8"));
  }

  for (const [slug, manufacturer_key, token, url, retailer_name, label_subtype] of [
    [edr3, "everydrop_whirlpool", "EDR3RXD1", edr3Url, "Whirlpool", "official_manufacturer_official_whirlpool"],
    [ultra, "frigidaire", "ULTRAWF", ultrawfUrl, "Frigidaire", "official_manufacturer_official_frigidaire"],
  ] as const) {
    const applyPlanRel = `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-${slug}-v1.json`;
    const evidenceRel = `data/evidence/${slug}-official-owner-browser-proof-evidence.2026-06-28.json`;
    writeJson(root, applyPlanRel, {
      ...mockApplyPlan(),
      filter_slug: slug,
      manufacturer_key,
      oem_part_token: token,
      official_destination_url: url,
      proof_artifact_path: `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-${slug}-v1.json`,
      current_csv_row: {
        filter_slug: slug,
        retailer_name: "OEM parts catalog (keyword lookup)",
        affiliate_url:
          slug === edr3
            ? "https://www.whirlpoolparts.com/catalog.jsp?searchKeyword=EDR3RXD1"
            : "https://www.frigidaire.com/en/catalogsearch/result/?q=ULTRAWF",
        is_primary: true,
        sort_order: "0",
        retailer_key: "oem-parts-catalog",
        browser_truth_classification: null,
        browser_truth_notes: null,
        browser_truth_checked_at: null,
      },
      proposed_csv_row: {
        filter_slug: slug,
        retailer_name,
        affiliate_url: url,
        is_primary: true,
        sort_order: "0",
        retailer_key: "oem-parts-catalog",
        browser_truth_classification: "direct_buyable",
        browser_truth_notes: "Manufacturer rescue apply plan v1",
        browser_truth_checked_at: NOW().toISOString(),
        customer_visible_label: "BuckParts Verified Link",
        label_subtype,
      },
    });
    writeJson(root, `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-${slug}-v1.json`, {
      contract: "fridge_safe_link_owner_browser_proof_result_v1",
      verdict: "PASS_BROWSER_PROOF",
      checked_at: "2026-06-28T12:00:00.000Z",
      slug,
      owner_proof_urls: [
        {
          url,
          path_type:
            slug === ultra ? "authorized_parts_distributor_pdp" : "official_manufacturer_accessory_pdp",
          browser_proof_status: "PASS",
        },
      ],
    });
    writeJson(root, evidenceRel, {
      filter_slug: slug,
      verdict: "EXACT_PDP_PROVEN_FROM_OWNER_BROWSER",
      generated_at: "2026-06-28T12:00:00.000Z",
      product_attribution: "oem_official",
      primary_proof_track: {
        canonical_url: url,
        path_type: slug === ultra ? "authorized_parts_distributor_pdp" : "official_manufacturer_pdp",
      },
    });
    const bound_artifacts_v1 = bindArtifactsAtHashesV1({
      rootDir: root,
      artifacts: [
        { artifact_rel_path: applyPlanRel, entry_type: "apply_plan" },
        { artifact_rel_path: evidenceRel, entry_type: "evidence" },
      ],
    });
    writeJson(root, `data/owner-decisions/fridge-safe-link-${slug}-owner-approval-v1.json`, {
      contract: "founder_decision_registry_v1",
      rows: [
        {
          decision_id: `decision-2026-06-29-${slug}-approve_csv_manufacturer_rescue_apply`,
          source_queue_row_id: `queue-fridge-safe-link-${slug}-manufacturer-rescue`,
          source_decision_packet_id: `manufacturer_safe_link_rescue_apply_plan_${slug}_v1`,
          decided_at: "2026-06-29T10:00:00.000Z",
          decision_status: "approved",
          allowed_next_scope: "owner_mutation_approved",
          owner_note: `Approved guarded CSV apply for ${slug} manufacturer rescue plan.`,
          evidence_required_before_mutation: true,
          expires_at: "2027-06-01T00:00:00.000Z",
          prohibited_actions_still_apply: [
            "Do not batch apply any other filter slug without a separate founder approval row for that exact slug.",
          ],
          [`${slug}_apply_context_v1`]: {
            target_slug: slug,
            apply_plan_rel_path: applyPlanRel,
            primary_evidence_rel_path: evidenceRel,
            official_destination_url: url,
          },
          bound_artifacts_v1,
        },
      ],
    });
  }

  return { edr3Url, ultrawfUrl };
}

test("parseManufacturerRescueGuardedApplyBridgeCliArgsV1 reads --slug and --write-csv", () => {
  assert.deepEqual(parseManufacturerRescueGuardedApplyBridgeCliArgsV1([]), {
    writeCsv: false,
    targetSlug: null,
  });
  assert.deepEqual(
    parseManufacturerRescueGuardedApplyBridgeCliArgsV1(["--slug", "EDR3RXD1", "--write-csv"]),
    { writeCsv: true, targetSlug: "edr3rxd1" },
  );
  assert.deepEqual(parseManufacturerRescueGuardedApplyBridgeCliArgsV1(["--slug=ultrawf"]), {
    writeCsv: false,
    targetSlug: "ultrawf",
  });
});

test("no --slug with ready_for_apply_count=2 still blocks", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-bridge-count2-"));
  seedMultiReadySlugFixtures(root);
  const report = runManufacturerRescueGuardedApplyBridgeV1({
    rootDir: root,
    now: NOW,
    writeCsv: false,
  });
  assert.equal(report.bridge_status, "BLOCKED");
  assert.equal(report.write_csv_applied, false);
  assert.ok(
    report.blockers.some((b) => b.includes("readiness_gate_ready_for_apply_count_invalid")),
    report.blockers.join("; "),
  );
});

test("--slug edr3rxd1 with count=2 selects only edr3rxd1", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-bridge-slug-edr3-"));
  const { edr3Url } = seedMultiReadySlugFixtures(root);
  const report = runManufacturerRescueGuardedApplyBridgeV1({
    rootDir: root,
    now: NOW,
    writeCsv: false,
    targetSlug: "edr3rxd1",
  });
  assert.equal(report.bridge_status, "DRY_RUN_READY", report.blockers.join("; "));
  assert.equal(report.ready_slug, "edr3rxd1");
  assert.equal(report.preconditions.requested_slug, "edr3rxd1");
  assert.equal(report.write_csv_applied, false);
  assert.equal(report.data_mutation, false);
  assert.equal(report.guarded_executor_report?.row_patch_count, 1);
  assert.deepEqual(report.guarded_executor_report?.row_patch_slugs, ["edr3rxd1"]);
  assert.ok(report.execution_plan_artifact_rel_path);
  const plan = JSON.parse(
    readFileSync(path.join(root, report.execution_plan_artifact_rel_path!), "utf8"),
  ) as { planned_change_count: number; row_patch_preview: Array<{ slug: string; after_row: { affiliate_url: string } }> };
  assert.equal(plan.planned_change_count, 1);
  assert.equal(plan.row_patch_preview.length, 1);
  assert.equal(plan.row_patch_preview[0]?.slug, "edr3rxd1");
  assert.equal(plan.row_patch_preview[0]?.after_row.affiliate_url, edr3Url);
});

test("--slug ultrawf with count=2 selects only ultrawf", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-bridge-slug-ultra-"));
  const { ultrawfUrl } = seedMultiReadySlugFixtures(root);
  const report = runManufacturerRescueGuardedApplyBridgeV1({
    rootDir: root,
    now: NOW,
    writeCsv: false,
    targetSlug: "ultrawf",
  });
  assert.equal(report.bridge_status, "DRY_RUN_READY", report.blockers.join("; "));
  assert.equal(report.ready_slug, "ultrawf");
  assert.equal(report.preconditions.requested_slug, "ultrawf");
  assert.equal(report.write_csv_applied, false);
  assert.equal(report.guarded_executor_report?.row_patch_count, 1);
  assert.deepEqual(report.guarded_executor_report?.row_patch_slugs, ["ultrawf"]);
  assert.ok(report.execution_plan_artifact_rel_path);
  const plan = JSON.parse(
    readFileSync(path.join(root, report.execution_plan_artifact_rel_path!), "utf8"),
  ) as { planned_change_count: number; row_patch_preview: Array<{ slug: string; after_row: { affiliate_url: string } }> };
  assert.equal(plan.planned_change_count, 1);
  assert.equal(plan.row_patch_preview.length, 1);
  assert.equal(plan.row_patch_preview[0]?.slug, "ultrawf");
  assert.equal(plan.row_patch_preview[0]?.after_row.affiliate_url, ultrawfUrl);
});

test("unknown --slug blocks when not in ready_for_apply_slugs", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-bridge-slug-unknown-"));
  seedMultiReadySlugFixtures(root);
  const report = runManufacturerRescueGuardedApplyBridgeV1({
    rootDir: root,
    now: NOW,
    writeCsv: false,
    targetSlug: "wf3cb",
  });
  assert.equal(report.bridge_status, "BLOCKED");
  assert.equal(report.write_csv_applied, false);
  assert.ok(
    report.blockers.some((b) => b.includes("requested_slug_not_ready_for_apply")),
    report.blockers.join("; "),
  );
});

test("explicit --slug dry-run does not write CSV without --write-csv", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-bridge-slug-nowrite-"));
  const { edr3Url } = seedMultiReadySlugFixtures(root);
  const before = readFileSync(path.join(root, "data/retailer_links.csv"), "utf8");
  const report = runManufacturerRescueGuardedApplyBridgeV1({
    rootDir: root,
    now: NOW,
    writeCsv: false,
    targetSlug: "edr3rxd1",
  });
  assert.equal(report.bridge_status, "DRY_RUN_READY", report.blockers.join("; "));
  assert.equal(report.write_csv_applied, false);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.csv_apply_authorized, false);
  const after = readFileSync(path.join(root, "data/retailer_links.csv"), "utf8");
  assert.equal(after, before);
  assert.ok(!after.includes(edr3Url));
});
