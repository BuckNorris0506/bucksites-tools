import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_GRANT_READINESS_CONTRACT_V1,
  buildBuckpartsGrantReadinessV1,
} from "./buckparts-grant-readiness-v1";

const REPO_ROOT = process.cwd();

const TRUST_PAGE_PATHS = [
  "src/app/truth-policy/page.tsx",
  "src/app/wrong-part-prevention/page.tsx",
];

const FORBIDDEN_MUTATION_PATHS = [
  "data/retailer_links.csv",
  "data/whole-house-water/retailer_links.csv",
  "data/whole-house-water/models.csv",
  "data/whole-house-water/filters.csv",
  "data/whole-house-water/compatibility_mappings.csv",
  "src/lib/catalog/vertical-launch-state.ts",
  "src/lib/retailers/launch-buy-links.ts",
  "src/app/whole-house-water/page.tsx",
];

function snapshotMtimes(paths: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const rel of paths) {
    const abs = path.join(REPO_ROOT, rel);
    if (existsSync(abs)) map.set(rel, statSync(abs).mtimeMs);
  }
  return map;
}

function readPage(rel: string): string {
  return readFileSync(path.join(REPO_ROOT, rel), "utf8");
}

test("report is read_only with data_mutation false", () => {
  const report = buildBuckpartsGrantReadinessV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, BUCKPARTS_GRANT_READINESS_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("report detects public trust pages and routes", () => {
  const report = buildBuckpartsGrantReadinessV1({ rootDir: REPO_ROOT });
  assert.equal(report.public_trust_pages_present, true);
  assert.equal(report.truth_policy_route_present, true);
  assert.equal(report.wrong_part_prevention_route_present, true);
  assert.ok(report.use_of_funds_categories.includes("verification_tools"));
  assert.ok(report.use_of_funds_categories.includes("development_capacity"));
});

test("trust pages avoid ecommerce/store-first positioning", () => {
  const combined = TRUST_PAGE_PATHS.map(readPage).join("\n");
  for (const rel of TRUST_PAGE_PATHS) {
    const src = readPage(rel);
    assert.ok(!/\bshop now\b/i.test(src), rel);
    assert.ok(!/\badd to cart\b/i.test(src), rel);
    assert.ok(!/\becommerce\b/i.test(src), rel);
    assert.ok(
      !/\bonline store\b/i.test(src) || /not an online store/i.test(src),
      rel,
    );
  }
  assert.match(combined, /not.*store|not the seller|not.*manufacturer|not.*maker/i);
});

test("trust pages say affiliate links are secondary to truth", () => {
  const truth = readPage("src/app/truth-policy/page.tsx");
  assert.match(truth, /secondary.*truth|Affiliate links do not decide/i);
  assert.match(truth, /Revenue does not override fit evidence/i);
  assert.match(truth, /not.*online store/i);
});

test("trust pages do not promise guaranteed savings", () => {
  for (const rel of TRUST_PAGE_PATHS) {
    const src = readPage(rel);
    assert.ok(!/\bguaranteed savings\b/i.test(src), rel);
    assert.ok(!/\bsave \$\d+/i.test(src), rel);
    assert.ok(!/\bbest price\b/i.test(src), rel);
  }
  const prevention = readPage("src/app/wrong-part-prevention/page.tsx");
  assert.match(prevention, /do not promise specific dollar savings/i);
});

test("trust pages do not claim BuckParts is source of all truth", () => {
  for (const rel of TRUST_PAGE_PATHS) {
    const src = readPage(rel);
    assert.ok(!/\bonly source of truth\b/i.test(src), rel);
    assert.ok(!/\bdefinitive authority\b/i.test(src), rel);
    assert.ok(!/\bwe guarantee fit\b/i.test(src), rel);
  }
  const prevention = readPage("src/app/wrong-part-prevention/page.tsx");
  assert.match(prevention, /not a substitute for reading your old part/i);
});

test("trust pages do not overclaim all filters or parts are verified", () => {
  const prevention = readPage("src/app/wrong-part-prevention/page.tsx");
  assert.match(prevention, /does not guarantee that every filter/i);
  assert.ok(!/\bevery filter has been verified\b/i.test(prevention));
  assert.ok(!/\bcomplete catalog coverage\b/i.test(prevention));
  assert.ok(!/\buniversal coverage\b/i.test(prevention));
});

test("positioning risks are low when trust pages present", () => {
  const report = buildBuckpartsGrantReadinessV1({ rootDir: REPO_ROOT });
  assert.equal(report.ecommerce_positioning_risk, "LOW");
  assert.equal(report.affiliate_overclaim_risk, "LOW");
  assert.match(report.grant_positioning_summary, /truth-first/i);
  assert.match(report.grant_positioning_summary, /affiliate links are secondary/i);
});

test("read-only build does not mutate product CSV, Supabase paths, launch-state, buy-gate, dispatch-run, batch-review, or retailer_links", () => {
  const forbiddenBefore = new Map(
    FORBIDDEN_MUTATION_PATHS.filter((p) => existsSync(path.join(REPO_ROOT, p))).map((p) => [
      p,
      readFileSync(path.join(REPO_ROOT, p), "utf8"),
    ]),
  );
  const mtimesBefore = snapshotMtimes(FORBIDDEN_MUTATION_PATHS);

  buildBuckpartsGrantReadinessV1({ rootDir: REPO_ROOT });

  for (const [p, content] of forbiddenBefore) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content, `${p} mutated`);
  }
  for (const [p, mtime] of mtimesBefore) {
    assert.equal(statSync(path.join(REPO_ROOT, p)).mtimeMs, mtime, `${p} mtime changed`);
  }
});

test("missing trust pages raise route flags and positioning risk", () => {
  const report = buildBuckpartsGrantReadinessV1({
    rootDir: REPO_ROOT,
    fileExists: () => false,
    readTextFile: () => "",
  });
  assert.equal(report.public_trust_pages_present, false);
  assert.equal(report.truth_policy_route_present, false);
  assert.equal(report.wrong_part_prevention_route_present, false);
  assert.equal(report.ecommerce_positioning_risk, "HIGH");
  assert.equal(report.affiliate_overclaim_risk, "HIGH");
});
