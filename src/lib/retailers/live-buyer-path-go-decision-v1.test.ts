import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buyLinkGateFailureKindForGoLink,
  isAffiliateUrlSafeForGoRedirect,
  nextResponseRedirectAffiliateIfSafe,
} from "@/lib/retailers/go-redirect-gate";
import {
  filterRetailerLinksPermittedForFridgeGoContextV1,
  isLiveBuyerPathCtaEligibleV1,
  isLiveBuyerPathLinkPermittedV1,
  resolveLiveBuyerPathGoDecisionV1,
} from "@/lib/retailers/live-buyer-path-go-decision-v1";
import { resetLearnedFailureGuardIndexCacheForTestsV1 } from "@/lib/fridge/fridge-learned-failure-customer-guard-v1";
import { resetSingleFilterFamilyAmbiguityGuardIndexCacheForTestsV1 } from "@/lib/fridge/fridge-single-filter-family-ambiguity-v1";
import { LIVE_BROWSER_TRUTH_MAX_AGE_MS } from "@/lib/retailers/launch-buy-links";
import { filterRealBuyRetailerLinks } from "@/lib/retailers/launch-buy-links";

const PDP = "https://www.amazon.com/dp/B00EXAMPLE";
const now = new Date("2026-06-10T12:00:00.000Z");
const freshCheckedAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
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

  it("clearance wrong_family_tokens_seen prose does not hard-deny /go", () => {
    const link = liveLink({
      browser_truth_notes:
        "Official PDP; Add to Cart present. PROVEN: wrong_family_tokens_seen [] in primary buy box.",
    });
    assert.equal(buyLinkGateFailureKindForGoLink(link), null);
    assert.equal(resolveLiveBuyerPathGoDecisionV1({ link, now }).permitted, true);
    assert.equal(filterRealBuyRetailerLinks([link]).length, 1);
  });

  it("observational not-wrong-family prose does not hard-deny /go", () => {
    const link = liveLink({
      browser_truth_notes: "prior wrong-family flag cleared; not wrong-family in primary product area",
    });
    assert.equal(buyLinkGateFailureKindForGoLink(link), null);
    assert.equal(resolveLiveBuyerPathGoDecisionV1({ link, now }).permitted, true);
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

  it("LT800P 12 hidden / 3 displayed hides model-page CTA and still fail-closes /go", () => {
    resetLearnedFailureGuardIndexCacheForTestsV1();
    resetSingleFilterFamilyAmbiguityGuardIndexCacheForTestsV1();
    const blocked = [
      "lg-lfxc22596d",
      "lg-lfxs30796s",
      "lg-lrmvc2306d",
      "lg-lfxs28566b",
      "lg-lfxc22526d",
      "lg-lrfxs2503b",
      "lg-lrfxs3106w",
      "lg-lupxs3186n",
      "lg-lfcc25426s",
      "lg-lfcs23520s",
      "lg-lsxs27366s",
      "lg-lfxs29566s",
    ];
    const displayed = ["lg-lfxs28596b", "lg-lfxc22596b", "lg-lfcc23596s"];
    const context = {
      fridge_filter_slug: "lt800p",
      fridge_models_for_filter: [...blocked, ...displayed].map((slug) => ({ slug })),
    };
    const link = liveLink({
      retailer_key: "waterdrop",
      affiliate_url: "https://click.linksynergy.com/fs-bin/click?id=example&offerid=1",
      browser_truth_buyable_subtype: "COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE",
    });

    assert.equal(isLiveBuyerPathCtaEligibleV1(link, { now }), true);
    assert.equal(
      isAffiliateUrlSafeForGoRedirect(
        link.retailer_key,
        link.affiliate_url,
        link.browser_truth_classification ?? undefined,
        link.browser_truth_buyable_subtype,
        link.browser_truth_checked_at,
        link.browser_truth_notes,
        {
          fridge_filter_slug: context.fridge_filter_slug,
          fridge_models_for_filter: context.fridge_models_for_filter,
          gated_retailer_link_count: 1,
        },
        { now },
      ),
      false,
    );
    assert.equal(
      isLiveBuyerPathLinkPermittedV1({
        link,
        context: {
          fridge_filter_slug: context.fridge_filter_slug,
          fridge_models_for_filter: context.fridge_models_for_filter,
          gated_retailer_link_count: 1,
        },
        now,
      }),
      false,
    );
    assert.deepEqual(
      filterRetailerLinksPermittedForFridgeGoContextV1([link], context, { now }),
      [],
    );
  });

  it("EDR4RXD1-shaped mapping keeps a gated CTA when /go would permit", () => {
    resetLearnedFailureGuardIndexCacheForTestsV1();
    resetSingleFilterFamilyAmbiguityGuardIndexCacheForTestsV1();
    const models = [
      "whirlpool-wrs571cihz",
      "whirlpool-wrf535smhb",
      "whirlpool-wrs325sdhb",
      "whirlpool-wrs571cihb",
      "whirlpool-wrf540cwhm",
      "whirlpool-wrx986sihv",
      "whirlpool-wrs315sdhv",
      "whirlpool-wrf535sdhz",
      "whirlpool-wrs571sdhz",
      "whirlpool-wrf757sdfz",
      "whirlpool-wrf736sdam",
      "whirlpool-wrx988sibw",
      "whirlpool-wrs571sdam",
      "whirlpool-wrf767sdam",
      "whirlpool-wrs571ciam",
      "whirlpool-wrf757sihz",
      "whirlpool-wrs315sihz",
      "whirlpool-wrf535sibz",
      "whirlpool-wrx735sibz",
      "whirlpool-wrx735sdhz",
      "whirlpool-wrf540cwhz",
    ].map((slug) => ({ slug }));
    const context = {
      fridge_filter_slug: "edr4rxd1",
      fridge_models_for_filter: models,
    };
    const link = liveLink({
      retailer_key: "whirlpool",
      affiliate_url: "https://www.whirlpool.com/accessories/refrigerator-accessories/water-filters/p.edr4rxd1.html",
    });
    assert.equal(
      isAffiliateUrlSafeForGoRedirect(
        link.retailer_key,
        link.affiliate_url,
        link.browser_truth_classification ?? undefined,
        link.browser_truth_buyable_subtype,
        link.browser_truth_checked_at,
        link.browser_truth_notes,
        {
          fridge_filter_slug: context.fridge_filter_slug,
          fridge_models_for_filter: context.fridge_models_for_filter,
          gated_retailer_link_count: 1,
        },
        { now },
      ),
      true,
    );
    assert.equal(
      filterRetailerLinksPermittedForFridgeGoContextV1([link], context, { now }).length,
      1,
    );
  });
});
