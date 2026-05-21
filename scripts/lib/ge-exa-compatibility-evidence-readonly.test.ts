import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildLargeBatchCoverageFactoryReportV1 } from "@/lib/coverage/large-batch-coverage-factory-v1";

const REPO_ROOT = process.cwd();
const MWFA_EVIDENCE_PATH = path.join(
  REPO_ROOT,
  "data/evidence/mwfa-compatibility-evidence-readonly.2026-05-21.json",
);
const GWF06_EVIDENCE_PATH = path.join(
  REPO_ROOT,
  "data/evidence/gwf06-compatibility-evidence-readonly.2026-05-21.json",
);

type EvidenceDoc = {
  read_only: boolean;
  data_mutation: boolean;
  mutation_ready: boolean;
  catalog_import_ready: boolean;
  slug: string;
  oem_part_number: string;
  brand_slug: string;
  recommended_state: string;
  no_catalog_csv_changes_attestation: string;
};

function loadEvidence(path: string): EvidenceDoc {
  const raw = readFileSync(path, "utf8");
  assert.ok(!/INSERT\s+INTO/i.test(raw));
  assert.ok(!/"mutation_ready":\s*true/.test(raw));
  return JSON.parse(raw) as EvidenceDoc;
}

for (const [label, evidencePath, slug, oem] of [
  ["mwfa", MWFA_EVIDENCE_PATH, "mwfa", "MWFA"],
  ["gwf06", GWF06_EVIDENCE_PATH, "gwf06", "GWF06"],
] as const) {
  test(`${label} evidence artifact stays read-only and not import-ready`, () => {
    const doc = loadEvidence(evidencePath);
    assert.equal(doc.read_only, true);
    assert.equal(doc.data_mutation, false);
    assert.equal(doc.mutation_ready, false);
    assert.equal(doc.catalog_import_ready, false);
    assert.equal(doc.slug, slug);
    assert.equal(doc.oem_part_number, oem);
    assert.equal(doc.brand_slug, "ge");
    assert.equal(doc.recommended_state, "evidence_needed");
    assert.ok(doc.no_catalog_csv_changes_attestation.includes("did not modify"));
  });
}

test("mwfa and gwf06 evidence do not imply catalog CSV edits", () => {
  const filters = readFileSync(path.join(REPO_ROOT, "data/filters.csv"), "utf8");
  const compat = readFileSync(
    path.join(REPO_ROOT, "data/compatibility_mappings.csv"),
    "utf8",
  );
  const aliases = readFileSync(path.join(REPO_ROOT, "data/filter_aliases.csv"), "utf8");
  const links = readFileSync(path.join(REPO_ROOT, "data/retailer_links.csv"), "utf8");

  assert.ok(!/^ge,mwfa,/m.test(filters));
  assert.ok(!/^ge,gwf06,/m.test(filters));
  assert.ok(!/,(mwfa|gwf06)$/m.test(compat));
  assert.ok(!/\bMWFA\b/.test(aliases));
  assert.ok(!/\bGWF06\b/.test(aliases));
  assert.ok(!/^mwfa,/.test(links));
  assert.ok(!/^gwf06,/.test(links));
});

test("factory with combined Exa manifest keeps mwfa and gwf06 evidence_needed", () => {
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: REPO_ROOT,
    topCandidatesLimit: 500,
  });

  assert.equal(report.state_counts.new_product_candidate, 0);
  assert.equal(report.source_summary.exa_fridge_water_discovery.run_id, "2026-05-21-combined-review");

  for (const slug of ["mwfa", "gwf06"] as const) {
    const row = report.top_candidates.find((c) => c.slug === slug);
    assert.ok(row, `${slug} must be active in factory cohort`);
    assert.equal(row!.factory_state, "evidence_needed");
    assert.equal(row!.has_gated_buyable_link, false);
    assert.ok(
      row!.sources.some((s) => s.includes("2026-05-21-combined-review/candidates.json")),
    );
  }
});
