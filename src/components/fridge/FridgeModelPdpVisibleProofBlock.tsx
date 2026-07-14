import React from "react";
import {
  FRIDGE_MODEL_PDP_VISIBLE_PROOF_BLOCK_MARKER_V1,
  buildFridgeModelPdpVisibleProofCopyV1,
  pickLatestBrowserProofCheckedAtV1,
  shouldShowFridgeModelPdpVisibleProofBlockV1,
} from "@/lib/fridge/fridge-model-pdp-safe-buyer-path-visible-proof-v1";
import { formatBuyLinkCheckedYyyyMmDd } from "@/lib/copy/public-trust";

export type FridgeModelPdpVisibleProofFilterInputV1 = {
  oem_part_number?: string | null;
  retailer_links?: readonly {
    browser_truth_checked_at?: string | null;
  }[];
};

export type FridgeModelPdpVisibleProofBlockProps = {
  fridgeModelSlug: string;
  quarantined: boolean;
  filters: readonly FridgeModelPdpVisibleProofFilterInputV1[];
};

/**
 * Owner-review prototype: homeowner-visible proof metadata on safe buyer-path fridge model PDPs.
 * Does not add CTAs, Product commerce structured data, or live-HTML claims.
 * Marker: FridgeModelPdpVisibleProofBlock
 */
export function FridgeModelPdpVisibleProofBlock({
  fridgeModelSlug,
  quarantined,
  filters,
}: FridgeModelPdpVisibleProofBlockProps) {
  void FRIDGE_MODEL_PDP_VISIBLE_PROOF_BLOCK_MARKER_V1;

  if (
    !shouldShowFridgeModelPdpVisibleProofBlockV1({
      fridgeModelSlug,
      quarantined,
      mappedFilterCount: filters.length,
    })
  ) {
    return null;
  }

  const partNumbers = filters
    .map((f) => f.oem_part_number ?? "")
    .map((p) => p.trim())
    .filter(Boolean);
  const checkedAtIso = pickLatestBrowserProofCheckedAtV1(
    filters.flatMap((f) => (f.retailer_links ?? []).map((l) => l.browser_truth_checked_at)),
  );
  const lastCheckedYyyyMmDd = checkedAtIso
    ? formatBuyLinkCheckedYyyyMmDd(checkedAtIso)
    : null;
  const copy = buildFridgeModelPdpVisibleProofCopyV1({
    partNumbers,
    lastCheckedYyyyMmDd,
  });

  return (
    <section
      className="rounded-2xl border border-bp-border bg-bp-surface p-6 sm:p-7"
      aria-label={copy.heading}
      data-fridge-model-pdp-visible-proof-v1="true"
      data-fridge-model-pdp-visible-proof-slug={fridgeModelSlug}
    >
      <h2 className="text-base font-semibold text-bp-text">{copy.heading}</h2>
      <p className="mt-2 text-sm leading-relaxed text-bp-muted">{copy.intro}</p>
      <p className="mt-4 text-sm text-bp-text/90">
        {copy.proof_status}
        {copy.last_checked_label ? (
          <>
            {" "}
            {copy.last_checked_label}.
          </>
        ) : null}
      </p>
      <p className="mt-3 text-sm text-bp-text/90">
        <span className="font-medium text-bp-text">{copy.mapped_filters_label}:</span>{" "}
        <span className="bp-code font-semibold text-bp-text">{copy.part_numbers_display}</span>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-bp-muted">{copy.identity_framing}</p>
      <p className="mt-3 text-sm leading-relaxed text-bp-muted">{copy.suppress_note}</p>
      <p className="mt-3 text-sm leading-relaxed text-bp-muted">{copy.no_unsafe_cta_note}</p>
    </section>
  );
}
