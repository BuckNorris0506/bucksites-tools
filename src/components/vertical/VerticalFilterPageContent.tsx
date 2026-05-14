import Link from "next/link";
import type { BuyLinkRow } from "@/components/BuyLinks";
import { PartTruthPanel } from "@/components/trust/PartTruthPanel";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import { Prose } from "@/components/Prose";
import {
  buyPathSortContextForFilter,
  type BuyPathGateSuppressionSummary,
} from "@/lib/retailers/launch-buy-links";
import { buildPartPageTrust } from "@/lib/trust/part-trust";
import { intervalLabel } from "@/lib/vertical/interval";
import type { ReactNode } from "react";

const DEFAULT_VERTICAL_BUY_SUPPRESS_MESSAGE =
  "We are not showing a store button yet because we do not have enough listing evidence checked against this part number yet. Compare the part and model numbers to your old part or manual, then try search again if you still need a match.";

export type VerticalFilterModelRow = {
  id: string;
  slug: string;
  model_number: string;
  brand: { name: string };
};

type Props = {
  brandName: string;
  oemPartNumber: string;
  name: string | null;
  replacementIntervalMonths: number | null;
  notes: string | null;
  models: VerticalFilterModelRow[];
  /** e.g. `/air-purifier/model` */
  modelBasePath: string;
  retailerLinks: BuyLinkRow[];
  goBase: string;
  searchHref: string;
  fitConfirmation: string;
  wayfinding?: ReactNode;
  /** One short paragraph: what this page is for (optional). */
  utilityIntro?: string;
  /** Override default “Extra notes” heading. */
  notesSectionTitle?: string;
  /** Richer “search again” line for hub pages (air purifier, whole-house water, etc.). */
  expandedSearchFooter?: boolean;
  /** Search / packaging tokens from filter aliases (deduped; excludes OEM echo). */
  alsoKnownAs?: string[];
  /** Optional PDP slug for buy-path ordering (Amazon primary when exact-OEM catalog part). */
  filterSlug?: string;
  /** When the wedge filter loader exposes raw retailer rows + `summarizeBuyPathGateSuppression`, pass it here; otherwise omit. */
  gateSuppressionSummary?: BuyPathGateSuppressionSummary | null;
  /** Override default copy when `trust.buyer_path_state === "suppress_buy"`. */
  buySuppressMessage?: string;
};

export function VerticalFilterPageContent({
  brandName,
  oemPartNumber,
  name,
  replacementIntervalMonths,
  notes,
  models,
  modelBasePath,
  retailerLinks,
  goBase,
  searchHref,
  fitConfirmation,
  wayfinding,
  utilityIntro,
  notesSectionTitle = "Extra notes",
  expandedSearchFooter = false,
  alsoKnownAs,
  filterSlug,
  gateSuppressionSummary,
  buySuppressMessage,
}: Props) {
  const mBase = modelBasePath.replace(/\/$/, "");
  const buyPathSortContext = buyPathSortContextForFilter(filterSlug ?? oemPartNumber, name, oemPartNumber);
  const interval = intervalLabel(replacementIntervalMonths);
  const count = models.length;
  const trustSummary = buildPartPageTrust({
    modelsCount: count,
    retailerLinks,
    oemPartNumber,
    alsoKnownAs,
    notes,
    buyPathSortContext,
  });

  return (
    <article className="space-y-10">
      {wayfinding}
      {utilityIntro ? (
        <p className="max-w-2xl text-sm leading-relaxed text-bp-muted">
          {utilityIntro}
        </p>
      ) : null}

      <div className="rounded-xl border border-bp-border bg-bp-surface p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-bp-muted">
          Brand
        </p>
        <p className="text-lg font-semibold text-bp-text">{brandName}</p>

        <p className="mt-5 rounded-lg border border-bp-border bg-bp-trust-soft/40 px-3 py-2.5 text-sm leading-relaxed text-bp-text/90">
          {fitConfirmation}
        </p>

        <h1 className="bp-code mt-6 inline-block text-2xl font-semibold tracking-tight text-bp-text">
          {oemPartNumber}
        </h1>
        {name && (
          <p className="mt-2 text-base text-bp-text/90">{name}</p>
        )}
        {interval && (
          <p className="mt-3 text-sm text-bp-text/90">{interval}</p>
        )}
        {alsoKnownAs && alsoKnownAs.length > 0 ? (
          <p className="mt-3 text-sm text-bp-muted">
            <span className="font-medium text-bp-text/90">
              Also known as:
            </span>{" "}
            {alsoKnownAs.join(" · ")}
          </p>
        ) : null}

        <PartTruthPanel
          trust={trustSummary}
          compatibleModelCount={count}
          hasNotes={Boolean(notes)}
        />

        <div className="mt-6 border-t border-bp-border pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-bp-muted">
            Where to buy
          </p>
          <div className="mt-3">
            <TrustAwareBuySection
              trust={trustSummary}
              links={retailerLinks}
              goBase={goBase}
              primaryCtaLabel="Buy this part at"
              suppressMessage={buySuppressMessage ?? DEFAULT_VERTICAL_BUY_SUPPRESS_MESSAGE}
              gateSuppressionSummary={gateSuppressionSummary ?? undefined}
              buyPathSortContext={buyPathSortContext}
            />
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-bp-text">
          Fits these models ({count})
        </h2>
        {count === 0 ? (
          <p className="text-sm text-bp-muted">
            We don’t have model links for this part yet. Your unit may still use it—compare the part
            number and physical fit with what you removed or your manual.
          </p>
        ) : (
          <ul className="divide-y divide-bp-border rounded-lg border border-bp-border">
            {models.map((m) => (
              <li key={m.id}>
                <Link
                  href={`${mBase}/${m.slug}`}
                  className="block px-3 py-3 text-sm hover:bg-bp-trust-soft/35"
                >
                  <span className="bp-code font-semibold text-bp-text">
                    {m.model_number}
                  </span>
                  <span className="ml-2 text-bp-muted">
                    {m.brand.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-bp-border pt-8">
        <h2 className="text-sm font-semibold text-bp-text">
          {notesSectionTitle}
        </h2>
        <p className="mt-2 text-sm text-bp-muted">
          <Link
            href={searchHref}
            className="font-medium text-bp-trust underline underline-offset-2"
          >
            {expandedSearchFooter ? "Search again" : "Back to search"}
          </Link>
          {expandedSearchFooter ? (
            <span className="text-bp-muted">
              {" "}
              if you need a different model or part number.
            </span>
          ) : null}
        </p>
        {notes && (
          <div className="mt-4 max-w-prose text-sm text-bp-muted">
            <Prose>{notes}</Prose>
          </div>
        )}
      </section>
    </article>
  );
}
