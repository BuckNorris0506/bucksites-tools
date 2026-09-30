import React from "react";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import { BuckPartsVerifiedLinksSection } from "@/components/trust/BuckPartsVerifiedLinksSection";
import type { FridgeMappedFilterRow } from "@/lib/data/fridges";
import type { FridgeTrustFunnelPayload } from "@/lib/analytics/fridge-trust-funnel";
import {
  BUCKPARTS_VERIFIED_LINK_PRIMARY_CTA_SR_PREFIX,
  BUCKPARTS_VERIFIED_LINK_PROMINENT_NONE_YET,
  BUCKPARTS_VERIFIED_LINK_VIEW_AT_PREFIX,
  buckpartsVerifiedLinkCheckedAgainstPart,
} from "@/lib/copy/buckparts-verified-link-copy";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
import { buildFridgeModelGoAttribution } from "@/lib/retailers/fridge-go-attribution-v1";
import { buildPartPageTrust } from "@/lib/trust/part-trust";

export function FridgeModelPdpProminentBuySection({
  filters,
  preferCautionBuy,
  telemetryBase,
}: {
  filters: FridgeMappedFilterRow[];
  preferCautionBuy?: boolean;
  telemetryBase?: Omit<FridgeTrustFunnelPayload, "event_name" | "filter_slug">;
}) {
  const primary = filters[0];
  if (!primary) return null;

  const buyPathSortContext = buyPathSortContextForFilter(
    primary.slug,
    primary.name,
    primary.oem_part_number,
  );
  const trustSummary = buildPartPageTrust({
    modelsCount: primary.compatible_fridge_model_count,
    retailerLinks: primary.retailer_links,
    oemPartNumber: primary.oem_part_number,
    alsoKnownAs: primary.also_known_as,
    notes: primary.notes,
    buyPathSortContext,
  });
  if (
    preferCautionBuy &&
    trustSummary.buyer_path_state === "show_confident_buy" &&
    primary.retailer_links.length > 0
  ) {
    trustSummary.buyer_path_state = "show_caution_buy";
    trustSummary.compatible_risk_level = "medium";
  }

  const showsBuy = trustSummary.buyer_path_state !== "suppress_buy";

  return (
    <section
      className="overflow-hidden rounded-3xl border border-bp-border bg-bp-surface p-6 sm:p-7"
      aria-label="Buying options for this model"
      data-fridge-model-pdp-prominent-buy-v1="true"
    >
      <h2 className="text-xl font-semibold text-bp-text">Where to buy</h2>
      {showsBuy ? (
        <p className="mt-2 text-sm leading-relaxed text-bp-muted">
          {buckpartsVerifiedLinkCheckedAgainstPart(primary.oem_part_number)}
        </p>
      ) : null}
      <div className="mt-5">
        <BuckPartsVerifiedLinksSection>
          <TrustAwareBuySection
            trust={trustSummary}
            links={primary.retailer_links}
            goBase="/go"
            primaryCtaLabel={BUCKPARTS_VERIFIED_LINK_PRIMARY_CTA_SR_PREFIX}
            suppressMessage={BUCKPARTS_VERIFIED_LINK_PROMINENT_NONE_YET}
            gateSuppressionSummary={primary.buy_path_gate_suppression}
            buyPathSortContext={buyPathSortContext}
            goAttribution={
              telemetryBase?.page_slug
                ? buildFridgeModelGoAttribution(telemetryBase.page_slug)
                : null
            }
            visiblePrimaryPrefix={BUCKPARTS_VERIFIED_LINK_VIEW_AT_PREFIX}
          />
        </BuckPartsVerifiedLinksSection>
      </div>
    </section>
  );
}
