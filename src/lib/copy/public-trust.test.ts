import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ABOUT_PAGE_META_DESCRIPTION,
  buyPathStoreLinksBullet,
  COMPARE_BEFORE_BUY_CHECKLIST_LINES,
  CUSTOMER_UX_DOCTRINE_VERSION,
  formatBuyLinkCheckedYyyyMmDd,
  homePageMetaDescription,
  partIdentityPillLabel,
  primaryStoreLinkBuyCheckFootnote,
} from "@/lib/copy/public-trust";

describe("public-trust copy", () => {
  it("re-exports customer UX doctrine version", () => {
    assert.equal(CUSTOMER_UX_DOCTRINE_VERSION, 1);
  });
  it("home meta avoids loose buying-link jargon", () => {
    const d = homePageMetaDescription("BuckParts");
    assert.match(d, /reviewed store links/i);
    assert.ok(!/buy-link/i.test(d));
    assert.ok(!/verified store links/i.test(d));
  });

  it("about meta uses reviewed-store framing", () => {
    assert.match(ABOUT_PAGE_META_DESCRIPTION, /reviewed store links/i);
    assert.ok(!/buy-link/i.test(ABOUT_PAGE_META_DESCRIPTION));
    assert.ok(!/verified outbound/i.test(ABOUT_PAGE_META_DESCRIPTION));
  });

  it("partIdentityPillLabel maps oem / compatible / unknown", () => {
    assert.equal(partIdentityPillLabel("oem"), "Original part");
    assert.equal(partIdentityPillLabel("compatible"), "Compatible replacement");
    assert.equal(partIdentityPillLabel("unknown"), "Part identity");
  });

  it("buyPathStoreLinksBullet reflects suppress vs show with homeowner-safe wording", () => {
    assert.match(buyPathStoreLinksBullet(true), /No buying options yet/i);
    assert.match(
      buyPathStoreLinksBullet(false),
      /Buying options are shown only when the product page matches this filter number/i,
    );
    assert.ok(!/buy-link/i.test(buyPathStoreLinksBullet(true)));
    assert.ok(!/buy-link/i.test(buyPathStoreLinksBullet(false)));
    assert.ok(!/store buttons/i.test(buyPathStoreLinksBullet(true)));
    assert.ok(!/store links/i.test(buyPathStoreLinksBullet(false)));
  });

  it("formatBuyLinkCheckedYyyyMmDd returns UTC date or null", () => {
    assert.equal(formatBuyLinkCheckedYyyyMmDd("2026-05-04T21:55:01.775Z"), "2026-05-04");
    assert.equal(formatBuyLinkCheckedYyyyMmDd("not-a-date"), null);
  });

  it("primaryStoreLinkBuyCheckFootnote includes date with product-page check phrasing", () => {
    const f = primaryStoreLinkBuyCheckFootnote("2026-05-04T21:55:01.775Z");
    assert.ok(f?.includes("2026-05-04"));
    assert.ok(f?.includes("Shown after BuckParts checks the product page against this filter number"));
    assert.ok(f && !/buy-link/i.test(f));
    assert.ok(f && !/store links/i.test(f));
    assert.ok(f && !/store buttons/i.test(f));
  });

  it("compare checklist is non-empty homeowner guidance", () => {
    assert.ok(COMPARE_BEFORE_BUY_CHECKLIST_LINES.length >= 2);
    assert.ok(COMPARE_BEFORE_BUY_CHECKLIST_LINES.every((line) => !/\bOEM\b/i.test(line)));
  });
});
