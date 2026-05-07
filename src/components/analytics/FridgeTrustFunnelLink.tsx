"use client";

import React from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  type FridgeTrustFunnelPayload,
  trackFridgeTrustFunnelEvent,
} from "@/lib/analytics/fridge-trust-funnel";

export function FridgeTrustFunnelLink({
  href,
  className,
  payload,
  children,
}: {
  href: string;
  className?: string;
  payload: FridgeTrustFunnelPayload;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        trackFridgeTrustFunnelEvent(payload);
      }}
    >
      {children}
    </Link>
  );
}
