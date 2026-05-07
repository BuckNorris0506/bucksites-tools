"use client";

import { useEffect } from "react";
import {
  type FridgeTrustFunnelPayload,
  trackFridgeTrustFunnelEventOnce,
} from "@/lib/analytics/fridge-trust-funnel";

export function FridgeTrustFunnelViewTracker({
  onceKey,
  payload,
}: {
  onceKey: string;
  payload: FridgeTrustFunnelPayload;
}) {
  useEffect(() => {
    trackFridgeTrustFunnelEventOnce(onceKey, payload);
  }, [onceKey, payload]);

  return null;
}
