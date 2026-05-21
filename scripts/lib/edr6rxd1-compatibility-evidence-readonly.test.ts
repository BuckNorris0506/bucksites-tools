import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  FRIDGE_HOMEKEEP_BULK_EXPANSION_DEMOTED_V1,
  FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1,
} from "@/lib/coverage/fridge-homekeep-bulk-catalog-v1";
import { buildLargeBatchCoverageFactoryReportV1 } from "@/lib/coverage/large-batch-coverage-factory-v1";

const REPO_ROOT = process.cwd();
const EVIDENCE_PATH = path.join(
  REPO_ROOT,
  "data/evidence/edr6rxd1-compatibility-evidence-readonly.2026-05-21.json",
);

test("edr6rxd1 compatibility evidence artifact stays read-only and not import-ready", () => {
  const raw = readFileSync(EVIDENCE_PATH, "utf8");
  assert.ok(!/data\/retailer_links\.csv/.test(raw));
  assert.ok(!/INSERT\s+INTO/i.test(raw));
  assert.ok(!raw.includes('"mutation_ready": true'));

  const doc = JSON.parse(raw) as {
    mutation_ready: boolean;
    catalog_import_ready: boolean;
    no_live_cta_change: boolean;
    data_mutation: boolean;
    slug: string;
    oem_part_number: string;
    recommended_outcome: string;
    filter_category_proven: string;
    proven_model_numbers: string[];
  };

  assert.equal(doc.mutation_ready, false);
  assert.equal(doc.data_mutation, false);
  assert.equal(doc.catalog_import_ready, false);
  assert.equal(doc.no_live_cta_change, true);
  assert.equal(doc.slug, "edr6rxd1");
  assert.equal(doc.oem_part_number, "EDR6RXD1");
  assert.equal(doc.filter_category_proven, "refrigerator_water_filter");
  assert.equal(doc.proven_model_numbers.length, 0);
  assert.notEqual(doc.recommended_outcome, "ready_for_catalog_import_plan");
  assert.equal(doc.recommended_outcome, "block_for_now");
});

test("edr6rxd1 evidence does not imply filters.csv or compatibility_mappings.csv edits", () => {
  const filters = readFileSync(path.join(REPO_ROOT, "data/filters.csv"), "utf8");
  const compat = readFileSync(
    path.join(REPO_ROOT, "data/compatibility_mappings.csv"),
    "utf8",
  );
  const aliases = readFileSync(path.join(REPO_ROOT, "data/filter_aliases.csv"), "utf8");

  assert.ok(!/^whirlpool,edr6rxd1,/m.test(filters));
  assert.ok(!/^whirlpool,edr6d1,/m.test(filters));
  assert.ok(!/,(edr6rxd1|edr6d1)$/m.test(compat));
  assert.ok(!/\bEDR6RXD1\b/.test(aliases));
  assert.ok(!/\bEDR6D1\b/.test(aliases));
});

test("edr6rxd1 is not in active bulk expansion queue", () => {
  assert.ok(!FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1.some((r) => r.slug === "edr6rxd1"));
  assert.ok(!FRIDGE_HOMEKEEP_BULK_EXPANSION_DEMOTED_V1.some((r) => r.slug === "edr6rxd1"));
});

test("factory Exa merge keeps edr6rxd1 evidence_needed without new_product_candidate", () => {
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: REPO_ROOT,
    topCandidatesLimit: 500,
  });
  const row = report.top_candidates.find((c) => c.slug === "edr6rxd1");
  assert.ok(row);
  assert.equal(row!.factory_state, "evidence_needed");
  assert.equal(row!.has_gated_buyable_link, false);
  assert.equal(report.state_counts.new_product_candidate, 0);
  assert.equal(report.source_summary.bulk_catalog.row_count, 57);
  assert.equal(report.source_summary.live_filters_csv.row_count, 57);
});
