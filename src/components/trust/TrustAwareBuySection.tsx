import type { BuyLinkRow } from "@/components/BuyLinks";
import { TieredBuyLinks } from "@/components/TieredBuyLinks";
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
    bullets.push(
      "Some on-file retailer targets are manufacturer search or other discovery URLs, not verified checkout deep links — those stay hidden.",
    );
  }
  if (hadMissingBrowserTruthRows) {
    bullets.push(
      "Some on-file retailer targets have not completed live-link verification yet.",
    );
  }
  if (hadUnsafeBrowserTruthRows) {
    bullets.push("Some on-file retailer targets failed live safety checks for now.");
  }
  return (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-amber-900/95 dark:text-amber-100/95">
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
      <div className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">
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
        <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">
          Verify the exact OEM part number before using these buy links.
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
