import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import {
  COVERAGE_ASSESSMENT_DISPOSITIONS_V1,
  type CoverageAssessmentV1,
} from "@/lib/coverage-factory/coverage-assessment-v1";
import {
  COVERAGE_EVIDENCE_CLAIM_STATUSES_V1,
  type CoverageEvidenceV1,
} from "@/lib/coverage-factory/coverage-evidence-v1";
import type { CoverageSubjectV1 } from "@/lib/coverage-factory/coverage-subject-v1";
import {
  COVERAGE_WORK_ITEM_ACTION_CLASSES_V1,
  type CoverageWorkItemV1,
} from "@/lib/coverage-factory/coverage-work-item-v1";

import {
  SINGLE_SUBJECT_CONTRACT_PORTABILITY_TEST_CONTRACT_V1,
  assertHumidifierSampleCsvUnchangedV1,
  buildSingleSubjectContractPortabilityTestReportV1,
  resolveContractPortabilityVerdictV1,
  selectHumidifierSampleSubjectV1,
  validatePortabilityCoreContractsV1,
} from "./buckparts-single-subject-contract-portability-test-v1";

const REPO_ROOT = process.cwd();
const FIXED_NOW = () => new Date("2026-06-10T12:00:00.000Z");

test("read_only true and no mutation authority", () => {
  const report = buildSingleSubjectContractPortabilityTestReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
  });

  assert.equal(report.contract, SINGLE_SUBJECT_CONTRACT_PORTABILITY_TEST_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.artifact_write_authorized, false);
  assert.equal(report.supabase_writes, false);
  assert.equal(report.work_item_packet.mutation_authority_granted, false);
  assert.equal(report.work_item_packet.artifact_write_authorized, false);
});

test("selects exactly one humidifier sample filter subject deterministically", () => {
  const a = selectHumidifierSampleSubjectV1({ rootDir: REPO_ROOT });
  const b = selectHumidifierSampleSubjectV1({ rootDir: REPO_ROOT });
  assert.deepEqual(a, b);
  assert.ok(a);
  assert.equal(a.wedge, HOMEKEEP_WEDGE_CATALOG.humidifier);
  assert.equal(a.subject_slug, "humi-wf50");
  assert.equal(a.subject_kind, "filter");
  assert.ok(a.source_rows.filter_row);
  assert.ok(a.source_rows.filter_row.oem_part_number.length > 0);
});

test("deterministic report output for fixed now", () => {
  const a = buildSingleSubjectContractPortabilityTestReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
  });
  const b = buildSingleSubjectContractPortabilityTestReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
  });
  assert.equal(a.generated_at, b.generated_at);
  assert.equal(a.selected_subject.subject_slug, b.selected_subject.subject_slug);
  assert.equal(
    a.subject_identity.canonical_subject_id,
    b.subject_identity.canonical_subject_id,
  );
  assert.equal(a.contract_portability_verdict, b.contract_portability_verdict);
});

test("uses existing disposition enum only", () => {
  const report = buildSingleSubjectContractPortabilityTestReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
  });
  assert.ok(
    (COVERAGE_ASSESSMENT_DISPOSITIONS_V1 as readonly string[]).includes(
      report.assessment.disposition,
    ),
  );
  assert.equal(report.contract_validation.disposition_in_core_enum, true);
});

test("uses existing evidence status enum only", () => {
  const report = buildSingleSubjectContractPortabilityTestReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
  });
  for (const status of Object.values(report.assessment.evidence_summary)) {
    assert.ok((COVERAGE_EVIDENCE_CLAIM_STATUSES_V1 as readonly string[]).includes(status));
  }
  assert.equal(report.contract_validation.evidence_statuses_in_core_enum, true);
});

test("uses existing work item action class only", () => {
  const report = buildSingleSubjectContractPortabilityTestReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
  });
  assert.ok(
    (COVERAGE_WORK_ITEM_ACTION_CLASSES_V1 as readonly string[]).includes(
      report.work_item_packet.permitted_action_class,
    ),
  );
  assert.equal(report.contract_validation.action_class_in_core_enum, true);
});

test("injected core contract gap forces REQUIRES_CORE_CONTRACT_CHANGE", () => {
  const report = buildSingleSubjectContractPortabilityTestReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
    inject_core_contract_gap: true,
  });
  assert.equal(report.contract_portability_verdict, "REQUIRES_CORE_CONTRACT_CHANGE");
  assert.ok(report.verdict_rationale.some((line) => line.includes("proven_contract_gap_count")));
});

test("resolveContractPortabilityVerdictV1 fails closed to UNKNOWN when validators fail", () => {
  const { verdict } = resolveContractPortabilityVerdictV1({
    selected: {
      wedge: HOMEKEEP_WEDGE_CATALOG.humidifier,
      subject_slug: "humi-wf50",
      subject_kind: "filter",
      selection_score: 1,
      selection_reasons: [],
      source_rows: {
        filter_row: null,
        model_slug: null,
        retailer_link_count: 0,
        compatibility_mapping_count: 0,
      },
    },
    validation: {
      subject_valid: false,
      evidence_valid: true,
      assessment_valid: true,
      assessment_evidence_consistent: true,
      work_item_valid: true,
      disposition_in_core_enum: true,
      evidence_statuses_in_core_enum: true,
      action_class_in_core_enum: true,
      proven_contract_gap_count: 0,
      adapter_only_gap_count: 0,
    },
    subject: {
      contract: "coverage_subject_v1",
      subject_id: "humidifier:filter:humi-wf50",
      wedge: HOMEKEEP_WEDGE_CATALOG.humidifier,
      kind: "replacement_part",
      internal_slug_labels: ["humi-wf50"],
      official_model_token: null,
      official_replacement_token: "WF50-DEMO",
      official_replacement_name: "Wicking filter (sample)",
      read_only: true,
      data_mutation: false,
    },
  });
  assert.equal(verdict, "UNKNOWN");
});

test("live report is PORTABLE_WITH_EXISTING_CONTRACTS on repo truth", () => {
  const report = buildSingleSubjectContractPortabilityTestReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
  });
  assert.equal(report.contract_portability_verdict, "PORTABLE_WITH_EXISTING_CONTRACTS");
  assert.equal(report.assessment.policy_apply_allowed, false);
  assert.equal(report.subject_identity.canonical_subject_id, "humidifier:filter:humi-wf50");
  assert.equal(report.subject_identity.subject_type, "replacement_part");
  assert.ok(report.provenance.provenance_refs.length > 0);
  assert.equal(report.provenance.invented_external_evidence, false);
  assert.equal(report.contract_validation.subject_valid, true);
  assert.equal(report.contract_validation.evidence_valid, true);
  assert.equal(report.contract_validation.assessment_valid, true);
  assert.equal(report.contract_validation.work_item_valid, true);
});

test("does not mutate humidifier sample CSV", () => {
  const rel = "data/humidifier/filters.sample.csv";
  const before = readFileSync(path.join(REPO_ROOT, rel), "utf8");
  buildSingleSubjectContractPortabilityTestReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
  });
  assert.equal(assertHumidifierSampleCsvUnchangedV1({ rootDir: REPO_ROOT, relPath: rel, before }), true);
});

test("package script exists", () => {
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  assert.ok(pkg.scripts["buckparts:single-subject-contract-portability-test"]);
});

test("validatePortabilityCoreContractsV1 accepts valid humidifier projection rows", () => {
  const report = buildSingleSubjectContractPortabilityTestReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
  });
  const validation = validatePortabilityCoreContractsV1({
    subject: {
      contract: "coverage_subject_v1",
      subject_id: report.subject_identity.canonical_subject_id,
      wedge: HOMEKEEP_WEDGE_CATALOG.humidifier,
      kind: report.subject_identity.subject_type,
      internal_slug_labels: [report.subject_identity.slug],
      official_model_token: null,
      official_replacement_token: report.subject_identity.source_row.oem_part_number,
      official_replacement_name: report.subject_identity.source_row.name,
      read_only: true,
      data_mutation: false,
    } satisfies CoverageSubjectV1,
    evidence: {
      contract: "coverage_evidence_v1",
      subject_id: report.subject_identity.canonical_subject_id,
      claims: {
        identity: {
          dimension: "identity",
          status: report.assessment.evidence_summary.identity,
          provenance_refs: [],
          summary: null,
        },
        fit: {
          dimension: "fit",
          status: report.assessment.evidence_summary.fit,
          provenance_refs: [],
          summary: null,
        },
        buyer_path: {
          dimension: "buyer_path",
          status: report.assessment.evidence_summary.buyer_path,
          provenance_refs: [],
          summary: null,
        },
        demand: {
          dimension: "demand",
          status: report.assessment.evidence_summary.demand,
          provenance_refs: [],
          summary: null,
        },
        publication: {
          dimension: "publication",
          status: report.assessment.evidence_summary.publication,
          provenance_refs: [],
          summary: null,
        },
      },
      read_only: true,
      data_mutation: false,
    } satisfies CoverageEvidenceV1,
    assessment: {
      contract: "coverage_assessment_v1",
      subject_id: report.subject_identity.canonical_subject_id,
      core_disposition: report.assessment.disposition,
      adapter_state: report.assessment.adapter_state,
      policy_apply_allowed: false,
      blockers: report.assessment.assessment_blockers,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      production_mutation_authorized: false,
    } satisfies CoverageAssessmentV1,
    work_item: report.work_item_packet.work_item satisfies CoverageWorkItemV1,
  });
  assert.equal(validation.proven_contract_gap_count, 0);
});
