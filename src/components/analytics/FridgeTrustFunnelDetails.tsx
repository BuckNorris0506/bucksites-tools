"use client";

import React from "react";
import type { ReactNode } from "react";
import {
  type FridgeTrustFunnelPayload,
  trackFridgeHelpDetailsToggle,
} from "@/lib/analytics/fridge-trust-funnel";

export function FridgeTrustFunnelDetails({
  className,
  summaryClassName,
  summaryText,
  payload,
  children,
}: {
  className?: string;
  summaryClassName?: string;
  summaryText: string;
  payload: FridgeTrustFunnelPayload;
  children: ReactNode;
}) {
  return (
    <details
      className={className}
      onToggle={(event) => {
        trackFridgeHelpDetailsToggle(event.currentTarget.open, payload);
      }}
    >
      <summary className={summaryClassName}>{summaryText}</summary>
      {children}
    </details>
  );
}
