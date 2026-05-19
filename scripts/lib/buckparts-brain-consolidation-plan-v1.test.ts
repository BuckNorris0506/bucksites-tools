import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { buildCommandCenterBrainCoverageManifestV1 } from "./buckparts-brain-coverage-manifest-v1";
import { buildBrainIntegrityGateV1 } from "./buckparts-brain-integrity-gate-v1";
import { buildBrainConsolidationPlanV1 } from "./buckparts-brain-consolidation-plan-v1";

function buildLivePlan() {
  const manifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: existsSync,
    readTextFile: (p) => readFileSync(p, "utf8"),
  });
  const gate = buildBrainIntegrityGateV1({ manifest, now: () => new Date("2026-05-18T12:00:00.000Z") });
  return buildBrainConsolidationPlanV1({ manifest, gate, now: () => new Date("2026-05-18T12:00:00.000Z") });
}

test("buildBrainConsolidationPlanV1 is read-only and summarizes manifest verdict counts", () => {
  const plan = buildLivePlan();
  assert.equal(plan.contract, "brain_consolidation_plan_v1");
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.total_entries, plan.connected_count + plan.missing_count + plan.bypassing_count + plan.duplicate_count + plan.deprecated_count + plan.partial_count);
  assert.ok(plan.high_priority_consolidation_targets.length >= 1);
});

test("buildBrainConsolidationPlanV1 advances next_consolidation_slice past CONNECTED owner_vertical_launch_policy", () => {
  const plan = buildLivePlan();
  const verticalManifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: existsSync,
    readTextFile: (p) => readFileSync(p, "utf8"),
  }).entries.find((e) => e.system_id === "owner_vertical_launch_policy");
  assert.equal(verticalManifest?.verdict, "CONNECTED");
  assert.equal(verticalManifest?.dashboard_only, false);
  assert.ok(!plan.high_priority_consolidation_targets.some((t) => t.system_id === "owner_vertical_launch_policy"));
  const dailyManifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: existsSync,
    readTextFile: (p) => readFileSync(p, "utf8"),
  }).entries.find((e) => e.system_id === "buckparts_daily");
  assert.equal(dailyManifest?.verdict, "CONNECTED");
  assert.equal(dailyManifest?.cc_json_path, "command_center_v2.daily_operator_summary_v1");
  assert.ok(!plan.high_priority_consolidation_targets.some((t) => t.system_id === "buckparts_daily"));
  assert.ok(!plan.next_consolidation_slice.includes("buckparts_daily"));
  assert.ok(!plan.next_consolidation_slice.includes("daily_operator_summary_v1"));
  assert.ok(!plan.next_consolidation_slice.includes("owner_vertical_launch_policy_v1"));
  const demandManifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: existsSync,
    readTextFile: (p) => readFileSync(p, "utf8"),
  }).entries.find((e) => e.system_id === "buckparts_demand-work-queue");
  assert.equal(demandManifest?.verdict, "CONNECTED");
  assert.equal(demandManifest?.cc_json_path, "command_center_v2.demand_work_queue_summary_v1");
  assert.ok(!plan.high_priority_consolidation_targets.some((t) => t.system_id === "buckparts_demand-work-queue"));
  assert.ok(!plan.next_consolidation_slice.includes("buckparts_demand-work-queue"));
  assert.ok(!plan.next_consolidation_slice.includes("demand_work_queue_summary_v1"));
  const waveSystemIds = [
    "buckparts_audit",
    "buckparts_founder-decision-registry",
    "buckparts_next-execution-packet",
    "buckparts_operating-map",
  ] as const;
  for (const systemId of waveSystemIds) {
    const manifestEntry = buildCommandCenterBrainCoverageManifestV1({
      rootDir: process.cwd(),
      now: () => new Date("2026-05-18T12:00:00.000Z"),
      fileExists: existsSync,
      readTextFile: (p) => readFileSync(p, "utf8"),
    }).entries.find((e) => e.system_id === systemId);
    assert.equal(manifestEntry?.verdict, "CONNECTED", systemId);
    assert.ok(!plan.high_priority_consolidation_targets.some((t) => t.system_id === systemId), systemId);
    assert.ok(!plan.next_consolidation_slice.includes(systemId), systemId);
  }
});

test("buildBrainConsolidationPlanV1 excludes mutating executor from integration targets", () => {
  const plan = buildLivePlan();
  const mutate = plan.do_not_integrate_entries.find((e) => e.system_id.includes("mutate"));
  assert.ok(mutate);
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id.includes("mutate")));
  assert.ok(!plan.intentionally_standalone_entries.some((e) => e.system_id.includes("mutate")));
});

test("buildBrainConsolidationPlanV1 treats buckparts_founder-digest as intentionally standalone", () => {
  const plan = buildLivePlan();
  const manifestEntry = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: existsSync,
    readTextFile: (p) => readFileSync(p, "utf8"),
  }).entries.find((e) => e.system_id === "buckparts_founder-digest");
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "BYPASSING");
  assert.equal(manifestEntry!.cc_json_path, null);
  assert.match(manifestEntry!.reason, /Markdown downstream digest; intentionally standalone/);
  const standalone = plan.intentionally_standalone_entries.find((e) => e.system_id === "buckparts_founder-digest");
  assert.ok(standalone);
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "buckparts_founder-digest"));
  assert.ok(!plan.next_consolidation_slice.includes("buckparts_founder-digest"));
  assert.ok(!plan.next_consolidation_slice.includes("founder_digest_summary_v1"));
});

test("buildBrainConsolidationPlanV1 keeps HQ handoff in do_not_integrate", () => {
  const plan = buildLivePlan();
  const hq = plan.do_not_integrate_entries.find((e) => e.system_id === "hq_handoff_doc");
  assert.ok(hq);
  assert.equal(hq!.verdict, "DEPRECATED");
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "hq_handoff_doc"));
});
