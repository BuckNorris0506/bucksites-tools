import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

const LIVE_RETAILER_TABLES = [
  "retailer_links",
  "air_purifier_retailer_links",
  "whole_house_water_retailer_links",
  "vacuum_retailer_links",
  "humidifier_retailer_links",
  "appliance_air_retailer_links",
] as const;

test("buyable subtype migration covers every live retailer-link table", () => {
  const migrationPath = path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260430130000_retailer_links_buyable_subtype.sql",
  );
  const migration = readFileSync(migrationPath, "utf8");

  for (const table of LIVE_RETAILER_TABLES) {
    const tableBlock = migration.match(new RegExp(`ALTER TABLE public\\.${table}[\\s\\S]*?;`));
    assert.ok(tableBlock, `Expected ALTER TABLE block for ${table}`);
    assert.match(
      tableBlock[0],
      /ADD COLUMN IF NOT EXISTS browser_truth_buyable_subtype text/,
      `Expected browser_truth_buyable_subtype column add for ${table}`,
    );
  }
});

test("buyable subtype migration is additive only (no backfill/update)", () => {
  const migrationPath = path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260430130000_retailer_links_buyable_subtype.sql",
  );
  const migration = readFileSync(migrationPath, "utf8");
  assert.equal(/\bUPDATE\b/i.test(migration), false);
  assert.equal(/\bINSERT\b/i.test(migration), false);
  assert.equal(/\bDELETE\b/i.test(migration), false);
});
