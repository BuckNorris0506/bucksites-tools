import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  BUCKPARTS_ICON_LOGO_PATH,
} from "@/lib/brand/buckparts-brand-assets-v1";

const root = (...parts: string[]) => join(process.cwd(), ...parts);

describe("brand header + PDP package v1", () => {
  it("uses shared founder-approved PNG logo in SiteHeader", () => {
    const header = readFileSync(root("src", "components", "SiteHeader.tsx"), "utf8");
    const logo = readFileSync(root("src", "components", "brand", "BuckPartsBrandLogo.tsx"), "utf8");
    assert.ok(header.includes("BuckPartsBrandHomeLink"));
    assert.ok(logo.includes("BUCKPARTS_HORIZONTAL_LOGO_PATH"));
    assert.ok(!header.includes("BrandMark"));
    assert.ok(!header.includes("buckparts-horizontal-lockup-v1.svg"));
    assert.ok(readFileSync(root("public", "brand", "buckparts-horizontal.png")).byteLength > 1000);
  });

  it("homepage section order and hero omits parts-store trust line", () => {
    const page = readFileSync(root("src", "app", "page.tsx"), "utf8");
    const lookup = readFileSync(root("src", "components", "homepage", "HomeLookup.tsx"), "utf8");
    const heroIdx = page.indexOf("HomeLookup");
    const exampleIdx = page.indexOf("RealLookupExample");
    const trustIdx = page.indexOf("<HomeTrustEvidenceSection");
    const scopeIdx = page.indexOf("bp-home__scope");
    const buyIdx = page.indexOf("<HomeWhereToBuySection");
    assert.ok(heroIdx >= 0 && exampleIdx > heroIdx);
    assert.ok(trustIdx > exampleIdx);
    assert.ok(scopeIdx > trustIdx);
    assert.ok(buyIdx > scopeIdx);
    assert.ok(!lookup.includes("HOME_TRUST_LINE"));
    assert.ok(!lookup.includes("We’re not a parts store"));
    assert.ok(page.includes("HomeWhereToBuySection"));
  });

  it("model PDP wiring: answer before buy and help; prominent no-buy copy", () => {
    const fridgePage = readFileSync(root("src", "app", "fridge", "[slug]", "page.tsx"), "utf8");
    const card = readFileSync(root("src", "components", "trust", "VisualReplacementMatchCard.tsx"), "utf8");
    assert.ok(card.includes("Your model"));
    assert.ok(card.includes("FRIDGE_MODEL_PDP_CARTRIDGE_CONFIRMATION"));
    assert.ok(fridgePage.includes("FridgeModelPdpProminentBuySection"));
    const jsx = fridgePage.slice(fridgePage.indexOf("return ("));
    const answerIdx = jsx.indexOf("<VisualReplacementMatchCard");
    const buyIdx = jsx.indexOf("<FridgeModelPdpProminentBuySection");
    const helpIdx = jsx.indexOf("<FridgeHomeownerHelpCollapsible");
    assert.ok(answerIdx >= 0 && buyIdx > answerIdx && helpIdx > buyIdx);
    assert.ok(
      readFileSync(root("src", "components", "fridge", "FridgeModelPdpProminentBuySection.tsx"), "utf8").includes(
        "BUCKPARTS_VERIFIED_LINK_PROMINENT_NONE_YET",
      ),
    );
  });

  it("filter PDP: identity before buy; help after compatible models", () => {
    const filterPage = readFileSync(root("src", "app", "filter", "[slug]", "page.tsx"), "utf8");
    const jsx = filterPage.slice(filterPage.indexOf("return ("));
    const cardIdx = jsx.indexOf("<VisualReplacementMatchCard");
    const buyIdx = jsx.indexOf("<BuckPartsVerifiedLinksSection");
    const modelsIdx = jsx.indexOf("<FilterPdpCompatibleModelsSection");
    const helpIdx = jsx.indexOf("<FridgeHomeownerHelpCollapsible");
    assert.ok(cardIdx >= 0 && buyIdx > cardIdx);
    assert.ok(modelsIdx > buyIdx && helpIdx > modelsIdx);
    assert.ok(filterPage.includes("BUCKPARTS_VERIFIED_LINK_PROMINENT_NONE_YET"));
  });

  it("no production dependency on uncleared EveryDrop photo or legacy review assets", () => {
    const paths = [
      root("src", "components", "homepage", "RealLookupExample.tsx"),
      root("src", "components", "SiteHeader.tsx"),
      root("src", "lib", "homepage", "featured-fit-example.ts"),
    ];
    for (const p of paths) {
      const src = readFileSync(p, "utf8");
      assert.ok(!src.includes("everydrop-filter4-photo"));
      assert.ok(!src.includes("lockup-review.png"));
    }
    assert.equal(BUCKPARTS_ICON_LOGO_PATH, "/brand/buckparts-icon.png");
  });
});
