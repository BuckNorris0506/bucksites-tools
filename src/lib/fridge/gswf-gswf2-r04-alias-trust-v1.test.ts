import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  GSWF2_FILTER_PAGE_VERIFY_HOUSING_NOTE_V1,
  GSWF_FILTER_PAGE_CAUTION_NOTE_V1,
  resolveFridgeFilterPdpCustomerSafetyV1,
} from "@/lib/fridge/fridge-filter-pdp-customer-safety-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readCsv(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function parseAliasCsv(text: string): Array<{ filter_slug: string; alias: string }> {
  const lines = text.trim().split("\n");
  const out: Array<{ filter_slug: string; alias: string }> = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    const [filter_slug, alias] = line.split(",");
    if (!filter_slug || !alias) continue;
    out.push({ filter_slug: filter_slug.trim(), alias: alias.trim() });
  }
  return out;
}

function aliasesForSlug(
  rows: Array<{ filter_slug: string; alias: string }>,
  slug: string,
): string[] {
  return rows.filter((r) => r.filter_slug === slug).map((r) => r.alias);
}

test("R04: gswf has no GSWF2 cross-alias in filter_aliases.csv", () => {
  const rows = parseAliasCsv(readCsv("data/filter_aliases.csv"));
  const gswfAliases = aliasesForSlug(rows, "gswf");
  assert.ok(gswfAliases.includes("GSWF"));
  assert.ok(!gswfAliases.includes("GSWF2"), `unexpected gswf aliases: ${gswfAliases.join(",")}`);
});

test("R04: gswf2 has no GSWF cross-alias in filter_aliases.csv", () => {
  const rows = parseAliasCsv(readCsv("data/filter_aliases.csv"));
  const gswf2Aliases = aliasesForSlug(rows, "gswf2");
  assert.ok(gswf2Aliases.includes("GSWF2"));
  assert.ok(!gswf2Aliases.includes("GSWF"), `unexpected gswf2 aliases: ${gswf2Aliases.join(",")}`);
});

test("R04: no mutual cross-token alias pair in source data", () => {
  const rows = parseAliasCsv(readCsv("data/filter_aliases.csv"));
  const hasGswfToGswf2 = rows.some((r) => r.filter_slug === "gswf" && r.alias === "GSWF2");
  const hasGswf2ToGswf = rows.some((r) => r.filter_slug === "gswf2" && r.alias === "GSWF");
  assert.equal(hasGswfToGswf2, false);
  assert.equal(hasGswf2ToGswf, false);
});

test("R04: unrelated alias rows unchanged (lt1000p sample)", () => {
  const rows = parseAliasCsv(readCsv("data/filter_aliases.csv"));
  const lt = aliasesForSlug(rows, "lt1000p");
  assert.deepEqual(lt.sort(), ["LG LT1000", "LT 1000 P", "LT1000P"].sort());
});

test("R04: shared compatibility mappings unchanged (gswf + gswf2 on three GE models)", () => {
  const text = readCsv("data/compatibility_mappings.csv");
  const lines = text.trim().split("\n").slice(1);
  const pairs = lines.map((l) => l.trim()).filter(Boolean);
  for (const model of ["ge-gfe28hmkww", "ge-gsc25frshss", "ge-gse26gshess"]) {
    assert.ok(pairs.includes(`${model},gswf`), `missing ${model},gswf`);
    assert.ok(pairs.includes(`${model},gswf2`), `missing ${model},gswf2`);
  }
});

test("R04: GSWF caution note preserved", () => {
  const safety = resolveFridgeFilterPdpCustomerSafetyV1({
    filterSlug: "gswf",
    fridgeModels: [{ slug: "ge-gfe28hmkww" }],
    gatedRetailerLinkCount: 0,
    rootDir: ROOT,
  });
  assert.match(safety.filter_page_caution_note ?? "", /reviewing GSWF compatibility/i);
  assert.ok((safety.filter_page_caution_note ?? "").includes(GSWF_FILTER_PAGE_CAUTION_NOTE_V1));
});

test("R04: GSWF2 verify-housing and non-interchange note preserved", () => {
  const safety = resolveFridgeFilterPdpCustomerSafetyV1({
    filterSlug: "gswf2",
    fridgeModels: [{ slug: "ge-gfe28hmkww" }],
    gatedRetailerLinkCount: 0,
    rootDir: ROOT,
  });
  assert.ok((safety.filter_page_caution_note ?? "").includes(GSWF_FILTER_PAGE_CAUTION_NOTE_V1));
  assert.ok((safety.filter_page_caution_note ?? "").includes(GSWF2_FILTER_PAGE_VERIFY_HOUSING_NOTE_V1));
  assert.match(safety.filter_page_caution_note ?? "", /do not assume GSWF and GSWF2 are interchangeable/i);
});
