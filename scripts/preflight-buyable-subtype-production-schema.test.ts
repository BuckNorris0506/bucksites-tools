import assert from "node:assert/strict";
import test from "node:test";

import { buildBuyableSubtypeProductionSchemaPreflightReport } from "./preflight-buyable-subtype-production-schema";

test("passes when required column exists on all live tables", async () => {
  const report = await buildBuyableSubtypeProductionSchemaPreflightReport({
    now: () => new Date("2026-04-30T00:00:00.000Z"),
    checkColumnExists: async () => ({ exists: true, error_summary: null }),
  });

  assert.equal(report.report_name, "buckparts_buyable_subtype_production_schema_preflight_v1");
  assert.equal(report.generated_at, "2026-04-30T00:00:00.000Z");
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.checks.length, 6);
  assert.equal(report.all_tables_ready, true);
  assert.equal(report.subtype_row_updates_allowed_next, true);
});

test("fails when migration is missing for any table", async () => {
  const missingTable = "retailer_links";
  const report = await buildBuyableSubtypeProductionSchemaPreflightReport({
    checkColumnExists: async (table) => {
      if (table === missingTable) {
        return {
          exists: false,
          error_summary: 'column "browser_truth_buyable_subtype" does not exist',
        };
      }
      return { exists: true, error_summary: null };
    },
  });

  assert.equal(report.all_tables_ready, false);
  assert.equal(report.subtype_row_updates_allowed_next, false);
  assert.equal(/do not continue to subtype row updates/i.test(report.recommended_next_action), true);
  const failed = report.checks.find((c) => c.table === missingTable);
  assert.equal(failed?.exists, false);
});
