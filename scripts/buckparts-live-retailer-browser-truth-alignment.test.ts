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

const REQUIRED_COLUMNS = [
  "browser_truth_classification",
  "browser_truth_notes",
  "browser_truth_checked_at",
] as const;

test("preflight expects browser-truth columns on every live retailer-link table", () => {
  const preflightPath = path.join(ROOT, "scripts", "buckparts-schema-preflight.ts");
  const preflightText = readFileSync(preflightPath, "utf8");

  for (const table of LIVE_RETAILER_TABLES) {
    assert.match(preflightText, new RegExp(`table:\\s*"${table}"`));
    for (const col of REQUIRED_COLUMNS) {
      const tableBlockRegex = new RegExp(
        `table:\\s*"${table}"[\\s\\S]*?columns:\\s*\\[[\\s\\S]*?"${col}"`,
      );
      assert.match(
        preflightText,
        tableBlockRegex,
        `Expected ${col} for ${table} in buckparts-schema-preflight.ts`,
      );
    }
  }
});

test("migration includes browser-truth columns for every live retailer-link table", () => {
  const migrationPath = path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260428235000_live_retailer_links_browser_truth_columns.sql",
  );
  const migration = readFileSync(migrationPath, "utf8");

  for (const table of LIVE_RETAILER_TABLES) {
    const tableBlockMatch = migration.match(
      new RegExp(
        `ALTER TABLE public\\.${table}[\\s\\S]*?;`,
      ),
    );
    assert.ok(tableBlockMatch, `Expected ALTER TABLE block for ${table}`);
    const tableBlock = tableBlockMatch[0];
    for (const col of REQUIRED_COLUMNS) {
      assert.match(
        tableBlock,
        new RegExp(`ADD COLUMN IF NOT EXISTS ${col}\\s+(text|timestamptz)`),
        `Expected ${col} to be added for ${table}`,
      );
    }
  }
});
