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
  source_type: "manufacturer_support",
  source_url:
    "https://www.lg.com/us/support/help-library/lg-refrigerator-how-to-install-your-refrigerator-water-filter--1397851693438",
  source_title: "LG Refrigerator - How to Install Your Refrigerator Water Filter",
  source_host: "www.lg.com",
  evidence_date: "2026-05-05",
  filter_location_text: "Lower or remove the top-left shelf, then open the filter cover.",
  replacement_steps_summary: "Pull down, rotate counterclockwise, replace, rotate clockwise, close cover.",
  cautions: "A small amount of water may drain. Flush after replacement.",
  confidence: "medium",
  extracted_by: "test",
  operator_reviewed: true,
  notes: "test fixture",
  copied_image_allowed: false,
  sources: [
    {
      source_type: "manufacturer_support",
      source_url:
        "https://www.lg.com/us/support/help-library/lg-refrigerator-how-to-install-your-refrigerator-water-filter--1397851693438",
      source_title: "LG support article",
      source_host: "www.lg.com",
      evidence_role: "replacement_process_guidance",
      source_tier: 1,
    },
    {
      source_type: "manufacturer_support",
      source_url:
        "https://www.lg.com/us/support/products/documents/LFXS26973-Spec-Sheet.pdf",
      source_title: "LG spec sheet",
      source_host: "www.lg.com",
      evidence_role: "filter_specification",
      source_tier: 1,
    },
  ],
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

async function loadFixtureRecord(
  fixtureName: string,
): Promise<RefrigeratorManualEvidenceRecord> {
  const fs = await import("node:fs/promises");
  const raw = await fs.readFile(`data/manual-evidence/refrigerator/${fixtureName}.json`, "utf8");
  return JSON.parse(raw) as RefrigeratorManualEvidenceRecord;
}

describe("ManualEvidenceCallout", () => {
  it("renders for a public-ready record", () => {
    const html = renderFromRecord(validRecord);
    assert.ok(html.includes("Model-specific manual evidence"));
    assert.ok(html.includes("Sources:"));
    assert.ok(html.includes("Where to look for this model"));
    assert.ok(html.includes("Replacement summary from source"));
    assert.ok(html.includes("Cautions from source"));
    assert.ok(html.includes("Tier 1"));
    assert.ok(html.includes("LG support article"));
    assert.ok(!html.toLowerCase().includes("official owner manual"));
  });

  it("does not render for an invalid record", () => {
    const html = renderFromRecord({
      ...validRecord,
      source_url: "",
      operator_reviewed: false,
    });
    assert.equal(html, "");
  });

  it("renders lrfvs3006s fixture with Tier 1 source bundle and safe language", async () => {
    const fixture = await loadFixtureRecord("lg-lrfvs3006s");
    const html = renderFromRecord(fixture);
    assert.ok(html.includes("Sources"));
    assert.ok(html.includes("Highest source tier"));
    assert.ok(html.includes("LG Refrigerator - How to Install Your Refrigerator Water Filter"));
    assert.ok(html.includes("LG LRFVS3006 Builder Spec Sheet"));
    assert.ok(!html.toLowerCase().includes("official owner manual"));
    assert.ok(!html.toLowerCase().includes("copied image"));
    assert.ok(!html.toLowerCase().includes("removes all contaminants"));
    assert.ok(!html.toLowerCase().includes("guaranteed fit"));
  });
});
