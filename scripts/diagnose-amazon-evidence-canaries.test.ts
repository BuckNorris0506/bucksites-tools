import assert from "node:assert/strict";
import test from "node:test";
import { buildOutputRows, uniqueCanonicalDpUrls } from "./diagnose-amazon-evidence-canaries";

test("uniqueCanonicalDpUrls keeps only canonical amazon dp URLs", () => {
  const urls = uniqueCanonicalDpUrls([
    "https://www.amazon.com/Pentek-355223-43-Sediment-Filter/dp/B005XTQSMM",
    "https://www.amazon.com/dp/B005XTQSMM?ref_=abc",
    "https://www.amazon.com/s?k=WP25BB20P",
    "https://example.com/dp/B005XTQSMM",
  ]);

  assert.deepEqual(urls, ["https://www.amazon.com/dp/B005XTQSMM"]);
});

test("row readiness stays false for mismatch when canary is ready", () => {
  const rows = buildOutputRows("run-1", [
    {
      canary: "refrigerator_water:da97-17376a",
      candidate_urls: [
        "https://www.amazon.com/dp/B0GKG3CLRB",
        "https://www.amazon.com/dp/B083KNLJGF",
      ],
      verdicts: [
        {
          candidate_url: "https://www.amazon.com/dp/B0GKG3CLRB",
          classification: "token_pass",
          note: "pass",
        },
        {
          candidate_url: "https://www.amazon.com/dp/B083KNLJGF",
          classification: "candidate_token_mismatch",
          note: "mismatch",
        },
      ],
      canary_ready_for_write_lane: true,
      reason: "At least one candidate passed strict exact-token evidence.",
    },
  ]);

  const mismatchRow = rows.find((r) => r.classification === "candidate_token_mismatch");
  const passRow = rows.find((r) => r.classification === "token_pass");
  assert.ok(mismatchRow);
  assert.ok(passRow);
  assert.equal(mismatchRow?.row_ready_for_write_lane, false);
  assert.equal(mismatchRow?.canary_ready_for_write_lane, true);
  assert.equal(passRow?.row_ready_for_write_lane, true);
});
