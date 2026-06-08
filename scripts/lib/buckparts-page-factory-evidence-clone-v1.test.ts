import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_PAGE_FACTORY_EVIDENCE_CLONE_CONTRACT_V1,
  PAGE_FACTORY_EVIDENCE_CLONE_ALLOWED_WRITE_REL_PATHS_V1,
  buildPageFactoryEvidenceCloneReportV1,
  evidenceCloneArtifactRelPathsV1,
  writePageFactoryEvidenceCloneArtifactsV1,
} from "./buckparts-page-factory-evidence-clone-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-page-factory-evidence-clone-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  "scripts/report-buckparts-page-factory-evidence-clone-v1.ts",
  "utf8",
);

test("contract and read-only flags on SR→WW fixture", () => {
  const report = buildPageFactoryEvidenceCloneReportV1({
    rootDir: ROOT,
    sourceSlug: "samsung-rf28r7351sr",
    targetSlug: "samsung-rf28r7351ww",
    familyKey: "samsung::HAFQIN",
  });

  assert.equal(report.contract, BUCKPARTS_PAGE_FACTORY_EVIDENCE_CLONE_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_blocked_until_owner_approval, true);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.source_slug, "samsung-rf28r7351sr");
  assert.equal(report.target_slug, "samsung-rf28r7351ww");
  assert.equal(report.family_key, "samsung::HAFQIN");
});

test("SR→WW fixture is NEEDS_TARGET_EVIDENCE with expected proof and inherit plan", () => {
  const report = buildPageFactoryEvidenceCloneReportV1({
    rootDir: ROOT,
    sourceSlug: "samsung-rf28r7351sr",
    targetSlug: "samsung-rf28r7351ww",
    familyKey: "samsung::HAFQIN",
  });

  assert.equal(report.clone_status, "NEEDS_TARGET_EVIDENCE");
  assert.equal(report.source_evidence_status, "PASS");
  assert.equal(report.target_catalog_status, "PASS");
  assert.equal(report.wildcard_review_status, "PASS");
  assert.deepEqual(report.compat_observed?.target_compat_filter_slugs, ["da97-08006b"]);
  assert.equal(report.compat_observed?.has_canonical_mapping, false);

  const proofText = report.required_target_proof.map((item) => item.description).join("\n");
  assert.ok(proofText.includes("RF28R7351WW"));
  assert.ok(/HAF-QIN/i.test(proofText));
  assert.ok(/DA97-17376B/i.test(proofText));

  const inheritable = report.inherit_plan.filter(
    (item) => item.inheritability === "INHERIT_FAMILY_LEVEL",
  );
  assert.ok(inheritable.length >= 3);
  assert.ok(
    inheritable.some((item) => item.source_url.includes("haf-qin-refrigerator-water-filter")),
  );
  assert.ok(
    inheritable.some((item) => item.source_url.includes("find-your-water-filter")),
  );
  assert.ok(inheritable.some((item) => item.source_url.includes("ANS10005090")));

  const blockedSpec = report.inherit_plan.filter(
    (item) => item.inheritability === "NOT_INHERITABLE_AS_TARGET_FILTER_SPECIFICATION",
  );
  assert.ok(blockedSpec.length >= 1);
  assert.ok(blockedSpec.some((item) => item.source_title.includes("RF28R7351SR")));
});

test("blocked target samsung-rf27t5501sr", () => {
  const report = buildPageFactoryEvidenceCloneReportV1({
    rootDir: ROOT,
    sourceSlug: "samsung-rf28r7351sr",
    targetSlug: "samsung-rf27t5501sr",
    familyKey: "samsung::HAFQIN",
  });

  assert.equal(report.clone_status, "BLOCKED");
  assert.ok(
    report.blockers.some((blocker) => blocker.includes("BLOCKED_HAF_CIN_CANONICAL")),
  );
  assert.ok(report.compat_observed?.has_forbidden_haf_cin_mapping);
});

test("invalid family-key is BLOCKED", () => {
  const report = buildPageFactoryEvidenceCloneReportV1({
    rootDir: ROOT,
    sourceSlug: "samsung-rf28r7351sr",
    targetSlug: "samsung-rf28r7351ww",
    familyKey: "samsung::HAFCIN",
  });

  assert.equal(report.clone_status, "BLOCKED");
  assert.equal(report.family_contract, null);
  assert.ok(report.blockers.some((blocker) => blocker.includes("unsupported family_key")));
});

test("source slug without evidence file is BLOCKED for clone", () => {
  const report = buildPageFactoryEvidenceCloneReportV1({
    rootDir: ROOT,
    sourceSlug: "samsung-rf28r7351ww",
    targetSlug: "samsung-rf28r7351sr",
    familyKey: "samsung::HAFQIN",
  });

  assert.equal(report.clone_status, "BLOCKED");
  assert.equal(report.source_evidence_status, "BLOCKED");
  assert.ok(report.blockers.some((blocker) => blocker.includes("missing source evidence")));
});

test("missing source evidence file is BLOCKED", () => {
  const report = buildPageFactoryEvidenceCloneReportV1({
    rootDir: ROOT,
    sourceSlug: "samsung-does-not-exist",
    targetSlug: "samsung-rf28r7351ww",
    familyKey: "samsung::HAFQIN",
  });

  assert.equal(report.clone_status, "BLOCKED");
  assert.equal(report.source_evidence_status, "BLOCKED");
  assert.ok(report.blockers.some((blocker) => blocker.includes("missing source evidence")));
});

test("read-only guard: lib/report do not mutate protected production paths", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/manual-evidence/',
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge/batch-production/page-factory-targets-v1.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/go/',
  ];
  for (const needle of forbiddenWrites) {
    assert.ok(!LIB_SOURCE.includes(needle), `lib must not include ${needle}`);
    assert.ok(!REPORT_SOURCE.includes(needle), `report must not include ${needle}`);
  }
  assert.ok(LIB_SOURCE.includes("mutation_authorized: false"));
});

test("--write-artifacts writes only allowlisted packet paths", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "evidence-clone-"));
  try {
    const report = buildPageFactoryEvidenceCloneReportV1({
      rootDir: ROOT,
      sourceSlug: "samsung-rf28r7351sr",
      targetSlug: "samsung-rf28r7351ww",
      familyKey: "samsung::HAFQIN",
    });
    const relPaths = writePageFactoryEvidenceCloneArtifactsV1({
      rootDir: tempRoot,
      report,
    });
    const expected = evidenceCloneArtifactRelPathsV1("samsung-rf28r7351ww");
    assert.equal(relPaths.jsonRelPath, expected.jsonRelPath);
    assert.equal(relPaths.mdRelPath, expected.mdRelPath);
    assert.ok(existsSync(path.join(tempRoot, relPaths.jsonRelPath)));
    assert.ok(existsSync(path.join(tempRoot, relPaths.mdRelPath)));
    assert.equal(PAGE_FACTORY_EVIDENCE_CLONE_ALLOWED_WRITE_REL_PATHS_V1.length, 2);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
