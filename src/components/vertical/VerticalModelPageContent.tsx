import Link from "next/link";
import type { BuyLinkRow } from "@/components/BuyLinks";
import { Prose } from "@/components/Prose";
import { TieredBuyLinks } from "@/components/TieredBuyLinks";
import {
  intervalLabel,
  sharedFilterIntervalLabel,
} from "@/lib/vertical/interval";
import type { ReactNode } from "react";

export type VerticalModelFilterRow = {
  id: string;
  slug: string;
  oem_part_number: string;
  name: string | null;
  replacement_interval_months: number | null;
  notes: string | null;
  retailer_links: BuyLinkRow[];
};

type Props = {
  brandName: string;
  modelNumber: string;
  title: string;
  series: string | null;
  notes: string | null;
  filters: VerticalModelFilterRow[];
  /** e.g. `/air-purifier/filter` */
  filterBasePath: string;
  goBase: string;
  searchHref: string;
  fitConfirmation: string;
  wayfinding?: ReactNode;
  utilityIntro?: string;
  notesSectionTitle?: string;
  expandedSearchFooter?: boolean;
};

export function VerticalModelPageContent({
  brandName,
  modelNumber,
  title,
  series,
  notes,
  filters,
  filterBasePath,
  goBase,
  searchHref,
  fitConfirmation,
  wayfinding,
  utilityIntro,
  notesSectionTitle = "Extra notes",
  expandedSearchFooter = false,
}: Props) {
  const path = filterBasePath.replace(/\/$/, "");
  const primary = filters[0];
  const alternates = filters.slice(1);
  const sharedInterval = sharedFilterIntervalLabel(filters);
  const primaryInterval = primary ? intervalLabel(primary.replacement_interval_months) : null;

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

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Model {modelNumber}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {title}
        </p>
        {series && (
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Series: {series}</p>
        )}

        <p className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm leading-relaxed text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-200">
          {fitConfirmation}
        </p>

        {filters.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">
            We don’t have a replacement part mapped to this model yet. Try another spelling in
            search, or check the sticker on the unit and your manual for the OEM part number.
          </p>
        ) : (
          <>
            <div className="mt-6 border-t border-neutral-100 pt-6 dark:border-neutral-800">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {filters.length > 1 ? "Best match first" : "Your replacement"}
              </p>
              <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                {primary.oem_part_number}
              </p>
              {primary.name && (
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {primary.name}
                </p>
              )}
              {(primaryInterval ?? sharedInterval) && (
                <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                  {primaryInterval ?? sharedInterval}
                </p>
              )}

              <div className="mt-5">
                <TieredBuyLinks
                  links={primary.retailer_links}
                  goBase={goBase}
                  primaryCtaLabel="Buy replacement at"
                />
              </div>

              <p className="mt-4 text-sm">
                <Link
                  href={`${path}/${primary.slug}`}
                  className="font-medium text-neutral-900 underline decoration-neutral-400 underline-offset-2 hover:decoration-neutral-600 dark:text-neutral-100"
                >
                  All details for this part
                </Link>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {" "}
                  (notes, compatible models, buying options when listed)
                </span>
              </p>
            </div>

            {alternates.length > 0 && (
              <div className="mt-8 border-t border-neutral-100 pt-6 dark:border-neutral-800">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Other parts that also fit this model
                </h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Less common crosses — open each for full part details.
                </p>
                <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  {alternates.map((f) => (
                    <li key={f.id}>
                      <Link
                        href={`${path}/${f.slug}`}
                        className="flex flex-col gap-0.5 px-3 py-3 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900/80"
                      >
                        <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                          {f.oem_part_number}
                        </span>
                        {f.name && (
                          <span className="text-neutral-600 dark:text-neutral-400">{f.name}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

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
        {(series || sharedInterval || notes) && (
          <div className="mt-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
            {sharedInterval && filters.length > 1 && (
              <p>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  Timing when several parts fit:
                </span>{" "}
                {sharedInterval}
              </p>
            )}
            {notes && (
              <div className="max-w-prose">
                <Prose>{notes}</Prose>
              </div>
            )}
          </div>
        )}
      </section>
    </article>
  );
}
