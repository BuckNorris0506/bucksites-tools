import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFridgeTrustFunnelPayload,
  resetFridgeTrustFunnelOnceKeysForTests,
  trackFridgeHelpDetailsToggle,
  trackFridgeTrustFunnelEvent,
  trackFridgeTrustFunnelEventOnce,
  type FridgeTrustFunnelPayload,
} from "@/lib/analytics/fridge-trust-funnel";

function samplePayload(
  over: Partial<FridgeTrustFunnelPayload> = {},
): FridgeTrustFunnelPayload {
  return {
    event_name: "fridge_model_view",
    page_type: "fridge_model",
    page_slug: "lg-lfxs26973s",
    model_slug: "lg-lfxs26973s",
    filter_slug: null,
    trust_state: "normal",
    source_tier_present: true,
    has_safe_cta: true,
    is_quarantined: false,
    ...over,
  };
}

describe("fridge trust funnel analytics helper", () => {
  it("buildFridgeTrustFunnelPayload preserves exact required keys", () => {
    const payload = buildFridgeTrustFunnelPayload(samplePayload());
    assert.deepEqual(Object.keys(payload).sort(), [
      "event_name",
      "filter_slug",
      "has_safe_cta",
      "is_quarantined",
      "model_slug",
      "page_slug",
      "page_type",
      "source_tier_present",
      "trust_state",
    ]);
  });

  it("no-ops safely when window.gtag is missing", () => {
    const prevWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = {};
    assert.doesNotThrow(() => trackFridgeTrustFunnelEvent(samplePayload()));
    (globalThis as { window?: unknown }).window = prevWindow;
  });

  it("dispatches gtag event with expected event name and payload", () => {
    const prevWindow = (globalThis as { window?: unknown }).window;
    let seen:
      | { type: string; eventName: string; payload: FridgeTrustFunnelPayload }
      | undefined;
    (globalThis as { window?: unknown }).window = {
      gtag: (type: string, eventName: string, payload: FridgeTrustFunnelPayload) => {
        seen = { type, eventName, payload };
      },
    };

    const payload = samplePayload({
      event_name: "fridge_filter_chip_click",
      filter_slug: "lt1000p",
    });
    trackFridgeTrustFunnelEvent(payload);

    assert.ok(seen);
    assert.equal(seen?.type, "event");
    assert.equal(seen?.eventName, "fridge_filter_chip_click");
    assert.equal(seen?.payload.event_name, "fridge_filter_chip_click");
    assert.equal(seen?.payload.filter_slug, "lt1000p");
    assert.equal((seen?.payload as { user_agent?: string }).user_agent, undefined);
    assert.equal((seen?.payload as { referrer?: string }).referrer, undefined);
    assert.equal((seen?.payload as { raw_query?: string }).raw_query, undefined);

    (globalThis as { window?: unknown }).window = prevWindow;
  });

  it("once helper dispatches only once for the same key", () => {
    const prevWindow = (globalThis as { window?: unknown }).window;
    let count = 0;
    (globalThis as { window?: unknown }).window = {
      gtag: () => {
        count += 1;
      },
    };
    resetFridgeTrustFunnelOnceKeysForTests();
    const payload = samplePayload();
    trackFridgeTrustFunnelEventOnce("same-key", payload);
    trackFridgeTrustFunnelEventOnce("same-key", payload);
    assert.equal(count, 1);
    (globalThis as { window?: unknown }).window = prevWindow;
  });

  it("help toggle tracks only on open", () => {
    const prevWindow = (globalThis as { window?: unknown }).window;
    let count = 0;
    (globalThis as { window?: unknown }).window = {
      gtag: () => {
        count += 1;
      },
    };
    const payload = samplePayload({ event_name: "fridge_help_opened" });
    trackFridgeHelpDetailsToggle(false, payload);
    trackFridgeHelpDetailsToggle(true, payload);
    assert.equal(count, 1);
    (globalThis as { window?: unknown }).window = prevWindow;
  });
});
