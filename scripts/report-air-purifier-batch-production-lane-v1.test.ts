import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  AP_BATCH_PRODUCTION_LANE_STATES_V1,
  buildAirPurifierBatchProductionLaneV1Report,
  classifyApFilterCandidateV1,
} from "./lib/air-purifier-batch-production-lane-v1";

const REPO_ROOT = process.cwd();

function loadPrimaryLink(slug: string) {
  const { parse } = require("csv-parse/sync") as typeof import("csv-parse/sync");
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  const links = parse(readFileSync(path.join(REPO_ROOT, "data/air-purifier/retailer_links.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as Array<{ filter_slug: string; is_primary?: string; affiliate_url: string; retailer_key?: string; browser_truth_classification?: string; browser_truth_notes?: string; browser_truth_checked_at?: string }>;
  const rows = links.filter((l) => l.filter_slug === slug);
  return rows.find((l) => String(l.is_primary).toLowerCase() === "true") ?? rows[0] ?? null;
}

function loadFilter(slug: string) {
  const { parse } = require("csv-parse/sync") as typeof import("csv-parse/sync");
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  const filters = parse(readFileSync(path.join(REPO_ROOT, "data/air-purifier/filters.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as Array<{ brand_slug: string; slug: string; oem_part_number: string; name: string }>;
  const row = filters.find((f) => f.slug === slug);
  assert.ok(row, slug);
  return row;
}

async function buildLiveReport() {
  return buildAirPurifierBatchProductionLaneV1Report({
    rootDir: REPO_ROOT,
    loadGscArtifact: async () => ({
      ok: false,
      reason: "test-fixture-no-gsc",
    }),
  });
}

function findCandidate(slug: string, report: Awaited<ReturnType<typeof buildLiveReport>>) {
  const pools = [
    report.top_candidates,
    report.blocked_or_rejected,
    report.reference_link_candidates,
    report.direct_buy_candidates,
  ];
  for (const pool of pools) {
    const hit = pool.find((c) => c.filter_slug === slug);
    if (hit) return hit;
  }
  assert.fail(`expected candidate ${slug}`);
}

function classifyLiveSlug(slug: string) {
  return classifyApFilterCandidateV1({
    filter: loadFilter(slug),
    primaryLink: loadPrimaryLink(slug),
    allLinks: [],
    compatModelCount: 0,
    gscPageImpressions: 0,
    gscQueryImpressions: 0,
    liveFilterSlugs: new Set([slug]),
    aliasOrRedirectGscSlugs: [],
  });
}

test("report contract is read-only and names air_purifier_batch_production_lane_v1", async () => {
  const report = await buildLiveReport();
  assert.equal(report.report_name, "air_purifier_batch_production_lane_v1");
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.ok(report.generated_at);
  assert.ok(report.candidate_count >= 50);
  for (const state of AP_BATCH_PRODUCTION_LANE_STATES_V1) {
    assert.equal(typeof report.state_counts[state], "number");
  }
});

test("Honeywell direct_buyable rows classify as existing_direct_buyable", async () => {
  const report = await buildLiveReport();
  for (const slug of ["honeywell-hrf-r1", "honeywell-hrf-r2", "honeywell-hrf-r3"]) {
    const row = findCandidate(slug, report);
    assert.equal(row.state, "existing_direct_buyable", slug);
    assert.equal(row.gate_failure, null, slug);
  }
  assert.ok(
    report.state_counts.existing_direct_buyable >= 3,
    `expected at least 3 existing_direct_buyable (Honeywell R1/R2/R3); got ${report.state_counts.existing_direct_buyable}`,
  );
});

test("Shark likely_valid rows classify as existing_official_reference", async () => {
  const report = await buildLiveReport();
  for (const slug of ["shark-hepa-he15fkp", "shark-hepa-he3fkp"]) {
    const row = findCandidate(slug, report);
    assert.equal(row.state, "existing_official_reference", slug);
  }
  assert.ok(report.state_counts.existing_official_reference >= 2);
});

test("Shark URL without proof classifies as reference_candidate", () => {
  const result = classifyApFilterCandidateV1({
    filter: {
      brand_slug: "shark",
      slug: "shark-hepa-hp100",
      oem_part_number: "SHARK-HEPA-HP100",
      name: "test",
    },
    primaryLink: {
      filter_slug: "shark-hepa-hp100",
      affiliate_url: "https://www.sharkclean.com/products/hp100-hepa-filter-zidHP100FKPET",
      is_primary: "true",
      retailer_key: "shark-official",
    },
    allLinks: [],
    compatModelCount: 1,
    gscPageImpressions: 0,
    gscQueryImpressions: 0,
    liveFilterSlugs: new Set(["shark-hepa-hp100"]),
    aliasOrRedirectGscSlugs: [],
  });
  assert.equal(result.state, "reference_candidate");
});

test("Blueair F4MAX drift is catalog_identity_gap not buyer-path rescue on particle-411", async () => {
  const report = await buildLiveReport();
  const row = findCandidate("blueair-particle-411", report);
  assert.equal(row.state, "catalog_identity_gap");
  assert.notEqual(row.state, "direct_buy_candidate");
  assert.notEqual(row.state, "existing_direct_buyable");
  const gap = report.catalog_identity_gaps.find((g) => g.gap_id === "blueair-f4max-411-gsc-slug");
  assert.ok(gap);
  assert.match(gap!.issue, /unsafe to alias/i);
  assert.match(gap!.safe_action, /Catalog task/i);
});

test("search-placeholder AP rows classify as search_placeholder_rescue_needed", () => {
  for (const slug of ["coway-max2-hepa", "winix-hepa-115115", "blueair-f2-211"]) {
    const result = classifyLiveSlug(slug);
    assert.equal(result.state, "search_placeholder_rescue_needed", slug);
    const primary = loadPrimaryLink(slug);
    assert.ok(primary);
    const { buyLinkGateFailureKind } = require("@/lib/retailers/launch-buy-links") as typeof import("@/lib/retailers/launch-buy-links");
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: primary!.retailer_key ?? null,
        affiliate_url: primary!.affiliate_url,
        browser_truth_classification: primary!.browser_truth_classification ?? null,
      }),
      "search_placeholder",
      slug,
    );
  }
});

test("report does not mutate AP CSV files", async () => {
  const csvPaths = [
    "data/air-purifier/filters.csv",
    "data/air-purifier/filter_aliases.csv",
    "data/air-purifier/compatibility_mappings.csv",
    "data/air-purifier/retailer_links.csv",
  ];
  const before = csvPaths.map((rel) => {
    const abs = path.join(REPO_ROOT, rel);
    const st = statSync(abs);
    return { rel, mtimeMs: st.mtimeMs, content: readFileSync(abs, "utf8") };
  });

  await buildLiveReport();
  await buildLiveReport();

  for (const snap of before) {
    const abs = path.join(REPO_ROOT, snap.rel);
    const afterContent = readFileSync(abs, "utf8");
    assert.equal(afterContent, snap.content, `${snap.rel} content changed`);
  }
});

test("agent work packets include blueair catalog identity packet", async () => {
  const report = await buildLiveReport();
  const packet = report.agent_work_packets.find((p) => p.packet_id === "ap-blueair-catalog-identity-v1");
  assert.ok(packet);
  assert.equal(packet!.owner_review_required, true);
  assert.ok(packet!.candidate_slugs.includes("blueair-particle-411"));
  assert.match(packet!.reject_rules.join(" "), /alias/i);
});
