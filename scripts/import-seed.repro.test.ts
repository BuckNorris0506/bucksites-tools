import assert from "node:assert/strict";
import test from "node:test";

import { __testables } from "./import-seed";

test("import-seed maps browser_truth_* fields into insert/update retailer payloads", () => {
  const row = {
    filter_slug: "da97-08006b",
    retailer_name: "AppliancePartsPros (Reseller)",
    affiliate_url: "https://www.appliancepartspros.com/samsung-assy-case-filter-da97-08006b-ap4578378.html",
    is_primary: "false",
    retailer_key: "appliancepartspros",
    retailer_slug: "appliancepartspros",
    browser_truth_classification: "direct_buyable",
    browser_truth_notes:
      "Replacement listing (reseller PDP). Exact token DA97-08006B present on PDP.",
    browser_truth_checked_at: "2026-04-26T20:01:00.000Z",
  } satisfies Record<string, string>;

  const out = __testables.buildRetailerLinkBulkOp(row, "filter-id-123");
  assert.equal(out.insertRow.browser_truth_classification, "direct_buyable");
  assert.equal(
    out.insertRow.browser_truth_notes,
    "Replacement listing (reseller PDP). Exact token DA97-08006B present on PDP.",
  );
  assert.equal(out.insertRow.browser_truth_checked_at, "2026-04-26T20:01:00.000Z");
  assert.equal(out.updateRow.browser_truth_classification, "direct_buyable");
  assert.equal(
    out.updateRow.browser_truth_notes,
    "Replacement listing (reseller PDP). Exact token DA97-08006B present on PDP.",
  );
  assert.equal(out.updateRow.browser_truth_checked_at, "2026-04-26T20:01:00.000Z");
});
