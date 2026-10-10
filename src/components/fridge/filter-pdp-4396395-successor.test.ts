import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { FilterPdpLegacySuccessorSection } from "@/components/fridge/FilterPdpLegacySuccessorSection";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import {
  WHIRLPOOL_4396395_SUCCESSOR_BODY_PARAGRAPHS,
  WHIRLPOOL_4396395_SUCCESSOR_EVIDENCE_REL_PATH,
  WHIRLPOOL_FILTER4_SUCCESSOR_SLUG,
} from "@/lib/fridge/fridge-filter-4396395-successor-v1";
import { BUCKPARTS_VERIFIED_LINK_NONE_YET } from "@/lib/copy/buckparts-verified-link-copy";
import type { PartTrustSummary } from "@/lib/trust/part-trust";

function sha256File(relPath: string): string {
  const abs = join(process.cwd(), relPath);
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function countCompatRows(filterSlug: string): number {
  const csv = readFileSync(join(process.cwd(), "data/compatibility_mappings.csv"), "utf8");
  return csv.split("\n").filter((line) => line.endsWith(`,${filterSlug}`)).length;
}

describe("4396395 Filter 4 successor PDP (Phase 20B)", () => {
  it("renders legacy part, successor, fit caveat, and internal EDR4RXD1 link", () => {
    const html = renderToStaticMarkup(
      createElement(FilterPdpLegacySuccessorSection, { filterSlug: "4396395" }),
    );
    assert.ok(html.includes("4396395"));
    assert.ok(html.includes("legacy Whirlpool order number"));
    assert.ok(html.includes("EDR4RXD1"));
    assert.ok(html.includes(`href="/filter/${WHIRLPOOL_FILTER4_SUCCESSOR_SLUG}"`));
    for (const paragraph of WHIRLPOOL_4396395_SUCCESSOR_BODY_PARAGRAPHS) {
      assert.ok(html.includes(paragraph.slice(0, 40)), `missing copy: ${paragraph.slice(0, 40)}`);
    }
    assert.ok(html.includes("does not prove that every refrigerator listed below"));
  });

  it("does not render successor block on other filter slugs", () => {
    const html = renderToStaticMarkup(
      createElement(FilterPdpLegacySuccessorSection, { filterSlug: "4396710" }),
    );
    assert.equal(html, "");
  });

  it("suppress path shows no Verified Link /go on 4396395-style buy section", () => {
    const trust: PartTrustSummary = {
      match_confidence: "high",
      match_basis: "compatibility_mapping",
      oem_or_compatible: "oem",
      compatible_risk_level: "low",
      evidence_notes: [],
      requires_manual_verification: false,
      approved_retailer_links: 0,
      preferred_winner_link: null,
      replacement_reasoning_summary: "",
      buyer_path_state: "suppress_buy",
    };
    const html = renderToStaticMarkup(
      createElement(TrustAwareBuySection, {
        trust,
        links: [],
        goBase: "/go",
        primaryCtaLabel: "Buy at",
        suppressMessage: BUCKPARTS_VERIFIED_LINK_NONE_YET,
      }),
    );
    assert.ok(!html.includes('href="/go/'));
    assert.ok(html.includes(BUCKPARTS_VERIFIED_LINK_NONE_YET));
    assert.ok(!/waterdrop/i.test(html));
    assert.ok(!/ukf8001/i.test(html));
  });

  it("successor copy avoids banned OEM public label", () => {
    const html = renderToStaticMarkup(
      createElement(FilterPdpLegacySuccessorSection, { filterSlug: "4396395" }),
    );
    assert.ok(!/\bOEM\b/i.test(html));
  });

  it("preserves compatibility_mappings.csv row counts for 4396395 and edr4rxd1", () => {
    assert.equal(countCompatRows("4396395"), 16);
    assert.equal(countCompatRows("edr4rxd1"), 21);
  });

  it("does not add 4396395 alias rows beyond self-alias", () => {
    const aliases = readFileSync(join(process.cwd(), "data/filter_aliases.csv"), "utf8");
    const rows = aliases
      .split("\n")
      .filter((line) => line.startsWith("4396395,") || line.includes(",4396395"));
    assert.deepEqual(rows, ["4396395,4396395"]);
  });

  it("records durable supersession evidence artifact", () => {
    const raw = readFileSync(join(process.cwd(), WHIRLPOOL_4396395_SUCCESSOR_EVIDENCE_REL_PATH), "utf8");
    const doc = JSON.parse(raw) as { legacy_part_number: string; documented_successor_product: string };
    assert.equal(doc.legacy_part_number, "4396395");
    assert.equal(doc.documented_successor_product, "EDR4RXD1");
    assert.ok(doc);
    void sha256File(WHIRLPOOL_4396395_SUCCESSOR_EVIDENCE_REL_PATH);
  });
});
