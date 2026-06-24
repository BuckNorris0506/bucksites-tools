/**
 * UCF Registry Governance v1 — registered slug SSOT gate.
 * COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1 is the sole registry list;
 * adapter projections and universal factory subject_rows must stay aligned.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  AP_COVERAGE_FACTORY_ADAPTER_ID_V1,
  buildApCoverageFactoryReferenceProjectionV1,
  buildFridgeCoverageFactoryReferenceProjectionV1,
  buildUniversalCoverageFactoryV1,
  buildWhwCoverageFactoryReferenceProjectionV1,
  COMMITTED_UCF_ADAPTER_IDS_V1,
  COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1,
  FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
  WHW_COVERAGE_FACTORY_ADAPTER_ID_V1,
} from "./index";
import { resetFridgeAdapterAuditCacheV1 } from "./adapters/fridge-coverage-factory-adapter-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

const EVIDENCE_DIMS = ["identity", "fit", "buyer_path", "demand", "publication"] as const;

function evidenceSnapshot(evidence: { claims: Record<string, { status: string }> }) {
  return Object.fromEntries(
    EVIDENCE_DIMS.map((dim) => [dim, evidence.claims[dim]?.status ?? "missing"]),
  );
}

function committedUcfRegisteredSubjectCountV1(): number {
  return COMMITTED_UCF_ADAPTER_IDS_V1.reduce(
    (sum, adapterId) =>
      sum + COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[adapterId].length,
    0,
  );
}

test.before(() => {
  resetFridgeAdapterAuditCacheV1();
});

test("registered registry slugs project identically through adapters and universal factory", () => {
  const factory = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });
  const registryCount = committedUcfRegisteredSubjectCountV1();

  assert.equal(factory.subject_rows.length, registryCount);
  assert.equal(factory.run_manifest.subject_count, registryCount);
  assert.equal(factory.factory_totals.total_subjects, registryCount);

  const refAp = buildApCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [
      ...COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[AP_COVERAGE_FACTORY_ADAPTER_ID_V1],
    ],
    now: FIXED_NOW,
  });
  const refWhw = buildWhwCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [
      ...COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[WHW_COVERAGE_FACTORY_ADAPTER_ID_V1],
    ],
    now: FIXED_NOW,
  });
  const refFridge = buildFridgeCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [
      ...COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1],
    ],
    now: FIXED_NOW,
  });

  for (const projection of [refAp, refWhw, refFridge]) {
    for (let i = 0; i < projection.subjects.length; i++) {
      const subject = projection.subjects[i]!;
      const assessment = projection.assessments[i]!;
      const evidence = projection.evidence[i]!;
      const factoryRow = factory.subject_rows.find((row) => row.subject_id === subject.subject_id);

      assert.ok(factoryRow, `factory missing registered subject ${subject.subject_id}`);
      assert.equal(
        factoryRow.disposition,
        assessment.core_disposition,
        `disposition parity for ${subject.subject_id}`,
      );
      assert.equal(
        factoryRow.adapter_state,
        assessment.adapter_state,
        `adapter_state parity for ${subject.subject_id}`,
      );
      assert.deepEqual(
        factoryRow.evidence_summary,
        evidenceSnapshot(evidence),
        `evidence_summary parity for ${subject.subject_id}`,
      );
    }
  }
});
