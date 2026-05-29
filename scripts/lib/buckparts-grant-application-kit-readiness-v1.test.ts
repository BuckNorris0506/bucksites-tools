import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_GRANT_APPLICATION_KIT_READINESS_CONTRACT_V1,
  GRANT_KIT_DOC_PATHS,
  GRANT_KIT_TONE_SCAN_DOC_IDS,
  buildBuckpartsGrantApplicationKitReadinessV1,
} from "./buckparts-grant-application-kit-readiness-v1";

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
  "data/whole-house-water/batch-production/agent-results-buyer-path-v1/whw-buyer-path-3m-ap811-batch-v1.results.json",
  "src/lib/catalog/vertical-launch-state.ts",
  "src/lib/retailers/launch-buy-links.ts",
  "src/app/whole-house-water/page.tsx",
  "src/app/truth-policy/page.tsx",
  "src/app/wrong-part-prevention/page.tsx",
];

function snapshotMtimes(paths: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const rel of paths) {
    const abs = path.join(REPO_ROOT, rel);
    if (existsSync(abs)) map.set(rel, statSync(abs).mtimeMs);
  }
  return map;
}

test("report is read_only with data_mutation false", () => {
  const report = buildBuckpartsGrantApplicationKitReadinessV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, BUCKPARTS_GRANT_APPLICATION_KIT_READINESS_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("report detects all grant kit docs and trust pages", () => {
  const report = buildBuckpartsGrantApplicationKitReadinessV1({ rootDir: REPO_ROOT });
  assert.equal(report.grant_docs_present, true);
  assert.equal(report.truth_policy_route_present, true);
  assert.equal(report.wrong_part_prevention_route_present, true);
  assert.equal(report.public_trust_pages_present, true);
  assert.equal(report.truth_claims_register_has_forbidden_section, true);
  for (const rel of Object.values(GRANT_KIT_DOC_PATHS)) {
    assert.ok(existsSync(path.join(REPO_ROOT, rel)), rel);
  }
  for (const rel of TRUST_PAGE_PATHS) {
    assert.ok(existsSync(path.join(REPO_ROOT, rel)), rel);
  }
});

test("grant tone-scan docs avoid forbidden promotional claims", () => {
  const report = buildBuckpartsGrantApplicationKitReadinessV1({ rootDir: REPO_ROOT });
  assert.equal(report.forbidden_claim_violations.length, 0, report.forbidden_claim_violations.join("; "));
  for (const docId of GRANT_KIT_TONE_SCAN_DOC_IDS) {
    const src = readFileSync(path.join(REPO_ROOT, GRANT_KIT_DOC_PATHS[docId]), "utf8");
    assert.ok(!/\bguaranteed savings\b/i.test(src), docId);
    assert.ok(!/\bevery filter has been verified\b/i.test(src), docId);
    assert.ok(!/\bonly source of truth\b/i.test(src), docId);
    assert.ok(!/\baffiliate first\b/i.test(src), docId);
  }
});

test("grant tone-scan docs do not assert unproven traffic revenue or customer counts", () => {
  const report = buildBuckpartsGrantApplicationKitReadinessV1({ rootDir: REPO_ROOT });
  assert.equal(report.unproven_metric_violations.length, 0, report.unproven_metric_violations.join("; "));
  for (const docId of GRANT_KIT_TONE_SCAN_DOC_IDS) {
    const src = readFileSync(path.join(REPO_ROOT, GRANT_KIT_DOC_PATHS[docId]), "utf8");
    assert.ok(!/\b\d{1,7}\+?\s+(users|customers|visitors)\b/i.test(src), docId);
    assert.ok(!/\$\d[\d,]*\s*(MRR|ARR|revenue)\b/i.test(src), docId);
  }
});

test("positioning risks remain LOW and kit is ready for Jared review", () => {
  const report = buildBuckpartsGrantApplicationKitReadinessV1({
    rootDir: REPO_ROOT,
    repoCheckpointCommit: "aec8b8c",
  });
  assert.equal(report.ecommerce_positioning_risk, "LOW");
  assert.equal(report.affiliate_overclaim_risk, "LOW");
  assert.equal(report.kit_ready_for_jared_review, true);
  assert.match(report.grant_positioning_summary, /ready for Jared/i);
});

test("missing grant docs fail kit readiness", () => {
  const report = buildBuckpartsGrantApplicationKitReadinessV1({
    rootDir: REPO_ROOT,
    fileExists: () => false,
    readTextFile: () => "",
  });
  assert.equal(report.grant_docs_present, false);
  assert.equal(report.kit_ready_for_jared_review, false);
  assert.equal(report.ecommerce_positioning_risk, "HIGH");
});

test("read-only build does not mutate product CSV, launch-state, buy-gate, WHW artifacts, or public UI", () => {
  const forbiddenBefore = new Map(
    FORBIDDEN_MUTATION_PATHS.filter((p) => existsSync(path.join(REPO_ROOT, p))).map((p) => [
      p,
      readFileSync(path.join(REPO_ROOT, p), "utf8"),
    ]),
  );
  const mtimesBefore = snapshotMtimes(FORBIDDEN_MUTATION_PATHS);

  buildBuckpartsGrantApplicationKitReadinessV1({ rootDir: REPO_ROOT });

  for (const [p, content] of forbiddenBefore) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content, `${p} mutated`);
  }
  for (const [p, mtime] of mtimesBefore) {
    assert.equal(statSync(path.join(REPO_ROOT, p)).mtimeMs, mtime, `${p} mtime changed`);
  }
});
