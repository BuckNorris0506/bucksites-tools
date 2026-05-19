import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { buildCommandCenterBrainCoverageManifestV1 } from "./buckparts-brain-coverage-manifest-v1";
import { buildBrainIntegrityGateV1 } from "./buckparts-brain-integrity-gate-v1";
import {
  buildBrainConsolidationPlanV1,
  classifyBrainConsolidationCandidateV1,
} from "./buckparts-brain-consolidation-plan-v1";

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
  assert.ok(typeof plan.classification_counts === "object");
  assert.equal(
    plan.skipped_standalone_count,
    plan.classification_counts.INTENTIONALLY_STANDALONE_DOWNSTREAM_VIEW +
      plan.classification_counts.INTENTIONALLY_STANDALONE_VALIDATION_HARNESS +
      plan.classification_counts.INTENTIONALLY_STANDALONE_ON_DEMAND_DEEP_PROOF,
  );
  for (const target of plan.high_priority_consolidation_targets) {
    assert.equal(target.consolidation_classification, "INTEGRATE_AS_CC_OPERATING_SUMMARY");
  }
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
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_daily"));
  assert.ok(!plan.next_consolidation_slice?.includes("daily_operator_summary_v1"));
  assert.ok(!plan.next_consolidation_slice?.includes("owner_vertical_launch_policy_v1"));
  const demandManifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: existsSync,
    readTextFile: (p) => readFileSync(p, "utf8"),
  }).entries.find((e) => e.system_id === "buckparts_demand-work-queue");
  assert.equal(demandManifest?.verdict, "CONNECTED");
  assert.equal(demandManifest?.cc_json_path, "command_center_v2.demand_work_queue_summary_v1");
  assert.ok(!plan.high_priority_consolidation_targets.some((t) => t.system_id === "buckparts_demand-work-queue"));
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_demand-work-queue"));
  assert.ok(!plan.next_consolidation_slice?.includes("demand_work_queue_summary_v1"));
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
    assert.ok(!plan.next_consolidation_slice?.includes(systemId), systemId);
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
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_founder-digest"));
  assert.ok(!plan.next_consolidation_slice?.includes("founder_digest_summary_v1"));
  assert.equal(
    classifyBrainConsolidationCandidateV1(manifestEntry!),
    "INTENTIONALLY_STANDALONE_DOWNSTREAM_VIEW",
  );
});

test("buildBrainConsolidationPlanV1 treats buckparts_precheck_amazon-refrigerator-tokens as intentionally standalone", () => {
  const plan = buildLivePlan();
  const manifestEntry = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: existsSync,
    readTextFile: (p) => readFileSync(p, "utf8"),
  }).entries.find((e) => e.system_id === "buckparts_precheck_amazon-refrigerator-tokens");
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "BYPASSING");
  assert.equal(manifestEntry!.cc_json_path, null);
  assert.equal(manifestEntry!.dashboard_only, false);
  assert.match(manifestEntry!.reason, /insert-safety precheck; intentionally standalone/);
  const standalone = plan.intentionally_standalone_entries.find(
    (e) => e.system_id === "buckparts_precheck_amazon-refrigerator-tokens",
  );
  assert.ok(standalone);
  assert.ok(
    !plan.high_priority_consolidation_targets.some(
      (e) => e.system_id === "buckparts_precheck_amazon-refrigerator-tokens",
    ),
  );
  assert.ok(!plan.next_consolidation_slice?.includes("precheck"));
  assert.ok(!plan.next_consolidation_slice?.includes("amazon-refrigerator-token"));
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_precheck_amazon-refrigerator-tokens"));
  assert.equal(
    classifyBrainConsolidationCandidateV1(manifestEntry!),
    "INTENTIONALLY_STANDALONE_ON_DEMAND_DEEP_PROOF",
  );
});

test("buildBrainConsolidationPlanV1 treats buckparts_runner-step as intentionally standalone", () => {
  const plan = buildLivePlan();
  const manifestEntry = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: existsSync,
    readTextFile: (p) => readFileSync(p, "utf8"),
  }).entries.find((e) => e.system_id === "buckparts_runner-step");
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "BYPASSING");
  assert.equal(manifestEntry!.cc_json_path, null);
  assert.equal(manifestEntry!.dashboard_only, false);
  assert.match(manifestEntry!.reason, /validation harness; intentionally standalone/);
  const standalone = plan.intentionally_standalone_entries.find((e) => e.system_id === "buckparts_runner-step");
  assert.ok(standalone);
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "buckparts_runner-step"));
  assert.ok(!plan.next_consolidation_slice?.includes("runner-step"));
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_runner-step"));
  assert.ok(!plan.next_consolidation_slice?.includes("runner_step_summary_v1"));
  assert.equal(
    classifyBrainConsolidationCandidateV1(manifestEntry!),
    "INTENTIONALLY_STANDALONE_VALIDATION_HARNESS",
  );
});

test("buildBrainConsolidationPlanV1 classifies dashboard duplicates and external live truth", () => {
  const manifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: existsSync,
    readTextFile: (p) => readFileSync(p, "utf8"),
  });
  const gsc = manifest.entries.find((e) => e.system_id === "owner_gsc_external_demand");
  const gaps = manifest.entries.find((e) => e.system_id === "owner_search_demand_and_gaps");
  const sentry = manifest.entries.find((e) => e.system_id === "sentry_error_monitoring");
  const gh = manifest.entries.find((e) => e.system_id === "github_actions_live_status");
  assert.ok(gsc && gaps && sentry && gh);
  assert.equal(classifyBrainConsolidationCandidateV1(gsc!), "DEDUPE_EXISTING_CC_TRUTH");
  assert.equal(classifyBrainConsolidationCandidateV1(gaps!), "DEDUPE_EXISTING_CC_TRUTH");
  assert.equal(classifyBrainConsolidationCandidateV1(sentry!), "EXTERNAL_LIVE_TRUTH_REQUIRED");
  assert.equal(classifyBrainConsolidationCandidateV1(gh!), "EXTERNAL_LIVE_TRUTH_REQUIRED");
  const plan = buildLivePlan();
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "owner_gsc_external_demand"));
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "owner_search_demand_and_gaps"));
  assert.ok(!plan.next_consolidation_slice?.includes("owner_gsc_external_demand"));
  assert.ok(!plan.next_consolidation_slice?.includes("owner_search_demand_and_gaps"));
  assert.ok(!plan.next_consolidation_slice?.includes("sentry_error_monitoring"));
  assert.ok(!plan.next_consolidation_slice?.includes("github_actions_live_status"));
  assert.equal(plan.skipped_duplicate_count, plan.classification_counts.DEDUPE_EXISTING_CC_TRUTH);
  assert.equal(plan.skipped_external_count, plan.classification_counts.EXTERNAL_LIVE_TRUTH_REQUIRED);
});

test("buildBrainConsolidationPlanV1 classifies mutating executor as DO_NOT_INTEGRATE_MUTATING_EXECUTOR", () => {
  const manifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: existsSync,
    readTextFile: (p) => readFileSync(p, "utf8"),
  });
  const mutate = manifest.entries.find((e) => e.system_id.includes("mutate"));
  assert.ok(mutate);
  assert.equal(classifyBrainConsolidationCandidateV1(mutate!), "DO_NOT_INTEGRATE_MUTATING_EXECUTOR");
});

test("buildBrainConsolidationPlanV1 next_consolidation_slice only targets INTEGRATE_AS_CC_OPERATING_SUMMARY", () => {
  const plan = buildLivePlan();
  if (plan.next_consolidation_slice === null) {
    assert.equal(plan.next_safe_integration_target, null);
    assert.ok(plan.proven_facts.some((f) => f.includes("NO_SAFE_OPERATING_SUMMARY_TARGET")));
  } else {
    assert.ok(plan.next_safe_integration_target);
    assert.equal(
      plan.next_safe_integration_target.consolidation_classification,
      "INTEGRATE_AS_CC_OPERATING_SUMMARY",
    );
    assert.ok(plan.next_consolidation_slice.includes(plan.next_safe_integration_target.system_id));
  }
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_founder-digest"));
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_runner-step"));
  assert.ok(!plan.next_consolidation_slice?.includes("owner_gsc_external_demand"));
});

test("buildBrainConsolidationPlanV1 keeps HQ handoff in do_not_integrate", () => {
  const plan = buildLivePlan();
  const hq = plan.do_not_integrate_entries.find((e) => e.system_id === "hq_handoff_doc");
  assert.ok(hq);
  assert.equal(hq!.verdict, "DEPRECATED");
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "hq_handoff_doc"));
});
