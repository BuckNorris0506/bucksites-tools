import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { resetFridgeAdapterAuditCacheV1 } from "./adapters/fridge-coverage-factory-adapter-v1";
import {
  buildRegisteredUcfFilterSlugSetV1,
  buildUcfCoverageDispositionProvenanceFactsV1,
  buildUcfDecisionAuthorityCutoverReportV1,
  buildUcfDecisionAuthoritySnapshotV1,
  committedUcfRegisteredSubjectCountV1,
  lookupUcfSubjectRowByFilterSlugV1,
  UCF_DECISION_AUTHORITY_CONSUMER_INVENTORY_V1,
  UCF_DECISION_AUTHORITY_CUTOVER_CONTRACT_V1,
} from "./ucf-decision-authority-cutover-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

test.before(() => {
  resetFridgeAdapterAuditCacheV1();
});

test("consumer inventory classifies every known legacy coverage consumer", () => {
  const ids = UCF_DECISION_AUTHORITY_CONSUMER_INVENTORY_V1.map((entry) => entry.consumer_id);
  assert.ok(ids.includes("large_batch_coverage_factory_v1"));
  assert.ok(ids.includes("buckparts_large_batch_coverage_factory_summary_v1"));
  assert.ok(ids.includes("ucf_parity_audit_v1"));
  assert.equal(new Set(ids).size, ids.length);
});

test("decision authority snapshot aligns factory rows with registry", () => {
  const snapshot = buildUcfDecisionAuthoritySnapshotV1({ rootDir: ROOT, now: FIXED_NOW });
  const registeredCount = committedUcfRegisteredSubjectCountV1();

  assert.equal(snapshot.registered_subject_count, registeredCount);
  assert.equal(snapshot.factory.subject_rows.length, registeredCount);
  assert.equal(snapshot.loadable_scale_gap, 0);
  assert.equal(snapshot.decision_layer.subject_rows.length, registeredCount);
  assert.ok(snapshot.work_generator.generated_work_item_count >= 0);

  const rpwfe = lookupUcfSubjectRowByFilterSlugV1(snapshot, "rpwfe", "refrigerator_water");
  assert.ok(rpwfe);
  assert.equal(rpwfe!.subject_id, "refrigerator_water:filter:rpwfe");
});

test("coverage disposition provenance facts cite UCF for registered slugs only", () => {
  const snapshot = buildUcfDecisionAuthoritySnapshotV1({ rootDir: ROOT, now: FIXED_NOW });
  const registered = buildRegisteredUcfFilterSlugSetV1();
  const facts = buildUcfCoverageDispositionProvenanceFactsV1({
    snapshot,
    filterSlugs: ["rpwfe", "not-a-registered-slug"],
    wedge: "refrigerator_water",
  });

  assert.ok(
    facts.some((fact) => fact.includes("ucf_decision_authority_cutover_v1")),
    facts.join("\n"),
  );
  assert.ok(facts.some((fact) => fact.includes("rpwfe")));
  assert.ok(!facts.some((fact) => fact.includes("not-a-registered-slug")));
  assert.ok(registered.has("rpwfe"));
});

test("cutover report inventories migrated consumers and blockers", () => {
  const report = buildUcfDecisionAuthorityCutoverReportV1({ rootDir: ROOT, now: FIXED_NOW });

  assert.equal(report.contract, UCF_DECISION_AUTHORITY_CUTOVER_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.registered_subject_count, 60);
  assert.ok(report.consumers_migrated.length >= 4);
  assert.ok(
    report.consumers_migrated.some(
      (row) => row.consumer === "buckparts_large_batch_coverage_factory_summary_v1",
    ),
  );
  assert.ok(report.remaining_blockers.some((blocker) => blocker.includes("large_batch_coverage_factory_v1")));
  assert.ok(report.remaining_legacy_consumers.includes("large_batch_coverage_factory_v1"));
  assert.ok(report.validation_commands.includes("npm run build"));
});
