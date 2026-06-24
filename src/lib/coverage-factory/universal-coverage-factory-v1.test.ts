import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  AP_COVERAGE_FACTORY_ADAPTER_ID_V1,
  COMMITTED_UCF_ADAPTER_IDS_V1,
  coverageFactoryContractsGrantProductionMutationAuthorityV1,
  FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
  WHW_COVERAGE_FACTORY_ADAPTER_ID_V1,
} from "./index";

import {
  buildUniversalCoverageFactoryV1,
  isCommittedUcfAdapterIdV1,
  universalCoverageFactoryGrantsMutationAuthorityV1,
  validateUniversalCoverageFactoryV1,
} from "./universal-coverage-factory-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

test("AP + WHW + Fridge aggregate into universal_coverage_factory_v1", () => {
  const factory = buildUniversalCoverageFactoryV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });

  assert.ok(validateUniversalCoverageFactoryV1(factory));
  assert.equal(factory.contract, "universal_coverage_factory_v1");
  assert.equal(factory.wedge_summary.length, 3);
  assert.equal(factory.batch_heads.length, 11);
  assert.equal(factory.run_manifest.subject_count, 11);

  const wedges = factory.wedge_summary.map((row) => row.wedge).sort();
  assert.deepEqual(wedges, [
    HOMEKEEP_WEDGE_CATALOG.air_purifier,
    HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    HOMEKEEP_WEDGE_CATALOG.whole_house_water,
  ]);

  const ap = factory.wedge_summary.find((row) => row.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier);
  const whw = factory.wedge_summary.find(
    (row) => row.wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water,
  );
  const fridge = factory.wedge_summary.find(
    (row) => row.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  );
  assert.ok(ap && whw && fridge);
  assert.equal(ap.subject_count, 3);
  assert.equal(whw.subject_count, 3);
  assert.equal(fridge.subject_count, 5);
});

test("factory totals reconcile with wedge summaries", () => {
  const factory = buildUniversalCoverageFactoryV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });

  const totals = factory.factory_totals;
  const summary = factory.wedge_summary;

  assert.equal(
    totals.total_subjects,
    summary.reduce((sum, row) => sum + row.subject_count, 0),
  );
  assert.equal(
    totals.total_ready_for_change_planning,
    summary.reduce((sum, row) => sum + row.ready_for_change_planning_count, 0),
  );
  assert.equal(
    totals.total_suppressed,
    summary.reduce((sum, row) => sum + row.suppressed_count, 0),
  );
  assert.equal(
    totals.total_mapping_review,
    summary.reduce((sum, row) => sum + row.mapping_review_count, 0),
  );
  assert.equal(
    totals.total_owner_review,
    summary.reduce((sum, row) => sum + row.owner_review_count, 0),
  );

  assert.equal(
    totals.total_ready_for_change_planning,
    factory.batch_heads.filter((row) => row.disposition === "ready_for_change_planning").length,
  );
  assert.equal(
    totals.total_suppressed,
    factory.batch_heads.filter((row) => row.disposition === "suppressed").length,
  );
});

test("batch heads are deterministic and preserve adapter_state", () => {
  const first = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });
  const second = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });

  assert.deepEqual(first.batch_heads, second.batch_heads);
  assert.deepEqual(
    first.batch_heads.map((row) => row.subject_id),
    [...first.batch_heads.map((row) => row.subject_id)].sort((a, b) => a.localeCompare(b)),
  );

  for (let index = 1; index < first.batch_heads.length; index += 1) {
    const prev = first.batch_heads[index - 1];
    const current = first.batch_heads[index];
    const wedgeCompare = prev.wedge.localeCompare(current.wedge);
    assert.ok(wedgeCompare < 0 || (wedgeCompare === 0 && prev.subject_id <= current.subject_id));
  }

  const edr4 = first.batch_heads.find((row) => row.subject_id.includes("edr4rxd1"));
  assert.ok(edr4);
  assert.equal(edr4.adapter_state, "APPLY_READY_AFTER_OWNER_BROWSER_PROOF");

  const holmes = first.batch_heads.find((row) => row.subject_id.includes("holmes-hapf30"));
  assert.ok(holmes);
  assert.equal(holmes.adapter_state, "EXCLUDE");
});

test("no production mutation authority in universal factory output", () => {
  const factory = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });

  assert.equal(factory.mutation_authorized, false);
  assert.equal(factory.production_mutation_authorized, false);
  assert.equal(factory.run_manifest.mutation_authorized, false);
  assert.equal(factory.run_manifest.production_mutation_authorized, false);
  assert.equal(universalCoverageFactoryGrantsMutationAuthorityV1(), false);
  assert.equal(coverageFactoryContractsGrantProductionMutationAuthorityV1(), false);

  for (const head of factory.batch_heads) {
    assert.equal(typeof head.adapter_state, "string");
    assert.equal(typeof head.policy_apply_allowed, "boolean");
  }
});

test("unknown wedge adapters fail closed", () => {
  assert.throws(
    () =>
      buildUniversalCoverageFactoryV1({
        rootDir: ROOT,
        adapter_ids: ["vacuum_coverage_factory_reference_adapter_v1" as typeof AP_COVERAGE_FACTORY_ADAPTER_ID_V1],
      }),
    /fail closed/,
  );

  assert.throws(
    () =>
      buildUniversalCoverageFactoryV1({
        rootDir: ROOT,
        adapter_ids: ["not_a_real_adapter_v1" as typeof AP_COVERAGE_FACTORY_ADAPTER_ID_V1],
      }),
    /fail closed/,
  );

  assert.equal(isCommittedUcfAdapterIdV1(AP_COVERAGE_FACTORY_ADAPTER_ID_V1), true);
  assert.equal(isCommittedUcfAdapterIdV1(WHW_COVERAGE_FACTORY_ADAPTER_ID_V1), true);
  assert.equal(isCommittedUcfAdapterIdV1(FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1), true);
  assert.equal(isCommittedUcfAdapterIdV1("humidifier_coverage_factory_reference_adapter_v1"), false);
  assert.deepEqual(COMMITTED_UCF_ADAPTER_IDS_V1.length, 3);
});

test("provenance_index_hash is stable for fixed adapter set and clock", () => {
  const first = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });
  const second = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });

  assert.equal(first.run_manifest.provenance_index_hash, second.run_manifest.provenance_index_hash);
  assert.match(first.run_manifest.provenance_index_hash, /^sha256:[a-f0-9]{64}$/);
});
