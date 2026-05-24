import React from "react";
import type { BuyLinkRow } from "@/components/BuyLinks";

const SECTION_TITLE = "Official product reference";
const HELPER_COPY =
  "This page can help you compare the exact filter, but it is not a confirmed buy path.";

/**
 * Direct outbound links for verified official PDPs that failed direct-buy proof.
 * Never uses `/go` and never uses buy/checkout wording.
 */
export function OfficialProductReferenceLinks({ links }: { links: BuyLinkRow[] }) {
  if (links.length === 0) return null;

  return (
    <div
      className="mt-4 rounded-lg border border-bp-border bg-bp-surface/80 px-3 py-3"
      data-testid="official-product-reference"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-bp-muted">
        {SECTION_TITLE}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-bp-muted">{HELPER_COPY}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={link.affiliate_url}
              rel="nofollow noopener noreferrer"
              className="inline-flex text-sm font-medium text-bp-trust underline-offset-2 hover:underline"
            >
              {link.retailer_name?.trim() || "Official product page"}
              <span className="ml-1 text-bp-muted" aria-hidden>
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
