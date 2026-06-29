import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buyLinkGateFailureKindForGoLink,
  isAffiliateUrlSafeForGoRedirect,
  nextResponseRedirectAffiliateIfSafe,
} from "@/lib/retailers/go-redirect-gate";
import {
  isLiveBuyerPathCtaEligibleV1,
  resolveLiveBuyerPathGoDecisionV1,
} from "@/lib/retailers/live-buyer-path-go-decision-v1";
import { LIVE_BROWSER_TRUTH_MAX_AGE_MS } from "@/lib/retailers/launch-buy-links";
import { filterRealBuyRetailerLinks } from "@/lib/retailers/launch-buy-links";

const PDP = "https://www.amazon.com/dp/B00EXAMPLE";
const now = new Date("2026-06-10T12:00:00.000Z");
const freshCheckedAt = "2026-05-01T00:00:00.000Z";
const staleCheckedAt = "2026-01-01T00:00:00.000Z";

function liveLink(overrides: Record<string, unknown> = {}) {
  return {
    retailer_key: "amazon",
    affiliate_url: PDP,
    browser_truth_classification: "direct_buyable",
    browser_truth_buyable_subtype: null,
    browser_truth_checked_at: freshCheckedAt,
    browser_truth_notes: null,
    ...overrides,
  };
}

describe("live-buyer-path-go-decision-v1", () => {
  it("direct_buyable + fresh checked_at redirects", () => {
    const link = liveLink();
    assert.equal(isLiveBuyerPathCtaEligibleV1(link, { now }), true);
    assert.equal(
      isAffiliateUrlSafeForGoRedirect(
        link.retailer_key,
        link.affiliate_url,
        link.browser_truth_classification ?? undefined,
        link.browser_truth_buyable_subtype,
        link.browser_truth_checked_at,
        link.browser_truth_notes,
        undefined,
        { now },
      ),
      true,
    );
    assert.ok(nextResponseRedirectAffiliateIfSafe(
      link.retailer_key,
      link.affiliate_url,
      link.browser_truth_classification ?? undefined,
      link.browser_truth_buyable_subtype,
      link.browser_truth_checked_at,
      link.browser_truth_notes,
      { now },
    ));
  });

  it("direct_buyable + stale checked_at does not redirect", () => {
    const link = liveLink({ browser_truth_checked_at: staleCheckedAt });
    assert.equal(isLiveBuyerPathCtaEligibleV1(link, { now }), false);
    assert.equal(
      isAffiliateUrlSafeForGoRedirect(
        link.retailer_key,
        link.affiliate_url,
        link.browser_truth_classification ?? undefined,
        link.browser_truth_buyable_subtype,
        link.browser_truth_checked_at,
        link.browser_truth_notes,
        undefined,
        { now },
      ),
      false,
    );
    assert.equal(
      nextResponseRedirectAffiliateIfSafe(
        link.retailer_key,
        link.affiliate_url,
        link.browser_truth_classification ?? undefined,
        link.browser_truth_buyable_subtype,
        link.browser_truth_checked_at,
        link.browser_truth_notes,
        { now },
      ),
      null,
    );
  });

  it("direct_buyable + missing checked_at does not redirect", () => {
    const link = liveLink({ browser_truth_checked_at: null });
    assert.equal(isLiveBuyerPathCtaEligibleV1(link, { now }), false);
    assert.equal(
      isAffiliateUrlSafeForGoRedirect(
        link.retailer_key,
        link.affiliate_url,
        link.browser_truth_classification ?? undefined,
        link.browser_truth_buyable_subtype,
        link.browser_truth_checked_at,
        link.browser_truth_notes,
        undefined,
        { now },
      ),
      false,
    );
  });

  it("trust_currency EXPIRED on stale checked_at blocks /go", () => {
    const link = liveLink({ browser_truth_checked_at: staleCheckedAt });
    const decision = resolveLiveBuyerPathGoDecisionV1({ link, now });
    assert.equal(decision.trust_currency.aggregate_status, "EXPIRED");
    assert.equal(decision.permitted, false);
  });

  it("trust_currency UNKNOWN on missing checked_at blocks /go", () => {
    const link = liveLink({ browser_truth_checked_at: null });
    const decision = resolveLiveBuyerPathGoDecisionV1({ link, now });
    assert.equal(decision.trust_currency.aggregate_status, "UNKNOWN");
    assert.equal(decision.permitted, false);
  });

  it("hard deny + direct_buyable does not redirect", () => {
    const link = liveLink({
      browser_truth_notes: "HARD_DO_NOT_USE wrong-family token mismatch",
    });
    const decision = resolveLiveBuyerPathGoDecisionV1({ link, now });
    assert.equal(decision.permitted, false);
    assert.equal(decision.gate_failure, "hard_denied_browser_truth");
    assert.equal(
      isAffiliateUrlSafeForGoRedirect(
        link.retailer_key,
        link.affiliate_url,
        link.browser_truth_classification ?? undefined,
        link.browser_truth_buyable_subtype,
        link.browser_truth_checked_at,
        link.browser_truth_notes,
        undefined,
        { now },
      ),
      false,
    );
  });

  it("BLOCKED_UNSAFE subtype denies despite direct_buyable + fresh checked_at", () => {
    const link = liveLink({ browser_truth_buyable_subtype: "BLOCKED_UNSAFE" });
    assert.equal(resolveLiveBuyerPathGoDecisionV1({ link, now }).permitted, false);
  });

  it("wrong-family notes cannot bypass /go with direct_buyable", () => {
    const link = liveLink({ browser_truth_notes: "WRONG_FAMILY: model mismatch" });
    assert.equal(buyLinkGateFailureKindForGoLink(link), "hard_denied_browser_truth");
    assert.equal(filterRealBuyRetailerLinks([link]).length, 0);
  });

  it("CTA and /go share the same decision result", () => {
    const cases = [
      liveLink(),
      liveLink({ browser_truth_checked_at: staleCheckedAt }),
      liveLink({ browser_truth_checked_at: null }),
      liveLink({ browser_truth_classification: "likely_valid" }),
      liveLink({ browser_truth_notes: "HARD_DO_NOT_USE" }),
    ];
    for (const link of cases) {
      const ctaEligible = isLiveBuyerPathCtaEligibleV1(link, { now });
      const goEligible = isAffiliateUrlSafeForGoRedirect(
        link.retailer_key,
        link.affiliate_url,
        link.browser_truth_classification ?? undefined,
        link.browser_truth_buyable_subtype,
        link.browser_truth_checked_at,
        link.browser_truth_notes,
        undefined,
        { now },
      );
      assert.equal(
        ctaEligible,
        goEligible,
        `CTA/go mismatch for gate=${buyLinkGateFailureKindForGoLink(link, { now })}`,
      );
      assert.equal(
        filterRealBuyRetailerLinks([link]).length > 0,
        ctaEligible,
        "filterRealBuyRetailerLinks must match CTA eligibility",
      );
    }
  });

  it("freshness threshold matches LIVE_BROWSER_TRUTH_MAX_AGE_MS", () => {
    const borderlineMs = now.getTime() - LIVE_BROWSER_TRUTH_MAX_AGE_MS + 60_000;
    const borderline = new Date(borderlineMs).toISOString();
    assert.equal(isLiveBuyerPathCtaEligibleV1(liveLink({ browser_truth_checked_at: borderline }), { now }), true);
    const tooOldMs = now.getTime() - LIVE_BROWSER_TRUTH_MAX_AGE_MS - 60_000;
    const tooOld = new Date(tooOldMs).toISOString();
    assert.equal(isLiveBuyerPathCtaEligibleV1(liveLink({ browser_truth_checked_at: tooOld }), { now }), false);
  });
});
