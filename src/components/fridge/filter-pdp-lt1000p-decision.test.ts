import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FilterPdpTrustDecisionSection } from "./FilterPdpTrustDecisionSection";
import { lt1000pSpellingAliases, FilterPdpLt1000pDecisionSection } from "./FilterPdpLt1000pDecisionSection";

test("LT1000P distinguishes original, marketed replacement and unresolved interchangeability without buying authority", () => {
  const html = renderToStaticMarkup(createElement(FilterPdpLt1000pDecisionSection, { compatibleModelCount: 0, buyingOptionsShown: false }));
  const listing = JSON.parse(readFileSync("data/evidence/amazon-lt1000p-live-outcome.2026-05-03.json", "utf8"));
  const manual = JSON.parse(readFileSync("data/manual-evidence/refrigerator/lg-lfxc22596s.json", "utf8"));
  assert.equal(manual.operator_reviewed, true);
  assert.ok(html.includes(manual.source_url));
  assert.match(listing.committed_live_row.browser_truth_notes, /Aftermarket Waterdrop compatible replacement for LT1000P.*not LG OEM/);
  assert.match(html, /has not established verified interchangeability/);
  assert.match(html, /not an LG-made filter/);
  assert.match(html, /does not resolve a model-fit warning/);
  assert.ok(!html.includes('/go/'));
});

test("LT1000P keeps search spellings without promoting other LG codes", () => {
  const aliases = ["LT1000P", "LT 1000 P", "LG LT1000", "LT-1000-P"];
  assert.deepEqual(lt1000pSpellingAliases([...aliases, "LT1000PC", "ADQ74793501", "ADQ74793502", "MDJ64844601"]), aliases);
});

test("LT1000P preserves universal guidance for both model and buying states", () => {
  for (const compatibleModelCount of [0, 2]) {
    for (const buyingOptionsShown of [false, true]) {
      const html = renderToStaticMarkup(createElement(FilterPdpLt1000pDecisionSection, { compatibleModelCount, buyingOptionsShown }));
      const universal = renderToStaticMarkup(createElement(FilterPdpTrustDecisionSection, {
        filterSlug: "lt1000p", oemPartNumber: "LT1000P", compatibleModelCount, buyingOptionsShown,
      }));
      assert.ok(html.includes(universal));
      for (const heading of ["What to compare", "What is uncertain", "Buying options", "What to avoid"]) {
        assert.ok(html.includes(heading));
      }
    }
  }
});
