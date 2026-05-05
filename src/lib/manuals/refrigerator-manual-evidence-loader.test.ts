import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  loadRefrigeratorManualEvidenceForModel,
  toPublicRefrigeratorManualEvidence,
} from "@/lib/manuals/refrigerator-manual-evidence-loader";
import type { RefrigeratorManualEvidenceRecord } from "@/lib/manuals/refrigerator-manual-evidence";

const validRecord: RefrigeratorManualEvidenceRecord = {
  fridge_model_slug: "lg-lfxs26973s",
  source_type: "manufacturer_support",
  source_url:
    "https://www.lg.com/us/support/help-library/lg-refrigerator-how-to-install-your-refrigerator-water-filter--1397851693438",
  source_title: "LG Refrigerator - How to Install Your Refrigerator Water Filter",
  source_host: "www.lg.com",
  evidence_date: "2026-05-05",
  filter_location_text: "Lower or remove the top-left shelf to rotate the filter down.",
  replacement_steps_summary: "Open cover, rotate old filter out, install new filter, close cover.",
  cautions: "Some water can drain during replacement; flush after install.",
  confidence: "medium",
  extracted_by: "test",
  operator_reviewed: true,
  notes: "test",
  copied_image_allowed: false,
  sources: [
    {
      source_type: "manufacturer_support",
      source_url:
        "https://www.lg.com/us/support/help-library/lg-refrigerator-how-to-install-your-refrigerator-water-filter--1397851693438",
      source_title: "LG Refrigerator - How to Install Your Refrigerator Water Filter",
      source_host: "www.lg.com",
      evidence_role: "replacement_process_guidance",
      source_tier: 1,
    },
  ],
};

describe("refrigerator-manual-evidence-loader", () => {
  it("promotes a public-ready record with tier metadata", () => {
    const out = toPublicRefrigeratorManualEvidence(validRecord);
    assert.ok(out);
    assert.equal(out.source_tier, 1);
    assert.ok(out.source_tier_label.includes("Tier 1"));
  });

  it("returns null when record is not public-ready", () => {
    const out = toPublicRefrigeratorManualEvidence({
      ...validRecord,
      source_type: "unknown",
      operator_reviewed: false,
    });
    assert.equal(out, null);
  });

  it("loads the fixture for lg-lfxs26973s", async () => {
    const out = await loadRefrigeratorManualEvidenceForModel("lg-lfxs26973s");
    assert.ok(out);
    assert.equal(out.fridge_model_slug, "lg-lfxs26973s");
    assert.equal(out.source_tier, 1);
    assert.ok(out.sources.some((s) => s.source_host === "www.lg.com"));
  });

  it("returns null for missing fixture", async () => {
    const out = await loadRefrigeratorManualEvidenceForModel("no-such-model");
    assert.equal(out, null);
  });
});
