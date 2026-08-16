import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { lookupDispatchAllowlistEntryV1 } from "./buckparts-command-center-dispatch-allowlist-v1";
import { BROWSER_PROOF_COLLECTOR_CONTRACT_V1 } from "./browser-proof-collector-v1";
import { BROWSER_PROOF_COLLECTOR_OWNER_REVIEW_PACKET_CONTRACT_V1 } from "./browser-proof-collector-owner-review-bridge-v1";
import {
  BROWSER_PROOF_COLLECTOR_EXACT_COMMAND_V1,
  isBlockedNonManufacturerSeedUrlV1,
  isBrowserProofCollectorOrchestratorRefreshArgvV1,
  isCommittedManufacturerSeedUrlV1,
  loadManufacturerSeedUrlsForWorkItemV1,
  loadOemCatalogSeedUrlsFromRetailerLinksV1,
  runFridgeManufacturerProofFromOrchestratorV1,
  selectNextManufacturerProofRefreshWorkItemV1,
  slugHasCollectorDraftV1,
  slugHasOwnerReviewPacketV1,
} from "./fridge-manufacturer-proof-from-orchestrator-v1";
import {
  loadManufacturerBrowserProofRefreshOrchestratorReportV1,
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1,
  type ManufacturerBrowserProofRefreshOrchestratorReportV1,
  type ManufacturerBrowserProofRefreshWorkItemV1,
} from "./manufacturer-browser-proof-refresh-orchestrator-v1";

const REPO_ROOT = process.cwd();

function workItem(
  partial: Partial<ManufacturerBrowserProofRefreshWorkItemV1> &
    Pick<ManufacturerBrowserProofRefreshWorkItemV1, "filter_slug" | "oem_part_token">,
): ManufacturerBrowserProofRefreshWorkItemV1 {
  return {
    capture_strategy: "owner_browser_proof_session_assist",
    evidence_status: "MISSING",
    schedule_reasons: ["owner_browser_proof_artifact_missing"],
    refresh_priority: 100,
    recommended_capture_command: "npm run buckparts:browser-proof-collector",
    target_url: null,
    owner_proof_artifact_rel: null,
    normalization_draft_only: false,
    auto_pass_forbidden: true,
    ...partial,
  };
}

function miniReport(
  items: ManufacturerBrowserProofRefreshWorkItemV1[],
): ManufacturerBrowserProofRefreshOrchestratorReportV1 {
  return {
    contract: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    auto_pass_forbidden: true,
    readiness_gate_promotion_authorized: false,
    generated_at: "2026-08-16T00:00:00.000Z",
    source_command: "npm run buckparts:manufacturer-browser-proof-refresh-orchestrator",
    factory_contract: "manufacturer_browser_proof_factory_v1",
    factory_artifact_path: "data/fridge/batch-production/drafts/manufacturer-browser-proof-factory-v1.json",
    factory_generated_at: "2026-08-16T00:00:00.000Z",
    factory_orchestrator_generated_at: "2026-08-16T00:00:00.000Z",
    browser_proof_max_age_days: 14,
    deploy_build_marker: { marker: "UNKNOWN", marker_source_path: null, proof_after_marker_proven: "UNKNOWN" },
    scheduled_slug_count: items.length,
    manufacturer_refresh_batch_count: 1,
    manufacturer_refresh_batches: [
      {
        batch_id: "refresh_batch_frigidaire",
        manufacturer_key: "frigidaire",
        scheduled_slug_count: items.length,
        work_items: items,
        capture_strategies: ["owner_browser_proof_session_assist"],
        capture_commands: ["npm run buckparts:browser-proof-collector"],
        max_refresh_priority: 100,
        schedule_reasons: ["owner_browser_proof_artifact_missing"],
        ge_normalization_draft_only: false,
        auto_pass_forbidden: true,
        browser_automation_authorized: false,
        post_capture_owner_action: "Owner review required",
      },
    ],
    manufacturer_refresh_batch_rels: [],
    inspect_summary: {
      recommended_next_action: "capture",
      readiness_gate_note: "",
      factory_note: "",
    },
    proven_facts: [],
    unknown_facts: [],
  };
}

test("flagless collector argv is orchestrator refresh mode", () => {
  assert.equal(
    isBrowserProofCollectorOrchestratorRefreshArgvV1({
      slug: null,
      token: null,
      urls: [],
      urls_file: null,
    }),
    true,
  );
  assert.equal(
    isBrowserProofCollectorOrchestratorRefreshArgvV1({
      slug: "wf3cb",
      token: "WF3CB",
      urls: ["https://www.frigidaire.com/en/p/WF3CB"],
      urls_file: null,
    }),
    false,
  );
});

test("amazon and search-engine URLs are not manufacturer seeds", () => {
  assert.equal(isCommittedManufacturerSeedUrlV1("https://www.amazon.com/dp/B00NXPKBQ2"), false);
  assert.equal(isBlockedNonManufacturerSeedUrlV1("https://www.amazon.com/dp/B00NXPKBQ2"), true);
  assert.equal(
    isCommittedManufacturerSeedUrlV1(
      "https://www.frigidaire.com/en/catalogsearch/result/?q=FPPWFU01",
    ),
    true,
  );
});

test("repo retailer_links seeds fppwfu01 manufacturer catalogsearch, not Amazon", () => {
  const urls = loadOemCatalogSeedUrlsFromRetailerLinksV1({
    rootDir: REPO_ROOT,
    filterSlug: "fppwfu01",
  });
  assert.ok(urls.some((u) => u.includes("frigidaire.com") && u.includes("FPPWFU01")));
  assert.equal(
    urls.some((u) => u.includes("amazon.com")),
    false,
  );
});

test("amazon-only OEM slug has no manufacturer seed from retailer_links", () => {
  const urls = loadOemCatalogSeedUrlsFromRetailerLinksV1({
    rootDir: REPO_ROOT,
    filterSlug: "edr1rxd1",
  });
  assert.deepEqual(urls, []);
});

test("orchestrator target_url is preferred manufacturer seed", () => {
  const { seed_urls, discovery_path } = loadManufacturerSeedUrlsForWorkItemV1({
    rootDir: REPO_ROOT,
    workItem: workItem({
      filter_slug: "wf3cb",
      oem_part_token: "WF3CB",
      target_url:
        "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB",
    }),
  });
  assert.equal(seed_urls[0]?.includes("/en/p/"), true);
  assert.ok(
    discovery_path === "orchestrator_target_url" ||
      discovery_path === "orchestrator_target_url+retailer_links_oem_catalog",
  );
});

test("repo orchestrator seeds fppwfu01 catalogsearch and parks it after a collector draft", () => {
  const report = loadManufacturerBrowserProofRefreshOrchestratorReportV1({ rootDir: REPO_ROOT });
  assert.ok(report);
  const seeds = loadManufacturerSeedUrlsForWorkItemV1({
    rootDir: REPO_ROOT,
    workItem: workItem({
      filter_slug: "fppwfu01",
      oem_part_token: "FPPWFU01",
    }),
  });
  assert.equal(seeds.discovery_path, "retailer_links_oem_catalog");
  assert.ok(seeds.seed_urls[0]?.includes("catalogsearch"));
  assert.equal(slugHasCollectorDraftV1({ rootDir: REPO_ROOT, slug: "wf3cb" }), true);
  assert.equal(slugHasOwnerReviewPacketV1({ rootDir: REPO_ROOT, slug: "wf3cb" }), true);
  const selected = selectNextManufacturerProofRefreshWorkItemV1({
    rootDir: REPO_ROOT,
    report: report!,
  });
  if (slugHasCollectorDraftV1({ rootDir: REPO_ROOT, slug: "fppwfu01" })) {
    assert.notEqual(selected?.work_item.filter_slug, "fppwfu01");
  } else {
    assert.equal(selected?.work_item.filter_slug, "fppwfu01");
    assert.equal(selected?.follow_search_to_product_links, true);
  }
});

test("skips slug with existing collector batch and selects the next seeded item", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "fridge-mfr-proof-"));
  mkdirSync(path.join(tmp, "data/fridge/batch-production/drafts/browser-proof-collector/alpha"), {
    recursive: true,
  });
  writeFileSync(
    path.join(
      tmp,
      "data/fridge/batch-production/drafts/browser-proof-collector/alpha/browser-proof-collector-alpha-aaaa-2026-08-16T00-00-00-000Z.json",
    ),
    "{}\n",
  );
  writeFileSync(
    path.join(tmp, "data/retailer_links.csv"),
    "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\n" +
      "alpha,OEM,https://www.frigidaire.com/en/catalogsearch/result/?q=ALPHA,true,0,oem-parts-catalog,,,\n" +
      "beta,OEM,https://www.frigidaire.com/en/catalogsearch/result/?q=BETA,true,0,oem-parts-catalog,,,\n",
  );
  const selected = selectNextManufacturerProofRefreshWorkItemV1({
    rootDir: tmp,
    report: miniReport([
      workItem({ filter_slug: "alpha", oem_part_token: "ALPHA" }),
      workItem({ filter_slug: "beta", oem_part_token: "BETA" }),
    ]),
  });
  assert.equal(selected?.work_item.filter_slug, "beta");
});

test("fail closed when the only scheduled slug is Amazon-only", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "fridge-mfr-proof-amazon-"));
  mkdirSync(path.join(tmp, "data"), { recursive: true });
  writeFileSync(
    path.join(tmp, "data/retailer_links.csv"),
    "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\n" +
      "edr1rxd1,Amazon,https://www.amazon.com/dp/B00UXG4WR8,true,0,amazon,direct_buyable,,,\n",
  );
  const selected = selectNextManufacturerProofRefreshWorkItemV1({
    rootDir: tmp,
    report: miniReport([workItem({ filter_slug: "edr1rxd1", oem_part_token: "EDR1RXD1" })]),
  });
  assert.equal(selected, null);
});

test("orchestrator refresh runs collector then owner-review bridge and never auto-PASS", async () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "fridge-mfr-proof-run-"));
  mkdirSync(path.join(tmp, "data/fridge/batch-production/drafts"), { recursive: true });
  const live = loadManufacturerBrowserProofRefreshOrchestratorReportV1({ rootDir: REPO_ROOT });
  assert.ok(live);
  writeFileSync(
    path.join(
      tmp,
      "data/fridge/batch-production/drafts/manufacturer-browser-proof-refresh-orchestrator-v1.json",
    ),
    `${JSON.stringify(live)}\n`,
  );
  writeFileSync(
    path.join(tmp, "data/retailer_links.csv"),
    readFileSync(path.join(REPO_ROOT, "data/retailer_links.csv"), "utf8"),
  );

  const outcome = await runFridgeManufacturerProofFromOrchestratorV1({
    rootDir: tmp,
    writeDrafts: false,
    runCollector: async () => ({
      draft: {
        contract: BROWSER_PROOF_COLLECTOR_CONTRACT_V1,
        read_only: true,
        data_mutation: false,
        mutation_authorized: false,
        verified_link_authorized: false,
        csv_apply_authorized: false,
        supabase_mutation_authorized: false,
        evidence_write_authorized: false,
        production_go_click_authorized: false,
        apply_plan_proposal_justified: false,
        promotes_to_owner_browser_proof_result: false,
        founder_approval_authorized: false,
        generated_at: "2026-08-16T17:00:00.000Z",
        capture_method: "playwright_headless",
        capture_options: {
          headed: false,
          wait_ms: 0,
          timeout_ms: 1000,
          user_agent_mode: "desktop_chrome",
        },
        capture_attempts: [],
        batch_mode: true,
        collect_all: false,
        early_stop: { stopped: true, reason: "PASS_official_manufacturer_pdp", stopped_after_candidate_url: "https://www.frigidaire.com/en/p/x" },
        best_candidate_url: "https://www.frigidaire.com/en/p/accessories/water-filters/FPPWFU01",
        best_candidate_rank: 0,
        slug: "fppwfu01",
        expected_token: "FPPWFU01",
        forbidden_tokens: [],
        confusion_family_owner_review_required: false,
        owner_review_required: true,
        candidates: [
          {
            candidate_url: "https://www.frigidaire.com/en/p/accessories/water-filters/FPPWFU01",
            verdict: "PASS",
            blockers: [],
            facts: {
              final_url: "https://www.frigidaire.com/en/p/accessories/water-filters/FPPWFU01",
              title: "FPPWFU01",
              h1: "FPPWFU01",
              visible_text_snippet: "FPPWFU01 In Stock $49.99 Add to Cart",
              exact_expected_token_present: true,
              forbidden_tokens_present: [],
              price_like_text_present: true,
              stock_or_buyability_signal_present: true,
              add_to_cart_or_subscription_signals: ["Add to Cart"],
              unavailable_signal_present: false,
              page_type: "product_pdp",
              source_class: "official_manufacturer_pdp",
              capture_succeeded: true,
              navigation_error: null,
              extraction_uncertain: false,
            },
            screenshot_rel_path: null,
            assessment: "PASS",
            capture_attempts: [],
          },
        ],
        overall_verdict: "PASS",
        recommended_next_action: "owner review",
        proven_facts: [],
        unknown_facts: [],
        not_authorized: ["owner_browser_proof_result_auto_write"],
      },
      draft_json_rel:
        "data/fridge/batch-production/drafts/browser-proof-collector/fppwfu01/browser-proof-collector-batch-fppwfu01-test.json",
    }),
    runBridge: () => ({
      packet: {
        contract: BROWSER_PROOF_COLLECTOR_OWNER_REVIEW_PACKET_CONTRACT_V1,
        owner_acceptance_status: "PENDING_OWNER_ACCEPTANCE",
        activates_owner_browser_proof_result: false,
        promotes_to_owner_browser_proof_result: false,
        mutation_authorized: false,
        founder_approval_authorized: false,
      } as never,
      packet_rel_path:
        "data/fridge/batch-production/drafts/browser-proof-collector/fppwfu01/browser-proof-collector-owner-review-packet-fppwfu01-test.json",
    }),
  });

  assert.equal(outcome.selected_slug, "fppwfu01");
  assert.equal(outcome.owner_acceptance_status, "PENDING_OWNER_ACCEPTANCE");
  assert.equal(outcome.promotes_to_owner_browser_proof_result, false);
  assert.equal(outcome.activates_owner_browser_proof_result, false);
  assert.equal(outcome.mutation_authorized, false);
  assert.equal(outcome.data_mutation, false);
  assert.ok(outcome.owner_review_packet_rel);
  assert.equal(BROWSER_PROOF_COLLECTOR_EXACT_COMMAND_V1, "npm run buckparts:browser-proof-collector");
});

test("flagless collector command is dispatch-allowlisted read-only", () => {
  const entry = lookupDispatchAllowlistEntryV1(BROWSER_PROOF_COLLECTOR_EXACT_COMMAND_V1);
  assert.ok(entry);
  assert.equal(entry?.command_kind, "read_only_report");
  assert.equal(entry?.owner_review_required, false);
  assert.equal(entry?.mutation_posture.mutation_allowed, false);
  assert.equal(entry?.mutation_posture.data_mutation, false);
});
