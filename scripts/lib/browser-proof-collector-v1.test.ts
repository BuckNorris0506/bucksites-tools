import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCaptureAttemptPlanV1,
  buildBrowserProofCollectorDraftFromCandidatesV1,
  buildBrowserProofCollectorDraftFromFactsV1,
  buildCandidateResultFromFactsV1,
  classifyBrowserProofCandidateV1,
  enforceCaptureFailureNeverPassV1,
  extractBrowserProofVisibleFactsV1,
  inferBrowserProofPageTypeV1,
  inferBrowserProofSourceClassV1,
  isSafeEarlyStopPassV1,
  parseBrowserProofCollectorCliArgsV1,
  rankBrowserProofCandidateV1,
  resolveForbiddenTokensV1,
  selectBestBrowserProofCandidateV1,
  selectFollowOnProductUrlsFromHrefsV1,
  type BrowserProofCaptureAttemptV1,
} from "./browser-proof-collector-v1";

test("WF3CB official PDP-like fixture => PASS", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl:
      "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/water-filters/WF3CB",
    finalUrl:
      "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/water-filters/WF3CB",
    title: "Frigidaire PureSource 3 Water Filter WF3CB",
    h1: "PureSource 3 Replacement Water Filter WF3CB",
    textSample:
      "OEM Part #WF3CB. PureSource 3. Price $49.99. In Stock. Add to Cart. Add Subscription.",
    purchaseActions: ["Add to Cart", "Add Subscription"],
    expectedToken: "WF3CB",
    forbiddenTokens: ["EPTWFU01", "ULTRAWF"],
    captureSucceeded: true,
    navigationError: null,
  });

  assert.equal(facts.page_type, "product_pdp");
  assert.equal(facts.source_class, "official_manufacturer_pdp");
  assert.equal(facts.exact_expected_token_present, true);
  assert.deepEqual(facts.forbidden_tokens_present, []);

  const result = classifyBrowserProofCandidateV1(facts);
  assert.equal(result.verdict, "PASS");
  assert.equal(result.blockers.length, 0);
});

test("FrigidaireApplianceParts search page-like fixture => FAIL_AS_PROOF", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl: "https://www.frigidaireapplianceparts.com/Search?q=WF3CB",
    finalUrl: "https://www.frigidaireapplianceparts.com/Search?q=WF3CB",
    title: "Search results for WF3CB",
    h1: "Search Results",
    textSample: "Showing 12 results for WF3CB. Browse related water filters.",
    purchaseActions: [],
    expectedToken: "WF3CB",
    forbiddenTokens: ["EPTWFU01", "ULTRAWF"],
    captureSucceeded: true,
    navigationError: null,
  });

  assert.equal(facts.page_type, "search_page");
  assert.equal(facts.source_class, "search_or_catalog");

  const result = classifyBrowserProofCandidateV1(facts);
  assert.equal(result.verdict, "FAIL_AS_PROOF");
  assert.ok(result.blockers.some((b) => b.includes("page_is_search_not_pdp")));
});

test("forbidden token present => not PASS", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl:
      "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/WF3CB/999",
    finalUrl: "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/WF3CB/999",
    title: "Frigidaire Water Filter WF3CB also lists EPTWFU01",
    h1: "WF3CB / EPTWFU01 Water Filter",
    textSample: "WF3CB PureSource 3. Also see EPTWFU01 PureSource Ultra II. $59.99 In Stock Add to Cart.",
    purchaseActions: ["Add to Cart"],
    expectedToken: "WF3CB",
    forbiddenTokens: ["EPTWFU01", "ULTRAWF"],
    captureSucceeded: true,
    navigationError: null,
  });

  assert.ok(facts.forbidden_tokens_present.includes("EPTWFU01"));
  const result = classifyBrowserProofCandidateV1(facts);
  assert.notEqual(result.verdict, "PASS");
  assert.ok(result.verdict === "UNKNOWN" || result.verdict === "FAIL_AS_PROOF");
});

test("not-found page => FAIL_AS_PROOF", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl:
      "https://www.frigidaire.com/en/p/accessories/water-filters/WF3CB",
    finalUrl: "https://www.frigidaire.com/en/p/accessories/water-filters/WF3CB",
    title: "Page Not Found",
    h1: "Requested page is not available",
    textSample: "Sorry, the requested page is not available.",
    purchaseActions: [],
    expectedToken: "WF3CB",
    forbiddenTokens: ["EPTWFU01", "ULTRAWF"],
    captureSucceeded: true,
    navigationError: null,
  });

  assert.equal(facts.page_type, "not_found");
  const result = classifyBrowserProofCandidateV1(facts);
  assert.equal(result.verdict, "FAIL_AS_PROOF");
});

test("EPTWFU01 PartDetail-like fixture => PASS (prior proof shape)", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl:
      "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/EPTWFU01/3516084",
    finalUrl:
      "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/EPTWFU01/3516084",
    title: "Frigidaire Water Filter EPTWFU01",
    h1: "Frigidaire Water Filter EPTWFU01",
    textSample:
      "Item #3516084. Frigidaire OEM Part #EPTWFU01. PureSource Ultra II. $59.99. In Stock. Add to Cart.",
    purchaseActions: ["Add to Cart"],
    expectedToken: "EPTWFU01",
    forbiddenTokens: ["ULTRAWF", "WF3CB"],
    captureSucceeded: true,
    navigationError: null,
  });

  assert.equal(facts.page_type, "product_pdp");
  assert.equal(facts.source_class, "authorized_parts_distributor_pdp");
  assert.equal(classifyBrowserProofCandidateV1(facts).verdict, "PASS");
});

test("draft never authorizes mutation or owner-proof promotion", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl:
      "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/EPTWFU01/3516084",
    finalUrl:
      "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/EPTWFU01/3516084",
    title: "EPTWFU01",
    h1: "EPTWFU01",
    textSample: "EPTWFU01 $59.99 In Stock Add to Cart",
    purchaseActions: ["Add to Cart"],
    expectedToken: "EPTWFU01",
    forbiddenTokens: ["ULTRAWF", "WF3CB"],
    captureSucceeded: true,
    navigationError: null,
  });

  const draft = buildBrowserProofCollectorDraftFromFactsV1({
    input: {
      slug: "eptwfu01",
      expected_token: "EPTWFU01",
      candidate_url: facts.final_url,
      forbidden_tokens: ["ULTRAWF", "WF3CB"],
    },
    facts,
  });

  assert.equal(draft.mutation_authorized, false);
  assert.equal(draft.promotes_to_owner_browser_proof_result, false);
  assert.equal(draft.founder_approval_authorized, false);
  assert.equal(draft.apply_plan_proposal_justified, false);
  assert.equal(draft.owner_review_required, true);
  assert.equal(draft.confusion_family_owner_review_required, true);
  assert.ok(draft.not_authorized.includes("owner_browser_proof_result_auto_write"));
});

test("wf3cb default forbidden tokens include EPTWFU01 and ULTRAWF", () => {
  assert.deepEqual(resolveForbiddenTokensV1("wf3cb").sort(), ["EPTWFU01", "ULTRAWF"]);
});

test("infer page type and source class for PartDetail vs search", () => {
  assert.equal(
    inferBrowserProofPageTypeV1({
      finalUrl: "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/WF3CB/1",
      title: "WF3CB",
      textSample: "WF3CB",
    }),
    "product_pdp",
  );
  assert.equal(
    inferBrowserProofSourceClassV1({
      finalUrl: "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/WF3CB/1",
      pageType: "product_pdp",
    }),
    "authorized_parts_distributor_pdp",
  );
  assert.equal(
    inferBrowserProofPageTypeV1({
      finalUrl: "https://www.frigidaire.com/en/catalogsearch/result/?q=WF3CB",
      title: "Search",
      textSample: "results",
    }),
    "search_page",
  );
});

test("capture failure remains UNKNOWN and records attempt errors", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl:
      "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB",
    finalUrl: "about:blank",
    title: "",
    h1: "",
    textSample: "",
    purchaseActions: [],
    expectedToken: "WF3CB",
    forbiddenTokens: ["EPTWFU01", "ULTRAWF"],
    captureSucceeded: false,
    navigationError:
      "page.goto: net::ERR_HTTP2_PROTOCOL_ERROR at https://www.frigidaire.com/...",
  });

  const classified = classifyBrowserProofCandidateV1(facts);
  assert.equal(classified.verdict, "UNKNOWN");
  assert.notEqual(classified.verdict, "PASS");

  const attempts: BrowserProofCaptureAttemptV1[] = [
    {
      attempt_id: "a1_domcontentloaded_collector_ua",
      wait_until: "domcontentloaded",
      user_agent_mode: "collector",
      user_agent: "collector",
      headed: false,
      wait_ms: 2000,
      timeout_ms: 48000,
      launch_args: [],
      success: false,
      error: "page.goto: net::ERR_HTTP2_PROTOCOL_ERROR",
      final_url: "about:blank",
    },
    {
      attempt_id: "a4_load_desktop_chrome_ua_disable_http2",
      wait_until: "load",
      user_agent_mode: "desktop_chrome",
      user_agent: "chrome",
      headed: false,
      wait_ms: 2000,
      timeout_ms: 48000,
      launch_args: ["--disable-http2"],
      success: false,
      error: "page.goto: net::ERR_HTTP2_PROTOCOL_ERROR",
      final_url: "about:blank",
    },
  ];

  const draft = buildBrowserProofCollectorDraftFromFactsV1({
    input: {
      slug: "wf3cb",
      expected_token: "WF3CB",
      candidate_url:
        "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB",
      forbidden_tokens: ["EPTWFU01", "ULTRAWF"],
    },
    facts,
    captureAttempts: attempts,
  });


  assert.equal(draft.overall_verdict, "UNKNOWN");
  assert.equal(draft.capture_attempts.length, 2);
  assert.ok(draft.capture_attempts.every((a) => a.success === false));
  assert.ok(draft.capture_attempts.every((a) => Boolean(a.error)));
  assert.ok(
    draft.unknown_facts.some((f) => f.includes("all capture attempts failed")),
  );
  assert.ok(draft.recommended_next_action.includes("a1_domcontentloaded_collector_ua"));
});

test("no failed capture can produce PASS even if classifier is forced", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl: "https://example.com/WF3CB",
    finalUrl: "about:blank",
    title: "WF3CB PureSource 3 $49.99 In Stock Add to Cart",
    h1: "WF3CB",
    textSample: "WF3CB PureSource 3 $49.99 In Stock Add to Cart",
    purchaseActions: ["Add to Cart"],
    expectedToken: "WF3CB",
    forbiddenTokens: ["EPTWFU01", "ULTRAWF"],
    captureSucceeded: false,
    navigationError: "net::ERR_HTTP2_PROTOCOL_ERROR",
  });

  assert.equal(
    enforceCaptureFailureNeverPassV1({ facts, verdict: "PASS" }),
    "UNKNOWN",
  );

  const draft = buildBrowserProofCollectorDraftFromFactsV1({
    input: {
      slug: "wf3cb",
      expected_token: "WF3CB",
      candidate_url:
        "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB",
      forbidden_tokens: ["EPTWFU01", "ULTRAWF"],
    },
    facts,
    captureAttempts: [
      {
        attempt_id: "forced_fail",

        wait_until: "load",
        user_agent_mode: "desktop_chrome",
        user_agent: "chrome",
        headed: false,
        wait_ms: 0,
        timeout_ms: 1000,
        launch_args: ["--disable-http2"],
        success: false,
        error: "net::ERR_HTTP2_PROTOCOL_ERROR",
        final_url: "about:blank",
      },
    ],
  });
  assert.equal(draft.overall_verdict, "UNKNOWN");
  assert.notEqual(draft.candidates[0]?.verdict, "PASS");
});

test("capture attempt plan includes load, networkidle, desktop UA, and http2 mitigation", () => {
  const plan = buildCaptureAttemptPlanV1({ wait_ms: 3000, timeout_ms: 60000 });
  assert.ok(plan.some((p) => p.wait_until === "domcontentloaded"));
  assert.ok(plan.some((p) => p.wait_until === "load"));
  assert.ok(plan.some((p) => p.wait_until === "networkidle"));
  assert.ok(plan.some((p) => p.user_agent_mode === "desktop_chrome"));
  assert.ok(plan.some((p) => p.launch_args.includes("--disable-http2")));
  assert.ok(plan.every((p) => p.wait_ms === 3000));
  assert.ok(plan.every((p) => p.timeout_ms === 60000));
});

function candidateFixture(args: {
  url: string;
  verdictFacts: Parameters<typeof extractBrowserProofVisibleFactsV1>[0];
}): ReturnType<typeof buildCandidateResultFromFactsV1> {
  const facts = extractBrowserProofVisibleFactsV1(args.verdictFacts);
  const candidate = buildCandidateResultFromFactsV1({
    candidateUrl: args.url,
    facts,
  });
  return candidate;
}

test("batch ranking prefers official manufacturer PASS over retailer PASS", () => {
  const official = candidateFixture({
    url: "https://www.frigidaire.com/en/p/accessories/water-filters/WF3CB",
    verdictFacts: {
      candidateUrl: "https://www.frigidaire.com/en/p/accessories/water-filters/WF3CB",
      finalUrl: "https://www.frigidaire.com/en/p/accessories/water-filters/WF3CB",
      title: "WF3CB PureSource 3",
      h1: "WF3CB",
      textSample: "WF3CB PureSource 3 $49.99 In Stock Add to Cart",
      purchaseActions: ["Add to Cart"],
      expectedToken: "WF3CB",
      forbiddenTokens: ["EPTWFU01", "ULTRAWF"],
      captureSucceeded: true,
      navigationError: null,
    },
  });
  const retailer = candidateFixture({
    url: "https://www.lowes.com/pd/Frigidaire-WF3CB/1003164400",
    verdictFacts: {
      candidateUrl: "https://www.lowes.com/pd/Frigidaire-WF3CB/1003164400",
      finalUrl: "https://www.lowes.com/pd/Frigidaire-WF3CB/1003164400",
      title: "WF3CB PureSource 3",
      h1: "WF3CB",
      textSample: "WF3CB PureSource 3 $52.99 In Stock Add to Cart",
      purchaseActions: ["Add to Cart"],
      expectedToken: "WF3CB",
      forbiddenTokens: ["EPTWFU01", "ULTRAWF"],
      captureSucceeded: true,
      navigationError: null,
    },
  });
  const failSearch = candidateFixture({
    url: "https://www.frigidaireapplianceparts.com/Search?q=WF3CB",
    verdictFacts: {
      candidateUrl: "https://www.frigidaireapplianceparts.com/Search?q=WF3CB",
      finalUrl: "https://www.frigidaireapplianceparts.com/Search?q=WF3CB",
      title: "Search results for WF3CB",
      h1: "Search Results",
      textSample: "Showing 12 results for WF3CB",
      purchaseActions: [],
      expectedToken: "WF3CB",
      forbiddenTokens: ["EPTWFU01", "ULTRAWF"],
      captureSucceeded: true,
      navigationError: null,
    },
  });

  assert.equal(official.verdict, "PASS");
  assert.equal(official.facts.source_class, "official_manufacturer_pdp");
  assert.equal(retailer.verdict, "PASS");
  assert.equal(retailer.facts.source_class, "retailer_direct_pdp");
  assert.equal(failSearch.verdict, "FAIL_AS_PROOF");

  assert.ok(rankBrowserProofCandidateV1(official) < rankBrowserProofCandidateV1(retailer));
  assert.ok(rankBrowserProofCandidateV1(retailer) < rankBrowserProofCandidateV1(failSearch));

  const best = selectBestBrowserProofCandidateV1([failSearch, retailer, official]);
  assert.equal(best?.candidate_url, official.candidate_url);

  assert.equal(isSafeEarlyStopPassV1(official), true);
  assert.equal(isSafeEarlyStopPassV1(retailer), false);
  assert.equal(isSafeEarlyStopPassV1(failSearch), false);

  const draft = buildBrowserProofCollectorDraftFromCandidatesV1({
    slug: "wf3cb",
    expectedToken: "WF3CB",
    forbiddenTokens: ["EPTWFU01", "ULTRAWF"],
    candidates: [retailer, official, failSearch],
    collectAll: true,
  });
  assert.equal(draft.batch_mode, true);
  assert.equal(draft.overall_verdict, "PASS");
  assert.equal(draft.best_candidate_url, official.candidate_url);
  assert.equal(draft.mutation_authorized, false);
  assert.equal(draft.promotes_to_owner_browser_proof_result, false);
  assert.equal(draft.owner_review_required, true);
  assert.equal(draft.candidates.length, 3);
});

test("CLI accepts repeated --url and --collect-all", () => {
  const parsed = parseBrowserProofCollectorCliArgsV1([
    "--slug",
    "wf3cb",
    "--token",
    "WF3CB",
    "--url",
    "https://www.frigidaire.com/en/p/accessories/water-filters/WF3CB",
    "--url",
    "https://www.lowes.com/pd/Frigidaire-WF3CB/1003164400",
    "--url",
    "https://www.homedepot.com/p/WF3CB/123",
    "--forbidden",
    "EPTWFU01,ULTRAWF",
    "--headed",
    "--collect-all",
  ]);
  assert.equal(parsed.slug, "wf3cb");
  assert.equal(parsed.urls.length, 3);
  assert.equal(parsed.collect_all, true);
  assert.equal(parsed.headed, true);
  assert.equal("follow_search_to_product_links" in parsed, false);
});

test("Shark /products/ PDP is official manufacturer product_pdp", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl:
      "https://www.sharkclean.com/products/shark-air-purifier-anti-allergen-filter-with-true-hepa-zidHE2FKBAS",
    finalUrl:
      "https://www.sharkclean.com/products/shark-air-purifier-anti-allergen-filter-with-true-hepa-zidHE2FKBAS",
    title: "Shark Air Purifier Anti-Allergen Filter",
    h1: "Anti-Allergen Filter",
    textSample: "HE2FKBAS $39.99 In Stock Add to Cart",
    purchaseActions: ["Add to Cart"],
    expectedToken: "SHARK-HEPA-HP200",
    forbiddenTokens: [],
    captureSucceeded: true,
    navigationError: null,
  });
  assert.equal(facts.page_type, "product_pdp");
  assert.equal(facts.source_class, "official_manufacturer_pdp");
});

test("search-follow keeps same-host product hrefs, drops search/other hosts, caps at 3", () => {
  const pageUrl = "https://www.sharkclean.com/search?q=SHARK-HEPA-HP200";
  const selected = selectFollowOnProductUrlsFromHrefsV1({
    pageUrl,
    hrefs: [
      "/products/shark-air-purifier-anti-allergen-filter-with-true-hepa-zidHE2FKBAS",
      "https://www.sharkclean.com/products/shark-air-purifier-with-true-hepa-zidHP201",
      "https://www.sharkclean.com/search?q=HP200",
      "https://www.amazon.com/dp/B0EXAMPLE",
      "/products/a",
      "/products/b",
      "/products/c",
    ],
    maxFollow: 3,
  });
  assert.equal(selected.length, 3);
  assert.ok(selected.every((u) => u.includes("sharkclean.com/products/")));
  assert.ok(selected.every((u) => !u.includes("/search")));
  assert.ok(!selected.some((u) => u.includes("amazon.com")));
});
