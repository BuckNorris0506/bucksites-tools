import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1,
  CATALOG_COMPLETENESS_MIRROR_CONTROL_FILTER_SLUGS_V1,
  CATALOG_COMPLETENESS_MIRROR_EXPECTED_DELETE_COUNT_V1,
  CATALOG_COMPLETENESS_MIRROR_FILTER_SLUGS_V1,
  deriveCatalogCompletenessMirrorRemovalPlanFromCsvTextsV1,
  deriveCatalogCompletenessMirrorRemovalPlanFromRepoV1,
  parseCompatibilityMappingSlugPairsV1,
} from "./catalog-completeness-mirror-compat-removal-v1";
import {
  CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_GUARDED_DRY_RUN_JSON_REL_V1,
  CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_OWNER_APPROVAL_JSON_REL_V1,
  deleteCatalogCompletenessMirrorCompatRowV1,
  runCatalogCompletenessMirrorCompatRemovalGuardedApplyV1,
  type CatalogCompletenessMirrorDeleteTargetV1,
  type CatalogCompletenessMirrorProductionSnapshotV1,
  type CatalogCompletenessMirrorSupabaseV1,
} from "./catalog-completeness-mirror-compat-removal-guarded-apply-v1";

const ROOT = process.cwd();
const APPLY_SOURCE = readFileSync(
  "scripts/lib/catalog-completeness-mirror-compat-removal-guarded-apply-v1.ts",
  "utf8",
);

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

test("repo csv diff is exactly the 194 mirror-class rows, or the committed plan matches a clean tree", () => {
  const diff = execFileSync("git", ["diff", "--numstat", "--", "data/compatibility_mappings.csv"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  const planAbs = path.join(ROOT, CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1);
  if (diff.length > 0) {
    assert.equal(diff, `0\t${String(CATALOG_COMPLETENESS_MIRROR_EXPECTED_DELETE_COUNT_V1)}\tdata/compatibility_mappings.csv`);
    const derived = deriveCatalogCompletenessMirrorRemovalPlanFromRepoV1(ROOT);
    assert.equal(derived.ok, true, derived.ok ? "" : derived.errors.join("; "));
    if (!derived.ok) return;
    assert.equal(derived.plan.deletes.length, 194);
    assert.deepEqual(
      derived.plan.filter_slugs,
      [...CATALOG_COMPLETENESS_MIRROR_FILTER_SLUGS_V1],
    );
    const counts = Object.values(derived.plan.counts_by_filter).reduce((sum, n) => sum + n, 0);
    assert.equal(counts, 194);
    if (existsSync(planAbs)) {
      assert.equal(readFileSync(planAbs, "utf8"), derived.canonical_text);
    }
    return;
  }

  const plan = JSON.parse(readFileSync(planAbs, "utf8")) as {
    expected_delete_count: number;
    deletes: Array<{ fridge_slug: string; filter_slug: string; row_key: string }>;
    filter_slugs: string[];
  };
  assert.equal(plan.expected_delete_count, 194);
  assert.equal(plan.deletes.length, 194);
  assert.deepEqual(plan.filter_slugs, [...CATALOG_COMPLETENESS_MIRROR_FILTER_SLUGS_V1]);
  const working = parseCompatibilityMappingSlugPairsV1(
    readFileSync(path.join(ROOT, "data/compatibility_mappings.csv"), "utf8"),
  );
  assert.equal(working.ok, true);
  if (!working.ok) return;
  for (const row of plan.deletes) {
    assert.equal(working.pairs.has(row.row_key), false, row.row_key);
  }
});

test("derivation refuses rows outside the mirror class and ignores rows still in the working csv", () => {
  const head = [
    "fridge_slug,filter_slug",
    "whirlpool-a,4396710",
    "whirlpool-a,edr1rxd1",
  ].join("\n");
  const working = ["fridge_slug,filter_slug", "whirlpool-a,edr1rxd1"].join("\n");
  const derived = deriveCatalogCompletenessMirrorRemovalPlanFromCsvTextsV1({
    headCsv: `${head}\n`,
    workingCsv: `${working}\n`,
  });
  assert.equal(derived.ok, false);
  if (derived.ok) return;
  assert.match(derived.errors.join("\n"), /outside the mirror-defect class|expected delete count/);
});

test("guarded delete refuses an id pair outside the allowlist and never issues a filter-wide delete", async () => {
  assert.match(APPLY_SOURCE, /founderRegistryRowPassesMutationApprovalGateV1/);
  assert.match(APPLY_SOURCE, /mutation_authorized/);
  assert.doesNotMatch(APPLY_SOURCE, /prune-fridge-catalog|pruneFridgeCatalog/);
  const deleteIdx = APPLY_SOURCE.indexOf('.delete({ count: "exact" })');
  assert.ok(deleteIdx >= 0);
  const deleteWindow = APPLY_SOURCE.slice(deleteIdx, deleteIdx + 180);
  assert.match(deleteWindow, /\.eq\("fridge_model_id"/);
  assert.match(deleteWindow, /\.eq\("filter_id"/);
  assert.doesNotMatch(deleteWindow, /\.in\(/);

  const calls: string[] = [];
  const supabase = {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              return this;
            },
            in() {
              return this;
            },
            range() {
              calls.push(`${table}:select`);
              return Promise.resolve({ data: [{ fridge_model_id: "f", filter_id: "p" }], error: null });
            },
          };
        },
        delete() {
          return {
            eq() {
              return {
                eq() {
                  calls.push(`${table}:delete`);
                  return Promise.resolve({ data: [], error: null, count: 1 });
                },
              };
            },
          };
        },
      };
    },
  } as unknown as CatalogCompletenessMirrorSupabaseV1;

  const refused = await deleteCatalogCompletenessMirrorCompatRowV1({
    supabase,
    fridge_model_id: "f",
    filter_id: "p",
    allowedIdKeys: new Set(),
  });
  assert.equal(refused.ok, false);
  assert.equal(refused.error, "delete_target_outside_expected_set");
  assert.deepEqual(calls, []);
});

function controlCounts(): Record<string, number> {
  return Object.fromEntries(CATALOG_COMPLETENESS_MIRROR_CONTROL_FILTER_SLUGS_V1.map((slug) => [slug, 3]));
}

function snapshot(present: boolean): CatalogCompletenessMirrorProductionSnapshotV1 {
  const target: CatalogCompletenessMirrorDeleteTargetV1 = {
    fridge_slug: "whirlpool-wrf535swhz",
    filter_slug: "4396710",
    row_key: "whirlpool-wrf535swhz::4396710",
    fridge_model_id: "fridge-1",
    filter_id: "filter-1",
    id_key: "fridge-1::filter-1",
  };
  return {
    present_row_keys: present ? [target.row_key] : [],
    already_absent_row_keys: present ? [] : [target.row_key],
    unexpected_production_rows: [
      {
        fridge_model_id: "fridge-keep",
        filter_id: "filter-1",
        filter_slug: "4396710",
        fridge_slug: "whirlpool-kept",
      },
    ],
    delete_targets: present ? [target] : [],
    delete_targets_outside_expected_set: 0,
    ambiguous_slug_errors: [],
    control_counts: controlCounts(),
  };
}

function writeApproval(root: string, planSha: string): void {
  mkdirSync(path.join(root, "data/owner-decisions"), { recursive: true });
  writeFileSync(
    path.join(root, CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_OWNER_APPROVAL_JSON_REL_V1),
    `${JSON.stringify(
      {
        contract: "founder_decision_registry_v1",
        read_only: true,
        data_mutation: false,
        rows: [
          {
            decision_id: "decision-test-catalog-completeness-mirror-compat-removal",
            source_queue_row_id: "queue-catalog-completeness-mirror-compat-removal",
            source_decision_packet_id: "catalog_completeness_mirror_compat_removal_owner_approval_v1",
            decided_at: "2026-10-12T00:00:00.000Z",
            decision_status: "approved",
            owner_note:
              "Test fixture. Authorizes deletion of only the exact catalog-completeness mirror compatibility keys bound to the plan hash.",
            allowed_next_scope: "owner_mutation_approved",
            evidence_required_before_mutation: true,
            expires_at: "2026-10-19T00:00:00.000Z",
            prohibited_actions_still_apply: [
              "Do not run --prune-fridge-catalog.",
              "Do not delete compatibility rows outside the bound plan.",
            ],
            catalog_completeness_mirror_compat_removal_owner_approval_context_v1: {
              founder_option_id: "approve_exact_catalog_completeness_mirror_compat_removal",
              option_id: "approve_exact_catalog_completeness_mirror_compat_removal",
              plan_rel_path: CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1,
              approved_delete_count: 194,
            },
            bound_artifacts_v1: [
              {
                artifact_rel_path: CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1,
                sha256_at_binding: planSha,
                entry_type: "apply_plan",
              },
            ],
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
}

test("dry-run does not delete, and apply refuses missing authority or a drifted preflight", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mirror-removal-"));
  const plan = {
    contract: "catalog_completeness_mirror_compat_removal_plan_v1",
    read_only: true,
    data_mutation: false,
    supabase_mutation_authorized: false,
    apply_authorized: false,
    derivation: "git_diff_head_vs_working_tree:data/compatibility_mappings.csv",
    delete_scope: "exact_row_keys_present_in_head_csv_and_absent_from_working_csv",
    not_a_filter_wide_delete: true,
    not_a_missing_csv_reconciliation: true,
    head_csv_sha256: "a",
    working_csv_sha256: "b",
    expected_delete_count: 194,
    filter_slugs: [...CATALOG_COMPLETENESS_MIRROR_FILTER_SLUGS_V1],
    counts_by_filter: { "4396710": 1 },
    deletes: [
      {
        fridge_slug: "whirlpool-wrf535swhz",
        filter_slug: "4396710",
        row_key: "whirlpool-wrf535swhz::4396710",
      },
    ],
  };
  const canonical = `${JSON.stringify(plan, null, 2)}\n`;
  const planSha = sha256(canonical);
  mkdirSync(path.join(root, "data/fridge/batch-production/drafts"), { recursive: true });
  writeFileSync(path.join(root, CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1), canonical);
  const deleted: string[] = [];
  const derivePlan = () =>
    ({
      ok: true as const,
      plan,
      canonical_text: canonical,
      plan_sha256: planSha,
    }) as ReturnType<typeof deriveCatalogCompletenessMirrorRemovalPlanFromRepoV1>;

  const dry = await runCatalogCompletenessMirrorCompatRemovalGuardedApplyV1({
    rootDir: root,
    mode: "dry_run",
    writeArtifacts: true,
    now: () => new Date("2026-10-12T21:00:00.000Z"),
    env: {},
    derivePlan,
    readSnapshot: async () => ({ ok: true, snapshot: snapshot(true) }),
    deleteRow: async (target) => {
      deleted.push(target.row_key);
      return { ok: true, error: null, deleted_count: 1 };
    },
  });
  assert.equal(dry.apply_status, "DRY_RUN_READY");
  assert.equal(dry.delete_targets_outside_expected_set, 0);
  assert.equal(dry.unexpected_production_rows.length, 1);
  assert.deepEqual(deleted, []);
  assert.equal(dry.production_write_authority_status, "absent");

  const blockedApply = await runCatalogCompletenessMirrorCompatRemovalGuardedApplyV1({
    rootDir: root,
    mode: "apply",
    writeArtifacts: false,
    now: () => new Date("2026-10-12T21:00:00.000Z"),
    env: {},
    derivePlan,
    readSnapshot: async () => ({ ok: true, snapshot: snapshot(true) }),
    deleteRow: async (target) => {
      deleted.push(target.row_key);
      return { ok: true, error: null, deleted_count: 1 };
    },
  });
  assert.equal(blockedApply.apply_status, "BLOCKED");
  assert.deepEqual(deleted, []);

  writeFileSync(
    path.join(root, CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_GUARDED_DRY_RUN_JSON_REL_V1),
    `${JSON.stringify({
      plan_sha256: planSha,
      present_row_keys: ["different-key"],
      already_absent_row_keys: [],
      unexpected_production_row_keys: [],
      control_counts: controlCounts(),
      delete_targets_outside_expected_set: 0,
    })}\n`,
  );
  writeApproval(root, planSha);
  const drifted = await runCatalogCompletenessMirrorCompatRemovalGuardedApplyV1({
    rootDir: root,
    mode: "apply",
    writeArtifacts: false,
    now: () => new Date("2026-10-12T21:00:00.000Z"),
    env: {
      BUCKPARTS_IO_CAPABILITY: "MUTATION",
      BUCKPARTS_CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_MUTATION_ENABLED: "1",
    },
    derivePlan,
    readSnapshot: async () => ({ ok: true, snapshot: snapshot(true) }),
    deleteRow: async (target) => {
      deleted.push(target.row_key);
      return { ok: true, error: null, deleted_count: 1 };
    },
  });
  assert.equal(drifted.apply_status, "BLOCKED");
  assert.match(drifted.blocked_reasons.join("\n"), /differ from dry-run/);
  assert.deepEqual(deleted, []);
});

test("authorized apply deletes only the expected present key and leaves the unexpected row untouched", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mirror-removal-apply-"));
  const plan = {
    contract: "catalog_completeness_mirror_compat_removal_plan_v1",
    read_only: true,
    data_mutation: false,
    supabase_mutation_authorized: false,
    apply_authorized: false,
    derivation: "git_diff_head_vs_working_tree:data/compatibility_mappings.csv",
    delete_scope: "exact_row_keys_present_in_head_csv_and_absent_from_working_csv",
    not_a_filter_wide_delete: true,
    not_a_missing_csv_reconciliation: true,
    head_csv_sha256: "a",
    working_csv_sha256: "b",
    expected_delete_count: 194,
    filter_slugs: [...CATALOG_COMPLETENESS_MIRROR_FILTER_SLUGS_V1],
    counts_by_filter: { "4396710": 1 },
    deletes: [
      {
        fridge_slug: "whirlpool-wrf535swhz",
        filter_slug: "4396710",
        row_key: "whirlpool-wrf535swhz::4396710",
      },
    ],
  };
  const canonical = `${JSON.stringify(plan, null, 2)}\n`;
  const planSha = sha256(canonical);
  mkdirSync(path.join(root, "data/fridge/batch-production/drafts"), { recursive: true });
  writeFileSync(path.join(root, CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1), canonical);
  const before = snapshot(true);
  writeFileSync(
    path.join(root, CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_GUARDED_DRY_RUN_JSON_REL_V1),
    `${JSON.stringify({
      plan_sha256: planSha,
      present_row_keys: before.present_row_keys,
      already_absent_row_keys: before.already_absent_row_keys,
      unexpected_production_row_keys: [
        "whirlpool-kept::4396710::fridge-keep::filter-1",
      ],
      control_counts: before.control_counts,
      delete_targets_outside_expected_set: 0,
    })}\n`,
  );
  writeApproval(root, planSha);
  const deleted: string[] = [];
  let reads = 0;
  const report = await runCatalogCompletenessMirrorCompatRemovalGuardedApplyV1({
    rootDir: root,
    mode: "apply",
    writeArtifacts: false,
    now: () => new Date("2026-10-12T21:00:00.000Z"),
    env: {
      BUCKPARTS_IO_CAPABILITY: "MUTATION",
      BUCKPARTS_CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_MUTATION_ENABLED: "1",
    },
    derivePlan: () => ({
      ok: true,
      plan: plan as never,
      canonical_text: canonical,
      plan_sha256: planSha,
    }),
    readSnapshot: async () => {
      reads += 1;
      return { ok: true, snapshot: reads === 1 ? snapshot(true) : snapshot(false) };
    },
    deleteRow: async (target) => {
      deleted.push(target.id_key);
      return { ok: true, error: null, deleted_count: 1 };
    },
  });
  assert.equal(report.apply_status, "APPLIED", report.blocked_reasons.join("; "));
  assert.deepEqual(deleted, ["fridge-1::filter-1"]);
  assert.equal(report.post_write_targets_remaining, 0);
  assert.equal(report.control_counts_unchanged, true);
  assert.equal(report.delete_targets_outside_expected_set, 0);
});
