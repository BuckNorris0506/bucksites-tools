import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  inferTokenCandidatesFromWaterdropText,
  isLinkSynergyImagePixelUrl,
  parseLinkSynergyAffiliateUrl,
  parseWaterdropHtmlSnippet,
} from "./waterdrop-linksynergy-parse-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.."));
const DA29_AFFILIATE =
  "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539508551730292149506115&type=2&murl=https%3a%2f%2fwww.waterdropfilter.com%2fproducts%2fwaterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter%3fvariant%3d33108474495058";
const DA29_PDP =
  "https://www.waterdropfilter.com/products/waterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter?variant=33108474495058";

describe("waterdrop-linksynergy-parse-v1", () => {
  it("parses DA29-00020B LinkSynergy URL from repo evidence", () => {
    const parsed = parseLinkSynergyAffiliateUrl(DA29_AFFILIATE);
    assert.ok(parsed);
    assert.equal(parsed!.is_image_pixel, false);
    assert.equal(parsed!.linksynergy_id, "GTFBcFcCW48");
    assert.ok(parsed!.destination_pdp_url?.includes("da29-00020b"));
    assert.ok(parsed!.destination_pdp_url?.includes("variant=33108474495058"));
  });

  it("excludes LinkSynergy image pixel URLs", () => {
    const pixel =
      "https://ad.linksynergy.com/fs-bin/show?id=GTFBcFcCW48&bids=1888875.539508551730292149506115&type=2&subid=0";
    assert.equal(isLinkSynergyImagePixelUrl(pixel), true);
    assert.equal(parseLinkSynergyAffiliateUrl(pixel)?.is_image_pixel, true);
  });

  it("infers DA29-00020B token from PDP URL and title", () => {
    const tokens = inferTokenCandidatesFromWaterdropText({
      destination_pdp_url: DA29_PDP,
      visible_title: "Waterdrop WDP-F27 Replacement for Samsung DA29-00020B",
    });
    assert.ok(tokens.some((t) => t.includes("DA29-00020B") || t.includes("DA29")));
  });

  it("parses committed HTML fixture anchor", () => {
    const html = readFileSync(
      path.join(REPO_ROOT, "data/waterdrop/fixtures/da29-00020b-linksynergy-anchor.html"),
      "utf8",
    );
    const rows = parseWaterdropHtmlSnippet(html);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.affiliate_url, DA29_AFFILIATE);
    assert.ok(rows[0]!.destination_pdp_url?.includes("waterdropfilter.com"));
    assert.match(rows[0]!.visible_title ?? "", /DA29-00020B/i);
  });
});
