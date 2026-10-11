import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { parse } from "csv-parse/sync";

type FilterRow = {
  slug: string;
  name: string;
  oem_part_number: string;
  notes: string;
};

type CompatRow = {
  model_slug: string;
  filter_slug: string;
  is_recommended: string;
};

type AliasRow = {
  model_slug: string;
  alias: string;
};

function loadCsv<T>(relativePath: string): T[] {
  const absolutePath = path.join(process.cwd(), relativePath);
  return parse(readFileSync(absolutePath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as T[];
}

function recommendedCompat(
  rows: CompatRow[],
  modelSlug: string,
  filterSlug: string,
): CompatRow | undefined {
  return rows.find(
    (row) =>
      row.model_slug === modelSlug &&
      row.filter_slug === filterSlug &&
      row.is_recommended.trim().toLowerCase() === "true",
  );
}

test("winix-hepa-115115 is Filter A identity only (no Filter H branding)", () => {
  const filters = loadCsv<FilterRow>("data/air-purifier/filters.csv");
  const row = filters.find((f) => f.slug === "winix-hepa-115115");
  assert.ok(row);
  assert.match(row!.name, /Filter A/i);
  assert.doesNotMatch(row!.name, /Filter H/i);
  assert.doesNotMatch(row!.notes, /Filter H/i);
  assert.match(row!.notes, /115115/);
});

test("winix-filter-h-116130 remains Filter H identity", () => {
  const filters = loadCsv<FilterRow>("data/air-purifier/filters.csv");
  const row = filters.find((f) => f.slug === "winix-filter-h-116130");
  assert.ok(row);
  assert.match(row!.name, /Filter H/i);
  assert.match(row!.oem_part_number, /116130/);
});

test("AM80 recommends Filter H 116130 only (not 115115)", () => {
  const compat = loadCsv<CompatRow>("data/air-purifier/compatibility_mappings.csv");
  assert.ok(recommendedCompat(compat, "winix-am80", "winix-filter-h-116130"));
  assert.equal(recommendedCompat(compat, "winix-am80", "winix-hepa-115115"), undefined);
});

test("5500-2 recommends Filter H 116130 only (not 115115)", () => {
  const compat = loadCsv<CompatRow>("data/air-purifier/compatibility_mappings.csv");
  assert.ok(recommendedCompat(compat, "winix-5500-2", "winix-filter-h-116130"));
  assert.equal(recommendedCompat(compat, "winix-5500-2", "winix-hepa-115115"), undefined);
});

test("5300-2 Filter A mapping unchanged (control for bulk remap)", () => {
  const compat = loadCsv<CompatRow>("data/air-purifier/compatibility_mappings.csv");
  assert.ok(recommendedCompat(compat, "winix-5300-2", "winix-hepa-115115"));
  assert.equal(recommendedCompat(compat, "winix-5300-2", "winix-filter-h-116130"), undefined);
});

test("5500-2 is not aliased to WINIX 5500 (distinct from legacy 5500 fit authority)", () => {
  const aliases = loadCsv<AliasRow>("data/air-purifier/model_aliases.csv");
  const bad = aliases.filter(
    (row) => row.model_slug === "winix-5500-2" && row.alias.trim().toUpperCase() === "WINIX 5500",
  );
  assert.deepEqual(bad, []);
});

test("winix-hepa-115115 recommended mapping count unchanged except AM80 and 5500-2 removals", () => {
  const compat = loadCsv<CompatRow>("data/air-purifier/compatibility_mappings.csv");
  const recommended115115 = compat.filter(
    (row) =>
      row.filter_slug === "winix-hepa-115115" &&
      row.is_recommended.trim().toLowerCase() === "true",
  );
  assert.equal(recommended115115.length, 26);
  assert.ok(recommended115115.some((row) => row.model_slug === "winix-5300-2"));
  assert.ok(!recommended115115.some((row) => row.model_slug === "winix-am80"));
  assert.ok(!recommended115115.some((row) => row.model_slug === "winix-5500-2"));
});
