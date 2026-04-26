import Link from "next/link";
import type { BuyLinkRow } from "@/components/BuyLinks";
import { Prose } from "@/components/Prose";
import { TieredBuyLinks } from "@/components/TieredBuyLinks";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
import { intervalLabel } from "@/lib/vertical/interval";
import type { ReactNode } from "react";

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
}: Props) {
  const mBase = modelBasePath.replace(/\/$/, "");
  const buyPathSortContext = buyPathSortContextForFilter(filterSlug ?? oemPartNumber, name, oemPartNumber);
  const interval = intervalLabel(replacementIntervalMonths);
  const count = models.length;

  return (
    <article className="space-y-10">
      {wayfinding}
      {utilityIntro ? (
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {utilityIntro}
        </p>
      ) : null}

      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Brand
        </p>
        <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{brandName}</p>

        <p className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm leading-relaxed text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-200">
          {fitConfirmation}
        </p>

        <h1 className="mt-6 font-mono text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          {oemPartNumber}
        </h1>
        {name && (
          <p className="mt-2 text-base text-neutral-700 dark:text-neutral-300">{name}</p>
        )}
        {interval && (
          <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">{interval}</p>
        )}
        {alsoKnownAs && alsoKnownAs.length > 0 ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              Also known as:
            </span>{" "}
            {alsoKnownAs.join(" · ")}
          </p>
        ) : null}

        <div className="mt-6 border-t border-neutral-100 pt-6 dark:border-neutral-800">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Where to buy
          </p>
          <div className="mt-3">
            <TieredBuyLinks
              links={retailerLinks}
              goBase={goBase}
              primaryCtaLabel="Buy this part at"
              buyPathSortContext={buyPathSortContext}
            />
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Fits these models ({count})
        </h2>
        {count === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            We don’t have model links for this part yet. Your unit may still use it—compare the OEM
            number and physical fit with what you removed or your manual.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {models.map((m) => (
              <li key={m.id}>
                <Link
                  href={`${mBase}/${m.slug}`}
                  className="block px-3 py-3 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900/80"
                >
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {m.model_number}
                  </span>
                  <span className="ml-2 text-neutral-500 dark:text-neutral-400">
                    {m.brand.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-neutral-200 pt-8 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {notesSectionTitle}
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          <Link
            href={searchHref}
            className="font-medium text-neutral-900 underline underline-offset-2 dark:text-neutral-100"
          >
            {expandedSearchFooter ? "Search again" : "Back to search"}
          </Link>
          {expandedSearchFooter ? (
            <span className="text-neutral-500 dark:text-neutral-400">
              {" "}
              if you need a different model or part number.
            </span>
          ) : null}
        </p>
        {notes && (
          <div className="mt-4 max-w-prose text-sm text-neutral-600 dark:text-neutral-400">
            <Prose>{notes}</Prose>
          </div>
        )}
      </section>
    </article>
  );
}