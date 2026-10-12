import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  AIR_PURIFIER_MODEL_TRUTH_COPY,
  ModelTruthPanelCopyProvider,
} from "@/components/trust/ModelTruthPanel";
import { VerticalFilterPageContent } from "@/components/vertical/VerticalFilterPageContent";
import { VerticalModelPageContent } from "@/components/vertical/VerticalModelPageContent";
import {
  manufacturerSupportedFilterPageCopyV1,
  manufacturerSupportedModelPageCopyV1,
} from "@/lib/air-purifier/manufacturer-supported-cluster-copy-v1";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";
import type { PartTrustSummary } from "@/lib/trust/part-trust";

const HE3_MODEL_SLUGS = ["shark-hp300", "shark-hp301", "shark-hp302", "shark-hp305"] as const;

const FILTER_TITLE = `Shark HE3FKPET Replacement Filter – HP300, HP301, HP302 & HP305 | ${SITE_DISPLAY_NAME}`;
const FILTER_H1 = "Shark HE3FKPET Replacement Filter";
const FILTER_NEAR_H1 =
  "Shark lists HE3FKPET as compatible with HP300, HP301, HP302, and HP305.";
const FILTER_MODELS_HEADING = "Shark models that use HE3FKPET";

function modelTitle(token: string): string {
  return `Shark ${token} Replacement Filter – HE3FKPET | ${SITE_DISPLAY_NAME}`;
}

function modelH1(token: string): string {
  return `Shark ${token} Replacement Filter`;
}

function modelFit(token: string): string {
  return `Shark lists HE3FKPET as compatible with the ${token}. Confirm the model label and listing number before purchase.`;
}

test("HE3FKPET filter page copy names the four Shark-listed models", () => {
  const copy = manufacturerSupportedFilterPageCopyV1("shark-hepa-he3fkp", HE3_MODEL_SLUGS);
  assert.ok(copy);
  assert.equal(copy.documentTitle, FILTER_TITLE);
  assert.equal(copy.h1, FILTER_H1);
  assert.equal(copy.nearH1, FILTER_NEAR_H1);
  assert.equal(copy.modelsSectionTitle, FILTER_MODELS_HEADING);
  assert.equal(
    manufacturerSupportedFilterPageCopyV1("shark-hepa-he3fkp", [
      ...HE3_MODEL_SLUGS,
      "shark-hp150",
    ]),
    null,
  );
  assert.equal(manufacturerSupportedFilterPageCopyV1("other-filter", HE3_MODEL_SLUGS), null);
});

test("HP300 family model page copy uses Shark's compatibility wording", () => {
  for (const [slug, token] of [
    ["shark-hp300", "HP300"],
    ["shark-hp301", "HP301"],
    ["shark-hp302", "HP302"],
    ["shark-hp305", "HP305"],
  ] as const) {
    const copy = manufacturerSupportedModelPageCopyV1({
      modelSlug: slug,
      primaryFilterSlug: "shark-hepa-he3fkp",
    });
    assert.ok(copy);
    assert.equal(copy.documentTitle, modelTitle(token));
    assert.equal(copy.h1, modelH1(token));
    assert.equal(copy.fitSentence, modelFit(token));
    assert.equal(copy.detailAnchor, "HE3FKPET replacement filter details");
    assert.equal(copy.fitSentence.includes("may fit"), false);
  }

  assert.equal(
    manufacturerSupportedModelPageCopyV1({
      modelSlug: "shark-hp302",
      primaryFilterSlug: "shark-hepa-hp400",
    }),
    null,
  );
});

test("rendered HE3FKPET filter page shows the manufacturer list and four model links", () => {
  const copy = manufacturerSupportedFilterPageCopyV1("shark-hepa-he3fkp", HE3_MODEL_SLUGS);
  assert.ok(copy);
  const html = renderToStaticMarkup(
    createElement(VerticalFilterPageContent, {
      brandName: "Shark",
      oemPartNumber: "HE3FKPET",
      name: "NeverChange HP300 HEPA filter",
      replacementIntervalMonths: 60,
      notes: null,
      models: HE3_MODEL_SLUGS.map((slug, index) => ({
        id: String(index),
        slug,
        model_number: `Shark ${slug.slice("shark-".length).toUpperCase()}`,
        brand: { name: "Shark" },
      })),
      modelBasePath: "/air-purifier/model",
      retailerLinks: [],
      goBase: "/air-purifier/go",
      searchHref: "/air-purifier/search",
      fitConfirmation: "Match the cartridge number before you buy.",
      heading: copy.h1,
      headingSupport: copy.nearH1,
      modelsSectionTitle: copy.modelsSectionTitle,
    }),
  );
  assert.ok(html.includes(`<h1 class="mt-6 text-2xl font-semibold tracking-tight text-bp-text">${FILTER_H1}</h1>`));
  assert.ok(html.includes(FILTER_NEAR_H1));
  assert.ok(html.includes(FILTER_MODELS_HEADING));
  for (const slug of HE3_MODEL_SLUGS) {
    assert.ok(html.includes(`href="/air-purifier/model/${slug}"`));
  }
  assert.equal(html.includes("Fits these models"), false);
});

test("rendered HP300 model page replaces the uncertain fit line and generic anchor", () => {
  const copy = manufacturerSupportedModelPageCopyV1({
    modelSlug: "shark-hp300",
    primaryFilterSlug: "shark-hepa-he3fkp",
  });
  assert.ok(copy);
  const trust: PartTrustSummary = {
    match_confidence: "high",
    match_basis: "recommended_compatibility_mapping",
    oem_or_compatible: "unknown",
    compatible_risk_level: "low",
    evidence_notes: [],
    requires_manual_verification: true,
    approved_retailer_links: 0,
    preferred_winner_link: null,
    replacement_reasoning_summary: copy.fitSentence,
    buyer_path_state: "suppress_buy",
  };
  const html = renderToStaticMarkup(
    createElement(
      ModelTruthPanelCopyProvider,
      { value: AIR_PURIFIER_MODEL_TRUTH_COPY },
      createElement(VerticalModelPageContent, {
        brandName: "Shark",
        modelNumber: "Shark HP300",
        title: "Shark HP300 Air Purifier",
        series: "NeverChange HP300",
        notes: null,
        filters: [
          {
            id: "he3",
            slug: "shark-hepa-he3fkp",
            oem_part_number: "HE3FKPET",
            name: "NeverChange HP300 HEPA filter",
            replacement_interval_months: 60,
            notes: null,
            retailer_links: [],
          },
        ],
        filterBasePath: "/air-purifier/filter",
        goBase: "/air-purifier/go",
        searchHref: "/air-purifier/search",
        fitConfirmation: "Compare the part number before you buy.",
        heading: copy.h1,
        detailLinkLabel: copy.detailAnchor,
        primaryTrustBuy: {
          trust,
          mappedPartOptionsCount: 1,
          hasPrimaryPartNotes: false,
          retailerLinks: [],
          buySuppressMessage: "No buy link yet.",
        },
      }),
    ),
  );
  assert.ok(html.includes(modelH1("HP300")));
  assert.ok(html.includes(modelFit("HP300")));
  assert.ok(html.includes("HE3FKPET replacement filter details"));
  assert.ok(html.includes('href="/air-purifier/filter/shark-hepa-he3fkp"'));
  assert.equal(html.includes("may fit model"), false);
  assert.equal(html.includes("All details for this part"), false);
  assert.equal(html.includes("Other parts that also fit"), false);
});
