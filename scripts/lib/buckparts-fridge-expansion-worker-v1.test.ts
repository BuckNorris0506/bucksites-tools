import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  FRIDGE_EXPANSION_CURRENT_MANUAL_WORKFLOW_STEPS_V1,
  FRIDGE_EXPANSION_PRODUCTION_MUTATION_PATHS_V1,
  FRIDGE_EXPANSION_WORKER_ALLOWED_WRITE_PREFIX_V1,
  FRIDGE_EXPANSION_WORKER_CONTRACT_V1,
  FRIDGE_EXPANSION_WORKER_PIPELINE_STEPS_V1,
  FridgeExpansionDraftPathErrorV1,
  buildFridgeExpansionWorkerV1,
  fridgeExpansionWorkerSucceededV1,
  selectNextEligibleUnintegratedFridgeModelV1,
  validateFridgeExpansionDraftOutputPathV1,
  writeFridgeExpansionWorkerDraftsV1,
  type FridgeExpansionTestRunV1,
} from "./buckparts-fridge-expansion-worker-v1";
import type { PageFactoryEvidenceCloneReportV1 } from "./buckparts-page-factory-evidence-clone-v1";
import type { PageQualityGateReportV1 } from "./buckparts-page-quality-gate-v1";
import { buildProvenCohortPageFactoryManifestV1 } from "./proven-cohort-page-factory-manifest-v1";

const LIB_ABS = fileURLToPath(import.meta.url).replace(/\.test\.ts$/, ".ts");
const CLI_ABS = path.resolve(
  path.dirname(LIB_ABS),
  "../run-buckparts-fridge-expansion-worker-v1.ts",
);
const REPO_ROOT = path.resolve(path.dirname(LIB_ABS), "../..");

function stubTests(status: FridgeExpansionTestRunV1["status"] = "PASSED"): FridgeExpansionTestRunV1 {
  return {
    ran: status !== "SKIPPED",
    status,
    command: "BUCKPARTS_TEST_FILES='stub' bash scripts/npm-test-v1.sh",
    test_files: ["stub"],
    exit_code: status === "PASSED" ? 0 : status === "FAILED" ? 1 : null,
    honesty: "PROVEN",
  };
}

test("live discover selects first eligible unregistered proven-cohort slug", async () => {
  const cohort = buildProvenCohortPageFactoryManifestV1({ rootDir: REPO_ROOT });
  const expected = selectNextEligibleUnintegratedFridgeModelV1(cohort);
  assert.ok(expected);
  assert.equal(expected.fridge_slug, "ge-gfe28gmkes");
  assert.equal(expected.already_in_page_factory_registry, false);
  assert.equal(expected.eligible_for_owner_review, true);

  const snapshot = await buildFridgeExpansionWorkerV1({
    rootDir: REPO_ROOT,
    skipTests: true,
    runExistingTests: () => stubTests(),
  });
  assert.equal(snapshot.contract, FRIDGE_EXPANSION_WORKER_CONTRACT_V1);
  assert.equal(snapshot.selected_model?.fridge_slug, "ge-gfe28gmkes");
  assert.equal(snapshot.selected_model?.not_yet_integrated_means, "not_in_page_factory_targets_csv");
  assert.deepEqual(snapshot.filters?.mapped_filter_slugs, ["rpwfe"]);
});

test("hard gates remain closed: no mutation, dispatch, NBA, or Executive organ", async () => {
  const snapshot = await buildFridgeExpansionWorkerV1({
    rootDir: REPO_ROOT,
    skipTests: true,
    runExistingTests: () => stubTests(),
  });
  assert.equal(snapshot.read_only, true);
  assert.equal(snapshot.data_mutation, false);
  assert.equal(snapshot.mutation_authorized, false);
  assert.equal(snapshot.dispatch_invoked, false);
  assert.equal(snapshot.dispatch_authority, false);
  assert.equal(snapshot.nba_authority, false);
  assert.equal(snapshot.steering_authority, false);
  assert.equal(snapshot.executive_organ, false);
  assert.equal(snapshot.owner_review_packet?.csv_apply_authorized, false);
  assert.equal(snapshot.owner_review_packet?.page_factory_registry_apply_authorized, false);
  assert.equal(snapshot.owner_review_packet?.founder_approval_required, true);
  assert.deepEqual(
    snapshot.pipeline.map((row) => row.step_id),
    [...FRIDGE_EXPANSION_WORKER_PIPELINE_STEPS_V1],
  );
  assert.equal(snapshot.pipeline.at(-1)?.step_id, "stop");
  assert.equal(snapshot.pipeline.at(-1)?.status, "COMPLETED");
});

test("non-HAF-QIN models skip clone and quality gate so HAF-QIN is not invented", async () => {
  const snapshot = await buildFridgeExpansionWorkerV1({
    rootDir: REPO_ROOT,
    skipTests: true,
    runExistingTests: () => stubTests(),
  });
  assert.equal(snapshot.filters?.samsung_haf_qin_family, false);
  assert.equal(snapshot.evidence_clone.ran, false);
  assert.equal(snapshot.evidence_clone.status, "SKIPPED");
  assert.equal(snapshot.quality_gate.ran, false);
  assert.match(snapshot.quality_gate.skipped_reason ?? "", /HAF-QIN/);
  assert.equal(snapshot.pipeline.find((row) => row.step_id === "build_integration")?.status, "SKIPPED");
});

test("HAF-QIN eligible model runs existing clone + quality gate generators", async () => {
  const live = buildProvenCohortPageFactoryManifestV1({ rootDir: REPO_ROOT });
  const hafQin = live.cohort_rows.find(
    (row) =>
      row.fridge_slug === "samsung-rf28r7201sr" &&
      row.eligible_for_owner_review &&
      !row.already_in_page_factory_registry,
  );
  assert.ok(hafQin);

  let cloneCalled = false;
  let qualityCalled = false;
  const snapshot = await buildFridgeExpansionWorkerV1({
    rootDir: REPO_ROOT,
    buildCohort: () => ({
      ...live,
      cohort_rows: live.cohort_rows.map((row) =>
        row.fridge_slug === "samsung-rf28r7201sr"
          ? row
          : { ...row, eligible_for_owner_review: false },
      ),
    }),
    buildClone: (args) => {
      cloneCalled = true;
      assert.equal(args.familyKey, "samsung::HAFQIN");
      assert.equal(args.sourceSlug, "samsung-rf28r7351sr");
      assert.equal(args.targetSlug, "samsung-rf28r7201sr");
      return {
        clone_status: "READY_TO_DRAFT",
        blockers: [],
      } as PageFactoryEvidenceCloneReportV1;
    },
    buildQualityGate: async (args) => {
      qualityCalled = true;
      assert.equal(args.fridgeSlug, "samsung-rf28r7201sr");
      return {
        quality_classification: "NOINDEX_REVIEW",
        publication_authorized: false,
      } as PageQualityGateReportV1;
    },
    runExistingTests: () => stubTests(),
  });

  assert.equal(cloneCalled, true);
  assert.equal(qualityCalled, true);
  assert.equal(snapshot.selected_model?.fridge_slug, "samsung-rf28r7201sr");
  assert.equal(snapshot.evidence_clone.ran, true);
  assert.equal(snapshot.quality_gate.ran, true);
  assert.equal(snapshot.workflow_coverage.percent, 80);
});

test("fail closed when no eligible unregistered model remains", async () => {
  const live = buildProvenCohortPageFactoryManifestV1({ rootDir: REPO_ROOT });
  const snapshot = await buildFridgeExpansionWorkerV1({
    rootDir: REPO_ROOT,
    skipTests: true,
    buildCohort: () => ({
      ...live,
      cohort_rows: live.cohort_rows.map((row) => ({
        ...row,
        eligible_for_owner_review: false,
      })),
    }),
    runExistingTests: () => stubTests(),
  });
  assert.equal(snapshot.cycle_status, "FAIL_CLOSED");
  assert.equal(snapshot.selected_model, null);
  assert.ok(snapshot.blocked_reasons.includes("no_eligible_unintegrated_model"));
  assert.equal(fridgeExpansionWorkerSucceededV1(snapshot), false);
  assert.equal(snapshot.mutation_authorized, false);
  assert.equal(snapshot.dispatch_invoked, false);
});

test("failed generator tests fail closed without authorizing mutation", async () => {
  const snapshot = await buildFridgeExpansionWorkerV1({
    rootDir: REPO_ROOT,
    runExistingTests: () => stubTests("FAILED"),
  });
  assert.equal(snapshot.cycle_status, "FAIL_CLOSED");
  assert.ok(snapshot.blocked_reasons.includes("existing_generator_tests_failed"));
  assert.equal(snapshot.mutation_authorized, false);
  assert.equal(snapshot.dispatch_invoked, false);
});

test("write-artifacts stays under drafts and does not touch production CSVs", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "fridge-expansion-"));
  try {
    const live = await buildFridgeExpansionWorkerV1({
      rootDir: REPO_ROOT,
      skipTests: true,
      runExistingTests: () => stubTests(),
    });
    assert.ok(live.owner_review_packet);
    const written = writeFridgeExpansionWorkerDraftsV1({
      rootDir: root,
      snapshot: live,
    });
    assert.equal(written.jsonRel.startsWith(FRIDGE_EXPANSION_WORKER_ALLOWED_WRITE_PREFIX_V1), true);
    assert.ok(readFileSync(path.join(root, written.jsonRel), "utf8").includes(FRIDGE_EXPANSION_WORKER_CONTRACT_V1));
    for (const rel of FRIDGE_EXPANSION_PRODUCTION_MUTATION_PATHS_V1) {
      assert.equal(path.join(root, rel) === path.join(root, written.jsonRel), false);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("draft path validator rejects production CSV paths", () => {
  assert.throws(
    () =>
      validateFridgeExpansionDraftOutputPathV1({
        rootDir: REPO_ROOT,
        relPath: "data/fridge_models.csv",
      }),
    FridgeExpansionDraftPathErrorV1,
  );
  assert.throws(
    () =>
      validateFridgeExpansionDraftOutputPathV1({
        rootDir: REPO_ROOT,
        relPath: "data/fridge/batch-production/drafts/../page-factory-targets-v1.csv",
      }),
    FridgeExpansionDraftPathErrorV1,
  );
});

test("source files do not dispatch or apply production mutation", () => {
  const lib = readFileSync(LIB_ABS, "utf8");
  const cli = readFileSync(CLI_ABS, "utf8");
  for (const src of [lib, cli]) {
    assert.equal(src.includes("run-buckparts-command-center-dispatch"), false);
    assert.equal(src.includes("--apply"), false);
    assert.equal(src.includes("nba_authority: true"), false);
    assert.equal(src.includes("dispatch_invoked: true"), false);
    assert.equal(src.includes("mutation_authorized: true"), false);
  }
});

test("workflow coverage denominator is the current 10-step playbook", async () => {
  assert.equal(FRIDGE_EXPANSION_CURRENT_MANUAL_WORKFLOW_STEPS_V1.length, 10);
  const snapshot = await buildFridgeExpansionWorkerV1({
    rootDir: REPO_ROOT,
    skipTests: true,
    runExistingTests: () => stubTests(),
  });
  assert.equal(snapshot.workflow_coverage.denominator, 10);
  assert.equal(snapshot.workflow_coverage.percent, 50);
  assert.equal(
    snapshot.workflow_coverage.executable_count,
    snapshot.workflow_coverage.step_results.filter((row) => row.executable_this_run).length,
  );
});
