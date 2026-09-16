import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { fridgeModelMetadataDescriptionV1 } from "@/lib/seo/fridge-model-metadata";
import { resolveFridgeCustomerSafetyV1 } from "@/lib/fridge/fridge-learned-failure-customer-guard-v1";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("help empty state uses homeowner copy, not a technical placeholder", () => {
  const src = read("src/app/help/page.tsx");
  assert.ok(!/supabase/i.test(src));
  assert.ok(src.includes("Search a model or part number"));
  assert.ok(src.includes("/wrong-part-prevention"));
  assert.ok(src.includes("owner’s manual") || src.includes("owner's manual"));
});

test("homepage example chips include a resolved model, not the under-review LFXS26973S", () => {
  const src = read("src/app/page.tsx");
  assert.ok(src.includes("WRX735SDHZ"));
  assert.ok(!src.includes("LFXS26973S"));
  assert.ok(src.includes("DA29-00020B"));
  assert.ok(src.includes("Where do I find my model number?"));
  assert.ok(src.includes("Find the replacement part that fits."));
});

test("header keeps one Search action and does not duplicate Search in primary text nav", () => {
  const src = read("src/components/SiteShell.tsx");
  const searchHrefs = src.match(/href="\/search"/g) ?? [];
  assert.equal(searchHrefs.length, 1);
  assert.ok(src.includes("Browse filters"));
  assert.ok(src.includes("Help"));
});

test("status legend leads with fit risk, not commercial status", () => {
  const src = read("src/components/StatusLegend.tsx");
  const wrong = src.indexOf("Wrong-part risk");
  const verified = src.indexOf("Verified Link");
  assert.ok(wrong >= 0 && verified >= 0);
  assert.ok(wrong < verified);
});

test("under-review fridge metadata does not promise compatible filters", () => {
  assert.equal(
    fridgeModelMetadataDescriptionV1({
      brandName: "LG",
      modelNumber: "LFXS26973S",
      underReview: true,
    }),
    "BuckParts is reviewing water filter compatibility for LG model LFXS26973S. Buying options stay off until that review is complete.",
  );
  assert.ok(
    !/Compatible water filters/i.test(
      fridgeModelMetadataDescriptionV1({
        brandName: "LG",
        modelNumber: "LFXS26973S",
        underReview: true,
      }),
    ),
  );
  assert.match(
    fridgeModelMetadataDescriptionV1({
      brandName: "Whirlpool",
      modelNumber: "WRX735SDHZ",
      underReview: false,
    }),
    /Compatible water filters and replacement schedule for Whirlpool model WRX735SDHZ/,
  );
});

test("fridge model page binds under-review metadata to quarantine, not indexing policy", () => {
  const src = read("src/app/fridge/[slug]/page.tsx");
  assert.ok(src.includes("fridgeModelMetadataDescriptionV1"));
  assert.match(src, /const underReview = customerSafety\.quarantine;/);
  assert.ok(src.includes("robots: getRobotsFromPageState(pageState)"));
  assert.doesNotMatch(src, /underReview = customerSafety\.quarantine \|\|/);
});

test("LFXS26973S is quarantined so the honest snippet applies; WRX735SDHZ is not", () => {
  const lfxs = resolveFridgeCustomerSafetyV1({ fridgeModelSlug: "lg-lfxs26973s" });
  const wrx = resolveFridgeCustomerSafetyV1({ fridgeModelSlug: "whirlpool-wrx735sdhz" });
  assert.equal(lfxs.quarantine, true);
  assert.equal(wrx.quarantine, false);
  assert.ok(!/Compatible water filters/i.test(
    fridgeModelMetadataDescriptionV1({
      brandName: "LG",
      modelNumber: "LFXS26973S",
      underReview: lfxs.quarantine,
    }),
  ));
});
