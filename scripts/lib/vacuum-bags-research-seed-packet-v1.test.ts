import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import {
  VACUUM_BAGS_RESEARCH_SEED_PACKET_CONTRACT_V1,
  buildVacuumBagsResearchSeedPacketV1,
} from "./vacuum-bags-research-seed-packet-v1";

const REPO_ROOT = process.cwd();

const FORBIDDEN_MUTATION_PATHS = [
  "data/vacuum/filters.sample.csv",
  "data/vacuum/compatibility_mappings.sample.csv",
  "src/lib/catalog/vertical-launch-state.ts",
  "src/lib/data/vacuum/filters.ts",
  "src/app/vacuum/page.tsx",
  "data/air-purifier/retailer_links.csv",
];

test("report is read_only true and data_mutation false", () => {
  const report = buildVacuumBagsResearchSeedPacketV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, VACUUM_BAGS_RESEARCH_SEED_PACKET_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("no public CSV Supabase sitemap or buy-gate mutation authorized", () => {
  const report = buildVacuumBagsResearchSeedPacketV1({ rootDir: REPO_ROOT });
  assert.equal(report.public_launch_authorized, false);
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.supabase_update_authorized, false);
  assert.equal(report.sitemap_change_authorized, false);
  assert.equal(report.buy_gate_change_authorized, false);
  assert.equal(report.inspect_summary.public_launch_authorized, false);
  assert.equal(report.inspect_summary.csv_apply_authorized, false);
  assert.equal(report.inspect_summary.supabase_update_authorized, false);
  assert.equal(report.inspect_summary.sitemap_change_authorized, false);
  assert.equal(report.inspect_summary.buy_gate_change_authorized, false);
  assert.notEqual(report.supabase_update_authorized, null);
});

test("vacuum bags do not become inventory from this packet", () => {
  const report = buildVacuumBagsResearchSeedPacketV1({ rootDir: REPO_ROOT });
  assert.equal(report.all_vacuum_bags_verified_claim, false);
  assert.ok(report.blocked_or_unknown_items.some((i) => i.includes("does not create product CSV")));
  assert.ok(report.no_overclaim_rules.some((r) => r.includes("Do not create product CSV")));
  assert.ok(report.proven_facts.some((f) => f.includes("sample.csv")));
});

test("all seed families are candidate planning only", () => {
  const report = buildVacuumBagsResearchSeedPacketV1({ rootDir: REPO_ROOT });
  assert.ok(report.first_seed_families.length >= 20);
  for (const family of report.first_seed_families) {
    assert.equal(family.planning_status, "candidate_only");
    assert.equal(family.verified, false);
    assert.equal(family.model_to_bag_fit_claim, false);
    assert.equal(family.safe_cta_claim, false);
  }
  assert.ok(report.no_overclaim_rules.some((r) => r.includes("candidate_only")));
});

test("bag-code proof and model-fit proof are separate requirements", () => {
  const report = buildVacuumBagsResearchSeedPacketV1({ rootDir: REPO_ROOT });
  assert.ok(report.separate_evidence_requirements.bag_code_proof.length >= 2);
  assert.ok(report.separate_evidence_requirements.model_fit_proof.length >= 2);
  assert.ok(report.separate_evidence_requirements.rule.includes("separate"));
  const pdpSource = report.evidence_source_plan.find(
    (s) => s.source_kind === "retailer_pdp_for_buy_path_only",
  );
  assert.ok(pdpSource);
  assert.equal(pdpSource.counts_as_model_fit_proof, false);
  const chartSource = report.evidence_source_plan.find((s) => s.source_kind === "brand_bag_type_chart");
  assert.ok(chartSource);
  assert.equal(chartSource.counts_as_bag_code_proof, false);
});

test("furnace filters remain deferred and out of scope", () => {
  const report = buildVacuumBagsResearchSeedPacketV1({ rootDir: REPO_ROOT });
  assert.equal(report.furnace_filters_out_of_scope.deferred, true);
  assert.ok(report.furnace_filters_out_of_scope.reason.includes("MERV"));
  assert.ok(report.blocked_or_unknown_items.some((i) => i.includes("Furnace filters deferred")));
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

  buildVacuumBagsResearchSeedPacketV1({ rootDir: REPO_ROOT });

  for (const [p, content] of before) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
    assert.equal(statSync(path.join(REPO_ROOT, p)).mtimeMs, mtimesBefore.get(p));
  }
});

test("inspect_summary exposes recommendation counts and next_action", () => {
  const report = buildVacuumBagsResearchSeedPacketV1({ rootDir: REPO_ROOT });
  assert.equal(report.recommendation, "RESEARCH_SEED_PACKET_READY");
  assert.equal(report.inspect_summary.recommendation, "RESEARCH_SEED_PACKET_READY");
  assert.equal(report.inspect_summary.vacuum_launch_state, getVerticalLaunchState("vacuum"));
  assert.equal(report.inspect_summary.target_seed_brand_count, 8);
  assert.equal(report.inspect_summary.target_seed_family_count, 35);
  assert.equal(report.inspect_summary.first_seed_family_count, report.first_seed_families.length);
  assert.equal(report.inspect_summary.required_truth_spine_fields_count, 15);
  assert.ok(report.inspect_summary.next_action.length > 10);
  assert.ok(
    report.inspect_summary.recommended_jq_paths.command_center.includes(
      "vacuum_bags_research_seed_packet_v1",
    ),
  );
  assert.equal(report.source_feasibility_contract, "vacuum_bags_wedge_feasibility_v1");
});
