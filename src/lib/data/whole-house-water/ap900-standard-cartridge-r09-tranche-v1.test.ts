import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { parse } from "csv-parse/sync";

type FilterRow = {
  slug: string;
  name: string;
  notes: string;
  oem_part_number: string;
  replacement_interval_months: string;
};

type ModelRow = {
  slug: string;
  notes: string;
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

const UNRELATED_3M_COMPAT_SNAPSHOT: CompatRow[] = [
  { model_slug: "3m-aquapure-ap801", filter_slug: "3m-ap810", is_recommended: "true" },
  { model_slug: "3m-aquapure-ap802", filter_slug: "3m-ap810", is_recommended: "true" },
  { model_slug: "3m-aquapure-ap802", filter_slug: "3m-ap811", is_recommended: "true" },
];

test("AP903 model notes describe single-cartridge AP917HD only", () => {
  const models = loadCsv<ModelRow>("data/whole-house-water/models.csv");
  const row = models.find((r) => r.slug === "3m-aquapure-ap903");
  assert.ok(row);
  const lower = row.notes.toLowerCase();
  assert.match(lower, /single-cartridge|single cartridge/);
  assert.match(lower, /ap917hd/);
  assert.doesNotMatch(lower, /dual/);
  assert.doesNotMatch(lower, /ap910r/);
  assert.doesNotMatch(lower, /ap917hd-s/);
});

test("AP903 recommends AP917HD only", () => {
  const mappings = loadCsv<CompatRow>("data/whole-house-water/compatibility_mappings.csv");
  const ap903 = mappings.filter((m) => m.model_slug === "3m-aquapure-ap903");
  assert.equal(ap903.length, 1);
  assert.equal(ap903[0]!.filter_slug, "3m-ap917hd");
  assert.equal(ap903[0]!.is_recommended.trim().toLowerCase(), "true");
});

test("AP903 does not recommend AP910R or AP917HD-S", () => {
  const mappings = loadCsv<CompatRow>("data/whole-house-water/compatibility_mappings.csv");
  for (const slug of ["3m-ap910r", "3m-ap917hd-s"] as const) {
    const row = mappings.find(
      (m) => m.model_slug === "3m-aquapure-ap903" && m.filter_slug === slug,
    );
    assert.equal(row, undefined);
  }
});

test("AP910R is pleated particulate for AP902 — not carbon", () => {
  const filters = loadCsv<FilterRow>("data/whole-house-water/filters.csv");
  const row = filters.find((r) => r.slug === "3m-ap910r");
  assert.ok(row);
  assert.equal(row.oem_part_number, "AP910R");
  const blob = `${row.name} ${row.notes}`.toLowerCase();
  assert.match(blob, /pleated|particulate|sediment/);
  assert.match(blob, /ap902/);
  assert.doesNotMatch(blob, /carbon cartridge/);
  assert.ok(!/\bcarbon block\b/.test(blob.replace(/not carbon block/g, "")));
  assert.doesNotMatch(blob, /for select 3m aqua-pure ap903/);
  assert.doesNotMatch(blob, /ap903 \/ ap904 installs/);
});

test("AP917HD is AP903 OEM carbon block + pleat cartridge", () => {
  const filters = loadCsv<FilterRow>("data/whole-house-water/filters.csv");
  const row = filters.find((r) => r.slug === "3m-ap917hd");
  assert.ok(row);
  assert.equal(row.oem_part_number, "AP917HD");
  const blob = `${row.name} ${row.notes}`.toLowerCase();
  assert.match(blob, /ap903/);
  assert.match(blob, /carbon block/);
  assert.match(blob, /chlorine/);
});

test("AP917HD-S is AP904 cartridge with scale — not AP903 OEM", () => {
  const filters = loadCsv<FilterRow>("data/whole-house-water/filters.csv");
  const row = filters.find((r) => r.slug === "3m-ap917hd-s");
  assert.ok(row);
  const blob = `${row.name} ${row.notes}`.toLowerCase();
  assert.match(blob, /ap904/);
  assert.match(blob, /scale/);
  assert.doesNotMatch(blob, /oem ap903 factory/i);
  assert.ok(!/\bap903\b[^.]{0,30}\boem\b/.test(blob) || blob.includes("not the ap903"));
});

test("manufacturer standard cartridge pairings (single-cartridge systems)", () => {
  const filters = loadCsv<FilterRow>("data/whole-house-water/filters.csv");
  const bySlug = new Map(filters.map((r) => [r.slug, r]));
  assert.equal(bySlug.get("3m-ap910r")!.oem_part_number, "AP910R");
  assert.equal(bySlug.get("3m-ap917hd")!.oem_part_number, "AP917HD");
  assert.equal(bySlug.get("3m-ap917hd-s")!.oem_part_number, "AP917HD-S");
});

test("unrelated 3M AP801/AP802 mappings unchanged", () => {
  const mappings = loadCsv<CompatRow>("data/whole-house-water/compatibility_mappings.csv");
  for (const expected of UNRELATED_3M_COMPAT_SNAPSHOT) {
    const row = mappings.find(
      (m) =>
        m.model_slug === expected.model_slug && m.filter_slug === expected.filter_slug,
    );
    assert.ok(row, `missing ${expected.model_slug} → ${expected.filter_slug}`);
    assert.equal(
      row.is_recommended.trim().toLowerCase(),
      expected.is_recommended.trim().toLowerCase(),
    );
  }
});
