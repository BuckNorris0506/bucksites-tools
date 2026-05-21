import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = process.cwd();
const EVIDENCE_DIR = path.join(REPO_ROOT, "data/evidence");
const EXPANSION_EVIDENCE_SUFFIX = "-compatibility-evidence-readonly.2026-05-21.json";
const EXPANSION_SLUGS = [
  "4396702",
  "edr5rxd1",
  "adq73613404",
  "da29-00003b",
  "da97-15217b",
] as const;

function loadExpansionEvidenceFiles(): string[] {
  return readdirSync(EVIDENCE_DIR)
    .filter((f) => f.endsWith(EXPANSION_EVIDENCE_SUFFIX))
    .map((f) => path.join(EVIDENCE_DIR, f));
}

test("expansion evidence JSON files stay read-only and not import-ready", () => {
  const files = loadExpansionEvidenceFiles();
  assert.equal(files.length, EXPANSION_SLUGS.length);

  for (const filePath of files) {
    const raw = readFileSync(filePath, "utf8");
    assert.ok(!/data\/retailer_links\.csv/.test(raw));
    assert.ok(!/INSERT\s+INTO/i.test(raw));
    assert.ok(!raw.includes('"mutation_ready": true'));

    const doc = JSON.parse(raw) as {
      mutation_ready: boolean;
      catalog_import_ready: boolean;
      no_live_cta_change: boolean;
      data_mutation: boolean;
      slug: string;
      recommended_outcome: string;
    };

    assert.equal(doc.mutation_ready, false);
    assert.equal(doc.data_mutation, false);
    assert.equal(doc.catalog_import_ready, false);
    assert.equal(doc.no_live_cta_change, true);
    assert.notEqual(doc.recommended_outcome, "ready_for_catalog_import_plan");
    assert.ok(EXPANSION_SLUGS.includes(doc.slug as (typeof EXPANSION_SLUGS)[number]));
  }
});

test("expansion evidence does not imply filters.csv or compatibility_mappings.csv edits", () => {
  const filters = readFileSync(path.join(REPO_ROOT, "data/filters.csv"), "utf8");
  const compat = readFileSync(
    path.join(REPO_ROOT, "data/compatibility_mappings.csv"),
    "utf8",
  );
  for (const slug of EXPANSION_SLUGS) {
    assert.ok(!new RegExp(`^[^,]*,${slug},`, "m").test(filters), `${slug} must not be in filters.csv`);
    assert.ok(!new RegExp(`,${slug}$`, "m").test(compat), `${slug} must not be in compatibility_mappings.csv`);
  }
});
