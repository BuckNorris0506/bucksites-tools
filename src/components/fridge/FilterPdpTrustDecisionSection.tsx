import { COMPARE_BEFORE_BUY_CHECKLIST_LINES } from "@/lib/copy/public-trust";
import {
  BUCKPARTS_VERIFIED_LINK_NONE_YET,
  BUCKPARTS_VERIFIED_LINK_WHEN_SHOWN_NOTE,
} from "@/lib/copy/buckparts-verified-link-copy";
import { FILTER_PDP_TRUST_DECISION_SECTION_MARKER_V1 } from "@/lib/fridge/filter-pdp-referenceability-markers";

export type FilterPdpTrustDecisionSectionProps = {
  oemPartNumber: string;
  compatibleModelCount: number;
  buyingOptionsShown: boolean;
};

/**
 * Universal Page Trust Contract Q2/Q5/Q7/Q9 framing for refrigerator filter PDPs.
 * Marker: FilterPdpTrustDecisionSection (referenceability factory v1).
 */
export function FilterPdpTrustDecisionSection({
  oemPartNumber,
  compatibleModelCount,
  buyingOptionsShown,
}: FilterPdpTrustDecisionSectionProps) {
  void FILTER_PDP_TRUST_DECISION_SECTION_MARKER_V1;

  return (
    <section
      className="rounded-2xl border border-bp-border bg-bp-trust-soft/30 p-6 sm:p-7"
      aria-label="How to use this page"
      data-referenceability-trust-decision-v1="true"
    >
      <h2 className="text-base font-semibold text-bp-text">How to decide on this filter</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-bp-text/90">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-bp-muted">
            What to compare
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            {COMPARE_BEFORE_BUY_CHECKLIST_LINES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-bp-muted">
            What is uncertain
          </p>
          <p className="mt-2">
            {compatibleModelCount === 0
              ? "We may not have every refrigerator model that uses this cartridge on file yet. Compare numbers on your old filter and owner’s manual before ordering."
              : "Compatibility lists can be incomplete. If your model is not listed below, compare part numbers manually before you buy."}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-bp-muted">
            Buying options
          </p>
          <p className="mt-2">
            {buyingOptionsShown ? BUCKPARTS_VERIFIED_LINK_WHEN_SHOWN_NOTE : BUCKPARTS_VERIFIED_LINK_NONE_YET}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-bp-muted">
            What to avoid
          </p>
          <p className="mt-2">
            Do not order from a BuckParts Verified Link until the part number on the retailer product page
            matches {oemPartNumber} and what is printed on your old filter.
          </p>
        </div>
      </div>
    </section>
  );
}
