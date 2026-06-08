import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  DANGEROUS_MAPPING_REMEDIATION_PLAN_ALLOWED_WRITE_REL_PATHS_V1,
  DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1,
  ROOT_CAUSE_GROUPS_V1,
  buildDangerousMappingRemediationPlanV1,
  writeDangerousMappingRemediationPlanArtifactsV1,
} from "./dangerous-mapping-remediation-plan-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/dangerous-mapping-remediation-plan-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  "scripts/report-dangerous-mapping-remediation-plan-v1.ts",
  "utf8",
);

const FIXED_NOW = () => new Date("2026-06-08T12:00:00.000Z");

test("contract and read-only flags", () => {
  const report = buildDangerousMappingRemediationPlanV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.contract, DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.dangerous_model_count, 76);
});

test("dangerous models partition into five root cause groups", () => {
  const report = buildDangerousMappingRemediationPlanV1({ rootDir: ROOT, now: FIXED_NOW });
  const counts = Object.fromEntries(
    report.root_cause_groups.map((group) => [group.root_cause_group, group.affected_slug_count]),
  );

  assert.equal(
    report.root_cause_groups.reduce((sum, group) => sum + group.affected_slug_count, 0),
    76,
  );
  assert.deepEqual(counts, {
    samsung_haf_qin_da29_da97_conflicts: 33,
    samsung_haf_cin_canonical_blockers: 1,
    lg_lt_generation_co_maps: 34,
    ge_xwf_xwfe_rpwfe_legacy_mixes: 7,
    quarantined_models: 1,
  });
  assert.deepEqual(
    report.root_cause_groups.map((group) => group.root_cause_group),
    [...ROOT_CAUSE_GROUPS_V1],
  );
});

test("samsung-rf27t5501sr is HAF-CIN blocker and lg-lrfxs3106s is quarantined", () => {
  const report = buildDangerousMappingRemediationPlanV1({ rootDir: ROOT, now: FIXED_NOW });
  const hafCin = report.root_cause_groups.find(
    (group) => group.root_cause_group === "samsung_haf_cin_canonical_blockers",
  );
  const quarantine = report.root_cause_groups.find(
    (group) => group.root_cause_group === "quarantined_models",
  );

  assert.ok(hafCin?.affected_slugs.includes("samsung-rf27t5501sr"));
  assert.equal(hafCin?.suspected_correct_filter_family, "samsung::HAFCIN");
  assert.equal(hafCin?.safest_action, "remove_mapping");

  assert.ok(quarantine?.affected_slugs.includes("lg-lrfxs3106s"));
  assert.equal(quarantine?.models[0]?.suspected_correct_filter_family, "lg::LT1000P");
  assert.equal(quarantine?.safest_action, "quarantine");
});

test("smallest safe remediation sequence is ordered and monotonic in risk reduction scope", () => {
  const report = buildDangerousMappingRemediationPlanV1({ rootDir: ROOT, now: FIXED_NOW });
  const steps = report.smallest_safe_remediation_sequence;

  assert.equal(steps[0]?.action, "noindex");
  assert.equal(steps[0]?.affected_slug_count, 76);
  assert.equal(steps[2]?.action, "remove_mapping");
  assert.equal(steps[2]?.root_cause_groups[0], "samsung_haf_cin_canonical_blockers");
  assert.ok(steps.every((step, index) => step.step === index + 1));
});

test("read-only guard", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge_models.csv")',
    'writeFileSync(path.join(args.rootDir, "data/filters.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    'writeFileSync(path.join(args.rootDir, "public/robots',
    'writeFileSync(path.join(args.rootDir, "public/sitemap',
  ];

  for (const needle of forbiddenWrites) {
    assert.equal(LIB_SOURCE.includes(needle), false, `lib must not write ${needle}`);
    assert.equal(REPORT_SOURCE.includes(needle), false, `report must not write ${needle}`);
  }

  for (const allowed of DANGEROUS_MAPPING_REMEDIATION_PLAN_ALLOWED_WRITE_REL_PATHS_V1) {
    assert.ok(LIB_SOURCE.includes(allowed), `lib must reference allowed write path ${allowed}`);
  }
});

test("write-artifacts only writes allowed plan paths", () => {
  const report = buildDangerousMappingRemediationPlanV1({ rootDir: ROOT, now: FIXED_NOW });
  const paths = writeDangerousMappingRemediationPlanArtifactsV1({ rootDir: ROOT, report });
  assert.ok(existsSync(path.join(ROOT, paths.jsonRelPath)));
  assert.ok(existsSync(path.join(ROOT, paths.mdRelPath)));
});
