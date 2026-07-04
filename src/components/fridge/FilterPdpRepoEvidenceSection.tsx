import { FILTER_PDP_REPO_EVIDENCE_SECTION_MARKER_V1 } from "@/lib/fridge/filter-pdp-referenceability-markers";
import { formatBuyLinkCheckedYyyyMmDd } from "@/lib/copy/public-trust";

export type FilterPdpRepoEvidenceSectionProps = {
  repoEvidencePaths: string[];
  browserProofCheckedAt: string | null;
  browserProofClassification: string | null;
};

/** Homeowner-facing status for a browser-proof classification (never shows raw enums). */
export function customerFacingFilterProofStatusV1(
  classification: string | null | undefined,
): string {
  const normalized = (classification ?? "").trim().toLowerCase();
  if (normalized === "direct_buyable") {
    return "We checked a direct product page for this filter.";
  }
  if (normalized === "search_placeholder") {
    return "We only found a store search page, not a direct product page, so we're not linking it yet.";
  }
  return "We haven't confirmed a safe store link yet.";
}

/**
 * Customer-facing filter PDP section describing what BuckParts checked.
 * Marker: FilterPdpRepoEvidenceSection (referenceability factory v1).
 * Does not expose repository paths or internal classification enums.
 */
export function FilterPdpRepoEvidenceSection({
  repoEvidencePaths,
  browserProofCheckedAt,
  browserProofClassification,
}: FilterPdpRepoEvidenceSectionProps) {
  void FILTER_PDP_REPO_EVIDENCE_SECTION_MARKER_V1;

  const checkedLabel = browserProofCheckedAt
    ? formatBuyLinkCheckedYyyyMmDd(browserProofCheckedAt)
    : null;
  const hasContent =
    repoEvidencePaths.length > 0 ||
    checkedLabel != null ||
    browserProofClassification != null;

  if (!hasContent) return null;

  const statusLine = customerFacingFilterProofStatusV1(browserProofClassification);

  return (
    <section
      className="rounded-2xl border border-bp-border bg-bp-surface p-6 sm:p-7"
      aria-label="What we checked for this filter"
      data-referenceability-repo-evidence-v1="true"
    >
      <h2 className="text-base font-semibold text-bp-text">What we checked for this filter</h2>
      <p className="mt-2 text-sm leading-relaxed text-bp-muted">
        Before we show a store link, we check the product page against this exact filter number and note
        the date we checked. We only show a link when those checks clear.
      </p>
      <p className="mt-4 text-sm text-bp-text/90">
        {statusLine}
        {checkedLabel ? (
          <>
            {" "}
            Last checked {checkedLabel}.
          </>
        ) : null}
      </p>
    </section>
  );
}
