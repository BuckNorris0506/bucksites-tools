import React from "react";
import type { BuyLinkRow } from "@/components/BuyLinks";
import { TieredBuyLinks } from "@/components/TieredBuyLinks";
import {
  BUCKPARTS_VERIFIED_LINK_WHEN_SHOWN_NOTE,
} from "@/lib/copy/buckparts-verified-link-copy";
import {
  buyPathGateHintMissingBrowserTruth,
  buyPathGateHintSearchPlaceholder,
  buyPathGateHintUnsafeBrowserTruth,
} from "@/lib/copy/public-trust";
import type {
  BuyPathGateSuppressionSummary,
  BuyPathSortContext,
} from "@/lib/retailers/launch-buy-links";
import type { ApGoAttributionV1 } from "@/lib/retailers/ap-go-attribution-v1";
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
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-bp-caution">
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
  goAttribution,
}: {
  trust: PartTrustSummary;
  links: BuyLinkRow[];
  goBase: string;
  primaryCtaLabel: string;
  suppressMessage: string;
  /** When buy is suppressed but inventory rows exist, explains why they are gated (refrigerator filter hub). */
  gateSuppressionSummary?: BuyPathGateSuppressionSummary | null;
  buyPathSortContext?: BuyPathSortContext;
  /** When set (AP phase 1), forwarded to TieredBuyLinks for `/go` href attribution. */
  goAttribution?: ApGoAttributionV1 | null;
}) {
  if (trust.buyer_path_state === "suppress_buy") {
    return (
      <div className="rounded-lg border border-bp-caution/40 bg-bp-caution-soft px-3 py-3 text-sm leading-relaxed text-bp-caution">
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
        <p className="rounded-lg border border-bp-caution/35 bg-bp-caution-soft px-3 py-2.5 text-sm leading-relaxed text-bp-caution">
          {BUCKPARTS_VERIFIED_LINK_WHEN_SHOWN_NOTE}
        </p>
      )}
      <TieredBuyLinks
        links={links}
        goBase={goBase}
        primaryCtaLabel={primaryCtaLabel}
        buyPathSortContext={buyPathSortContext}
        goAttribution={goAttribution}
      />
    </div>
  );
}
