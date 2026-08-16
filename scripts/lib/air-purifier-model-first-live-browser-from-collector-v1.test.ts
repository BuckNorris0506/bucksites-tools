import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { isFounderRegistryRowActiveMutationApproval } from "@/lib/owner-dashboard/founder-decision-registry-v1";

import {
  AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1,
  AP_MODEL_FIRST_EVIDENCE_PACKETS_DIR_REL_V1,
  type ApModelFirstEvidenceQueueReportV1,
} from "./ap-model-first-evidence-queue-v1";
import { AP_MODEL_FIRST_EVIDENCE_RESULT_WRITE_GRANT_REL_V1 } from "./ap-model-first-evidence-result-write-from-queue-v1";
import {
  isAllowedModelFirstLiveBrowserEvidenceResultRelPathV1,
  modelFirstLiveBrowserResultRelPathV1,
  validateModelFirstEvidenceResultV1,
} from "./air-purifier-model-first-evidence-result-v1";
import {
  BROWSER_PROOF_COLLECTOR_CONTRACT_V1,
  extractBrowserProofVisibleFactsV1,
  buildCandidateResultFromFactsV1,
  type BrowserProofCollectorDraftV1,
} from "./browser-proof-collector-v1";
import {
  extractFamilyDiscoveryTokensFromSlugV1,
  extractFirstPartyDiscoveryTokensFromNotesV1,
  loadApModelFirstLiveBrowserSeedInputsV1,
  mapCollectorCandidateToLiveBrowserBuyerPathV1,
  parseApModelFirstEvidenceQueueReporterArgsV1,
  selectCompletedCandidateMissingLiveBrowserFileV1,
  writeCompletedCandidateLiveBrowserEvidenceIfGrantActiveV1,
} from "./air-purifier-model-first-live-browser-from-collector-v1";

const REPO_ROOT = process.cwd();
const NOW = new Date("2026-08-16T16:00:00.000Z");
const NOW_ISO = NOW.toISOString();

function liveGrantDoc(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(REPO_ROOT, AP_MODEL_FIRST_EVIDENCE_RESULT_WRITE_GRANT_REL_V1), "utf8"),
  ) as Record<string, unknown>;
}

function withGrantRow(overrides: Record<string, unknown>): Record<string, unknown> {
  const doc = liveGrantDoc();
  const rows = doc.rows as Array<Record<string, unknown>>;
  return { ...doc, rows: [{ ...rows[0], ...overrides }] };
}

function completedQueue(): ApModelFirstEvidenceQueueReportV1 {
  return {
    contract: AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: NOW_ISO,
    source_status: "PROVEN",
    queue_status: "READY",
    candidate_count: 1,
    merged_candidate_count: 2,
    top_candidates: [
      {
        filter_slug: "shark-hepa-hp400",
        brand_slug: "shark",
        model_count_using_filter: 1,
        buyer_path_weakness_class: "SEARCH_PLACEHOLDER_PRIMARY",
        evidence_priority_score: 90,
        sample_model_slugs: ["shark-hp401"],
        sample_model_numbers: ["HP401"],
        intended_evidence_path:
          "official model/support/manual page → documented replacement filter/part → verified safe buyer path (read-only browser proof; no CSV apply)",
        do_not_claim_unavailable: true,
      },
    ],
    completed_no_mutation_candidates: [
      {
        filter_slug: "holmes-hapf30",
        brand_slug: "holmes",
        model_count_using_filter: 5,
        buyer_path_weakness_class: "SEARCH_PLACEHOLDER_PRIMARY",
        evidence_priority_score: 80,
        sample_model_slugs: ["holmes-hap412bcs"],
        sample_model_numbers: ["HAP412BCS"],
        intended_evidence_path:
          "official model/support/manual page → documented replacement filter/part → verified safe buyer path (read-only browser proof; no CSV apply)",
        do_not_claim_unavailable: true,
        completion_reason: "completed_model_first_no_mutation",
        result_artifact_rel:
          "data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-holmes-hapf30-v1.results.json",
        result_pass_count: 0,
        retry_hint: "test",
      },
      {
        filter_slug: "shark-hepa-hp200",
        brand_slug: "shark",
        model_count_using_filter: 6,
        buyer_path_weakness_class: "SEARCH_PLACEHOLDER_PRIMARY",
        evidence_priority_score: 83,
        sample_model_slugs: ["shark-hp200"],
        sample_model_numbers: ["Shark HP200"],
        intended_evidence_path:
          "official model/support/manual page → documented replacement filter/part → verified safe buyer path (read-only browser proof; no CSV apply)",
        do_not_claim_unavailable: true,
        completion_reason: "completed_model_first_no_mutation",
        result_artifact_rel:
          "data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-shark-hepa-hp200-v1.results.json",
        result_pass_count: 0,
        retry_hint: "test",
      },
    ],
    mapping_review_opportunities: [],
    result_history: {
      completed_result_count: 2,
      completed_filter_slugs: ["holmes-hapf30", "shark-hepa-hp200"],
      no_mutation_completed_filter_slugs: ["holmes-hapf30", "shark-hepa-hp200"],
      mapping_review_required_filter_slugs: [],
      invalid_result_files: [],
    },
    recommended_packet: null,
    why_model_first: "test",
    old_filter_first_drift_risk: "test",
    forbidden_mutations: [],
    steering_primary_eligible: true,
    demoted_batch_subsystem: null,
    proven_facts: [],
    unknown_facts: [],
  };
}

function makeTempRoot(grantDoc: unknown): string {
  const tmp = path.join(os.tmpdir(), `ap-mf-live-${process.pid}-${Date.now()}-${Math.random()}`);
  mkdirSync(path.join(tmp, "data/owner-decisions"), { recursive: true });
  mkdirSync(path.join(tmp, "data/air-purifier/batch-production/agent-results-model-first-v1"), {
    recursive: true,
  });
  writeFileSync(
    path.join(tmp, AP_MODEL_FIRST_EVIDENCE_RESULT_WRITE_GRANT_REL_V1),
    `${JSON.stringify(grantDoc, null, 2)}\n`,
    "utf8",
  );
  for (const name of [
    "models.csv",
    "filters.csv",
    "retailer_links.csv",
    "compatibility_mappings.csv",
  ]) {
    symlinkSync(path.join(REPO_ROOT, "data/air-purifier", name), path.join(tmp, "data/air-purifier", name));
  }
  writeFileSync(
    path.join(
      tmp,
      "data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-holmes-hapf30-live-browser-v1.results.json",
    ),
    "{}\n",
    "utf8",
  );
  return tmp;
}

function collectorDraft(args: {
  slug: string;
  token: string;
  candidates: BrowserProofCollectorDraftV1["candidates"];
}): BrowserProofCollectorDraftV1 {
  return {
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
    generated_at: NOW_ISO,
    capture_method: "fixture_only",
    capture_options: {
      headed: false,
      wait_ms: 0,
      timeout_ms: 1000,
      user_agent_mode: "collector",
    },
    capture_attempts: [],
    batch_mode: args.candidates.length > 1,
    collect_all: true,
    early_stop: { stopped: false, reason: null, stopped_after_candidate_url: null },
    best_candidate_url: args.candidates[0]?.candidate_url ?? null,
    best_candidate_rank: 0,
    slug: args.slug,
    expected_token: args.token,
    forbidden_tokens: [],
    confusion_family_owner_review_required: false,
    owner_review_required: true,
    candidates: args.candidates,
    overall_verdict: "UNKNOWN",
    recommended_next_action: "test",
    proven_facts: [],
    unknown_facts: [],
    not_authorized: [],
  };
}

test("reporter live-browser-only flag is the only extra switch", () => {
  assert.deepEqual(parseApModelFirstEvidenceQueueReporterArgsV1([]), { live_browser_only: false });
  assert.deepEqual(parseApModelFirstEvidenceQueueReporterArgsV1(["--live-browser-only"]), {
    live_browser_only: true,
  });
});

test("repo seed inputs for shark-hepa-hp200 come from filters.csv + retailer_links, not CLI", () => {
  const seeds = loadApModelFirstLiveBrowserSeedInputsV1({
    rootDir: REPO_ROOT,
    filterSlug: "shark-hepa-hp200",
  });
  assert.equal(seeds.ok, true);
  if (!seeds.ok) return;
  assert.equal(seeds.token, "SHARK-HEPA-HP200");
  assert.ok(seeds.seed_urls.some((u) => u.includes("sharkclean.com")));
  assert.ok(seeds.seed_urls.every((u) => typeof u === "string" && u.startsWith("http")));
});

test("HE2FKBAS from models.csv notes is a discovery query only; catalog token stays SHARK-HEPA-HP200", () => {
  assert.deepEqual(
    extractFirstPartyDiscoveryTokensFromNotesV1(
      "SharkNinja first-party HE2FKBAS compatibility list includes HP200.",
    ),
    ["HE2FKBAS"],
  );
  assert.deepEqual(extractFamilyDiscoveryTokensFromSlugV1("shark-hepa-hp200"), ["HP200"]);
  const seeds = loadApModelFirstLiveBrowserSeedInputsV1({
    rootDir: REPO_ROOT,
    filterSlug: "shark-hepa-hp200",
  });
  assert.equal(seeds.ok, true);
  if (!seeds.ok) return;
  assert.equal(seeds.token, "SHARK-HEPA-HP200");
  assert.ok(seeds.discovery_tokens.includes("HE2FKBAS"));
  assert.ok(!seeds.discovery_tokens.includes("SHARK-HEPA-HP200"));
  assert.ok(
    seeds.seed_urls.some(
      (u) => u.includes("sharkclean.com") && /[?&]q=HE2FKBAS\b/i.test(u),
    ),
  );
  assert.ok(
    seeds.seed_urls.some(
      (u) => u.includes("sharkninja.com") && /[?&]q=HE2FKBAS\b/i.test(u),
    ),
  );
  assert.ok(seeds.seed_urls.every((u) => !u.includes("zidHE2FKBAS")));
});

test("completed candidate selection skips existing live-browser files and does not pick current top", () => {
  const tmp = makeTempRoot(liveGrantDoc());
  try {
    const selected = selectCompletedCandidateMissingLiveBrowserFileV1({
      queue: completedQueue(),
      rootDir: tmp,
    });
    assert.ok(selected);
    assert.equal(selected?.filter_slug, "shark-hepa-hp200");
    assert.notEqual(selected?.filter_slug, "shark-hepa-hp400");
    assert.notEqual(selected?.filter_slug, "holmes-hapf30");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("selector retries PASS=0 empty-path live-browser artifact and skips invalid holmes file", () => {
  const tmp = makeTempRoot(liveGrantDoc());
  try {
    const hp200Rel = modelFirstLiveBrowserResultRelPathV1("shark-hepa-hp200");
    writeFileSync(
      path.join(tmp, hp200Rel),
      readFileSync(path.join(REPO_ROOT, hp200Rel), "utf8"),
    );
    const selected = selectCompletedCandidateMissingLiveBrowserFileV1({
      queue: completedQueue(),
      rootDir: tmp,
    });
    assert.equal(selected?.filter_slug, "shark-hepa-hp200");
    assert.notEqual(selected?.filter_slug, "holmes-hapf30");
    assert.notEqual(selected?.filter_slug, "shark-hepa-hp400");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("manufacturer search captures cannot become candidate_buyer_paths", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl: "https://www.sharkclean.com/search?q=SHARK-HEPA-HP200",
    finalUrl: "https://www.sharkclean.com/search?q=SHARK-HEPA-HP200",
    title: "Search",
    h1: "Search results",
    textSample: "Showing results for SHARK-HEPA-HP200",
    purchaseActions: [],
    expectedToken: "SHARK-HEPA-HP200",
    forbiddenTokens: [],
    captureSucceeded: true,
    navigationError: null,
  });
  const candidate = buildCandidateResultFromFactsV1({
    candidateUrl: "https://www.sharkclean.com/search?q=SHARK-HEPA-HP200",
    facts,
  });
  assert.equal(
    mapCollectorCandidateToLiveBrowserBuyerPathV1({
      candidate,
      expectedToken: "SHARK-HEPA-HP200",
    }),
    null,
  );
});

test("inactive grant does not write a live-browser artifact", async () => {
  const tmp = makeTempRoot(withGrantRow({ decision_status: "deferred" }));
  try {
    const outcome = await writeCompletedCandidateLiveBrowserEvidenceIfGrantActiveV1({
      rootDir: tmp,
      queue: completedQueue(),
      now: () => NOW,
      runCollector: async () => {
        throw new Error("collector_must_not_run");
      },
    });
    assert.equal(outcome.wrote, false);
    assert.equal(outcome.blocked_reason, "grant_not_approved_or_inactive");
    assert.equal(
      existsSync(path.join(tmp, modelFirstLiveBrowserResultRelPathV1("shark-hepa-hp200"))),
      false,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("mocked collector writes only the live-browser destination; search-only stays PASS=0 and validates", async () => {
  const tmp = makeTempRoot(liveGrantDoc());
  const csvBefore = {
    models: readFileSync(path.join(REPO_ROOT, "data/air-purifier/models.csv"), "utf8"),
    filters: readFileSync(path.join(REPO_ROOT, "data/air-purifier/filters.csv"), "utf8"),
    links: readFileSync(path.join(REPO_ROOT, "data/air-purifier/retailer_links.csv"), "utf8"),
    compat: readFileSync(path.join(REPO_ROOT, "data/air-purifier/compatibility_mappings.csv"), "utf8"),
  };
  try {
    const searchFacts = extractBrowserProofVisibleFactsV1({
      candidateUrl: "https://www.sharkclean.com/search?q=SHARK-HEPA-HP200",
      finalUrl: "https://www.sharkclean.com/search?q=SHARK-HEPA-HP200",
      title: "Search",
      h1: "Search results",
      textSample: "Showing results for SHARK-HEPA-HP200",
      purchaseActions: [],
      expectedToken: "SHARK-HEPA-HP200",
      forbiddenTokens: [],
      captureSucceeded: true,
      navigationError: null,
    });
    const outcome = await writeCompletedCandidateLiveBrowserEvidenceIfGrantActiveV1({
      rootDir: tmp,
      queue: completedQueue(),
      now: () => NOW,
      runCollector: async () => ({
        draft: collectorDraft({
          slug: "shark-hepa-hp200",
          token: "SHARK-HEPA-HP200",
          candidates: [
            buildCandidateResultFromFactsV1({
              candidateUrl: "https://www.sharkclean.com/search?q=SHARK-HEPA-HP200",
              facts: searchFacts,
            }),
          ],
        }),
        draft_json_rel: null,
      }),
    });
    assert.equal(outcome.wrote, true);
    assert.equal(outcome.blocked_reason, null);
    assert.equal(outcome.grant_mutation_approval_active, false);
    assert.equal(outcome.anchor_filter_slug, "shark-hepa-hp200");
    assert.equal(outcome.packets_written, false);
    assert.equal(outcome.data_mutation, false);
    assert.ok(isAllowedModelFirstLiveBrowserEvidenceResultRelPathV1(outcome.result_rel ?? ""));
    const abs = path.join(tmp, outcome.result_rel!);
    const parsed: unknown = JSON.parse(readFileSync(abs, "utf8"));
    assert.equal(validateModelFirstEvidenceResultV1(parsed), true);
    const result = parsed as {
      evidence_mode: string;
      candidate_buyer_paths: unknown[];
      evidence_status_counts: { PASS: number };
      safe_apply_authorized: boolean;
    };
    assert.equal(result.evidence_mode, "live_browser_model_first_v1");
    assert.equal(result.candidate_buyer_paths.length, 0);
    assert.equal(result.evidence_status_counts.PASS, 0);
    assert.equal(result.safe_apply_authorized, false);
    assert.equal(existsSync(path.join(tmp, AP_MODEL_FIRST_EVIDENCE_PACKETS_DIR_REL_V1)), false);
    assert.equal(readFileSync(path.join(tmp, "data/air-purifier/models.csv"), "utf8"), csvBefore.models);
    assert.equal(readFileSync(path.join(tmp, "data/air-purifier/filters.csv"), "utf8"), csvBefore.filters);
    assert.equal(
      readFileSync(path.join(tmp, "data/air-purifier/retailer_links.csv"), "utf8"),
      csvBefore.links,
    );
    assert.equal(
      readFileSync(path.join(tmp, "data/air-purifier/compatibility_mappings.csv"), "utf8"),
      csvBefore.compat,
    );
    const grantRow = (liveGrantDoc().rows as Array<Record<string, unknown>>)[0]!;
    assert.equal(
      isFounderRegistryRowActiveMutationApproval(
        grantRow as never,
        NOW_ISO,
      ),
      false,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("PDP with exact token can yield a PASS buyer path without inventing search URLs", async () => {
  const tmp = makeTempRoot(liveGrantDoc());
  try {
    const pdpFacts = extractBrowserProofVisibleFactsV1({
      candidateUrl:
        "https://www.sharkclean.com/products/shark-air-purifier-anti-allergen-filter-with-true-hepa-zidHE2FKBAS",
      finalUrl:
        "https://www.sharkclean.com/products/shark-air-purifier-anti-allergen-filter-with-true-hepa-zidHE2FKBAS",
      title: "Shark HEPA SHARK-HEPA-HP200",
      h1: "SHARK-HEPA-HP200 HP200",
      textSample: "SHARK-HEPA-HP200 HP200 $39.99 In Stock Add to Cart",
      purchaseActions: ["Add to Cart"],
      expectedToken: "SHARK-HEPA-HP200",
      forbiddenTokens: [],
      captureSucceeded: true,
      navigationError: null,
    });
    const outcome = await writeCompletedCandidateLiveBrowserEvidenceIfGrantActiveV1({
      rootDir: tmp,
      queue: completedQueue(),
      now: () => NOW,
      runCollector: async () => ({
        draft: collectorDraft({
          slug: "shark-hepa-hp200",
          token: "SHARK-HEPA-HP200",
          candidates: [
            buildCandidateResultFromFactsV1({
              candidateUrl:
                "https://www.sharkclean.com/products/shark-air-purifier-anti-allergen-filter-with-true-hepa-zidHE2FKBAS",
              facts: pdpFacts,
            }),
          ],
        }),
        draft_json_rel: null,
      }),
    });
    assert.equal(outcome.wrote, true);
    const parsed = JSON.parse(readFileSync(path.join(tmp, outcome.result_rel!), "utf8")) as {
      candidate_buyer_paths: Array<{ url: string; status: string }>;
      evidence_status_counts: { PASS: number };
      evidence_mode: string;
    };
    assert.equal(validateModelFirstEvidenceResultV1(parsed), true);
    assert.equal(parsed.evidence_mode, "live_browser_model_first_v1");
    assert.equal(parsed.candidate_buyer_paths.length, 1);
    assert.equal(parsed.candidate_buyer_paths[0]?.status, "PASS");
    assert.ok(!parsed.candidate_buyer_paths[0]?.url.includes("/search"));
    assert.ok(parsed.evidence_status_counts.PASS >= 1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("HE2FKBAS PDP without catalog token is not buyer-path PASS or fit proof", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl: "https://www.sharkninja.com/hp200-hepa-filter/HE2FKBAS.html",
    finalUrl: "https://www.sharkninja.com/hp200-hepa-filter/HE2FKBAS.html",
    title: "Shark HE2FKBAS",
    h1: "HE2FKBAS",
    textSample: "HE2FKBAS HP200 $39.99 In Stock Add to Cart",
    purchaseActions: ["Add to Cart"],
    expectedToken: "SHARK-HEPA-HP200",
    forbiddenTokens: [],
    captureSucceeded: true,
    navigationError: null,
  });
  const candidate = buildCandidateResultFromFactsV1({
    candidateUrl: "https://www.sharkninja.com/hp200-hepa-filter/HE2FKBAS.html",
    facts,
  });
  const mapped = mapCollectorCandidateToLiveBrowserBuyerPathV1({
    candidate,
    expectedToken: "SHARK-HEPA-HP200",
  });
  assert.ok(mapped);
  assert.notEqual(mapped?.status, "PASS");
  assert.equal(facts.exact_expected_token_present, false);
  assert.equal(facts.page_type, "product_pdp");
  assert.equal(facts.source_class, "official_manufacturer_pdp");
});
