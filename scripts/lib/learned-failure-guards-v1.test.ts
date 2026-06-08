import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  LEARNED_FAILURE_GUARDS_ALLOWED_WRITE_REL_PATHS_V1,
  LEARNED_FAILURE_GUARDS_CONTRACT_V1,
  evaluateAllLearnedFailureGuardsV1,
  evaluateConfusionFamilyGuardsV1,
  evaluateFrigidaireProvenAnchorSiblingDriftGuardV1,
  evaluateFrigidaireFppwfu01PrefixFamilyContaminationGuardV1,
  writeLearnedFailureGuardsArtifactsV1,
} from "./learned-failure-guards-v1";
import {
  DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1,
  DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
  type DangerousMappingRemediationPlanV1,
} from "./dangerous-mapping-remediation-plan-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/learned-failure-guards-v1.ts", "utf8");
const REPORT_SOURCE = readFileSync("scripts/report-learned-failure-guards-v1.ts", "utf8");

const FIXED_NOW = () => new Date("2026-06-08T12:00:00.000Z");

function loadRemediationPlan(): DangerousMappingRemediationPlanV1 {
  return JSON.parse(
    readFileSync(path.join(ROOT, DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1), "utf8"),
  ) as DangerousMappingRemediationPlanV1;
}

function slugGuard(
  report: ReturnType<typeof evaluateAllLearnedFailureGuardsV1>,
  slug: string,
) {
  const row = report.per_slug_guards.find((entry) => entry.fridge_slug === slug);
  assert.ok(row, `missing guard row for ${slug}`);
  return row!;
}

function guardVerdict(
  row: ReturnType<typeof slugGuard>,
  guardId: string,
) {
  const guard = row.confusion_family_guards.find((entry) => entry.guard_id === guardId);
  assert.ok(guard, `missing guard ${guardId} for ${row.fridge_slug}`);
  return guard!.verdict;
}

test("contract and read-only flags", () => {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.contract, LEARNED_FAILURE_GUARDS_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.total_catalog_models, 500);
  assert.equal(report.per_slug_guards.length, 500);
});

test("all 76 dangerous slugs BLOCK at least one confusion or single-family guard", () => {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir: ROOT, now: FIXED_NOW });
  const remediation = loadRemediationPlan();
  assert.equal(remediation.dangerous_model_count, 76);
  assert.equal(report.dangerous_slugs_all_blocked, true);

  const dangerousSlugs = remediation.root_cause_groups.flatMap((group) => group.affected_slugs);
  for (const slug of dangerousSlugs) {
    const row = slugGuard(report, slug);
    const blocked =
      row.aggregate_verdict === "BLOCK" ||
      row.confusion_family_guards.some((guard) => guard.verdict === "BLOCK") ||
      row.single_filter_family.verdict === "BLOCK";
    assert.equal(blocked, true, `${slug} must BLOCK`);
  }
});

test("no slug with all guards PASS has WRONG_PART_RISK or BLOCKED classification", () => {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir: ROOT, now: FIXED_NOW });
  for (const row of report.per_slug_guards) {
    if (row.aggregate_verdict !== "PASS") continue;
    assert.notEqual(row.classification, "WRONG_PART_RISK", row.fridge_slug);
    assert.notEqual(row.classification, "BLOCKED", row.fridge_slug);
  }
});

test("samsung-rf27t5501sr BLOCKS samsung_haf_cin_canonical", () => {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = slugGuard(report, "samsung-rf27t5501sr");
  assert.equal(guardVerdict(row, "samsung_haf_cin_canonical"), "BLOCK");
});

test("lg-lfxs28968s BLOCKS lg_lt_generation_mix", () => {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = slugGuard(report, "lg-lfxs28968s");
  assert.equal(guardVerdict(row, "lg_lt_generation_mix"), "BLOCK");
});

test("ge-gfe28gskww BLOCKS ge_xwf_xwfe_mix", () => {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = slugGuard(report, "ge-gfe28gskww");
  assert.equal(guardVerdict(row, "ge_xwf_xwfe_mix"), "BLOCK");
});

test("samsung-rf28r7351sr PASSes all guards", () => {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = slugGuard(report, "samsung-rf28r7351sr");
  assert.equal(row.aggregate_verdict, "PASS");
  assert.ok(row.confusion_family_guards.every((guard) => guard.verdict === "PASS"));
  assert.equal(row.single_filter_family.verdict, "PASS");
});

test("dangerous count regression PASS at 76", () => {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.dangerous_count_regression.verdict, "PASS");
  assert.equal(report.dangerous_count_regression.dangerous_count, 76);
  assert.equal(report.dangerous_count_regression.expected_dangerous_count, 76);
  assert.equal(report.dangerous_count_regression.fixture_matches_remediation_plan, true);
});

test("Frigidaire FPPWFU01/FPPWFU02 synthetic co-map BLOCKS placeholder guard", () => {
  const guards = evaluateConfusionFamilyGuardsV1({
    brandSlug: "frigidaire",
    mappedFilterSlugs: ["fppwfu01", "fppwfu02"],
  });
  const guard = guards.find(
    (entry) => entry.guard_id === "frigidaire_fppwfu01_vs_fppwfu02",
  );
  assert.ok(guard);
  assert.equal(guard.verdict, "BLOCK");
});

test("Frigidaire ULTRAWF + EPTWFU01 synthetic co-map BLOCKS mix guard", () => {
  const guards = evaluateConfusionFamilyGuardsV1({
    brandSlug: "frigidaire",
    mappedFilterSlugs: ["ultrawf", "eptwfu01"],
  });
  assert.equal(
    guards.find((entry) => entry.guard_id === "frigidaire_ultrawf_vs_eptwfu01_mix")?.verdict,
    "BLOCK",
  );
});

test("Frigidaire EPTWFU01 + WF3CB synthetic co-map BLOCKS mix guard", () => {
  const guards = evaluateConfusionFamilyGuardsV1({
    brandSlug: "frigidaire",
    mappedFilterSlugs: ["eptwfu01", "wf3cb"],
  });
  assert.equal(
    guards.find((entry) => entry.guard_id === "frigidaire_eptwfu01_vs_wf3cb_mix")?.verdict,
    "BLOCK",
  );
});

test("frigidaire-fghb2868pf WARNs proven anchor sibling drift without BLOCK", () => {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = slugGuard(report, "frigidaire-fghb2868pf");
  assert.equal(guardVerdict(row, "frigidaire_proven_anchor_sibling_drift"), "WARN");
  assert.equal(row.aggregate_verdict, "WARN");
  assert.ok(
    row.confusion_family_guards
      .find((guard) => guard.guard_id === "frigidaire_proven_anchor_sibling_drift")
      ?.detail.includes("fghb2868pf2"),
  );
});

test("fghb2868pf2 ultrawf sibling triggers sibling_drift WARN on fghb2868pf anchor", () => {
  const drift = evaluateFrigidaireProvenAnchorSiblingDriftGuardV1({
    auditRow: {
      fridge_slug: "frigidaire-fghb2868pf",
      model_number: "FGHB2868PF",
      brand_slug: "frigidaire",
      mapped_filter_slugs: ["eptwfu01"],
      classification: "PROVEN_CORRECT",
      evidence_status: "PROVEN_MANUAL_EVIDENCE",
      per_filter_proof: [],
      evidence_paths: [],
      blockers: [],
      recommended_action: "",
    },
    frigidaireSiblingRows: [
      {
        fridge_slug: "frigidaire-fghb2868pf2",
        model_number: "FGHB2868PF2",
        brand_slug: "frigidaire",
        mapped_filter_slugs: ["ultrawf", "wf3cb"],
        classification: "LIKELY_CORRECT_NEEDS_EVIDENCE",
        evidence_status: "NONE",
        per_filter_proof: [],
        evidence_paths: [],
        blockers: [],
        recommended_action: "",
      },
    ],
  });
  assert.equal(drift.guard_id, "frigidaire_proven_anchor_sibling_drift");
  assert.equal(drift.verdict, "WARN");
  assert.ok(drift.detail.includes("fghb2868pf2"));
});

test("frigidaire-fghb2868td BLOCKs FPPWFU01 prefix contamination against proven EPTWFU01 sibling", () => {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = slugGuard(report, "frigidaire-fghb2868td");
  assert.equal(
    guardVerdict(row, "frigidaire_fppwfu01_prefix_family_contamination"),
    "BLOCK",
  );
});

test("frigidaire-fgsc2335td2 BLOCKs FPPWFU01 prefix contamination against proven EPTWFU01 sibling", () => {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = slugGuard(report, "frigidaire-fgsc2335td2");
  assert.equal(
    guardVerdict(row, "frigidaire_fppwfu01_prefix_family_contamination"),
    "BLOCK",
  );
});

test("frigidaire-ffhb2740ps2 BLOCKs FPPWFU01 prefix contamination against proven ULTRAWF sibling", () => {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = slugGuard(report, "frigidaire-ffhb2740ps2");
  assert.equal(
    guardVerdict(row, "frigidaire_fppwfu01_prefix_family_contamination"),
    "BLOCK",
  );
});

test("frigidaire-frss2333as PASSes FPPWFU01 prefix contamination with no sibling line", () => {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = slugGuard(report, "frigidaire-frss2333as");
  assert.equal(
    guardVerdict(row, "frigidaire_fppwfu01_prefix_family_contamination"),
    "PASS",
  );
});

test("evaluateFrigidaireFppwfu01PrefixFamilyContaminationGuardV1 unit fixture", () => {
  const guard = evaluateFrigidaireFppwfu01PrefixFamilyContaminationGuardV1({
    auditRow: {
      fridge_slug: "frigidaire-ffhb2740ps2",
      model_number: "FFHB2740PS2",
      brand_slug: "frigidaire",
      mapped_filter_slugs: ["fppwfu01"],
      classification: "LIKELY_CORRECT_NEEDS_EVIDENCE",
      evidence_status: "NONE",
      per_filter_proof: [],
      blockers: [],
      recommended_action: "",
      risk_score: 0,
    },
    frigidaireSiblingRows: [
      {
        fridge_slug: "frigidaire-ffhb2740ps",
        model_number: "FFHB2740PS",
        brand_slug: "frigidaire",
        mapped_filter_slugs: ["ultrawf"],
        classification: "PROVEN_CORRECT",
        evidence_status: "NONE",
        per_filter_proof: [],
        blockers: [],
        recommended_action: "",
        risk_score: 0,
      },
    ],
  });
  assert.equal(guard.guard_id, "frigidaire_fppwfu01_prefix_family_contamination");
  assert.equal(guard.verdict, "BLOCK");
});

test("read-only guard blocks compat, retailer links, sitemap, robots, Supabase, HQ handoff writes", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge_models.csv")',
    'writeFileSync(path.join(args.rootDir, "data/filters.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    'writeFileSync(path.join(args.rootDir, "public/robots',
    'writeFileSync(path.join(args.rootDir, "public/sitemap',
    "docs/BuckParts-HQ-HANDOFF",
  ];

  for (const needle of forbiddenWrites) {
    assert.equal(LIB_SOURCE.includes(needle), false, `lib must not write ${needle}`);
    assert.equal(REPORT_SOURCE.includes(needle), false, `report must not write ${needle}`);
  }

  for (const allowed of LEARNED_FAILURE_GUARDS_ALLOWED_WRITE_REL_PATHS_V1) {
    assert.ok(LIB_SOURCE.includes(allowed), `lib must reference allowed write path ${allowed}`);
  }
});

test("write-artifacts only writes allowed guard paths", () => {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir: ROOT, now: FIXED_NOW });
  const remediation = loadRemediationPlan();
  assert.equal(remediation.contract, DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1);
  const paths = writeLearnedFailureGuardsArtifactsV1({
    rootDir: ROOT,
    report,
    remediationPlan: remediation,
  });
  assert.ok(existsSync(path.join(ROOT, paths.jsonRelPath)));
  assert.ok(existsSync(path.join(ROOT, paths.mdRelPath)));
  assert.ok(existsSync(path.join(ROOT, paths.fixtureRelPath)));
});
