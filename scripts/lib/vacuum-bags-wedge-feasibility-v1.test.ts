import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import {
  VACUUM_BAGS_WEDGE_FEASIBILITY_CONTRACT_V1,
  buildVacuumBagsWedgeFeasibilityV1,
} from "./vacuum-bags-wedge-feasibility-v1";

const REPO_ROOT = process.cwd();

const FORBIDDEN_MUTATION_PATHS = [
  "data/air-purifier/retailer_links.csv",
  "data/whole-house-water/retailer_links.csv",
  "src/lib/catalog/vertical-launch-state.ts",
  "src/lib/retailers/launch-buy-links.ts",
  "src/app/vacuum/page.tsx",
  "data/vacuum/filters.sample.csv",
];

test("report is read_only true and data_mutation false", () => {
  const report = buildVacuumBagsWedgeFeasibilityV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, VACUUM_BAGS_WEDGE_FEASIBILITY_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("vacuum bags are not treated as already proven inventory", () => {
  const report = buildVacuumBagsWedgeFeasibilityV1({ rootDir: REPO_ROOT });
  assert.equal(report.all_vacuum_bags_verified_claim, false);
  assert.equal(report.inspect_summary.all_vacuum_bags_verified_claim, false);
  assert.ok(
    report.proven_facts.some((f) => f.includes("sample.csv") || f.includes("sample_csv_only")),
  );
  assert.notEqual(report.recommendation, "READY_FOR_SEED_WEDGE_PLAN");
});

test("furnace filters deferred because HVAC MERV airflow is separate model", () => {
  const report = buildVacuumBagsWedgeFeasibilityV1({ rootDir: REPO_ROOT });
  assert.equal(report.furnace_filter_comparison.furnace_requires_separate_hvac_model, true);
  assert.ok(report.furnace_filter_comparison.furnace_deferred_reason.includes("MERV"));
  assert.ok(report.furnace_filter_comparison.furnace_deferred_reason.includes("airflow"));
  assert.ok(report.inspect_summary.furnace_filter_deferred_reason.includes("HVAC"));
  assert.ok(report.proven_facts.some((f) => f.includes("No furnace/HVAC/MERV")));
  assert.ok(report.furnace_filter_safety_complexity_score > report.safety_complexity_score);
});

test("report does not authorize CSV Supabase public launch sitemap or buy-gate changes", () => {
  const report = buildVacuumBagsWedgeFeasibilityV1({ rootDir: REPO_ROOT });
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.supabase_update_authorized, false);
  assert.equal(report.public_launch_authorized, false);
  assert.equal(report.inspect_summary.csv_apply_authorized, false);
  assert.equal(report.inspect_summary.supabase_update_authorized, false);
  assert.equal(report.inspect_summary.public_launch_authorized, false);
  assert.notEqual(report.supabase_update_authorized, null);
  assert.ok(report.no_overclaim_rules.some((r) => r.includes("Do not publish or index")));
});

test("report does not claim all vacuum bags are verified", () => {
  const report = buildVacuumBagsWedgeFeasibilityV1({ rootDir: REPO_ROOT });
  assert.ok(
    report.no_overclaim_rules.some((r) => r.includes("Do not claim all vacuum bags are verified")),
  );
  assert.equal(getVerticalLaunchState("vacuum"), "NOINDEX_UNPROVEN");
  assert.equal(report.inspect_summary.vacuum_launch_state, "NOINDEX_UNPROVEN");
});

test("report requires exact bag model evidence before safe CTA", () => {
  const report = buildVacuumBagsWedgeFeasibilityV1({ rootDir: REPO_ROOT });
  assert.ok(report.required_evidence_gates.includes("exact_bag_code_or_oem_part_number_proof"));
  assert.ok(report.required_evidence_gates.includes("model_compatibility_proof"));
  assert.ok(report.required_evidence_gates.includes("direct_buyable_pdp_proof"));
  assert.ok(report.required_confidence_states.includes("exact_model_to_bag"));
  assert.ok(report.required_confidence_states.includes("do_not_buy"));
  assert.ok(report.no_overclaim_rules.some((r) => r.includes("Do not show buy CTAs")));
});

test("read-only build does not mutate forbidden paths", () => {
  const before = new Map(
    FORBIDDEN_MUTATION_PATHS.filter((p) => existsSync(path.join(REPO_ROOT, p))).map((p) => [
      p,
      readFileSync(path.join(REPO_ROOT, p), "utf8"),
    ]),
  );
  const mtimesBefore = new Map(
    FORBIDDEN_MUTATION_PATHS.filter((p) => existsSync(path.join(REPO_ROOT, p))).map((p) => [
      p,
      statSync(path.join(REPO_ROOT, p)).mtimeMs,
    ]),
  );

  buildVacuumBagsWedgeFeasibilityV1({ rootDir: REPO_ROOT });

  for (const [p, content] of before) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
    assert.equal(statSync(path.join(REPO_ROOT, p)).mtimeMs, mtimesBefore.get(p));
  }
});

test("inspect_summary exposes recommendation and scores", () => {
  const report = buildVacuumBagsWedgeFeasibilityV1({ rootDir: REPO_ROOT });
  assert.equal(report.inspect_summary.recommendation, report.recommendation);
  assert.ok(report.inspect_summary.architecture_reuse_score >= 7);
  assert.equal(report.inspect_summary.safety_complexity_score, 3);
  assert.equal(report.inspect_summary.first_seed_brand_count, 8);
  assert.equal(report.inspect_summary.required_truth_spine_fields_count, 15);
  assert.ok(
    report.inspect_summary.recommended_jq_paths.command_center.includes(
      "vacuum_bags_wedge_feasibility_v1",
    ),
  );
});
