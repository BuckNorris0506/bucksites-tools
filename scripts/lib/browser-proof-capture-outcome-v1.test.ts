import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  captureOutcomeParksManufacturerProofRefreshV1,
  classifyBrowserProofCaptureOutcomeFromUnknownDraftV1,
  classifyBrowserProofCaptureOutcomeV1,
} from "./browser-proof-capture-outcome-v1";
import {
  buildBrowserProofCollectorDraftFromFactsV1,
  extractBrowserProofVisibleFactsV1,
} from "./browser-proof-collector-v1";

const REPO_ROOT = process.cwd();
const FPPWFU01_HTTP2_DRAFT_REL =
  "data/fridge/batch-production/drafts/browser-proof-collector/fppwfu01/browser-proof-collector-fppwfu01-0351a889b0a2-2026-08-16T17-16-49-459Z.json";

test("fppwfu01 HTTP2 collector draft is TRANSIENT_NETWORK_FAILURE, not missing evidence", () => {
  const draft = JSON.parse(
    readFileSync(path.join(REPO_ROOT, FPPWFU01_HTTP2_DRAFT_REL), "utf8"),
  ) as unknown;
  const classified = classifyBrowserProofCaptureOutcomeFromUnknownDraftV1(draft);
  assert.equal(classified.capture_outcome, "TRANSIENT_NETWORK_FAILURE");
  assert.equal(classified.reason, "no_page_capture");
  assert.equal(
    captureOutcomeParksManufacturerProofRefreshV1(classified.capture_outcome),
    false,
  );
});

test("PASS with a loaded PDP is SUCCESS and parks refresh", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl:
      "https://www.frigidaire.com/en/p/accessories/water-filters/WF3CB",
    finalUrl: "https://www.frigidaire.com/en/p/accessories/water-filters/WF3CB",
    title: "Frigidaire PureSource 3 Water Filter WF3CB",
    h1: "PureSource 3 Replacement Water Filter WF3CB",
    textSample:
      "OEM Part #WF3CB. PureSource 3. Price $49.99. In Stock. Add to Cart.",
    purchaseActions: ["Add to Cart"],
    expectedToken: "WF3CB",
    forbiddenTokens: ["EPTWFU01"],
    captureSucceeded: true,
    navigationError: null,
  });
  const draft = buildBrowserProofCollectorDraftFromFactsV1({
    input: {
      slug: "wf3cb",
      expected_token: "WF3CB",
      candidate_url:
        "https://www.frigidaire.com/en/p/accessories/water-filters/WF3CB",
      forbidden_tokens: ["EPTWFU01"],
    },
    facts,
  });
  assert.equal(draft.overall_verdict, "PASS");
  assert.equal(draft.capture_outcome, "SUCCESS");
  assert.equal(
    captureOutcomeParksManufacturerProofRefreshV1(draft.capture_outcome),
    true,
  );
});

test("loaded search page with no PDP is NO_EVIDENCE and parks refresh", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl: "https://www.frigidaire.com/en/catalogsearch/result/?q=WF3CB",
    finalUrl: "https://www.frigidaire.com/en/catalogsearch/result/?q=WF3CB",
    title: "Search results for WF3CB",
    h1: "Search Results",
    textSample: "Showing 12 results for WF3CB. Browse related water filters.",
    purchaseActions: [],
    expectedToken: "WF3CB",
    forbiddenTokens: ["EPTWFU01"],
    captureSucceeded: true,
    navigationError: null,
  });
  const draft = buildBrowserProofCollectorDraftFromFactsV1({
    input: {
      slug: "wf3cb",
      expected_token: "WF3CB",
      candidate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=WF3CB",
    },
    facts,
  });
  assert.equal(draft.overall_verdict, "FAIL_AS_PROOF");
  assert.equal(draft.capture_outcome, "NO_EVIDENCE");
  assert.match(draft.capture_outcome_reason, /FAIL_AS_PROOF/);
  assert.equal(
    captureOutcomeParksManufacturerProofRefreshV1(draft.capture_outcome),
    true,
  );
});

test("loaded manufacturer not-found is PERMANENT_SITE_FAILURE and parks refresh", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl: "https://www.frigidaire.com/en/p/accessories/water-filters/WF3CB",
    finalUrl: "https://www.frigidaire.com/en/p/accessories/water-filters/WF3CB",
    title: "Page Not Found",
    h1: "Requested page is not available",
    textSample: "Sorry, the requested page is not available.",
    purchaseActions: [],
    expectedToken: "WF3CB",
    forbiddenTokens: ["EPTWFU01"],
    captureSucceeded: true,
    navigationError: null,
  });
  const draft = buildBrowserProofCollectorDraftFromFactsV1({
    input: {
      slug: "wf3cb",
      expected_token: "WF3CB",
      candidate_url: "https://www.frigidaire.com/en/p/accessories/water-filters/WF3CB",
    },
    facts,
  });
  assert.equal(draft.overall_verdict, "FAIL_AS_PROOF");
  assert.equal(draft.capture_outcome, "PERMANENT_SITE_FAILURE");
  assert.equal(draft.capture_outcome_reason, "page_type=not_found");
  assert.equal(
    captureOutcomeParksManufacturerProofRefreshV1(draft.capture_outcome),
    true,
  );
});

test("loaded Cloudflare/captcha page is TRANSIENT_NETWORK_FAILURE, not NO_EVIDENCE", () => {
  const classified = classifyBrowserProofCaptureOutcomeV1({
    overall_verdict: "UNKNOWN",
    candidates: [
      {
        verdict: "UNKNOWN",
        facts: {
          capture_succeeded: true,
          final_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=FPPWFU01",
          page_type: "blocked",
        },
      },
    ],
  });
  assert.equal(classified.capture_outcome, "TRANSIENT_NETWORK_FAILURE");
  assert.equal(classified.reason, "page_loaded_but_blocked");
  assert.equal(
    captureOutcomeParksManufacturerProofRefreshV1(classified.capture_outcome),
    false,
  );
});

test("headed fallback success is recorded as playwright_headed and not TRANSIENT", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl: "https://www.frigidaire.com/en/catalogsearch/result/?q=FPPWFU01",
    finalUrl: "https://www.frigidaire.com/en/not-found",
    title: "Not Found",
    h1: "",
    textSample: "Sorry ! Requested page is not available…",
    purchaseActions: [],
    expectedToken: "FPPWFU01",
    forbiddenTokens: ["FPPWFU02"],
    captureSucceeded: true,
    navigationError: null,
  });
  const draft = buildBrowserProofCollectorDraftFromFactsV1({
    input: {
      slug: "fppwfu01",
      expected_token: "FPPWFU01",
      candidate_url:
        "https://www.frigidaire.com/en/catalogsearch/result/?q=FPPWFU01",
      forbidden_tokens: ["FPPWFU02"],
    },
    facts,
    captureAttempts: [
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
        attempt_id: "a6_headed_load_desktop_chrome_ua_disable_http2",
        wait_until: "load",
        user_agent_mode: "desktop_chrome",
        user_agent: "chrome",
        headed: true,
        wait_ms: 2000,
        timeout_ms: 48000,
        launch_args: ["--disable-http2"],
        success: true,
        error: null,
        final_url: "https://www.frigidaire.com/en/not-found",
      },
    ],
  });
  assert.equal(draft.capture_method, "playwright_headed");
  assert.equal(draft.capture_outcome, "PERMANENT_SITE_FAILURE");
  assert.equal(draft.overall_verdict, "FAIL_AS_PROOF");
  assert.ok(
    draft.proven_facts.some((f) =>
      f.includes("headed_fallback attempt_id=a6_headed_load_desktop_chrome_ua_disable_http2 success=true"),
    ),
  );
});

test("HTTP2 capture failure draft built by collector is TRANSIENT_NETWORK_FAILURE", () => {
  const facts = extractBrowserProofVisibleFactsV1({
    candidateUrl: "https://www.frigidaire.com/en/catalogsearch/result/?q=FPPWFU01",
    finalUrl: "about:blank",
    title: "",
    h1: "",
    textSample: "",
    purchaseActions: [],
    expectedToken: "FPPWFU01",
    forbiddenTokens: ["FPPWFU02"],
    captureSucceeded: false,
    navigationError: "page.goto: net::ERR_HTTP2_PROTOCOL_ERROR",
  });
  const draft = buildBrowserProofCollectorDraftFromFactsV1({
    input: {
      slug: "fppwfu01",
      expected_token: "FPPWFU01",
      candidate_url:
        "https://www.frigidaire.com/en/catalogsearch/result/?q=FPPWFU01",
      forbidden_tokens: ["FPPWFU02"],
    },
    facts,
    captureAttempts: [
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
    ],
  });
  assert.equal(draft.overall_verdict, "UNKNOWN");
  assert.equal(draft.capture_outcome, "TRANSIENT_NETWORK_FAILURE");
  assert.equal(draft.capture_outcome_reason, "no_page_capture");
  assert.match(draft.recommended_next_action, /temporarily unreachable/);
  assert.match(draft.recommended_next_action, /remains eligible/);
});
