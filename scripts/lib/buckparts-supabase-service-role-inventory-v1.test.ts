import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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
