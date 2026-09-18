import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  FEATURED_FIT_COMPAT_ROW,
  FEATURED_FIT_EVIDENCE_DATE,
  FEATURED_FIT_EVIDENCE_PATH,
  FEATURED_FIT_FILTER_SLUG,
  FEATURED_FIT_FIT_STATE,
  FEATURED_FIT_FRIDGE_SLUG,
  FEATURED_FIT_HREF,
  FEATURED_FIT_MODEL_NUMBER,
  FEATURED_FIT_PART_NUMBER,
  FEATURED_FIT_SOURCE_TITLE,
  FEATURED_FIT_SOURCE_URL,
  FEATURED_FIT_WHY_BODY,
} from "@/lib/homepage/featured-fit-example";
import {
  HOME_EYEBROW,
  HOME_H1_LINE_1,
  HOME_H1_LINE_2,
  HOME_INPUT_LABEL,
  HOME_PRIMARY_CTA,
  HOME_SECOND_DOOR,
  HOME_SUBHEADLINE,
  HOME_TRUST_LINE,
  HOME_TRUST_LINE_STRONG,
} from "@/lib/homepage/homepage-copy";

const root = (...parts: string[]) => join(process.cwd(), ...parts);

describe("homepage featured fit provenance", () => {
  it("binds the featured case to CSV mapping, model, part, and manufacturer evidence", () => {
    const compat = readFileSync(root("data", "compatibility_mappings.csv"), "utf8");
    const models = readFileSync(root("data", "fridge_models.csv"), "utf8");
    const filters = readFileSync(root("data", "filters.csv"), "utf8");
    const evidence = JSON.parse(readFileSync(root(FEATURED_FIT_EVIDENCE_PATH), "utf8")) as {
      fridge_model_slug: string;
      source_title: string;
      source_url: string;
      evidence_date: string;
      operator_reviewed: boolean;
      notes: string;
    };
    const audit = readFileSync(
      root("data", "fridge", "batch-production", "audits", "model-filter-correctness-audit-v1.csv"),
      "utf8",
    );

    assert.ok(compat.split("\n").some((line) => line.trim() === FEATURED_FIT_COMPAT_ROW));
    assert.ok(models.includes(`,${FEATURED_FIT_FRIDGE_SLUG},${FEATURED_FIT_MODEL_NUMBER},`));
    assert.ok(filters.includes(`,${FEATURED_FIT_FILTER_SLUG},${FEATURED_FIT_PART_NUMBER},`));
    assert.equal(evidence.fridge_model_slug, FEATURED_FIT_FRIDGE_SLUG);
    assert.equal(evidence.source_title, FEATURED_FIT_SOURCE_TITLE);
    assert.equal(evidence.source_url, FEATURED_FIT_SOURCE_URL);
    assert.equal(evidence.evidence_date, FEATURED_FIT_EVIDENCE_DATE);
    assert.equal(evidence.operator_reviewed, true);
    assert.ok(evidence.notes.includes("EDR4RXD1"));
    assert.ok(
      audit.includes(
        `${FEATURED_FIT_FRIDGE_SLUG},${FEATURED_FIT_MODEL_NUMBER},${FEATURED_FIT_FILTER_SLUG},PROVEN_CORRECT,${FEATURED_FIT_EVIDENCE_PATH}`,
      ),
    );
    assert.equal(FEATURED_FIT_FIT_STATE, "established_positive");
    assert.ok(FEATURED_FIT_WHY_BODY.includes(FEATURED_FIT_PART_NUMBER));
    assert.equal(FEATURED_FIT_HREF, `/fridge/${FEATURED_FIT_FRIDGE_SLUG}`);
  });

  it("does not put price, retailer CTA, or invented metrics in the real lookup example module", () => {
    const ui = readFileSync(root("src", "components", "homepage", "RealLookupExample.tsx"), "utf8");
    assert.ok(!/\/go\//.test(ui));
    assert.ok(!/affiliate/i.test(ui));
    assert.ok(!/\bprice\b/i.test(ui));
    assert.ok(!/Buy now/i.test(ui));
    assert.ok(!/\$\d/.test(ui));
  });
});

describe("homepage exact copy", () => {
  it("locks the approved hero strings", () => {
    assert.equal(HOME_EYEBROW, "A fit lookup for your home");
    assert.equal(HOME_H1_LINE_1, "Find the filter");
    assert.equal(HOME_H1_LINE_2, "that fits.");
    assert.equal(
      HOME_SUBHEADLINE,
      "Your model. The right replacement. We help you check the fit before you buy.",
    );
    assert.equal(HOME_INPUT_LABEL, "Appliance model or part number");
    assert.equal(HOME_PRIMARY_CTA, "Find my filter");
    assert.equal(HOME_SECOND_DOOR, "I don’t know my number");
    assert.equal(HOME_TRUST_LINE_STRONG, "Fit answers first.");
    assert.equal(HOME_TRUST_LINE, "We’re not a parts store.");
  });

  it("homepage markup uses the prototype hero composition and omits banned shelves", () => {
    const page = readFileSync(root("src", "app", "page.tsx"), "utf8");
    const css = readFileSync(root("src", "app", "homepage.css"), "utf8");
    assert.ok(css.includes("grid-template-columns: minmax(0, 1.11fr) minmax(0, 1fr)"));
    assert.ok(css.includes("bp-home__product-scene"));
    assert.ok(page.includes("RealLookupExample"));
    assert.ok(!page.includes("StatusLegend"));
    assert.ok(!page.includes("VerifiedLinkCard"));
    assert.ok(!page.includes("Wrong Buck."));
    assert.ok(!page.includes("listBrowseFilters"));
    assert.ok(!page.includes("Visual design prototype"));
  });
});
