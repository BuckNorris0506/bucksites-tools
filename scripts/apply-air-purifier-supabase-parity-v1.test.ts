import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import type { AirPurifierApplyPlannerReportV1, ApPlannedChangeV1 } from "./lib/air-purifier-apply-planner-v1";
import {
  AIR_PURIFIER_APPLY_PLANNER_BATCH_V2_REPORT_NAME_V1,
  AP_SUPABASE_PARITY_DEFAULT_BATCH_V2_PLAN_PATH_V1,
  AP_SUPABASE_PARITY_UPDATE_FIELDS_V1,
  buildSupabaseUpdatePatchFromAfterRowV1,
  dbRowMatchesBeforeRowForParityV1,
  dbRowMatchesPlanSnapshotV1,
  gateFailureForProjectedRowV1,
  isSlugAllowedByParityPlanV1,
  planAllowedSlugsV1,
  runAirPurifierSupabaseParityV1,
  validateApSupabaseParityPlanV1,
  type ApDbRetailerLinkRowV1,
  type ApSupabaseParityDepsV1,
} from "./lib/air-purifier-supabase-apply-parity-v1";
import { bindArtifactsAtHashesV1 } from "./lib/truth-ledger-v1";

const REPO_ROOT = process.cwd();
const FIXTURE_PLAN_REL = "fixture-plan.json";

function writeTrustCurrencyClearFixture(root: string, referenceTime: Date): void {
  const dir = path.join(root, "data/truth-integrity");
  mkdirSync(dir, { recursive: true });
  const nextReAudit = new Date(referenceTime.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  writeFileSync(
    path.join(dir, "truth-integrity-registry-v1.json"),
    `${JSON.stringify(
      {
        contract: "truth_integrity_registry_v1",
        read_only: true,
        data_mutation: false,
        mutation_authorized: false,
        findings: [
          {
            finding_id: "fixture-truth-integrity",
            finding_code: "FIXTURE",
            title: "Fixture finding",
            status: "OPEN",
            severity: "high",
            truth_surface: "buy_path",
            summary: "fixture",
            proven_gap: "fixture",
            false_safety_risk: "fixture",
            smallest_safe_fix: "fixture",
            re_audit: {
              next_re_audit_after: nextReAudit,
              last_re_audit_at: referenceTime.toISOString(),
              cadence_days: 30,
              re_audit_owner: "test",
            },
            validation_commands: { prove_gap: ["npm test"] },
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
}

function writeAuthorizedApSupabaseFixtureRoot(args: {
  slug: string;
  plan: AirPurifierApplyPlannerReportV1;
}): { root: string; cleanup: () => void } {
  const root = mkdtempSync(path.join(tmpdir(), "ap-supabase-parity-"));
  const referenceTime = new Date("2026-06-10T12:00:00.000Z");
  writeTrustCurrencyClearFixture(root, referenceTime);
  const planAbs = path.join(root, FIXTURE_PLAN_REL);
  writeFileSync(planAbs, `${JSON.stringify(args.plan, null, 2)}\n`, "utf8");
  const bound_artifacts_v1 = bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: [{ artifact_rel_path: FIXTURE_PLAN_REL, entry_type: "apply_plan" }],
  });
  mkdirSync(path.join(root, "data/owner-decisions"), { recursive: true });
  writeFileSync(
    path.join(root, "data/owner-decisions/ap-supabase-parity-fixture-v1.json"),
    `${JSON.stringify({
      contract: "founder_decision_registry_v1",
      rows: [
        {
          decision_id: "decision-ap-supabase-fixture",
          source_queue_row_id: "queue-ap-fixture",
          source_decision_packet_id: "packet-ap-fixture",
          decided_at: "2026-06-10T12:00:00.000Z",
          decision_status: "approved",
          owner_note: "Approve AP Supabase parity apply.",
          allowed_next_scope: "owner_mutation_approved",
          evidence_required_before_mutation: true,
          expires_at: "2027-06-01T00:00:00.000Z",
          prohibited_actions_still_apply: ["Do not apply other slugs."],
          bound_artifacts_v1,
          [`${args.slug}_apply_context_v1`]: {
            target_slug: args.slug,
            apply_plan_rel_path: FIXTURE_PLAN_REL,
          },
        },
      ],
    })}\n`,
    "utf8",
  );
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function searchSnapshot(slug: string) {
  const url = `https://levoit.com/search?q=${slug.toUpperCase()}`;
  return {
    filter_slug: slug,
    retailer_name: "OEM / manufacturer catalog (keyword lookup)",
    affiliate_url: url,
    is_primary: "true",
    retailer_key: "oem-catalog",
    retailer_slug: "oem-catalog",
    destination_url: url,
    browser_truth_classification: "",
    browser_truth_notes: "",
    browser_truth_checked_at: "",
  };
}

function pdpSnapshot(slug: string, productPath: string) {
  const url = `https://levoit.com/products/${productPath}`;
  return {
    filter_slug: slug,
    retailer_name: "OEM / manufacturer catalog (keyword lookup)",
    affiliate_url: url,
    is_primary: "true",
    retailer_key: "oem-catalog",
    retailer_slug: "oem-catalog",
    destination_url: url,
    browser_truth_classification: "direct_buyable",
    browser_truth_notes: "fixture browser proof",
    browser_truth_checked_at: "2026-05-23T05:11:38.529Z",
  };
}

function plannedChange(slug: string, productPath: string): ApPlannedChangeV1 {
  return {
    filter_slug: slug,
    retailer_key: "oem-catalog",
    packet_id: "test",
    final_url: `https://levoit.com/products/${productPath}`,
    before_row: searchSnapshot(slug),
    after_row: pdpSnapshot(slug, productPath),
    changed_fields: ["destination_url", "affiliate_url", "browser_truth_classification"],
    browser_truth_notes: "fixture browser proof",
    browser_truth_checked_at: "2026-05-23T05:11:38.529Z",
    evidence_summary: "fixture",
  };
}

function minimalPlan(changes: ApPlannedChangeV1[]): AirPurifierApplyPlannerReportV1 {
  return {
    report_name: "air_purifier_apply_planner_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-05-23T00:00:00.000Z",
    source_review_path: "test/review.json",
    plan_status: "READY_FOR_OWNER_APPROVAL",
    planned_change_count: changes.length,
    planned_changes: changes,
    refused_changes: [],
    rollback_rows: [],
    projected_coverage_delta: { direct_buyable_plus: changes.length, official_reference_plus: 0, blocked_minus: changes.length },
    owner_approval_required: true,
    apply_executor_available: false,
    recommended_next_action: "test",
    validation_checklist: [],
    notes: [],
  };
}

function dbRowFromSnapshot(
  slug: string,
  snapshot: ReturnType<typeof searchSnapshot>,
  id = `link-${slug}`,
  filterId = `filter-${slug}`,
): ApDbRetailerLinkRowV1 {
  return {
    id,
    air_purifier_filter_id: filterId,
    retailer_name: snapshot.retailer_name,
    affiliate_url: snapshot.affiliate_url,
    destination_url: snapshot.destination_url,
    retailer_slug: snapshot.retailer_slug,
    retailer_key: snapshot.retailer_key,
    is_primary: true,
    status: "approved",
    browser_truth_classification: snapshot.browser_truth_classification || null,
    browser_truth_notes: snapshot.browser_truth_notes || null,
    browser_truth_checked_at: snapshot.browser_truth_checked_at || null,
  };
}

function mockDeps(args: {
  linksBySlug: Record<string, ApDbRetailerLinkRowV1[]>;
  onUpdate?: (id: string, patch: Record<string, unknown>) => void;
}): ApSupabaseParityDepsV1 & { updateCalls: Array<{ id: string; patch: Record<string, unknown> }> } {
  const updateCalls: Array<{ id: string; patch: Record<string, unknown> }> = [];
  return {
    updateCalls,
    async resolveFilterIdBySlug(slug) {
      return `filter-${slug}`;
    },
    async fetchApprovedLinks(filterId, retailerKey) {
      const slug = filterId.replace(/^filter-/, "");
      return (args.linksBySlug[slug] ?? []).filter(
        (l) => l.retailer_key === retailerKey && l.status === "approved",
      );
    },
    async updateApprovedLink(id, patch) {
      updateCalls.push({ id, patch });
      args.onUpdate?.(id, patch);
    },
  };
}

test("buildSupabaseUpdatePatchFromAfterRow includes browser_truth fields", () => {
  const patch = buildSupabaseUpdatePatchFromAfterRowV1(
    pdpSnapshot("levoit-rf-lv-h133", "lv-h133-air-purifier-tower-replacement-filter"),
  );
  for (const field of AP_SUPABASE_PARITY_UPDATE_FIELDS_V1) {
    assert.ok(field in patch, field);
  }
  assert.equal(patch.browser_truth_classification, "direct_buyable");
  assert.equal(patch.browser_truth_notes, "fixture browser proof");
  assert.equal(patch.browser_truth_checked_at, "2026-05-23T05:11:38.529Z");
  assert.equal("status" in patch, false);
  assert.equal("id" in patch, false);
});

test("projected after row passes direct_buyable gate inputs", () => {
  const patch = buildSupabaseUpdatePatchFromAfterRowV1(
    pdpSnapshot("levoit-vital100-rf", "vital100-air-purifier-replacement-filter"),
  );
  assert.equal(gateFailureForProjectedRowV1(patch), null);
});

test("refuses ambiguous approved rows", async () => {
  const slug = "levoit-rf-lv-h133";
  const deps = mockDeps({
    linksBySlug: {
      [slug]: [
        dbRowFromSnapshot(slug, searchSnapshot(slug), "a"),
        dbRowFromSnapshot(slug, searchSnapshot(slug), "b"),
      ],
    },
  });
  const plan = minimalPlan([plannedChange(slug, "lv-h133-air-purifier-tower-replacement-filter")]);
  const report = await runAirPurifierSupabaseParityV1({
    rootDir: REPO_ROOT,
    mode: "dry_run",
    planPath: "fixture-plan.json",
    deps,
    readText: () => JSON.stringify(plan),
  });
  assert.equal(report.apply_status, "BLOCKED");
  assert.ok(report.blocked_reasons.some((r) => r.includes("multiple approved rows")));
  assert.equal(deps.updateCalls.length, 0);
});

test("refuses missing approved row", async () => {
  const slug = "levoit-rf-lv-h128";
  const deps = mockDeps({ linksBySlug: { [slug]: [] } });
  const plan = minimalPlan([plannedChange(slug, "lv-h128-replacement-filter")]);
  const report = await runAirPurifierSupabaseParityV1({
    rootDir: REPO_ROOT,
    mode: "dry_run",
    planPath: "fixture-plan.json",
    deps,
    readText: () => JSON.stringify(plan),
  });
  assert.equal(report.apply_status, "BLOCKED");
  assert.ok(report.blocked_reasons.some((r) => r.includes("zero approved")));
});

test("exact one-row-per-target matching uses filter_id + retailer_key", async () => {
  const slug = "levoit-vital100-rf";
  const before = searchSnapshot(slug);
  const deps = mockDeps({
    linksBySlug: {
      [slug]: [dbRowFromSnapshot(slug, before)],
    },
  });
  const plan = minimalPlan([plannedChange(slug, "vital100-air-purifier-replacement-filter")]);
  const report = await runAirPurifierSupabaseParityV1({
    rootDir: REPO_ROOT,
    mode: "dry_run",
    planPath: "fixture-plan.json",
    deps,
    readText: () => JSON.stringify(plan),
  });
  assert.equal(report.apply_status, "DRY_RUN_READY");
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0]!.match_mode, "before_row");
  assert.equal(report.rows[0]!.link_id, `link-${slug}`);
  assert.equal(report.rows[0]!.would_update, true);
});

test("dry-run does not write", async () => {
  const slug = "levoit-rf-lv-h133";
  const deps = mockDeps({
    linksBySlug: { [slug]: [dbRowFromSnapshot(slug, searchSnapshot(slug))] },
  });
  const plan = minimalPlan([plannedChange(slug, "lv-h133-air-purifier-tower-replacement-filter")]);
  const report = await runAirPurifierSupabaseParityV1({
    rootDir: REPO_ROOT,
    mode: "dry_run",
    planPath: "fixture-plan.json",
    deps,
    readText: () => JSON.stringify(plan),
  });
  assert.equal(report.data_mutation, false);
  assert.equal(deps.updateCalls.length, 0);
  assert.equal(report.apply_status, "DRY_RUN_READY");
});

test("apply without founder approval is BLOCKED", async () => {
  const slug = "levoit-rf-lv-h128";
  const deps = mockDeps({
    linksBySlug: { [slug]: [dbRowFromSnapshot(slug, searchSnapshot(slug))] },
  });
  const plan = minimalPlan([plannedChange(slug, "lv-h128-replacement-filter")]);
  const report = await runAirPurifierSupabaseParityV1({
    rootDir: REPO_ROOT,
    mode: "apply",
    planPath: FIXTURE_PLAN_REL,
    io_capability: "MUTATION",
    deps,
    readText: () => JSON.stringify(plan),
  });
  assert.equal(report.apply_status, "BLOCKED");
  assert.equal(report.mutation_authorized, false);
  assert.ok(
    report.mutation_preflight_blockers.includes(
      "founder_owner_mutation_approved_missing_or_inactive",
    ),
  );
  assert.equal(deps.updateCalls.length, 0);
});

test("apply with authorized founder decision updates matched row", async () => {
  const slug = "levoit-rf-lv-h128";
  const plan = minimalPlan([plannedChange(slug, "lv-h128-replacement-filter")]);
  const { root, cleanup } = writeAuthorizedApSupabaseFixtureRoot({ slug, plan });
  try {
    const deps = mockDeps({
      linksBySlug: { [slug]: [dbRowFromSnapshot(slug, searchSnapshot(slug))] },
    });
    const report = await runAirPurifierSupabaseParityV1({
      rootDir: root,
      mode: "apply",
      planPath: FIXTURE_PLAN_REL,
      io_capability: "MUTATION",
      deps,
      now: () => new Date("2026-06-10T12:00:00.000Z"),
    });
    assert.equal(report.apply_status, "APPLIED");
    assert.equal(report.mutation_authorized, true);
    assert.equal(report.applied_change_count, 1);
    assert.equal(deps.updateCalls.length, 1);
  } finally {
    cleanup();
  }
});

test("apply updates only matched row — no insert path exists on deps", async () => {
  const slug = "levoit-rf-lv-h128";
  const plan = minimalPlan([plannedChange(slug, "lv-h128-replacement-filter")]);
  const { root, cleanup } = writeAuthorizedApSupabaseFixtureRoot({ slug, plan });
  try {
    const deps = mockDeps({
      linksBySlug: { [slug]: [dbRowFromSnapshot(slug, searchSnapshot(slug))] },
    });
    const report = await runAirPurifierSupabaseParityV1({
      rootDir: root,
      mode: "apply",
      planPath: FIXTURE_PLAN_REL,
      io_capability: "MUTATION",
      deps,
      now: () => new Date("2026-06-10T12:00:00.000Z"),
    });
    assert.equal(report.apply_status, "APPLIED");
    assert.equal(report.applied_change_count, 1);
    assert.equal(deps.updateCalls.length, 1);
    assert.equal(deps.updateCalls[0]!.id, `link-${slug}`);
    assert.equal(deps.updateCalls[0]!.patch.browser_truth_classification, "direct_buyable");
    assert.equal("insert" in deps, false);
  } finally {
    cleanup();
  }
});

test("already applied rows report ALREADY_APPLIED without update when mutation authorized", async () => {
  const slug = "levoit-vital100-rf";
  const after = pdpSnapshot(slug, "vital100-air-purifier-replacement-filter");
  const plan = minimalPlan([plannedChange(slug, "vital100-air-purifier-replacement-filter")]);
  const { root, cleanup } = writeAuthorizedApSupabaseFixtureRoot({ slug, plan });
  try {
    const deps = mockDeps({
      linksBySlug: { [slug]: [dbRowFromSnapshot(slug, after)] },
    });
    const report = await runAirPurifierSupabaseParityV1({
      rootDir: root,
      mode: "apply",
      planPath: FIXTURE_PLAN_REL,
      io_capability: "MUTATION",
      deps,
      now: () => new Date("2026-06-10T12:00:00.000Z"),
    });
    assert.equal(report.apply_status, "ALREADY_APPLIED");
    assert.equal(report.applied_change_count, 0);
    assert.equal(report.already_applied_count, 1);
    assert.equal(deps.updateCalls.length, 0);
  } finally {
    cleanup();
  }
});

test("refuses when DB row matches neither before nor after snapshot", async () => {
  const slug = "levoit-rf-lv-h133";
  const drift = searchSnapshot(slug);
  drift.affiliate_url = "https://levoit.com/search?q=DRIFT";
  const deps = mockDeps({
    linksBySlug: { [slug]: [dbRowFromSnapshot(slug, drift)] },
  });
  const plan = minimalPlan([plannedChange(slug, "lv-h133-air-purifier-tower-replacement-filter")]);
  const report = await runAirPurifierSupabaseParityV1({
    rootDir: REPO_ROOT,
    mode: "dry_run",
    planPath: "fixture-plan.json",
    deps,
    readText: () => JSON.stringify(plan),
  });
  assert.equal(report.apply_status, "BLOCKED");
  assert.ok(report.blocked_reasons.some((r) => r.includes("does not match plan before_row or after_row")));
});

test("validateApSupabaseParityPlan refuses non-oem-catalog retailer_key", () => {
  const plan = minimalPlan([
    plannedChange("levoit-rf-lv-h133", "lv-h133-air-purifier-tower-replacement-filter"),
  ]);
  plan.planned_changes[0]!.retailer_key = "amazon";
  const reasons = validateApSupabaseParityPlanV1(plan);
  assert.ok(reasons.some((r) => r.includes("retailer_key must be oem-catalog")));
});

test("before_row parity match ignores stale DB browser_truth when URLs match", () => {
  const slug = "levoit-rf-lv-h133";
  const before = searchSnapshot(slug);
  const db = dbRowFromSnapshot(slug, before);
  db.browser_truth_classification = "likely_search_results";
  db.browser_truth_notes = "URL pattern suggests search/catalog listing";
  db.browser_truth_checked_at = "2026-04-18T19:20:57.908+00:00";
  assert.ok(dbRowMatchesBeforeRowForParityV1(db, before));
});

test("dbRowMatchesPlanSnapshot compares browser_truth fields", () => {
  const snap = pdpSnapshot("levoit-rf-lv-h133", "x");
  const db = dbRowFromSnapshot("levoit-rf-lv-h133", snap);
  assert.ok(dbRowMatchesPlanSnapshotV1(db, snap));
  db.browser_truth_classification = null;
  assert.equal(dbRowMatchesPlanSnapshotV1(db, snap), false);
});

function minimalBatchV2Plan(changes: ApPlannedChangeV1[]): AirPurifierApplyPlannerReportV1 {
  return {
    ...minimalPlan(changes),
    report_name: AIR_PURIFIER_APPLY_PLANNER_BATCH_V2_REPORT_NAME_V1,
  };
}

test("live v1 parity plan validates three Levoit slugs", () => {
  const plan = JSON.parse(
    readFileSync(
      path.join(
        REPO_ROOT,
        "data/air-purifier/batch-production/apply-plans/ap-apply-plan-v1.json",
      ),
      "utf8",
    ),
  ) as AirPurifierApplyPlannerReportV1;
  const reasons = validateApSupabaseParityPlanV1(plan);
  assert.equal(reasons.length, 0);
  assert.equal(plan.planned_change_count, 3);
});

test("live batch-v2 parity plan validates exactly four planned slugs", () => {
  const plan = JSON.parse(
    readFileSync(
      path.join(REPO_ROOT, AP_SUPABASE_PARITY_DEFAULT_BATCH_V2_PLAN_PATH_V1),
      "utf8",
    ),
  ) as AirPurifierApplyPlannerReportV1;
  const reasons = validateApSupabaseParityPlanV1(plan);
  assert.equal(reasons.length, 0);
  assert.equal(plan.planned_change_count, 4);
  assert.deepEqual(planAllowedSlugsV1(plan).sort(), [
    "coway-max2-hepa",
    "gg-flt5000",
    "rabbit-biogs-minusa2",
    "winix-hepa-115115",
  ]);
  for (const slug of planAllowedSlugsV1(plan)) {
    assert.equal(isSlugAllowedByParityPlanV1(plan, slug), true);
  }
  assert.equal(isSlugAllowedByParityPlanV1(plan, "levoit-rf-lv-h133"), false);
});

test("batch-v2 plan rejects slug not present in planned_changes", () => {
  const plan = JSON.parse(
    readFileSync(
      path.join(REPO_ROOT, AP_SUPABASE_PARITY_DEFAULT_BATCH_V2_PLAN_PATH_V1),
      "utf8",
    ),
  ) as AirPurifierApplyPlannerReportV1;
  assert.equal(isSlugAllowedByParityPlanV1(plan, "levoit-rf-lv-h133"), false);
  assert.equal(isSlugAllowedByParityPlanV1(plan, "medify-ma25-rf"), false);
});

test("batch-v2 plan rejects unknown report_name", () => {
  const plan = minimalBatchV2Plan([
    plannedChange("winix-hepa-115115", "filter-a-115115"),
  ]) as AirPurifierApplyPlannerReportV1 & { report_name: string };
  plan.report_name = "not_a_real_planner";
  const reasons = validateApSupabaseParityPlanV1(plan);
  assert.ok(reasons.some((r) => r.includes("unexpected plan report_name")));
});

test("batch-v2 plan rejects non-AP target CSV file", () => {
  const plan = {
    ...minimalBatchV2Plan([plannedChange("winix-hepa-115115", "filter-a-115115")]),
    target_csv_file: "data/retailer_links.csv",
  };
  const reasons = validateApSupabaseParityPlanV1(plan);
  assert.ok(reasons.some((r) => r.includes("target_csv_file")));
});

test("batch-v2 dry-run does not write with mocked deps", async () => {
  const plan = JSON.parse(
    readFileSync(
      path.join(REPO_ROOT, AP_SUPABASE_PARITY_DEFAULT_BATCH_V2_PLAN_PATH_V1),
      "utf8",
    ),
  ) as AirPurifierApplyPlannerReportV1;
  const linksBySlug: Record<string, ApDbRetailerLinkRowV1[]> = {};
  for (const change of plan.planned_changes) {
    linksBySlug[change.filter_slug] = [
      dbRowFromSnapshot(change.filter_slug, change.before_row),
    ];
  }
  const deps = mockDeps({ linksBySlug });
  const report = await runAirPurifierSupabaseParityV1({
    rootDir: REPO_ROOT,
    mode: "dry_run",
    planPath: AP_SUPABASE_PARITY_DEFAULT_BATCH_V2_PLAN_PATH_V1,
    deps,
  });
  assert.equal(validateApSupabaseParityPlanV1(plan).length, 0);
  assert.equal(report.apply_status, "DRY_RUN_READY");
  assert.equal(report.planned_change_count, 4);
  assert.equal(report.rows.length, 4);
  assert.equal(deps.updateCalls.length, 0);
  assert.equal(report.data_mutation, false);
  for (const row of report.rows) {
    assert.equal(row.gate_after_projected, null);
    assert.equal(row.would_update, true);
  }
});

test("batch-v2 plan rejects projected row with search URL gate failure", () => {
  const change = plannedChange("winix-hepa-115115", "filter-a-115115");
  change.after_row = {
    ...change.after_row,
    affiliate_url: "https://www.winixamerica.com/search?q=WINIX-115115",
    destination_url: "https://www.winixamerica.com/search?q=WINIX-115115",
    browser_truth_classification: "direct_buyable",
  };
  const plan = minimalBatchV2Plan([change]);
  const reasons = validateApSupabaseParityPlanV1(plan);
  assert.ok(reasons.some((r) => r.includes("gate_after_projected")));
});


test("dbRowMatchesPlanSnapshot normalizes equivalent UTC browser_truth_checked_at timestamps", () => {
  assert.equal(
    dbRowMatchesPlanSnapshotV1(
      {
        affiliate_url: "https://levoit.com/products/lv-h128-replacement-filter",
        destination_url: "https://levoit.com/products/lv-h128-replacement-filter",
        retailer_name: "OEM / manufacturer catalog (keyword lookup)",
        is_primary: true,
        retailer_key: "oem-catalog",
        retailer_slug: "oem-catalog",
        status: "approved",
        browser_truth_classification: "direct_buyable",
        browser_truth_notes: "proof",
        browser_truth_checked_at: "2026-05-23T05:11:38.529+00:00",
      },
      {
        affiliate_url: "https://levoit.com/products/lv-h128-replacement-filter",
        destination_url: "https://levoit.com/products/lv-h128-replacement-filter",
        retailer_name: "OEM / manufacturer catalog (keyword lookup)",
        is_primary: true,
        retailer_key: "oem-catalog",
        retailer_slug: "oem-catalog",
        browser_truth_classification: "direct_buyable",
        browser_truth_notes: "proof",
        browser_truth_checked_at: "2026-05-23T05:11:38.529Z",
      },
    ),
    true,
  );
});
