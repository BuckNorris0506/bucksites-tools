import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BAD_MAPPING_CORRECTION_BATCH_RUNNER_ALLOWED_WRITE_REL_PATHS_V1,
  BAD_MAPPING_CORRECTION_BATCH_RUNNER_CONTRACT_V1,
  buildBadMappingCorrectionBatchRunnerV1,
  writeBadMappingCorrectionBatchRunnerArtifactsV1,
} from "./bad-mapping-correction-batch-runner-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/bad-mapping-correction-batch-runner-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  "scripts/report-bad-mapping-correction-batch-runner-v1.ts",
  "utf8",
);

const FIXED_NOW = () => new Date("2026-06-08T12:00:00.000Z");

test("contract and read-only flags", () => {
  const report = buildBadMappingCorrectionBatchRunnerV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.contract, BAD_MAPPING_CORRECTION_BATCH_RUNNER_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
});

test("all 76 dangerous mappings are included", () => {
  const report = buildBadMappingCorrectionBatchRunnerV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.dangerous_slug_count, 76);
  assert.equal(report.correction_packets.length, 76);
  assert.ok(report.correction_packets.every((packet) => packet.mutation_authorized === false));
  assert.ok(report.correction_packets.every((packet) => packet.owner_approval_required === true));
});

test("no slug with UNKNOWN correct replacement is marked mutation-ready", () => {
  const report = buildBadMappingCorrectionBatchRunnerV1({ rootDir: ROOT, now: FIXED_NOW });
  const unknownPackets = report.correction_packets.filter(
    (packet) => packet.suspected_correct_filter_family === "UNKNOWN",
  );
  assert.ok(unknownPackets.length > 0);
  assert.ok(unknownPackets.every((packet) => packet.mutation_ready === false));
});

test("samsung-rf27t5501sr is the only immediate surgical candidate", () => {
  const report = buildBadMappingCorrectionBatchRunnerV1({ rootDir: ROOT, now: FIXED_NOW });
  const surgical = report.correction_packets.filter(
    (packet) => packet.immediate_surgical_candidate,
  );
  assert.equal(surgical.length, 1);
  assert.equal(surgical[0]?.fridge_slug, "samsung-rf27t5501sr");
  assert.equal(surgical[0]?.suspected_correct_filter_family, "samsung::HAFCIN");
  assert.equal(surgical[0]?.allowed_correction_action, "remove_mapping");
  assert.equal(surgical[0]?.mutation_ready, true);
});

test("LG LT co-map group generates HyperAgent research tasks, not compat edits", () => {
  const report = buildBadMappingCorrectionBatchRunnerV1({ rootDir: ROOT, now: FIXED_NOW });
  const lgPackets = report.correction_packets.filter(
    (packet) => packet.root_cause_group === "lg_lt_generation_co_maps",
  );
  assert.equal(lgPackets.length, 34);
  assert.ok(lgPackets.every((packet) => packet.workflow_phase === "hyperagent_research"));
  assert.ok(lgPackets.every((packet) => packet.mutation_ready === false));
  assert.ok(
    lgPackets.every((packet) => packet.allowed_correction_action === "noindex_until_proven"),
  );

  const lgBatches = report.hyperagent_research_batch_groups.filter(
    (group) => group.root_cause_group === "lg_lt_generation_co_maps",
  );
  assert.ok(lgBatches.length > 0);
  assert.ok(lgBatches.every((group) => group.compat_edit_authorized === false));
  assert.ok(lgBatches.every((group) => group.workflow_phase === "hyperagent_research"));
});

test("Samsung DA29/DA97 group generates HyperAgent research tasks, not compat edits", () => {
  const report = buildBadMappingCorrectionBatchRunnerV1({ rootDir: ROOT, now: FIXED_NOW });
  const samsungPackets = report.correction_packets.filter(
    (packet) => packet.root_cause_group === "samsung_haf_qin_da29_da97_conflicts",
  );
  assert.equal(samsungPackets.length, 33);
  assert.ok(samsungPackets.every((packet) => packet.workflow_phase === "hyperagent_research"));
  assert.ok(samsungPackets.every((packet) => packet.mutation_ready === false));
  assert.ok(
    samsungPackets.every((packet) => packet.allowed_correction_action === "noindex_until_proven"),
  );

  const samsungBatches = report.hyperagent_research_batch_groups.filter(
    (group) => group.root_cause_group === "samsung_haf_qin_da29_da97_conflicts",
  );
  assert.ok(samsungBatches.length > 0);
  assert.ok(samsungBatches.every((group) => group.compat_edit_authorized === false));
});

test("recommended first batch contains 10-20 slugs including surgical candidate", () => {
  const report = buildBadMappingCorrectionBatchRunnerV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(report.recommended_first_batch_slugs.length >= 10);
  assert.ok(report.recommended_first_batch_slugs.length <= 20);
  assert.ok(report.recommended_first_batch_slugs.includes("samsung-rf27t5501sr"));
});

test("read-only guard blocks writes to compat, retailer links, sitemap, robots, Supabase paths", () => {
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

  for (const allowed of BAD_MAPPING_CORRECTION_BATCH_RUNNER_ALLOWED_WRITE_REL_PATHS_V1) {
    assert.ok(LIB_SOURCE.includes(allowed), `lib must reference allowed write path ${allowed}`);
  }
});

test("write-artifacts only writes allowed runner paths", () => {
  const report = buildBadMappingCorrectionBatchRunnerV1({ rootDir: ROOT, now: FIXED_NOW });
  const paths = writeBadMappingCorrectionBatchRunnerArtifactsV1({ rootDir: ROOT, report });
  assert.ok(existsSync(path.join(ROOT, paths.jsonRelPath)));
  assert.ok(existsSync(path.join(ROOT, paths.mdRelPath)));
});
