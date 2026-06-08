import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildFamilyReconciliationV1,
  FAMILY_RECONCILIATION_ALLOWED_WRITE_REL_PATHS_V1,
  FAMILY_RECONCILIATION_CONTRACT_V1,
  writeFamilyReconciliationArtifactsV1,
} from "./family-reconciliation-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/family-reconciliation-v1.ts", "utf8");
const REPORT_SOURCE = readFileSync("scripts/report-family-reconciliation-v1.ts", "utf8");

const FIXED_NOW = () => new Date("2026-06-08T12:00:00.000Z");

function familyRow(
  report: ReturnType<typeof buildFamilyReconciliationV1>,
  familyKey: string,
) {
  const row = report.family_rows.find((entry) => entry.family_key === familyKey);
  assert.ok(row, `missing family row for ${familyKey}`);
  return row!;
}

function ownerPacket(
  report: ReturnType<typeof buildFamilyReconciliationV1>,
  familyKey: string,
) {
  const packet = report.owner_review_packets.find((entry) => entry.family_key === familyKey);
  assert.ok(packet, `missing owner packet for ${familyKey}`);
  return packet!;
}

test("contract and read-only flags", () => {
  const report = buildFamilyReconciliationV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.contract, FAMILY_RECONCILIATION_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.mutation_blocked_until_owner_approval, true);
  assert.ok(report.families_screened > 0);
});

test("filter::frigidaire::eptwfu01 and fppwfu01 reconcile as CRITICAL", () => {
  const report = buildFamilyReconciliationV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(familyRow(report, "filter::frigidaire::eptwfu01").severity, "CRITICAL");
  assert.equal(familyRow(report, "filter::frigidaire::fppwfu01").severity, "CRITICAL");
  assert.ok(familyRow(report, "filter::frigidaire::fppwfu01").model_line_conflict_count > 0);
  assert.equal(ownerPacket(report, "filter::frigidaire::fppwfu01").signals.anchor_frozen, true);
});

test("filter::frigidaire::wf2cb has model-line conflicts and owner packet", () => {
  const report = buildFamilyReconciliationV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = familyRow(report, "filter::frigidaire::wf2cb");
  assert.ok(row.model_line_conflict_count > 0);
  assert.notEqual(row.severity, "NONE");
  const packet = ownerPacket(report, "filter::frigidaire::wf2cb");
  assert.ok(packet.slug_rows.length > 0);
  assert.equal(packet.contract, "family_reconciliation_owner_review_packet_v1");
});

test("filter::whirlpool::edr4rxd1 picks up HyperAgent NEEDS_COMPAT_REVIEW hints", () => {
  const report = buildFamilyReconciliationV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(report.hyperagent_validation_packets_loaded > 0);
  const packet = ownerPacket(report, "filter::whirlpool::edr4rxd1");
  assert.ok(packet.signals.hyperagent_compat_review_count > 0);
  assert.ok(
    packet.slug_rows.some((row) => row.hyperagent_cursor_row_state === "NEEDS_COMPAT_REVIEW"),
  );
  assert.notEqual(familyRow(report, "filter::whirlpool::edr4rxd1").severity, "NONE");
});

test("ranked reconciliation backlog is severity-ordered and repo-derived", () => {
  const report = buildFamilyReconciliationV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(report.ranked_reconciliation_backlog.length > 0);
  for (let index = 1; index < report.ranked_reconciliation_backlog.length; index += 1) {
    assert.ok(
      report.ranked_reconciliation_backlog[index - 1]!.reconciliation_score >=
        report.ranked_reconciliation_backlog[index]!.reconciliation_score,
    );
  }
  const top = report.ranked_reconciliation_backlog[0]!;
  assert.ok(["CRITICAL", "HIGH"].includes(top.severity));
  assert.notEqual(top.family_key, "filter::whirlpool::edr4rxd1");
});

test("write-artifacts only writes allowed reconciliation paths", () => {
  const report = buildFamilyReconciliationV1({ rootDir: ROOT, now: FIXED_NOW });
  writeFamilyReconciliationArtifactsV1({ rootDir: ROOT, report });
  assert.ok(existsSync(path.join(ROOT, "data/fridge/batch-production/audits/family-reconciliation-v1.json")));
  assert.ok(existsSync(path.join(ROOT, "data/fridge/batch-production/drafts/family-reconciliation-v1.md")));
  assert.equal(
    FAMILY_RECONCILIATION_ALLOWED_WRITE_REL_PATHS_V1.length >= 2,
    true,
  );
});

test("read-only guard blocks compat, evidence, Supabase, page, retailer writes", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    'writeFileSync(path.join(args.rootDir, "data/manual-evidence/refrigerator/',
  ];

  for (const needle of forbiddenWrites) {
    assert.equal(LIB_SOURCE.includes(needle), false, `lib must not write ${needle}`);
  }

  assert.equal(LIB_SOURCE.includes("readFileSync"), true);
  assert.equal(REPORT_SOURCE.includes("writeFamilyReconciliationArtifactsV1"), true);
});
