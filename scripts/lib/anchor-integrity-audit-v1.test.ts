import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  ANCHOR_INTEGRITY_AUDIT_ALLOWED_WRITE_REL_PATHS_V1,
  ANCHOR_INTEGRITY_AUDIT_CONTRACT_V1,
  anchorIntegrityAuditExitCodeV1,
  buildAnchorIntegrityAuditV1,
  filterSpecificationModelProofPresentV1,
  writeAnchorIntegrityAuditArtifactsV1,
} from "./anchor-integrity-audit-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/anchor-integrity-audit-v1.ts", "utf8");
const REPORT_SOURCE = readFileSync("scripts/report-anchor-integrity-audit-v1.ts", "utf8");

const FIXED_NOW = () => new Date("2026-06-08T12:00:00.000Z");

function anchorRow(
  report: ReturnType<typeof buildAnchorIntegrityAuditV1>,
  slug: string,
) {
  const row = report.anchor_rows.find((entry) => entry.anchor_slug === slug);
  assert.ok(row, `missing anchor row for ${slug}`);
  return row!;
}

test("contract and read-only flags", () => {
  const report = buildAnchorIntegrityAuditV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.contract, ANCHOR_INTEGRITY_AUDIT_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.mutation_blocked_until_owner_approval, true);
});

test("all anchors produce a health verdict", () => {
  const report = buildAnchorIntegrityAuditV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.anchor_rows.length, report.anchor_health_summary.total_anchor_count);
  assert.equal(
    report.anchor_health_summary.healthy_count +
      report.anchor_health_summary.watchlist_count +
      report.anchor_health_summary.disputed_count,
    report.anchor_health_summary.total_anchor_count,
  );
  for (const row of report.anchor_rows) {
    assert.ok(["HEALTHY", "WATCHLIST", "DISPUTED"].includes(row.anchor_health));
    assert.ok(row.health_reasons.length > 0);
  }
});

test("filterSpecificationModelProofPresentV1 requires filter_spec role and exact model in title", () => {
  const fgscRecord = JSON.parse(
    readFileSync(
      path.join(ROOT, "data/manual-evidence/refrigerator/frigidaire-fgsc2335tf.json"),
      "utf8",
    ),
  );
  const fghbRecord = JSON.parse(
    readFileSync(
      path.join(ROOT, "data/manual-evidence/refrigerator/frigidaire-fghb2868pf.json"),
      "utf8",
    ),
  );
  const whirlpoolRecord = JSON.parse(
    readFileSync(
      path.join(ROOT, "data/manual-evidence/refrigerator/whirlpool-wrf540cwhz.json"),
      "utf8",
    ),
  );

  assert.equal(filterSpecificationModelProofPresentV1(fgscRecord, "FGSC2335TF"), true);
  assert.equal(filterSpecificationModelProofPresentV1(fghbRecord, "FGHB2868PF"), false);
  assert.equal(filterSpecificationModelProofPresentV1(whirlpoolRecord, "WRF540CWHZ"), false);
});

test("frigidaire-fghb2868pf is DISPUTED for sibling conflict plus missing filter_spec model proof", () => {
  const report = buildAnchorIntegrityAuditV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = anchorRow(report, "frigidaire-fghb2868pf");
  assert.equal(row.checks.sibling_family_conflict_detected, true);
  assert.equal(row.checks.model_specific_filter_proof_present, false);
  assert.equal(row.anchor_health, "DISPUTED");
  assert.ok(row.health_reasons.includes("sibling_family_conflict_detected"));
  assert.ok(row.health_reasons.includes("filter_specification_model_proof_missing"));
  assert.equal(
    row.health_reasons.includes("filter_proof_source_title_missing_exact_model_number"),
    false,
  );
});

test("frigidaire-fgsc2335tf is WATCHLIST not DISPUTED when filter_spec model proof is present", () => {
  const report = buildAnchorIntegrityAuditV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = anchorRow(report, "frigidaire-fgsc2335tf");
  assert.equal(row.checks.model_specific_filter_proof_present, true);
  assert.equal(row.anchor_health, "WATCHLIST");
  assert.notEqual(row.anchor_health, "DISPUTED");
  assert.ok(row.health_reasons.includes("sibling_family_conflict_detected"));
});

test("samsung-rf28r7351sr is HEALTHY after v1.1 calibration", () => {
  const report = buildAnchorIntegrityAuditV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = anchorRow(report, "samsung-rf28r7351sr");
  assert.equal(row.checks.model_specific_filter_proof_present, true);
  assert.equal(row.anchor_health, "HEALTHY");
});

test("whirlpool-wrf540cwhz is WATCHLIST not DISPUTED when model appears in non-filter_spec titles", () => {
  const report = buildAnchorIntegrityAuditV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = anchorRow(report, "whirlpool-wrf540cwhz");
  assert.equal(row.checks.model_specific_filter_proof_present, false);
  assert.equal(row.checks.source_title_contains_exact_model_number, true);
  assert.equal(row.anchor_health, "WATCHLIST");
  assert.notEqual(row.anchor_health, "DISPUTED");
});

test("meta: DISPUTED anchors always have sibling conflict or missing filter_spec model proof", () => {
  const report = buildAnchorIntegrityAuditV1({ rootDir: ROOT, now: FIXED_NOW });
  for (const row of report.anchor_rows) {
    if (row.anchor_health !== "DISPUTED") continue;
    const hasSibling = row.checks.sibling_family_conflict_detected;
    const missingFilterSpecProof = !row.checks.model_specific_filter_proof_present;
    assert.ok(
      hasSibling || missingFilterSpecProof,
      `${row.anchor_slug} is DISPUTED without sibling conflict or missing filter_spec model proof`,
    );
  }
});

test("freeze list includes only families with sibling-conflict primary anchors", () => {
  const report = buildAnchorIntegrityAuditV1({ rootDir: ROOT, now: FIXED_NOW });
  const siblingConflictFamilies = [
    ...new Set(
      report.anchor_rows
        .filter((row) => row.checks.sibling_family_conflict_detected && row.anchor_family)
        .map((row) => row.anchor_family as string),
    ),
  ].sort();

  assert.deepEqual(
    report.families_with_disputed_or_watchlist_primary_anchor,
    siblingConflictFamilies,
  );

  for (const family of report.families_with_disputed_or_watchlist_primary_anchor) {
    const familyAnchors = report.anchor_rows.filter((row) => row.anchor_family === family);
    assert.ok(
      familyAnchors.some((row) => row.checks.sibling_family_conflict_detected),
      `family ${family} frozen without sibling conflict`,
    );
  }
});

test("exit code fails only on sibling-conflict disputed anchors", () => {
  const report = buildAnchorIntegrityAuditV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(
    report.anchor_health_summary.sibling_conflict_disputed_count,
    report.anchor_rows.filter(
      (row) =>
        row.anchor_health === "DISPUTED" && row.checks.sibling_family_conflict_detected,
    ).length,
  );

  if (report.anchor_health_summary.sibling_conflict_disputed_count > 0) {
    assert.equal(anchorIntegrityAuditExitCodeV1(report), 1);
  } else {
    assert.equal(anchorIntegrityAuditExitCodeV1(report), 0);
  }
});

test("report CLI uses calibrated exit helper not raw disputed_count", () => {
  const report = buildAnchorIntegrityAuditV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(REPORT_SOURCE.includes("anchorIntegrityAuditExitCodeV1(report)"));
  assert.equal(REPORT_SOURCE.includes("disputed_count > 0"), false);
  assert.equal(
    anchorIntegrityAuditExitCodeV1(report),
    report.anchor_health_summary.sibling_conflict_disputed_count > 0 ? 1 : 0,
  );
  if (report.anchor_health_summary.disputed_count > 0) {
    assert.equal(
      report.anchor_health_summary.sibling_conflict_disputed_count > 0,
      anchorIntegrityAuditExitCodeV1(report) === 1,
      "raw disputed_count must not drive exit when only sibling-conflict anchors count",
    );
  }
});

test("highest_risk_anchors sorted by evidence_clone_dependency_count desc", () => {
  const report = buildAnchorIntegrityAuditV1({ rootDir: ROOT, now: FIXED_NOW });
  const counts = report.highest_risk_anchors.map(
    (row) => row.checks.evidence_clone_dependency_count,
  );
  const sorted = [...counts].sort((a, b) => b - a);
  assert.deepEqual(counts, sorted);
});

test("read-only guard blocks compat, Supabase, sitemap, robots, page, HQ handoff writes", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    'writeFileSync(path.join(args.rootDir, "public/robots',
    'writeFileSync(path.join(args.rootDir, "public/sitemap',
    "docs/BuckParts-HQ-HANDOFF",
    'writeFileSync(path.join(args.rootDir, "data/manual-evidence/refrigerator/',
  ];

  for (const needle of forbiddenWrites) {
    assert.equal(LIB_SOURCE.includes(needle), false, `lib must not write ${needle}`);
    assert.equal(REPORT_SOURCE.includes(needle), false, `report must not write ${needle}`);
  }

  assert.equal(LIB_SOURCE.includes("data/manual-evidence/refrigerator"), true);
  assert.equal(LIB_SOURCE.includes("compatibility_mappings.csv"), true);

  for (const allowed of ANCHOR_INTEGRITY_AUDIT_ALLOWED_WRITE_REL_PATHS_V1) {
    assert.ok(LIB_SOURCE.includes(allowed), `lib must reference allowed write path ${allowed}`);
  }
});

test("write-artifacts only writes allowed audit paths", () => {
  const report = buildAnchorIntegrityAuditV1({ rootDir: ROOT, now: FIXED_NOW });
  const paths = writeAnchorIntegrityAuditArtifactsV1({ rootDir: ROOT, report });
  assert.ok(existsSync(path.join(ROOT, paths.jsonRelPath)));
  assert.ok(existsSync(path.join(ROOT, paths.mdRelPath)));
});
