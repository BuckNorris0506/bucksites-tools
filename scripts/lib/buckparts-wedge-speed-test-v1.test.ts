import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  WEDGE_SPEED_TEST_CONTRACT_V1,
  buildWedgeSpeedTestReportV1,
  estimateWedgeSpeedRatioV1,
  resolveWedgeSpeedArchitectureVerdictV1,
  scoreWedgeSpeedTestCandidatesV1,
  selectWedgeForSpeedTestV1,
  type WedgeCapabilityRowV1,
} from "./buckparts-wedge-speed-test-v1";

const REPO_ROOT = process.cwd();

test("read-only flags and no mutation authority", () => {
  const report = buildWedgeSpeedTestReportV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  assert.equal(report.contract, WEDGE_SPEED_TEST_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.artifact_write_authorized, false);
  assert.equal(report.supabase_writes, false);
});

test("deterministic wedge selection picks humidifier on repo truth scoring", () => {
  const scores = scoreWedgeSpeedTestCandidatesV1({ rootDir: REPO_ROOT });
  const a = selectWedgeForSpeedTestV1(scores);
  const b = selectWedgeForSpeedTestV1(scores);
  assert.deepEqual(a, b);
  assert.equal(a.wedge, HOMEKEEP_WEDGE_CATALOG.humidifier);
});

test("selected wedge is one of the three candidates", () => {
  const report = buildWedgeSpeedTestReportV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  assert.ok(
    report.selected_wedge === HOMEKEEP_WEDGE_CATALOG.humidifier ||
      report.selected_wedge === HOMEKEEP_WEDGE_CATALOG.vacuum ||
      report.selected_wedge === HOMEKEEP_WEDGE_CATALOG.appliance_air,
  );
});

test("produces allowed wedge-speed ratio class", () => {
  const report = buildWedgeSpeedTestReportV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  assert.ok(
    [
      "UNDER_20_PERCENT",
      "TWENTY_TO_FIFTY_PERCENT",
      "FIFTY_TO_EIGHTY_PERCENT",
      "OVER_EIGHTY_PERCENT",
      "UNKNOWN",
    ].includes(report.wedge_speed_ratio_estimate),
  );
});

test("produces allowed architecture verdict", () => {
  const report = buildWedgeSpeedTestReportV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  assert.ok(
    ["REUSABLE_ARCHITECTURE_SIGNAL", "DOMAIN_SPECIFIC_SIGNAL", "INCONCLUSIVE"].includes(
      report.architecture_verdict,
    ),
  );
});

test("NEEDS_CORE_CONTRACT_CHANGE forces OVER_EIGHTY ratio and DOMAIN_SPECIFIC verdict", () => {
  const rows: WedgeCapabilityRowV1[] = [
    {
      capability_id: "ucf_core_contract_fit",
      label: "test",
      fridge_ap_maturity_note: "test",
      candidate_status: "NEEDS_CORE_CONTRACT_CHANGE",
      evidence: ["x"],
      source: "test",
    },
  ];
  const { ratio } = estimateWedgeSpeedRatioV1({ capability_rows: rows });
  assert.equal(ratio, "OVER_EIGHTY_PERCENT");
  assert.equal(
    resolveWedgeSpeedArchitectureVerdictV1({ ratio, core_contract_change_count: 1 }),
    "DOMAIN_SPECIFIC_SIGNAL",
  );
});

test("many UNKNOWN capabilities fail closed to UNKNOWN ratio", () => {
  const rows: WedgeCapabilityRowV1[] = Array.from({ length: 5 }, (_, i) => ({
    capability_id: `cap_${i}`,
    label: "test",
    fridge_ap_maturity_note: "test",
    candidate_status: "UNKNOWN" as const,
    evidence: ["x"],
    source: "test",
  }));
  const { ratio } = estimateWedgeSpeedRatioV1({ capability_rows: rows });
  assert.equal(ratio, "UNKNOWN");
});

test("inventory includes routes adapter and sample data for humidifier", () => {
  const report = buildWedgeSpeedTestReportV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  if (report.selected_wedge !== HOMEKEEP_WEDGE_CATALOG.humidifier) return;
  assert.equal(report.inventory.data_source, "sample_csv_only");
  assert.ok(report.inventory.routes.length >= 6);
  assert.equal(
    report.inventory.adapter_id,
    "humidifier_coverage_factory_reference_adapter_v1",
  );
  assert.equal(report.inventory.safe_buyer_path_proven_count, 0);
});

test("does not mutate retailer_links.csv", () => {
  const csvBefore = readFileSync(path.join(REPO_ROOT, "data/retailer_links.csv"), "utf8");
  buildWedgeSpeedTestReportV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  assert.equal(readFileSync(path.join(REPO_ROOT, "data/retailer_links.csv"), "utf8"), csvBefore);
});

test("package script exists", () => {
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  assert.ok(pkg.scripts["buckparts:wedge-speed-test"]);
});
