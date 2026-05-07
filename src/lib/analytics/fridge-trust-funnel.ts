"use client";

export type FridgeTrustPageType = "fridge_model" | "fridge_filter";
export type FridgeTrustState = "normal" | "quarantined" | "suppress_buy" | "show_buy";
export type FridgeTrustEventName =
  | "fridge_model_view"
  | "fridge_filter_chip_click"
  | "fridge_filter_detail_click_from_model"
  | "fridge_filter_view"
  | "fridge_help_opened";

export type FridgeTrustFunnelPayload = {
  event_name: FridgeTrustEventName;
  page_type: FridgeTrustPageType;
  page_slug: string;
  model_slug: string | null;
  filter_slug: string | null;
  trust_state: FridgeTrustState;
  source_tier_present: boolean;
  has_safe_cta: boolean;
  is_quarantined: boolean;
};

const ONCE_KEYS = new Set<string>();

export function buildFridgeTrustFunnelPayload(
  payload: FridgeTrustFunnelPayload,
): FridgeTrustFunnelPayload {
  return {
    event_name: payload.event_name,
    page_type: payload.page_type,
    page_slug: payload.page_slug,
    model_slug: payload.model_slug ?? null,
    filter_slug: payload.filter_slug ?? null,
    trust_state: payload.trust_state,
    source_tier_present: Boolean(payload.source_tier_present),
    has_safe_cta: Boolean(payload.has_safe_cta),
    is_quarantined: Boolean(payload.is_quarantined),
  };
}

function safeGtag():
  | ((type: "event", eventName: string, payload: FridgeTrustFunnelPayload) => void)
  | null {
  if (typeof window === "undefined") return null;
  const g = (window as Window & { gtag?: unknown }).gtag;
  if (typeof g !== "function") return null;
  return g as (type: "event", eventName: string, payload: FridgeTrustFunnelPayload) => void;
}

export function trackFridgeTrustFunnelEvent(payload: FridgeTrustFunnelPayload): void {
  const gtag = safeGtag();
  if (!gtag) return;
  const built = buildFridgeTrustFunnelPayload(payload);
  gtag("event", built.event_name, built);
}

export function trackFridgeTrustFunnelEventOnce(
  onceKey: string,
  payload: FridgeTrustFunnelPayload,
): void {
  if (ONCE_KEYS.has(onceKey)) return;
  ONCE_KEYS.add(onceKey);
  trackFridgeTrustFunnelEvent(payload);
}

export function trackFridgeHelpDetailsToggle(
  isOpen: boolean,
  payload: FridgeTrustFunnelPayload,
): void {
  if (!isOpen) return;
  trackFridgeTrustFunnelEvent(payload);
}

export function resetFridgeTrustFunnelOnceKeysForTests(): void {
  ONCE_KEYS.clear();
}
