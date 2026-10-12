import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { parse } from "csv-parse/sync";

type FilterRow = {
  slug: string;
  replacement_interval_months: string;
};

type CompatRow = {
  model_slug: string;
  filter_slug: string;
  is_recommended: string;
};

function loadCsv<T>(relativePath: string): T[] {
  const absolutePath = path.join(process.cwd(), relativePath);
  return parse(readFileSync(absolutePath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as T[];
}

test("ge-fxhtc replacement interval is 3 months per GE OEM", () => {
  const filters = loadCsv<FilterRow>("data/whole-house-water/filters.csv");
  const row = filters.find((r) => r.slug === "ge-fxhtc");
  assert.ok(row);
  assert.equal(row.replacement_interval_months, "3");
});

test("GXWH20S does not recommend ge-fxhtc", () => {
  const mappings = loadCsv<CompatRow>("data/whole-house-water/compatibility_mappings.csv");
  const gxwh20sFxhtc = mappings.filter(
    (m) => m.model_slug === "ge-whole-house-gxwh20s" && m.filter_slug === "ge-fxhtc",
  );
  assert.equal(gxwh20sFxhtc.length, 0);
});

test("other GE models → FXHTC recommended mappings unchanged", () => {
  const mappings = loadCsv<CompatRow>("data/whole-house-water/compatibility_mappings.csv");
  const expected = [
    "ge-whole-house-gxwh30c",
    "ge-whole-house-gxwh35f",
    "ge-whole-house-gxwh40f",
  ] as const;
  for (const modelSlug of expected) {
    const row = mappings.find(
      (m) => m.model_slug === modelSlug && m.filter_slug === "ge-fxhtc",
    );
    assert.ok(row, `missing ${modelSlug} → ge-fxhtc`);
    assert.equal(row.is_recommended.trim().toLowerCase(), "true");
  }
});

test("ge-fxwpc identity invariants remain intact", () => {
  const filters = loadCsv<{ slug: string; name: string; notes: string; replacement_interval_months: string }>(
    "data/whole-house-water/filters.csv",
  );
  const fxwpc = filters.find((r) => r.slug === "ge-fxwpc");
  assert.ok(fxwpc);
  const blob = `${fxwpc.name} ${fxwpc.notes}`.toLowerCase();
  assert.match(blob, /pleated/);
  assert.match(blob, /sediment/);
  assert.equal(fxwpc.replacement_interval_months, "3");
});
