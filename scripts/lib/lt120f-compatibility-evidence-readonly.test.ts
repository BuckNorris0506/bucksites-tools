import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1 } from "@/lib/coverage/fridge-homekeep-bulk-catalog-v1";

const REPO_ROOT = process.cwd();
const EVIDENCE_PATH = path.join(
  REPO_ROOT,
  "data/evidence/lt120f-compatibility-evidence-readonly.2026-05-18.json",
);

test("lt120f compatibility evidence artifact stays read-only and not import-ready", () => {
  const raw = readFileSync(EVIDENCE_PATH, "utf8");
  assert.ok(!/data\/retailer_links\.csv/.test(raw));
  assert.ok(!/INSERT\s+INTO/i.test(raw));
  assert.ok(!raw.includes("mutation_ready\": true"));

  const doc = JSON.parse(raw) as {
    mutation_ready: boolean;
    catalog_import_ready: boolean;
    no_live_cta_change: boolean;
    data_mutation: boolean;
    slug: string;
    recommended_outcome: string;
    filter_category_proven: string;
  };

  assert.equal(doc.mutation_ready, false);
  assert.equal(doc.data_mutation, false);
  assert.equal(doc.catalog_import_ready, false);
  assert.equal(doc.no_live_cta_change, true);
  assert.equal(doc.slug, "lt120f");
  assert.equal(doc.filter_category_proven, "refrigerator_air_filter");
  assert.notEqual(doc.recommended_outcome, "ready_for_catalog_import_plan");
});

test("lt120f is not queued in refrigerator-water bulk expansion", () => {
  assert.ok(!FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1.some((r) => r.slug === "lt120f"));
});

test("lt120f evidence does not imply filters.csv or compatibility_mappings.csv edits", () => {
  const filters = readFileSync(path.join(REPO_ROOT, "data/filters.csv"), "utf8");
  const compat = readFileSync(
    path.join(REPO_ROOT, "data/compatibility_mappings.csv"),
    "utf8",
  );
  assert.ok(!/^[^,]*,lt120f,/m.test(filters));
  assert.ok(!/,(lt120f)$/m.test(compat));
});
