import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { FilterPdp4396710IdentitySection } from "@/components/fridge/FilterPdp4396710IdentitySection";
import { FilterPdpCompatibleModelsSection } from "@/components/fridge/FilterPdpCompatibleModelsSection";
import { VisualReplacementMatchCard } from "@/components/trust/VisualReplacementMatchCard";
import {
  WHIRLPOOL_4396710_EMPTY_MODELS_COPY,
  WHIRLPOOL_4396710_FAQS,
  WHIRLPOOL_4396710_H1,
  WHIRLPOOL_4396710_META_DESCRIPTION,
  WHIRLPOOL_4396710_OPENING_PARAGRAPHS,
  WHIRLPOOL_4396710_TITLE,
  refrigeratorFilterPageDescription,
  refrigeratorFilterPageTitle,
} from "@/lib/fridge/fridge-filter-4396710-identity-v1";

const ROOT = process.cwd();

const COMPLETENESS_SWEEP_FILTERS = [
  "4396710",
  "4396508",
  "4396395",
  "8171413",
  "adq36006101",
  "mdj64844601",
  "lt1000pc",
  "adq74793502",
  "wfcb",
  "purepour",
  "frig-242017801",
] as const;

function countCompatRows(filterSlug: string): number {
  const csv = readFileSync(join(ROOT, "data/compatibility_mappings.csv"), "utf8");
  return csv.split(/\r?\n/).filter((line) => line.endsWith(`,${filterSlug}`)).length;
}

describe("catalog completeness sweep", () => {
  it("removes every compatibility row whose filter was populated only by the sweep", () => {
    for (const slug of COMPLETENESS_SWEEP_FILTERS) {
      assert.equal(countCompatRows(slug), 0, slug);
    }
  });

  it("does not copy an anchor filter onto otherwise-unmapped parts", () => {
    const generator = readFileSync(
      join(ROOT, "scripts/generate-fridge-homekeep-bulk-csv.ts"),
      "utf8",
    );
    assert.equal(generator.includes("catalog completeness sweep"), false);
    assert.equal(generator.includes("FILTER_SLUGS_EXCLUDED_FROM_ORPHAN_COMPAT_MIRROR"), false);
    assert.equal(generator.includes("Ensure every filter SKU has"), false);
    assert.match(generator, /Unmapped filter parts stay unmapped/);
    assert.equal(generator.includes('"4396710": "edr1rxd1"'), false);
  });

  it("does not alias 4396710 to EDR3RXD1, 4396710P, or 4396701", () => {
    const aliases = readFileSync(join(ROOT, "data/filter_aliases.csv"), "utf8");
    const rows = aliases
      .split(/\r?\n/)
      .filter((line) => line.startsWith("4396710,") || line.endsWith(",4396710"));
    assert.deepEqual(rows, ["4396710,4396710"]);
  });
});

describe("4396710 page identity", () => {
  it("renders the target title, H1, opening, and FAQs", () => {
    assert.equal(
      refrigeratorFilterPageTitle({ slug: "4396710", oemPartNumber: "4396710" }),
      WHIRLPOOL_4396710_TITLE,
    );
    assert.equal(
      refrigeratorFilterPageTitle({ slug: "4396710", oemPartNumber: "4396710" }),
      "4396710 Whirlpool Refrigerator Water Filter | Filter 3 / EDR3RXD1",
    );
    assert.equal(
      refrigeratorFilterPageDescription({
        slug: "4396710",
        oemPartNumber: "4396710",
        genericDescription: "generic",
      }),
      WHIRLPOOL_4396710_META_DESCRIPTION,
    );
    assert.equal(
      refrigeratorFilterPageTitle({ slug: "edr3rxd1", oemPartNumber: "EDR3RXD1" }),
      "EDR3RXD1 refrigerator filter",
    );

    const hero = renderToStaticMarkup(
      createElement(VisualReplacementMatchCard, {
        variant: "fridge_filter",
        brandName: "Whirlpool",
        brandSlug: "whirlpool",
        oemPartNumber: "4396710",
        productName: "Whirlpool 4396710",
        aliases: [],
        intervalLabel: "Replace about every 6 months",
        compatibleModelCount: 0,
        filterSlug: "4396710",
        storePlainStatus: "none_yet",
      }),
    );
    assert.ok(hero.includes("<h1"));
    assert.ok(hero.includes(WHIRLPOOL_4396710_H1));
    assert.equal(hero.includes("Whirlpool 4396710</p>"), false);

    const identity = renderToStaticMarkup(
      createElement(FilterPdp4396710IdentitySection, { filterSlug: "4396710" }),
    );
    for (const paragraph of WHIRLPOOL_4396710_OPENING_PARAGRAPHS) {
      assert.ok(identity.includes(paragraph), `missing opening: ${paragraph.slice(0, 48)}`);
    }
    for (const faq of WHIRLPOOL_4396710_FAQS) {
      assert.ok(identity.includes(faq.question));
      assert.ok(identity.includes(faq.answer));
    }
    assert.ok(identity.includes("T1RFWB2"));
    assert.ok(identity.includes("WHR3RXD1"));
    assert.ok(identity.includes("EDR3RXD1"));
    assert.ok(identity.includes("4396710P"));
    assert.ok(identity.includes("4396701"));
    assert.match(identity, /Whether 4396710 was sold as a PUR filter is unknown/);
    assert.match(
      identity,
      /BuckParts has not proven that 4396710 and EDR3RXD1 are the identical part/,
    );
    assert.equal(identity.includes("Is 4396710 the same as EDR3RXD1?</h3>\nNo."), false);
    assert.match(identity, /has not proven the P suffix/);
    assert.equal(identity.includes("4396701 is a separate part number"), true);

    const models = renderToStaticMarkup(
      createElement(FilterPdpCompatibleModelsSection, {
        filterSlug: "4396710",
        oemPartNumber: "4396710",
        displayModelCount: 0,
        hiddenQuarantinedModelCount: 0,
        models: [],
      }),
    );
    assert.ok(models.includes("Compatible refrigerator models (0)"));
    assert.ok(models.includes(WHIRLPOOL_4396710_EMPTY_MODELS_COPY));
    assert.equal(models.includes("WRF535SWHZ"), false);
    assert.equal(models.includes("WRF555SDFZ"), false);
    assert.equal(models.includes("WRX735SDAV"), false);
  });

  it("does not render the 4396710 identity block on other filters", () => {
    const html = renderToStaticMarkup(
      createElement(FilterPdp4396710IdentitySection, { filterSlug: "4396395" }),
    );
    assert.equal(html, "");
  });

  it("keeps homeowner copy free of banned labels and does not prove PUR or identity", () => {
    const html = renderToStaticMarkup(
      createElement(FilterPdp4396710IdentitySection, { filterSlug: "4396710" }),
    );
    assert.equal(/\bOEM\b/.test(html), false);
    assert.equal(/\btoken\b/i.test(html), false);
    assert.equal(/\bguaranteed\b/i.test(html), false);
    assert.equal(/4396710 was a PUR filter/i.test(html), false);
    assert.match(html, /has not proven that 4396710 and EDR3RXD1 are the identical part/);
    assert.equal(html.includes(">No. BuckParts does not treat them as the same"), false);
  });
});
