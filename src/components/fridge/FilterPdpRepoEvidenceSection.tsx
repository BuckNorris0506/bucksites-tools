import { FILTER_PDP_REPO_EVIDENCE_SECTION_MARKER_V1 } from "@/lib/fridge/filter-pdp-referenceability-markers";
import { formatBuyLinkCheckedYyyyMmDd } from "@/lib/copy/public-trust";

export type FilterPdpRepoEvidenceSectionProps = {
  repoEvidencePaths: string[];
  browserProofCheckedAt: string | null;
  browserProofClassification: string | null;
};

/**
 * Surfaces repo-derived evidence references on filter PDPs — no invented claims.
 * Marker: FilterPdpRepoEvidenceSection (referenceability factory v1).
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
    repoEvidencePaths.length > 0 || checkedLabel != null || browserProofClassification != null;

  if (!hasContent) return null;

  return (
    <section
      className="rounded-2xl border border-bp-border bg-bp-surface p-6 sm:p-7"
      aria-label="Repo evidence references"
      data-referenceability-repo-evidence-v1="true"
    >
      <h2 className="text-base font-semibold text-bp-text">Where our proof lives in repo files</h2>
      <p className="mt-2 text-sm leading-relaxed text-bp-muted">
        BuckParts ties buying options to files we keep in the repository. Open these paths in the repo if
        you want to review the same evidence we used.
      </p>
      {repoEvidencePaths.length > 0 ? (
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-bp-text/90">
          {repoEvidencePaths.map((path) => (
            <li key={path}>
              <code className="bp-code text-xs">{path}</code>
            </li>
          ))}
        </ul>
      ) : null}
      {checkedLabel || browserProofClassification ? (
        <p className="mt-4 text-sm text-bp-text/90">
          {browserProofClassification ? (
            <>
              Primary buying-option review status in our files:{" "}
              <span className="font-medium">{browserProofClassification.replaceAll("_", " ")}</span>
              {checkedLabel ? <> (last checked {checkedLabel})</> : null}.
            </>
          ) : checkedLabel ? (
            <>Buying-option review last recorded in our files: {checkedLabel}.</>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
