import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateDeployClassificationV1,
  BUCKPARTS_DEPLOY_BATCHING_POLICY_CONTRACT_V1,
  BUCKPARTS_DEPLOY_CLASSIFIER_RULES_V1,
  buildBuckpartsDeployClassifierReportV1,
  classifyDeployPathV1,
  deployOperatorActionV1,
  deployOperatorSummaryV1,
  parseDeployClassifierCliArgsV1,
  resolveDeployClassifierChangedFilesV1,
} from "./buckparts-deploy-classifier-v1";

test("classifyDeployPathV1 — production runtime paths are DEPLOY_REQUIRED", () => {
  assert.equal(classifyDeployPathV1("src/app/filter/[slug]/page.tsx").classification, "DEPLOY_REQUIRED");
  assert.equal(classifyDeployPathV1("src/components/FilterCard.tsx").classification, "DEPLOY_REQUIRED");
  assert.equal(classifyDeployPathV1("src/lib/buyer-path/truth.ts").classification, "DEPLOY_REQUIRED");
  assert.equal(classifyDeployPathV1("netlify.toml").classification, "DEPLOY_REQUIRED");
  assert.equal(classifyDeployPathV1("next.config.ts").classification, "DEPLOY_REQUIRED");
  assert.equal(classifyDeployPathV1("package.json").classification, "DEPLOY_REQUIRED");
  assert.equal(classifyDeployPathV1("data/retailer_links.csv").classification, "DEPLOY_REQUIRED");
  assert.equal(classifyDeployPathV1("public/robots.txt").classification, "DEPLOY_REQUIRED");
});

test("classifyDeployPathV1 — read-only operator artifacts are NO_DEPLOY_NEEDED", () => {
  assert.equal(
    classifyDeployPathV1(
      "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-readiness-gate-v1.json",
    ).classification,
    "NO_DEPLOY_NEEDED",
  );
  assert.equal(
    classifyDeployPathV1("data/fridge/batch-production/drafts/manufacturer-browser-proof-batch-commit-assist-guide-everydrop-whirlpool-v1.md").classification,
    "NO_DEPLOY_NEEDED",
  );
  assert.equal(classifyDeployPathV1("audit-exports/buckparts-audit.md").classification, "NO_DEPLOY_NEEDED");
  assert.equal(classifyDeployPathV1("scripts/lib/buckparts-deploy-classifier-v1.ts").classification, "NO_DEPLOY_NEEDED");
  assert.equal(classifyDeployPathV1("docs/BuckParts-TRUTH.md").classification, "NO_DEPLOY_NEEDED");
  assert.equal(classifyDeployPathV1("scripts/lib/foo.test.ts").classification, "NO_DEPLOY_NEEDED");
});

test("classifyDeployPathV1 — Command Center snapshots and ledger are DEPLOY_OPTIONAL", () => {
  assert.equal(
    classifyDeployPathV1("data/reports/buckparts-command-center.json").classification,
    "DEPLOY_OPTIONAL",
  );
  assert.equal(
    classifyDeployPathV1("data/command-center/execution-ledger-v1.json").classification,
    "DEPLOY_OPTIONAL",
  );
  assert.equal(
    classifyDeployPathV1("data/command-center/issues/ap-demand-selected.json").classification,
    "DEPLOY_OPTIONAL",
  );
  assert.equal(classifyDeployPathV1("mcp/buckparts-truth/server.ts").classification, "DEPLOY_OPTIONAL");
});

test("classifyDeployPathV1 — unclassified paths are UNKNOWN", () => {
  assert.equal(classifyDeployPathV1("mystery-root-file.xyz").classification, "UNKNOWN");
});

test("aggregateDeployClassificationV1 priority", () => {
  assert.equal(
    aggregateDeployClassificationV1([
      { path: "a", classification: "NO_DEPLOY_NEEDED", rule_id: "x", notes: "" },
      { path: "b", classification: "DEPLOY_REQUIRED", rule_id: "y", notes: "" },
    ]),
    "DEPLOY_REQUIRED",
  );
  assert.equal(
    aggregateDeployClassificationV1([
      { path: "a", classification: "NO_DEPLOY_NEEDED", rule_id: "x", notes: "" },
      { path: "b", classification: "DEPLOY_OPTIONAL", rule_id: "y", notes: "" },
    ]),
    "DEPLOY_OPTIONAL",
  );
  assert.equal(
    aggregateDeployClassificationV1([
      { path: "a", classification: "NO_DEPLOY_NEEDED", rule_id: "x", notes: "" },
      { path: "b", classification: "UNKNOWN", rule_id: "y", notes: "" },
    ]),
    "UNKNOWN",
  );
  assert.equal(aggregateDeployClassificationV1([]), "NO_DEPLOY_NEEDED");
});

test("deployOperatorSummaryV1 exact operator strings", () => {
  assert.match(
    deployOperatorSummaryV1({
      aggregate: "DEPLOY_REQUIRED",
      action: "PUSH_AND_DEPLOY",
      changed_file_count: 2,
    }),
    /^PUSH AND DEPLOY/,
  );
  assert.match(
    deployOperatorSummaryV1({
      aggregate: "NO_DEPLOY_NEEDED",
      action: "BATCH_LOCALLY",
      changed_file_count: 5,
    }),
    /^BATCH LOCALLY/,
  );
  assert.match(
    deployOperatorSummaryV1({
      aggregate: "DEPLOY_OPTIONAL",
      action: "PUSH_BATCH_LOCALLY",
      changed_file_count: 1,
    }),
    /^BATCH LOCALLY \(deploy optional\)/,
  );
  assert.match(
    deployOperatorSummaryV1({
      aggregate: "UNKNOWN",
      action: "HOLD_REVIEW",
      changed_file_count: 1,
    }),
    /^HOLD/,
  );
});

test("buildBuckpartsDeployClassifierReportV1 draft-only batch classifies NO_DEPLOY_NEEDED", () => {
  const report = buildBuckpartsDeployClassifierReportV1({
    scope: "paths",
    paths: [
      "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-runner-v1.json",
      "data/fridge/batch-production/drafts/manufacturer-rescue-throughput-analytics-v1.md",
    ],
  });
  assert.equal(report.contract, BUCKPARTS_DEPLOY_BATCHING_POLICY_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.aggregate_classification, "NO_DEPLOY_NEEDED");
  assert.equal(report.operator_action, "BATCH_LOCALLY");
  assert.equal(deployOperatorActionV1("NO_DEPLOY_NEEDED"), "BATCH_LOCALLY");
});

test("buildBuckpartsDeployClassifierReportV1 mixed draft + runtime is DEPLOY_REQUIRED", () => {
  const report = buildBuckpartsDeployClassifierReportV1({
    scope: "paths",
    paths: [
      "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-runner-v1.json",
      "data/retailer_links.csv",
    ],
  });
  assert.equal(report.aggregate_classification, "DEPLOY_REQUIRED");
  assert.equal(report.operator_action, "PUSH_AND_DEPLOY");
});

test("resolveDeployClassifierChangedFilesV1 uses git provider for push-ahead", () => {
  const resolved = resolveDeployClassifierChangedFilesV1({
    scope: "push-ahead",
    git: {
      revParseOriginMain: () => "abc",
      filesChangedAheadOfOriginMain: () => ["scripts/foo.ts"],
      filesChangedWorkingTree: () => [],
      filesStaged: () => [],
      filesInRange: () => [],
    },
  });
  assert.deepEqual(resolved.changed_files, ["scripts/foo.ts"]);
  assert.equal(resolved.scope_range, "origin/main...HEAD");
});

test("parseDeployClassifierCliArgsV1", () => {
  assert.deepEqual(parseDeployClassifierCliArgsV1([]), {
    scope: "push-ahead",
    range: null,
    paths: [],
    summaryOnly: false,
  });
  assert.equal(parseDeployClassifierCliArgsV1(["--working-tree"]).scope, "working-tree");
  assert.equal(parseDeployClassifierCliArgsV1(["--range", "a..b"]).range, "a..b");
  assert.deepEqual(parseDeployClassifierCliArgsV1(["--paths", "foo.json", "bar.md"]).paths, [
    "foo.json",
    "bar.md",
  ]);
  assert.equal(parseDeployClassifierCliArgsV1(["--summary-only"]).summaryOnly, true);
});

test("rule catalog covers core policy buckets", () => {
  const ids = new Set(BUCKPARTS_DEPLOY_CLASSIFIER_RULES_V1.map((r) => r.rule_id));
  for (const required of [
    "production_app_routes",
    "customer_visible_csv",
    "draft_batch_production",
    "command_center_snapshot",
    "execution_ledger_artifact",
    "scripts_only",
  ]) {
    assert.ok(ids.has(required), `missing rule ${required}`);
  }
});

test("live repo push-ahead classifier returns structured report", () => {
  const report = buildBuckpartsDeployClassifierReportV1({
    scope: "paths",
    paths: [],
  });
  assert.equal(report.aggregate_classification, "NO_DEPLOY_NEEDED");
  assert.ok(report.operator_summary.length > 0);
});
