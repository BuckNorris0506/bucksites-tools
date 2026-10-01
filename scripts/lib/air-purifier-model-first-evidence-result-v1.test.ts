import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildApModelFirstEvidenceQueueV1Report } from "./ap-model-first-evidence-queue-v1";
import {
  AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1,
  AP_MODEL_FIRST_HOLMES_HAPF30_LIVE_BROWSER_RESULT_REL_V1,
  AP_MODEL_FIRST_HOLMES_HAPF30_RESULT_REL_V1,
  AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1,
  AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_REPORT_NAME_V1,
  buildHolmesHapf30ModelFirstEvidenceFromQueueV1,
  buildModelFirstEvidenceResultV1,
  isAllowedModelFirstEvidenceResultRelPathV1,
  isAllowedModelFirstLiveBrowserEvidenceResultRelPathV1,
  loadAllRepoModelSlugsForAnchorFilterV1,
  liveBrowserBuyerPathMayRecommendCsvMutationV1,
  loadModelFirstEvidenceResultV1,
  validateModelFirstEvidenceResultV1,
} from "./air-purifier-model-first-evidence-result-v1";
import { buildAirPurifierModelFirstProductionLaneV1Report } from "./air-purifier-model-first-production-lane-v1";
import { buildAirPurifierWeakBuyerPathAuditV1Report } from "./air-purifier-weak-buyer-path-audit-v1";

const REPO_ROOT = process.cwd();
const DISPATCH_RUNS_DIR_REL = "data/command-center/dispatch-runs";

test("model-first evidence result schema is valid", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const queue = buildApModelFirstEvidenceQueueV1Report({ modelFirstLane: lane, weakBuyerPathAudit: weak });
  const result = buildHolmesHapf30ModelFirstEvidenceFromQueueV1({ rootDir: REPO_ROOT, queue });

  assert.equal(result.contract, AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1);
  assert.equal(result.read_only, true);
  assert.equal(result.data_mutation, false);
  assert.equal(result.anchor_filter_slug, "holmes-hapf30");
  assert.equal(result.model_rows.length, 5);
  assert.equal(result.recommended_csv_mutation, null);
  for (const row of result.model_rows) {
    assert.equal(row.recommended_csv_mutation, null);
    assert.equal(row.do_not_claim_unavailable, true);
    assert.equal(row.documented_filter_slug, "holmes-hapf30");
  }
});

test("artifact path is under ap_model_first_evidence_v1 allowed results dir", () => {
  assert.ok(AP_MODEL_FIRST_HOLMES_HAPF30_RESULT_REL_V1.includes(AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1));
  assert.ok(AP_MODEL_FIRST_HOLMES_HAPF30_RESULT_REL_V1.endsWith(".results.json"));
});

test("building holmes result read-only does not mutate CSV Supabase dispatch batch-review", () => {
  const csvPaths = [
    "data/air-purifier/retailer_links.csv",
    "data/air-purifier/filters.csv",
    "data/air-purifier/models.csv",
    "data/air-purifier/compatibility_mappings.csv",
  ];
  const before = new Map(csvPaths.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]));
  const dispatchDir = path.join(REPO_ROOT, DISPATCH_RUNS_DIR_REL);
  const dispatchBefore = new Map<string, string>();
  for (const name of readdirSync(dispatchDir)) {
    if (name.endsWith(".json")) dispatchBefore.set(name, readFileSync(path.join(dispatchDir, name), "utf8"));
  }
  const reviewPath = path.join(
    REPO_ROOT,
    "data/air-purifier/batch-production/batch-review/ap-agent-results-review-v1.json",
  );
  const reviewBefore = readFileSync(reviewPath, "utf8");

  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const queue = buildApModelFirstEvidenceQueueV1Report({ modelFirstLane: lane, weakBuyerPathAudit: weak });
  const targetAbs = path.join(REPO_ROOT, AP_MODEL_FIRST_HOLMES_HAPF30_RESULT_REL_V1);
  rmSync(targetAbs, { force: true });

  buildHolmesHapf30ModelFirstEvidenceFromQueueV1({
    rootDir: REPO_ROOT,
    queue,
    writeResult: false,
  });

  for (const [p, content] of before) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
  }
  for (const [name, content] of dispatchBefore) {
    assert.equal(readFileSync(path.join(dispatchDir, name), "utf8"), content);
  }
  assert.equal(readFileSync(reviewPath, "utf8"), reviewBefore);

  assert.equal(existsSync(targetAbs), false);
});

test("live-browser model-first artifact schema is accepted", () => {
  const loaded = loadModelFirstEvidenceResultV1({
    rootDir: REPO_ROOT,
    relPath: AP_MODEL_FIRST_HOLMES_HAPF30_LIVE_BROWSER_RESULT_REL_V1,
  });
  assert.ok(loaded);
  assert.equal(loaded!.evidence_collection_mode, "live_browser_model_first_v1");
  if (loaded!.evidence_collection_mode === "live_browser_model_first_v1") {
    assert.equal(loaded.evidence_mode, "live_browser_model_first_v1");
    assert.equal(loaded.filter_slug, "holmes-hapf30");
    assert.equal(loaded.model_rows.length, 5);
    assert.ok(loaded.candidate_buyer_paths.length >= 1);
    assert.equal(loaded.recommended_csv_mutation, null);
    assert.equal(loaded.evidence_status_counts.PASS, 0);
  }
});

test("default holmes report run is read-only and does not create repo-only artifact", () => {
  const targetAbs = path.join(REPO_ROOT, AP_MODEL_FIRST_HOLMES_HAPF30_RESULT_REL_V1);
  rmSync(targetAbs, { force: true });
  execSync("npx tsx scripts/report-air-purifier-model-first-evidence-holmes-hapf30-v1.ts", {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
  assert.equal(existsSync(targetAbs), false);
});

test("live-browser artifact path is only under allowed model-first results dir", () => {
  assert.ok(isAllowedModelFirstEvidenceResultRelPathV1(AP_MODEL_FIRST_HOLMES_HAPF30_LIVE_BROWSER_RESULT_REL_V1));
  assert.ok(
    AP_MODEL_FIRST_HOLMES_HAPF30_LIVE_BROWSER_RESULT_REL_V1.startsWith(
      AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1,
    ),
  );
  assert.ok(isAllowedModelFirstLiveBrowserEvidenceResultRelPathV1(AP_MODEL_FIRST_HOLMES_HAPF30_LIVE_BROWSER_RESULT_REL_V1));
  assert.equal(
    isAllowedModelFirstLiveBrowserEvidenceResultRelPathV1(
      `${AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/ap-model-first-holmes-hapf30-v1.results.json`,
    ),
    false,
  );
  assert.equal(isAllowedModelFirstEvidenceResultRelPathV1("data/air-purifier/filters.csv"), false);
  assert.equal(
    isAllowedModelFirstEvidenceResultRelPathV1(
      "../agent-results-model-first-v1/evil.results.json",
    ),
    false,
  );
});

test("unsafe search-page buyer paths cannot validate as PASS with empty token proof", () => {
  const bad = {
    contract: AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1,
    report_name: AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_REPORT_NAME_V1,
    packet_id: "test",
    run_id: "test",
    queue_contract: "ap_model_first_evidence_queue_v1",
    anchor_filter_slug: "holmes-hapf30",
    filter_slug: "holmes-hapf30",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-01-01T00:00:00.000Z",
    checked_at: "2026-01-01T00:00:00.000Z",
    source_status: "PARTIAL",
    evidence_collection_mode: "live_browser_model_first_v1",
    evidence_mode: "live_browser_model_first_v1",
    model_rows: [
      {
        model_slug: "holmes-hap412bcs",
        model_number: "HAP412BCS",
        official_source_urls: [],
        manual_urls: [],
        documented_filter_tokens: [],
        evidence_status: "UNKNOWN",
        buyer_path_status: "x",
        notes: "x",
      },
    ],
    candidate_buyer_paths: [
      {
        url: "https://www.holmesproducts.com/search?q=HAPF30",
        retailer_or_source: "holmes_official",
        exact_token_proof: "",
        buyability_proof: "search page",
        wrong_family_risk: "high",
        status: "PASS",
      },
    ],
    filter_first_cross_reference: null,
    evidence_status_counts: { PASS: 0, FAIL: 0, UNKNOWN: 1, BLOCKED: 0 },
    recommended_csv_mutation: null,
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
  };
  assert.equal(validateModelFirstEvidenceResultV1(bad), false);
  assert.equal(
    liveBrowserBuyerPathMayRecommendCsvMutationV1(bad.candidate_buyer_paths[0]),
    false,
  );
});

test("exact-token proof is required before PASS buyer path can recommend mutation", () => {
  assert.equal(
    liveBrowserBuyerPathMayRecommendCsvMutationV1({
      url: "https://www.holmesproducts.com/filters/air-purifier-filters/noname/SP_763535.html",
      retailer_or_source: "holmes_official",
      exact_token_proof: "UNKNOWN: no exact token",
      buyability_proof: "Add to Cart",
      wrong_family_risk: "low",
      status: "PASS",
    }),
    false,
  );
  assert.equal(
    liveBrowserBuyerPathMayRecommendCsvMutationV1({
      url: "https://www.holmesproducts.com/filters/air-purifier-filters/noname/SP_763535.html",
      retailer_or_source: "holmes_official",
      exact_token_proof: "PROVEN: HAPF30 on PDP",
      buyability_proof: "Add to Cart",
      wrong_family_risk: "low",
      status: "PASS",
    }),
    true,
  );
});

test("non-holmes anchor uses generic model-first wording", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const queue = buildApModelFirstEvidenceQueueV1Report({ modelFirstLane: lane, weakBuyerPathAudit: weak });
  const candidate =
    queue.completed_no_mutation_candidates.find((c) => c.filter_slug === "shark-carbon-foam") ??
    queue.top_candidates.find((c) => c.filter_slug === "shark-carbon-foam");
  assert.ok(candidate, "expected shark-carbon-foam sample slugs from completed or active queue");
  const result = buildModelFirstEvidenceResultV1({
    rootDir: REPO_ROOT,
    queue,
    anchorFilterSlug: "shark-carbon-foam",
    modelSlugs: candidate.sample_model_slugs,
    writeResult: false,
  });

  const blob = JSON.stringify(result);
  assert.ok(!blob.includes("Holmes"));
  assert.ok(!blob.includes("HOLMES-HAPF30"));
  assert.ok(!blob.includes("holmesproducts.com"));
  assert.ok(!blob.includes("AER1"));
  assert.equal(result.anchor_filter_slug, "shark-carbon-foam");
  assert.equal(result.evidence_status_counts.UNKNOWN, candidate.sample_model_slugs.length);
  for (const row of result.model_rows) {
    assert.equal(row.brand_slug, "shark");
    assert.ok(row.exact_filter_token_evidence.includes("shark-carbon-foam"));
  }
});

test("holmes sample rows are built from completed/no-mutation fallback when top queue moved", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const queue = buildApModelFirstEvidenceQueueV1Report({ modelFirstLane: lane, weakBuyerPathAudit: weak });
  const top = queue.completed_no_mutation_candidates.find((c) => c.filter_slug === "holmes-hapf30");
  assert.ok(top);
  const result = buildHolmesHapf30ModelFirstEvidenceFromQueueV1({ rootDir: REPO_ROOT, queue });
  assert.deepEqual(
    result.model_rows.map((r) => r.model_slug).sort(),
    top!.sample_model_slugs.slice().sort(),
  );
});

test("loadAllRepoModelSlugsForAnchorFilterV1 returns all 8 Rabbit MinusA2 models for rabbit-carbon-minusa2", () => {
  const slugs = loadAllRepoModelSlugsForAnchorFilterV1(REPO_ROOT, "rabbit-carbon-minusa2");
  assert.equal(slugs.length, 8);
  assert.deepEqual(slugs, [
    "rabbit-minusa2-germ",
    "rabbit-minusa2-odor",
    "rabbit-minusa2-pet",
    "rabbit-minusa2-spa-780a",
    "rabbit-minusa2-spa-780j",
    "rabbit-minusa2-spa-780n",
    "rabbit-minusa2-toxin",
    "rabbit-minusa2-voc",
  ]);
});

test("rabbit-carbon-minusa2 repo-truth packet covers all compatibility-mapped models as UNKNOWN", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const queue = buildApModelFirstEvidenceQueueV1Report({ modelFirstLane: lane, weakBuyerPathAudit: weak });
  const modelSlugs = loadAllRepoModelSlugsForAnchorFilterV1(REPO_ROOT, "rabbit-carbon-minusa2");
  const result = buildModelFirstEvidenceResultV1({
    rootDir: REPO_ROOT,
    queue,
    anchorFilterSlug: "rabbit-carbon-minusa2",
    modelSlugs,
    writeResult: false,
  });
  assert.equal(result.model_rows.length, 8);
  assert.equal(result.model_slugs_checked.length, 8);
  assert.deepEqual(result.model_slugs_checked, result.model_rows.map((r) => r.model_slug));
  assert.equal(result.evidence_status_counts.UNKNOWN, 8);
  assert.equal(result.evidence_status_counts.PASS, 0);
  assert.equal(result.recommended_csv_mutation, null);
  assert.equal(result.safe_apply_authorized, false);
  for (const row of result.model_rows) {
    assert.equal(row.evidence_status, "UNKNOWN");
    assert.equal(row.documented_filter_slug, "rabbit-carbon-minusa2");
    assert.equal(row.official_model_source_urls.length, 0);
  }
  assert.ok(
    result.unknown_facts.some((f) =>
      f.includes("ap-model-first-rabbit-carbon-minusa2-live-browser-v1.results.json"),
    ),
  );
});

test("loadAllRepoModelSlugsForAnchorFilterV1 returns all 7 Coway Airmega 250 models for coway-airmega250-rf", () => {
  const slugs = loadAllRepoModelSlugsForAnchorFilterV1(REPO_ROOT, "coway-airmega250-rf");
  assert.equal(slugs.length, 7);
  assert.deepEqual(slugs, [
    "coway-airmega-150",
    "coway-airmega-160",
    "coway-airmega-240",
    "coway-airmega-250",
    "coway-airmega-250-graphite",
    "coway-airmega-250s",
    "coway-ap-2520f-p-",
  ]);
});

test("coway-airmega250-rf repo-truth packet covers all compatibility-mapped models as UNKNOWN with safe_apply blocked", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const queue = buildApModelFirstEvidenceQueueV1Report({ modelFirstLane: lane, weakBuyerPathAudit: weak });
  const modelSlugs = loadAllRepoModelSlugsForAnchorFilterV1(REPO_ROOT, "coway-airmega250-rf");
  const result = buildModelFirstEvidenceResultV1({
    rootDir: REPO_ROOT,
    queue,
    anchorFilterSlug: "coway-airmega250-rf",
    modelSlugs,
    writeResult: false,
  });
  assert.equal(result.model_rows.length, 7);
  assert.equal(result.model_slugs_checked.length, 7);
  assert.deepEqual(result.model_slugs_checked, result.model_rows.map((r) => r.model_slug));
  assert.equal(result.evidence_status_counts.UNKNOWN, 7);
  assert.equal(result.evidence_status_counts.PASS, 0);
  assert.equal(result.recommended_csv_mutation, null);
  assert.equal(result.safe_apply_authorized, false);
  assert.equal(result.filter_first_cross_reference?.evidence_status, "BLOCKED");
  assert.equal(result.filter_first_cross_reference?.exact_token_found, false);
  for (const row of result.model_rows) {
    assert.equal(row.evidence_status, "UNKNOWN");
    assert.equal(row.documented_filter_slug, "coway-airmega250-rf");
    assert.equal(row.buyer_path_status, "SEARCH_PLACEHOLDER_PRIMARY");
    assert.equal(row.official_model_source_urls.length, 0);
  }
  assert.ok(
    result.unknown_facts.some((f) =>
      f.includes("ap-model-first-coway-airmega250-rf-live-browser-v1.results.json"),
    ),
  );
});

test("loadAllRepoModelSlugsForAnchorFilterV1 returns all 6 GermGuardian FLT4100 models for gg-flt4100", () => {
  const slugs = loadAllRepoModelSlugsForAnchorFilterV1(REPO_ROOT, "gg-flt4100");
  assert.equal(slugs.length, 6);
  assert.deepEqual(slugs, [
    "gg-ac4100",
    "gg-ac4150",
    "gg-ac4175",
    "gg-ac4225",
    "gg-ac4230",
    "gg-ac4820",
  ]);
});

test("gg-flt4100 repo-truth packet covers all compatibility-mapped models as UNKNOWN with safe_apply blocked", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const queue = buildApModelFirstEvidenceQueueV1Report({ modelFirstLane: lane, weakBuyerPathAudit: weak });
  const modelSlugs = loadAllRepoModelSlugsForAnchorFilterV1(REPO_ROOT, "gg-flt4100");
  const result = buildModelFirstEvidenceResultV1({
    rootDir: REPO_ROOT,
    queue,
    anchorFilterSlug: "gg-flt4100",
    modelSlugs,
    writeResult: false,
  });
  assert.equal(result.model_rows.length, 6);
  assert.equal(result.model_slugs_checked.length, 6);
  assert.deepEqual(result.model_slugs_checked, result.model_rows.map((r) => r.model_slug));
  assert.equal(result.evidence_status_counts.UNKNOWN, 6);
  assert.equal(result.evidence_status_counts.PASS, 0);
  assert.equal(result.recommended_csv_mutation, null);
  assert.equal(result.safe_apply_authorized, false);
  assert.equal(result.filter_first_cross_reference?.evidence_status, "UNKNOWN");
  assert.equal(result.filter_first_cross_reference?.exact_token_found, false);
  assert.equal(
    result.filter_first_cross_reference?.rejection_reason,
    "Insufficient proof in repo truth for this candidate.",
  );
  for (const row of result.model_rows) {
    assert.equal(row.evidence_status, "UNKNOWN");
    assert.equal(row.documented_filter_slug, "gg-flt4100");
    assert.equal(row.buyer_path_status, "SEARCH_PLACEHOLDER_PRIMARY");
    assert.equal(row.official_model_source_urls.length, 0);
  }
  assert.ok(
    result.unknown_facts.some((f) => f.includes("ap-model-first-gg-flt4100-live-browser-v1.results.json")),
  );
});

test("loadAllRepoModelSlugsForAnchorFilterV1 returns all 6 Levoit Core 400 models for levoit-rf-rar040", () => {
  const slugs = loadAllRepoModelSlugsForAnchorFilterV1(REPO_ROOT, "levoit-rf-rar040");
  assert.equal(slugs.length, 6);
  assert.deepEqual(slugs, [
    "levoit-core-400-rf",
    "levoit-core-400s",
    "levoit-core-400s-rf",
    "levoit-core-450s",
    "levoit-lap-c401s-wusr",
    "levoit-lap-c451s-wusr",
  ]);
});

test("levoit-rf-rar040 repo-truth packet covers all compatibility-mapped models as UNKNOWN with safe_apply blocked", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const queue = buildApModelFirstEvidenceQueueV1Report({ modelFirstLane: lane, weakBuyerPathAudit: weak });
  const modelSlugs = loadAllRepoModelSlugsForAnchorFilterV1(REPO_ROOT, "levoit-rf-rar040");
  const result = buildModelFirstEvidenceResultV1({
    rootDir: REPO_ROOT,
    queue,
    anchorFilterSlug: "levoit-rf-rar040",
    modelSlugs,
    writeResult: false,
  });
  assert.equal(result.model_rows.length, 6);
  assert.equal(result.model_slugs_checked.length, 6);
  assert.deepEqual(result.model_slugs_checked, result.model_rows.map((r) => r.model_slug));
  assert.equal(result.evidence_status_counts.UNKNOWN, 6);
  assert.equal(result.evidence_status_counts.PASS, 0);
  assert.equal(result.recommended_csv_mutation, null);
  assert.equal(result.safe_apply_authorized, false);
  assert.equal(result.filter_first_cross_reference, null);
  for (const row of result.model_rows) {
    assert.equal(row.evidence_status, "UNKNOWN");
    assert.equal(row.documented_filter_slug, "levoit-rf-rar040");
    assert.equal(row.buyer_path_status, "SEARCH_PLACEHOLDER_PRIMARY");
    assert.equal(row.official_model_source_urls.length, 0);
  }
  assert.ok(
    result.unknown_facts.some((f) =>
      f.includes("ap-model-first-levoit-rf-rar040-live-browser-v1.results.json"),
    ),
  );
});

test("loadAllRepoModelSlugsForAnchorFilterV1 returns all 6 Vornado carbon pad models for vornado-carbon-pad", () => {
  const slugs = loadAllRepoModelSlugsForAnchorFilterV1(REPO_ROOT, "vornado-carbon-pad");
  assert.equal(slugs.length, 6);
  assert.deepEqual(slugs, [
    "vornado-ac350",
    "vornado-ac500",
    "vornado-ac500b",
    "vornado-ac550",
    "vornado-ac550w",
    "vornado-pc300",
  ]);
});

test("vornado-carbon-pad repo-truth packet covers all compatibility-mapped models as UNKNOWN with safe_apply blocked", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const queue = buildApModelFirstEvidenceQueueV1Report({ modelFirstLane: lane, weakBuyerPathAudit: weak });
  const modelSlugs = loadAllRepoModelSlugsForAnchorFilterV1(REPO_ROOT, "vornado-carbon-pad");
  const result = buildModelFirstEvidenceResultV1({
    rootDir: REPO_ROOT,
    queue,
    anchorFilterSlug: "vornado-carbon-pad",
    modelSlugs,
    writeResult: false,
  });
  assert.equal(result.model_rows.length, 6);
  assert.equal(result.model_slugs_checked.length, 6);
  assert.deepEqual(result.model_slugs_checked, result.model_rows.map((r) => r.model_slug));
  assert.equal(result.evidence_status_counts.UNKNOWN, 6);
  assert.equal(result.evidence_status_counts.PASS, 0);
  assert.equal(result.recommended_csv_mutation, null);
  assert.equal(result.safe_apply_authorized, false);
  assert.equal(result.filter_first_cross_reference?.evidence_status, "UNKNOWN");
  assert.equal(result.filter_first_cross_reference?.exact_token_found, false);
  assert.equal(
    result.filter_first_cross_reference?.rejection_reason,
    "Insufficient proof in repo truth for this candidate.",
  );
  for (const row of result.model_rows) {
    assert.equal(row.evidence_status, "UNKNOWN");
    assert.equal(row.documented_filter_slug, "vornado-carbon-pad");
    assert.equal(row.buyer_path_status, "SEARCH_PLACEHOLDER_PRIMARY");
    assert.equal(row.official_model_source_urls.length, 0);
  }
  assert.ok(
    result.unknown_facts.some((f) =>
      f.includes("ap-model-first-vornado-carbon-pad-live-browser-v1.results.json"),
    ),
  );
});

test("loadAllRepoModelSlugsForAnchorFilterV1 returns all 5 Levoit Core 600 models for levoit-rf-rar060", () => {
  const slugs = loadAllRepoModelSlugsForAnchorFilterV1(REPO_ROOT, "levoit-rf-rar060");
  assert.equal(slugs.length, 5);
  assert.deepEqual(slugs, [
    "levoit-core-600",
    "levoit-core-600s",
    "levoit-core-650s",
    "levoit-lap-c601s-wus",
    "levoit-lap-c651s-wus",
  ]);
});

test("levoit-rf-rar060 repo-truth packet covers all compatibility-mapped models as UNKNOWN with safe_apply blocked", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const queue = buildApModelFirstEvidenceQueueV1Report({ modelFirstLane: lane, weakBuyerPathAudit: weak });
  const modelSlugs = loadAllRepoModelSlugsForAnchorFilterV1(REPO_ROOT, "levoit-rf-rar060");
  const result = buildModelFirstEvidenceResultV1({
    rootDir: REPO_ROOT,
    queue,
    anchorFilterSlug: "levoit-rf-rar060",
    modelSlugs,
    writeResult: false,
  });
  assert.equal(result.model_rows.length, 5);
  assert.equal(result.model_slugs_checked.length, 5);
  assert.deepEqual(result.model_slugs_checked, result.model_rows.map((r) => r.model_slug));
  assert.equal(result.evidence_status_counts.UNKNOWN, 5);
  assert.equal(result.evidence_status_counts.PASS, 0);
  assert.equal(result.recommended_csv_mutation, null);
  assert.equal(result.safe_apply_authorized, false);
  assert.equal(result.filter_first_cross_reference, null);
  for (const row of result.model_rows) {
    assert.equal(row.evidence_status, "UNKNOWN");
    assert.equal(row.documented_filter_slug, "levoit-rf-rar060");
    assert.equal(row.buyer_path_status, "SEARCH_PLACEHOLDER_PRIMARY");
    assert.equal(row.official_model_source_urls.length, 0);
  }
  assert.ok(
    result.unknown_facts.some((f) =>
      f.includes("ap-model-first-levoit-rf-rar060-live-browser-v1.results.json"),
    ),
  );
});
