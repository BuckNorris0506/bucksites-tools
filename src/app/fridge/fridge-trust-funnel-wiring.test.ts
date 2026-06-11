import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("fridge trust funnel wiring", () => {
  it("fridge model page wires view tracker and telemetry context", () => {
    const src = read("src/app/fridge/[slug]/page.tsx");
    assert.ok(src.includes("FridgeTrustFunnelViewTracker"));
    assert.ok(src.includes("event_name: \"fridge_model_view\""));
    assert.ok(src.includes("trust_state: reviewOverride"));
    assert.ok(src.includes("prefer_caution_buy"));
    assert.ok(src.includes("\"suppress_buy\" as const"));
    assert.ok(src.includes("is_quarantined: Boolean(reviewOverride)"));
  });

  it("fridge filter page wires view tracker and suppress/show trust state", () => {
    const src = read("src/app/filter/[slug]/page.tsx");
    assert.ok(src.includes("FridgeTrustFunnelViewTracker"));
    assert.ok(src.includes("event_name: \"fridge_filter_view\""));
    assert.ok(src.includes("trustSummary.buyer_path_state === \"suppress_buy\" ? \"suppress_buy\" : \"show_buy\""));
  });

  it("chip and filter-detail click dispatch points are wired", () => {
    const chips = read("src/components/fridge/FridgeModelConnectedFilterChips.tsx");
    const details = read("src/components/fridge/FridgeModelFilterSection.tsx");
    assert.ok(chips.includes("event_name: \"fridge_filter_chip_click\""));
    assert.ok(details.includes("event_name: \"fridge_filter_detail_click_from_model\""));
  });

  it("help-open dispatch points are wired for hero and source callout details", () => {
    const hero = read("src/components/trust/VisualReplacementMatchCard.tsx");
    const source = read("src/components/trust/ManualEvidenceCallout.tsx");
    assert.ok(hero.includes("event_name: \"fridge_help_opened\""));
    assert.ok(source.includes("event_name: \"fridge_help_opened\""));
    assert.ok(hero.includes("FridgeTrustFunnelDetails"));
    assert.ok(source.includes("FridgeTrustFunnelDetails"));
  });
});
