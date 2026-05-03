import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  buildAmazonFirstBlockedConversionQueueReportFromData,
  extractBlockedOemToken,
  loadCommittedUnknownEvidenceIndex,
  resolveRecommendedNextAction,
} from "./report-amazon-first-blocked-conversion-queue";

test("report flags read_only and no data mutation", () => {
  const report = buildAmazonFirstBlockedConversionQueueReportFromData({
    links: [],
    filters: [],
    now: () => new Date("2026-04-30T00:00:00.000Z"),
    amazonAffiliateReady: true,
  });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.selection_table, "retailer_links");
});

test("extractBlockedOemToken prefers query param", () => {
  assert.equal(
    extractBlockedOemToken("https://www.repairclinic.com/Search?SearchTerm=DA29-00020B"),
    "DA29-00020B",
  );
});

test("excludes handled tokens, Frigidaire dead OEM URLs, and non-OEM rows", () => {
  const deadFrig = "https://www.frigidaire.com/en/catalogsearch/result/?q=242017801";
  const report = buildAmazonFirstBlockedConversionQueueReportFromData({
    links: [
      {
        id: "keep-1",
        filter_id: "f1",
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=DA29-00020B",
        browser_truth_classification: null,
        is_primary: false,
      },
      {
        id: "drop-token",
        filter_id: "f2",
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=DA29-00019A",
        browser_truth_classification: null,
        is_primary: false,
      },
      {
        id: "drop-frig",
        filter_id: "f3",
        retailer_key: "oem-parts-catalog",
        affiliate_url: deadFrig,
        browser_truth_classification: null,
        is_primary: false,
      },
      {
        id: "drop-amazon",
        filter_id: "f4",
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/s?k=TEST",
        browser_truth_classification: null,
        is_primary: false,
      },
    ],
    filters: [
      { id: "f1", slug: "slug-1", oem_part_number: "DA29-00020B" },
      { id: "f2", slug: "slug-2", oem_part_number: null },
      { id: "f3", slug: "slug-3", oem_part_number: null },
      { id: "f4", slug: "slug-4", oem_part_number: null },
    ],
    now: () => new Date("2026-04-30T00:00:00.000Z"),
    amazonAffiliateReady: true,
  });
  assert.equal(report.total_pool_rows, 1);
  assert.equal(Array.isArray(report.top_candidates), true);
  if (Array.isArray(report.top_candidates)) {
    assert.equal(report.top_candidates.length, 1);
    assert.equal(report.top_candidates[0]?.link_id, "keep-1");
    assert.equal(report.top_candidates[0]?.recommended_next_action, "SEARCH_AMAZON_EXACT_TOKEN");
  }
});

test("NOOP when filter already has gate-ok live Amazon", () => {
  const report = buildAmazonFirstBlockedConversionQueueReportFromData({
    links: [
      {
        id: "blocked-oem",
        filter_id: "f1",
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=XYZ1",
        browser_truth_classification: null,
        is_primary: false,
      },
      {
        id: "amazon-live",
        filter_id: "f1",
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B012345678",
        browser_truth_classification: "direct_buyable",
        is_primary: true,
      },
    ],
    filters: [{ id: "f1", slug: "has-amazon", oem_part_number: "XYZ1" }],
    now: () => new Date("2026-04-30T00:00:00.000Z"),
    amazonAffiliateReady: true,
  });
  assert.equal(report.total_pool_rows, 1);
  assert.equal(report.already_live_noop_count, 1);
  assert.equal(report.needs_amazon_search_count, 0);
  assert.equal(Array.isArray(report.top_candidates), true);
  if (Array.isArray(report.top_candidates)) {
    assert.equal(report.top_candidates.length, 0);
  }
});

test("HOLD_AFFILIATE_NOT_READY when Amazon program not ready", () => {
  const report = buildAmazonFirstBlockedConversionQueueReportFromData({
    links: [
      {
        id: "blocked-oem",
        filter_id: "f1",
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=ZZZ1",
        browser_truth_classification: null,
        is_primary: false,
      },
    ],
    filters: [{ id: "f1", slug: "no-amazon", oem_part_number: null }],
    now: () => new Date("2026-04-30T00:00:00.000Z"),
    amazonAffiliateReady: false,
  });
  assert.equal(report.needs_amazon_search_count, 0);
  if (Array.isArray(report.top_candidates) && report.top_candidates[0]) {
    assert.equal(report.top_candidates[0].recommended_next_action, "HOLD_AFFILIATE_NOT_READY");
  }
});

test("extractBlockedOemToken returns UNKNOWN for invalid URLs", () => {
  assert.equal(extractBlockedOemToken("not-a-valid-url"), "UNKNOWN");
});

test("resolveRecommendedNextAction maps UNKNOWN token to review", () => {
  assert.equal(
    resolveRecommendedNextAction({
      token: "UNKNOWN",
      noop: false,
      amazonAffiliateReady: true,
    }),
    "UNKNOWN_REVIEW_REQUIRED",
  );
});

test("committed UNKNOWN evidence demotes SEARCH row to HUMAN_BROWSER_VERIFICATION_REQUIRED and down-ranks it", () => {
  const evidenceIndex = {
    byToken: new Map<string, { file: string; reason: string }>(),
    byFilterId: new Map([
      [
        "filter-with-evidence",
        { file: "amazon-x-unknown-outcome.2026-01-01.json", reason: "joint proof gap" },
      ],
    ]),
  };
  const report = buildAmazonFirstBlockedConversionQueueReportFromData({
    links: [
      {
        id: "fresh-1",
        filter_id: "f-fresh",
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=FRESH123",
        browser_truth_classification: null,
        is_primary: false,
      },
      {
        id: "unk-1",
        filter_id: "filter-with-evidence",
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=ZZZ999",
        browser_truth_classification: null,
        is_primary: false,
      },
    ],
    filters: [
      { id: "f-fresh", slug: "fresh", oem_part_number: "FRESH123" },
      { id: "filter-with-evidence", slug: "unk-slug", oem_part_number: "ZZZ999" },
    ],
    now: () => new Date("2026-05-01T00:00:00.000Z"),
    amazonAffiliateReady: true,
    committedUnknownIndex: evidenceIndex,
  });
  assert.equal(report.needs_amazon_search_count, 1);
  assert.equal(report.unknown_evidence_deferred_count, 1);
  assert.ok(Array.isArray(report.top_candidates));
  assert.ok(Array.isArray(report.unknown_evidence_deferred));
  if (Array.isArray(report.top_candidates) && Array.isArray(report.unknown_evidence_deferred)) {
    assert.equal(report.top_candidates.length, 2);
    assert.equal(report.top_candidates[0]?.recommended_next_action, "SEARCH_AMAZON_EXACT_TOKEN");
    assert.equal(report.top_candidates[0]?.token, "FRESH123");
    assert.equal(report.top_candidates[1]?.recommended_next_action, "HUMAN_BROWSER_VERIFICATION_REQUIRED");
    assert.equal(report.top_candidates[1]?.evidence_unknown_committed, true);
    assert.equal(report.top_candidates[1]?.evidence_unknown_file, "amazon-x-unknown-outcome.2026-01-01.json");
    assert.equal(report.unknown_evidence_deferred.length, 1);
    assert.equal(report.unknown_evidence_deferred[0]?.link_id, "unk-1");
  }
});

test("loadCommittedUnknownEvidenceIndex picks up committed amazon unknown outcome files", () => {
  const idx = loadCommittedUnknownEvidenceIndex(path.resolve(process.cwd(), "data/evidence"));
  const meta =
    idx.byToken.get("4396508") ?? idx.byFilterId.get("063a6122-c85f-4332-92c0-0d8e53dc5d4c");
  assert.ok(meta, "expected data/evidence/amazon-4396508-unknown-outcome fixture");
  assert.match(meta.file, /4396508.*unknown-outcome/i);
});
