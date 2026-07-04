import assert from "node:assert/strict";
import test from "node:test";

import {
  BROWSER_PROOF_COLLECTOR_CONTRACT_V1,
  type BrowserProofCollectorDraftV1,
} from "./browser-proof-collector-v1";
import {
  assertCollectorDraftSafeForOwnerReviewBridgeV1,
  buildBrowserProofCollectorOwnerReviewPacketV1,
  resolveBestPassCandidateV1,
} from "./browser-proof-collector-owner-review-bridge-v1";

function passDraftFixture(): BrowserProofCollectorDraftV1 {
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
    generated_at: "2026-07-04T14:52:15.000Z",
    capture_method: "playwright_headed",
    capture_options: {
      headed: true,
      wait_ms: 3000,
      timeout_ms: 60000,
      user_agent_mode: "desktop_chrome",
    },
    capture_attempts: [],
    batch_mode: true,
    collect_all: true,
    early_stop: {
      stopped: false,
      reason: null,
      stopped_after_candidate_url: null,
    },
    best_candidate_url:
      "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB",
    best_candidate_rank: 0,
    slug: "wf3cb",
    expected_token: "WF3CB",
    forbidden_tokens: ["EPTWFU01", "ULTRAWF"],
    confusion_family_owner_review_required: true,
    owner_review_required: true,
    candidates: [
      {
        candidate_url:
          "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB",
        verdict: "PASS",
        blockers: [],
        facts: {
          final_url:
            "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB",
          title: "Frigidaire PureSource 3 Water Filter WF3CB",
          h1: "PureSource 3 Replacement Water Filter WF3CB",
          visible_text_snippet: "WF3CB PureSource 3 $49.99 In Stock Add Subscription",
          exact_expected_token_present: true,
          forbidden_tokens_present: [],
          price_like_text_present: true,
          stock_or_buyability_signal_present: true,
          add_to_cart_or_subscription_signals: ["Add Subscription"],
          unavailable_signal_present: false,
          page_type: "product_pdp",
          source_class: "official_manufacturer_pdp",
          capture_succeeded: true,
          navigation_error: null,
          extraction_uncertain: false,
        },
        screenshot_rel_path:
          "data/fridge/batch-production/drafts/browser-proof-collector/wf3cb/screenshots/example.png",
        assessment: "PASS: product PDP",
        capture_attempts: [
          {
            attempt_id: "a3_load_desktop_chrome_ua",
            wait_until: "load",
            user_agent_mode: "desktop_chrome",
            user_agent: "chrome",
            headed: true,
            wait_ms: 3000,
            timeout_ms: 60000,
            launch_args: [],
            success: true,
            error: null,
            final_url:
              "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB",
          },
        ],
      },
      {
        candidate_url:
          "https://www.lowes.com/pd/Frigidaire-PureSource-174-3-Replacement-Water-Filter/1003164400",
        verdict: "FAIL_AS_PROOF",
        blockers: ["page_blocked"],
        facts: {
          final_url:
            "https://www.lowes.com/pd/Frigidaire-PureSource-174-3-Replacement-Water-Filter/1003164400",
          title: "Access Denied",
          h1: "",
          visible_text_snippet: "Access Denied",
          exact_expected_token_present: false,
          forbidden_tokens_present: [],
          price_like_text_present: false,
          stock_or_buyability_signal_present: false,
          add_to_cart_or_subscription_signals: [],
          unavailable_signal_present: false,
          page_type: "blocked",
          source_class: "unknown",
          capture_succeeded: true,
          navigation_error: null,
          extraction_uncertain: false,
        },
        screenshot_rel_path: null,
        assessment: "FAIL_AS_PROOF: blocked",
        capture_attempts: [],
      },
    ],
    overall_verdict: "PASS",
    recommended_next_action: "Owner review",
    proven_facts: [],
    unknown_facts: [],
    not_authorized: [],
  };
}

test("bridge requires PASS collector draft", () => {
  const draft = passDraftFixture();
  draft.overall_verdict = "UNKNOWN";
  const gate = assertCollectorDraftSafeForOwnerReviewBridgeV1(draft);
  assert.equal(gate.ok, false);
});

test("bridge builds owner-review packet without activating proof/evidence", () => {
  const draft = passDraftFixture();
  const best = resolveBestPassCandidateV1(draft);
  assert.ok(best);
  assert.equal(best?.verdict, "PASS");

  const packet = buildBrowserProofCollectorOwnerReviewPacketV1({
    draft,
    sourceCollectorDraftRelPath:
      "data/fridge/batch-production/drafts/browser-proof-collector/wf3cb/example-batch.json",
    sourceCollectorDraftSha256: "abc123",
  });

  assert.equal(packet.contract, "browser_proof_collector_owner_review_packet_v1");
  assert.equal(packet.owner_acceptance_required, true);
  assert.equal(packet.owner_acceptance_status, "PENDING_OWNER_ACCEPTANCE");
  assert.equal(packet.activates_owner_browser_proof_result, false);
  assert.equal(packet.activates_evidence_json, false);
  assert.equal(packet.promotes_to_owner_browser_proof_result, false);
  assert.equal(packet.founder_approval_authorized, false);
  assert.equal(packet.mutation_authorized, false);
  assert.equal(packet.csv_apply_authorized, false);
  assert.equal(packet.supabase_mutation_authorized, false);
  assert.equal(packet.best_candidate.source_class, "official_manufacturer_pdp");
  assert.equal(packet.best_candidate.official_pass_class, true);
  assert.equal(packet.best_candidate.exact_expected_token_present, true);
  assert.deepEqual(packet.best_candidate.forbidden_tokens_present, []);
  assert.equal(
    packet.proposed_owner_browser_proof_result_preview.activation_status,
    "DRAFT_ONLY_NOT_ACTIVATED",
  );
  assert.equal(
    packet.proposed_evidence_preview.activation_status,
    "DRAFT_ONLY_NOT_ACTIVATED",
  );
  assert.ok(packet.failed_or_non_best_candidates.some((c) => c.candidate_url.includes("lowes")));
  assert.ok(packet.not_authorized.includes("owner_browser_proof_result_auto_write"));
  assert.ok(packet.not_authorized.includes("founder_approval_auto_create"));
  assert.equal(packet.confusion_family_owner_review_required, true);
});

test("bridge refuses forbidden tokens on best candidate", () => {
  const draft = passDraftFixture();
  draft.candidates[0]!.facts.forbidden_tokens_present = ["EPTWFU01"];
  const gate = assertCollectorDraftSafeForOwnerReviewBridgeV1(draft);
  assert.equal(gate.ok, false);
});
