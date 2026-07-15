import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  auditSupabaseServiceRoleInventoryDriftV1,
  discoverSupabaseServiceRoleWritersV1,
  fileHasSupabaseWriteOperationV1,
  SUPABASE_SERVICE_ROLE_INVENTORY_ENTRIES_V1,
} from "./buckparts-supabase-service-role-inventory-v1";

test("fileHasSupabaseWriteOperationV1 detects multiline supabase update chains", () => {
  const text = `
const supabase = getSupabaseAdmin();
await supabase
  .from("retailer_links")
  .update({ status: "approved" })
  .eq("id", id);
`;
  assert.equal(fileHasSupabaseWriteOperationV1(text), true);
});

test("discoverSupabaseServiceRoleWritersV1 includes guarded AP parity writer on repo root", () => {
  const writers = discoverSupabaseServiceRoleWritersV1({ rootDir: process.cwd() });
  assert.ok(writers.includes("scripts/lib/air-purifier-supabase-apply-parity-v1.ts"));
  assert.ok(writers.includes("scripts/lib/rpwfe-official-ge-supabase-parity-apply-v1.ts"));
});

test("auditSupabaseServiceRoleInventoryDriftV1 fails when new writer is not inventoried", () => {
  const root = mkdtempSync(path.join(tmpdir(), "sr-inventory-drift-"));
  try {
    mkdirSync(path.join(root, "scripts/lib"), { recursive: true });
    writeFileSync(
      path.join(root, "scripts/lib/supabase-admin.ts"),
      `export function getSupabaseAdmin() { return {}; }\n`,
      "utf8",
    );
    writeFileSync(
      path.join(root, "scripts/lib/new-unguarded-writer.ts"),
      `import { getSupabaseAdmin } from "./supabase-admin";
export async function run() {
  const supabase = getSupabaseAdmin();
  await supabase.from("filters").insert({ slug: "x" });
}
`,
      "utf8",
    );
    const drift = auditSupabaseServiceRoleInventoryDriftV1({ rootDir: root });
    assert.equal(drift.ok, false);
    if (!drift.ok) {
      assert.ok(
        drift.blockers.some((b) =>
          b.includes("supabase_service_role_inventory_missing:scripts/lib/new-unguarded-writer.ts"),
        ),
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("auditSupabaseServiceRoleInventoryDriftV1 passes on repo root inventory", () => {
  const drift = auditSupabaseServiceRoleInventoryDriftV1({ rootDir: process.cwd() });
  assert.equal(drift.ok, true);
  assert.ok(SUPABASE_SERVICE_ROLE_INVENTORY_ENTRIES_V1.length >= 70);
});

test("P2 search_gaps writers are write_guarded with mutation_lane", () => {
  const guarded = new Map(
    SUPABASE_SERVICE_ROLE_INVENTORY_ENTRIES_V1.filter((e) => e.access_class === "write_guarded").map(
      (e) => [e.rel_path, e.mutation_lane],
    ),
  );
  assert.equal(guarded.get("scripts/apply-search-gap-status-refrigerator.ts"), "search_gap_status_refrigerator_v1");
  assert.equal(guarded.get("scripts/apply-search-gap-status-air-purifier.ts"), "search_gap_status_air_purifier_v1");
  assert.equal(
    guarded.get("scripts/apply-search-gap-status-whole-house-water.ts"),
    "search_gap_status_whole_house_water_v1",
  );
  assert.equal(guarded.get("scripts/search-gaps-classify.ts"), "search_gaps_classify_v1");
});

test("P1 staged search-gap pipeline writers are write_guarded with mutation_lane", () => {
  const guarded = new Map(
    SUPABASE_SERVICE_ROLE_INVENTORY_ENTRIES_V1.filter((e) => e.access_class === "write_guarded").map(
      (e) => [e.rel_path, e.mutation_lane],
    ),
  );
  assert.equal(guarded.get("scripts/search-gap-candidates-generate.ts"), "search_gap_candidates_generate_v1");
  assert.equal(guarded.get("scripts/search-gap-candidates-apply.ts"), "search_gap_candidates_apply_v1");
  assert.equal(
    guarded.get("scripts/resolve-staged-compat-refrigerator.ts"),
    "staged_compat_resolve_refrigerator_v1",
  );
  assert.equal(
    guarded.get("scripts/reprocess-compat-after-models-refrigerator.ts"),
    "staged_compat_reprocess_refrigerator_v1",
  );
  assert.equal(
    guarded.get("scripts/apply-staged-compat-part-choice-refrigerator.ts"),
    "staged_compat_part_choice_refrigerator_v1",
  );
  assert.equal(
    guarded.get("scripts/apply-staged-filter-brand-refrigerator.ts"),
    "staged_filter_brand_refrigerator_v1",
  );
});

test("P0 promote-staged-refrigerator writer is write_guarded with mutation_lane", () => {
  const guarded = new Map(
    SUPABASE_SERVICE_ROLE_INVENTORY_ENTRIES_V1.filter((e) => e.access_class === "write_guarded").map(
      (e) => [e.rel_path, e.mutation_lane],
    ),
  );
  assert.equal(
    guarded.get("scripts/lib/promote-staged-refrigerator-run-v1.ts"),
    "promote_staged_refrigerator_v1",
  );
});

test("fridge guarded Supabase apply writers are write_guarded with mutation_lane", () => {
  const guarded = new Map(
    SUPABASE_SERVICE_ROLE_INVENTORY_ENTRIES_V1.filter((e) => e.access_class === "write_guarded").map(
      (e) => [e.rel_path, e.mutation_lane],
    ),
  );
  const expected: Array<[string, string]> = [
    [
      "scripts/lib/gswf-gte18gsnrss-no-filter-supabase-removal-guarded-apply-v1.ts",
      "gswf_gte18gsnrss_no_filter_supabase_removal_guarded_apply_v1",
    ],
    [
      "scripts/lib/gswf-wrong-part-repair-supabase-compat-sync-guarded-apply-v1.ts",
      "gswf_wrong_part_repair_supabase_compat_sync_guarded_apply_v1",
    ],
    [
      "scripts/lib/refrigerator-model-first-qa-batch-supabase-compat-sync-guarded-apply-v1.ts",
      "refrigerator_model_first_qa_batch_supabase_compat_sync_guarded_apply_v1",
    ],
    [
      "scripts/lib/samsung-pass-repair-supabase-compat-sync-guarded-apply-v1.ts",
      "samsung_pass_repair_supabase_compat_sync_guarded_apply_v1",
    ],
    [
      "scripts/lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply-v1.ts",
      "fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_apply_v1",
    ],
  ];
  for (const [rel, lane] of expected) {
    assert.equal(guarded.get(rel), lane, rel);
  }
  const writers = discoverSupabaseServiceRoleWritersV1({ rootDir: process.cwd() });
  for (const [rel] of expected) {
    assert.ok(writers.includes(rel), `discovered writer: ${rel}`);
  }
  const drift = auditSupabaseServiceRoleInventoryDriftV1({ rootDir: process.cwd() });
  assert.equal(drift.ok, true);
});

test("authorized GE MWFP/XWFE Supabase sync apply writer is inventoried write_guarded", () => {
  const geRel =
    "scripts/lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply-v1.ts";
  const entry = SUPABASE_SERVICE_ROLE_INVENTORY_ENTRIES_V1.find((e) => e.rel_path === geRel);
  assert.ok(entry, "GE sync apply writer must be inventoried");
  assert.equal(entry.access_class, "write_guarded");
  assert.equal(
    entry.mutation_lane,
    "fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_apply_v1",
  );
  const writers = discoverSupabaseServiceRoleWritersV1({ rootDir: process.cwd() });
  assert.ok(writers.includes(geRel));
  const drift = auditSupabaseServiceRoleInventoryDriftV1({ rootDir: process.cwd() });
  assert.equal(drift.ok, true);
});

test("path variants cannot evade service-role inventory (exact posix rel_path required)", () => {
  const root = mkdtempSync(path.join(tmpdir(), "sr-inventory-path-variant-"));
  try {
    mkdirSync(path.join(root, "scripts/lib"), { recursive: true });
    writeFileSync(
      path.join(root, "scripts/lib/supabase-admin.ts"),
      `export function getSupabaseAdmin() { return {}; }\n`,
      "utf8",
    );
    const realRel = "scripts/lib/path-variant-writer.ts";
    writeFileSync(
      path.join(root, realRel),
      `import { getSupabaseAdmin } from "./supabase-admin";
export async function run() {
  const supabase = getSupabaseAdmin();
  await supabase.from("filters").update({ slug: "x" }).eq("id", 1);
}
`,
      "utf8",
    );
    const discovered = discoverSupabaseServiceRoleWritersV1({ rootDir: root });
    assert.deepEqual(discovered, [realRel]);

    // Truncated / alternate spellings must not satisfy inventory coverage.
    const evasionRelPaths = [
      "scripts/lib/path-variant-writer",
      "./scripts/lib/path-variant-writer.ts",
      "scripts\\lib\\path-variant-writer.ts",
      "scripts/lib/path-variant-writer.ts.ts",
      "Scripts/lib/path-variant-writer.ts",
    ];
    for (const fake of evasionRelPaths) {
      assert.ok(!discovered.includes(fake), `discovered must not use variant: ${fake}`);
    }

    const drift = auditSupabaseServiceRoleInventoryDriftV1({ rootDir: root });
    assert.equal(drift.ok, false);
    if (!drift.ok) {
      assert.ok(
        drift.blockers.includes(`supabase_service_role_inventory_missing:${realRel}`),
        "exact discovered path must still be reported missing when only variants exist",
      );
      for (const fake of evasionRelPaths) {
        assert.ok(
          !drift.blockers.includes(`supabase_service_role_inventory_missing:${fake}`),
          `blocker must use canonical path, not ${fake}`,
        );
      }
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("client/public app code cannot access service-role credentials helpers", () => {
  const root = process.cwd();
  const srcRoot = path.join(root, "src");
  const publicRoot = path.join(root, "public");
  const offenders: string[] = [];
  const secretExposureRe =
    /from\s+["'].*supabase-admin["']|\bgetSupabaseAdmin\s*\(|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE|process\.env\.SUPABASE_SERVICE_ROLE_KEY/;
  const isClientModule = (text: string): boolean =>
    /^\s*["']use client["']\s*;?/.test(text);
  const checkText = (rel: string, text: string, clientOnly: boolean): void => {
    if (clientOnly && !isClientModule(text)) return;
    if (secretExposureRe.test(text)) offenders.push(rel);
  };
  const walk = (abs: string, rel: string, clientOnly: boolean): void => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const entryAbs = path.join(abs, entry.name);
      const entryRel = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) {
        walk(entryAbs, entryRel, clientOnly);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!/\.(ts|tsx|js|jsx|mjs|cjs|html|json|txt)$/.test(entry.name)) continue;
      const text = readFileSync(entryAbs, "utf8");
      checkText(entryRel, text, clientOnly);
    }
  };
  assert.equal(statSync(srcRoot).isDirectory(), true);
  walk(srcRoot, "src", true);
  if (statSync(publicRoot).isDirectory()) {
    walk(publicRoot, "public", false);
  }
  checkText("next.config.mjs", readFileSync(path.join(root, "next.config.mjs"), "utf8"), false);
  assert.deepEqual(
    offenders,
    [],
    `service-role must stay out of client/public exposure surfaces; offenders=${offenders.join(",")}`,
  );
});
