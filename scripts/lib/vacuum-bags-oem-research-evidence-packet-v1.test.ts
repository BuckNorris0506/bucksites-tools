import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import {
  VACUUM_BAGS_OEM_RESEARCH_EVIDENCE_PACKET_CONTRACT_V1,
  VACUUM_OEM_BOUNDED_FAMILY_TARGETS_V1,
  buildVacuumBagsOemResearchEvidencePacketV1,
} from "./vacuum-bags-oem-research-evidence-packet-v1";

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
  const report = buildVacuumBagsOemResearchEvidencePacketV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, VACUUM_BAGS_OEM_RESEARCH_EVIDENCE_PACKET_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("no public CSV Supabase sitemap or buy-gate mutation authorized", () => {
  const report = buildVacuumBagsOemResearchEvidencePacketV1({ rootDir: REPO_ROOT });
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
  const report = buildVacuumBagsOemResearchEvidencePacketV1({ rootDir: REPO_ROOT });
  assert.equal(report.all_vacuum_bags_verified_claim, false);
  assert.equal(report.inspect_summary.all_vacuum_bags_verified_claim, false);
  assert.ok(report.proven_facts.some((f) => f.includes("vacdemo demo rows only")));
  for (const row of report.family_evidence_rows) {
    assert.equal(row.safe_cta_claimed, false);
    assert.equal(row.compatibility_claim_status, "no_claim");
  }
});

test("all seed families are candidate planning only with UNKNOWN evidence", () => {
  const report = buildVacuumBagsOemResearchEvidencePacketV1({ rootDir: REPO_ROOT });
  assert.equal(report.family_evidence_rows.length, 4);
  for (const row of report.family_evidence_rows) {
    assert.equal(row.planning_status, "candidate_only");
    assert.equal(row.evidence_status, "UNKNOWN");
    assert.equal(row.consumable_kind, "vacuum_bag");
    assert.equal(row.ready_for_truth_spine_seed, false);
  }
});

test("bag-code proof and model-fit proof are separate requirements", () => {
  const report = buildVacuumBagsOemResearchEvidencePacketV1({ rootDir: REPO_ROOT });
  assert.equal(report.evidence_rules.bag_code_proof_separate_from_model_fit, true);
  assert.ok(
    report.family_evidence_rows.every(
      (r) =>
        r.required_evidence_before_csv.some((e) => e.includes("bag_code_proof")) &&
        r.required_evidence_before_csv.some((e) => e.includes("model_fit_proof")),
    ),
  );
  assert.equal(report.evidence_rules.marketplace_listings_disallowed_as_model_fit_proof, true);
});

test("furnace filters remain out of scope", () => {
  const report = buildVacuumBagsOemResearchEvidencePacketV1({ rootDir: REPO_ROOT });
  assert.equal(report.evidence_rules.furnace_filters_out_of_scope, true);
  assert.ok(report.furnace_filters_out_of_scope_reason.includes("MERV"));
  assert.ok(report.proven_facts.some((f) => f.includes("Furnace filters out of scope")));
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

  buildVacuumBagsOemResearchEvidencePacketV1({ rootDir: REPO_ROOT });

  for (const [p, content] of before) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
    assert.equal(statSync(path.join(REPO_ROOT, p)).mtimeMs, mtimesBefore.get(p));
  }
});

test("inspect_summary exposes bounded family counts and NEEDS_MORE_OEM_EVIDENCE", () => {
  const report = buildVacuumBagsOemResearchEvidencePacketV1({ rootDir: REPO_ROOT });
  assert.equal(report.recommendation, "NEEDS_MORE_OEM_EVIDENCE");
  assert.equal(report.inspect_summary.recommendation, "NEEDS_MORE_OEM_EVIDENCE");
  assert.equal(report.inspect_summary.families_checked_count, 4);
  assert.equal(report.inspect_summary.families_ready_for_truth_spine_seed_count, 0);
  assert.equal(report.inspect_summary.families_needing_more_evidence_count, 4);
  assert.equal(report.inspect_summary.vacuum_launch_state, getVerticalLaunchState("vacuum"));
  assert.equal(report.source_seed_packet_contract, "vacuum_bags_research_seed_packet_v1");
  assert.deepEqual(
    report.bounded_families.map((f) => f.family_code),
    VACUUM_OEM_BOUNDED_FAMILY_TARGETS_V1.map((f) => f.family_code),
  );
  assert.ok(
    report.inspect_summary.recommended_jq_paths.command_center.includes(
      "vacuum_bags_oem_research_evidence_packet_v1",
    ),
  );
});
