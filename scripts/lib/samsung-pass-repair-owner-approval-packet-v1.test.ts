import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildSamsungPassRepairOwnerApprovalPacketV1,
  buildSamsungPassRepairOwnerDecisionTemplateV1,
  SAMSUNG_PASS_REPAIR_APPROVAL_OPTION_IDS_V1,
  SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_ALLOWED_WRITE_REL_PATHS_V1,
  SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_CONTRACT_V1,
  SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_JSON_REL_V1,
  SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_MD_REL_V1,
  SAMSUNG_PASS_REPAIR_OWNER_DECISION_TEMPLATE_JSON_REL_V1,
  SAMSUNG_PASS_REPAIR_SEPARATE_APPLY_EXECUTOR_STATEMENT_V1,
  writeSamsungPassRepairOwnerApprovalPacketArtifactsV1,
} from "./samsung-pass-repair-owner-approval-packet-v1";
import {
  SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
  type SamsungPassRepairApplyPlanV1,
} from "./samsung-pass-repair-apply-plan-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/samsung-pass-repair-owner-approval-packet-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  "scripts/report-samsung-pass-repair-owner-approval-packet-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-06-09T12:00:00.000Z");

function loadApplyPlan(): SamsungPassRepairApplyPlanV1 {
  return JSON.parse(
    readFileSync(path.join(ROOT, SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1), "utf8"),
  ) as SamsungPassRepairApplyPlanV1;
}

test("contract and read-only flags", () => {
  const packet = buildSamsungPassRepairOwnerApprovalPacketV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.contract, SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_CONTRACT_V1);
  assert.equal(packet.read_only, true);
  assert.equal(packet.data_mutation, false);
  assert.equal(packet.mutation_authorized, false);
  assert.equal(packet.owner_approval_required, true);
  assert.equal(packet.apply_authorized, false);
  assert.equal(packet.csv_apply_authorized, false);
  assert.equal(packet.supabase_mutation_authorized, false);
});

test("approval packet includes 5 planned rows and 4 decision options", () => {
  const packet = buildSamsungPassRepairOwnerApprovalPacketV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.planned_rows.length, 5);
  assert.equal(packet.approval_options.length, 4);
  assert.deepEqual(
    packet.approval_options.map((option) => option.option_id),
    [...SAMSUNG_PASS_REPAIR_APPROVAL_OPTION_IDS_V1],
  );
  assert.equal(packet.apply_plan_rel_path, SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1);
  assert.ok(packet.decision_needed.includes("5-row"));
  assert.equal(
    packet.separate_apply_executor_required_statement,
    SAMSUNG_PASS_REPAIR_SEPARATE_APPLY_EXECUTOR_STATEMENT_V1,
  );

  const slugs = packet.planned_rows.map((row) => row.fridge_slug).sort();
  assert.deepEqual(slugs, [...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1].sort());
  assert.equal(packet.before_after_mapping_summary.length, 5);
  assert.deepEqual(packet.removed_filter_slugs.sort(), [
    "da29-00012b",
    "da29-00019a",
    "da29-00020b",
    "da29-10105j",
  ]);
  assert.deepEqual(packet.added_filter_slugs, ["da97-17376b"]);
  assert.equal(packet.expected_scoreboard_delta.estimated_wrong_part_risk_reduction_if_owner_approved, 5);
});

test("approve_apply_plan maps to owner_mutation_approved with evidence gate", () => {
  const packet = buildSamsungPassRepairOwnerApprovalPacketV1({ rootDir: ROOT, now: FIXED_NOW });
  const approve = packet.approval_options.find((option) => option.option_id === "approve_apply_plan");
  assert.ok(approve);
  assert.equal(approve.founder_decision_registry_mapping.decision_status, "approved");
  assert.equal(approve.founder_decision_registry_mapping.allowed_next_scope, "owner_mutation_approved");
  assert.equal(approve.founder_decision_registry_mapping.evidence_required_before_mutation, true);

  const reject = packet.approval_options.find((option) => option.option_id === "reject_apply_plan");
  assert.equal(reject?.founder_decision_registry_mapping.allowed_next_scope, "none");
});

test("decision template is template-only and not consumed by automation", () => {
  const applyPlan = loadApplyPlan();
  const template = buildSamsungPassRepairOwnerDecisionTemplateV1({ applyPlan });
  assert.equal(template.template_only, true);
  assert.equal(template.not_consumed_by_automation, true);
  assert.equal(template.mutation_authorized, false);
  assert.equal(template.read_only, true);
  assert.equal(template.data_mutation, false);
  assert.equal(template.row_template.samsung_pass_repair_owner_approval_context_v1.planned_slug_count, 5);
  assert.ok(template.notes.some((note) => note.includes("guarded apply executor")));
});

test("build path does not mutate product data", () => {
  const csvPath = path.join(ROOT, "data/compatibility_mappings.csv");
  const before = readFileSync(csvPath, "utf8");
  buildSamsungPassRepairOwnerApprovalPacketV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(readFileSync(csvPath, "utf8"), before);

  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/filters.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge_models.csv")',
    'writeFileSync(path.join(args.rootDir, "data/manual-evidence/refrigerator/',
    "supabase/",
  ];
  for (const needle of forbiddenWrites) {
    assert.ok(!LIB_SOURCE.includes(needle), `build path must not write ${needle}`);
  }
});

test("write artifacts only to allowed draft paths", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-owner-approval-"));
  try {
    const packet = buildSamsungPassRepairOwnerApprovalPacketV1({ rootDir: ROOT, now: FIXED_NOW });
    const template = buildSamsungPassRepairOwnerDecisionTemplateV1({ applyPlan: loadApplyPlan() });
    const written = writeSamsungPassRepairOwnerApprovalPacketArtifactsV1({
      rootDir: tmp,
      packet,
      decisionTemplate: template,
    });
    assert.equal(written.json_rel_path, SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_JSON_REL_V1);
    assert.equal(written.md_rel_path, SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_MD_REL_V1);
    assert.equal(
      written.decision_template_rel_path,
      SAMSUNG_PASS_REPAIR_OWNER_DECISION_TEMPLATE_JSON_REL_V1,
    );
    for (const relPath of [
      written.json_rel_path,
      written.md_rel_path,
      written.decision_template_rel_path,
    ]) {
      assert.ok(
        (SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_ALLOWED_WRITE_REL_PATHS_V1 as readonly string[]).includes(
          relPath,
        ),
      );
      assert.ok(existsSync(path.join(tmp, relPath)));
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("report script supports --write-artifacts only for draft outputs", () => {
  assert.ok(REPORT_SOURCE.includes("--write-artifacts"));
  assert.ok(REPORT_SOURCE.includes("writeSamsungPassRepairOwnerApprovalPacketArtifactsV1"));
  assert.ok(!REPORT_SOURCE.includes("compatibility_mappings.csv"));
});
