import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  manualSourcePublicTier,
  validateRefrigeratorManualEvidencePublicReady,
  type RefrigeratorManualEvidenceRecord,
} from "@/lib/manuals/refrigerator-manual-evidence";

const baseValid: RefrigeratorManualEvidenceRecord = {
  fridge_model_slug: "example-fridge-model",
  source_type: "manufacturer_support",
  source_url: "https://example.com/support/manual",
  source_title: "Owner’s manual",
  source_host: "example.com",
  evidence_date: "2026-05-05",
  filter_location_text: "Behind the lower grille.",
  replacement_steps_summary: "Twist counterclockwise to remove.",
  cautions: "Turn off water if your manual says to.",
  confidence: "high",
  extracted_by: "operator_review",
  operator_reviewed: true,
  notes: "Internal notes only.",
};

describe("refrigerator-manual-evidence", () => {
  it("manualSourcePublicTier maps source types to tiers", () => {
    assert.equal(manualSourcePublicTier("owner_manual"), 1);
    assert.equal(manualSourcePublicTier("manufacturer_support"), 1);
    assert.equal(manualSourcePublicTier("official_parts_site"), 2);
    assert.equal(manualSourcePublicTier("third_party_manual_index"), 3);
    assert.equal(manualSourcePublicTier("unknown"), 4);
  });

  it("validateRefrigeratorManualEvidencePublicReady accepts a complete valid record", () => {
    const r = validateRefrigeratorManualEvidencePublicReady(baseValid);
    assert.equal(r.ok, true);
    assert.deepEqual(r.errors, []);
  });

  it("rejects unknown source_type", () => {
    const r = validateRefrigeratorManualEvidencePublicReady({
      ...baseValid,
      source_type: "unknown",
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("source_type")));
  });

  it("rejects missing or invalid source_url", () => {
    assert.equal(
      validateRefrigeratorManualEvidencePublicReady({ ...baseValid, source_url: "" }).ok,
      false,
    );
    assert.equal(
      validateRefrigeratorManualEvidencePublicReady({ ...baseValid, source_url: "not-a-url" }).ok,
      false,
    );
  });

  it("rejects low or unknown confidence", () => {
    assert.equal(
      validateRefrigeratorManualEvidencePublicReady({ ...baseValid, confidence: "low" }).ok,
      false,
    );
    assert.equal(
      validateRefrigeratorManualEvidencePublicReady({ ...baseValid, confidence: "unknown" }).ok,
      false,
    );
  });

  it("rejects when operator_reviewed is not true", () => {
    assert.equal(
      validateRefrigeratorManualEvidencePublicReady({ ...baseValid, operator_reviewed: false }).ok,
      false,
    );
  });

  it("rejects when both location and steps are empty", () => {
    const r = validateRefrigeratorManualEvidencePublicReady({
      ...baseValid,
      filter_location_text: "",
      replacement_steps_summary: "   ",
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("filter_location_text")));
  });

  it("rejects copied_image_allowed true", () => {
    const tampered = {
      ...baseValid,
      copied_image_allowed: true,
    } as RefrigeratorManualEvidenceRecord;
    const r = validateRefrigeratorManualEvidencePublicReady(tampered);
    assert.equal(r.ok, false);
  });

  it("accepts steps-only when location empty", () => {
    const r = validateRefrigeratorManualEvidencePublicReady({
      ...baseValid,
      filter_location_text: "",
      replacement_steps_summary: "Follow housing instructions.",
    });
    assert.equal(r.ok, true);
  });
});
