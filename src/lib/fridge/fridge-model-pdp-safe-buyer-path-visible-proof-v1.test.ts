import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";

import { FridgeModelPdpVisibleProofBlock } from "@/components/fridge/FridgeModelPdpVisibleProofBlock";
import {
  FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1,
  FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_FAIL_SLUGS_V1,
  FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_PARTIAL_SLUGS_V1,
  FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_QUARANTINED_SLUGS_V1,
  FRIDGE_MODEL_PDP_VISIBLE_PROOF_COMPAT_FRAMING_V1,
  FRIDGE_MODEL_PDP_VISIBLE_PROOF_NO_UNSAFE_CTA_NOTE_V1,
  FRIDGE_MODEL_PDP_VISIBLE_PROOF_STATUS_SAFE_V1,
  FRIDGE_MODEL_PDP_VISIBLE_PROOF_SUPPRESS_NOTE_V1,
  buildFridgeModelPdpVisibleProofCopyV1,
  isFridgeModelPdpSafeBuyerPathVisibleProofSlugV1,
  shouldShowFridgeModelPdpVisibleProofBlockV1,
} from "@/lib/fridge/fridge-model-pdp-safe-buyer-path-visible-proof-v1";

const PAGE_SOURCE = readFileSync("src/app/fridge/[slug]/page.tsx", "utf8");
const COMPONENT_SOURCE = readFileSync(
  "src/components/fridge/FridgeModelPdpVisibleProofBlock.tsx",
  "utf8",
);
const LIB_SOURCE = readFileSync(
  "src/lib/fridge/fridge-model-pdp-safe-buyer-path-visible-proof-v1.ts",
  "utf8",
);

const SAMPLE_FILTERS = [
  {
    oem_part_number: "RPWFE",
    retailer_links: [{ browser_truth_checked_at: "2026-06-02T14:23:08.624Z" }],
  },
] as const;

describe("fridge-model-pdp-safe-buyer-path-visible-proof-v1", () => {
  it("allowlist is exact 21 SAFE_BUYER_PATH_PASS slugs", () => {
    assert.equal(FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1.length, 21);
    assert.ok(isFridgeModelPdpSafeBuyerPathVisibleProofSlugV1("ge-cwe23sshww"));
    assert.ok(isFridgeModelPdpSafeBuyerPathVisibleProofSlugV1("whirlpool-wrf540cwhz"));
  });

  it("gate shows only for safe allowlist with mapped filters and not quarantine", () => {
    for (const slug of FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1) {
      assert.equal(
        shouldShowFridgeModelPdpVisibleProofBlockV1({
          fridgeModelSlug: slug,
          quarantined: false,
          mappedFilterCount: 1,
        }),
        true,
        slug,
      );
    }
  });

  it("gate hides FAIL, quarantine, PARTIAL, empty filters, and quarantined flag", () => {
    for (const slug of FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_FAIL_SLUGS_V1) {
      assert.equal(
        shouldShowFridgeModelPdpVisibleProofBlockV1({
          fridgeModelSlug: slug,
          quarantined: false,
          mappedFilterCount: 1,
        }),
        false,
        `FAIL ${slug}`,
      );
    }
    for (const slug of FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_QUARANTINED_SLUGS_V1) {
      assert.equal(
        shouldShowFridgeModelPdpVisibleProofBlockV1({
          fridgeModelSlug: slug,
          quarantined: false,
          mappedFilterCount: 1,
        }),
        false,
        `quarantine ${slug}`,
      );
    }
    for (const slug of FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_PARTIAL_SLUGS_V1) {
      assert.equal(
        shouldShowFridgeModelPdpVisibleProofBlockV1({
          fridgeModelSlug: slug,
          quarantined: false,
          mappedFilterCount: 1,
        }),
        false,
        `PARTIAL ${slug}`,
      );
    }
    assert.equal(
      shouldShowFridgeModelPdpVisibleProofBlockV1({
        fridgeModelSlug: "ge-cwe23sshww",
        quarantined: true,
        mappedFilterCount: 1,
      }),
      false,
    );
    assert.equal(
      shouldShowFridgeModelPdpVisibleProofBlockV1({
        fridgeModelSlug: "ge-cwe23sshww",
        quarantined: false,
        mappedFilterCount: 0,
      }),
      false,
    );
  });

  it("copy avoids unsafe OEM overclaim and promotes suppress / no unsafe CTA language", () => {
    const copy = buildFridgeModelPdpVisibleProofCopyV1({
      partNumbers: ["RPWFE"],
      lastCheckedYyyyMmDd: "2026-06-02",
    });
    assert.equal(copy.proof_status, FRIDGE_MODEL_PDP_VISIBLE_PROOF_STATUS_SAFE_V1);
    assert.equal(copy.last_checked_label, "Last checked 2026-06-02");
    assert.equal(copy.identity_framing, FRIDGE_MODEL_PDP_VISIBLE_PROOF_COMPAT_FRAMING_V1);
    assert.equal(copy.suppress_note, FRIDGE_MODEL_PDP_VISIBLE_PROOF_SUPPRESS_NOTE_V1);
    assert.equal(copy.no_unsafe_cta_note, FRIDGE_MODEL_PDP_VISIBLE_PROOF_NO_UNSAFE_CTA_NOTE_V1);
    const blob = Object.values(copy).join("\n");
    assert.ok(!/\bOEM\b/.test(blob));
    assert.ok(!/\bgenuine OEM\b/i.test(blob));
    assert.ok(!/direct_buyable|SAFE_BUYER_PATH|search_placeholder|browser_truth/i.test(blob));
    assert.ok(/compatible replacement/i.test(blob));
    assert.ok(/suppresses buy guidance/i.test(blob));
  });
});

describe("FridgeModelPdpVisibleProofBlock", () => {
  it("renders for a safe buyer-path slug with proof status, last checked, and part number", () => {
    const html = renderToStaticMarkup(
      createElement(FridgeModelPdpVisibleProofBlock, {
        fridgeModelSlug: "ge-cwe23sshww",
        quarantined: false,
        filters: [...SAMPLE_FILTERS],
      }),
    );
    assert.ok(html.includes('data-fridge-model-pdp-visible-proof-v1="true"'));
    assert.ok(html.includes("What we checked for this model"));
    assert.ok(html.includes(FRIDGE_MODEL_PDP_VISIBLE_PROOF_STATUS_SAFE_V1));
    assert.ok(html.includes("Last checked 2026-06-02"));
    assert.ok(html.includes("Filter number(s) to compare"));
    assert.ok(html.includes("RPWFE"));
    assert.ok(html.includes(FRIDGE_MODEL_PDP_VISIBLE_PROOF_COMPAT_FRAMING_V1));
    assert.ok(html.includes(FRIDGE_MODEL_PDP_VISIBLE_PROOF_SUPPRESS_NOTE_V1));
    assert.ok(html.includes(FRIDGE_MODEL_PDP_VISIBLE_PROOF_NO_UNSAFE_CTA_NOTE_V1));
    assert.ok(!/\bOEM\b/.test(html));
    assert.ok(!html.includes("/go/"));
    assert.ok(!html.includes("Buy now"));
    assert.ok(!html.includes("application/ld+json"));
    assert.ok(!/"@type"\s*:\s*"Offer"/.test(html));
    assert.ok(!html.includes("aggregateRating"));
  });

  it("does not render for FAIL, quarantine, or PARTIAL slugs", () => {
    for (const slug of [
      ...FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_FAIL_SLUGS_V1,
      ...FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_QUARANTINED_SLUGS_V1,
      ...FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_PARTIAL_SLUGS_V1,
    ]) {
      const html = renderToStaticMarkup(
        createElement(FridgeModelPdpVisibleProofBlock, {
          fridgeModelSlug: slug,
          quarantined: false,
          filters: [...SAMPLE_FILTERS],
        }),
      );
      assert.equal(html, "", slug);
    }
  });

  it("does not render when quarantined even for a safe slug", () => {
    const html = renderToStaticMarkup(
      createElement(FridgeModelPdpVisibleProofBlock, {
        fridgeModelSlug: "samsung-rf28r7201sr",
        quarantined: true,
        filters: [...SAMPLE_FILTERS],
      }),
    );
    assert.equal(html, "");
  });

  it("source wiring does not invent Product JSON-LD offers or expand unsafe CTAs", () => {
    assert.ok(PAGE_SOURCE.includes("FridgeModelPdpVisibleProofBlock"));
    assert.ok(!PAGE_SOURCE.includes("buildRefrigeratorFilterProductJsonLd"));
    assert.ok(!PAGE_SOURCE.includes("resolveRefrigeratorFilterProductJsonLdV1"));
    assert.ok(!COMPONENT_SOURCE.includes("application/ld+json"));
    assert.ok(!/"@type"\s*:\s*"Offer"/.test(COMPONENT_SOURCE));
    assert.ok(!COMPONENT_SOURCE.includes("aggregateRating"));
    assert.ok(!COMPONENT_SOURCE.includes("/go/"));
    assert.ok(!LIB_SOURCE.includes("Buy now"));
    assert.ok(LIB_SOURCE.includes("suppresses buy guidance"));
    assert.ok(!COMPONENT_SOURCE.includes("OEM"));
  });
});
