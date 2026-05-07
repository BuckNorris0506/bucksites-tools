import React from "react";
import type { BuyLinkRow } from "@/components/BuyLinks";
import { TieredBuyLinks } from "@/components/TieredBuyLinks";
import {
  buyPathGateHintMissingBrowserTruth,
  buyPathGateHintSearchPlaceholder,
  buyPathGateHintUnsafeBrowserTruth,
} from "@/lib/copy/public-trust";
import type {
  BuyPathGateSuppressionSummary,
  BuyPathSortContext,
} from "@/lib/retailers/launch-buy-links";
import type { PartTrustSummary } from "@/lib/trust/part-trust";

function BuyPathSuppressionInventoryHints({ summary }: { summary: BuyPathGateSuppressionSummary }) {
  const {
    hadSearchPlaceholderRows,
    hadMissingBrowserTruthRows,
    hadUnsafeBrowserTruthRows,
  } = summary;
  if (!hadSearchPlaceholderRows && !hadMissingBrowserTruthRows && !hadUnsafeBrowserTruthRows) {
    return null;
  }
  const bullets: string[] = [];
  if (hadSearchPlaceholderRows) {
    bullets.push(buyPathGateHintSearchPlaceholder());
  }
  if (hadMissingBrowserTruthRows) {
    bullets.push(buyPathGateHintMissingBrowserTruth());
  }
  if (hadUnsafeBrowserTruthRows) {
    bullets.push(buyPathGateHintUnsafeBrowserTruth());
  }
  return (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-amber-950/90">
      {bullets.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

export function TrustAwareBuySection({
  trust,
  links,
  goBase,
  primaryCtaLabel,
  suppressMessage,
  gateSuppressionSummary,
  buyPathSortContext,
}: {
  trust: PartTrustSummary;
  links: BuyLinkRow[];
  goBase: string;
  primaryCtaLabel: string;
  suppressMessage: string;
  /** When buy is suppressed but inventory rows exist, explains why they are gated (refrigerator filter hub). */
  gateSuppressionSummary?: BuyPathGateSuppressionSummary | null;
  buyPathSortContext?: BuyPathSortContext;
}) {
  if (trust.buyer_path_state === "suppress_buy") {
    return (
      <div className="text-sm leading-relaxed text-amber-950/95">
        <p>{suppressMessage}</p>
        {gateSuppressionSummary ? (
          <BuyPathSuppressionInventoryHints summary={gateSuppressionSummary} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trust.buyer_path_state === "show_caution_buy" && (
        <p className="text-sm leading-relaxed text-amber-950/95">
          Buying options are shown only when the product page matches this filter number. Compare it with your old filter before ordering.
        </p>
      )}
      <TieredBuyLinks
        links={links}
        goBase={goBase}
        primaryCtaLabel={primaryCtaLabel}
        buyPathSortContext={buyPathSortContext}
      />
    </div>
  );
}
