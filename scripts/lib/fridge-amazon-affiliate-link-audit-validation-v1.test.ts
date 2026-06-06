import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import {
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_B087_ASIN_V1,
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BLOCKED_SLUGS_V1,
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BUNDLE_REL_V1,
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BUCKPARTS_TAG_V1,
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_COHORT_SIZE_V1,
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_EXPECTED_SLUGS_V1,
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_MISSION_TYPE_V1,
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_PASS_CANDIDATE_SLUGS_V1,
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_PROTECTED_PATHS_V1,
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_ULTRAWF_STALE_WARNING_CODE_V1,
  deriveAmazonAffiliateLinkAuditValidationStatusV1,
  loadAmazonAffiliateLinkAuditAssistBundleV1,
  runAmazonAffiliateLinkAuditValidationV1,
  snapshotAmazonAffiliateLinkAuditProtectedPathsV1,
  validateAmazonAffiliateLinkAuditBundleIntegrityV1,
  type AmazonAffiliateLinkAuditAssistBundleV1,
} from "./fridge-amazon-affiliate-link-audit-validation-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  path.join(ROOT, "scripts/lib/fridge-amazon-affiliate-link-audit-validation-v1.ts"),
  "utf8",
);
const RUNNER_SOURCE = readFileSync(
  path.join(ROOT, "scripts/run-fridge-amazon-affiliate-link-audit-cursor-validation-v1.ts"),
  "utf8",
);

describe("fridge-amazon-affiliate-link-audit-validation-v1", () => {
  test("HyperAgent audit bundle parses and matches expected contract", () => {
    const bundle = loadAmazonAffiliateLinkAuditAssistBundleV1(ROOT);
    assert.equal(bundle.packet_type, "buckparts_hyperagent_ingest_packet_v1");
    assert.equal(bundle.mission_type, FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_MISSION_TYPE_V1);
    assert.equal(bundle.discovery_status, "DISCOVERY_COMPLETE");
    assert.equal(bundle.truth_closure_claimed, false);
    assert.equal(bundle.batch_mode, true);
    assert.equal(bundle.buckparts_affiliate_tag, FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BUCKPARTS_TAG_V1);
    assert.equal(bundle.slug_audits.length, FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_COHORT_SIZE_V1);
    const slugs = bundle.slug_audits.map((r) => r.slug).sort();
    assert.deepEqual(slugs, [...FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_EXPECTED_SLUGS_V1].sort());
  });

  test("audit bundle integrity passes for committed intake bundle", () => {
    const bundle = loadAmazonAffiliateLinkAuditAssistBundleV1(ROOT);
    const integrity = validateAmazonAffiliateLinkAuditBundleIntegrityV1(bundle);
    assert.equal(integrity.authentic, true, integrity.errors.join("; "));
  });

  test("extra slugs fail integrity", () => {
    const bundle = loadAmazonAffiliateLinkAuditAssistBundleV1(ROOT);
    const poisoned = structuredClone(bundle) as AmazonAffiliateLinkAuditAssistBundleV1;
    poisoned.slug_audits.push(structuredClone(bundle.slug_audits[0]!));
    poisoned.slug_audits[poisoned.slug_audits.length - 1]!.slug = "purepour";
    const integrity = validateAmazonAffiliateLinkAuditBundleIntegrityV1(poisoned);
    assert.equal(integrity.authentic, false);
    assert.ok(integrity.errors.some((e) => e.includes("purepour")));
  });

  test("edr3rxd1 B087PDLZL9 is DO_NOT_USE only", () => {
    const bundle = loadAmazonAffiliateLinkAuditAssistBundleV1(ROOT);
    const result = runAmazonAffiliateLinkAuditValidationV1({ rootDir: ROOT, bundle });
    assert.equal(result.b087_do_not_use_only, true);
    assert.equal(result.b087_in_do_not_use_table, true);

    const edr3 = bundle.slug_audits.find((r) => r.slug === "edr3rxd1")!;
    assert.notEqual(edr3.best_amazon_asin, FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_B087_ASIN_V1);
    assert.ok(
      (bundle.do_not_use_table ?? []).some(
        (d) => String(d.asin).toUpperCase() === FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_B087_ASIN_V1,
      ),
    );

    const poisoned = structuredClone(bundle) as AmazonAffiliateLinkAuditAssistBundleV1;
    const row = poisoned.slug_audits.find((r) => r.slug === "wf3cb")!;
    row.best_amazon_asin = FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_B087_ASIN_V1;
    const bad = runAmazonAffiliateLinkAuditValidationV1({ rootDir: ROOT, bundle: poisoned });
    assert.equal(bad.b087_do_not_use_only, false);
    assert.equal(deriveAmazonAffiliateLinkAuditValidationStatusV1(bad), "VALIDATION_FAIL");
  });

  test("audit does not authorize mutation, VALIDATION_PASS, /go, CSV, Supabase, or Command Center closure", () => {
    const bundle = loadAmazonAffiliateLinkAuditAssistBundleV1(ROOT);
    const result = runAmazonAffiliateLinkAuditValidationV1({ rootDir: ROOT, bundle });
    assert.equal(result.authorization_blocks_mutation, true);
    assert.equal(bundle.truth_closure_claimed, false);
    assert.ok((bundle.not_authorized ?? []).includes("retailer_links_csv_mutation"));
    assert.ok((bundle.not_authorized ?? []).includes("validation_pass"));
    assert.ok((bundle.not_authorized ?? []).includes("command_center_closure"));
    assert.ok((bundle.not_authorized ?? []).includes("go_click"));
    assert.ok((bundle.not_authorized ?? []).includes("supabase_mutation"));
    assert.notEqual(deriveAmazonAffiliateLinkAuditValidationStatusV1(result), "VALIDATION_PASS");
  });

  test("affiliate tag is buckparts20-20 but no production affiliate link is authorized", () => {
    const bundle = loadAmazonAffiliateLinkAuditAssistBundleV1(ROOT);
    const result = runAmazonAffiliateLinkAuditValidationV1({ rootDir: ROOT, bundle });
    assert.equal(result.affiliate_tag_expected_but_not_production_authorized, true);
    assert.ok(
      bundle.slug_audits.every(
        (r) =>
          r.affiliate_tag_status === "MISSING" &&
          r.expected_affiliate_tag === FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BUCKPARTS_TAG_V1,
      ),
    );
    assert.ok(
      (bundle.not_authorized ?? []).includes("affiliate_link_generation_as_production_truth"),
    );
  });

  test("PASS_CANDIDATE and blocked slugs match audit expectations", () => {
    const bundle = loadAmazonAffiliateLinkAuditAssistBundleV1(ROOT);
    const result = runAmazonAffiliateLinkAuditValidationV1({ rootDir: ROOT, bundle });
    assert.equal(result.pass_candidates_confirmed, true);
    assert.equal(result.blocked_slugs_confirmed, true);
    assert.equal(result.amazon_rows_in_csv_zero_for_cohort, true);

    for (const slug of FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_PASS_CANDIDATE_SLUGS_V1) {
      const row = bundle.slug_audits.find((r) => r.slug === slug)!;
      assert.equal(row.safety_verdict, "PASS_CANDIDATE");
    }
    for (const slug of FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BLOCKED_SLUGS_V1) {
      const row = bundle.slug_audits.find((r) => r.slug === slug)!;
      assert.notEqual(row.safety_verdict, "PASS_CANDIDATE");
    }
  });

  test("ULTRAWF stale-warning is emitted when owner proof artifact exists", () => {
    const bundle = loadAmazonAffiliateLinkAuditAssistBundleV1(ROOT);
    const result = runAmazonAffiliateLinkAuditValidationV1({ rootDir: ROOT, bundle });
    assert.equal(result.ultrawf_stale_warning_emitted, true);
    assert.equal(
      result.ultrawf_stale_warning_code,
      FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_ULTRAWF_STALE_WARNING_CODE_V1,
    );
    assert.ok(result.ultrawf_stale_warning_reason?.includes("B002JAKRAM"));
    assert.equal(deriveAmazonAffiliateLinkAuditValidationStatusV1(result), "VALIDATION_PARTIAL");
  });

  test("lib and runner do not write protected paths", () => {
    for (const rel of FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_PROTECTED_PATHS_V1) {
      assert.ok(!LIB_SOURCE.includes(`writeFileSync(path.join(args.rootDir, "${rel}")`));
      assert.ok(!LIB_SOURCE.includes(`writeFileSync(path.join(ROOT, "${rel}")`));
      assert.ok(!RUNNER_SOURCE.includes(rel));
    }
    assert.ok(!LIB_SOURCE.includes("data/evidence/"));
    assert.ok(!LIB_SOURCE.includes("buckparts.com/go"));
    assert.ok(!RUNNER_SOURCE.includes("/go"));
    assert.ok(!RUNNER_SOURCE.includes("data/retailer_links.csv"));
    assert.ok(!RUNNER_SOURCE.includes("data/evidence/"));
  });

  test("protected path snapshots remain stable across validation run", () => {
    const before = snapshotAmazonAffiliateLinkAuditProtectedPathsV1(ROOT);
    const bundle = loadAmazonAffiliateLinkAuditAssistBundleV1(ROOT);
    const result = runAmazonAffiliateLinkAuditValidationV1({
      rootDir: ROOT,
      bundle,
      protected_paths_before: before,
    });
    assert.equal(result.integrity.authentic, true);
    for (const rel of FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_PROTECTED_PATHS_V1) {
      const snap = result.protected_paths_unchanged.find((p) => p.rel_path === rel);
      assert.ok(snap?.exists);
      assert.ok(snap?.sha256);
    }
  });

  test("bundle file path is the amazon affiliate audit assist draft", () => {
    assert.equal(
      FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BUNDLE_REL_V1,
      "data/fridge/batch-production/drafts/fridge-amazon-affiliate-link-audit-assist-v1.json",
    );
  });
});
