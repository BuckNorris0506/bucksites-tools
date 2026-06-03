import React from "react";

import {
  BUCKPARTS_VERIFIED_LINK_DEFINITION,
  BUCKPARTS_VERIFIED_LINK_NOT_EVERY_FILTER_NOTE,
  BUCKPARTS_VERIFIED_LINKS_SECTION_LABEL,
} from "@/lib/copy/buckparts-verified-link-copy";

/**
 * Shared section chrome for gated purchase paths (filter PDP, vertical wedges, fridge model hub).
 */
export function BuckPartsVerifiedLinksSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-bp-muted">
        {BUCKPARTS_VERIFIED_LINKS_SECTION_LABEL}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-bp-muted">
        {BUCKPARTS_VERIFIED_LINK_DEFINITION} {BUCKPARTS_VERIFIED_LINK_NOT_EVERY_FILTER_NOTE}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
