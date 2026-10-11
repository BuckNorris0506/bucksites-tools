import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { parse } from "csv-parse/sync";

type FilterRow = {
  slug: string;
  name: string;
  replacement_interval_months: string;
  notes: string;
};

type ModelRow = {
  slug: string;
  notes: string;
};

function loadCsv<T>(relativePath: string): T[] {
  const absolutePath = path.join(process.cwd(), relativePath);
  return parse(readFileSync(absolutePath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as T[];
}

test("ge-fxwpc is pleated sediment with 3-month interval — not carbon", () => {
  const filters = loadCsv<FilterRow>("data/whole-house-water/filters.csv");
  const row = filters.find((r) => r.slug === "ge-fxwpc");
  assert.ok(row);
  const blob = `${row.name} ${row.notes}`.toLowerCase();
  assert.match(blob, /sediment/);
  assert.match(blob, /pleated/);
  assert.doesNotMatch(blob, /\bcarbon filter\b/);
  assert.equal(row.replacement_interval_months, "3");
});

test("ge-fxwtc remains the carbon SKU", () => {
  const filters = loadCsv<FilterRow>("data/whole-house-water/filters.csv");
  const row = filters.find((r) => r.slug === "ge-fxwtc");
  assert.ok(row);
  assert.match(`${row.name} ${row.notes}`.toLowerCase(), /carbon/);
});

test("ge-fxhtc row unchanged (6-month interval — sibling R08 scope)", () => {
  const filters = loadCsv<FilterRow>("data/whole-house-water/filters.csv");
  const row = filters.find((r) => r.slug === "ge-fxhtc");
  assert.ok(row);
  assert.equal(row.replacement_interval_months, "6");
});

test("GXWH20S notes do not describe FXWPC as carbon", () => {
  const models = loadCsv<ModelRow>("data/whole-house-water/models.csv");
  const row = models.find((r) => r.slug === "ge-whole-house-gxwh20s");
  assert.ok(row);
  const lower = row.notes.toLowerCase();
  assert.match(lower, /fxusc/);
  assert.match(lower, /fxwpc/);
  assert.match(lower, /pleated sediment/);
  assert.match(lower, /fxwtc/);
  assert.doesNotMatch(lower, /fxwpc \(carbon\)/);
  assert.ok(!/\bfxwpc\b[^.]{0,40}\bcarbon\b/.test(lower));
});
