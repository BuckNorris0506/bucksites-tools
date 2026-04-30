import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildAmazonFalseNegativeRescueStagingReport,
  runAmazonFalseNegativeRescueStaging,
} from "./stage-amazon-false-negative-rescue";

function mockAudit() {
  return async () =>
    ({
      findings: [
        {
          token: "EP-20BB",
          canonical_dp_url: "https://www.amazon.com/dp/B00310Y9KI",
          asin: "B00310Y9KI",
          db_presence: "PRESENT",
          current_state_if_present:
            "table=whole_house_water_retailer_links; browser_truth_classification=direct_buyable; gate_failure=NONE",
        },
        {
          token: "RFC-BBSA",
          canonical_dp_url: "https://www.amazon.com/dp/B000BQN6MM",
          asin: "B000BQN6MM",
          db_presence: "ABSENT",
          current_state_if_present: null,
        },
        {
          token: "AP810",
          canonical_dp_url: "https://www.amazon.com/dp/B000W0TTJQ",
          asin: "B000W0TTJQ",
          db_presence: "ABSENT",
          current_state_if_present: null,
        },
      ],
      known_unknowns: [],
    }) as never;
}

test("EP-20BB becomes NOOP if present/direct_buyable", async () => {
  const report = await buildAmazonFalseNegativeRescueStagingReport({
    runAudit: mockAudit(),
  });
  const noop = report.noop_candidates.find((item) => item.token === "EP-20BB");
  assert.equal(Boolean(noop), true);
  assert.equal(noop?.rescue_action, "NOOP_ALREADY_PRESENT_DIRECT_BUYABLE");
});

test("RFC-BBSA/AP810 become STAGE_INSERT_CANDIDATE when absent", async () => {
  const report = await buildAmazonFalseNegativeRescueStagingReport({
    runAudit: mockAudit(),
  });
  const rfc = report.staged_candidates.find((item) => item.token === "RFC-BBSA");
  const ap810 = report.staged_candidates.find((item) => item.token === "AP810");
  assert.equal(rfc?.rescue_action, "STAGE_INSERT_CANDIDATE");
  assert.equal(ap810?.rescue_action, "STAGE_INSERT_CANDIDATE");
});

test("queue file is valid JSON", async () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "amazon-rescue-"));
  try {
    await runAmazonFalseNegativeRescueStaging({
      rootDir: tmp,
      runAudit: mockAudit(),
      writeQueueFile: true,
    });
    const out = path.join(
      tmp,
      "data/evidence/amazon-false-negative-rescue-staging.2026-04-29.json",
    );
    const parsed = JSON.parse(readFileSync(out, "utf8"));
    assert.equal(parsed.report_name, "buckparts_amazon_false_negative_rescue_staging_v1");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("no DB mutation behavior", async () => {
  const report = await buildAmazonFalseNegativeRescueStagingReport({
    runAudit: mockAudit(),
  });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("recommended_next_action says verify mappings before SQL", async () => {
  const report = await buildAmazonFalseNegativeRescueStagingReport({
    runAudit: mockAudit(),
  });
  assert.equal(/verify filter mappings/i.test(report.recommended_next_action), true);
});
