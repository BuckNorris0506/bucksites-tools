import assert from "node:assert/strict";
import test from "node:test";

import { evaluateBuckpartsSystemContractAudit } from "./audit-buckparts-system-contracts";

function baseSources() {
  return {
    learningOutcomesMigration: "create table x (slug text not null);",
    learningOutcomesWriter:
      "const payload = { slug: input.slug, part_number: input.part_number };",
    affiliateTrackerJson: JSON.stringify([
      { id: "amazon-associates", status: "APPROVED", tagVerified: true },
    ]),
    goRedirectGate: 'export const AMAZON_AFFILIATE_TAG = "buckparts20-20";',
    packageJson: JSON.stringify({
      scripts: {
        test: "node --import tsx --test scripts/**/*.test.ts",
      },
    }),
    commandSurfaceReport: `
      export async function buildBuckpartsCommandSurfaceReport() {
        return {
          cleanup_progress: {
            status: "PINNED_MANUAL",
            completed_steps: 20,
            total_steps: 20,
            reason: "Manual Phase 1 cleanup counter; not auto-computed.",
          },
        };
      }
    `,
    scriptManifest: `
      ## 2) FROZEN / TACTICAL SYSTEMS
      - Transitional generation/emit utilities
        - Paths: \`scripts/generate-ap-wh-retailer-links.ts\`
      ## 3) CANDIDATES TO CUT LATER
    `,
  };
}

test("passing state returns PASS", () => {
  const report = evaluateBuckpartsSystemContractAudit(baseSources());
  assert.equal(report.status, "PASS");
  assert.equal(report.blocking, false);
  assert.deepEqual(report.summary, { critical: 0, high: 0, medium: 0 });
  assert.deepEqual(report.failures, []);
});

test("failing slug mismatch returns CRITICAL", () => {
  const sources = baseSources();
  sources.learningOutcomesWriter = "const payload = { part_number: input.part_number };";
  const report = evaluateBuckpartsSystemContractAudit(sources);
  assert.equal(report.status, "FAIL");
  assert.equal(report.blocking, true);
  assert.equal(report.summary.critical > 0, true);
  assert.equal(
    report.failures.some(
      (f) => f.id === "learning_outcomes_schema_writer_slug_mismatch" && f.severity === "CRITICAL",
    ),
    true,
  );
});

test("failing affiliate mismatch returns CRITICAL", () => {
  const sources = baseSources();
  sources.affiliateTrackerJson = JSON.stringify([
    { id: "amazon-associates", status: "NOT_STARTED" },
  ]);
  const report = evaluateBuckpartsSystemContractAudit(sources);
  assert.equal(report.status, "FAIL");
  assert.equal(report.blocking, true);
  assert.equal(
    report.failures.some((f) => f.id === "amazon_affiliate_truth_mismatch"),
    true,
  );
});

test("failing missing test runner returns CRITICAL", () => {
  const sources = baseSources();
  sources.packageJson = JSON.stringify({ scripts: { build: "next build" } });
  const report = evaluateBuckpartsSystemContractAudit(sources);
  assert.equal(report.status, "FAIL");
  assert.equal(report.blocking, true);
  assert.equal(
    report.failures.some((f) => f.id === "missing_test_runner_script"),
    true,
  );
});

test("HIGH-only findings keep PASS and blocking false", () => {
  const sources = baseSources();
  sources.packageJson = JSON.stringify({
    scripts: {
      test: "node --import tsx --test scripts/**/*.test.ts",
      "seed:generate:ap-wh-retailer-links": "tsx scripts/generate-ap-wh-retailer-links.ts",
    },
  });
  const report = evaluateBuckpartsSystemContractAudit(sources);
  assert.equal(report.status, "PASS");
  assert.equal(report.blocking, false);
  assert.equal(report.summary.high > 0, true);
  assert.equal(report.summary.critical, 0);
  assert.equal(
    report.failures.some(
      (f) => f.id === "frozen_scripts_exposed_without_guard" && f.severity === "HIGH",
    ),
    true,
  );
});

test("unverified amazon tag emits HIGH but stays PASS", () => {
  const sources = baseSources();
  sources.affiliateTrackerJson = JSON.stringify([
    { id: "amazon-associates", status: "APPROVED", tagVerified: false },
  ]);
  const report = evaluateBuckpartsSystemContractAudit(sources);
  assert.equal(report.status, "PASS");
  assert.equal(report.blocking, false);
  assert.equal(
    report.failures.some(
      (f) => f.id === "amazon_affiliate_tag_unverified" && f.severity === "HIGH",
    ),
    true,
  );
});
