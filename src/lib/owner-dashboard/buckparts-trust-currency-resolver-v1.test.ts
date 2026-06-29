import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  mergeTrustCurrencyStatusesV1,
  resolveBrowserProofTrustCurrencyV1,
  resolveBuyerPathLinkTrustCurrencyV1,
  resolveRevalidationCadenceTrustCurrencyV1,
  resolveSourceEvidenceIntegrityTrustCurrencyV1,
  trustCurrencyFailsClosedForHomeownerBuyPathV1,
  trustCurrencyFailsClosedForPublicTrustV1,
} from "./buckparts-trust-currency-resolver-v1";

const now = new Date("2026-06-10T12:00:00.000Z");
const fresh = "2026-05-01T00:00:00.000Z";
const stale = "2026-01-01T00:00:00.000Z";

describe("buckparts-trust-currency-resolver-v1", () => {
  it("direct_buyable + fresh checked_at => OK", () => {
    const trust = resolveBuyerPathLinkTrustCurrencyV1({
      link: {
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: fresh,
      },
      now,
    });
    assert.equal(trust.aggregate_status, "OK");
    assert.equal(trust.fail_closed_homeowner_buy_path, false);
  });

  it("direct_buyable + stale checked_at => EXPIRED denied", () => {
    const trust = resolveBuyerPathLinkTrustCurrencyV1({
      link: {
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: stale,
      },
      now,
    });
    assert.equal(trust.aggregate_status, "EXPIRED");
    assert.equal(trust.fail_closed_homeowner_buy_path, true);
  });

  it("direct_buyable + missing checked_at => UNKNOWN denied", () => {
    const trust = resolveBuyerPathLinkTrustCurrencyV1({
      link: {
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: null,
      },
      now,
    });
    assert.equal(trust.aggregate_status, "UNKNOWN");
    assert.equal(trust.fail_closed_homeowner_buy_path, true);
  });

  it("expired revalidation cadence => public trust denied", () => {
    const signal = resolveRevalidationCadenceTrustCurrencyV1({
      next_re_audit_after: "2026-06-01T00:00:00.000Z",
      now,
    });
    assert.equal(signal.status, "EXPIRED");
    assert.equal(trustCurrencyFailsClosedForPublicTrustV1(signal.status), true);
  });

  it("degraded source evidence hash mismatch => DEGRADED denied", () => {
    const signal = resolveSourceEvidenceIntegrityTrustCurrencyV1({
      rootDir: process.cwd(),
      artifact_rel_path: "package.json",
      expected_sha256: "0".repeat(64),
    });
    assert.equal(signal.status, "DEGRADED");
    assert.equal(trustCurrencyFailsClosedForHomeownerBuyPathV1(signal.status), true);
  });

  it("mergeTrustCurrencyStatusesV1 worst wins", () => {
    assert.equal(mergeTrustCurrencyStatusesV1(["OK", "EXPIRED"]), "EXPIRED");
    assert.equal(mergeTrustCurrencyStatusesV1(["DUE_SOON", "DEGRADED"]), "DEGRADED");
    assert.equal(mergeTrustCurrencyStatusesV1(["OK", "UNKNOWN"]), "UNKNOWN");
  });

  it("browser proof DUE_SOON does not fail closed for homeowner buy path", () => {
    const dueSoonCheckedAt = new Date(
      now.getTime() - (90 - 3) * 24 * 60 * 60 * 1000,
    ).toISOString();
    const signal = resolveBrowserProofTrustCurrencyV1({
      checked_at: dueSoonCheckedAt,
      now,
    });
    assert.equal(signal.status, "DUE_SOON");
    assert.equal(trustCurrencyFailsClosedForHomeownerBuyPathV1(signal.status), false);
  });
});
