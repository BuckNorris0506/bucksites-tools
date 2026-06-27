import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildFilterPdpRepoEvidencePaths,
  repoEvidencePathsFromBrowserTruthNotes,
} from "./filter-pdp-repo-evidence";

describe("filter-pdp-repo-evidence", () => {
  test("extracts json paths from browser truth notes", () => {
    const paths = repoEvidencePathsFromBrowserTruthNotes(
      "browser evidence data/fridge/batch-production/rpwfe-rescue/rpwfe-official-ge-browser-evidence-v1.json",
    );
    assert.deepEqual(paths, [
      "data/fridge/batch-production/rpwfe-rescue/rpwfe-official-ge-browser-evidence-v1.json",
    ]);
  });

  test("merges census evidence files with note-derived paths", () => {
    const paths = buildFilterPdpRepoEvidencePaths({
      censusEvidenceFiles: ["data/evidence/amazon-edr4rxd1-oem-pdp-evidence.2026-05-04.json"],
      retailerLinks: [
        {
          id: "1",
          retailer_name: "GE",
          affiliate_url: "https://example.com",
          retailer_key: "oem-parts-catalog",
          browser_truth_classification: "direct_buyable",
          browser_truth_notes:
            "proof data/fridge/batch-production/rpwfe-rescue/rpwfe-official-ge-browser-evidence-v1.json",
          browser_truth_checked_at: "2026-06-02T14:23:08.624Z",
          is_primary: true,
        },
      ],
    });
    assert.ok(paths.length >= 2);
  });
});
