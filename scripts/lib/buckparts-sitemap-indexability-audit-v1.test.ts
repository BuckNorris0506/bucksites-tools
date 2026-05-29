import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { getVerticalLaunchState, isVerticalLive } from "@/lib/catalog/vertical-launch-state";
import {
  BUCKPARTS_SITEMAP_INDEXABILITY_AUDIT_CONTRACT_V1,
  __test_only__repoExpectedStaticRoutesV1,
  buildBuckpartsSitemapIndexabilityAuditV1,
  repoSitemapDynamicVerticalsV1,
} from "./buckparts-sitemap-indexability-audit-v1";

const REPO_ROOT = process.cwd();

const FORBIDDEN_MUTATION_PATHS = [
  "src/lib/catalog/vertical-launch-state.ts",
  "src/lib/retailers/launch-buy-links.ts",
  "src/app/sitemap.ts",
  "src/lib/sitemap/wedge-indexable-urls.ts",
  "data/whole-house-water/retailer_links.csv",
  "data/whole-house-water/batch-production/browser-truth-results-v1/whw-browser-truth-3m-ap811-v1.results.json",
];

const SAMPLE_LIVE_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://buckparts.com/</loc></url>
  <url><loc>https://buckparts.com/catalog</loc></url>
  <url><loc>https://buckparts.com/search</loc></url>
  <url><loc>https://buckparts.com/air-purifier</loc></url>
  <url><loc>https://buckparts.com/air-purifier/search</loc></url>
  <url><loc>https://buckparts.com/fridge/lg-lfxs26973s</loc></url>
  <url><loc>https://buckparts.com/whole-house-water/model/3m-aquapure-ap802</loc></url>
</urlset>`;

function snapshotMtimes(paths: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const rel of paths) {
    const abs = path.join(REPO_ROOT, rel);
    if (existsSync(abs)) map.set(rel, statSync(abs).mtimeMs);
  }
  return map;
}

test("audit is read_only true and data_mutation false", async () => {
  const audit = await buildBuckpartsSitemapIndexabilityAuditV1({
    rootDir: REPO_ROOT,
    skipLiveFetch: true,
  });
  assert.equal(audit.contract, BUCKPARTS_SITEMAP_INDEXABILITY_AUDIT_CONTRACT_V1);
  assert.equal(audit.read_only, true);
  assert.equal(audit.data_mutation, false);
});

test("audit derives LIVE indexable wedges from repo launch state", async () => {
  assert.equal(isVerticalLive("refrigerator"), true);
  assert.equal(isVerticalLive("air-purifier"), true);
  assert.equal(isVerticalLive("whole-house-water"), false);

  const audit = await buildBuckpartsSitemapIndexabilityAuditV1({
    rootDir: REPO_ROOT,
    skipLiveFetch: true,
  });
  assert.ok(audit.live_wedges_indexable.includes(HOMEKEEP_WEDGE_CATALOG.refrigerator_water));
  assert.ok(audit.live_wedges_indexable.includes(HOMEKEEP_WEDGE_CATALOG.air_purifier));
  assert.equal(
    audit.excluded_wedges.includes(HOMEKEEP_WEDGE_CATALOG.whole_house_water),
    true,
  );
});

test("fridge and AP are treated as indexable public wedges", async () => {
  const audit = await buildBuckpartsSitemapIndexabilityAuditV1({
    rootDir: REPO_ROOT,
    skipLiveFetch: true,
  });
  const fridge = audit.expected_dynamic_route_counts.find(
    (r) => r.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  );
  const ap = audit.expected_dynamic_route_counts.find(
    (r) => r.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier,
  );
  assert.ok(fridge);
  assert.ok(ap);
  assert.equal(fridge!.indexable_in_repo_policy, true);
  assert.equal(ap!.indexable_in_repo_policy, true);
  assert.ok(fridge!.total_dynamic_urls > 0);
  assert.ok(ap!.total_dynamic_urls > 0);
  assert.deepEqual(repoSitemapDynamicVerticalsV1().sort(), ["air-purifier", "refrigerator"]);
});

test("WHW is not treated as broadly indexable while NOINDEX_UNPROVEN", async () => {
  assert.equal(getVerticalLaunchState("whole-house-water"), "NOINDEX_UNPROVEN");
  const audit = await buildBuckpartsSitemapIndexabilityAuditV1({
    rootDir: REPO_ROOT,
    skipLiveFetch: true,
    liveSitemapXml: SAMPLE_LIVE_SITEMAP,
  });
  const whw = audit.expected_dynamic_route_counts.find(
    (r) => r.wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water,
  );
  assert.ok(whw);
  assert.equal(whw!.indexable_in_repo_policy, false);
  assert.equal(whw!.total_dynamic_urls, 0);
  assert.ok(
    audit.unexpected_risky_urls.some((u) => u.includes("/whole-house-water/")),
  );
});

test("sample-only wedges are not treated as safe indexable inventory", async () => {
  const audit = await buildBuckpartsSitemapIndexabilityAuditV1({
    rootDir: REPO_ROOT,
    skipLiveFetch: true,
  });
  for (const wedge of [
    HOMEKEEP_WEDGE_CATALOG.vacuum,
    HOMEKEEP_WEDGE_CATALOG.humidifier,
    HOMEKEEP_WEDGE_CATALOG.appliance_air,
  ] as const) {
    assert.ok(audit.excluded_wedges.includes(wedge));
    const row = audit.expected_dynamic_route_counts.find((r) => r.wedge === wedge);
    assert.ok(row);
    assert.equal(row!.indexable_in_repo_policy, false);
    assert.equal(row!.total_dynamic_urls, 0);
  }
});

test("trust pages are not in repo sitemap static emitter", () => {
  const staticRoutes = __test_only__repoExpectedStaticRoutesV1("https://buckparts.com");
  assert.ok(staticRoutes.includes("/"));
  assert.ok(staticRoutes.includes("/catalog"));
  assert.ok(staticRoutes.includes("/air-purifier"));
  assert.equal(staticRoutes.includes("/truth-policy"), false);
  assert.equal(staticRoutes.includes("/wrong-part-prevention"), false);
});

test("GSC indexed and discovered counts remain UNKNOWN without artifact proof", async () => {
  const audit = await buildBuckpartsSitemapIndexabilityAuditV1({
    rootDir: REPO_ROOT,
    skipLiveFetch: true,
  });
  assert.equal(audit.gsc_indexed_count, "UNKNOWN");
  assert.equal(audit.gsc_discovered_count, "UNKNOWN");
  assert.equal(audit.seventy_five_indexed_page_threshold_status, "UNKNOWN");
});

test("audit does not recommend marketing campaign READY without threshold evidence", async () => {
  const audit = await buildBuckpartsSitemapIndexabilityAuditV1({
    rootDir: REPO_ROOT,
    skipLiveFetch: true,
  });
  assert.notEqual(audit.first_campaign_indexability_status, "READY");
  assert.equal(audit.first_campaign_indexability_status, "NOT_READY");
  assert.ok(audit.recommended_next_action.toLowerCase().includes("do not launch"));
  assert.ok(audit.repo_expected_indexable_url_count > 0);
});

test("read-only audit build does not mutate forbidden paths", async () => {
  const mtimesBefore = snapshotMtimes(FORBIDDEN_MUTATION_PATHS);
  const csvBefore = readFileSync(
    path.join(REPO_ROOT, "data/whole-house-water/retailer_links.csv"),
    "utf8",
  );

  await buildBuckpartsSitemapIndexabilityAuditV1({
    rootDir: REPO_ROOT,
    skipLiveFetch: true,
  });

  assert.equal(
    readFileSync(path.join(REPO_ROOT, "data/whole-house-water/retailer_links.csv"), "utf8"),
    csvBefore,
  );
  for (const [rel, mtime] of mtimesBefore) {
    assert.equal(statSync(path.join(REPO_ROOT, rel)).mtimeMs, mtime, `${rel} mtime changed`);
  }
});
