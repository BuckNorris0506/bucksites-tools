import assert from "node:assert/strict";
import test from "node:test";

import { buildAmazonRescueExistingWhwRowsReport } from "./report-amazon-rescue-existing-whw-rows";

test("report is read-only and includes expected fields", async () => {
  const report = await buildAmazonRescueExistingWhwRowsReport({
    now: () => new Date("2026-04-29T00:00:00.000Z"),
    fetchRows: async () => [
      {
        id: "row-1",
        whole_house_water_part_id: "3d4bfaa9-e47e-4d0f-8a70-30167f6b33da",
        retailer_key: "amazon",
        destination_url: "https://www.amazon.com/dp/B000BQN6MM",
        affiliate_url: "https://www.amazon.com/dp/B000BQN6MM",
        status: "approved",
        browser_truth_classification: "direct_buyable",
        browser_truth_notes: "note",
        browser_truth_checked_at: "2026-04-29T00:00:00.000Z",
      },
    ],
  });

  assert.equal(report.report_name, "buckparts_amazon_rescue_existing_whw_rows_v1");
  assert.equal(report.generated_at, "2026-04-29T00:00:00.000Z");
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.rows.length, 1);
  assert.equal(report.summary.total_rows, 1);
  assert.equal(report.summary.by_part_id["3d4bfaa9-e47e-4d0f-8a70-30167f6b33da"], 1);
  assert.equal(report.summary.by_part_id["f6c835ee-8ac4-4a06-a0b3-efa03e4f0667"], 0);
  assert.equal(report.summary.approved_rows, 1);
  assert.deepEqual(report.known_unknowns, []);
});

test("read failure is surfaced as known unknown", async () => {
  const report = await buildAmazonRescueExistingWhwRowsReport({
    fetchRows: async () => {
      throw new Error("boom");
    },
  });
  assert.equal(report.rows.length, 0);
  assert.equal(report.summary.total_rows, 0);
  assert.equal(report.known_unknowns.length, 1);
  assert.match(report.known_unknowns[0] ?? "", /Failed to read whole_house_water_retailer_links/i);
});
