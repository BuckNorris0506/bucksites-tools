import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildGswfWrongPartRepairApplyPlanOwnerReviewV1,
  GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
  GSWF_WRONG_PART_REPAIR_APPLY_PLAN_ALLOWED_WRITE_REL_PATHS_V1,
  GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_CONTRACT_V1,
  GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1,
  GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_MD_REL_V1,
  writeGswfWrongPartRepairApplyPlanOwnerReviewArtifactsV1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/gswf-wrong-part-repair-apply-plan-owner-review-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  "scripts/report-gswf-wrong-part-repair-apply-plan-owner-review-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-06-09T12:00:00.000Z");

const EXPECTED_PLANS: Record<
  string,
  {
    before: string[];
    after: string[];
    wrong_part_removals: string[];
    preserved: string[];
    add: string[];
    remap: string;
  }
> = {
  "ge-cwe23sshww": {
    before: ["gswf", "gswf2"],
    after: ["rpwfe"],
    wrong_part_removals: ["gswf", "gswf2"],
    preserved: [],
    add: ["rpwfe"],
    remap: "rpwfe",
  },
  "ge-gfe24jgkww": {
    before: ["gswf", "gswf2", "smartwater-mwfp"],
    after: ["smartwater-mwfp", "xwfe"],
    wrong_part_removals: ["gswf", "gswf2"],
    preserved: ["smartwater-mwfp"],
    add: ["xwfe"],
    remap: "xwfe",
  },
  "ge-gfe27jmkes": {
    before: ["gswf", "gswf2"],
    after: ["xwfe"],
    wrong_part_removals: ["gswf", "gswf2"],
    preserved: [],
    add: ["xwfe"],
    remap: "xwfe",
  },
  "ge-gfe28gmkbb": {
    before: ["gswf", "gswf2"],
    after: ["rpwfe"],
    wrong_part_removals: ["gswf", "gswf2"],
    preserved: [],
    add: ["rpwfe"],
    remap: "rpwfe",
  },
  "ge-gfe28gskes": {
    before: ["gswf", "gswf2"],
    after: ["rpwfe"],
    wrong_part_removals: ["gswf", "gswf2"],
    preserved: [],
    add: ["rpwfe"],
    remap: "rpwfe",
  },
  "ge-gfe28hskss": {
    before: ["gswf", "gswf2", "smartwater-mwfp"],
    after: ["rpwfe", "smartwater-mwfp"],
    wrong_part_removals: ["gswf", "gswf2"],
    preserved: ["smartwater-mwfp"],
    add: ["rpwfe"],
    remap: "rpwfe",
  },
  "ge-gne25jmkww": {
    before: ["gswf", "gswf2"],
    after: ["xwfe"],
    wrong_part_removals: ["gswf", "gswf2"],
    preserved: [],
    add: ["xwfe"],
    remap: "xwfe",
  },
  "ge-gne27jstss": {
    before: ["gswf", "gswf2", "xwf"],
    after: ["xwf", "xwfe"],
    wrong_part_removals: ["gswf", "gswf2"],
    preserved: ["xwf"],
    add: ["xwfe"],
    remap: "xwfe",
  },
  "ge-gse25hskss": {
    before: ["gswf", "gswf2", "xwf"],
    after: ["xwf", "xwfe"],
    wrong_part_removals: ["gswf", "gswf2"],
    preserved: ["xwf"],
    add: ["xwfe"],
    remap: "xwfe",
  },
  "ge-gye22gskww": {
    before: ["gswf", "gswf2"],
    after: ["rpwfe"],
    wrong_part_removals: ["gswf", "gswf2"],
    preserved: [],
    add: ["rpwfe"],
    remap: "rpwfe",
  },
  "ge-pfe28kmkww": {
    before: ["gswf", "gswf2", "xwf"],
    after: ["rpwfe", "xwf"],
    wrong_part_removals: ["gswf", "gswf2"],
    preserved: ["xwf"],
    add: ["rpwfe"],
    remap: "rpwfe",
  },
  "ge-pfe28kynbb": {
    before: ["gswf", "gswf2"],
    after: ["rpwfe"],
    wrong_part_removals: ["gswf", "gswf2"],
    preserved: [],
    add: ["rpwfe"],
    remap: "rpwfe",
  },
  "ge-pvd28bymfs": {
    before: ["gswf", "gswf2"],
    after: ["xwfe"],
    wrong_part_removals: ["gswf", "gswf2"],
    preserved: [],
    add: ["xwfe"],
    remap: "xwfe",
  },
};

test("contract and read-only flags", () => {
  const plan = buildGswfWrongPartRepairApplyPlanOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(plan.contract, GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_CONTRACT_V1);
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.mutation_authorized, false);
  assert.equal(plan.owner_approval_required, true);
  assert.equal(plan.apply_authorized, false);
  assert.equal(plan.apply_plan_authorized, false);
  assert.equal(plan.csv_apply_authorized, false);
  assert.equal(plan.verified_link_authorized, false);
  assert.equal(plan.buy_cta_authorized, false);
  assert.equal(plan.retailer_links_mutation_authorized, false);
  assert.equal(plan.supabase_mutation_authorized, false);
});

test("plans exactly 13 proven wrong-part rows with expected mapping deltas", () => {
  const plan = buildGswfWrongPartRepairApplyPlanOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(plan.planned_rows.length, 13);
  assert.equal(plan.source_owner_review_packet.slug_count, 13);

  const slugs = plan.planned_rows.map((row) => row.fridge_slug).sort();
  assert.deepEqual(slugs, [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1].sort());

  for (const row of plan.planned_rows) {
    const expected = EXPECTED_PLANS[row.fridge_slug];
    assert.ok(expected, `missing expected plan for ${row.fridge_slug}`);
    assert.deepEqual(row.before_mappings, expected.before);
    assert.deepEqual(row.after_mappings, expected.after);
    assert.deepEqual(row.wrong_part_removals, expected.wrong_part_removals);
    assert.deepEqual(row.preserved_mappings, expected.preserved);
    assert.deepEqual(row.added_filter_slugs, expected.add);
    assert.equal(row.proposed_remap_target_filter_slug, expected.remap);
    assert.equal(row.source_row_category, "proven_wrong_part_repair");
    assert.equal(row.mutation_authorized, false);
    assert.equal(row.csv_apply_authorized, false);
    assert.equal(row.buy_cta_authorized, false);
    assert.equal(row.not_applied, true);
    for (const removal of row.wrong_part_removals) {
      assert.ok(
        (GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1 as readonly string[]).includes(removal),
        `unexpected removal slug ${removal} for ${row.fridge_slug}`,
      );
    }
  }

  assert.deepEqual(plan.rollup_removed_filter_slugs, ["gswf", "gswf2"]);
  assert.deepEqual(plan.rollup_added_filter_slugs.sort(), ["rpwfe", "xwfe"]);
  assert.equal(plan.planned_compat_row_removals, 26);
  assert.equal(plan.planned_compat_row_additions, 13);
});

test("excludes partial and no-filter rows from plan", () => {
  const plan = buildGswfWrongPartRepairApplyPlanOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  const planned = new Set(plan.planned_rows.map((row) => row.fridge_slug));
  for (const slug of GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1) {
    assert.equal(planned.has(slug), false);
  }
  for (const slug of GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1) {
    assert.equal(planned.has(slug), false);
  }
  assert.deepEqual(
    [...plan.excluded_from_plan.partial_browser_proof_required_slugs].sort(),
    [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1].sort(),
  );
  assert.deepEqual(
    plan.excluded_from_plan.no_filter_suppression_slugs,
    [...GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1],
  );
});

test("no buy CTA or retailer_links authorization and build path does not write product data", () => {
  const plan = buildGswfWrongPartRepairApplyPlanOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(plan.buy_cta_authorized, false);
  assert.equal(plan.retailer_links_mutation_authorized, false);
  assert.equal(plan.verified_link_authorized, false);

  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    'writeFileSync(path.join(args.rootDir, "data/filters.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge_models.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    "docs/BuckParts-HQ-HANDOFF",
  ];
  for (const needle of forbiddenWrites) {
    assert.ok(!LIB_SOURCE.includes(needle), `build path must not write ${needle}`);
  }
});

test("build plan does not mutate compatibility_mappings.csv", () => {
  const csvPath = path.join(ROOT, "data/compatibility_mappings.csv");
  const before = readFileSync(csvPath, "utf8");
  buildGswfWrongPartRepairApplyPlanOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(readFileSync(csvPath, "utf8"), before);
});

test("write artifacts only to allowed draft paths", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-wrong-part-apply-plan-"));
  try {
    const plan = buildGswfWrongPartRepairApplyPlanOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
    const written = writeGswfWrongPartRepairApplyPlanOwnerReviewArtifactsV1({
      rootDir: tmp,
      plan,
    });
    assert.equal(
      written.json_rel_path,
      GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1,
    );
    assert.equal(
      written.md_rel_path,
      GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_MD_REL_V1,
    );
    assert.ok(
      (GSWF_WRONG_PART_REPAIR_APPLY_PLAN_ALLOWED_WRITE_REL_PATHS_V1 as readonly string[]).includes(
        written.json_rel_path,
      ),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("report script supports --write-artifacts only for draft outputs", () => {
  assert.ok(REPORT_SOURCE.includes("--write-artifacts"));
  assert.ok(REPORT_SOURCE.includes("writeGswfWrongPartRepairApplyPlanOwnerReviewArtifactsV1"));
  assert.ok(!REPORT_SOURCE.includes("compatibility_mappings.csv"));
  assert.ok(!REPORT_SOURCE.includes("retailer_links.csv"));
});
