import assert from "node:assert/strict";
import test from "node:test";

import {
  enrichCandidatesWithBodyEvidence,
  extractAmazonProductCandidates,
} from "./discovery-candidate-enrichment";
import { generateHqiiAmazonCandidatesFromSearchHits } from "./hqii-discovery-candidate-generation";

test("pentek-cfb-plus10bb fixture: slugged Amazon PDP is promoted only after body evidence", async () => {
  const hits = [
    {
      url: "https://www.amazon.com/Pentek-CFB-PLUS10BB-Fibredyne-Modified-Carbon/dp/B00LP8LJUG/",
      snippet: "Pentek Fibredyne modified carbon block cartridge replacement filter",
    },
  ];

  const candidates = extractAmazonProductCandidates(hits);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.canonical_url, "https://www.amazon.com/dp/B00LP8LJUG");
  assert.equal(
    candidates[0]?.snippet.includes("CFB-PLUS10BB"),
    false,
    "fixture requires missing token in search snippet",
  );

  const enriched = await enrichCandidatesWithBodyEvidence({
    candidates,
    requiredTokens: ["CFB-PLUS10BB"],
    fetchBodyText: async (url) => {
      assert.equal(url, "https://www.amazon.com/dp/B00LP8LJUG");
      return "Pentek CFB-PLUS10BB Fibredyne Modified Carbon Block Water Filter Cartridge";
    },
  });

  assert.equal(enriched.length, 1);
  assert.deepEqual(enriched[0]?.evidence_tokens, ["CFB-PLUS10BB"]);
});

test("search/category Amazon URLs are excluded from product candidates", () => {
  const hits = [
    { url: "https://www.amazon.com/s?k=CFB-PLUS10BB", snippet: "Amazon search results" },
    { url: "https://www.amazon.com/s?i=tools&rh=n%3A228013", snippet: "category listing" },
    { url: "https://www.amazon.com/gp/search?keywords=CFB-PLUS10BB", snippet: "gp search listing" },
  ];

  const candidates = extractAmazonProductCandidates(hits);
  assert.equal(candidates.length, 0);
});

test("candidate is rejected when PDP body lacks strict required token", async () => {
  const candidates = extractAmazonProductCandidates([
    {
      url: "https://www.amazon.com/Pentek-CFB-PLUS10BB-Fibredyne-Modified-Carbon/dp/B00LP8LJUG/",
      snippet: "Pentek cartridge replacement",
    },
  ]);

  const enriched = await enrichCandidatesWithBodyEvidence({
    candidates,
    requiredTokens: ["CFB-PLUS10BB"],
    fetchBodyText: async () => "Pentek Fibredyne modified carbon block replacement filter",
  });

  assert.equal(enriched.length, 0);
});

test("real HQII candidate callsite uses enrichment when snippet misses strict token", async () => {
  const rows = await generateHqiiAmazonCandidatesFromSearchHits({
    filterSlug: "pentek-cfb-plus10bb",
    searchHits: [
      {
        url: "https://www.amazon.com/Pentek-CFB-PLUS10BB-Fibredyne-Modified-Carbon/dp/B00LP8LJUG/",
        snippet: "Pentek fibredyne modified carbon replacement cartridge",
      },
      {
        url: "https://www.amazon.com/s?k=CFB-PLUS10BB",
        snippet: "search listing should never pass product extraction",
      },
    ],
    fetchBodyText: async (url) => {
      if (url.includes("/dp/B00LP8LJUG")) {
        return "Pentek CFB-PLUS10BB Fibredyne Modified Carbon Block Water Filter Cartridge";
      }
      return "";
    },
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.filter_slug, "pentek-cfb-plus10bb");
  assert.equal(rows[0]?.retailer_name, "Amazon");
  assert.equal(rows[0]?.url, "https://www.amazon.com/dp/B00LP8LJUG");
});

test("second-family positive: da29 slug promotes when PDP body has strict token", async () => {
  const rows = await generateHqiiAmazonCandidatesFromSearchHits({
    filterSlug: "da29-00020b",
    searchHits: [
      {
        url: "https://www.amazon.com/SAMSUNG-Genuine-HAF-CIN-EXP-Refrigerator/dp/B004UB1NRY/",
        snippet: "Samsung genuine refrigerator water filter replacement cartridge",
      },
    ],
    fetchBodyText: async (url) => {
      assert.equal(url, "https://www.amazon.com/dp/B004UB1NRY");
      return "SAMSUNG Genuine DA29-00020B HAF-CIN/EXP Refrigerator Water Filter";
    },
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.filter_slug, "da29-00020b");
  assert.equal(rows[0]?.url, "https://www.amazon.com/dp/B004UB1NRY");
});

test("second-family negative: da29 slug rejects when PDP body lacks strict token", async () => {
  const rows = await generateHqiiAmazonCandidatesFromSearchHits({
    filterSlug: "da29-00020b",
    searchHits: [
      {
        url: "https://www.amazon.com/SAMSUNG-Genuine-HAF-CIN-EXP-Refrigerator/dp/B004UB1NRY/",
        snippet: "Samsung genuine refrigerator water filter replacement cartridge",
      },
    ],
    fetchBodyText: async () =>
      "SAMSUNG Genuine HAF-CIN EXP Refrigerator Water Filter replacement cartridge",
  });

  assert.equal(rows.length, 0);
});
