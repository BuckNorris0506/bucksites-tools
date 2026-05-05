import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ABOUT_PAGE_META_DESCRIPTION,
  buyPathStoreLinksBullet,
  COMPARE_BEFORE_BUY_CHECKLIST_LINES,
  formatBuyLinkCheckedYyyyMmDd,
  homePageMetaDescription,
  partIdentityPillLabel,
  primaryStoreLinkBuyCheckFootnote,
} from "@/lib/copy/public-trust";

describe("public-trust copy", () => {
  it("home meta avoids loose ‘verified store links’ wording", () => {
    const d = homePageMetaDescription("BuckParts");
    assert.match(d, /pass BuckParts buy-link checks/i);
    assert.ok(!/verified store links/i.test(d));
  });

  it("about meta uses buy-link-check framing", () => {
    assert.match(ABOUT_PAGE_META_DESCRIPTION, /pass BuckParts buy-link checks/i);
    assert.ok(!/verified outbound/i.test(ABOUT_PAGE_META_DESCRIPTION));
  });

  it("partIdentityPillLabel maps oem / compatible / unknown", () => {
    assert.equal(partIdentityPillLabel("oem"), "OEM part");
    assert.equal(partIdentityPillLabel("compatible"), "Compatible replacement");
    assert.equal(partIdentityPillLabel("unknown"), "Part identity");
  });

  it("buyPathStoreLinksBullet reflects suppress vs show", () => {
    assert.match(buyPathStoreLinksBullet(true), /not shown until they pass BuckParts buy-link checks/i);
    assert.match(buyPathStoreLinksBullet(false), /passed BuckParts buy-link checks/i);
  });

  it("formatBuyLinkCheckedYyyyMmDd returns UTC date or null", () => {
    assert.equal(formatBuyLinkCheckedYyyyMmDd("2026-05-04T21:55:01.775Z"), "2026-05-04");
    assert.equal(formatBuyLinkCheckedYyyyMmDd("not-a-date"), null);
  });

  it("primaryStoreLinkBuyCheckFootnote includes date and stock caveat", () => {
    const f = primaryStoreLinkBuyCheckFootnote("2026-05-04T21:55:01.775Z");
    assert.ok(f?.includes("2026-05-04"));
    assert.ok(f?.toLowerCase().includes("may have changed"));
  });

  it("compare checklist is non-empty homeowner guidance", () => {
    assert.ok(COMPARE_BEFORE_BUY_CHECKLIST_LINES.length >= 2);
  });
});
