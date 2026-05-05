import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ManualEvidenceCallout } from "@/components/trust/ManualEvidenceCallout";
import {
  toPublicRefrigeratorManualEvidence,
  type PublicRefrigeratorManualEvidence,
} from "@/lib/manuals/refrigerator-manual-evidence-loader";
import type { RefrigeratorManualEvidenceRecord } from "@/lib/manuals/refrigerator-manual-evidence";

const validRecord: RefrigeratorManualEvidenceRecord = {
  fridge_model_slug: "lg-lfxs26973s",
  source_type: "third_party_manual_index",
  source_url: "https://www.manualslib.fr/manual/361273/Lg-Lfxs26973-Serie.html?page=47#manual",
  source_title: "LG LFXS26973 Series Owner's Manual (page 47, water filter replacement)",
  source_host: "manualslib.fr",
  evidence_date: "2026-05-05",
  filter_location_text: "Lower or remove the top-left shelf, then open the filter cover.",
  replacement_steps_summary: "Pull down, rotate counterclockwise, replace, rotate clockwise, close cover.",
  cautions: "A small amount of water may drain. Flush after replacement.",
  confidence: "medium",
  extracted_by: "test",
  operator_reviewed: true,
  notes: "test fixture",
  copied_image_allowed: false,
};

function renderFromRecord(record: Partial<RefrigeratorManualEvidenceRecord>): string {
  const evidence = toPublicRefrigeratorManualEvidence(record);
  if (!evidence) return "";
  return renderToStaticMarkup(
    createElement(ManualEvidenceCallout, {
      evidence: evidence as PublicRefrigeratorManualEvidence,
    }),
  );
}

describe("ManualEvidenceCallout", () => {
  it("renders for a public-ready record", () => {
    const html = renderFromRecord(validRecord);
    assert.ok(html.includes("Model-specific manual evidence"));
    assert.ok(html.includes("Where to look for this model"));
    assert.ok(html.includes("Replacement summary from source"));
    assert.ok(html.includes("Cautions from source"));
    assert.ok(html.includes("Tier 3"));
    assert.ok(html.includes("manualslib.fr"));
  });

  it("does not render for an invalid record", () => {
    const html = renderFromRecord({
      ...validRecord,
      source_url: "",
      operator_reviewed: false,
    });
    assert.equal(html, "");
  });
});
